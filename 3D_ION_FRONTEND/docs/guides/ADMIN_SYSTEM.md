# Sistema de Permissões e Filtro de Admin

## Visão Geral
Este documento descreve a implementação do sistema de classificação de usuários e filtragem de acesso baseado em `user_type`.

## Tipos de Usuários
A plataforma suporta 3 níveis de acesso:

### 1. **Visitante** (sem autenticação)
- Acesso apenas à página inicial
- Pode visualizar lista de experimentos públicos
- Pode acessar páginas de login e registro

### 2. **Usuário Não Logado**
- Mesmo acesso que visitante
- Pode ver a página pública de experimentos

### 3. **Autenticados**
#### a) **Pesquisador** (`user_type: 'pesquisador'`)
- Acesso a "Todos os Experimentos"
- Acesso a "Meus Experimentos"
- Acesso a "Settings" (perfil pessoal)
- **Sem** acesso a "Configurações Avançadas"

#### b) **Admin** (`user_type: 'admin'`)
- Todos os acessos do pesquisador +
- Acesso a "⚙️ Configurações Avançadas" (na barra de navegação)
- Acesso a painel administrativo completo

## Estrutura da Tabela `researchers`

```sql
create table public.researchers (
  id uuid not null default gen_random_uuid (),
  name text not null,
  institution text null,
  email text null,
  phone_number text null,
  instagram text null,
  created_at timestamp with time zone null default now(),
  password_hash text not null default 'placeholder_hash'::text,
  user_type text not null default 'pesquisador'::text,
  constraint researchers_pkey primary key (id)
) TABLESPACE pg_default;
```

**Campo importante:** `user_type` 
- Valor padrão: `'pesquisador'`
- Valores aceitos: `'pesquisador'`, `'admin'`

## Implementação Frontend

### 1. **Auth Store (`authStore.ts`)**
Armazena dados do usuário incluindo `user_type`:

```typescript
export interface User {
  user_id: string
  name: string
  email: string
  institution: string
  phone_number: string
  instagram?: string
  user_type: string  // ← Campo crítico
}
```

### 2. **Header Navigation (`Header.tsx`)**
O navegador verifica o tipo de usuário:

```tsx
{/* Admin only links */}
{user.user_type === 'admin' && (
  <Link href="/admin/configuracoes-avancadas">
    ⚙️ Configurações Avançadas
  </Link>
)}
```

**Comportamento:**
- Link "⚙️ Configurações Avançadas" aparece apenas se `user.user_type === 'admin'`
- Funciona em ambos os menus (desktop e mobile)
- Usa cor diferente (laranja) para diferenciar de links normais

### 3. **Hook de Proteção de Rota (`useAdminProtection.ts`)**
Protege a página de admin:

```typescript
export function useAdminProtection() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    
    if (!userData) {
      router.push('/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      
      if (parsedUser.user_type !== 'admin') {
        router.push('/experimentos')
        return
      }
    } catch (e) {
      router.push('/login')
    }
  }, [router, user])

  return user && user.user_type === 'admin' ? user : null
}
```

**Funcionalidade:**
1. Verifica se usuário está autenticado (localStorage)
2. Verifica se é admin (`user_type === 'admin'`)
3. Se não logado → redireciona para `/login`
4. Se não admin → redireciona para `/experimentos`
5. Se admin → permite acesso e retorna dados do usuário

### 4. **Hook de Permissões (`usePermissions.ts`)**
Ferramenta reutilizável para verificar permissões em qualquer componente:

```typescript
export function usePermissions() {
  const user = useAuthStore((state) => state.user)

  return {
    isAuthenticated: !!user,
    isAdmin: user?.user_type === 'admin',
    isResearcher: user?.user_type === 'pesquisador',
    hasRole: (role: string) => user?.user_type === role,
    userType: user?.user_type,
    user: user,
  }
}
```

**Uso em componentes:**
```tsx
const { isAdmin, isResearcher } = usePermissions()

if (isAdmin) {
  // Mostrar funcionalidades de admin
}

if (isResearcher) {
  // Mostrar funcionalidades de pesquisador
}
```

### 5. **Página de Configurações Avançadas (`/app/admin/configuracoes-avancadas/page.tsx`)**

Uma página completa com:
- **Proteção:** Apenas admins podem acessar
- **Abas funcionais:**
  - Gerenciar Usuários
  - Segurança
  - Banco de Dados
  - Sistema
- **Indicador visual:** Badge "Modo Administrador"
- **Estrutura preparada** para desenvolvimento futuro de funcionalidades específicas

## Fluxo de Login

