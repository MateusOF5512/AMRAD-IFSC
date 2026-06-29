# 🔧 Setup da Tabela Pattern Types

## ⚠️ URGENTE: Tabela pattern_types não existe!

### Erro Atual
```
Could not find the table 'public.pattern_types' in the schema cache
```

### Como Resolver

#### Passo 1: Abra o Supabase SQL Editor
1. Vá para: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Ou use: Projeto → SQL Editor

#### Passo 2: Execute o SQL
Copie e cole todo o conteúdo abaixo no SQL Editor do Supabase e execute:

```sql
-- Criar tabela de padrões
CREATE TABLE IF NOT EXISTS public.pattern_types (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT pattern_types_pkey PRIMARY KEY (id)
);

-- Inserir os 13 padrões
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

-- Adicionar colunas a samples (se não existem)
ALTER TABLE public.samples
ADD COLUMN IF NOT EXISTS pattern_type TEXT NULL,
ADD COLUMN IF NOT EXISTS pattern_type_id UUID NULL;

-- Adicionar foreign key
ALTER TABLE public.samples
ADD CONSTRAINT samples_pattern_type_id_fkey 
FOREIGN KEY (pattern_type_id) REFERENCES public.pattern_types(id)
ON DELETE CASCADE
ON UPDATE CASCADE;
```

#### Passo 3: Verificar
Você deve ver mensagens de sucesso como:
- ✅ "Table created successfully"
- ✅ Pattern count = 13

---

### ✅ Após Executar

A tabela estará pronta e os seguintes endpoints funcionarão:
- `GET /api/v1/experiments/patterns` - Lista os padrões
- `POST /api/v1/experiments/create-sample` - Cria amostras com padrões selecionados

---

### 🎯 Próximo Passo

Após criar a tabela, tente criar uma amostra e selecione os padrões. Sistema funcionará normalmente! ✨

