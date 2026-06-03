import { kv } from '@vercel/kv';

// ── Conversas ──────────────────────────────────────────────

export async function getConversation(phone) {
  return await kv.get(`conv:${phone}`);
}

export async function saveConversation(phone, conv) {
  await kv.set(`conv:${phone}`, conv);
  await kv.zadd('conv:recent', { score: Date.now(), member: phone });
}

export async function listConversations() {
  const phones = await kv.zrange('conv:recent', 0, 49, { rev: true });
  if (!phones.length) return [];
  const convs = await Promise.all(phones.map(p => kv.get(`conv:${p}`)));
  return convs.filter(Boolean);
}

export async function deleteConversation(phone) {
  await kv.del(`conv:${phone}`);
  await kv.zrem('conv:recent', phone);
}

// ── Produtos ───────────────────────────────────────────────

export async function getProducts() {
  return (await kv.get('products')) || getDefaultProducts();
}

export async function saveProducts(products) {
  await kv.set('products', products);
}

// ── Pedidos ────────────────────────────────────────────────

export async function addOrder(order) {
  const orders = (await kv.get('orders')) || [];
  orders.unshift(order);
  await kv.set('orders', orders.slice(0, 200));
}

export async function getOrders() {
  return (await kv.get('orders')) || [];
}

export async function removeOrder(id) {
  const orders = (await kv.get('orders')) || [];
  await kv.set('orders', orders.filter(o => o.id !== id));
}

// ── Memória da IA ──────────────────────────────────────────

export async function getMemory() {
  return (await kv.get('memory:notes')) || [];
}

export async function saveMemory(notes) {
  await kv.set('memory:notes', notes);
}

// ── Produtos padrão ────────────────────────────────────────

function getDefaultProducts() {
  return [
    { id: 1, nome: 'Máscara N95 PFF2', cat: 'EPIs / Proteção', preco: 4.90, desc: 'Máscara de proteção respiratória com filtro PFF2. Homologada pelo INMETRO.', estoque: 'Disponível', imagem: '' },
    { id: 2, nome: 'Luva de Procedimento (cx 100)', cat: 'Hospitalar', preco: 28.50, desc: 'Luvas descartáveis de látex sem pó, tamanhos P, M e G. Caixa com 100 unidades.', estoque: 'Disponível', imagem: '' },
    { id: 3, nome: 'Termômetro Digital Axilar', cat: 'Saúde Geral', preco: 39.90, desc: 'Termômetro clínico digital com leitura em 60 segundos, alarme sonoro e memória de última leitura.', estoque: 'Disponível', imagem: '' },
    { id: 4, nome: 'Curativo Estéril 10x10cm', cat: 'Hospitalar', preco: 2.50, desc: 'Curativo não-aderente estéril para cobrir feridas, cortes e queimaduras.', estoque: 'Disponível', imagem: '' },
    { id: 5, nome: 'Kit Exame Odontológico', cat: 'Odontologia', preco: 45.00, desc: 'Kit completo com espelho bucal, sonda milimetrada e pinça clínica em inox autoclavável.', estoque: 'Disponível', imagem: '' },
    { id: 6, nome: 'Aparelho de Pressão Digital', cat: 'Saúde Geral', preco: 129.90, desc: 'Esfigmomanômetro digital de pulso com detecção de arritmia, memória para 2 usuários.', estoque: 'Disponível', imagem: '' },
    { id: 7, nome: 'Algodão Hidrófilo 500g', cat: 'Saúde Geral', preco: 19.90, desc: 'Rolo de algodão hidrófilo 100% puro, embalagem 500g.', estoque: 'Disponível', imagem: '' },
    { id: 8, nome: 'Álcool Gel 70% 500ml', cat: 'Hospitalar', preco: 12.00, desc: 'Antisséptico em gel para higienização das mãos com 70% de álcool etílico.', estoque: 'Disponível', imagem: '' },
    { id: 9, nome: 'Braquete Metálico (kit 5 dentes)', cat: 'Odontologia', preco: 85.00, desc: 'Braquete