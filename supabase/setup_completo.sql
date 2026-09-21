-- =====================================================
-- GOLD LION - SETUP COMPLETO (projeto Supabase novo)
-- Consolida schema.sql + migrations incrementais na ordem certa.
-- Rodar UMA VEZ no SQL Editor de um projeto vazio.
-- NAO inclui migration_modalidades.sql (schema.sql ja nasce com a tabela)
-- nem add_pendente_status.sql (enum ja nasce com 'pendente').
-- Gerado em 2026-09-21 apos perda do projeto antigo (sahjecjmycixgpkfwfgt).
-- =====================================================


-- ##### schema.sql #####
-- =====================================================
-- GOLD LION ACADEMY - Database Schema
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- Tipos enumerados
CREATE TYPE perfil_usuario AS ENUM ('admin', 'professor', 'aluno');
-- (modalidades viraram tabela dinamica - veja secao "MODALIDADES" abaixo)
CREATE TYPE status_aluno AS ENUM ('pendente', 'ativo', 'inadimplente', 'trancado', 'cancelado');
CREATE TYPE tipo_plano AS ENUM ('mensal', 'trimestral', 'semestral', 'anual');
CREATE TYPE forma_pagamento AS ENUM ('pix', 'cartao', 'dinheiro', 'boleto');
CREATE TYPE status_pagamento AS ENUM ('pago', 'pendente', 'atrasado', 'cancelado');
CREATE TYPE faixa_jiu AS ENUM ('branca', 'azul', 'roxa', 'marrom', 'preta', 'coral', 'vermelha');

-- =====================================================
-- PERFIS (extensao do auth.users do Supabase)
-- =====================================================
CREATE TABLE perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  perfil perfil_usuario NOT NULL DEFAULT 'aluno',
  foto_url TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- PLANOS
-- =====================================================
-- =====================================================
-- MODALIDADES (dinamicas - gerenciadas via tela admin)
-- =====================================================
CREATE TABLE modalidades (
  slug TEXT PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  cor TEXT NOT NULL DEFAULT 'bg-gray-600',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem SMALLINT NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modalidades_ativo ON modalidades(ativo);

CREATE TABLE planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo tipo_plano NOT NULL,
  modalidades TEXT[] NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ALUNOS (dados complementares ao perfil)
-- =====================================================
CREATE TABLE alunos (
  id UUID PRIMARY KEY REFERENCES perfis(id) ON DELETE CASCADE,
  cpf TEXT,
  data_nascimento DATE,
  contato_emergencia TEXT,
  telefone_emergencia TEXT,
  modalidades TEXT[] NOT NULL DEFAULT '{}',
  plano_id UUID REFERENCES planos(id),
  status status_aluno NOT NULL DEFAULT 'ativo',
  faixa faixa_jiu,
  data_inicio_plano DATE,
  data_fim_plano DATE,
  asaas_customer_id TEXT, -- ID do cliente no Asaas
  observacoes TEXT
);

-- =====================================================
-- PAGAMENTOS
-- =====================================================
CREATE TABLE pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  valor DECIMAL(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  forma_pagamento forma_pagamento,
  status status_pagamento NOT NULL DEFAULT 'pendente',
  referencia TEXT NOT NULL, -- ex: "03/2026"
  asaas_payment_id TEXT, -- ID da cobranca no Asaas
  asaas_invoice_url TEXT, -- Link de pagamento
  comprovante_url TEXT, -- URL do comprovante enviado pelo aluno
  sinalizado_em TIMESTAMPTZ, -- Data em que o aluno sinalizou o pagamento
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- CHECK-INS
-- =====================================================
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  data_hora_entrada TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_hora_saida TIMESTAMPTZ,
  modalidade TEXT NOT NULL REFERENCES modalidades(slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  validado BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- MENSAGENS (mural de comunicacao)
-- =====================================================
CREATE TABLE mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remetente_id UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  canal TEXT NOT NULL DEFAULT 'geral', -- geral, muaythai, boxe, jiujitsu
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- AULAS (grade horaria)
-- =====================================================
CREATE TABLE aulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modalidade TEXT NOT NULL REFERENCES modalidades(slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  professor_id UUID NOT NULL REFERENCES perfis(id),
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  vagas INTEGER NOT NULL DEFAULT 20,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- NOTIFICACOES PUSH
-- =====================================================
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_alunos_status ON alunos(status);
CREATE INDEX idx_pagamentos_aluno ON pagamentos(aluno_id);
CREATE INDEX idx_pagamentos_status ON pagamentos(status);
CREATE INDEX idx_pagamentos_vencimento ON pagamentos(data_vencimento);
CREATE INDEX idx_checkins_aluno ON checkins(aluno_id);
CREATE INDEX idx_checkins_data ON checkins(data_hora_entrada);
CREATE INDEX idx_mensagens_canal ON mensagens(canal);
CREATE INDEX idx_mensagens_criado ON mensagens(criado_em DESC);
CREATE INDEX idx_aulas_dia ON aulas(dia_semana);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Perfis: admin ve tudo, usuario ve o proprio
CREATE POLICY "Admin ve todos os perfis" ON perfis
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'admin')
  );

CREATE POLICY "Professor ve todos os perfis" ON perfis
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'professor')
  );

