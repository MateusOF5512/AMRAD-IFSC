# DEBUG — Contagem de Experimentos

## Status

Use variáveis de ambiente do `.env` na raiz do projeto. **Nunca** commite tokens, UUIDs ou emails reais neste arquivo.

## Como debugar

1. Faça login normalmente pela UI (`/login`).
2. Abra DevTools (F12) → Application → Local Storage.
3. Confirme que existe a chave `user` com `access_token` e `user_type`.
4. Para rotas admin, `user_type` deve ser `admin`.
5. Verifique a resposta da API em Network → filtro `admin`.

## Teste rápido da API

```cmd
cd C:\Users\mateu\2_PESSOAL\3D_ION\3D_ION_BACKEND
venv\Scripts\activate.bat
python tests\integration\test_http_request.py
```

Configure `TEST_EMAIL`, `TEST_PASSWORD` e opcionalmente `TEST_ADMIN_USER_ID` no `.env` da raiz.
