-- Schema do Supabase para Talita Saúde

-- 1. Tabela de Conversas
CREATE TABLE IF NOT EXISTS public.conversations (
  phone TEXT PRIMARY KEY,
  phone_clean TEXT NOT NULL,
  client_name TEXT,
  history JSONB DEFAULT '[]'::jsonb,
  messages JSONB DEFAULT '[]'::jsonb,
  last_msg TEXT,
  last_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Produtos
CREATE TABLE IF NOT EXISTS public.products (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  cat TEXT NOT NULL,
  preco NUMERIC(10, 2) NOT NULL,
  description TEXT,
  estoque TEXT DEFAULT 'Disponível',
  imagem TEXT
);

-- Inserindo produtos padrão iniciais
INSERT INTO public.products (nome, cat, preco, description, estoque, imagem) VALUES
('Máscara N95 PFF2', 'EPIs / Proteção', 4.90, 'Máscara de proteção respiratória com filtro PFF2. Homologada pelo INMETRO.', 'Disponível', ''),
('Luva de Procedimento (cx 100)', 'Hospitalar', 28.50, 'Luvas descartáveis de látex sem pó, tamanhos P, M e G. Caixa com 100 unidades.', 'Disponível', ''),
('Termômetro Digital Axilar', 'Saúde Geral', 39.90, 'Termômetro clínico digital com leitura em 60 segundos, alarme sonoro e memória de última leitura.', 'Disponível', ''),
('Curativo Estéril 10x10cm', 'Hospitalar', 2.50, 'Curativo não-aderente estéril para cobrir feridas, cortes e queimaduras.', 'Disponível', ''),
('Kit Exame Odontológico', 'Odontologia', 45.00, 'Kit completo com espelho bucal, sonda milimetrada e pinça clínica em inox autoclavável.', 'Disponível', ''),
('Aparelho de Pressão Digital', 'Saúde Geral', 129.90, 'Esfigmomanômetro digital de pulso com detecção de arritmia, memória para 2 usuários.', 'Disponível', ''),
('Algodão Hidrófilo 500g', 'Saúde Geral', 19.90, 'Rolo de algodão hidrófilo 100% puro, embalagem 500g.', 'Disponível', ''),
('Álcool Gel 70% 500ml', 'Hospitalar', 12.00, 'Antisséptico em gel para higienização das mãos com 70% de álcool etílico.', 'Disponível', ''),
('Braquete Metálico (kit 5 dentes)', 'Odontologia', 85.00, 'Braquetes metálicos standard Roth 0.022. Embalagem com 5 unidades.', 'Sob encomenda', ''),
('Oxímetro de Pulso', 'Diagnóstico', 89.90, 'Oxímetro digital portátil para medição de SpO2 e frequência cardíaca. Display OLED.', 'Disponível', '')
ON CONFLICT DO NOTHING;

-- 3. Tabela de Pedidos
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  client TEXT NOT NULL,
  phone TEXT NOT NULL,
  produto TEXT NOT NULL,
  qtd INTEGER DEFAULT 1,
  obs TEXT,
  status TEXT DEFAULT 'novo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Memória (Avisos globais da IA)
CREATE TABLE IF NOT EXISTS public.memory (
  id SERIAL PRIMARY KEY,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Opcional, mas recomendado. No momento, deixamos políticas permissivas para o admin API)
-- Se você for expor ao frontend diretamente (anon key), precisaria de políticas RLS restritas.
-- Para backend via webhook, usaremos a SERVICE_ROLE_KEY ou configuraremos anon key com acesso total provisório.
