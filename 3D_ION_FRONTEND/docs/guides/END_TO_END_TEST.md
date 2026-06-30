# 🧪 Guia de Teste End-to-End - Fluxo Completo do Experimento

## 📋 Objetivo
Verificar se todo o fluxo de criação de experimento funciona do começo ao fim, desde o login até o salvamento dos dados na base de dados.

## 🚀 Pré-requisitos

Antes de começar, garanta que:

```bash
# 1. Frontend rodando
npm run dev
# Esperado: http://localhost:3000 disponível

# 2. Backend rodando
cd ../AMRAD_BACKEND
python -m uvicorn app.main:app --reload
# Esperado: http://localhost:8000 disponível

# 3. Arquivo .env.local configurado
cat .env.local | grep NEXT_PUBLIC_
# Esperado: URLs e chaves do Supabase configuradas
```

---

## 📍 Teste 1: Verificar Acesso ao Sistema

### Passo 1.1 - Abrir Página Inicial
```
1. Abra http://localhost:3000 no navegador
2. Esperado: Ver página inicial com botão "Começar"
```

**Teste**: ✅ Passar | ❌ Falhar (anote o erro)

### Passo 1.2 - Clicar em Começar
```
1. Clique no botão "Começar" ou "Login"
2. Esperado: Redirecionado para /login
```

**Teste**: ✅ Passar | ❌ Falhar

---

## 📍 Teste 2: Fazer Login

### Passo 2.1 - Acessar Página de Login
```
URL esperada: http://localhost:3000/login
Elementos esperados:
  - Campo Email
  - Campo Senha
  - Botão "Entrar"
  - Link "Criar Conta"
```

**Teste**: ✅ Passar | ❌ Falhar

### Passo 2.2 - Fazer Login
```
1. Entre seu email
2. Entre sua senha
3. Clique "Entrar"
```

**Teste**: ✅ Passar | ❌ Falhar

**Se falhar:**
- Abra DevTools (F12) → Console
- Procure por erro de autenticação
- Verifique se email está confirmado no Supabase

### Passo 2.3 - Verificar Redirecionamento
```
Esperado após login:
  - URL muda para http://localhost:3000/dashboard
  - Ver lista de experimentos (pode estar vazia)
```

**Teste**: ✅ Passar | ❌ Falhar

---

## 📍 Teste 3: Criar Novo Experimento

### Passo 3.1 - Acessar Wizard
```
1. No dashboard, clique em "+ Novo Experimento"
   OU acesse http://localhost:3000/experiments/new
2. Esperado: Ver página do wizard com:
   - Barra de progresso (Step 1 de 8)
   - Título: "Material e Máquina"
   - Dois cards de entrada (Material e Máquina)
```

**Teste**: ✅ Passar | ❌ Falhar

### Passo 3.2 - Preencher Material e Máquina

```
1. Preencha os campos:
   
   MATERIAL:
   - Brand: "3D Systems" (ou outro)
   - Model: "ProJet 3500" (ou outro)
   - Color: "Branco" ou "Cinza"
   - Is Composite: Marque ou não

   MÁQUINA:
   - Brand: "3D Systems" (ou outro)
   - Model: "ProJet 3500" (ou outro)
   - Technology Type: "Binder Jetting" ou outra

2. Clique "Salvar Material e Máquina"
```

**Teste**: ✅ Passar | ❌ Falhar

**Se receber "No active session":**
- Anote a hora
- Abra DevTools → Console
- Procure por erro específico
- Consulte TROUBLESHOOTING.md

### Passo 3.3 - Verificar Sucesso

```
Esperado após salvar:
  - Mensagem de sucesso (pode aparecer brevemente)
  - Barra de progresso muda para Step 2
  - Nova tela com "Amostra"
```

**Teste**: ✅ Passar | ❌ Falhar

### Passo 3.4 - Preencher Amostra

```
1. Selecione o tipo de forma:
   - Cube (1 dimensão)
   - Cylinder (2 dimensões)
   - Other (2 dimensões)

2. Preencha:
   - Dimension A: 10.5
   - Dimension B: 8.3 (se não for Cube)
   - ROI Area: 150.0

3. Clique "Salvar Amostra"
```

**Teste**: ✅ Passar | ❌ Falhar

**Esperado:** Barra progride para Step 3

### Passo 3.5 - Preencher Infill (Medições)

```
1. Você verá uma grade com infills padrão (40%, 45%, ... 100%)
2. Para cada um, preencha:
   - HU Mean: 150 a 300 (valores variados)
   - HU SD: 5 a 20

3. Opcional: Adicione medições personalizadas
   - Clique "+ Adicionar Medição Personalizada"
   - Preencha % e valores

4. Clique "Salvar Medições de Infill"
```

**Teste**: ✅ Passar | ❌ Falhar

**Observação:** Você pode preencher valores realistas ou fictícios para teste

### Passo 3.6 - CT Scan (Opcional)

```
1. Você tem a opção de:
   - Preencher dados (Dimensões A, B, SD, Homogeneidade)
   - Pular esta etapa
   
2. Se pular, clique "Pular CT Scan"
   Se preencher:
   - Dimension A: 10.0
   - Dimension B: 8.0
   - SD Value: 15.0
   - Visual: Homogêneo
   - URL da imagem: (deixe em branco)
   
3. Clique "Salvar Dados CT Scan" ou "Pular"
```

**Teste**: ✅ Passar | ❌ Falhar

### Passo 3.7 - Propriedades Mecânicas (Opcional)

