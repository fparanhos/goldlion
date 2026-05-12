-- =====================================================
-- Migracao: ENUM "modalidade" -> tabela "modalidades"
-- Rodar UMA VEZ no Supabase SQL Editor antes de fazer o deploy do codigo.
-- Recomendado: criar backup do banco antes (Dashboard > Database > Backups).
-- =====================================================

-- Pre-checagem opcional (rodar isolado antes do bloco abaixo):
--   SELECT DISTINCT modalidade FROM aulas;
--   SELECT DISTINCT modalidade FROM checkins;
--   SELECT DISTINCT unnest(modalidades) FROM alunos;
--   SELECT DISTINCT unnest(modalidades) FROM planos;
-- Se aparecer algum slug fora de muaythai/boxe/jiujitsu, popule-o em
-- "modalidades" antes do passo 5 (FK) ou a constraint vai falhar.

BEGIN;

-- 1) Converter colunas do ENUM para TEXT
ALTER TABLE planos   ALTER COLUMN modalidades TYPE TEXT[] USING modalidades::TEXT[];
ALTER TABLE alunos   ALTER COLUMN modalidades TYPE TEXT[] USING modalidades::TEXT[];
ALTER TABLE checkins ALTER COLUMN modalidade  TYPE TEXT   USING modalidade::TEXT;
ALTER TABLE aulas    ALTER COLUMN modalidade  TYPE TEXT   USING modalidade::TEXT;

ALTER TABLE alunos   ALTER COLUMN modalidades SET DEFAULT '{}'::TEXT[];

-- 2) Dropar o ENUM (sem usuarios)
DROP TYPE IF EXISTS modalidade;

-- 3) Tabela "modalidades"
CREATE TABLE IF NOT EXISTS modalidades (
  slug TEXT PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  cor TEXT NOT NULL DEFAULT 'bg-gray-600',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem SMALLINT NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) Popular com as 3 modalidades atuais
INSERT INTO modalidades (slug, nome, cor, ordem) VALUES
  ('muaythai', 'Muay Thai', 'bg-red-600',    1),
  ('boxe',     'Boxe',      'bg-blue-600',   2),
  ('jiujitsu', 'Jiu-Jitsu', 'bg-purple-600', 3)
ON CONFLICT (slug) DO NOTHING;

-- 5) FKs nas colunas escalares
ALTER TABLE checkins
  ADD CONSTRAINT checkins_modalidade_fkey
  FOREIGN KEY (modalidade) REFERENCES modalidades(slug)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE aulas
  ADD CONSTRAINT aulas_modalidade_fkey
  FOREIGN KEY (modalidade) REFERENCES modalidades(slug)
  ON UPDATE CASCADE ON DELETE RESTRICT;

-- 6) Indice + RLS
CREATE INDEX IF NOT EXISTS idx_modalidades_ativo ON modalidades(ativo);

ALTER TABLE modalidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos veem modalidades" ON modalidades
  FOR SELECT USING (true);

CREATE POLICY "Admin gerencia modalidades" ON modalidades
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'admin')
  );

COMMIT;

-- Verificacao final:
--   SELECT * FROM modalidades;
--   \d aulas
--   \d planos
