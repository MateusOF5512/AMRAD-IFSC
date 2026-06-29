-- ============================================
-- CREATE PATTERN TYPES TABLE AND INSERT DATA
-- ============================================
-- Execute this in Supabase SQL Editor
-- ============================================

-- 1. Create pattern_types table
CREATE TABLE IF NOT EXISTS public.pattern_types (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT pattern_types_pkey PRIMARY KEY (id)
);

-- 2. Insert all 13 pattern types
INSERT INTO public.pattern_types (name, description) VALUES
  ('Rectilinear', 'Padrão retilíneo'),
  ('Grid', 'Padrão em grade'),
  ('Line', 'Padrão em linhas'),
  ('Cubic', 'Padrão cúbico'),
  ('Triangles', 'Padrão triangular'),
  ('Gyroid', 'Padrão Gyroid'),
  ('Honeycomb', 'Padrão em favo de mel'),
  ('Cross', 'Padrão em cruz'),
  ('3D Honeycomb', 'Favo de mel 3D'),
  ('Hilbert Curve', 'Curva de Hilbert'),
  ('Octagram Spiral', 'Espiral Octagram'),
  ('CrossHatch', 'Padrão cruzado'),
  ('Archimedean Chords', 'Cordas de Arquimedes')
ON CONFLICT (name) DO NOTHING;

-- 3. Add columns to samples table if they don't exist
ALTER TABLE public.samples
ADD COLUMN IF NOT EXISTS pattern_type TEXT NULL,
ADD COLUMN IF NOT EXISTS pattern_type_id UUID NULL;

-- 4. Add foreign key constraint if it doesn't exist
ALTER TABLE public.samples
ADD CONSTRAINT samples_pattern_type_id_fkey 
FOREIGN KEY (pattern_type_id) REFERENCES public.pattern_types(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 5. Verify the setup
SELECT 'Table created successfully' as status;
SELECT COUNT(*) as pattern_count FROM public.pattern_types;
