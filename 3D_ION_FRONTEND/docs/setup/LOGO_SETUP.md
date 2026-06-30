# Logo e ícone AMRAD

## Logo (header, login, registro)

| Arquivo | Uso |
|---------|-----|
| `public/logo_amrad.png` | Logo horizontal AMRAD |
| `src/components/layout/BrandLogo.tsx` | Componente reutilizável |

## Ícone / favicon (aba do navegador)

Gerados a partir do símbolo de radiação AMRAD (`scripts/brand/amrad-icon.ico`):

| Arquivo | Uso |
|---------|-----|
| `app/favicon.ico` | Favicon clássico (16/32/48px) |
| `app/icon.png` | Ícone PWA / metadados (512×512) |
| `app/apple-icon.png` | Apple Touch Icon (180×180) |
| `public/icone.png` | Ícone legado em `public/` |

O `app/layout.tsx` usa os arquivos em `app/` (convenção do Next.js App Router) — não é necessário declarar `metadata.icons` manualmente.

## Regenerar ícones

Se trocar a arte, substitua `logo_amrad.png` na raiz do frontend e rode:

```bash
python scripts/generate-brand-assets.py
```
