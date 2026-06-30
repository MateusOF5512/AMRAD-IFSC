# AMRAD - Backend API

FastAPI backend for AMRAD scientific experiment management platform.

## Architecture

```
Backend (FastAPI)
  ↓ (JWT Authentication)
Supabase (PostgreSQL + Auth)
```

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (backend only)
- `SUPABASE_ANON_KEY`: Anonymous key
- `JWT_SECRET`: Secret for JWT token validation

### 3. Run Development Server

```bash
# Using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using Python
python -m app.main
```

API will be available at:
- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Authentication
All endpoints (except health check) require JWT authentication via Supabase.

**Header required:**
```
Authorization: Bearer <supabase_jwt_token>
```

### Endpoints

#### Materials
- `POST /api/v1/materials` - Create material
- `GET /api/v1/materials` - List materials
- `GET /api/v1/materials/{id}` - Get material
- `PUT /api/v1/materials/{id}` - Update material
- `DELETE /api/v1/materials/{id}` - Delete material

#### Machines
- `POST /api/v1/machines` - Create machine
- `GET /api/v1/machines` - List machines
- `GET /api/v1/machines/{id}` - Get machine
- `DELETE /api/v1/machines/{id}` - Delete machine

#### Samples
- `POST /api/v1/samples` - Create sample
- `GET /api/v1/samples` - List samples
- `GET /api/v1/samples/{id}` - Get sample
- `DELETE /api/v1/samples/{id}` - Delete sample

#### Experiments
- `POST /api/v1/experiments/complete` - Create complete experiment (wizard)
- `GET /api/v1/experiments/my-experiments` - Get all user experiments

## Project Structure

```
app/
├── core/
│   ├── config.py          # Settings and configuration
│   └── security.py        # JWT validation and auth
├── database/
│   └── supabase.py        # Supabase client
├── routers/
│   ├── materials.py       # Material endpoints
│   ├── machines.py        # Machine endpoints
│   ├── samples.py         # Sample endpoints
│   └── experiments.py     # Experiment wizard endpoint
├── schemas/
│   ├── material.py        # Material Pydantic models
│   ├── machine.py         # Machine Pydantic models
│   ├── sample.py          # Sample Pydantic models
│   ├── infill.py          # Infill measurement models
│   ├── mechanical.py      # Mechanical properties models
│   ├── attenuation.py     # Linear attenuation models
│   ├── beam_quality.py    # Beam quality models
│   └── experiment.py      # Complete experiment wizard
└── main.py                # FastAPI app initialization
```

## Security

### Authentication Flow

1. Frontend authenticates user with Supabase Auth
2. Supabase returns JWT token
3. Frontend sends token in `Authorization` header
4. Backend validates token with Supabase
5. Backend extracts user_id from token
6. All database operations are scoped to authenticated user

### Service Role Key

⚠️ **CRITICAL**: The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security (RLS).

- **NEVER** expose this key to the frontend
- **ONLY** use in backend services
- Store securely in environment variables

## Validation Rules

### Materials
- `is_composite=true` requires `composite_details`
- All text fields cannot be empty/whitespace

### Samples
- Dimensions must be > 0
- `regression_r_squared` must be 0-1

### Measurements
- Partial data allowed
- Empty strings rejected (use `null` instead)

## Deployment

### Railway / Render

1. Connect your repository
2. Set environment variables
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Testing

Test endpoints using Swagger UI at `/docs` or with curl:

```bash
# Get materials (requires auth)
curl -X GET http://localhost:8000/api/v1/materials \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT"

# Create experiment
curl -X POST http://localhost:8000/api/v1/experiments/complete \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d @experiment.json
```

## License

MIT
