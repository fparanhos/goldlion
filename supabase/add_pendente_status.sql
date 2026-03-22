-- Migration: Adicionar status 'pendente' ao enum status_aluno
-- Execute este SQL no Supabase SQL Editor

ALTER TYPE status_aluno ADD VALUE IF NOT EXISTS 'pendente' BEFORE 'ativo';
