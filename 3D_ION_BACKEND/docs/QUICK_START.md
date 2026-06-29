# 🚀 Quick Start Guide — ION3D Platform

Guia rápido para colocar a plataforma funcionando em **menos de 5 minutos**.

---

## ⚡ Pré-requisitos

- **Python 3.11+**
- **Node.js 18+**
- **Conta Supabase** (criar em https://supabase.com se não tiver)

---

## 📝 Passo 1: Configurar Supabase

### 1.1 Criar Projeto no Supabase

1. Acesse https://supabase.com/dashboard
2. Clique em "New Project"
3. Anote:
   - **Project URL**: `https://[seu-projeto].supabase.co`
   - **Anon Key**: Encontrado em Settings → API
   - **Service Role Key**: Encontrado em Settings → API

### 1.2 Criar Tabelas (Opcional)

Se as tabelas ainda não existem, execute no SQL Editor:

```sql
-- Tabela de pesquisadores (gerenciada pelo Supabase Auth)
-- Tabela de materiais
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  researcher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT NOT NULL,
  is_composite BOOLEAN NOT NULL DEFAULT false,
  composite_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de máquinas
CREATE TABLE machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  researcher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  technology_type TEXT NOT NULL,
  other_specs TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de amostras
CREATE TABLE samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  researcher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  shape_type TEXT NOT NULL,
  roi_area_mm2 FLOAT,
  dimension_a FLOAT,
  dimension_b FLOAT,
  regression_a FLOAT,
  regression_b FLOAT,
  regression_r_squared FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicione as outras tabelas conforme necessário
```

---

## 🔧 Passo 2: Configurar Backend

```bash
cd 3D_ION_BACKEND

# Criar ambiente virtual
python -m venv venv

# Ativar (escolha seu sistema)
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Criar arquivo .env
cp .env.example .env
```

**Editar `.env`** com suas credenciais:

```env
SUPABASE_URL=https://[seu-projeto].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[sua-service-role-key]
SUPABASE_ANON_KEY=[sua-anon-key]
JWT_SECRET=qualquer-string-secreta-aqui
```

**Iniciar servidor:**

```bash
uvicorn app.main:app --reload
```

✅ Backend rodando em: http://localhost:8000
📖 Docs disponíveis em: http://localhost:8000/docs

---

## 🎨 Passo 3: Configurar Frontend

**Em outro terminal:**

```bash
cd 3D_ION_FRONTEND

# Instalar dependências
npm install

# Criar arquivo .env.local
cp .env.local.example .env.local
```

**Editar `.env.local`** com suas credenciais:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[seu-projeto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[sua-anon-key]
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**Iniciar aplicação:**

```bash
npm run dev
```

✅ Frontend rodando em: http://localhost:3000

---

## 🎉 Passo 4: Testar a Aplicação

### 4.1 Criar Conta

1. Acesse http://localhost:3000
2. Clique em "Registre-se"
3. Preencha:
   - Nome completo
   - Email
   - Senha (mínimo 6 caracteres)
4. Clique em "Criar conta"

### 4.2 Fazer Login

1. Entre com o email e senha criados
2. Você será redirecionado para o Dashboard

### 4.3 Criar Experimento

1. Clique em "Novo Experimento"
2. Preencha os 3 passos:
   - **Material**: Marca, modelo, cor
   - **Máquina**: Marca, modelo, tecnologia
   - **Amostra**: Formato, dimensões
3. Revise e clique em "Criar Experimento"
4. Experimento aparecerá no Dashboard

### 4.4 Visualizar e Deletar

- Dashboard mostra todos seus experimentos
- Clique no ícone de lixeira para deletar
- Confirme a exclusão

---

## 🧪 Passo 5: Testar API Diretamente

Acesse o Swagger UI: http://localhost:8000/docs

### Obter Token de Autenticação

1. Faça login no frontend
2. Abra DevTools (F12)
3. Vá em: Application → Cookies → localhost
4. Copie o valor do cookie `sb-access-token`

### Testar Endpoints

**No Swagger UI:**

1. Clique em "Authorize" (cadeado verde)
2. Digite: `Bearer [seu-token]`
3. Clique em "Authorize"
4. Agora todos endpoints estão acessíveis

**Exemplos:**

- `GET /api/v1/materials` - Lista materiais
- `POST /api/v1/experiments/complete` - Cria experimento completo
- `GET /api/v1/experiments/my-experiments` - Lista experimentos

---

## 🐛 Troubleshooting

### Backend não inicia

```bash
# Verificar se ambiente virtual está ativado
# Deve aparecer (venv) no início do prompt

# Reinstalar dependências
pip install --upgrade -r requirements.txt
```

### Frontend não inicia

```bash
# Limpar cache
rm -rf .next node_modules

# Reinstalar
npm install
npm run dev
```

### Erro de autenticação

1. Verificar se `.env` e `.env.local` têm as chaves corretas
2. Verificar se Service Role Key está no backend
3. Verificar se Anon Key está no frontend

### Erro 404 na API

- Verificar se backend está rodando na porta 8000
- Verificar se `NEXT_PUBLIC_API_URL` está correto no frontend

### Erro de CORS

- Verificar configuração de CORS no backend (`app/main.py`)
- Adicionar `http://localhost:3000` se necessário

---

## 📊 Checklist de Configuração

- [ ] Projeto criado no Supabase
- [ ] Anon Key e Service Role Key copiadas
- [ ] Backend: `.env` configurado
- [ ] Backend rodando em http://localhost:8000
- [ ] Frontend: `.env.local` configurado
- [ ] Frontend rodando em http://localhost:3000
- [ ] Conta de usuário criada
- [ ] Experimento de teste criado
- [ ] Experimento aparece no dashboard

---

## 📚 Próximos Passos

Após testar localmente:

1. ✅ Ver [MIGRATION_COMPLETE.md](MIGRATION_COMPLETE.md) para visão completa
2. ✅ Ver `3D_ION_BACKEND/README.md` para documentação do backend
3. ✅ Ver `3D_ION_FRONTEND/README.md` para documentação do frontend
4. 🚀 Deploy em produção (Vercel + Railway/Render)

---

## 💡 Dicas

- Use o Swagger UI para testar endpoints rapidamente
- Backend e frontend devem rodar simultaneamente
- Todas mudanças no código recarregam automaticamente
- Logs aparecem nos terminais respectivos

---

## ✅ Sistema Funcionando!

Se chegou até aqui, parabéns! 🎉

Você agora tem:
- ✅ Backend FastAPI com validações
- ✅ Frontend Next.js moderno
- ✅ Autenticação via Supabase
- ✅ Wizard de criação de experimentos
- ✅ Dashboard funcional
