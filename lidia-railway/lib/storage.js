import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

// ── Conversas ──────────────────────────────────────────────

export async function getConversation(phone) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('phone', phone)
    .single();
  if (error || !data) return null;
  return {
    phone: data.phone,
    phoneClean: data.phone_clean,
    clientName: data.client_name,
    history: data.history || [],
    messages: data.messages || [],
    lastMsg: data.last_msg,
    lastTime: data.last_time,
  };
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
  if (error) return [];
  return (data || []).map(d => ({
    phone: d.phone,
    phoneClean: d.phone_clean,
    clientName: d.client_name,
    history: d.history || [],
    messages: d.messages || [],
    lastMsg: d.last_msg,
    lastTime: d.last_time,
  }));
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
  if (error || !data || data.length === 0) return getDefaultProducts();
  return data.map(p => ({ ...p, desc: p.description }));
}

export async function saveProducts(products) {
  const toSave = products.map(p => ({
    id: p.id,
    nome: p.nome,
    cat: p.cat,
    preco: p.preco,
    description: p.desc || p.description || '',
    estoque: p.estoque || 'Disponível',
    imagem: p.imagem || '',
  }));
  const { error } = await supabase.from('products').upsert(toSave);
  if (error) console.error('Erro ao salvar produtos:', error);
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
      status: order.status,
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

// ── Produtos padrão (fallback) ──────────────────────────────

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
