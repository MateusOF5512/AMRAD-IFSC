# Guia de Setup - Sistema de Admin

## 📋 Checklist de Implementação

### ✅ Frontend Implementado
- [x] Header.tsx atualizado com links condicionais para admin
- [x] Hook `useAdminProtection` criado (proteção de rota)
- [x] Hook `usePermissions` criado (verificação de permissão)
- [x] Componente `AdminRouteProtector` criado
- [x] Página `/app/admin/configuracoes-avancadas/page.tsx` criada
- [x] Documentação completa

### ⚠️ Backend - Verificar
- Verificar se `user_type` está sendo retornado corretamente no login
- Validar que o banco de dados tem o campo `user_type` populado
- Testar que o token JWT é válido

## 🔧 Configuração do Banco de Dados

### Passo 1: Verificar Estrutura da Tabela

```sql
-- Verificar se a coluna user_type existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'researchers' AND column_name = 'user_type';
```

**Resultado esperado:**
```
column_name | data_type | is_nullable
user_type   | text      | NO
```

### Passo 2: Verificar Valores Presentes

```sql
-- Ver distribuição de tipos de usuário
SELECT user_type, COUNT(*) as total, MIN(created_at) as primeiro, MAX(created_at) as ultimo
FROM researchers
GROUP BY user_type
ORDER BY total DESC;
```

**Resultado esperado:**
```
user_type    | total | primeiro           | ultimo
pesquisador  | 42    | 2025-01-01 10:00  | 2026-02-19 15:30
admin        | 2     | 2025-06-15 09:00  | 2026-01-10 12:00
```

### Passo 3: Promover Usuário para Admin (Se Necessário)

```sql
-- Listar usuários ativos
SELECT id, name, email, user_type, created_at
FROM researchers
ORDER BY created_at DESC
LIMIT 10;
```

**Depois, atualizar para admin:**
```sql
UPDATE researchers
SET user_type = 'admin'
WHERE id = '00000000-0000-0000-0000-000000000001'  -- ← Substitua com o UUID real
RETURNING id, name, email, user_type;
```

### Passo 4: Validar Integridade (Importante!)

```sql
-- Verificar valores inválidos
SELECT id, name, email, user_type
FROM researchers
WHERE user_type NOT IN ('pesquisador', 'admin')
ORDER BY created_at DESC;
```

**Se houver resultados, corrigir:**
```sql
UPDATE researchers
SET user_type = 'pesquisador'
WHERE user_type NOT IN ('pesquisador', 'admin');
```

## 🧪 Testando o Sistema

### Teste 1: Verificar Login Retornando `user_type`

**1. Abra o DevTools (F12)**

**2. Vá para a aba Network**

**3. Faça login com uma conta de teste**

**4. Procure pela requisição `POST /api/v1/auth/login`**

**5. Verifique a Response:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Admin Test",
  "email": "admin@example.com",
  "institution": "Test University",
  "phone_number": "+55 11 98765-4321",
  "instagram": "admin_test",
  "user_type": "admin",
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

✅ Se `user_type` aparece com valor "admin" → OK!
❌ Se não aparece ou é null → Problema no backend

### Teste 2: Verificar localStorage Após Login

**1. Faça login**

**2. Abra DevTools → Console**

**3. Execute:**
```javascript
JSON.parse(localStorage.getItem('user'))
```

**Resultado esperado:**
```javascript
{
  user_id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Admin Test",
  email: "admin@example.com",
  institution: "Test University",
  phone_number: "+55 11 98765-4321",
  instagram: "admin_test",
  user_type: "admin",
  access_token: "eyJ0eXAiOiJKV1QiLCJhbGc...",
  token_type: "bearer"
}
```

### Teste 3: Verificar se Link Aparece no Header

**1. Faça login como admin**

**2. Na barra de navegação, procure por "⚙️ Configurações Avançadas"**

✅ Se aparecer → Frontend está correto!
❌ Se não aparecer → Verificar `user_type` no Teste 2

### Teste 4: Acessar Página de Admin

**1. Faça login como admin**

**2. Clique em "⚙️ Configurações Avançadas" (no header)**

OU

**2. Acesse diretamente: `http://localhost:3000/admin/configuracoes-avancadas`**

✅ Se carrega a página → Proteção de rota funcionando!
❌ Se redireciona para login/experimentos → Problema na autenticação

### Teste 5: Verificar Redirecionamento para Não-Admin

**1. Faça login com uma conta pesquisador (user_type = 'pesquisador')**

**2. Tente acessar `http://localhost:3000/admin/configuracoes-avancadas`**

✅ Se redireciona para `/experimentos` → Proteção de rota funcionando!
❌ Se carrega a página → Problema na validação de permissão

### Teste 6: Verificar Redirecionamento Não Logado

**1. Faça logout (ou limpe localStorage)**

**2. Tente acessar `http://localhost:3000/admin/configuracoes-avancadas`**

