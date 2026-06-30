#!/bin/bash

# Script de Verificação de Configuração - AMRAD Frontend
# Ajuda a diagnosticar problemas de autenticação e conexão

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   Verificação de Configuração - AMRAD Frontend              ║"
echo "║   Diagnóstico de Autenticação e Conexão                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 1. Verificar arquivo .env na raiz do monorepo
ROOT_ENV="../.env"
echo "📋 1. Verificando arquivo .env na raiz do monorepo..."
if [ -f "$ROOT_ENV" ]; then
    echo "✅ Arquivo .env encontrado em $ROOT_ENV"
    echo ""
    echo "Verificando variáveis obrigatórias:"
    
    if grep -q "NEXT_PUBLIC_SUPABASE_URL=" "$ROOT_ENV" || grep -q "SUPABASE_URL=" "$ROOT_ENV"; then
        SUPABASE_URL=$(grep -E "^(NEXT_PUBLIC_)?SUPABASE_URL=" "$ROOT_ENV" | head -1 | cut -d'=' -f2)
        echo "✅ SUPABASE_URL: $SUPABASE_URL"
    else
        echo "❌ SUPABASE_URL: NÃO ENCONTRADA"
    fi
    
    if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=" "$ROOT_ENV" || grep -q "SUPABASE_ANON_KEY=" "$ROOT_ENV"; then
        echo "✅ SUPABASE_ANON_KEY: Configurada"
    else
        echo "❌ SUPABASE_ANON_KEY: NÃO ENCONTRADA"
    fi
    
    if grep -q "NEXT_PUBLIC_API_URL=" "$ROOT_ENV"; then
        API_URL=$(grep "NEXT_PUBLIC_API_URL=" "$ROOT_ENV" | cut -d'=' -f2)
        echo "✅ NEXT_PUBLIC_API_URL: $API_URL"
    else
        echo "❌ NEXT_PUBLIC_API_URL: NÃO ENCONTRADA"
    fi
else
    echo "❌ Arquivo .env NÃO ENCONTRADO na raiz do monorepo"
    echo "   Copie .env.example para .env na raiz e preencha as variáveis"
fi

echo ""
echo "────────────────────────────────────────────────────────────────"
echo ""

# 2. Verificar backend FastAPI
echo "🚀 2. Verificando Backend FastAPI..."
API_URL=$(grep "NEXT_PUBLIC_API_URL=" "$ROOT_ENV" 2>/dev/null | cut -d'=' -f2 || echo "http://localhost:8000")

if command -v curl &> /dev/null; then
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health" 2>/dev/null)
    if [ "$RESPONSE" == "200" ]; then
        echo "✅ Backend FastAPI respondendo em $API_URL"
    else
        echo "❌ Backend FastAPI não respondendo (Status: $RESPONSE)"
        echo "   Verifique se o servidor está rodando:"
        echo "   $ cd AMRAD_BACKEND && python -m uvicorn app.main:app --reload"
    fi
else
    echo "⚠️  'curl' não instalado. Teste manualmente:"
    echo "   curl -X GET '$API_URL/api/v1/health'"
fi

echo ""
echo "────────────────────────────────────────────────────────────────"
echo ""

# 3. Verificar dependências npm
echo "📦 3. Verificando Dependências npm..."
if [ -f "package.json" ]; then
    echo "✅ package.json encontrado"
    
    if grep -q "@tanstack/react-query" package.json; then
        echo "✅ @tanstack/react-query instalado"
    else
        echo "⚠️  @tanstack/react-query pode não estar instalado"
    fi
    
    if grep -q "@supabase/supabase-js" package.json; then
        echo "✅ @supabase/supabase-js instalado"
    else
        echo "⚠️  @supabase/supabase-js pode não estar instalado"
    fi
    
    if [ -d "node_modules" ]; then
        echo "✅ node_modules diretório encontrado"
    else
        echo "⚠️  node_modules diretório NÃO ENCONTRADO"
        echo "   Execute: npm install"
    fi
else
    echo "❌ package.json não encontrado"
fi

echo ""
echo "────────────────────────────────────────────────────────────────"
echo ""

# 4. Verificar arquivos de componentes
echo "🔧 4. Verificando Componentes Críticos..."
COMPONENTS=(
    "src/lib/supabase.ts"
    "src/lib/api.ts"
    "src/lib/hooks/useExperimentWizard.ts"
    "src/lib/hooks/useAuth.ts"
    "src/components/experiments/ExperimentWizard.tsx"
)

for component in "${COMPONENTS[@]}"; do
    if [ -f "$component" ]; then
        echo "✅ $component"
    else
        echo "❌ $component NÃO ENCONTRADO"
    fi
done

echo ""
echo "────────────────────────────────────────────────────────────────"
echo ""

# 5. Recomendações
echo "💡 Recomendações:"
echo ""
echo "Se você está recebendo 'No active session':"
echo "1. Verifique se fez login em /login"
echo "2. Verifique se NEXT_PUBLIC_SUPABASE_* estão configuradas no .env da raiz"
echo "3. Verifique se NEXT_PUBLIC_API_URL está correto"
echo "4. Abra DevTools (F12) → Console para ver erros específicos"
echo "5. Verifique Network → Veja respostas das chamadas à API"
echo ""
echo "Para limpar tudo e recomeçar:"
echo "  npm run dev       # Reinicie o servidor"
echo ""
echo "Para testar login:"
echo "1. Abra http://localhost:3000"
echo "2. Clique em Login"
echo "3. Entre com suas credenciais Supabase"
echo "4. Você será redirecionado para /dashboard"
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   Verificação Completa! Se tudo está ✅, está pronto para       ║"
echo "║   usar o aplicativo. Caso tenha ❌, consulte as recomendações. ║"
echo "╚════════════════════════════════════════════════════════════════╝"