CREATE POLICY "Usuario ve proprio perfil" ON perfis
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admin gerencia perfis" ON perfis
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'admin')
  );

-- Alunos: admin e professor veem todos, aluno ve o proprio
CREATE POLICY "Admin ve todos alunos" ON alunos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil IN ('admin', 'professor'))
  );

CREATE POLICY "Aluno ve proprio registro" ON alunos
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admin gerencia alunos" ON alunos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'admin')
  );

-- Pagamentos: admin ve todos, aluno ve os proprios
CREATE POLICY "Admin ve todos pagamentos" ON pagamentos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'admin')
  );

CREATE POLICY "Aluno ve proprios pagamentos" ON pagamentos
  FOR SELECT USING (aluno_id = auth.uid());

CREATE POLICY "Admin gerencia pagamentos" ON pagamentos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'admin')
  );

-- Check-ins: admin e professor veem todos, aluno ve os proprios
CREATE POLICY "Admin e professor veem checkins" ON checkins
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil IN ('admin', 'professor'))
  );

CREATE POLICY "Aluno ve proprios checkins" ON checkins
  FOR SELECT USING (aluno_id = auth.uid());

CREATE POLICY "Aluno faz checkin" ON checkins
  FOR INSERT WITH CHECK (aluno_id = auth.uid());

-- Mensagens: todos veem mensagens dos canais
CREATE POLICY "Todos veem mensagens" ON mensagens
  FOR SELECT USING (true);

CREATE POLICY "Admin e professor enviam mensagens" ON mensagens
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil IN ('admin', 'professor'))
  );

-- Aulas: todos veem
CREATE POLICY "Todos veem aulas" ON aulas
  FOR SELECT USING (true);

CREATE POLICY "Admin gerencia aulas" ON aulas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'admin')
  );

-- Planos: todos veem
CREATE POLICY "Todos veem planos" ON planos
  FOR SELECT USING (true);

CREATE POLICY "Admin gerencia planos" ON planos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'admin')
  );

-- Modalidades: todos veem
CREATE POLICY "Todos veem modalidades" ON modalidades
  FOR SELECT USING (true);

CREATE POLICY "Admin gerencia modalidades" ON modalidades
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'admin')
  );

-- Push subscriptions: usuario gerencia as proprias
CREATE POLICY "Usuario ve proprias subscriptions" ON push_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Usuario gerencia proprias subscriptions" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- FUNCAO: criar perfil automaticamente ao registrar
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfis (id, nome, email, perfil)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'perfil')::perfil_usuario, 'aluno')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- FUNCAO: atualizar status de inadimplente automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION public.atualizar_inadimplentes()
RETURNS void AS $$
BEGIN
  UPDATE alunos SET status = 'inadimplente'
  WHERE id IN (
    SELECT DISTINCT aluno_id FROM pagamentos
    WHERE status = 'atrasado'
  )
  AND status = 'ativo';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- FUNCAO: marcar pagamentos atrasados
-- =====================================================
CREATE OR REPLACE FUNCTION public.marcar_pagamentos_atrasados()
RETURNS void AS $$
BEGIN
  UPDATE pagamentos
  SET status = 'atrasado'
  WHERE status = 'pendente'
  AND data_vencimento < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- DADOS INICIAIS: Modalidades padrao
-- =====================================================
INSERT INTO modalidades (slug, nome, cor, ordem) VALUES
  ('muaythai', 'Muay Thai', 'bg-red-600',    1),
  ('boxe',     'Boxe',      'bg-blue-600',   2),
  ('jiujitsu', 'Jiu-Jitsu', 'bg-purple-600', 3)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- DADOS INICIAIS: Planos padrao
