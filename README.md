# AMRAD

Plataforma de gestão de experimentos científicos em impressão 3D. O projeto é dividido em dois repositórios internos:

| Pasta | Stack | Porta padrão |
|-------|-------|--------------|
| `AMRAD_BACKEND` | Python · FastAPI · Supabase | `8000` |
| `AMRAD_FRONTEND` | Next.js · React · TypeScript | `3000` |

> **Pastas no disco:** se ainda aparecerem como `3D_ION_BACKEND` / `3D_ION_FRONTEND`, feche servidores dev e o Cursor, execute `.\rename-to-amrad.ps1` na raiz e reabra o workspace em `AMRAD/`.

```
Frontend (Next.js)  ──HTTP──▶  Backend (FastAPI)  ──▶  Supabase (PostgreSQL + Auth)
     :3000                          :8000
```

---

## Pré-requisitos (Windows + CMD)

Antes de iniciar, instale no Windows:

- **Python 3.11+** — [python.org](https://www.python.org/downloads/) (marque *Add Python to PATH* na instalação)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/) (inclui `npm`)
- **Conta Supabase** — [supabase.com](https://supabase.com)

Abra o **Prompt de Comando (CMD)** — `Win + R` → digite `cmd` → Enter — ou use o terminal CMD integrado do VS Code/Cursor.

As chaves do Supabase ficam em **Settings → API** do seu projeto:

- **Project URL**
- **anon public key** (usada no frontend)
- **service_role key** (usada **somente** no backend — nunca exponha no frontend)

---

## Configuração inicial (uma vez)

### Variáveis de ambiente (raiz do monorepo)

Na **raiz do projeto** (`AMRAD/`), copie o template e preencha:

```cmd
cd C:\Users\mateu\2_PESSOAL\AMRAD
copy .env.example .env
```

Edite `.env` com as chaves do Supabase (**Settings → API**). Backend e frontend leem **este único arquivo**.

```env
SUPABASE_URL=https://[seu-projeto].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[sua-service-role-key]
SUPABASE_ANON_KEY=[sua-anon-key]

NEXT_PUBLIC_SUPABASE_URL=https://[seu-projeto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[sua-anon-key]
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

JWT_SECRET=[string-secreta-longa-e-aleatoria]
DEBUG=True
```

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Chave com privilégios elevados (**apenas backend**) |
| `SUPABASE_ANON_KEY` | Sim | Chave pública anônima |
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | Mesma URL do Supabase (frontend) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Mesma anon key (frontend) |
| `NEXT_PUBLIC_API_URL` | Não | URL da API; padrão: `http://localhost:8000/api/v1` |
| `JWT_SECRET` | Sim | Segredo JWT (32+ chars em produção) |
| `DEBUG` | Não | `True` em dev; `False` em produção |
| `FRONTEND_URL` | Não | URL do frontend em produção (CORS) |
| `EXTRA_CORS_ORIGINS` | Não | Origens adicionais separadas por vírgula |

> **Importante:** nunca commite o `.env`. Apenas o `.env.example` vai para o GitHub.

---

## Iniciar o Backend

Abra um **CMD** e navegue até a pasta do backend:

```cmd
cd C:\Users\mateu\2_PESSOAL\AMRAD\AMRAD_BACKEND
```

> Ajuste o caminho se o projeto estiver em outro local.

### Criar e ativar ambiente virtual

```cmd
python -m venv venv
venv\Scripts\activate.bat
```

Quando ativo, o prompt exibe `(venv)` no início da linha.

### Instalar dependências e subir o servidor

```cmd
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Alternativa equivalente:

```cmd
python -m app.main
```

### Verificar se está funcionando

| Recurso | URL |
|---------|-----|
| Health check | http://localhost:8000 |
| API v1 health | http://localhost:8000/api/v1/health |
| Swagger (docs) | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

O servidor recarrega automaticamente ao salvar arquivos (`--reload`).

---

## Iniciar o Frontend

Abra **outro CMD** (mantenha o backend rodando no primeiro):

```cmd
cd C:\Users\mateu\2_PESSOAL\AMRAD\AMRAD_FRONTEND
npm install
npm run dev
```

### Verificar se está funcionando

Acesse http://localhost:3000 no navegador.

### Outros comandos úteis

```cmd
npm run build
npm run start
npm run lint
```

---

## Fluxo de desenvolvimento local

1. **CMD 1** — backend na porta `8000` (`venv\Scripts\activate.bat` → `uvicorn ...`)
2. **CMD 2** — frontend na porta `3000` (`npm run dev`)
3. Acesse http://localhost:3000
4. Crie uma conta em **Registre-se** ou faça login
5. Use a aplicação normalmente (experimentos, materiais, máquinas, etc.)

O frontend envia requisições autenticadas para `NEXT_PUBLIC_API_URL` com o token JWT obtido no login.

### Resumo rápido (copiar e colar)

**CMD 1 — Backend:**

```cmd
cd C:\Users\mateu\2_PESSOAL\AMRAD\AMRAD_BACKEND
venv\Scripts\activate.bat
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**CMD 2 — Frontend:**

```cmd
cd C:\Users\mateu\2_PESSOAL\AMRAD\AMRAD_FRONTEND
npm run dev
```

---

## Estrutura do projeto

```
AMRAD/
├── AMRAD_BACKEND/          # API REST (FastAPI)
│   ├── app/
│   │   ├── main.py          # Ponto de entrada da aplicação
│   │   ├── core/            # Config, segurança, middleware
│   │   ├── routers/         # Endpoints da API
│   │   ├── schemas/         # Modelos Pydantic
│   │   └── database/        # Cliente Supabase
│   ├── requirements.txt
│   └── load_env.py          # Carrega .env da raiz
│
├── AMRAD_FRONTEND/         # Interface web (Next.js)
│   ├── app/                 # Rotas e páginas (App Router)
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   └── lib/             # API client, Supabase, hooks
│   ├── package.json
│
├── .env                     # Variáveis de ambiente (NÃO commitar)
├── .env.example             # Template seguro (commitar)
├── .gitignore
└── README.md                # Este arquivo
```

---

## Solução de problemas

### `python` ou `npm` não reconhecido

- Reinstale Python/Node marcando a opção de adicionar ao PATH
- Feche e abra o CMD novamente após a instalação
- Teste: `python --version` e `npm --version`

### Erro no `pip install` (numpy, setuptools)

Se aparecer `Cannot import 'setuptools.build_meta'` ou falha ao compilar `numpy`:

1. Confirme a versão do Python: `python --version`
2. O projeto suporta **Python 3.11 a 3.13** (você está com 3.13 — OK)
3. Rode na ordem:

```cmd
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

Se o venv estiver corrompido, recrie:

```cmd
deactivate
rmdir /s /q venv
python -m venv venv
venv\Scripts\activate.bat
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

### Backend não inicia

- Confirme que o ambiente virtual está ativo (`(venv)` no prompt)
- Use `venv\Scripts\activate.bat` (não o `.ps1` do PowerShell)
- Verifique se o `.env` na **raiz** existe e contém todas as variáveis obrigatórias
- Reinstale as dependências:

```cmd
pip install --upgrade -r requirements.txt
```

### Frontend não inicia ou apresenta erro de Supabase

- Confirme que o `.env` na raiz tem `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Limpe cache e reinstale (dentro de `AMRAD_FRONTEND`):

```cmd
rmdir /s /q .next
rmdir /s /q node_modules
npm install
npm run dev
```

### Erro de conexão com a API (404, network error, CORS)

- Verifique se o backend está rodando em http://localhost:8000
- Confirme `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` no `.env` da raiz
- Reinicie o frontend após alterar variáveis de ambiente

### Erro de autenticação

- Confirme que as chaves Supabase no backend e no frontend são do **mesmo projeto**
- A `SUPABASE_SERVICE_ROLE_KEY` deve estar **apenas** no backend
- Faça logout e login novamente se o token expirou

### Porta já em uso

**Backend (8000):**

```cmd
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Atualize o frontend: `NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1`

**Frontend (3000):**

```cmd
npm run dev -- -p 3001
```

---

## Documentação adicional

| Documento | Local |
|-----------|-------|
| Backend — API e endpoints | `AMRAD_BACKEND/README.md` |
| Backend — guia rápido | `AMRAD_BACKEND/docs/QUICK_START.md` |
| Frontend — documentação geral | `AMRAD_FRONTEND/docs/README.md` |
| Frontend — setup e admin | `AMRAD_FRONTEND/docs/setup/QUICK_START.md` |
| Testes do backend | `AMRAD_BACKEND/tests/README.md` |

---

## Checklist rápido

- [ ] Python 3.11+ e Node.js 18+ instalados
- [ ] Projeto Supabase criado; chaves copiadas
- [ ] `AMRAD/.env` configurado (copiado de `.env.example`)
- [ ] Frontend rodando em http://localhost:3000
- [ ] Login e criação de experimento funcionando
