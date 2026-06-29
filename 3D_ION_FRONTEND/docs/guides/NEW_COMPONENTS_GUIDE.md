# 🎨 Guia de Uso - Novos Componentes da Refatoração

## Visão Geral

A refatoração implementou 5 novos componentes reutilizáveis para melhorar a experiência de formulários. Cada componente foi design para ser facilmente integrado em outros fluxos similares.

---

## 1️⃣ `FormFieldLabel`

### Propósito
Rótulo padronizado para campos de formulário com indicação visual de obrigatoriedade.

### Props
```typescript
interface FormFieldLabelProps {
  label: string
  required?: boolean
  optional?: boolean
  hint?: string
}
```

### Uso Básico
```tsx
import FormFieldLabel from '@/components/experiments/FormFieldLabel'

<div>
  <FormFieldLabel 
    label="Email" 
    required 
    hint="Seu email principal"
  />
  <input type="email" />
</div>
```

### Características
- ✅ Marcação automática de campo obrigatório com *
- ✅ Label "(opcional)" para campos não obrigatórios
- ✅ Suporte a dicas (hints)
- ✅ Totalmente acessível

---

## 2️⃣ `SectionCard`

### Propósito
Container principal para cada seção do formulário com validação visual integrada.

### Props
```typescript
interface SectionCardProps {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in-progress' | 'completed' | 'error'
  requiredFields?: string[]
  filledFields?: string[]
  children: ReactNode
  onComplete?: () => void
  onEdit?: () => void
  isExpanded?: boolean
  onToggleExpand?: (expanded: boolean) => void
  submitButtonLabel?: string
  showValidationErrors?: boolean
}
```

### Uso Básico
```tsx
<SectionCard
  id="material-section"
  title="Informações de Material"
  description="Dados do material usado"
  status="in-progress"
  requiredFields={['Marca', 'Modelo', 'Cor']}
  filledFields={['Marca', 'Modelo']}
  isExpanded={true}
  onToggleExpand={(exp) => setExpanded(exp)}
  onComplete={() => handleSectionComplete()}
  showValidationErrors={validationAttempts.has('material')}
>
  {/* Formulário aqui */}
</SectionCard>
```

### Características
- ✅ Estados visuais distintos (pending, in-progress, completed, error)
- ✅ Contador de campos preenchidos
- ✅ Validação de campos obrigatórios
- ✅ Expansão/colapso
- ✅ Botão de edição para seções completadas
- ✅ Exibição de erros de validação

### Estados

| Status | Cor | Uso |
|--------|-----|-----|
| pending | Gray | Seção não iniciada |
| in-progress | Blue | Seção sendo editada |
| completed | Green | Seção finalizada |
| error | Red | Erro de validação |

---

## 3️⃣ `SectionSummaryCard`

### Propósito
Exibição compacta de resumo após seção completada.

### Props
```typescript
interface SectionSummaryCardProps {
  sectionTitle: string
  sectionIcon?: string
  items: { label: string; value: string | number | ReactNode; optional?: boolean }[]
  isComplete: boolean
  onEdit?: () => void
  hasWarning?: boolean
  warningMessage?: string
}
```

### Uso Básico
```tsx
<SectionSummaryCard
  sectionTitle="Material & Máquina"
  sectionIcon="⚙️"
  items={[
    { label: 'Material', value: 'Ultimaker PLA 700' },
    { label: 'Máquina', value: 'Ultimaker S5' },
    { label: 'Tecnologia', value: 'FFF' }
  ]}
  isComplete={true}
  onEdit={() => handleEdit()}
/>
```

### Características
- ✅ Layout tipo grid responsivo
- ✅ Indicador de conclusão
- ✅ Suporte a avisos (warnings)
- ✅ Botão de edição
- ✅ Ícones para identificação rápida

---

## 4️⃣ `ProgressIndicator`

### Propósito
Barra lateral mostrando progresso de todas as seções.

### Props
```typescript
interface ProgressIndicatorProps {
  steps: {
    id: string
    label: string
    status: 'pending' | 'in-progress' | 'completed' | 'error'
    optional?: boolean
  }[]
  currentStep?: string | null
}
```

### Uso Básico
```tsx
<ProgressIndicator
  steps={[
    { id: 'material', label: 'Material', status: 'completed' },
    { id: 'sample', label: 'Amostra', status: 'in-progress' },
    { id: 'infill', label: 'Infill', status: 'pending', optional: false }
  ]}
  currentStep="sample"
/>
```

### Características
- ✅ Indicadores visuais de status
- ✅ Destaque da seção ativa
- ✅ Marcação de seções opcionais
- ✅ Ícones animados para seção em progresso

---

## 5️⃣ `FinalReviewSection`

### Propósito
Tela de revisão final consolidada antes de confirmar.

### Props
```typescript
interface FinalReviewSectionProps {
  sections: {
    id: string
    title: string
    icon: string
    status: 'complete' | 'partial' | 'empty'
    items: { label: string; value: string | number | ReactNode }[]
    onEdit?: () => void
  }[]
  allComplete: boolean
  onConfirm: () => void
  isLoading?: boolean
  canFinalize?: boolean
}
```

### Uso Básico
```tsx
<FinalReviewSection
  sections={reviewSections}
  allComplete={isComplete}
  onConfirm={() => handleFinalize()}
  isLoading={isLoading}
  canFinalize={canFinalize}
/>
```

