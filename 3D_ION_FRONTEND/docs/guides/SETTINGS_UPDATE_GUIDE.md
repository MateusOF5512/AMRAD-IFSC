# Guia de Atualização - Sistema de Configurações

## O que foi atualizado

### 1. Modal de Confirmação de Senha
Foi criado um novo componente `PasswordConfirmModal.tsx` que exibe uma interface segura para confirmar a senha ao salvar alterações de perfil.

**Características:**
- ✅ Campo de senha com toggle de visibilidade (olho)
- ✅ Modal bloqueia interação com a página enquanto está aberto
- ✅ Mensagens de erro e loading durante confirmação
- ✅ Integração segura com o formulário de dados pessoais

### 2. Fluxo de Salvamento de Dados

#### Antes (❌ Problema):
```
Usuário clica em "Salvar Alterações"
    ↓
prompt() básico pede senha
    ↓
Fetch para /api/v1/users/update
    ↓
❌ Erro: "Unexpected token '<', '<!DOCTYPE...'"
```

#### Depois (✅ Corrigido):
```
Usuário clica em "Salvar Alterações"
    ↓
Validação dos dados do formulário
    ↓
Modal visual de confirmação de senha abre
    ↓
Usuário digita senha com campo seguro
    ↓
Fetch para http://localhost:8000/api/v1/users/update
    ↓
✅ Resposta JSON salva dados do usuário
```

### 3. Melhorias na API Frontend

**Arquivo: `app/settings/page.tsx`**
- Adicionado import de `getNormalizedApiUrl()`
- Endpoints agora usam: `${apiUrl}/users/update` e `${apiUrl}/users/settings`
- Melhor tratamento de erros: detecta respostas HTML (404/500)
- Console.log para debugging

**Arquivo: `src/components/settings/PersonalDataForm.tsx`**
- Adicionado componente `PasswordConfirmModal`
- Nova lógica: formData → validação → pendingData → modal → confirmPassword → onSubmit
- Estado separado: `showConfirmModal`, `pendingData`, `formLoading`

### 4. Backend - Serialização de Dados

**Arquivo: `app/routers/users.py`**
- Endpoints agora convertem `UserProfileResponse` para dicionário com `.model_dump()`
- Retorno JSON é garantido, não objeto Pydantic

## Como Usar

### 1. Editar Dados Pessoais
```
1. Clique em "MATEUS ORTIZ" (seu nome) na barra superior
2. Vá para aba "Dados Pessoais"
3. Edite os campos desejados:
   - Nome Completo
   - Instituição
   - Telefone
   - Instagram
4. Clique em "Salvar Alterações"
5. Digite sua senha no modal de confirmação
6. Clique em "Confirmar"
```

### 2. Alterar Senha
```
1. Ir para "Dados Pessoais"
2. Preencher campos de senha:
   - Senha Antiga: sua senha atual
   - Nova Senha: nova senha (mín. 8 caracteres)
   - Confirmar Nova Senha: repetir nova senha
3. Clicar em "Salvar Alterações"
4. Confirmar com senha atual no modal
```

### 3. Configurações de Sistema
```
1. Vai para aba "Sistema"
2. Toggle "Desejo receber notificações por email"
3. Clique em "Salvar"
```

## Validações Implementadas

### Senha de Confirmação
- ✅ Validada contra `password_hash` no Supabase
- ✅ Usa bcrypt para verificação criptográfica
- ✅ Bloquia alterações se senha incorreta

### Mudança de Senha
- ✅ Requer senha antiga correta
- ✅ Mínimo 8 caracteres para nova senha
- ✅ Nova senha e confirmação devem coincidir
- ✅ Nova senha é hasheada com bcrypt

### Validação de Email
- ✅ Email não pode ser alterado (somente leitura)
- ✅ Indicação clara: "Email não pode ser alterado"

## Testes

### Teste 1: Atualizar Perfil
```
✅ Login
✅ Ir para Settings
✅ Editar Nome para "Novo Nome"
✅ Clicar Salvar Alterações
✅ Modal aparece
✅ Digitar senha correta
✅ Clicar Confirmar
✅ Mensagem: "Dados atualizados com sucesso!"
✅ Nome atualizado no formulário
✅ Refresh da página mantém dados
```

### Teste 2: Senha Incorreta
```
✅ Login
✅ Ir para Settings
✅ Editar qualquer campo
✅ Clicar Salvar Alterações
✅ Modal aparece
✅ Digitar senha INCORRETA
✅ Clicar Confirmar
✅ Mensagem de erro: "Invalid confirmation password"
✅ Modal permanece aberto
```

### Teste 3: Alterar Senha
```
✅ Login
✅ Ir para Settings
✅ Preencher campos de senha
✅ Clicar Salvar Alterações
✅ Modal aparece
✅ Digitar senha atual
✅ Clicar Confirmar
✅ Mensagem: "Dados atualizados com sucesso!"
✅ Fazer logout
✅ Login com NOVA senha funciona
```

## Troubleshooting

### Erro: "Unexpected token '<', '<!DOCTYPE...'"
**Causa:** API está retornando HTML ao invés de JSON
**Solução:**
1. Verificar se backend está rodando: `python -m pytest tests/`
2. Verificar URL da API no console: F12 → Network tab
3. Validar token JWT está sendo enviado: Headers → Authorization

### Erro: "Invalid confirmation password"
**Causa:** Senha diferente da armazenada no banco
**Solução:**
1. Digitar a senha que você usa para fazer login
2. Tentar novamente
3. Se esquecer: resetar senha (não implementado ainda)

### Dados não carregam no formulário
**Causa:** Backend não retornando dados do Supabase
**Solução:**
1. Verificar console: F12 → Console tab
2. Procurar por "Loaded user from API"
3. Verificar se todos os campos existem no Supabase

## Componentes Afetados

| Arquivo | Mudança |
|---------|---------|
| `PasswordConfirmModal.tsx` | 🆕 Novo |
| `PersonalDataForm.tsx` | ✏️ Modal integrada |
| `settings/page.tsx` | ✏️ URL normalizada |
| `users.py` | ✏️ `.model_dump()` adicionado |

## Stack Técnico

- **Frontend:** Next.js 16.1.6, React, TypeScript, Tailwind CSS
- **Backend:** FastAPI, Supabase, bcrypt
- **Database:** PostgreSQL (Supabase)
- **Auth:** JWT tokens em localStorage

## Próximos Passos (Futuros)

- [ ] Reset de senha por email
- [ ] Autenticação 2FA
- [ ] Verificação de email
- [ ] Histórico de alterações de perfil
- [ ] Backup automático de dados

---

**Data:** Fevereiro 2026
**Status:** ✅ Implementado e testado
