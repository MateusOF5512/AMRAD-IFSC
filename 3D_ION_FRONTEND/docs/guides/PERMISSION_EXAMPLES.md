# Exemplos de Uso - Sistema de Permissões

## 1. Verificar Permissão com `usePermissions` Hook

### Exemplo 1: Mostrar/Ocultar Elementos Baseado em Tipo de Usuário

```tsx
'use client'

import { usePermissions } from '@/lib/hooks'

export function Dashboard() {
  const { isAdmin, isResearcher, user } = usePermissions()

  return (
    <div>
      <h1>Dashboard de {user?.name}</h1>
      
      {isAdmin && (
        <div className="bg-orange-100 p-4 rounded-lg">
          <h2>Painel Administrativo</h2>
          <p>Bem-vindo, administrador {user.name}</p>
          <button>Gerenciar Usuários</button>
        </div>
      )}

      {isResearcher && (
        <div className="bg-green-100 p-4 rounded-lg">
          <h2>Área do Pesquisador</h2>
          <p>Bem-vindo, pesquisador {user.name}</p>
          <button>Criar Novo Experimento</button>
        </div>
      )}
    </div>
  )
}
```

### Exemplo 2: Renderização Condicional em Listas

```tsx
import { usePermissions } from '@/lib/hooks'

export function UserList({ users }) {
  const { isAdmin } = usePermissions()

  return (
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Email</th>
          <th>Tipo</th>
          {isAdmin && <th>Ações</th>}
        </tr>
      </thead>
      <tbody>
        {users.map(user => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td>{user.email}</td>
            <td>{user.user_type}</td>
            {isAdmin && (
              <td>
                <button>Editar</button>
                <button>Deletar</button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

## 2. Proteger Rota com `useAdminProtection` Hook

### Exemplo: Página de Configurações de Admin

```tsx
'use client'

import { useAdminProtection } from '@/lib/hooks'
import { Loader2 } from 'lucide-react'

export default function AdminSettings() {
  const user = useAdminProtection()

  // Retorna loader enquanto verifica
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Renderiza conteúdo de admin
  return (
    <div>
      <h1>Configurações de Admin</h1>
      <p>Olá, {user.name}</p>
      {/* Conteúdo administrativo */}
    </div>
  )
}
```

## 3. Componente Wrapper com `AdminRouteProtector`

### Exemplo: Usar Componente de Proteção

```tsx
'use client'

import { AdminRouteProtector } from '@/components/auth/AdminRouteProtector'

export default function AdminPage() {
  return (
    <AdminRouteProtector>
      <div>
        <h1>Página de Administração</h1>
        {/* Conteúdo que só admins veem */}
      </div>
    </AdminRouteProtector>
  )
}
```

## 4. Navegação Condicional no Header

### Exemplo: Links Diferentes por Tipo de Usuário

```tsx
'use client'

import Link from 'next/link'
import { usePermissions } from '@/lib/hooks'

export function NavigationLinks() {
  const { isAdmin, isResearcher, isAuthenticated } = usePermissions()

  return (
    <nav>
      {/* Links públicos */}
      <Link href="/experimentos">Todos Experimentos</Link>

      {/* Links para autenticados */}
      {isAuthenticated && (
        <>
          <Link href="/meus-experimentos">Meus Experimentos</Link>
          <Link href="/settings">Meu Perfil</Link>
        </>
      )}

      {/* Links só para admins */}
      {isAdmin && (
        <>
          <Link href="/admin/configuracoes-avancadas">⚙️ Configurações</Link>
          <Link href="/admin/usuarios">Gerenciar Usuários</Link>
          <Link href="/admin/relatorios">Relatórios</Link>
        </>
      )}

      {/* Links só para pesquisadores */}
      {isResearcher && !isAdmin && (
        <Link href="/pesquisador/templates">Meus Templates</Link>
      )}
    </nav>
  )
}
```

## 5. Chamada de API com Verificação de Permissão

### Exemplo: Editar Usuário (Só Admin Pode)

```tsx
'use client'

import { usePermissions } from '@/lib/hooks'
import { useState } from 'react'

