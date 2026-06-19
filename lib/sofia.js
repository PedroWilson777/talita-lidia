import Anthropic from '@anthropic-ai/sdk';
import { getMemory } from './storage.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export function buildSystemPrompt(conv, products, memoryNotes = []) {
  const catalog = products.map(p =>
    `- ${p.nome} | Cat: ${p.cat} | Preco: R$${p.preco.toFixed(2)} | ${p.desc} | ${p.estoque}`
  ).join('\n');

  const ctx = conv.clientName
    ? `O cliente se chama ${conv.clientName}. Use o nome ao responder.`
    : 'Ainda nao sabemos o nome do cliente.';

  const memoryBlock = memoryNotes.length > 0
    ? `\nINFORMAÇÕES IMPORTANTES (feriados, avisos, regras especiais):\n${memoryNotes.map(n => `- ${n}`).join('\n')}\n`
    : '';

  return `Voce e Sofia, assistente virtual da Talita Saude.

CONTEXTO: ${ctx}
${memoryBlock}
FLUXO DE ATENDIMENTO:
1. Saudacao Inicial: Se nao souber o nome do cliente (informacao no CONTEXTO), voce deve obrigatoriamente responder exatamente: "Ola, sou a Sofia. Qual o seu nome?".
2. Apos saber o nome: Cumprimente pelo nome e pergunte "Como posso ajudar voce hoje?".
3. Duvidas: Responda de forma curta e direta usando o catalogo abaixo.
4. Pedidos: Antes de gerar o JSON de pedido, voce deve obrigatoriamente perguntar se o cliente prefere RETIRADA na loja ou ENTREGA.
5. Fechamento: Apos o cliente escolher a forma de entrega/retirada, gere o JSON de pedido no final da mensagem.

CATALOGO:
${catalog}

REGRAS ABSOLUTAS:
- ZERO emojis em todas as respostas.
- ZERO asteriscos ou qualquer marcacao Markdown.
- Texto corrido, limpo e direto.
- Para pedido: ***{"tipo":"pedido","produto":"NOME","quantidade":1,"obs":""}***
- Para imagem: ###{"tipo":"imagem","produto":"NOME"}###
- Responda apenas em portugues brasileiro.`;
}

export async function callSofia(conv, userMsg, products) {
  const history = (conv.history || []).slice(-20);
  history.push({ role: 'user', content: userMsg });

  const memoryNotes = await getMemory();

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    system: buildSystemPrompt(conv, products, memoryNotes),
    messages: history,
  });

  const text = response.content[0]?.text || 'Desculpe, tive um problema. Tente novamente.';
  return text;
}

export function parseOrder(text) {
  const m = text.match(/\*\*\*(\{.*?\})\*\*\*/s);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

export function parseImageRequest(text) {
  const m = text.match(/###(\{.*?\})###/s);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

export function cleanResponse(text) {
  return text
    .replace(/\*\*\*\{.*?\}\*\*\*/s, '')
    .replace(/###\{.*?\}###/s, '')
    .trim();
}

export function detectName(pushName, firstUserMsg) {
  if (pushName && pushName.length >= 2 && pushName !== 'Cliente') {
    return pushName.split(' ')[0];
  }
  const candidate = firstUserMsg.trim().split(/\s+/)[0].replace(/[^a-zA-ZÀ-ú]/g, '');
  if (candidate.length >= 2 && candidate.length <= 20) {
    return candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
  }
  return null;
}