```
Similar ao CT Scan:
1. Pode pular ou preencher valores
2. Se preencher:
   - Tensile Modulus: 2000 (MPa)
   - Tensile Strength: 45 (MPa)
   - Flexural Modulus: 2500 (MPa)
   - Etc.

3. Clique "Pular" ou "Salvar Propriedades Mecânicas"
```

**Teste**: ✅ Passar | ❌ Falhar

### Passo 3.8 - Atenuação Linear (Opcional)

```
1. Adicione medições de atenuação:
   - Clique "+ Adicionar Medição"
   
2. Para cada medição:
   - Thickness: 5.0
   - Value (Lambert-Beer): 0.5

3. Clique "Salvar Medições de Atenuação" ou "Pular"
```

**Teste**: ✅ Passar | ❌ Falhar

### Passo 3.9 - Qualidade de Feixes (Última Etapa)

```
1. Escolha uma aba: RQR, RQT ou RQR-M
2. Preencha os valores das séries:
   - RQR 2, RQR 3, ... RQR 10
3. Clique "Finalizar Experimento"
```

**Teste**: ✅ Passar | ❌ Falhar

---

## ✅ Teste 4: Verificar Dados Salvos

### Passo 4.1 - Retornar ao Dashboard
```
Após finalizar, esperado:
  - Ser redirecionado para /dashboard
  - Ver o novo experimento na lista
```

**Teste**: ✅ Passar | ❌ Falhar

### Passo 4.2 - Verificar Base de Dados

Abra o Supabase Dashboard:

```
1. Acesse https://app.supabase.com
2. Selecione seu projeto
3. Vá em SQL Editor
4. Execute as queries:

-- Ver materiais criados
SELECT * FROM materials ORDER BY created_at DESC LIMIT 5;

-- Ver máquinas criadas
SELECT * FROM machines ORDER BY created_at DESC LIMIT 5;

-- Ver amostras criadas
SELECT * FROM samples ORDER BY created_at DESC LIMIT 5;

-- Ver experimentos criados
SELECT * FROM experiments ORDER BY created_at DESC LIMIT 5;
```

**Esperado:**
- Cada tabela mostra pelo menos 1 registro
- Data created_at é recente
- Valores correspondem ao que foi preenchido

**Teste**: ✅ Passar | ❌ Falhar

---

## 📊 Resultado Final

Preencha a tabela abaixo com os resultados:

| Etapa | Teste | Resultado | Notas |
|-------|-------|-----------|-------|
| 1. Acesso | 1.1 - Login | ✅ / ❌ | |
| | 1.2 - Redireção | ✅ / ❌ | |
| 2. Login | 2.1 - Página Login | ✅ / ❌ | |
| | 2.2 - Fazer Login | ✅ / ❌ | |
| | 2.3 - Dashboard | ✅ / ❌ | |
| 3. Experimento | 3.1 - Acessar Wizard | ✅ / ❌ | |
| | 3.2 - Material e Máquina | ✅ / ❌ | |
| | 3.3 - Sucesso Passo 1 | ✅ / ❌ | |
| | 3.4 - Amostra | ✅ / ❌ | |
| | 3.5 - Infill | ✅ / ❌ | |
| | 3.6 - CT Scan | ✅ / ❌ | |
| | 3.7 - Mecânica | ✅ / ❌ | |
| | 3.8 - Atenuação | ✅ / ❌ | |
| | 3.9 - Feixes | ✅ / ❌ | |
| 4. Dados | 4.1 - Dashboard | ✅ / ❌ | |
| | 4.2 - Supabase | ✅ / ❌ | |

**Resultado:** 
- ✅ Se todos os testes passarem, o sistema está pronto para uso
- ❌ Se algum falhar, consulte TROUBLESHOOTING.md

---

## 🔄 Teste Repetido: Criar Segundo Experimento

```
Para garantir que não foi um acaso:
1. Repita todo o fluxo (Passo 3)
2. Espera que funcionasse novamente
3. Verifique 2 experimentos no dashboard
4. Verifique 2 registros em cada tabela do Supabase
```

**Resultado**: ✅ Repetível | ❌ Falho em algum ponto

---

## 📝 Notas Importantes

### Dados de Teste
Você pode usar qualquer dado fictício para este teste:
- Nomes de marca podem ser qualquer coisa
- Valores numéricos podem ser arbitrários
- Não precisa ser dados científicos reais

### Performance
- Esperado: 1-2 segundos por etapa (com loading indicator)
- Se demorar > 5s: Pode indicar problema de conexão com API

### Segurança
- ✅ Cookies são salvos (verifique em DevTools → Application → Cookies)
- ✅ Token é enviado com "Bearer" em cada requisição
- ✅ Logout limpa a sessão corretamente

---

## 🆘 Encontrou um Bug?

Se algum teste falhar:

1. **Anote tudo:**
   - Qual passo falhou exatamente
   - Qual mensagem de erro apareceu
   - Que navegador e versão do SO

2. **Colete logs:**
   - DevTools → Console (copie erros)
   - DevTools → Network (veja status das requisições)
   - Monitor do FastAPI (veja se API está respondendo)

3. **Tente novamente:**
   - Limpe cache do navegador
   - Faça logout e login novamente
   - Reinicie o servidor Next.js

4. **Se persistir:**
   - Consulte TROUBLESHOOTING.md
   - Verifique documentação Supabase
   - Procure ajuda com as informações coletadas

---

Boa sorte com os testes! 🚀
