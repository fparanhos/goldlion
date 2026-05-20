-- =====================================================
-- Adiciona coluna `status` em perfis para controlar
-- acesso (pendente / ativo / inativo) — usado pelo
-- auto-cadastro de professor e tambem pelo de aluno.
-- =====================================================

ALTER TABLE perfis
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo'
  CHECK (status IN ('pendente', 'ativo', 'inativo'));

CREATE INDEX IF NOT EXISTS idx_perfis_status ON perfis(status);
