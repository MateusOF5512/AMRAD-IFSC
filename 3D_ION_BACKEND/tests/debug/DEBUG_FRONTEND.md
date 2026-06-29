# 🔍 INSTRUÇÕES PARA DEBUG - Coluna de Experimentos Zerada

## 📌 Status Atual

✅ **Backend:** Dados estão sendo retornados CORRETAMENTE:
  - `mateus1@gmail.com`: 2 experimentos
  - `mateus7ortiz@gmail.com`: 33 experimentos
  
❌ **Frontend:** Valores aparecem como 0 na interface

---

## 🎯 Passo-a-Passo para Debugar

### Passo 1: Abra o Developer Tools
1. **Pressione `F12`** no navegador (ou `Ctrl+Shift+I`)
2. Vá para a aba **Console**

### Passo 2: Navegue até Gerência de Usuários
1. Vá para **Configurações Avançadas** (⚙️)
2. Clique em **Gerência de Usuários** na aba esquerda
3. **Aguarde** os dados carregarem

### Passo 3: Observe os Logs
Na aba **Console**, você deve ver mensagens como:

```
[API] Calling endpoint: /admin/users?status=irregular&page=1&per_page=10
[API] Response received: {...}
[API] First user from response: {name: "MATEUS ORTIZ ADMIN", experimentos_criados_total: 2, ...}
[API] First user experimentos_criados_total: 2
[Page] Response received for irregular: {...}
[UsersTable-irregular] Received 13 users
[UsersTable-irregular] First user: {...}
[UsersTable-irregular] First user experimentos_criados_total: 2
[UsersTable RENDER] User: MATEUS ORTIZ ADMIN, experimentos_criados_total: 2, type: number
```

### Passo 4: Verifique os Valores

📊 **O que procurar:**
- A linha `[API] First user experimentos_criados_total: X` deve mostrar **2** (não 0)
- A linha `[UsersTable RENDER] User: ... experimentos_criados_total: X` deve mostrar **2** (não 0)

Se ambas mostrarem **2**, mas a interface exibe **0**, é um problema de rendering.

---

## ⚠️ Possíveis Problemas

### Problema 1: API retorna 0
**Log que você veria:**
```
[API] First user experimentos_criados_total: 0
```

**Causa:** Backend não está contando corretamente
**Solução:** Verificar servidor backend

### Problema 2: Dados chegam corretos mas renderizam como 0
**Log que você veria:**
```
[API] First user experimentos_criados_total: 2
[UsersTable RENDER] User: MATEUS ORTIZ ADMIN, experimentos_criados_total: 0
```

**Causa:** Problema entre o state React e a renderização
**Solução:** Possível erro de tipo ou conversão

### Problema 3: Sem logs aparecem
**Causa:** JavaScript não está rodando ou frontend offline
**Solução:** Verifique se há erros vermelhos no console antes dos logs

---

## 📤 Como Compartilhar Resultado

1. **Copie todos os logs** que aparecem no console
2. **Abra a aba Network** (F12 → Network)
3. **Verifique a requisição:**
   - Clique em `admin/users?status=irregular...`
   - Vá para aba "Response" 
   - Copie o JSON completo
4. **Envie para análise**

---

## 🔧 DEBUG Avançado

Se quiser fazer um teste manual no console, execute:

```javascript
// Verificar localStorage
console.log('User data:', localStorage.getItem('user'))

// Mostrar estado interno do React (se Devtools estiver instalado)
// Inspecione o componente UsersTable e veja a prop 'users'
```

---

## ✅ Checklist

Antes de contactar com resultado, verifique:

- [ ] **Backend está rodando?**
  ```bash
  python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
  ```

- [ ] **Frontend está recarregado?** (Ctrl+Shift+R para cache limpo)

- [ ] **Console mostra logs `[API]`, `[Page]`, `[UsersTable]`?**

- [ ] **cURL funciona?**
  ```bash
  curl -X GET "http://localhost:8000/api/v1/admin/users?status=irregular&page=1&per_page=10" \
    -H "Authorization: Bearer SEU_TOKEN"
  ```

---

## 📋 Informações Já Confirmadas

✅ Backend endpoint: **FUNCIONA** (retorna dados corretos)
✅ Contagem de samples: **CORRETA** (2, 33, 0, etc)
✅ API response: **COMPLETA** (inclui experimentos_criados_total)

❓ **Falta descobrir:** Por que a interface exibe 0?
