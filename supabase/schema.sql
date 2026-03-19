-- ============================================================
-- Teacher Gabriel Cantoni — Schema Supabase
-- Run this in the Supabase SQL Editor
-- ============================================================

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('professor','aluno')) DEFAULT 'aluno',
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  nivel TEXT CHECK (nivel IN ('iniciante','basico','intermediario','avancado','conversacao','certificado')),
  tipo_aula TEXT CHECK (tipo_aula IN ('regular','conversacao','certificado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PLANOS
CREATE TABLE IF NOT EXISTS planos (
  id SERIAL PRIMARY KEY,
  freq_semana INTEGER CHECK (freq_semana IN (1,2)),
  aulas_totais INTEGER NOT NULL,
  remarca_max_mes INTEGER NOT NULL,
  descricao TEXT
);

-- Seed planos
INSERT INTO planos (freq_semana, aulas_totais, remarca_max_mes, descricao)
VALUES
  (1, 20, 1, 'Plano 1x por semana — 20 aulas/semestre, 1 remarcação gratuita/mês'),
  (2, 40, 2, 'Plano 2x por semana — 40 aulas/semestre, 2 remarcações gratuitas/mês')
ON CONFLICT DO NOTHING;

-- CONTRATOS
CREATE TABLE IF NOT EXISTS contratos (
  id SERIAL PRIMARY KEY,
  aluno_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plano_id INTEGER REFERENCES planos(id),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  semestre TEXT CHECK (semestre IN ('jan-jun','jul-dez')),
  ano INTEGER NOT NULL,
  aulas_totais INTEGER NOT NULL,
  aulas_dadas INTEGER DEFAULT 0,
  aulas_restantes INTEGER NOT NULL,
  status TEXT CHECK (status IN ('ativo','vencido','cancelado')) DEFAULT 'ativo',
  livro_atual TEXT,
  nivel_atual TEXT,
  infinitepay_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AULAS
CREATE TABLE IF NOT EXISTS aulas (
  id SERIAL PRIMARY KEY,
  contrato_id INTEGER REFERENCES contratos(id) ON DELETE CASCADE,
  google_event_id TEXT UNIQUE,
  data_hora TIMESTAMPTZ NOT NULL,
  duracao_minutos INTEGER DEFAULT 45,
  status TEXT CHECK (status IN ('agendada','confirmada','dada','cancelada','remarcada')) DEFAULT 'agendada',
  aviso_horas_antecedencia DECIMAL,
  remarcada_de INTEGER REFERENCES aulas(id),
  meet_link TEXT,
  homework TEXT,
  homework_completed BOOLEAN DEFAULT FALSE,
  homework_notificado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REMARCACOES POR MÊS
CREATE TABLE IF NOT EXISTS remarcacoes_mes (
  id SERIAL PRIMARY KEY,
  aluno_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mes DATE NOT NULL,
  quantidade INTEGER DEFAULT 0,
  UNIQUE(aluno_id, mes)
);

-- PAGAMENTOS
CREATE TABLE IF NOT EXISTS pagamentos (
  id SERIAL PRIMARY KEY,
  contrato_id INTEGER REFERENCES contratos(id) ON DELETE CASCADE,
  parcela_num INTEGER CHECK (parcela_num BETWEEN 1 AND 6),
  valor DECIMAL(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  forma TEXT CHECK (forma IN ('pix','cartao')),
  infinitepay_invoice_id TEXT UNIQUE,
  pix_qrcode_base64 TEXT,
  pix_copia_cola TEXT,
  status TEXT CHECK (status IN ('pendente','pago','atrasado','vencido')) DEFAULT 'pendente',
  email_enviado BOOLEAN DEFAULT FALSE,
  lembrete_enviado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE remarcacoes_mes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE planos ENABLE ROW LEVEL SECURITY;

-- Helper: is professor
CREATE OR REPLACE FUNCTION is_professor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'professor'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PLANOS: todos podem ler
CREATE POLICY "planos_read_all" ON planos FOR SELECT USING (true);

-- PROFILES
CREATE POLICY "professor_all_profiles" ON profiles
  FOR ALL USING (is_professor());

CREATE POLICY "aluno_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "aluno_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- CONTRATOS
CREATE POLICY "professor_all_contratos" ON contratos
  FOR ALL USING (is_professor());

CREATE POLICY "aluno_own_contratos" ON contratos
  FOR SELECT USING (aluno_id = auth.uid());

-- AULAS
CREATE POLICY "professor_all_aulas" ON aulas
  FOR ALL USING (is_professor());

CREATE POLICY "aluno_own_aulas" ON aulas
  FOR SELECT USING (
    contrato_id IN (SELECT id FROM contratos WHERE aluno_id = auth.uid())
  );

-- REMARCACOES
CREATE POLICY "professor_all_remarcacoes" ON remarcacoes_mes
  FOR ALL USING (is_professor());

CREATE POLICY "aluno_own_remarcacoes" ON remarcacoes_mes
  FOR SELECT USING (aluno_id = auth.uid());

-- PAGAMENTOS
CREATE POLICY "professor_all_pagamentos" ON pagamentos
  FOR ALL USING (is_professor());

CREATE POLICY "aluno_own_pagamentos" ON pagamentos
  FOR SELECT USING (
    contrato_id IN (SELECT id FROM contratos WHERE aluno_id = auth.uid())
  );

-- ============================================================
-- FUNCTION: atualizar aulas_dadas e aulas_restantes
-- ============================================================
CREATE OR REPLACE FUNCTION atualizar_contagem_aulas()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contratos SET
    aulas_dadas = (
      SELECT COUNT(*) FROM aulas
      WHERE contrato_id = NEW.contrato_id AND status = 'dada'
    ),
    aulas_restantes = aulas_totais - (
      SELECT COUNT(*) FROM aulas
      WHERE contrato_id = NEW.contrato_id AND status = 'dada'
    )
  WHERE id = NEW.contrato_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_contagem
AFTER INSERT OR UPDATE ON aulas
FOR EACH ROW EXECUTE FUNCTION atualizar_contagem_aulas();

-- ============================================================
-- pg_cron jobs (run after enabling pg_cron extension)
-- ============================================================
-- Enable: CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Marcar pagamentos atrasados todo dia às 8h
-- SELECT cron.schedule('marcar-atrasados', '0 8 * * *', $$
--   UPDATE pagamentos
--   SET status = 'atrasado'
--   WHERE status = 'pendente'
--   AND data_vencimento < CURRENT_DATE;
-- $$);