### Características
- ✅ Estatísticas de preenchimento
- ✅ Verificação de campos obrigatórios
- ✅ Edição direta de seções
- ✅ Informações organizadas
- ✅ Confirmação com feedback

---

## 📝 Padrão de Uso - Integração Completa

```tsx
import { useState, useMemo } from 'react'
import SectionCard from '@/components/experiments/SectionCard'
import SectionSummaryCard from '@/components/experiments/SectionSummaryCard'
import ProgressIndicator from '@/components/experiments/ProgressIndicator'
import FormFieldLabel from '@/components/experiments/FormFieldLabel'

export default function MyForm() {
  const [data, setData] = useState({ name: '', email: '' })
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<string | null>('section1')
  const [validation, setValidation] = useState<Set<string>>(new Set())

  const isValid = data.name && data.email
  
  const progressSteps = useMemo(() => [
    { id: 'section1', label: 'Seção 1', status: 
      completed.has('section1') ? 'completed' : 
      editing === 'section1' ? 'in-progress' : 'pending'
    }
  ], [completed, editing])

  const handleComplete = () => {
    if (!isValid) {
      setValidation(prev => new Set(prev).add('section1'))
      return
    }
    setCompleted(prev => new Set(prev).add('section1'))
    setEditing(null)
  }

  return (
    <div className="grid grid-cols-4 gap-8">
      {/* Sidebar */}
      <div className="bg-white rounded p-6">
        <ProgressIndicator 
          steps={progressSteps} 
          currentStep={editing}
        />
      </div>

      {/* Main */}
      <div className="col-span-3 space-y-6">
        {editing === 'section1' ? (
          <SectionCard
            id="section1"
            title="Informações"
            status={editing === 'section1' ? 'in-progress' : 'completed'}
            requiredFields={['Nome', 'Email']}
            filledFields={[
              ...(data.name ? ['Nome'] : []),
              ...(data.email ? ['Email'] : [])
            ]}
            isExpanded={true}
            onComplete={handleComplete}
            showValidationErrors={validation.has('section1')}
          >
            <div className="space-y-4">
              <div>
                <FormFieldLabel label="Nome" required />
                <input
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <FormFieldLabel label="Email" required />
                <input
                  value={data.email}
                  onChange={(e) => setData({ ...data, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
          </SectionCard>
        ) : (
          completed.has('section1') && (
            <SectionSummaryCard
              sectionTitle="Informações"
              sectionIcon="📋"
              items={[
                { label: 'Nome', value: data.name },
                { label: 'Email', value: data.email }
              ]}
              isComplete={true}
              onEdit={() => setEditing('section1')}
            />
          )
        )}
      </div>
    </div>
  )
}
```

---

## 🎨 Padrões de Cores

| Classe | Uso |
|--------|-----|
| `bg-green-50` / `border-green-200` | Seção completada |
| `bg-blue-50` / `border-blue-200` | Seção em progresso |
| `bg-gray-50` / `border-gray-200` | Seção pendente |
| `bg-red-50` / `border-red-200` | Erro de validação |
| `text-red-500` | Campo obrigatório |
| `text-green-600` | Sucesso/Validação |

---

## 📱 Responsividade

Todos os componentes são responsivos usando Tailwind:

```tsx
// Grid layout que adapta
<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
  {/* Mobile: 1 coluna, Desktop: 4 colunas */}
</div>

// Inputs responsivos
<input className="w-full px-3 py-2" />

// Grids internos
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  {/* Mobile: 1 col, Tablet+: 2 cols */}
</div>
```

---

## 🔄 Ciclo de Vida de uma Seção

```
1. PENDING
   ↓
2. CLICK EXPAND / EDIT
   ↓
3. IN-PROGRESS (exibe SectionCard)
   ↓
4. PREENCHER DADOS
   ↓
5. VALIDAR
   ↓
6. COMPLETAR
   ↓
7. COMPLETED (exibe SectionSummaryCard)
   ↓
8. OPCIONALMENTE: CLICK EDIT → volta para IN-PROGRESS
```

---

## 🚨 Boas Práticas

✅ **DO**
- Use `useMemo` para calcular `filledFields` dinamicamente
- Sempre validar `requiredFields` antes de permitir conclusão
- Fornecer `hint` em `FormFieldLabel` para campos complexos
- Usar ícones consistentes em `SectionSummaryCard`

❌ **DON'T**
- Não passe children diretamente para `SectionCard` sem necessidade
- Não negligencie validação backend
- Não misture responsabilidades (forms + navigation)
- Não ignore `showValidationErrors` - sempre exiba quando houver erros

---

## 📚 Exemplos Completos

Veja no código:
- `src/components/experiments/ExperimentWizard.tsx` - Uso completo de todos os componentes
- `src/components/experiments/steps/MaterialMachineForm.tsx` - Form com validação
- `src/components/experiments/steps/SampleForm.tsx` - Form with progress bar

---

## 🆘 Troubleshooting

### "Campo obrigatório não aparece como vermelho"
→ Certifique-se que `required={true}` está em `FormFieldLabel`

### "Validação não aparece"
→ Passe `showValidationErrors={true}` para `SectionCard`

### "Progresso não atualiza"
→ Use `useMemo` ou `useCallback` para evitar renderizações desnecessárias

### "Seção não edita"
→ Verifique se `onEdit` callback está atualizado

---

Created: 2026-02-18
Status: Production Ready ✅
