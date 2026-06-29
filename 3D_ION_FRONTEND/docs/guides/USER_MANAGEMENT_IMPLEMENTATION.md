# Gerência de Usuários - Documentação da Implementação

**Data:** 19 de Fevereiro de 2026
**Status:** ✅ Implementado

---

## 📋 Visão Geral

A aba "Gerenciar Usuários" permite ao administrador visualizar e gerenciar usuários segmentados por status, além de alterar manualmente o status de qualquer usuário via e-mail.

---

## 🎯 Objetivo

✅ Visualizar usuários segmentados por status (`regular`, `irregular`, `desativado`)
✅ Consultar dados completos padronizados em todas as seções
✅ Visualizar métrica agregada de produtividade (total de experimentos criados)
✅ Alterar manualmente o status de qualquer usuário via e-mail
✅ Gerar logs de auditoria para cada alteração

---

## 📁 Arquivos Criados/Modificados

### Frontend

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/types/admin.ts` | 🆕 Tipos TypeScript para módulo admin |
| `src/components/admin/UsersTable.tsx` | 🆕 Componente de tabela de usuários |
| `src/components/admin/UpdateStatusForm.tsx` | 🆕 Componente de formulário de atualização |
| `src/lib/api.ts` | ✏️ Adicionado `adminApi` com endpoints |
| `app/admin/configuracoes-avancadas/page.tsx` | ✏️ Implementada aba completa |

---

## 🏗️ Arquitetura

### Tipos (src/lib/types/admin.ts)

```typescript
export type UserStatus = 'regular' | 'irregular' | 'desativado'

export interface AdminUser {
  id: string
  status: UserStatus
  name: string
  email: string | null
  institution: string | null
  country: string | null
  language: string | null
  created_at: string
  experimentos_criados_total: number
}

export interface UpdateUserStatusRequest {
  email: string
  new_status: UserStatus
}

export interface UpdateUserStatusResponse {
  success: boolean
  message: string
  user?: AdminUser
  old_status?: UserStatus
  new_status?: UserStatus
}
```

### API (src/lib/api.ts)

```typescript
export const adminApi = {
  getUsersByStatus: (status: UserStatus, page?: number, per_page?: number)
  updateUserStatus: (email: string, newStatus: UserStatus)
  getAllUsers: (page?: number, per_page?: number)
}
```

### Componentes

#### UsersTable.tsx
- Tabela reutilizável para os 3 status
- **Colunas obrigatórias:**
  - `status` - Tipo de usuário com badge colorido
  - `name` - Nome do usuário
  - `email` - E-mail clicável
  - `institution` - Instituição vinculada
  - `country` - País
  - `language` - Idioma
  - `created_at` - Data formatada
  - `experimentos_criados_total` - Badge com número

- **Comportamento:** Clique em qualquer linha abre o formulário de atualização

#### UpdateStatusForm.tsx
- Busca de usuário por e-mail
- Seleção de novo status
- Modal de confirmação
- Mensagens de erro/sucesso
- Atualização automática das tabelas

---

## 🎨 Interface

### Layout da Aba

```
┌─────────────────────────────────────────────────────────┐
│ Gerenciar Usuários                                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ● Usuários Regulares (45 usuários)                     │
│ ┌──────────────────────────────────────────────────────┐│
│ │ Status | Nome | Email | Instituição | ... | Exps    ││
│ │───────────────────────────────────────────────────────││
│ │ Reg    | João | j@...  | USP        | ... | 12      ││
│ │ Reg    | Maria| m@...  | UFRJ       | ... | 8       ││
│ │...                                                    ││
│ └──────────────────────────────────────────────────────┘│
│                                                          │
│ ● Usuários Irregulares (8 usuários)                    │
│ ┌──────────────────────────────────────────────────────┐│
│ │ Status | Nome | Email | Instituição | ... | Exps    ││
│ │───────────────────────────────────────────────────────││
│ │ Irr    | Pedro| p@...  | UNICAMP    | ... | 3       ││
│ └──────────────────────────────────────────────────────┘│
│                                                          │
│ ● Usuários Desativados (2 usuários)                    │
│ ┌──────────────────────────────────────────────────────┐│
│ │ Status | Nome | Email | Instituição | ... | Exps    ││
│ │───────────────────────────────────────────────────────││
│ │ Des    | Ana  | a@... | PUC        | ... | 1        ││
│ └──────────────────────────────────────────────────────┘│
│                                                          │
│ ─────── Atualizar Status Manualmente ───────          │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐│
│ │ E-mail: [___________________]                        ││
│ │ Novo Status: [Regular     ▼]                         ││
│ │ [Atualizar Status]                                   ││
│ └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Execução

