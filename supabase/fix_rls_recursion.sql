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

BEGIN;

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

COMMIT;

-- =====================================================
-- Verificacao rapida (rodar separado, fora da transacao):
--   SELECT public.is_admin();              -- TRUE se logado como admin
--   SELECT public.is_admin_or_professor();
--   SELECT * FROM perfis LIMIT 1;          -- nao pode mais dar recursion
--   SELECT * FROM checkins LIMIT 1;
-- =====================================================
