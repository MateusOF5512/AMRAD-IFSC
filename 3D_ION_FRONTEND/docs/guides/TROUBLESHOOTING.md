# 🔧 Guia de Troubleshooting - Erros de Autenticação

## 📌 Problema: "No active session" ao salvar dados

### Sintomas
- ❌ Clica em "Salvar Material e Máquina" mas aparece erro
- ❌ Mensagem: "No active session"
- ❌ Redirecionado para /login automaticamente

### Causa Raiz
O Supabase não conseguiu validar sua sessão de autenticação. Isso pode ocorrer por:
1. Sessão expirada entre login e ação
2. Variáveis de ambiente não configuradas corretamente
3. Backend FastAPI indisponível
4. Token JWT inválido ou corrompido

### ✅ Solução Passo a Passo

#### 1️⃣ Verifique o arquivo `.env.local`

```bash
# Certifique-se de que existe e tem valores válidos
cat .env.local
```

**Esperado:**
```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Se não existir:**
```bash
# Copie o arquivo de exemplo
cp .env.local.example .env.local

# Edite com seus valores Supabase
nano .env.local  # ou use seu editor favorito
```

#### 2️⃣ Verifique a Conexão com Supabase

Abra o DevTools (F12) → Console e execute:

```javascript
// Verificar se Supabase está carregado
console.log('Supabase carregado?', typeof window !== 'undefined')

// Testar conexão com Supabase
const { createClient } = await import('@supabase/supabase-js')

const supabase = createClient(
  'https://seu-projeto.supabase.co',
  'sua-chave-anonima'
)

// Testar getSession
const { data, error } = await supabase.auth.getSession()
console.log('Sessão:', data)
if (error) console.error('Erro:', error)
```

**Esperado:** `data.session` contém um objeto com `access_token`

#### 3️⃣ Verifique o Backend FastAPI

```bash
# Teste se o backend está rodando
curl -X GET http://localhost:8000/api/v1/health

# Esperado:
# {"status":"ok","version":"1.0.0"}
```

**Se não responder:**
```bash
# Inicie o backend
cd ../AMRAD_BACKEND
python -m uvicorn app.main:app --reload --port 8000
```

#### 4️⃣ Verifique se está Logado

```bash
# No navegador DevTools → Application → Cookies
# Procure por: sb-[projeto]-auth-token

# Se não existir, você NÃO está logado
# Acesse /login e faça login novamente
```

#### 5️⃣ Limpe o Cache e Recomeçe

```bash
# Parar o servidor (Ctrl+C)
# Limpar node_modules e cache
rm -rf .next
rm -rf node_modules

# Reinstalar dependências
npm install

# Reiniciar servidor de desenvolvimento
npm run dev
```

#### 6️⃣ Verifique os Logs do Navegador

Abra DevTools → Network → Clique em "Salvar Material e Máquina"

**Procure por:**
1. **POST /api/v1/materials** 
   - Status esperado: 200 ou 201
   - Se 401: Token expirado - faça login novamente
   - Se 500: Erro no backend - verifique logs do backend

2. **POST /api/v1/machines**
   - Status esperado: 200 ou 201

---

## 📌 Problema: "unauthorized" ao fazer requisições

### Causa
Token JWT inválido, expirado ou não enviado

### Solução

```typescript
// No arquivo src/lib/api.ts, verifique a função getAuthHeader
const getAuthHeader = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('No active session')
  }
  
  return {
    Authorization: `Bearer ${session.access_token}`
  }
}

// Isso deve ser chamado ANTES de cada requisição
```

Se continuar recebendo 401:
1. Faça logout (limpe cookies)
2. Feche o navegador
3. Acesse /login novamente
4. Tente a ação novamente

---

## 📌 Problema: "CORS error" ou "blocked by CORS"

### Causa
Backend não está configurado para aceitar requisições from:
`http://localhost:3000`

### Solução - Backend (Python)

Abra `AMRAD_BACKEND/app/main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:3000",      # Desenvolvimento local
    "http://localhost:8000",       # Backend local
    "https://seu-dominio.com",     # Produção
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Após alterar, reinicie o backend:
```bash
# Parar o servidor (Ctrl+C)
# Reiniciar
python -m uvicorn app.main:app --reload
```

---

## 📌 Problema: Página em branco após login

### Causa
Erro de JavaScript não tratado

### Solução

1. **Abra DevTools → Console**
   - Procure por qualquer erro em vermelho
   - Copie a mensagem de erro

2. **Comum: "Cannot read properties of undefined"**
   ```
   Significa: Uma variável ou função é undefined e você tentou acessá-la
   ```

3. **Verifique se está no arquivo .next/cache**
   ```bash
   rm -rf .next
   npm run dev
   ```

---

## 📌 Problema: Não consigo fazer login

### Checklist
- [ ] Supabase está configurado em `.env.local`?
- [ ] Você tem uma conta Supabase criada?
- [ ] Email confirmado no Supabase?
- [ ] Backend está rodando?
- [ ] Console do navegador tem erros?

### Teste Manual de Login

```javascript
// No DevTools Console:
const { createClient } = await import('@supabase/supabase-js')

const supabase = createClient(
  'https://seu-projeto.supabase.co',
  'sua-chave-anonima'
)

// Teste login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'seu-email@example.com',
  password: 'sua-senha'
})

console.log('Login:', data)
if (error) console.error('Erro:', error)
```

---

## 🆘 Nada Funcionou?

### Coleta de Informações para Debug

```bash
# 1. Verifique versão do Node
node --version

# 2. Verifique se npm instalou tudo
npm list @tanstack/react-query @supabase/supabase-js

# 3. Mostre seu arquivo .env.local (remova dados sensíveis)
cat .env.local | grep "NEXT_PUBLIC_"

# 4. Teste a conexão básica com Supabase
curl -v https://seu-projeto.supabase.co/auth/v1/health
```

### Dicas Avançadas

**Ativar logs detalhados do Supabase:**
```javascript
// No navegador console:
localStorage.setItem('NEXT_PUBLIC_DEBUG_MODE', 'true')
// Recarregue a página
```

**Verificar requisições em tempo real:**
- Chrome DevTools → Network → Filtrar por "fetch"
- Edge DevTools → Network → Detalhes de requisição

---

## 📞 Recursos Adicionais

- **Documentação Supabase:** https://supabase.com/docs
- **Documentação Next.js:** https://nextjs.org/docs
- **FastAPI Docs:** https://fastapi.tiangolo.com
- **React Query:** https://tanstack.com/query/docs

## ✅ Checklist Final

- [ ] `.env.local` configurado com valores Supabase válidos
- [ ] Backend FastAPI rodando em `http://localhost:8000`
- [ ] Frontend rodando em `http://localhost:3000`
- [ ] Console do navegador sem erros vermelhos
- [ ] Network tab mostrando status 200/201 para requisições
- [ ] Conseguiu fazer login com sucesso
- [ ] Conseguiu salvar dados sem erro "No active session"

Se ainda tiver problemas, colete as informações acima e procure ajuda! 🚀
