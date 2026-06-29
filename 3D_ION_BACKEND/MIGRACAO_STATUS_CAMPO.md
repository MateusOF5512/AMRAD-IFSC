# Migração do Banco: Adicionar Campo Status

Se deseja usar a funcionalidade completa de status (approved/pending), aplique essas alterações ao seu banco Supabase:

## 📋 Script SQL

Execute os comandos abaixo no Supabase SQL Editor:

### Adicionar coluna `status` à tabela `materials`

```sql
ALTER TABLE materials
ADD COLUMN status VARCHAR(20) DEFAULT 'approved' NOT NULL
CHECK (status IN ('pending', 'approved'));

-- Opcional: Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);
```

### Adicionar coluna `status` à tabela `machines`

```sql
ALTER TABLE machines
ADD COLUMN status VARCHAR(20) DEFAULT 'approved' NOT NULL
CHECK (status IN ('pending', 'approved'));

-- Opcional: Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);
```

## 🔄 Como Aplicar

1. Abra seu projeto Supabase em https://app.supabase.com
2. Vá para **SQL Editor** (ícone do lado esquerdo)
3. Cole os comandos acima
4. Clique em **RUN**
5. Se não houver erro, está feito!

## ✅ Verificação

Para verificar se as colunas foram criadas:

```sql
-- Ver estrutura da tabela materials
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'materials'
ORDER BY ordinal_position;

-- Ver estrutura da tabela machines
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'machines'
ORDER BY ordinal_position;
```

## 📝 Notas Importantes

- **Sem migração**: O sistema funciona normalmente, mas os dropdowns retornarão TODOS os materiais/máquinas (sem filtro por status)
- **Com migração**: O sistema funciona com filtro completo (apenas "approved" nos dropdowns)
- **Default**: Novos materiais/máquinas criados têm `status = 'approved'` por padrão
- **Rollback**: Se precisar desfazer:
  ```sql
  ALTER TABLE materials DROP COLUMN status;
  ALTER TABLE machines DROP COLUMN status;
  DROP INDEX IF EXISTS idx_materials_status;
  DROP INDEX IF EXISTS idx_machines_status;
  ```

## 🚀 Próxima Ação

Depois de aplicar a migração:
1. Reinicie o backend: `uvicorn app.main:app --reload`
2. Recarregue o frontend: `Ctrl+Shift+R`
3. Abra http://localhost:3000/experiments/new
4. Os dropdowns devem carregar corretamente com dados filtrados
