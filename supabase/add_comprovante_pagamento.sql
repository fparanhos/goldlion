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
