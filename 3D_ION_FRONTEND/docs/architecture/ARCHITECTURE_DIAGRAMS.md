# Arquitetura Visual - Sistema de Admin

## 🏗️ Arquitetura Geral do Sistema de Permissões

```
┌────────────────────────────────────────────────────────────────────┐
│                          BANCO DE DADOS                             │
│                    (Supabase/PostgreSQL)                            │
│                                                                      │
│  TABLE: researchers                                                  │
│  ├─ id (UUID)                                                       │
│  ├─ name (text)                                                     │
│  ├─ email (text)                                                    │
│  ├─ user_type (text) ← CAMPO CHAVE ①                              │
│  │  ├─ 'pesquisador' (padrão)                                       │
│  │  └─ 'admin'                                                      │
│  ├─ password_hash (text)                                            │
│  └─ ... outros campos                                               │
└────────────────────────────────────────────────────────────────────┘
         ↑
         │ [Response do Login]
         │ └─ user_type incluso na resposta ②
         │
┌────────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                               │
│          /api/v1/auth/login                                        │
│                                                                      │
│  1. Valida email + senha                                            │
│  2. Retorna JWT + dados do usuário                                 │
│  3. Inclui user_type na response ②                                 │
│  4. Valida user_type em requisições sensíveis                      │
└────────────────────────────────────────────────────────────────────┘
         ↑
         │ [Login Request]
         │ [JWT Token]
         │
┌────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                               │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 1️⃣  Login Page                                              │  │
│  │   fetch('/api/v1/auth/login')                                │  │
│  │   ↓                                                           │  │
│  │   localStorage.setItem('user', JSON.stringify(response)) ③  │  │
│  │   setUser(response) // Zustand ④                            │  │
│  │   router.push('/experimentos')                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                         ↓                                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 2️⃣  localStorage + Zustand Store                            │  │
│  │   ├─ localStorage:                                            │  │
│  │   │  {                                                        │  │
│  │   │    user_id: "...",                                        │  │
│  │   │    name: "...",                                           │  │
│  │   │    email: "...",                                          │  │
│  │   │    user_type: "admin" ← Salvo aqui ③                    │  │
│  │   │    access_token: "..."                                    │  │
│  │   │  }                                                        │  │
│  │   │                                                           │  │
│  │   └─ Zustand authStore.user ④                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                         ↓                                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 3️⃣  Header Component                                        │  │
│  │   const { user } = useAuthStore()                            │  │
│  │   {user?.user_type === 'admin' && (                          │  │
│  │     <Link to="/admin/...">⚙️ Config</Link>                   │  │
│  │   )}                                                          │  │
│  │   ⬅️ Link aparece/desaparece baseado em user_type ⑤         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                         ↓                                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 4️⃣  Admin Page + useAdminProtection Hook                   │  │
│  │   const user = useAdminProtection()  ⑥                       │  │
│  │                                                               │  │
│  │   [Verificação]                                              │  │
│  │   1. localStorage vazio? → /login                            │  │
│  │   2. user_type != 'admin'? → /experimentos                  │  │
│  │   3. Válido? → Renderiza página ✅                          │  │
│  │                                                               │  │
│  │   [Se Válido]                                                │  │
│  │   ├─ Mostra 4 abas:                                          │  │
│  │   │  ├─ Gerenciar Usuários                                   │  │
│  │   │  ├─ Segurança                                            │  │
│  │   │  ├─ Banco de Dados                                       │  │
│  │   │  └─ Sistema                                              │  │
│  │   └─ Badge: "Modo Administrador"                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 5️⃣  usePermissions Hook (Uso Geral)                         │  │
│  │   const { isAdmin, isResearcher } = usePermissions()        │  │
│  │   → Verificação simples em qualquer componente ⑦            │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

## 📊 Fluxogramas por Caso de Uso

### Caso 1: Usuário Faz Login

```
[Tela de Login]
      ↓
[Input email + password]
      ↓
[POST /api/v1/auth/login]
      ↓
[Backend valida credenciais]
      ↓
[Response com user_type] ← user_type: "admin" ou "pesquisador"
      ↓
[localStorage.setItem('user', response)]
      ↓
[Zustand store atualiza]
      ↓
[Header re-renderiza]
      ↓