-- =====================================================
INSERT INTO planos (nome, tipo, modalidades, valor) VALUES
  ('Muay Thai Mensal', 'mensal', '{muaythai}', 120.00),
  ('Boxe Mensal', 'mensal', '{boxe}', 120.00),
  ('Jiu-Jitsu Mensal', 'mensal', '{jiujitsu}', 150.00),
  ('Combo 2 Modalidades', 'mensal', '{muaythai,boxe}', 200.00),
  ('Combo Completo Mensal', 'mensal', '{muaythai,boxe,jiujitsu}', 280.00),
  ('Combo Completo Trimestral', 'trimestral', '{muaythai,boxe,jiujitsu}', 750.00),
  ('Combo Completo Semestral', 'semestral', '{muaythai,boxe,jiujitsu}', 1350.00),
  ('Combo Completo Anual', 'anual', '{muaythai,boxe,jiujitsu}', 2400.00);

-- ##### add_comprovante_pagamento.sql #####
-- Migration: Adicionar campos de comprovante de pagamento
-- Execute este SQL no Supabase SQL Editor

-- Campos na tabela pagamentos
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS comprovante_url TEXT;
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS sinalizado_em TIMESTAMPTZ;

-- Bucket de storage para comprovantes
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', true)
ON CONFLICT (id) DO NOTHING;

-- Politica: aluno pode fazer upload na sua pasta
CREATE POLICY "Aluno faz upload de comprovante"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'comprovantes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Politica: todos autenticados podem ver comprovantes
CREATE POLICY "Autenticados veem comprovantes"
ON storage.objects FOR SELECT
USING (bucket_id = 'comprovantes');

-- Politica: aluno pode atualizar pagamento com comprovante (apenas campos permitidos)
CREATE POLICY "Aluno sinaliza pagamento"
ON pagamentos FOR UPDATE
USING (aluno_id = auth.uid())
WITH CHECK (aluno_id = auth.uid());

-- ##### add_substituto.sql #####
-- Adicionar coluna de professor substituto na tabela aulas
ALTER TABLE aulas ADD COLUMN IF NOT EXISTS substituto_id UUID REFERENCES perfis(id);

-- ##### add_aula_id_checkin.sql #####
-- =====================================================
-- ADICIONAR REFERENCIA DE AULA NO CHECK-IN
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

ALTER TABLE checkins
  ADD COLUMN IF NOT EXISTS aula_id UUID REFERENCES aulas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_checkins_aula ON checkins(aula_id);

-- Permitir que o aluno DELETE seus proprios checkins (para cancelamento ate X minutos)
-- A janela de tempo e validada na API.
DROP POLICY IF EXISTS "Aluno cancela proprio checkin" ON checkins;
CREATE POLICY "Aluno cancela proprio checkin" ON checkins
  FOR DELETE USING (aluno_id = auth.uid());

-- ##### fix_rls_recursion.sql #####
-- =====================================================
-- FIX: infinite recursion detected in policy for relation "perfis"
-- =====================================================
-- Causa: policies em perfis (e em outras tabelas) consultam perfis
-- via EXISTS (SELECT 1 FROM perfis ...), o que dispara RLS recursivamente.
--
-- Solucao: funcoes SECURITY DEFINER que leem perfis bypassando RLS,
-- e policies que chamam essas funcoes em vez de subquery direta.
--
-- Aplicar via SQL editor do Supabase. Idempotente (pode rodar de novo).
-- =====================================================


-- -----------------------------------------------------
-- 1) Funcoes auxiliares (SECURITY DEFINER bypassa RLS)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfis
    WHERE id = auth.uid() AND perfil = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_professor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfis
    WHERE id = auth.uid() AND perfil IN ('admin', 'professor')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_professor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfis
    WHERE id = auth.uid() AND perfil = 'professor'
  );
$$;

-- -----------------------------------------------------
-- 2) PERFIS — drop policies recursivas e recriar
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Admin ve todos os perfis" ON perfis;
DROP POLICY IF EXISTS "Professor ve todos os perfis" ON perfis;
DROP POLICY IF EXISTS "Usuario ve proprio perfil" ON perfis;
DROP POLICY IF EXISTS "Admin gerencia perfis" ON perfis;

CREATE POLICY "Usuario ve proprio perfil" ON perfis
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admin e professor veem perfis" ON perfis
  FOR SELECT USING (public.is_admin_or_professor());

CREATE POLICY "Admin gerencia perfis" ON perfis
  FOR ALL USING (public.is_admin());

-- -----------------------------------------------------
-- 3) ALUNOS
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Admin ve todos alunos" ON alunos;
DROP POLICY IF EXISTS "Aluno ve proprio registro" ON alunos;
DROP POLICY IF EXISTS "Admin gerencia alunos" ON alunos;

CREATE POLICY "Aluno ve proprio registro" ON alunos
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admin e professor veem alunos" ON alunos
  FOR SELECT USING (public.is_admin_or_professor());

CREATE POLICY "Admin gerencia alunos" ON alunos
  FOR ALL USING (public.is_admin());

