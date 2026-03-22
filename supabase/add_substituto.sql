-- Adicionar coluna de professor substituto na tabela aulas
ALTER TABLE aulas ADD COLUMN IF NOT EXISTS substituto_id UUID REFERENCES perfis(id);
