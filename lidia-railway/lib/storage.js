import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on('error', (err) => console.error('[Redis] Erro:', err.message));

// ── Conversas ──────────────────────────────────────────────

export async function getConversation(phone) {
  const raw = await redis.get(`conv:${phone}`);
  return raw ? JSON.parse(raw) : null;
}

export async function saveConversation(phone, conv) {
  await redis.set(`conv:${phone}`, JSON.stringify(conv));
  await redis.zadd('conv:recent', Date.now(), phone);
}

export async function listConversations() {
  const phones = await redis.zrevrange('conv:recent', 0, 49);
  if (!phones.length) return [];
  const convs = await Promise.all(phones.map(p => redis.get(`conv:${p}`)));
  return convs.filter(Boolean).map(c => JSON.parse(c));
}

export async function deleteConversation(phone) {
  await redis.del(`conv:${phone}`);
  await redis.zrem('conv:recent', phone);
}

// ── Produtos ───────────────────────────────────────────────

export async function getProducts() {
  const raw = await redis.get('products');
  return raw ? JSON.parse(raw) : getDefaultProducts();
}

export async function saveProducts(products) {
  await redis.set('products', JSON.stringify(products));
}

// ── Pedidos ────────────────────────────────────────────────

export async function addOrder(order) {
  const raw = await redis.get('orders');
  const orders = raw ? JSON.parse(raw) : [];
  orders.unshift(order);
  await redis.set('orders', JSON.stringify(orders.slice(0, 200)));
}

export async function getOrders() {
  const raw = await redis.get('orders');
  return raw ? JSON.parse(raw) : [];
}

export async function removeOrder(id) {
  const raw = await redis.get('orders');
  const orders = raw ? JSON.parse(raw) : [];
  await redis.set('orders', JSON.stringify(orders.filter(o => o.id !== id)));
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
    { id: 9, nome: 'Braquete Metálico (kit 5 dentes)', cat: 'Odontologia', preco: 85.00, desc: 'Braquetes metálicos standard Roth 0.022. Embalagem com 5 unidades.', estoque: 'Sob encomenda', imagem: '' },
    { id: 10, nome: 'Oxímetro de Pulso', cat: 'Diagnóstico', preco: 89.90, desc: 'Oxímetro digital portátil para medição de SpO2 e frequência cardíaca. Display OLED.', estoque: 'Disponível', imagem: '' },
  ];
}