✅ Se redireciona para `/login` → Proteção funcionando!
❌ Se carrega a página → Problema na verificação de autenticação

## 🐛 Troubleshooting

### Problema: Link de Admin Não Aparece no Header

**Possível causa 1:** `user_type` não está sendo retornado pelo backend
```bash
# Verificar resposta do login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email_or_instagram":"admin@test.com","password":"senha123"}'
```

**Possível causa 2:** localStorage não está sendo atualizado
```javascript
// No console, simular:
localStorage.setItem('user', JSON.stringify({
  user_id: '123',
  name: 'Test',
  email: 'test@test.com',
  institution: 'Test',
  phone_number: '+55',
  instagram: 'test',
  user_type: 'admin',  // Adicionar isto
  access_token: 'token'
}))
// Recarregar página (F5)
```

### Problema: Página de Admin Redireciona para Login

**Possível causa:** localStorage não tem o field `user_type`

```javascript
// No console, verificar:
JSON.parse(localStorage.getItem('user')).user_type
// Deve retornar: "admin"
```

**Solução:** Removar localStorage e fazer login novamente
```javascript
localStorage.removeItem('user')
// Ir para /login e fazer login
```

### Problema: Página de Admin Redireciona para Experimentos

**Possível causa:** `user_type` é "pesquisador" ao invés de "admin"

```javascript
// No console, verificar:
const user = JSON.parse(localStorage.getItem('user'))
console.log(user.user_type)  // Deve ser "admin", não "pesquisador"
```

**Solução:** Verificar no banco se o usuário está com tipo correto
```sql
SELECT id, name, email, user_type
FROM researchers
WHERE email = 'seu_email@example.com';
```

Se `user_type` for "pesquisador", atualizar:
```sql
UPDATE researchers
SET user_type = 'admin'
WHERE email = 'seu_email@example.com';
```

### Problema: `useAdminProtection` Causa Loop Infinito

**Possível causa:** Hook está fazendo verificação incorreta

**Verificação:**
```javascript
// No console:
localStorage.getItem('user')
// Se retornar null → logo redirecionará
// Se retornar JSON com user_type != 'admin' → redirecionará para /experimentos
```

**Solução:** Atualizar localStorage com dados corretos antes de acessar página

## 📊 Verificação Final - Script de Validação

### Abra o DevTools Console e Execute:

```javascript
// Script de validação completo
const validateAdminSetup = () => {
  console.log('🔍 Validando Setup de Admin...\n')

  // 1. Verificar localStorage
  const userData = localStorage.getItem('user')
  if (!userData) {
    console.error('❌ ERRO: localStorage não tem dado de usuário')
    return false
  }

  const user = JSON.parse(userData)
  console.log('✅ Dados do usuário em localStorage:', user)

  // 2. Verificar user_type
  if (!user.user_type) {
    console.error('❌ ERRO: user_type não encontrado')
    return false
  }

  if (user.user_type !== 'admin') {
    console.warn(`⚠️ AVISO: user_type é "${user.user_type}", não "admin"`)
  } else {
    console.log('✅ user_type correto: "admin"')
  }

  // 3. Verificar token
  if (!user.access_token && !user.token) {
    console.error('❌ ERRO: Token não encontrado')
    return false
  }
  console.log('✅ Token presente')

  // 4. Verificar dados obrigatórios
  const requiredFields = ['user_id', 'name', 'email', 'user_type', 'access_token']
  const missingFields = requiredFields.filter(field => !user[field])
  
  if (missingFields.length > 0) {
    console.error('❌ ERRO: Campos obrigatórios faltando:', missingFields)
    return false
  }
  console.log('✅ Todos os campos obrigatórios presentes')

  console.log('\n✅ ✅ ✅ Validação completa! Sistema pronto para uso.')
  return true
}

// Executar
validateAdminSetup()
```

## 📝 Checklist Final

Antes de considerar o sistema pronto:

- [ ] Banco de dados tem coluna `user_type` com valores válidos
- [ ] Endpoint de login retorna `user_type` na resposta
- [ ] localStorage armazena `user_type` após login
- [ ] Header mostra link "⚙️ Configurações Avançadas" para admins
- [ ] Header não mostra link para pesquisadores
- [ ] Página `/admin/configuracoes-avancadas` carrega apenas para admins
- [ ] Pesquisadores são redirecionados para `/experimentos` se tentarem acessar admin
- [ ] Usuários não logados são redirecionados para `/login` se tentarem acessar admin
- [ ] Hooks `useAdminProtection` e `usePermissions` estão importáveis
- [ ] Documentação está atualizada

## 🎉 Está Tudo Pronto!

Se todos os testes passarem, o sistema está funcionando corretamente.

### Próximos Passos Sugeridos:
1. Implementar listagem de usuários na aba "Gerenciar Usuários"
2. Adicionar funcionalidade para editar `user_type` de usuários
3. Implementar backup/export de dados
4. Adicionar logs de auditoria para ações de admin
