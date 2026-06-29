# Backend API - Guia de Implementação

Endpoints necessários para o módulo de Gerência de Usuários.

---

## 📋 Resumo

| Método | Endpoint | Autenticação | Descrição |
|--------|----------|--------------|-----------|
| GET | `/admin/users` | JWT + ADMIN | Listar usuários por status |
| PATCH | `/admin/users/status` | JWT + ADMIN | Atualizar status de usuário |

---

## 1️⃣ GET /admin/users

### Descrição
Retorna lista de usuários filtrada por status, com contagem de experimentos.

### Autenticação
- ✅ JWT Token obrigatório
- ✅ Apenas usuários com `user_type = 'admin'` podem acessar

### Query Parameters

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|-------------|--------|-----------|
| status | string | ❌ Sim | - | `regular` \| `irregular` \| `desativado` |
| page | integer | ❌ Não | 1 | Número da página |
| per_page | integer | ❌ Não | 10 | Registros por página |
| search | string | ❌ Não | null | Buscar por e-mail ou nome |

### Exemplo de Request

```bash
curl -X GET "http://localhost:8000/api/v1/admin/users?status=regular&page=1&per_page=10" \
  -H "Authorization: Bearer eyJ0eXAi..." \
  -H "Content-Type: application/json"
```

### Response 200 OK

```json
{
  "users": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "regular",
      "name": "João Silva",
      "email": "joao@universidade.edu.br",
      "institution": "Universidade de São Paulo",
      "country": "Brasil",
      "language": "pt",
      "created_at": "2026-01-15T10:30:00Z",
      "experimentos_criados_total": 12
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "status": "regular",
      "name": "Maria Santos",
      "email": "maria@universidade.edu.br",
      "institution": "UFRJ",
      "country": "Brasil",
      "language": "pt",
      "created_at": "2026-01-10T14:20:00Z",
      "experimentos_criados_total": 8
    }
  ],
  "total": 45,
  "page": 1,
  "per_page": 10,
  "total_pages": 5
}
```

### Erros

#### 401 Unauthorized
```json
{
  "detail": "Não autenticado"
}
```

#### 403 Forbidden
```json
{
  "detail": "Permissão negada. Apenas admins podem acessar esta rota."
}
```

#### 400 Bad Request
```json
{
  "detail": "Status inválido. Use: 'regular', 'irregular' ou 'desativado'"
}
```

---

### SQL Recomendado

```sql
-- Query base com contagem
SELECT
  u.id,
  u.status,
  u.name,
  u.email,
  u.institution,
  u.country,
  u.language,
  u.created_at,
  COUNT(e.id) AS experimentos_criados_total
FROM researchers u
LEFT JOIN experiments e ON e.user_id = u.id
WHERE u.status = $1  -- 'regular', 'irregular', 'desativado'
  AND (u.email ILIKE $2 OR u.name ILIKE $2)  -- Busca opcional
GROUP BY u.id
ORDER BY u.created_at DESC
LIMIT $3 OFFSET $4;  -- Paginação

-- Query para total (sem paginação)
SELECT COUNT(*) as total
FROM researchers
WHERE status = $1
  AND (email ILIKE $2 OR name ILIKE $2);
```

---

## 2️⃣ PATCH /admin/users/status

### Descrição
Atualiza o status de um usuário e registra a alteração em logs de auditoria.

### Autenticação
- ✅ JWT Token obrigatório
- ✅ Apenas usuários com `user_type = 'admin'` podem acessar

### Request Body

```json
{
  "email": "usuario@universidade.edu.br",
  "new_status": "desativado"
}
```

### Validações Obrigatórias

```
1. JWT válido? → Else 401
2. user_type = 'admin'? → Else 403
3. email não vazio? → Else 400 "E-mail obrigatório"
4. email válido? → Else 400 "E-mail inválido"
5. new_status válido? → Else 400 "Status inválido"
6. Usuário existe? → Else 404 "Usuário não encontrado"
7. Status diferente do atual? → Else 409 "Nenhuma alteração"
```

