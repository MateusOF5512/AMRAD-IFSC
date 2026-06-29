# Solução: Erro de Certificado SSL Self-Signed

## 🐛 Problema Identificado

O aplicativo Next.js estava falhando com dois erros relacionados:

```
❌ Error response: {}
Database error: [SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: self-signed certificate in certificate chain
```

### Causa Raiz
- O backend está rodando com HTTPS usando um certificado **auto-assinado (self-signed)**
- O Node.js/Next.js rejeita por padrão certificados auto-assinados em produção (rejectUnauthorized: true)
- A resposta vazia e o erro SSL ocorrem quando a conexão é rejeitada

## ✅ Solução Implementada

### 1. Novo Cliente API (`src/lib/api-client.ts`)
Criado um wrapper de fetch que:
- Detecta automaticamente se está em **ambiente de desenvolvimento**
- Detecta se a URL do backend é HTTPS
- Cria um agente HTTPS com `rejectUnauthorized: false` **apenas em desenvolvimento**
- Mantém verificação de certificado em **produção**

```typescript
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,  // Desabilita verificação em dev
  keepAlive: true,
})
```

### 2. Atualização do `app/experimentos/page.tsx`
- ✅ Importado o novo `fetchWithAgent`
- ✅ Substituídos todos os `fetch()` por `fetchWithAgent()`
- ✅ Melhorado tratamento de erros para capturar:
  - Erros de certificado SSL
  - Erros de conexão
  - Erros do servidor (500)

## 📋 Mudanças Realizadas

### Arquivo: `src/lib/api-client.ts` (NOVO)
- Função `fetchWithAgent()`: Wrapper de fetch com suporte a SSL
- Função `createApiHeaders()`: Headers padrão para API
- Função `apiCall<T>()`: Wrapper completo com tratamento de erros

### Arquivo: `app/experimentos/page.tsx`
- Linha 10: Adicionada importação do `fetchWithAgent`
- Linha 99: Substituído primeiro `fetch()` por `fetchWithAgent()`
- Linha 166: Substituído segundo `fetch()` por `fetchWithAgent()`
- Linhas 174-206: Melhorado tratamento de erros com mensagens específicas

## 🔐 Segurança

**IMPORTANTE**: Esta solução é segura porque:

1. **Apenas em Desenvolvimento**: Verifica `process.env.NODE_ENV === 'development'`
2. **Apenas para Self-Signed**: Valida se é HTTPS e localhost/127.0.0.1
3. **Produção Protegida**: Em produção, sempre valida certificados SSL
4. **Sem Credenciais Expostas**: O desabilitar de verificação é válido apenas para certificados auto-assinados

## 🚀 Como Usar

1. **Substitua todos os `fetch()` calls** da sua aplicação por `fetchWithAgent()`:

```typescript
// Antes
const response = await fetch(url, options)

// Depois
const response = await fetchWithAgent(url, options)
```

2. **Ou use o wrapper completo** para chamadas à API:

```typescript
import { apiCall } from '@/lib/api-client'

const data = await apiCall<ExperimentsResponse>(`${apiUrl}/experiments/resumo`)
```

## 🔍 Teste a Solução

1. Verifique se o backend está rodando em `https://localhost` ou similar
2. Execute o frontend: `npm run dev`
3. A página de experimentos deve carregar sem erros
4. Verifique o console para os logs:
   - `🔗 Fetching experiments from: https://...`
   - `📊 Response status: 200 OK`
   - `✅ Experiments loaded: X`

## 📝 Próximas Melhorias Recomendadas

1. **Variável de Ambiente**: Adicione `NEXT_PUBLIC_INSECURE_SSL` para controle de certificados
2. **Implementar em Toda a App**: Aplique `fetchWithAgent` em todas as chamadas fetch
3. **Certificado Válido**: Em produção, use certificado SSL válido (Let's Encrypt, etc)
4. **Retry Logic**: Adicione retry automático para falhas de conexão

## 🆘 Troubleshooting

### Ainda recebe erro de certificado?
```bash
# Verifique se está em desenvolvimento
echo NODE_ENV

# Verifique a URL da API
echo NEXT_PUBLIC_API_URL

# Reinicie o servidor
npm run dev
```

### Resposta vazia do servidor?
1. Verifique se o backend respondeu corretamente
2. Veja os logs do backend para erros
3. Teste a URL diretamente: `curl -k https://seu-servidor/api/v1/experiments/resumo`
