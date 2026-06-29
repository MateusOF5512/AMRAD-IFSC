#!/bin/bash
# Script para substituir fetch por fetchWithAgent em todos os arquivos TypeScript/React

WORKSPACE_DIR="."

echo "🔄 Substituindo fetch por fetchWithAgent em toda a aplicação Next.js..."

# Lista de arquivos a atualizar
files=(
  "app/settings/page.tsx"
  "app/login/page.tsx"
  "app/page.tsx"
  "app/meus-experimentos/page.tsx"
  "app/experiments/edit/[id]/page.tsx"
  "app/register/page.tsx"
  "src/components/experiments/ExperimentDetailsModal.tsx"
  "src/components/experiments/ExperimentReportModal.tsx"
  "src/components/experiments/ExperimentWizard.tsx"
  "src/components/experiments/comparison/SimplifiedExperimentComparison.tsx"
  "src/components/experiments/comparison/ExperimentComparison.tsx"
  "src/components/experiments/steps/InfillEditForm.tsx"
  "src/components/experiments/steps/PatternSelect.tsx"
  "src/lib/hooks/useExperimentEdit.ts"
)

# Função para adicionar import se não existe
add_import_if_missing() {
  local file=$1
  if [ -f "$file" ]; then
    if ! grep -q "from '@/lib/api-client'" "$file"; then
      echo "  ✅ Adicionando import em $file"
      # Adiciona o import após o primeiro import existente
      sed -i "/^import.*from/a import { fetchWithAgent } from '@/lib/api-client'" "$file"
    fi
  fi
}

# Função para substituir fetch por fetchWithAgent
replace_fetch() {
  local file=$1
  if [ -f "$file" ]; then
    echo "  🔄 Substituindo fetch em $file"
    sed -i 's/const response = await fetch(/const response = await fetchWithAgent(/g' "$file"
    sed -i 's/= await fetch(/= await fetchWithAgent(/g' "$file"
  fi
}

echo ""
echo "Processando arquivos..."
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo ""
    echo "Arquivo: $file"
    add_import_if_missing "$file"
    replace_fetch "$file"
  else
    echo "⚠️  Arquivo não encontrado: $file"
  fi
done

echo ""
echo "✅ Processo concluído!"
echo ""
echo "📝 Próximos passos:"
echo "1. Verifique os arquivos atualizados manualmente"
echo "2. Execute npm run dev para testar"
echo "3. Verifique se há erros de compilação"
echo ""
