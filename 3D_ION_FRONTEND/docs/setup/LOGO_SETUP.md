# Setup da Logo ION3D

## ⚠️ Ação Necessária

A logo ION3D foi configurada para ser exibida no header do sistema, mas o arquivo ainda precisa ser adicionado manualmente.

## 📍 Local do Arquivo

**Caminho:** `/public/logo_ion3d.png`

Salve a imagem da logo com o nome `logo_ion3d.png` neste diretório.

## 📋 Especificações Recomendadas

- **Formato:** PNG com transparência
- **Dimensões:** Aproximadamente 200x50px (proporção 4:1)
- **Transparência:** Recomendado para melhor integração visual
- **Cores:** Verde e Amarelo (conforme a identidade visual atual)

## ✅ Verificação

Após salvar o arquivo, a logo aparecerá automaticamente:
1. No header do sistema
2. Todas as páginas que usam o Header

## 🔗 Referência no Código

O arquivo foi configurado em: `src/components/layout/Header.tsx`

```tsx
<img src="/logo_ion3d.png" alt="ION3D Logo" className="h-8 w-auto" />
```

O arquivo será servido via Next.js public directory sem necessidade de imports adicionais.
