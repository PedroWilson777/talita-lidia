import { supabase } from './supabase.js';

// ── Conversas ──────────────────────────────────────────────

export async function getConversation(phone) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('phone', phone)
    .single();
    
  if (error || !data) return null;
  return data;
}

export async function saveConversation(phone, conv) {
  const { error } = await supabase
    .from('conversations')
    .upsert({
      phone: conv.phone,
      phone_clean: conv.phoneClean,
      client_name: conv.clientName,
      history: conv.history,
      messages: conv.messages,
      last_msg: conv.lastMsg,
      last_time: conv.lastTime || new Date().toISOString(),
    });
    
  if (error) console.error('Erro ao salvar conversa:', error);
}

export async function listConversations() {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('last_time', { ascending: false })
    .limit(50);
    
  return data || [];
}

export async function deleteConversation(phone) {
  await supabase.from('conversations').delete().eq('phone', phone);
}

// ── Produtos ───────────────────────────────────────────────

export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('id', { ascending: true });
    
  if (error || !data || data.length === 0) {
    return getDefaultProducts(); // fallback if db is empty or error
  }
  return data;
}

export async function saveProducts(products) {
  // O ideal no Supabase seria usar upsert.
  // Como 'products' vem do front, vamos tentar upsert:
  const { error } = await supabase.from('products').upsert(products);
  if (error) console.error('Erro ao salvar produtos no Supabase:', error);
}

// ── Pedidos ────────────────────────────────────────────────

export async function addOrder(order) {
  const { error } = await supabase
    .from('orders')
    .insert([{
      id: order.id,
      client: order.client,
      phone: order.phone,
      produto: order.produto,
      qtd: order.qtd,
      obs: order.obs,
      status: order.status
    }]);
    
  if (error) console.error('Erro ao salvar pedido:', error);
}

export async function getOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
    
  return data || [];
}

export async function removeOrder(id) {
  await supabase.from('orders').delete().eq('id', id);
}

// ── Memória da IA ──────────────────────────────────────────

export async function getMemory() {
  const { data, error } = await supabase
    .from('memory')
    .select('note')
    .order('created_at', { ascending: true });
    
  if (error || !data) return [];
  return data.map(m => m.note);
}

export async function saveMemory(notes) {
  // Clear and insert to match previous behavior
  await supabase.from('memory').delete().neq('id', 0); // delete all
  if (notes && notes.length > 0) {
    const inserts = notes.map(n => ({ note: n }));
    await supabase.from('memory').insert(inserts);
  }
}

// ── Produtos padrão (Apenas fallback) ──────────────────────

function getDefaultProducts() {
  return [
    { id: 1, nome: 'Máscara N95 PFF2', cat: 'EPIs / Proteção', preco: 4.90, description: 'Máscara de proteção respiratória com filtro PFF2. Homologada pelo INMETRO.', estoque: 'Disponível', imagem: '' },
    { id: 2, nome: 'Luva de Procedimento (cx 100)', cat: 'Hospitalar', preco: 28.50, description: 'Luvas descartáveis de látex sem pó, tamanhos P, M e G. Caixa com 100 unidades.', estoque: 'Disponível', imagem: '' }
  ];
}
