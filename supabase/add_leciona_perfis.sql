-- =====================================================
-- Admin que tambem da aula
-- perfis.perfil guarda um unico papel; `leciona` marca admins que
-- tambem sao professores (aparecem na lista de professores e podem
-- ser atribuidos a aulas). Para perfil = 'professor' e ignorado.
-- Idempotente.
-- =====================================================

ALTER TABLE perfis
  ADD COLUMN IF NOT EXISTS leciona BOOLEAN NOT NULL DEFAULT FALSE;

-- Admins que ja tem aula atribuida passam a lecionar
UPDATE perfis SET leciona = TRUE
WHERE perfil = 'admin'
  AND id IN (
    SELECT professor_id FROM aulas
    UNION
    SELECT substituto_id FROM aulas WHERE substituto_id IS NOT NULL
  );