-- -----------------------------------------------------
-- 4) PAGAMENTOS
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Admin ve todos pagamentos" ON pagamentos;
DROP POLICY IF EXISTS "Aluno ve proprios pagamentos" ON pagamentos;
DROP POLICY IF EXISTS "Admin gerencia pagamentos" ON pagamentos;

CREATE POLICY "Aluno ve proprios pagamentos" ON pagamentos
  FOR SELECT USING (aluno_id = auth.uid());

CREATE POLICY "Admin ve todos pagamentos" ON pagamentos
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin gerencia pagamentos" ON pagamentos
  FOR ALL USING (public.is_admin());

-- -----------------------------------------------------
-- 5) CHECKINS
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Admin e professor veem checkins" ON checkins;
DROP POLICY IF EXISTS "Aluno ve proprios checkins" ON checkins;
DROP POLICY IF EXISTS "Aluno faz checkin" ON checkins;

CREATE POLICY "Aluno ve proprios checkins" ON checkins
  FOR SELECT USING (aluno_id = auth.uid());

CREATE POLICY "Admin e professor veem checkins" ON checkins
  FOR SELECT USING (public.is_admin_or_professor());

CREATE POLICY "Aluno faz checkin" ON checkins
  FOR INSERT WITH CHECK (aluno_id = auth.uid());

-- -----------------------------------------------------
-- 6) MENSAGENS
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Todos veem mensagens" ON mensagens;
DROP POLICY IF EXISTS "Admin e professor enviam mensagens" ON mensagens;

CREATE POLICY "Todos veem mensagens" ON mensagens
  FOR SELECT USING (true);

CREATE POLICY "Admin e professor enviam mensagens" ON mensagens
  FOR INSERT WITH CHECK (public.is_admin_or_professor());

-- -----------------------------------------------------
-- 7) AULAS
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Todos veem aulas" ON aulas;
DROP POLICY IF EXISTS "Admin gerencia aulas" ON aulas;

CREATE POLICY "Todos veem aulas" ON aulas
  FOR SELECT USING (true);

CREATE POLICY "Admin gerencia aulas" ON aulas
  FOR ALL USING (public.is_admin());

-- -----------------------------------------------------
-- 8) PLANOS
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Todos veem planos" ON planos;
DROP POLICY IF EXISTS "Admin gerencia planos" ON planos;

CREATE POLICY "Todos veem planos" ON planos
  FOR SELECT USING (true);

CREATE POLICY "Admin gerencia planos" ON planos
  FOR ALL USING (public.is_admin());

-- -----------------------------------------------------
-- 9) MODALIDADES
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Todos veem modalidades" ON modalidades;
DROP POLICY IF EXISTS "Admin gerencia modalidades" ON modalidades;

CREATE POLICY "Todos veem modalidades" ON modalidades
  FOR SELECT USING (true);

CREATE POLICY "Admin gerencia modalidades" ON modalidades
  FOR ALL USING (public.is_admin());


-- =====================================================
-- Verificacao rapida (rodar separado, fora da transacao):
--   SELECT public.is_admin();              -- TRUE se logado como admin
--   SELECT public.is_admin_or_professor();
--   SELECT * FROM perfis LIMIT 1;          -- nao pode mais dar recursion
--   SELECT * FROM checkins LIMIT 1;
-- =====================================================

-- ##### add_validacao_checkin.sql #####
-- =====================================================
-- Adiciona campos de validacao manual de check-in
-- + Policy de UPDATE para admin/professor
-- =====================================================
-- Requer: fix_rls_recursion.sql ja aplicado (usa is_admin_or_professor)
-- =====================================================


-- 1) Colunas de rastreamento da validacao
ALTER TABLE checkins
  ADD COLUMN IF NOT EXISTS validado_por UUID REFERENCES perfis(id),
  ADD COLUMN IF NOT EXISTS validado_em TIMESTAMPTZ;

-- 2) Permitir admin e professor atualizarem checkins (para validacao manual)
DROP POLICY IF EXISTS "Admin e professor validam checkins" ON checkins;

CREATE POLICY "Admin e professor validam checkins" ON checkins
  FOR UPDATE
  USING (public.is_admin_or_professor())
  WITH CHECK (public.is_admin_or_professor());


-- ##### add_status_perfis.sql #####
-- =====================================================
-- Adiciona coluna `status` em perfis para controlar
-- acesso (pendente / ativo / inativo) — usado pelo
-- auto-cadastro de professor e tambem pelo de aluno.
-- =====================================================

ALTER TABLE perfis
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo'
  CHECK (status IN ('pendente', 'ativo', 'inativo'));

CREATE INDEX IF NOT EXISTS idx_perfis_status ON perfis(status);