### 1️⃣ Carregamento Inicial

```
Page Load
  ↓
useAdminProtection() - Verifica se é admin
  ↓
activeTab === 'users' → fetchUsersByStatus('regular', 'irregular', 'desativado')
  ↓
Promise.all([...]) - Carrega 3 status em paralelo
  ↓
setRegularUsers(), setIrregularUsers(), setDesativatedUsers()
  ↓
Tabelas renderizam com dados
```

### 2️⃣ Alterar Status via Tabela

```
Usuário clica em linha da tabela
  ↓
handleUserClick(user)
  ↓
setPrefilledEmail(user.email)
  ↓
setShowUpdateForm(true)
  ↓
UpdateStatusForm abre com e-mail preenchido
```

### 3️⃣ Alterar Status via Formulário

```
Preencher e-mail e selecionar novo status
  ↓
Clique "Atualizar Status"
  ↓
[Validações]
  ├─ E-mail vazio? → Erro
  ├─ E-mail inválido? → Erro
  └─ OK ↓

Modal de confirmação aparece
  ↓
Usuário clica "Confirmar Alteração"
  ↓
adminApi.updateUserStatus(email, newStatus)
  ↓
Backend processa:
  ├─ Valida JWT
  ├─ Verifica se usuário existe
  ├─ Valida novo status
  ├─ Atualiza campo status
  ├─ Cria log em user_status_logs
  └─ Retorna sucesso
  ↓
handleStatusUpdate()
  ├─ Recarrega 3 tabelas
  ├─ Limpa formulário
  └─ Mostra mensagem de sucesso
```

---

## 📊 Estados dos Usuários

| Status | Badge Color | Descrição |
|--------|------------|-----------|
| regular | Verde | Usuário ativo e em dia |
| irregular | Amarelo | Usuário com algumas pendências |
| desativado | Cinza | Usuário desativado |

---

## 🔐 Validações Frontend

```typescript
// Validação de e-mail
if (!email.trim()) {
  setError('E-mail é obrigatório')
}

if (!email.includes('@')) {
  setError('E-mail inválido')
}

// Confirmação antes de atualizar
showConfirmation → Modal com dados do usuário
```

---

## 📡 Endpoints Backend Necessários

### GET /admin/users

```
Query Parameters:
- status: 'regular' | 'irregular' | 'desativado'
- page: number (default: 1)
- per_page: number (default: 10)

Response:
{
  "users": [
    {
      "id": "uuid",
      "status": "regular",
      "name": "João Silva",
      "email": "joao@example.com",
      "institution": "USP",
      "country": "Brasil",
      "language": "pt",
      "created_at": "2026-02-18T12:00:00",
      "experimentos_criados_total": 12
    },
    ...
  ],
  "total": 45,
  "page": 1,
  "per_page": 10
}
```

### PATCH /admin/users/status

```
Request Body:
{
  "email": "usuario@example.com",
  "new_status": "desativado"
}

Response:
{
  "success": true,
  "message": "Status atualizado com sucesso",
  "user": { ... },
  "old_status": "regular",
  "new_status": "desativado"
}

Errors:
- 400: E-mail inválido ou status inválido
- 404: Usuário não encontrado
- 409: Status igual ao atual
- 403: Não autorizado (não é admin)
```

---

## 🗂️ Estrutura do Banco de Dados

### Tabela: users (ou researchers)

```sql
-- Campos obrigatórios para frontend
SELECT
  id,
  status,          -- 'regular' | 'irregular' | 'desativado'
  name,
  email,
  institution,
  country,
  language,
  created_at
FROM users;
```

### Tabela: user_status_logs (Auditoria)

