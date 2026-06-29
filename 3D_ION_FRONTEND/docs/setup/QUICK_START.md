# 🚀 Quick Start - Sistema de Admin

Guia rápido para entender e usar o novo sistema de permissões.

---

## ⚡ 30 Segundo Overview

**O que foi implementado:**
- ✅ Filtro de login baseado em `user_type` (campo do BD)
- ✅ Link "⚙️ Configurações Avançadas" aparece só para admins
- ✅ Página `/admin/configuracoes-avancadas` com 4 abas
- ✅ Proteção de rota automática (não-admins são redirecionados)

**Como funciona:**
1. Usuário faz login → Backend retorna `user_type`
2. Frontend armazena em `localStorage` + `Zustand`
3. Header verifica e mostra link só para admin
4. Página de admin protegida por `useAdminProtection` hook

---

## 🧪 Testar em 1 Minuto

### Opção 1: Com Usuário Admin Real
```bash
# Ter um usuário admin no Supabase
# Fazer login normalmente
# Procurar "⚙️ Configurações Avançadas" no header
# Clicar e verificar se carrega a página
```

### Opção 2: Simular no Console
```javascript
// Cole no console do navegador (F12)
localStorage.setItem('user', JSON.stringify({
  user_id: '123',
  name: 'Admin Test',
  email: 'admin@test.com',
  institution: 'Test',
  phone_number: '+55',
  instagram: 'test',
  user_type: 'admin',  // ← Isto é o importante
  access_token: 'token'
}))
// Recarregar página (F5)
// Procurar pelo link no header
```

---

## 📁 Arquivos Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `Header.tsx` | Mostrar/ocultar link de admin |
| `useAdminProtection.ts` | Proteger rota `/admin/*` |
| `usePermissions.ts` | Verificar permissões em qualquer componente |
| `configuracoes-avancadas/page.tsx` | Página de admin |
| `ADMIN_SYSTEM.md` | Documentação completa |

---

## 💻 Usar em Seu Código

### Mostrar Conteúdo Apenas para Admin

```tsx
import { usePermissions } from '@/lib/hooks'

function MyComponent() {
  const { isAdmin } = usePermissions()
  
  if (!isAdmin) return null
  
  return <div>Só admins veem isto</div>
}
```

### Proteger Uma Página

```tsx
import { useAdminProtection } from '@/lib/hooks'

export default function AdminPage() {
  const user = useAdminProtection()
  
  if (!user) return <Loader />
  
  return <div>Bem-vindo, {user.name}</div>
}
```

### Verificar Múltiplas Permissões

```tsx
const { isAdmin, isResearcher, user } = usePermissions()

if (isAdmin) { /* ... */ }
else if (isResearcher) { /* ... */ }
else { /* Não autenticado */ }
```

---

## 🔍 Entender o Fluxo

```
Login → user_type no response → localStorage → Header verifica
                                    ↓              ↓
                              Zustand store   Link aparece?
                                              ↓
                                          Admin: SIM
                                          Pesquisador: NÃO
```

---

## ⚙️ Configurar Admin no Banco

### Consulta um Usuário
```sql
SELECT id, name, email, user_type
FROM researchers
WHERE email = 'seu_email@example.com'
LIMIT 1;
```

### Promover para Admin
```sql
UPDATE researchers
SET user_type = 'admin'
WHERE email = 'seu_email@example.com';
```

### Ver Todos os Admins
```sql
SELECT name, email, created_at
FROM researchers
WHERE user_type = 'admin'
ORDER BY created_at DESC;
```

---

## 🐛 Algo Não Está Funcionando?

### Problema: Link "⚙️ Config" Não Aparece

**Passo 1:** Verificar localStorage
```javascript
JSON.parse(localStorage.getItem('user')).user_type
// Deve retornar: "admin"
```

**Passo 2:** Se for "pesquisador", fazer logout e login novamente

**Passo 3:** Se persistir, verificar no banco:
```sql
SELECT user_type FROM researchers WHERE email = 'seu_email@example.com';
```

### Problema: Redireciona para /experimentos

**Significa:** Seu `user_type` não é "admin"

**Solução:** 
- Confirmar com seu admin que foi promovido ✅
- Fazer logout e login novamente
- Limpar cache (Ctrl+Shift+Del)

### Problema: Redireciona para /login

**Significa:** Sua sessão expirou ou localStorage foi limpo

**Solução:** Fazer login novamente

---

## 📚 Documentação Detalhada

Para aprofundar, leia:

1. **`ADMIN_SYSTEM.md`** - Explicação técnica completa
2. **`ADMIN_SETUP_GUIDE.md`** - Setup e troubleshooting
3. **`PERMISSION_EXAMPLES.md`** - 7 exemplos práticos
4. **`ARCHITECTURE_DIAGRAMS.md`** - Diagramas visuais
5. **`IMPLEMENTATION_SUMMARY.md`** - O que foi feito

---

## ✅ Checklist

- [ ] User type "pesquisador" já funciona (login, Meus Experimentos, etc)
- [ ] Tem um usuário com `user_type = 'admin'` no BD
- [ ] Fez login com esse usuário
- [ ] Procurou por "⚙️ Configurações Avançadas" no header
- [ ] Conseguiu acessar `/admin/configuracoes-avancadas`
- [ ] Viu as 4 abas (Usuários, Segurança, BD, Sistema)

Se tudo OK → Sistema está 100% funcional ✅

---

## 🎯 Próximos Passos

**Curto prazo:**
1. Testar com usuário admin real
2. Confirmar que `user_type` vem do backend no login
3. Usar hooks em suas próprias páginas

**Médio prazo:**
1. Implementar "Gerenciar Usuários"
2. Adicionar funcionalidade de backup
3. Implementar logs de auditoria

---

## 👥 Permissões

| Ação | Visitante | Pesquisador | Admin |
|------|-----------|-------------|-------|
| Login | ❌ | ✅ | ✅ |
| Ver experimentos públicos | ✅ | ✅ | ✅ |
| Ver meus experimentos | ❌ | ✅ | ✅ |
| Criar experimento | ❌ | ✅ | ✅ |
| Ver Configurações Avançadas | ❌ | ❌ | ✅ |
| Gerenciar usuários | ❌ | ❌ | ✅ |

---

## 📞 Suporte

Se tiver dúvidas:
1. Verifique localStorage (como acima)
2. Verifique resposta do login (Network tab)
3. Consulte a documentação detalhada
4. Verifique o banco de dados

---

**Tudo pronto para usar!** 🎉