### 1. **Autenticação no Backend (FastAPI)**
```
POST /api/v1/auth/login
{
  "email_or_instagram": "user@example.com",
  "password": "senha123"
}

Resposta:
{
  "user_id": "uuid",
  "name": "João Silva",
  "email": "joao@example.com",
  "institution": "USP",
  "phone_number": "+55 11 98765-4321",
  "instagram": "joao_silva",
  "user_type": "admin",  // ← Campo retornado
  "access_token": "eyJ0...",
  "token_type": "bearer"
}
```

### 2. **Armazenamento Frontend**
- Login page armazena resposta em `localStorage.setItem('user', JSON.stringify(data))`
- Zustand store `authStore` atualiza com `setUser(data)`
- Evento `window.dispatchEvent(new Event('userLoggedIn'))` notifica outros componentes

### 3. **Verificação em Componentes**
Componentes verificam `user.user_type`:
- **Header:** Diferentes links baseado no tipo
- **Rotas:** Hook `useAdminProtection` protege `/admin/*`
- **Componentes:** Hook `usePermissions` para lógica condicional

## Eficiência do Filtro

### ✅ Verificações Rápidas
1. **Verificação em localStorage:** Síncrona, sem chamadas à API
2. **Zustand store:** Estado centralizado, rápido acesso
3. **Comparação string simples:** `user_type === 'admin'` é O(1)

### ✅ Sem Overhead
- Não há chamadas API extras para cada verificação de permissão
- Dados já estão em memória (localStorage + Zustand)
- Redirecionamentos são feitos uma única vez no `useAdminProtection`

### ✅ Segurança
- Verificação no backend mantém integridade
- Filtro frontend previne acesso acidental
- Tokens JWT validam cada requisição à API

## Casos de Uso

### Cenário 1: Usuário pesquisador tenta acessar `/admin/configuracoes-avancadas`
1. Clica no botão (não existe no sua navegação)
2. Digita URL manualmente
3. `useAdminProtection` detecta `user_type !== 'admin'`
4. Redireciona para `/experimentos`

### Cenário 2: Usuário admin acessa a página
1. Link "⚙️ Configurações Avançadas" aparece no Header
2. Clica no link
3. `useAdminProtection` valida `user_type === 'admin'`
4. Página carrega normalmente
5. Consegue acessar todas as abas

### Cenário 3: Usuário não autenticado tenta acessar
1. Tenta acessar `/admin/configuracoes-avancadas`
2. `localStorage.getItem('user')` retorna `null`
3. Redireciona para `/login`

## Próximos Passos

Para completar a implementação de Admin, você pode:

1. **Gerenciar Usuários**
   - Listar todos os usuários
   - Editar `user_type` de usuários
   - Deletar usuários (com confirmação)

2. **Segurança**
   - Configurar expiração de sessão
   - Definir requisitos de senha
   - Auditar logins

3. **Banco de Dados**
   - Implementar backup/export
   - Verificar integridade
   - Migração de dados

4. **Sistema**
   - Monitorar saúde do servidor
   - Ver logs de erro
   - Status dos serviços

## Arquivos Modificados/Criados

- ✅ `src/components/layout/Header.tsx` - Adicionado link de admin condicional
- ✅ `src/lib/hooks/useAdminProtection.ts` - Hook de proteção de rota
- ✅ `src/lib/hooks/usePermissions.ts` - Hook de verificação de permissões
- ✅ `src/lib/hooks/index.ts` - Índice de hooks
- ✅ `app/admin/configuracoes-avancadas/page.tsx` - Página de configurações
- ✅ `docs/ADMIN_SYSTEM.md` - Este documento

## Comandos SQL Úteis

### Atualizar um usuário para admin
```sql
UPDATE researchers 
SET user_type = 'admin' 
WHERE id = 'uuid-do-usuario';
```

### Ver todos os admins
```sql
SELECT id, name, email, user_type, created_at
FROM researchers
WHERE user_type = 'admin'
ORDER BY created_at DESC;
```

### Contar usuários por tipo
```sql
SELECT user_type, COUNT(*) as total
FROM researchers
GROUP BY user_type;
```

### Verificar integridade de user_type
```sql
SELECT id, name, user_type, 
  CASE 
    WHEN user_type NOT IN ('pesquisador', 'admin') THEN 'INVÁLIDO'
    ELSE 'OK'
  END as status
FROM researchers
WHERE user_type NOT IN ('pesquisador', 'admin');
```

## Conclusão

O sistema de permissões está implementado de forma:
- **Eficiente:** Sem chamadas API extras
- **Seguro:** Validação no backend + filtro no frontend
- **Escalável:** Fácil adicionar novos tipos de usuário
- **Intuitivo:** UX clara para admins vs pesquisadores
