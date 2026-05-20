-- =====================================================
-- Adiciona campos de validacao manual de check-in
-- + Policy de UPDATE para admin/professor
-- =====================================================
-- Requer: fix_rls_recursion.sql ja aplicado (usa is_admin_or_professor)
-- =====================================================

BEGIN;

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

COMMIT;