[Link "⚙️ Config" aparece se admin]
      ↓
[router.push('/experimentos')]
      ↓
[Usuário vê página comerrendo ao user_type]
```

### Caso 2: Admin Tenta Acessar Página de Configurações

```
[Clica em "⚙️ Configurações Avançadas"]
      ↓
[Navega para /admin/configuracoes-avancadas]
      ↓
[useAdminProtection Hook Executa]
      ↓
     ┌─────────┴─────────┐
     ↓                   ↓
[localStorage?]   [NO] → [Redireciona /login]
     │
     ↓
    [SIM]
     ↓
[Parse user]
     ↓
     ┌─────────────┴──────────────┐
     ↓                             ↓
[user_type='admin']        [user_type!='admin']
     │                             ↓
     │                    [Redireciona /experimentos]
     ↓
[Renderiza página admin]
     ↓
[Muestra 4 abas]
     ↓
[Usuário pode interagir ✅]
```

### Caso 3: Pesquisador Tenta Acessar Página de Configurações

```
[Tenta acessar /admin/configuracoes-avancadas]
      ↓
[useAdminProtection Hook Executa]
      ↓
[localStorage.getItem('user')]
      ↓
[Parse user]
      ↓
[Verifica: user_type === 'admin']
      ↓
[user_type = 'pesquisador' ❌]
      ↓
[Redireciona para /experimentos]
      ↓
[Usuário não acessa página de admin]
```

### Caso 4: Usuário Não Autenticado Tenta Acessar Admin

```
[Tenta acessar /admin/configuracoes-avancadas]
      ↓
[useAdminProtection Hook Executa]
      ↓
[localStorage.getItem('user') = null]
      ↓
[Redireciona para /login imediatamente]
      ↓
[Usuário vê tela de login]
```

## 🔐 Camadas de Segurança

```
Requisição à API Sensível
      ↓
