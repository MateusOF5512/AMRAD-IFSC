# 🔄 Guia de Migração - Como Usar os Novos Componentes em Outros Formulários

## Visão Geral

Os novos componentes criados na refatoração são **reutilizáveis** e podem ser integrados em qualquer outro fluxo de formulário do projeto. Este guia explica como fazer essa migração.

---

## 📋 Checklist de Migração

- [ ] Importar componentes necessários
- [ ] Estruturar estado de seções
- [ ] Implementar validação
- [ ] Adaptar layout com grid
- [ ] Integrar ProgressIndicator
- [ ] Testar responsividade
- [ ] Build e validação TypeScript

---

## 🔧 Passo 1: Importações

```typescript
import FormFieldLabel from '@/components/experiments/FormFieldLabel'
import SectionCard from '@/components/experiments/SectionCard'
import SectionSummaryCard from '@/components/experiments/SectionSummaryCard'
import ProgressIndicator from '@/components/experiments/ProgressIndicator'
import FinalReviewSection from '@/components/experiments/FinalReviewSection'
```

---

## 📐 Passo 2: Estrutura de Estado

```typescript
import { useState, useMemo } from 'react'

type Section = 'section1' | 'section2' | 'section3'

export default function MyMultiStepForm() {
  // Dados do formulário
  const [formData, setFormData] = useState({
    field1: '',
    field2: '',
    field3: ''
  })

  // Controle de seções
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(
    new Set(['section1'])
  )
  const [completedSections, setCompletedSections] = useState<Set<Section>>(
    new Set()
  )
  const [editingSection, setEditingSection] = useState<Section | null>('section1')
  const [validationAttempts, setValidationAttempts] = useState<Set<Section>>(
    new Set()
  )
```

---

## ✅ Passo 3: Validação

```typescript
// Função para determinar se seção é válida
const isSection1Valid = useMemo(() => {
  return formData.field1 && formData.field2
}, [formData])

// Função para obter campos preenchidos
const getSection1FilledFields = useMemo(() => {
  return [
    ...(formData.field1 ? ['Campo 1'] : []),
    ...(formData.field2 ? ['Campo 2'] : [])
  ]
}, [formData])

// Função para determinar status da seção
const getSectionStatus = (section: Section) => {
  if (completedSections.has(section)) return 'completed' as const
  if (editingSection === section) return 'in-progress' as const
  if (validationAttempts.has(section)) return 'error' as const
  return 'pending' as const
}

// Função para obter progresso
const progressSteps = useMemo(() => [
  {
    id: 'section1',
    label: 'Seção 1',
    status: getSectionStatus('section1'),
  },
  {
    id: 'section2',
    label: 'Seção 2',
    status: getSectionStatus('section2'),
  },
  {
    id: 'section3',
    label: 'Seção 3',
    status: getSectionStatus('section3'),
  }
], [completedSections, editingSection, validationAttempts])
```

---

## 🎨 Passo 4: Handlers

```typescript
// Expandir/Colapsar
const toggleSection = (section: Section) => {
  setExpandedSections(prev => {
    const next = new Set(prev)
    if (next.has(section)) {
      next.delete(section)
    } else {
      next.add(section)
    }
    return next
  })
}

// Completar seção
const handleSectionComplete = (section: Section) => {
  // Validar
  if (section === 'section1' && !isSection1Valid) {
    setValidationAttempts(prev => new Set(prev).add(section))
    return
  }

  // Marcar como completo
  setCompletedSections(prev => new Set(prev).add(section))
  
  // Colapsar
  setExpandedSections(prev => {
    const next = new Set(prev)
    next.delete(section)
    return next
  })

  // Limpar validação
  setValidationAttempts(prev => {
    const next = new Set(prev)
    next.delete(section)
    return next
  })
}

// Editar seção completada
const handleSectionEdit = (section: Section) => {
  setEditingSection(section)
  
  // Remover da lista de completados
  setCompletedSections(prev => {
    const next = new Set(prev)
    next.delete(section)
    return next
  })

  // Expandir
  setExpandedSections(prev => new Set(prev).add(section))
}
```