export function EditUserForm({ userId }) {
  const { isAdmin } = usePermissions()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Verificação de cliente (segunda linha de defesa)
    if (!isAdmin) {
      alert('Você não tem permissão para editar usuários')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ /* dados */ }),
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.status === 403) {
        // Backend também rejeitou (terceira linha de defesa)
        alert('Acesso negado pelo servidor')
      }
    } finally {
      setLoading(false)
    }
  }

  // Se não é admin, não mostra nem o formulário
  if (!isAdmin) {
    return <p>Você não tem permissão para acessar esta ação</p>
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Formulário */}
    </form>
  )
}
```

## 6. Verificar Múltiplas Permissões

### Exemplo: Componente com Acesso Baseado em Roles

```tsx
'use client'

import { usePermissions } from '@/lib/hooks'

export function FeatureGate({ feature, children }) {
  const { hasRole, user } = usePermissions()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    // Verificar se usuário tem permissão para essa feature
    const hasPermission = user && 
      (user.user_type === 'admin' || feature === 'basic')
    
    setAllowed(hasPermission)
  }, [user, feature])

  if (!allowed) {
    return null // Ou mostrar message
  }

  return children
}

// Uso:
<FeatureGate feature="advanced">
  <AdvancedExperimentCreation />
</FeatureGate>
```

## 7. Exemplo Completo: Página de Admin com Diferentes Seções

```tsx
'use client'

import { useAdminProtection } from '@/lib/hooks'
import { usePermissions } from '@/lib/hooks'
import { Loader2, AlertCircle } from 'lucide-react'

export default function AdminPanelPage() {
  const user = useAdminProtection()  // Protege rota
  const { isAdmin } = usePermissions()  // Verifica permissão
  const [activeTab, setActiveTab] = useState('users')

  if (!user) {
    return <Loading />
  }

  return (
    <div>
      {/* Header com informação de admin */}
      <div className="bg-orange-50 p-4 flex gap-2">
        <AlertCircle className="text-orange-600" />
        <div>
          <p className="font-bold">Modo Administrador</p>
          <p className="text-sm text-gray-600">Acesso restrito a {user.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => setActiveTab('users')}
          className={activeTab === 'users' ? 'active' : ''}
        >
          Gerenciar Usuários
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={activeTab === 'settings' ? 'active' : ''}
        >
          Configurações
        </button>
      </div>

      {/* Conteúdo */}
      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'settings' && <SettingsPanel />}
    </div>
  )
}

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="animate-spin" />
    </div>
  )
}
```

## Boas Práticas

### ✅ DO: Verificar Permissão no Frontend
```tsx
const { isAdmin } = usePermissions()
if (!isAdmin) return <AccessDenied />
```

### ❌ DON'T: Confiar Apenas no Frontend
Sempre validar no backend também:
```python
# Backend (FastAPI)
@router.post("/api/admin/users")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    # Verificar se é admin
    if current_user.user_type != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Deletar usuário...
```

### ✅ DO: Usar Token JWT para API Calls
```typescript
// Token é adicionado automaticamente pelo API client
const response = await fetch('/api/admin/users', {
  headers: getAuthHeader()  // Inclui Bearer token
})
```

### ✅ DO: Fallback UI com Mensagem Clara
```tsx
if (!user) {
  return (
    <div className="bg-red-50 p-4 border border-red-200">
      <p className="text-red-700">
        Você não tem acesso a esta página. 
        <Link href="/experimentos">Voltar para experimentos</Link>
      </p>
    </div>
  )
}
```

## Testando Permissões Localmente

### 1. Simular usuário Admin
```javascript
// No console do navegador (DevTools)
localStorage.setItem('user', JSON.stringify({
  user_id: '123',
  name: 'Teste Admin',
  email: 'admin@test.com',
  institution: 'Test Uni',
  phone_number: '+55 11 98765-4321',
  instagram: 'admin_test',
  user_type: 'admin',  // ← Mudar para 'admin'
  access_token: 'fake_token_123',
  token_type: 'bearer'
}))
```

### 2. Simular usuário Pesquisador
```javascript
localStorage.setItem('user', JSON.stringify({
  user_id: '123',
  name: 'Teste Pesquisador',
  email: 'pesquisador@test.com',
  institution: 'Test Uni',
  phone_number: '+55 11 98765-4321',
  instagram: 'pesq_test',
  user_type: 'pesquisador',  // ← Pesquisador
  access_token: 'fake_token_123',
  token_type: 'bearer'
}))
```

### 3. Limpar e Fazer Logout
```javascript
localStorage.removeItem('user')
window.location.reload()
```

