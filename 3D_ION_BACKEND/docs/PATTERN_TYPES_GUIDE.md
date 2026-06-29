# 🎯 Sistema de Padrões em Amostras (Patterns)

## 📋 Visão Geral

O sistema foi atualizado para suportar múltiplos padrões de preenchimento por amostra. Cada padrão selecionado gera uma linha separada na tabela `samples` com o mesmo `sample_id` mas com diferentes `pattern_type_id`.

---

## 🗄️ Estrutura do Banco de Dados

### Nova Tabela: `pattern_types`
```sql
CREATE TABLE public.pattern_types (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT pattern_types_pkey PRIMARY KEY (id)
);
```

### Padrões Disponíveis
1. Rectilinear
2. Grid
3. Line
4. Cubic
5. Triangles
6. Gyroid
7. Honeycomb
8. Cross
9. 3D Honeycomb
10. Hilbert Curve
11. Octagram Spiral
12. CrossHatch
13. Archimedean Chords

### Tabela `samples` Atualizada
```sql
ALTER TABLE public.samples
ADD COLUMN pattern_type TEXT NULL,
ADD COLUMN pattern_type_id UUID NULL;

ALTER TABLE public.samples
ADD CONSTRAINT samples_pattern_type_id_fkey 
FOREIGN KEY (pattern_type_id) REFERENCES pattern_types(id);
```

---

## 🚀 Como Usar

### 1️⃣ Backend - Endpoint `/patterns` (GET)
**Retorna todos os padrões disponíveis**

```bash
curl -X GET http://localhost:8000/api/v1/patterns
```

**Resposta:**
```json
{
  "success": true,
  "patterns": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Rectilinear",
      "description": "Padrão retilíneo"
    },
    ...
  ]
}
```

### 2️⃣ Endpoint `/create-sample` (POST)
**Cria uma amostra com múltiplos padrões**

```bash
curl -X POST http://localhost:8000/api/v1/experiments/create-sample \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "material_id": "uuid-material",
    "machine_id": "uuid-machine",
    "shape_type": "Cube",
    "pattern_ids": [
      "uuid-pattern-1",
      "uuid-pattern-2"
    ]
  }'
```

**Resposta:**
```json
{
  "success": true,
  "message": "Sample created successfully with 2 pattern(s)",
  "sample_ids": ["uuid1", "uuid2"],
  "primary_sample_id": "uuid1",
  "shape_type": "Cube",
  "pattern_count": 2,
  "patterns_created": [
    {
      "sample_id": "uuid1",
      "pattern_type": "Rectilinear",
      "pattern_type_id": "uuid-pattern-1"
    },
    {
      "sample_id": "uuid2",
      "pattern_type": "Grid",
      "pattern_type_id": "uuid-pattern-2"
    }
  ]
}
```

---

## 🎨 Frontend - Componentes

### PatternSelect Component
Localização: `src/components/experiments/steps/PatternSelect.tsx`

```tsx
import PatternSelect from '@/components/experiments/steps/PatternSelect'

export default function MyForm() {
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([])

  return (
    <PatternSelect
      selectedPatterns={selectedPatterns}
      onChange={setSelectedPatterns}
      onError={(error) => console.error(error)}
    />
  )
}
```

### SampleForm Component
Agora integrado com PatternSelect:
- Coleta shape_type (Cube/Cylinder/Other)
- Coleta ROI area
- **Novo:** Seleciona múltiplos padrões via checkboxes
- Valida que ao menos 1 padrão foi selecionado

---

## 🔄 Fluxo Completo

```
1. Criar Material e Máquina (existente)
   ↓
2. Selecionar Formato da Amostra (shape_type)
   ↓
3. Selecionar Padrões de Preenchimento ✨ NOVO
   ↓
4. Enviar request com pattern_ids
   ↓
5. Backend cria N linhas na tabela samples:
   - Linha 1: sample_id_A com pattern_type_id_1
   - Linha 2: sample_id_A com pattern_type_id_2
   - ...
   ↓
6. Recuperar dados agrupa padrões automaticamente
```

---

## 📊 Especificações Técnicas

### Validações
✅ **Frontend:**
- Ao menos 1 padrão obrigatório
- Múltiplos padrões aceitos
- Interface com checkboxes

✅ **Backend:**
- `pattern_ids` array obrigatório
- Verifica existência de cada pattern_id
- Cria múltiplas linhas transacionalmente

### Resposta da API
- `sample_ids`: Array de todos os IDs criados
- `primary_sample_id`: Primeiro sample_id (para compatibilidade)
- `pattern_count`: Número de padrões criados
- `patterns_created`: Detalhes de cada padrão criado

---

## 🐛 Troubleshooting

### "pattern_ids is empty or missing"
**Problema:** Nenhum padrão selecionado no frontend
**Solução:** Selecione pelo menos um padrão antes de enviar

### "Pattern type not found"
**Problema:** ID de padrão inválido
**Solução:** Verifique se o pattern_id está na tabela `pattern_types`

### Múltiplas linhas não aparecem
**Problema:** Queries agrupam samples por ID automaticamente
**Solução:** Use o objeto `grouped` que contém array de `patterns`

---

## 📝 Notas Importantes

1. **Cada padrão = Uma linha** na tabela samples
2. **Mesmo sample_id** para todos os padrões de um experimento
3. **Diferentes pattern_type_id** para cada padrão
4. **Compatibilidade** com infill, mechanical, etc. mantida

---

## 🔧 SQL Setup rápido

Execute no Supabase:

```sql
-- Criar tabela
CREATE TABLE public.pattern_types (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT pattern_types_pkey PRIMARY KEY (id)
);

-- Inserir padrões
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
  ('Archimedean Chords', 'Cordas de Arquimedes');

-- Adicionar colunas a samples (se não existrem)
ALTER TABLE public.samples
ADD COLUMN pattern_type TEXT NULL,
ADD COLUMN pattern_type_id UUID NULL;

-- Adicionar constraint
ALTER TABLE public.samples
ADD CONSTRAINT samples_pattern_type_id_fkey 
FOREIGN KEY (pattern_type_id) REFERENCES pattern_types(id);
```