---

## 🏗️ Passo 5: Layout JSX

```typescript
return (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
    <div className="mx-auto max-w-6xl px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">
          📝 Meu Formulário Multi-Passo
        </h1>
        <p className="mt-2 text-gray-600">
          Preencha as seções abaixo. Campos com <span className="font-semibold text-red-500">*</span> são obrigatórios.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* SIDEBAR - Progresso */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6 sticky top-8">
            <ProgressIndicator 
              steps={progressSteps} 
              currentStep={editingSection}
            />
          </div>

          {/* Status Rápido */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Seções Completas:</span>
                <span className="font-bold text-green-600">
                  {completedSections.size}/3
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN - Conteúdo */}
        <div className="lg:col-span-3 space-y-6">
          {/* SEÇÃO 1 */}
          {editingSection === 'section1' ? (
            <SectionCard
              id="section1"
              title="Informações Básicas"
              description="Preencha os dados iniciais"
              status={getSectionStatus('section1')}
              requiredFields={['Campo 1', 'Campo 2']}
              filledFields={getSection1FilledFields}
              isExpanded={expandedSections.has('section1')}
              onToggleExpand={() => toggleSection('section1')}
              onComplete={() => handleSectionComplete('section1')}
              onEdit={() => handleSectionEdit('section1')}
              showValidationErrors={validationAttempts.has('section1')}
            >
              <div className="space-y-4">
                <div>
                  <FormFieldLabel label="Campo 1" required />
                  <input
                    type="text"
                    value={formData.field1}
                    onChange={(e) => 
                      setFormData({ ...formData, field1: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                      formData.field1 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <FormFieldLabel label="Campo 2" required />
                  <input
                    type="text"
                    value={formData.field2}
                    onChange={(e) => 
                      setFormData({ ...formData, field2: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                      formData.field2 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <FormFieldLabel label="Campo 3" optional />
                  <input
                    type="text"
                    value={formData.field3}
                    onChange={(e) => 
                      setFormData({ ...formData, field3: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                      formData.field3 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>
            </SectionCard>
          ) : completedSections.has('section1') ? (
            <SectionSummaryCard
              sectionTitle="Informações Básicas"
              sectionIcon="📋"
              items={[
                { label: 'Campo 1', value: formData.field1 },
                { label: 'Campo 2', value: formData.field2 },
                { label: 'Campo 3', value: formData.field3, optional: true }
              ]}
              isComplete={true}
              onEdit={() => handleSectionEdit('section1')}
            />
          ) : null}

          {/* Seções adicionais... */}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">ℹ️ Informações</h3>
        <ul className="text-sm text-blue-900 space-y-1">
          <li>✓ Campos com * são obrigatórios</li>
          <li>✓ Você pode editar qualquer seção após completá-la</li>
          <li>✓ Progresso é salvo automaticamente</li>
        </ul>
      </div>
    </div>
  </div>
)
```

---

## 🎯 Passo 6: Padrão Completo Mínimo

