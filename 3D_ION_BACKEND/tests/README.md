# Backend Tests Guide

## Overview

Este diretório contém uma suite completa de testes para diagnosticar problemas com:
- Conexão ao Supabase
- Operações de autenticação
- Operações de banco de dados
- Políticas RLS (Row Level Security)

## Estrutura de Arquivos

```
tests/
├── run_all_tests.py                 # Executor principal de todos os testes
├── test_supabase_connection.py      # Testes de conexão ao Supabase
├── test_auth_operations.py          # Testes de autenticação
├── test_database_operations.py      # Testes de operações CRUD
└── README.md                        # Este arquivo
```

## Requisitos

Certifique-se de que o arquivo `.env` existe no diretório `3D_ION_BACKEND/` com as variáveis:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Como Executar

### Opção 1: Executar Todos os Testes (Recomendado)

```bash
cd 3D_ION_BACKEND
python tests/run_all_tests.py
```

### Opção 2: Executar Testes Específicos

#### Testes de Conexão
```bash
python tests/test_supabase_connection.py
```

#### Testes de Autenticação
```bash
python tests/test_auth_operations.py
```

#### Testes de Banco de Dados
```bash
python tests/test_database_operations.py
```

## O Que Cada Teste Verifica

### 1. Connection Tests (`test_supabase_connection.py`)

- ✓ Carregamento correto das credenciais
- ✓ Conexão com chave Anon
- ✓ Conexão com chave Service Role
- ✓ Acesso às tabelas do banco
- ✓ Estrutura das tabelas e RLS policies

### 2. Auth Tests (`test_auth_operations.py`)

- ✓ Registro de novo usuário (signup)
- ✓ Inserção na tabela `researchers`
- ✓ Fluxo completo de signup
- ✓ Verificação de RLS policies

**⚠️ Importante**: Cada execução cria um novo usuário de teste com email único.

### 3. Database Tests (`test_database_operations.py`)

- ✓ Operações CREATE (Create): Researcher, Material, Machine, Sample, Measurements
- ✓ Operações READ (Read): Listar registros
- ✓ Operações UPDATE (Update): Modificar registros
- ✓ Operações DELETE (Delete): Remover registros com cascata

## Interpretando os Resultados

### Cenário 1: Todos os Testes Passam ✓

```
✓ ALL TEST SUITES PASSED!
```

- Seu banco está perfeitamente configurado
- Credenciais estão corretas
- RLS policies estão funcionando
- Frontend e backend podem comunicar normalmente

### Cenário 2: Testes de Conexão Falham ✗

Possíveis causas:
- `.env` com credenciais incorretas
- URL do Supabase digitada errado
- Chaves copiadas parcialmente ou com espaços

**Solução**:
1. Acesse https://supabase.com/dashboard
2. Vá para Settings → API
3. Copie as chaves novamente (sem espaços)
4. Atualize `.env` e execute `python tests/run_all_tests.py` novamente

### Cenário 3: Testes de Auth Falham ✗

Possíveis causas:
- RLS policies não configuradas
- Email confirmação requerida (bloqueando signup)
- Erro ao inserir na tabela `researchers`

**Solução**:
1. Verifique se RLS policies foram aplicadas (execute `setup_rls.sql`)
2. Verifique se Email confirmation está DISABLED em Supabase Auth
3. Procure pela mensagem de erro específica no output

### Cenário 4: Testes de Database Falham ✗

Possíveis causas:
- RLS policies restringindo demais as operações
- Tabelas estruturadas diferente do esperado
- Constraints faltando ou incorretos

**Solução**:
1. Procure pela mensagem de erro no output
2. Acesse https://supabase.com/dashboard
3. Vá para Database → Tables
4. Verifique a estrutura de cada tabela
5. Execute `setup_rls.sql` novamente se necessário

## Problemas Comuns

### "Invalid API key"

```
✗ Connection failed: Invalid API Key
```

**Solução**:
- Verifique se SUA chave foi copiada corretamente
- Confira que não tem espaços antes/depois
- Use a **Anon Key** (não Service Role Key) no frontend

### "email rate limit exceeded"

```
✗ Signup failed: email rate limit exceeded
```

**O que é:**  
Proteção do Supabase contra criação excessiva de usuários (limite ~10-15 emails/hora).

**Solução**:
1. **Recomendado:** Espere 1-2 horas
2. **Alternativa:** Execute testes que não precisam de signup:
   ```bash
   python test_supabase_connection.py
   python test_database_operations.py
   ```
3. **Detalhe:** Ver [EMAIL_RATE_LIMIT_GUIDE.md](../EMAIL_RATE_LIMIT_GUIDE.md)

### "No RLS policies"

```
⚠ Warning: Returned X records without auth
```

**Solução**:
- Execute o arquivo `setup_rls.sql` no SQL Editor do Supabase
- Aguarde a execução completa
- Execute os testes novamente

### "Foreign key constraint violated"

```
✗ Failed to create sample: Foreign key constraint...
```

**Solução**:
- Certifique-se de criar na ordem correta: Researcher → Material → Machine → Sample
- O teste faz isso automaticamente, então se falhar é um problema estrutural
- Verifique as constraints no SQL Editor do Supabase

## Performance

O tempo total de execução depende de:
- Latência de rede até o servidor Supabase
- Número de registros no banco
- Carga do servidor Supabase

Tempo típico: **10-30 segundos**

## Limpeza de Dados de Teste

Para remover usuários/registros de teste criados:

```sql
-- No SQL Editor do Supabase
-- Remover usuários de teste do auth
DELETE FROM auth.users 
WHERE email ILIKE '%test_%@test.com%';

-- Remover pesquisadores de teste
DELETE FROM public.researchers 
WHERE email ILIKE '%test_%@test.com%';
```

## Próximas Etapas Após Testes

Quando todos os testes passarem:

1. ✓ Frontend e backend estão prontos
2. ✓ Banco de dados configurado corretamente
3. ✓ RLS policies ativas

Execute em terminais separados:

```bash
# Terminal 1 - Backend
cd 3D_ION_BACKEND
python -m app.main

# Terminal 2 - Frontend
cd 3D_ION_FRONTEND
npm run dev
```

Teste o registro completo no navegador (http://localhost:3000/register).

## Suporte

Se os testes ainda falharem:

1. Tire screenshot do erro
2. Verifique todo o output do teste
3. Procure a mensagem de erro específica
4. Acesse https://supabase.com/dashboard e verifique:
   - Tabelas existem?
   - RLS está habilitado?
   - Policies foram criadas?
