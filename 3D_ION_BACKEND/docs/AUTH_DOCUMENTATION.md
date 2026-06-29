# Authentication System Documentation

## Overview

O sistema de autenticação foi atualizado para replicar o método que funcionava corretamente no Streamlit, usando uma tabela dedicada `researchers` com hash de senhas bcrypt, em vez de depender apenas da autenticação nativa do Supabase.

## Architecture

### Authentication Method
- **Tabela**: `researchers` (customizada)
- **Hash de Senha**: bcrypt (seguro e robusto)
- **Busca**: Email OU Instagram
- **Normalização**: strip() e lower() para consistência

### Endpoints

#### 1. POST `/api/v1/auth/register`
Registra um novo pesquisador

**Request Body:**
```json
{
  "name": "João Silva",
  "institution": "IFSC",
  "email": "joao@example.com",
  "phone_number": "11999999999",
  "password": "SecurePassword123!",
  "instagram": "joao_silva"  // opcional
}
```

**Response (201 Created):**
```json
{
  "id": "uuid...",
  "name": "João Silva",
  "email": "joao@example.com",
  "message": "User registered successfully. You can now login."
}
```

**Validações:**
- Email válido (EmailStr)
- Telefone deve conter apenas dígitos
- Email não pode estar duplicado
- Instagram não pode estar duplicado
- Senha mínimo 8 caracteres

---

#### 2. POST `/api/v1/auth/login`
Autentica um pesquisador com email ou Instagram

**Request Body:**
```json
{
  "email_or_instagram": "joao@example.com",  // ou "joao_silva"
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "id": "uuid...",
  "name": "João Silva",
  "email": "joao@example.com",
  "user_type": "pesquisador",
  "message": "Welcome, João Silva!"
}
```

**Erros:**
- `401 Unauthorized`: Email/Instagram não encontrado ou senha incorreta
- `400 Bad Request`: Dados inválidos

---

#### 3. POST `/api/v1/auth/change-password`
Muda a senha do usuário (requer autenticação)

**Request Body:**
```json
{
  "user_id": "uuid...",
  "old_password": "CurrentPassword123!",
  "new_password": "NewPassword456!"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

---

## Database Schema

A tabela `researchers` contém:

```sql
CREATE TABLE researchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  institution VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(20) NOT NULL,
  instagram VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,  -- bcrypt hash
  user_type VARCHAR(20) DEFAULT 'pesquisador',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

---

## Key Features Implemented

### 1. **Bcrypt Password Hashing**
```python
def hash_password(password: str) -> str:
    bytes_password = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hash_password_bytes = bcrypt.hashpw(bytes_password, salt)
    return hash_password_bytes.decode('utf-8')
```

### 2. **Password Verification**
```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.strip().encode('utf-8'),
        hashed_password.strip().encode('utf-8')
    )
```

### 3. **Data Normalization**
- Sempre `strip()` para remover espaços extras
- Email sempre `lower()` para consistência
- Instagram sempre `lower()`

### 4. **Dual Login Support**
- Login com email: `email_or_instagram: "joao@example.com"`
- Login com Instagram: `email_or_instagram: "joao_silva"`

### 5. **Duplicate Prevention**
- Email é UNIQUE na tabela
- Instagram também é verificado
- Retorna erro `409 Conflict` para duplicatas

---

## Comparação: Streamlit vs FastAPI

| Aspecto | Streamlit (Original) | FastAPI (Novo) |
|---------|-------------------|----------------|
| **Autenticação** | Tabela `researchers` + bcrypt | Tabela `researchers` + bcrypt |
| **Hash** | bcrypt ✓ | bcrypt ✓ |
| **Busca** | Email OU Instagram | Email OU Instagram |
| **Normalização** | strip().lower() | strip().lower() |
| **Resposta** | Session state | JSON response |
| **Validação** | Básica | EmailStr + validação completa |

---

## Testing

Execute os testes de autenticação:

```bash
cd 3D_ION_BACKEND
python tests/test_auth_endpoints.py
```

**Testes Inclusos:**
1. ✓ Health Check
2. ✓ User Registration
3. ✓ Duplicate Email Prevention
4. ✓ Login with Email
5. ✓ Login with Instagram
6. ✓ Invalid Password Rejection
7. ✓ Nonexistent User Rejection

---

## Usage Examples

### Frontend (Next.js) Integration

```typescript
// Register
const register = async (userData) => {
  const response = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return response.json();
}

// Login
const login = async (emailOrInstagram, password) => {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email_or_instagram: emailOrInstagram,
      password: password
    })
  });
  return response.json();
}
```

---

## Security Considerations

1. **Bcrypt**: Hashing seguro com salt aleatório
2. **Email Validation**: Usando Pydantic EmailStr
3. **Password Length**: Mínimo 8 caracteres
4. **Data Normalization**: Previne inconsistências
5. **Duplicate Prevention**: Email e Instagram únicos
6. **Error Messages**: Genéricos para não revelar informações

---

## Migration Notes

Se você tinha usuários cadastrados com o Streamlit:
1. Os dados já estão na tabela `researchers`
2. Não é necessário migração
3. Os hashes bcrypt são compatíveis
4. O novo endpoint funciona com dados existentes

---

## Troubleshooting

### "Email already registered" (409)
- Tente um email diferente
- Verifique se o email já existe na base

### "Invalid email/Instagram or password" (401)
- Verifique se o usuário está registrado
- Verifique se a senha está correta
- Tente fazer login com email ao invés de Instagram

### "value is not a valid email address"
- Use domínio real: `@example.com`, `@gmail.com`
- Evite domínios especiais como `.local`

---

## Future Enhancements

1. Email verification
2. Password reset functionality
3. Two-factor authentication
4. Refresh tokens
5. Role-based access control (RBAC)
6. Audit logging
