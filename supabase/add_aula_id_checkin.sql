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