┌─────────────────────────────────────────────────────────────┐
│ CAMADA 1: Frontend - UI Logic                               │
│                                                              │
│ usePermissions() check                                       │
│ └─ if (!isAdmin) { não renderiza botão }                    │
└─────────────────────────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────────────────────────┐
│ CAMADA 2: Frontend - Route Protection                       │
│                                                              │
│ useAdminProtection() em /admin/*                            │
│ └─ if (!isAdmin) { redireciona /experimentos }              │
└─────────────────────────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────────────────────────┐
│ CAMADA 3: HTTP Headers                                      │
│                                                              │
│ Authorization: Bearer eyJ0eXAi...                           │
│ └─ Token JWT incluído em cada requisição                    │
└─────────────────────────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────────────────────────┐
│ CAMADA 4: Backend - JWT Validation                          │
│                                                              │
│ @router.post("/admin/...")                                  │
│ def admin_function(current_user: User = Depends(validate)):│
│     if not current_user:                                    │
│         raise 401 Unauthorized                              │
└─────────────────────────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────────────────────────┐
│ CAMADA 5: Backend - Permission Check                        │
│                                                              │
│ if current_user.user_type != 'admin':                      │
│     raise 403 Forbidden                                     │
│                                                              │
│ ← A MAIS IMPORTANTE! Nunca confiar no frontend              │
└─────────────────────────────────────────────────────────────┘
      ↓
[Executa operação administrativa]
```

## 📦 Stack de Tecnologias

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND                                   │
├─────────────────────────────────────────────────────────────┤
│ Framework:       Next.js 14+ (App Router)                   │
│ Language:        TypeScript                                 │
│ State:           Zustand (authStore)                        │
│ Storage:         localStorage + Zustand                     │
│ HTTP:            Fetch API                                  │
│ UI Components:   React + lucide-react                       │
│ Styling:         Tailwind CSS                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   BACKEND                                    │
├─────────────────────────────────────────────────────────────┤
│ Framework:       FastAPI (Python)                           │
│ Database:        PostgreSQL (Supabase)                      │
│ Auth:            JWT (JSON Web Token)                       │
│ ORM:             (SQLAlchemy or similar)                    │
│ Password:        bcrypt/pbkdf2                              │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Ciclo de Vida de um Admin

```
                    [Usuários Normal]
                    (user_type: 'pesquisador')
                           ↑
                           │
           [Admin Promove via Dashboard]
                           │
                           ↓
  UPDATE researchers SET user_type = 'admin'
                           │
                           ↓
                  [New Login Request]
                           │
         ┌─────────────────┴─────────────────┐
         ↓                                   ↓
   [localStorage]                    [Zustand Store]
   user_type = 'admin'              user_type = 'admin'
         ↓                                   ↓
         └─────────────────┬─────────────────┘
                           ↓
              [Header Atualiza Renderização]
                           ↓
        [Link "⚙️ Configurações" Aparece]
                           ↓
           [Admin Pode Acessar /admin/*]
                           ↓
        [Backend Valida JWT + user_type]
                           ├─ ✅ Admin Access
                           └─ ❌ Forbidden (403)
```

## 📈 Performance e Escalabilidade

```
Verificação de Permissão:

Tempo da Verificação:    ~1ms (síncrono, localStorage)
Carga no Backend:        Nenhuma (dados já em client)
Escalabilidade:          O(1) - Constant time lookup
Bottleneck:              Apenas primeira carregada (login)

Comparação com alternativas:

❌ Chamar API para cada verificação:
   Tempo: ~200-500ms
   Carga: Alta
   UX: Ruim (delay notável)

✅ Armazenar em localStorage + Zustand:
   Tempo: ~1ms
   Carga: Nenhuma
   UX: Excelente (instantâneo)
```

## 🎯 Mapeamento de Responsabilidades

```
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│  RESPONSABILIDADE                      LOCALIZAÇÃO           │
│  ─────────────────────────────────────────────────────       │
│                                                               │
│  1. Validar credenciais                 Backend (FastAPI)    │
│  2. Retornar user_type                  Backend (response)   │
│  3. Armazenar user_type                 Frontend (localStorage)
│  4. Manter state sincronizado           Frontend (Zustand)   │
│  5. Mostrar/Ocultar UI                  Frontend (Header)    │
│  6. Proteger rotas                      Frontend (Hook)      │
│  7. Validar novamente requisições       Backend (Endpoint)   │
│  8. Registrar ações sensíveis           Backend (Logs)       │
│                                                               │
│  Regra de Ouro:                                               │
│  ─────────────────────────────────────────────────────       │
│  ✅ Validar tudo no backend (nunca confiar no client)        │
│  ✅ Validar no frontend para melhor UX                       │
│  ❌ Confiar APENAS no frontend                               │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## 🚀 Fluxo de Uma Requisição Admin

```
[Cliente clica em botão de admin]
         ↓
[Frontend verifica: isAdmin?]
         ↓
[SIM] → [Faz requisição com JWT]
         ↓
[Frontend inclui Authorization header]
         ↓
[POST /api/v1/admin/... HTTP/1.1]
[Authorization: Bearer eyJ...]
[Content-Type: application/json]
[{}]
         ↓
[Backend recebe]
         ↓
[Verifica JWT válido?]
         ├─ NÃO → 401 Unauthorized
         └─ SIM ↓
         ↓
[Extrai user_id do JWT]
         ↓
[Query: SELECT user_type FROM researchers WHERE id = ...]
         ↓
[user_type == 'admin'?]
         ├─ NÃO → 403 Forbidden
         └─ SIM ↓
         ↓
[Executa operação administrativa]
         ↓
[Retorna 200 + dados]
         ↓
[Frontend recebe e atualiza UI]
```

## 📝 Matriz de Acesso

```
                                VISITANTE  PESQUISADOR  ADMIN
        ─────────────────────────────────────────────────────
        Página Inicial (/)          ✅        ✅         ✅
        Todos Experimentos          ✅        ✅         ✅
        Meus Experimentos           ❌        ✅         ✅
        Criar Experimento           ❌        ✅         ✅
        Meu Perfil (/settings)      ❌        ✅         ✅
        ─────────────────────────────────────────────────────
        Configurações Avançadas     ❌        ❌         ✅
        Gerenciar Usuários          ❌        ❌         ✅
        Ver Logs                    ❌        ❌         ✅
        Backup/Export               ❌        ❌         ✅
        Configurações Sistema       ❌        ❌         ✅
```

Essa documentação visual oferece uma compreensão completa da arquitetura, fluxos e segurança do sistema de admin implementado.
