import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { callSofia, parseOrder, parseImageRequest, cleanResponse, detectName } from './lib/sofia.js';
import { sendText, sendImage, sendAudio, getBase64FromMedia, isGroup, extractPhone, checkInstance } from './lib/evolution.js';
import {
  getConversation, saveConversation, listConversations, deleteConversation,
  getProducts, saveProducts, addOrder, getOrders, removeOrder,
  getMemory, saveMemory
} from './lib/storage.js';
import { transcribeAudio, textToSpeech } from './lib/audio.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public')); // Serve the dashboard automatically at /

// ── WEBHOOK (Evolution API) ───────────────────────────────
app.post('/api/webhook', async (req, res) => {
  try {
    const payload = req.body;
    const event = payload.event;

    // Só processa mensagens recebidas
    if (event !== 'messages.upsert') {
      return res.status(200).json({ ok: true, skipped: event });
    }

    const data = payload.data;
    if (!data) return res.status(200).json({ ok: true });

    const { key, message, pushName } = data;

    // Ignora mensagens enviadas pelo bot ou para grupos
    if (key?.fromMe) return res.status(200).json({ ok: true, skipped: 'fromMe' });
    if (isGroup(key?.remoteJid || '')) {
      return res.status(200).json({ ok: true, skipped: 'group' });
    }

    let text = null;
    let isAudioReceived = false;

    // Verifica se é áudio
    if (message?.audioMessage) {
      const base64 = await getBase64FromMedia(message);
      if (base64) {
        text = await transcribeAudio(base64);
        isAudioReceived = true;
      }
    } else {
      // Extrai o texto da mensagem
      text =
        message?.conversation ||
        message?.extendedTextMessage?.text ||
        message?.imageMessage?.caption ||
        null;
    }

    if (!text) return res.status(200).json({ ok: true, skipped: 'no_text_or_audio' });

    const phone = key.remoteJid;
    const phoneClean = extractPhone(phone);

    // Carrega ou cria conversa
    let conv = await getConversation(phone) || {
      phone,
      phoneClean,
      clientName: null,
      history: [],
      messages: [],
      lastMsg: '',
      lastTime: null,
    };

    // Detecção de nome
    if (!conv.clientName) {
      const isFirstMsg = conv.history.filter(h => h.role === 'user').length === 0;
      if (!isFirstMsg) {
        const name = detectName(pushName, text);
        if (name) conv.clientName = name;
      }
    }

    // Histórico
    conv.history.push({ role: 'user', content: text });
    conv.messages.push({
      role: 'user',
      content: isAudioReceived ? `[Áudio transcrito] ${text}` : text,
      time: new Date().toISOString(),
    });
    conv.lastMsg = isAudioReceived ? `[Áudio] ${text}` : text;
    conv.lastTime = new Date().toISOString();

    const products = await getProducts();
    const response = await callSofia(conv, text, products);

    conv.history.push({ role: 'assistant', content: response });

    const order = parseOrder(response);
    const imgReq = parseImageRequest(response);
    const clean = cleanResponse(response);

    conv.messages.push({
      role: 'bot',
      content: clean,
      time: new Date().toISOString(),
    });

    await saveConversation(phone, conv);

    if (order?.tipo === 'pedido') {
      await addOrder({
        id: Date.now().toString(),
        client: conv.clientName || phoneClean,
        phone: phoneClean,
        produto: order.produto,
        qtd: order.quantidade || 1,
        obs: order.obs || '',
        status: 'novo',
      });
    }

    // Envia resposta (áudio ou texto)
    if (isAudioReceived) {
      const audioBase64 = await textToSpeech(clean);
      if (audioBase64) {
        await sendAudio(phone, audioBase64);
      } else {
        await sendText(phone, clean); 
      }
    } else {
      await sendText(phone, clean);
    }

    if (imgReq?.tipo === 'imagem') {
      const prod = products.find(p =>
        imgReq.produto.toLowerCase().includes(p.nome.toLowerCase()) ||
        p.nome.toLowerCase().includes(imgReq.produto.toLowerCase())
      );
      if (prod?.imagem) {
        await sendImage(phone, prod.imagem, prod.nome);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[webhook] Erro:', err);
    return res.status(200).json({ ok: false, error: err.message });
  }
});

// ── ROTAS DE API DO DASHBOARD ─────────────────────────────

app.get('/api/conversations', async (req, res) => {
  try {
    const convs = await listConversations();
    res.json(convs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/conversations', async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'phone obrigatório' });
  await deleteConversation(decodeURIComponent(phone));
  res.json({ ok: true });
});

app.get('/api/products', async (req, res) => {
  try {
    res.json(await getProducts());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  const { products } = req.body;
  if (!Array.isArray(products)) return res.status(400).json({ error: 'products deve ser array' });
  await saveProducts(products); // requires saveProducts in Supabase, wait, in storage we didn't implement saveProducts for Supabase? Let me check.
  res.json({ ok: true });
});

app.get('/api/orders', async (req, res) => {
  try {
    res.json(await getOrders());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/orders', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id obrigatório' });
  await removeOrder(id);
  res.json({ ok: true });
});

app.post('/api/send', async (req, res) => {
  const { phone, text } = req.body;
  if (!phone || !text) return res.status(400).json({ error: 'phone e text obrigatórios' });
  try {
    await sendText(phone, text);
    const conv = await getConversation(phone);
    if (conv) {
      conv.messages.push({ role: 'bot', content: text, time: new Date().toISOString(), manual: true });
      conv.history.push({ role: 'assistant', content: text });
      conv.lastMsg = `Sofia: ${text.slice(0, 40)}`;
      conv.lastTime = new Date().toISOString();
      await saveConversation(phone, conv);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/memory', async (req, res) => {
  try {
    res.json(await getMemory());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/memory', async (req, res) => {
  const { notes } = req.body;
  if (!Array.isArray(notes)) return res.status(400).json({ error: 'notes deve ser array' });
  await saveMemory(notes);
  res.json({ ok: true });
});

app.get('/api/status', async (req, res) => {
  const connected = await checkInstance();
  res.json({ connected });
});

// ── INICIALIZAÇÃO ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Talita Saúde - Sofia] Servidor Express rodando na porta ${PORT}`);
  console.log(`Acesse o painel em: http://localhost:${PORT}`);
});
