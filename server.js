import express from 'express';
import { callLidia, parseOrder, parseImageRequest, cleanResponse, detectName } from './lib/lidia.js';
import { sendText, sendImage, isGroup, extractPhone, checkInstance } from './lib/evolution.js';
import {
  getConversation, saveConversation, listConversations, deleteConversation,
  getProducts, saveProducts, addOrder, getOrders, removeOrder
} from './lib/storage.js';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// ── CORS ──────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── WEBHOOK (Evolution API) ───────────────────────────────
app.post('/api/webhook', async (req, res) => {
  try {
    const payload = req.body;
    const event = payload.event;

    if (event !== 'messages.upsert') {
      return res.status(200).json({ ok: true, skipped: event });
    }

    const data = payload.data;
    if (!data) return res.status(200).json({ ok: true });

    const { key, message, pushName } = data;

    if (key?.fromMe) return res.status(200).json({ ok: true, skipped: 'fromMe' });
    if (isGroup(key?.remoteJid || '')) return res.status(200).json({ ok: true, skipped: 'group' });

    const text =
      message?.conversation ||
      message?.extendedTextMessage?.text ||
      message?.imageMessage?.caption ||
      null;

    if (!text) return res.status(200).json({ ok: true, skipped: 'no_text' });

    const phone = key.remoteJid;
    const phoneClean = extractPhone(phone);

    let conv = await getConversation(phone) || {
      phone, phoneClean, clientName: null,
      history: [], messages: [], lastMsg: '', lastTime: null,
      createdAt: new Date().toISOString(),
    };

    if (!conv.clientName) {
      const isFirstMsg = conv.history.filter(h => h.role === 'user').length === 0;
      if (!isFirstMsg) {
        const name = detectName(pushName, text);
        if (name) conv.clientName = name;
      }
    }

    conv.history.push({ role: 'user', content: text });
    conv.messages.push({ role: 'user', content: text, time: new Date().toISOString() });
    conv.lastMsg = text;
    conv.lastTime = new Date().toISOString();

    const products = await getProducts();
    const response = await callLidia(conv, text, products);

    conv.history.push({ role: 'assistant', content: response });

    const order = parseOrder(response);
    const imgReq = parseImageRequest(response);
    const clean = cleanResponse(response);

    conv.messages.push({ role: 'bot', content: clean, time: new Date().toISOString() });
    await saveConversation(phone, conv);

    if (order?.tipo === 'pedido') {
      await addOrder({
        id: Date.now().toString(),
        client: conv.clientName || phoneClean,
        phone: phoneClean,
        produto: order.produto,
        qtd: order.quantidade || 1,
        obs: order.obs || '',
        time: new Date().toISOString(),
        status: 'novo',
      });
    }

    await sendText(phone, clean);

    if (imgReq?.tipo === 'imagem') {
      const prod = products.find(p =>
        imgReq.produto.toLowerCase().includes(p.nome.toLowerCase()) ||
        p.nome.toLowerCase().includes(imgReq.produto.toLowerCase())
      );
      if (prod?.imagem) await sendImage(phone, prod.imagem, prod.nome);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[webhook] Erro:', err);
    return res.status(200).json({ ok: false, error: err.message });
  }
});

// ── CONVERSAS ─────────────────────────────────────────────
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

// ── ENVIO MANUAL ──────────────────────────────────────────
app.post('/api/send', async (req, res) => {
  const { phone, text } = req.body;
  if (!phone || !text) return res.status(400).json({ error: 'phone e text obrigatórios' });

  try {
    await sendText(phone, text);

    const conv = await getConversation(phone);
    if (conv) {
      conv.messages.push({ role: 'bot', content: text, time: new Date().toISOString(), manual: true });
      conv.history.push({ role: 'assistant', content: text });
      conv.lastMsg = `Lidia: ${text.slice(0, 40)}`;
      conv.lastTime = new Date().toISOString();
      await saveConversation(phone, conv);
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PRODUTOS ──────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
  res.json(await getProducts());
});

app.post('/api/products', async (req, res) => {
  const { products } = req.body;
  if (!Array.isArray(products)) return res.status(400).json({ error: 'products deve ser array' });
  await saveProducts(products);
  res.json({ ok: true });
});

// ── PEDIDOS ───────────────────────────────────────────────
app.get('/api/orders', async (req, res) => {
  res.json(await getOrders());
});

app.delete('/api/orders', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id obrigatório' });
  await removeOrder(id);
  res.json({ ok: true });
});

// ── STATUS WHATSAPP ───────────────────────────────────────
app.get('/api/status', async (req, res) => {
  const connected = await checkInstance();
  res.json({ connected });
});

// ── START ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Lidia] Servidor rodando na porta ${PORT}`);
});
