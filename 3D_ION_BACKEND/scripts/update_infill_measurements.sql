-- SQL para atualizar tabela infill_measurements com pattern_type_id
-- Execute no Supabase

-- 1. Adicionar coluna pattern_type se não existir (para armazenar nome do padrão)
ALTER TABLE public.infill_measurements
ADD COLUMN IF NOT EXISTS pattern_type TEXT NULL;

-- 2. Remover constraint antiga se existir (para permitir múltiplos infills)
ALTER TABLE public.infill_measurements
DROP CONSTRAINT IF EXISTS infill_measurements_unique_sample_pct;

-- 3. Adicionar nova constraint que permite múltiplos infills por sample (um por padrão)
-- Comentado - a constraint será (sample_id, infill_pct, pattern_type) para permitir
-- múltiplos padrões com mesmo infill_pct mas padrões diferentes

-- 4. Verificar se tudo funcionou
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'infill_measurements' 
ORDER BY ordinal_position;

-- 5. Se quiser ver dados existentes
SELECT id, sample_id, infill_pct, pattern_type, created_at 
FROM public.infill_measurements 
LIMIT 5;