### Exemplo de Request

```bash
curl -X PATCH "http://localhost:8000/api/v1/admin/users/status" \
  -H "Authorization: Bearer eyJ0eXAi..." \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@universidade.edu.br",
    "new_status": "desativado"
  }'
```

### Response 200 OK

```json
{
  "success": true,
  "message": "Status atualizado com sucesso",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "status": "desativado",
    "name": "Pedro Costa",
    "email": "pedro@universidade.edu.br",
    "institution": "UNICAMP",
    "country": "Brasil",
    "language": "pt",
    "created_at": "2025-12-20T09:15:00Z",
    "experimentos_criados_total": 5
  },
  "old_status": "regular",
  "new_status": "desativado"
}
```

### Erros

#### 400 Bad Request - E-mail inválido
```json
{
  "detail": "E-mail inválido"
}
```

#### 400 Bad Request - Status inválido
```json
{
  "detail": "Status inválido. Use: 'regular', 'irregular' ou 'desativado'"
}
```

#### 401 Unauthorized
```json
{
  "detail": "Não autenticado"
}
```

#### 403 Forbidden
```json
{
  "detail": "Permissão negada. Apenas admins podem acessar esta rota."
}
```

#### 404 Not Found
```json
{
  "detail": "Usuário não encontrado"
}
```

#### 409 Conflict - Status igual ao atual
```json
{
  "detail": "O usuário já possui o status 'regular'"
}
```

---

### SQL Recomendado

```sql
-- Iniciar transação
BEGIN TRANSACTION;

-- 1. Buscar usuário
SELECT id, status, email, name
FROM researchers
WHERE LOWER(email) = LOWER($1);

-- 2. Se encontrado, verificar status
-- ...

-- 3. Atualizar status
UPDATE researchers
SET status = $2
WHERE id = $3
RETURNING id, status, name, email, institution, country, language, created_at;

-- 4. Criar log de auditoria
INSERT INTO user_status_logs (id, admin_id, user_id, old_status, new_status, changed_at)
VALUES (
  gen_random_uuid(),
  $4,  -- current_user.id (admin)
  $3,  -- user_id
  $5,  -- old_status
  $2,  -- new_status
  NOW()
);

-- 5. Contagem de experimentos
SELECT COUNT(*) as experimentos_criados_total
FROM experiments
WHERE user_id = $3;

COMMIT;
```

---

## 🔧 Implementação em FastAPI

### Exemplo (Python)

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from typing import Optional

router = APIRouter(prefix="/admin", tags=["admin"])

# Modelos
class UserResponse(BaseModel):
    id: str
    status: str
    name: str
    email: Optional[str]
    institution: Optional[str]
    country: Optional[str]
    language: Optional[str]
    created_at: str
    experimentos_criados_total: int

class UsersListResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class UpdateStatusRequest(BaseModel):
    email: str
    new_status: str  # 'regular', 'irregular', 'desativado'

class UpdateStatusResponse(BaseModel):
    success: bool
    message: str
    user: UserResponse
    old_status: str
    new_status: str

# Middleware de autenticação
def require_admin(current_user = Depends(get_current_user)):
    if current_user.user_type != 'admin':
        raise HTTPException(status_code=403, detail="Permissão negada")
    return current_user

