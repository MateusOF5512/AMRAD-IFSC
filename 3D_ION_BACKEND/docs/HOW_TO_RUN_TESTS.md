# 🧪 Como Executar os Testes - Guia Passo a Passo

## 🪟 Windows (PowerShell)

### Método 1: Executar o Script Batch (Recomendado)

```powershell
# Navegue até o diretório backend
cd "C:\Users\mateu\2_PESSOAL\AMRAD\AMRAD\AMRAD_BACKEND"

# Execute o script
.\run_tests.bat
```

### Método 2: Executar Diretamente com Python

```powershell
# Navegue até o diretório backend
cd "C:\Users\mateu\2_PESSOAL\AMRAD\AMRAD\AMRAD_BACKEND"

# Instale dependências se necessário
pip install python-dotenv supabase requests

# Execute os testes
python tests/run_all_tests.py
```

### Método 3: Executar Testes Específicos

```powershell
# Testes de Conexão
python tests/test_supabase_connection.py

# Testes de Autenticação  
python tests/test_auth_operations.py

# Testes de Banco de Dados
python tests/test_database_operations.py

# Testes de API (Backend deve estar rodando!)
python tests/test_api_endpoints.py
```

---

## 🐧 Linux/Mac

### Método 1: Executar o Script Shell

```bash
# Navegue até o diretório backend
cd ~/AMRAD/AMRAD/AMRAD_BACKEND

# Dê permissão de execução
chmod +x run_tests.sh

# Execute
./run_tests.sh
```

### Método 2: Executar Diretamente com Python

```bash
cd ~/AMRAD/AMRAD/AMRAD_BACKEND

pip3 install python-dotenv supabase requests

python3 tests/run_all_tests.py
```

---

## 📋 O Que Esperar

### Sucesso Total (Todos passam)

```
████████████████████████████████████████████████████████████████████████████████
█ AMRAD PLATFORM - COMPLETE TEST SUITE                                     █
████████████████████████████████████████████████████████████████████████████████

Running Supabase Connection Tests...
✓ Supabase Credentials Loading
✓ Supabase Connection with Anon Key
✓ Supabase Connection with Service Role Key
✓ Database Tables and RLS Policies

Running Authentication Tests...
✓ User Registration (Signup)
✓ Insert into Researchers Table
✓ Complete Signup Flow
✓ RLS Policies Check

Running Database Operation Tests...
✓ Create Researcher
✓ Create Material
✓ Create Machine
✓ Create Sample
✓ Create Infill Measurement
✓ Read Operations
✓ Update Operations
✓ Delete Operations

Running API Endpoint Tests...
✓ Health Check
✓ Authenticated Request
✓ Create Material
✓ List Materials
✓ Unauthenticated Request

████████████████████████████████████████████████████████████████████████████████
█ FINAL TEST SUMMARY                                                         █
████████████████████████████████████████████████████████████████████████████████

Test Suite Results:
────────────────────────────────────────────────────────────────────────────
✓ PASSED   | Connection Tests
✓ PASSED   | Auth Tests
✓ PASSED   | Database Tests
✓ PASSED   | API Tests
────────────────────────────────────────────────────────────────────────────

✓ ALL TEST SUITES PASSED! ✓
Elapsed time: 23.45 seconds
```

### Com Falhas

```
✗ FAILED  | Auth Tests
✗ FAILED  | Database Tests

✗ SOME TEST SUITES FAILED
```

**O que fazer:**
1. Leia os erros específicos acima no output
2. Procure pela mensagem entre as linhas `✗`
3. Execute o teste específico que falhou novamente:
   ```powershell
   python tests/test_auth_operations.py
   ```
4. Verifique o [Troubleshooting Guide](#troubleshooting) abaixo

---

## 🔧 Troubleshooting

### Erro: "ModuleNotFoundError: No module named 'supabase'"

```
ModuleNotFoundError: No module named 'supabase'
```

**Solução:**
```powershell
pip install supabase python-dotenv requests
```

### Erro: "No module named 'app'"

```
ModuleNotFoundError: No module named 'app'
```

**Solução:**
Certifique-se de estar no diretório correto:
```powershell
cd C:\Users\mateu\2_PESSOAL\AMRAD\AMRAD\AMRAD_BACKEND
python tests/run_all_tests.py
```

### Erro: "Invalid API key"

```
✗ Connection failed: Invalid API key
```

**Solução:**
1. Abra `.env` do backend
2. Verifique se `SUPABASE_ANON_KEY` está correto
3. Copie novamente de https://supabase.com/dashboard → Settings → API
4. Execute novamente

### Erro: "Connection refused"

```
✗ Health check error: Connection refused
```

**Solução:**
Este erro é esperado no teste de API se o backend não estiver rodando.
1. Em outro terminal, execute: `python -m app.main`
2. Depois execute os testes novamente

### Aviso: "RLS policies not configured"

```
⚠ Warning: Returned X records without auth
  This suggests RLS policies may not be properly configured
```

**Solução:**
1. Acesse https://supabase.com/dashboard
2. Vá para SQL Editor
3. Cole o conteúdo de `setup_rls.sql`
4. Execute
5. Execute os testes novamente

---

## 📊 Cronograma de Execução Típico

```
Teste                          Tempo
─────────────────────────────────────
Credentials Loading            0.1s
Connection Tests               2-3s
Auth Tests (signup)            3-5s
Database CRUD                  5-8s
API Endpoints                  3-5s
─────────────────────────────────────
TOTAL                          15-25s
```

---

## 🚀 Próximas Etapas

Quando todos os testes passarem ✓:

### 1. Inicie o Backend

```powershell
cd C:\Users\mateu\2_PESSOAL\AMRAD\AMRAD\AMRAD_BACKEND
python -m app.main
```

Você deve ver:
```
INFO:     Application startup complete
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 2. Inicie o Frontend

Em outro terminal PowerShell:
```powershell
cd C:\Users\mateu\2_PESSOAL\AMRAD\AMRAD\AMRAD_FRONTEND
npm run dev
```

Você deve ver:
```
✓ Ready in 700ms
- Local: http://localhost:3000
```

### 3. Teste o Sistema Completo

1. Abra http://localhost:3000/register
2. Preencha os dados
3. Clique em "Registrar"
4. Se aparecer a página de dashboard, tudo está funcionando! ✓

---

## 💾 Variáveis de Ambiente

Se você precisar de ajuda para preencher o `.env`, copie o template na raiz do monorepo:

```cmd
cd C:\Users\mateu\2_PESSOAL\AMRAD
copy .env.example .env
```

Edite `.env` na **raiz do projeto** (`AMRAD/.env`) — backend e frontend leem deste arquivo:

```env
# Obtenha estes valores em: https://supabase.com/dashboard/project/[seu-projeto]/settings/api

SUPABASE_URL=https://[seu-projeto].supabase.co
SUPABASE_ANON_KEY=[sua-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[sua-service-role-key]

NEXT_PUBLIC_SUPABASE_URL=https://[seu-projeto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[sua-anon-key]
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

JWT_SECRET=[string-secreta-longa]
TEST_EMAIL=test.researcher@amrad.local
TEST_PASSWORD=TestPassword123!
```

---

## 📞 Suporte

Se os testes ainda falharem, colete estas informações:

1. **Output completo do teste** (copie tudo)
2. **Seu `SUPABASE_URL`** (sem as chaves)
3. **Sistema operacional** (Windows 10/11, Mac, Linux)
4. **Versão do Python**:
   ```powershell
   python --version
   ```

E compartilhe comigo para diagnóstico.