```sql
CREATE TABLE user_status_logs (
  id UUID PRIMARY KEY,
  admin_id UUID NOT NULL,        -- Quem alterou
  user_id UUID NOT NULL,         -- Quem foi alterado
  old_status TEXT,
  new_status TEXT,
  changed_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (admin_id) REFERENCES users(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Índices recomendados
CREATE INDEX idx_user_status_logs_user_id ON user_status_logs(user_id);
CREATE INDEX idx_user_status_logs_admin_id ON user_status_logs(admin_id);
CREATE INDEX idx_user_status_logs_changed_at ON user_status_logs(changed_at DESC);
```

### Query com Contagem de Experimentos

```sql
SELECT
  u.id,
  u.status,
  u.name,
  u.email,
  u.institution,
  u.country,
  u.language,
  u.created_at,
  COUNT(e.id) AS experimentos_criados_total
FROM users u
LEFT JOIN experiments e ON e.user_id = u.id
WHERE u.status = 'regular'
GROUP BY u.id
ORDER BY u.created_at DESC;
```

---

## 🧪 Como Testar

### 1. Teste de Carregamento

1. Faça login como admin
2. Vá para Configurações Avançadas
3. Aba "Gerenciar Usuários" já debe estar aberta
4. Verifique se as 3 seções aparecem com dados

### 2. Teste de Clique em Linha

1. Clique em qualquer usuário de uma tabela
2. Formulário de atualização deve abrir
3. E-mail deve estar preenchido com o do usuário clicado

### 3. Teste de Atualização via Formulário

1. Preencha e-mail manualmente
2. Selecione novo status
3. Clique "Atualizar Status"
4. Modal de confirmação deve aparecer
5. Confirme a alteração
6. Tabelas devem atualizar automaticamente

### 4. Teste de Validações

```javascript
// No console, tentar com e-mail vazio
setEmail('')
// Deve dar erro

// E-mail inválido
setEmail('invalido')
// Deve dar erro

// Status duplicado (backend)
// Deve dar 409 Conflict
```

---

## 📝 Checklist de Implementação

- [x] Tipos TypeScript criados
- [x] API client `adminApi` adicionado
- [x] Componente `UsersTable` criado
- [x] Componente `UpdateStatusForm` criado
- [x] Aba integrada na página
- [x] Validações frontend implementadas
- [x] Modal de confirmação adicionado
- [x] Mensagens de sucesso/erro
- [x] Atualização automática após mudança
- [x] Documentação concluída

---

## ⏳ Próximas Etapas

### Backend Necessário

1. **Endpoint GET /admin/users?status=...**
   - Retornar usuários com contagem de experimentos
   - Paginação opcional

2. **Endpoint PATCH /admin/users/status**
   - Validar JWT e permissão de admin
   - Atualizar campo status
   - Criar log em `user_status_logs`

3. **Criar tabela `user_status_logs`**
   - Registrar todas as alterações
   - Índices para performance

### Frontend Futuro

1. **Busca por e-mail** em tempo real
2. **Paginação** nas tabelas
3. **Filtros avançados** (por instituição, país)
4. **Exportar dados** dos usuários
5. **Analytics/Dashboards** de status de usuários

---

## 🔗 Integração com Login

Quando um usuário faz login:

```json
{
  "user_id": "...",
  "name": "...",
  "email": "...",
  "institution": "...",
  "country": "...",
  "language": "...",
  "user_type": "admin",
  "status": "regular",
  "access_token": "..."
}
```

O backend must incluir o field `status` na response, para que possa ser usado em futuras expansões (ex: desabilitar login se `status = 'desativado'`).

---

## 💡 Notas Técnicas

### Por que 3 seções separadas?

- Facilita a visualização ao enx
- Cada status é uma aba lógica
- Permite aplicar estilos diferentes

### Por que onClick em linha?

- UX intuitivo: clique para editar
- Evita botão extra de "editar"
- Passa dados diretos ao formulário

### Por que Promise.all()?

- Carrega os 3 status em paralelo
- Mais rápido que sequencial
- Aproveita HTTP/2 multiplexing

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique console do navegador (F12) para erros de JavaScript
2. Verifique Network tab para erros de API
3. Consulte `ADMIN_SETUP_GUIDE.md` para troubleshooting geral
4. Verificar que backend está retornando `experimentos_criados_total`

---

## ✅ Conclusão

A aba de Gerência de Usuários está **100% implementada no frontend** ,aguardando apenas os endpoints backend para funcionar completamente. A arquitetura está pronta para scale com paginação, busca e filtros.