# GET /admin/users
@router.get("/users", response_model=UsersListResponse)
async def get_users_by_status(
    status: str = Query(..., regex="^(regular|irregular|desativado)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Retorna usuários segmentados por status com contagem de experimentos.
    """
    
    # Query base
    query = select(Researcher).where(Researcher.status == status)
    
    # Busca opcional
    if search:
        search_like = f"%{search}%"
        query = query.where(
            or_(
                Researcher.email.ilike(search_like),
                Researcher.name.ilike(search_like)
            )
        )
    
    # Total
    total = db.query(func.count(Researcher.id)).filter(Researcher.status == status).scalar()
    
    # Paginação
    offset = (page - 1) * per_page
    users = db.execute(query.offset(offset).limit(per_page)).scalars().all()
    
    # Mapear para response com contagem
    users_response = []
    for user in users:
        exp_count = db.query(func.count(Experiment.id)).filter(
            Experiment.user_id == user.id
        ).scalar()
        users_response.append(UserResponse(
            **user.__dict__,
            experimentos_criados_total=exp_count
        ))
    
    return UsersListResponse(
        users=users_response,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=(total + per_page - 1) // per_page
    )

# PATCH /admin/users/status
@router.patch("/users/status", response_model=UpdateStatusResponse)
async def update_user_status(
    request: UpdateStatusRequest,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Atualiza o status de um usuário e registra em logs de auditoria.
    """
    
    # Validar status
    valid_statuses = ['regular', 'irregular', 'desativado']
    if request.new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail="Status inválido. Use: 'regular', 'irregular' ou 'desativado'"
        )
    
    # Validar e-mail
    if not request.email or '@' not in request.email:
        raise HTTPException(status_code=400, detail="E-mail inválido")
    
    # Buscar usuário
    user = db.query(Researcher).filter(
        func.lower(Researcher.email) == func.lower(request.email)
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar se status é igual
    if user.status == request.new_status:
        raise HTTPException(
            status_code=409,
            detail=f"O usuário já possui o status '{user.status}'"
        )
    
    # Salvar status anterior
    old_status = user.status
    
    # Iniciar transação
    try:
        # Atualizar status
        user.status = request.new_status
        db.add(user)
        
        # Criar log
        log_entry = UserStatusLog(
            id=str(uuid.uuid4()),
            admin_id=current_user.id,
            user_id=user.id,
            old_status=old_status,
            new_status=request.new_status,
            changed_at=datetime.utcnow()
        )
        db.add(log_entry)
        
        # Commit
        db.commit()
        
        # Contar experimentos
        exp_count = db.query(func.count(Experiment.id)).filter(
            Experiment.user_id == user.id
        ).scalar()
        
        return UpdateStatusResponse(
            success=True,
            message="Status atualizado com sucesso",
            user=UserResponse(
                **user.__dict__,
                experimentos_criados_total=exp_count
            ),
            old_status=old_status,
            new_status=request.new_status
        )
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao atualizar status")
```

---

## 🗂️ Tabela de Auditoria

```sql
CREATE TABLE user_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  user_id UUID NOT NULL,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (admin_id) REFERENCES researchers(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES researchers(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX idx_user_status_logs_user_id ON user_status_logs(user_id);
CREATE INDEX idx_user_status_logs_admin_id ON user_status_logs(admin_id);
CREATE INDEX idx_user_status_logs_changed_at ON user_status_logs(changed_at DESC);
CREATE INDEX idx_user_status_logs_user_id_changed_at ON user_status_logs(user_id, changed_at DESC);
```

---

## ✅ Checklist de Implementação

Backend:

- [ ] Criar endpoints `/admin/users` e `/admin/users/status`
- [ ] Implementar autenticação JWT em ambos
- [ ] Verificar `user_type = 'admin'` em middleware
- [ ] Validar entrada (e-mail, status)
- [ ] Contar experimentos via LEFT JOIN
- [ ] Criar tabela `user_status_logs`
- [ ] Testar com Postman/Insomnia
- [ ] Documentar em OpenAPI/Swagger

---

## 🧪 Testar com cURL

### GET - Listar regulares

```bash
curl -X GET "http://localhost:8000/api/v1/admin/users?status=regular&page=1&per_page=5" \
  -H "Authorization: Bearer TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -v
```

### PATCH - Atualizar status

```bash
curl -X PATCH "http://localhost:8000/api/v1/admin/users/status" \
  -H "Authorization: Bearer TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "new_status": "desativado"
  }' \
  -v
```

---

## 📚 Referências

- Frontend: `docs/USER_MANAGEMENT_IMPLEMENTATION.md`
- Tipos: `src/lib/types/admin.ts`
- API Client: `src/lib/api.ts` (adminApi)

---

Está tudo pronto para implementação no backend! 🚀