```typescript
// pages/my-form.tsx
'use client'

import { useState, useMemo } from 'react'
import FormFieldLabel from '@/components/experiments/FormFieldLabel'
import SectionCard from '@/components/experiments/SectionCard'
import SectionSummaryCard from '@/components/experiments/SectionSummaryCard'
import ProgressIndicator from '@/components/experiments/ProgressIndicator'

type Section = 'info' | 'details'

export default function MyForm() {
  const [data, setData] = useState({ name: '', email: '' })
  const [completed, setCompleted] = useState<Set<Section>>(new Set())
  const [editing, setEditing] = useState<Section | null>('info')
  const [validation, setValidation] = useState<Set<Section>>(new Set())

  const isValid = useMemo(() => data.name && data.email, [data])

  const status = (section: Section) => {
    if (completed.has(section)) return 'completed' as const
    if (editing === section) return 'in-progress' as const
    return 'pending' as const
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 max-w-6xl mx-auto p-8">
      <div className="bg-white p-6 rounded sticky top-8">
        <ProgressIndicator steps={[
          { id: 'info', label: 'Info', status: status('info') },
          { id: 'details', label: 'Details', status: status('details') }
        ]} currentStep={editing} />
      </div>

      <div className="lg:col-span-3">
        {editing === 'info' ? (
          <SectionCard
            id="info"
            title="Informações"
            status={status('info')}
            requiredFields={['Nome', 'Email']}
            filledFields={[
              ...(data.name ? ['Nome'] : []),
              ...(data.email ? ['Email'] : [])
            ]}
            isExpanded={true}
            onComplete={() => {
              if (!isValid) {
                setValidation(p => new Set(p).add('info'))
                return
              }
              setCompleted(p => new Set(p).add('info'))
              setEditing(null)
            }}
            showValidationErrors={validation.has('info')}
          >
            <div className="space-y-4">
              <div>
                <FormFieldLabel label="Nome" required />
                <input
                  value={data.name}
                  onChange={(e) => setData({...data, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <FormFieldLabel label="Email" required />
                <input
                  value={data.email}
                  onChange={(e) => setData({...data, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
          </SectionCard>
        ) : completed.has('info') ? (
          <SectionSummaryCard
            sectionTitle="Informações"
            sectionIcon="🛈"
            items={[
              { label: 'Nome', value: data.name },
              { label: 'Email', value: data.email }
            ]}
            isComplete={true}
            onEdit={() => {
              setEditing('info')
              setCompleted(p => {const n = new Set(p); n.delete('info'); return n})
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
```

---

## 🚀 Otimizações Recomendadas

### 1. Extrair Constantes
```typescript
const SECTIONS = ['section1', 'section2', 'section3'] as const
const REQUIRED_FIELDS = {
  section1: ['Campo 1', 'Campo 2'],
  section2: ['Campo 3'],
  section3: []
}
```

### 2. Custom Hooks
```typescript
// hooks/useFormSections.ts
export const useFormSections = (initialSection) => {
  const [expanded, setExpanded] = useState<Set<Section>>(
    new Set([initialSection])
  )
  const [completed, setCompleted] = useState<Set<Section>>(new Set())
  const [editing, setEditing] = useState<Section | null>(initialSection)
  const [validation, setValidation] = useState<Set<Section>>(new Set())

  return { expanded, completed, editing, validation, setExpanded, ... }
}
```

### 3. Componente Wrapper
```typescript
// components/FormSection.tsx
export default function FormSection({
  section,
  title,
  icon,
  children,
  isValid,
  onComplete
}) {
  // Encapsula SectionCard + validação
}
```

---

## 🧪 Testes Recomendados

```typescript
// __tests__/MyForm.test.tsx
describe('MyForm', () => {
  it('should validate required fields', () => {
    // Teste de validação
  })

  it('should complete section when valid', () => {
    // Teste de conclusão
  })

  it('should allow editing completed section', () => {
    // Teste de edição
  })
})
```

---

## 📊 Checklist Final

- [ ] Componentes importados corretamente
- [ ] Estado estruturado adequadamente
- [ ] Validação funciona para todos os campos
- [ ] Handlers chamam funções corretas
- [ ] Layout responsivo testado (mobile/desktop)
- [ ] TypeScript sem erros
- [ ] Build bem-sucedido
- [ ] Testes passando

---

## 🔗 Referências

- [NEW_COMPONENTS_GUIDE.md](./NEW_COMPONENTS_GUIDE.md) - Documentação dos componentes
- [EXPERIMENT_FORM_OPTIMIZATION_SUMMARY.md](./EXPERIMENT_FORM_OPTIMIZATION_SUMMARY.md) - Resumo geral
- Exemplo completo: `src/components/experiments/ExperimentWizard.tsx`

---

Created: 2026-02-18
Last Updated: 2026-02-18
Status: Ready for Use ✅
