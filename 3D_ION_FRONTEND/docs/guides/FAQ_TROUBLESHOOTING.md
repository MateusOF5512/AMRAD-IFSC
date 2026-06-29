# ❓ FAQ & Troubleshooting - Novos Componentes de Formulário

## 🆘 Problemas Comuns

---

## ❌ Erro: "Cannot find module '@/components/experiments/FormFieldLabel'"

**Causa**: Componente ainda não foi criado ou caminho incorreto

**Solução**:
1. Verifique se o arquivo existe em `src/components/experiments/FormFieldLabel.tsx`
2. Verifique se o `@` alias está configurado corretamente em `tsconfig.json`
3. Verifique se está usando a capitalização correta

**Verificação**:
```bash
# Liste os componentes disponíveis
ls -la src/components/experiments/
```

Deve mostrar:
```
FormFieldLabel.tsx
SectionCard.tsx
SectionSummaryCard.tsx
ProgressIndicator.tsx
FinalReviewSection.tsx
```

---

## ❌ Erro: "Type 'Section | null' is not assignable to type 'string'"

**Causa**: O tipo do estado `editingSection` está errado

**Solução**:
```typescript
// ❌ ERRADO
const [editingSection, setEditingSection] = useState<'section1' | 'section2'>('section1')

// ✅ CORRETO
const [editingSection, setEditingSection] = useState<'section1' | 'section2' | null>('section1')
```

**Explicação**: `editingSection` pode ser `null` quando nenhuma seção está sendo editada.

---

## ❌ Erro: "Property 'status' does not exist on type 'Step'"

**Causa**: Interface `Step` do `ProgressIndicator` não foi importada

**Solução**:
```typescript
// Se precisar definir o tipo
import { ProgressIndicator } from '@/components/experiments/ProgressIndicator'

type Step = {
  id: string
  label: string
  status: 'pending' | 'in-progress' | 'completed' | 'error'
}

const steps: Step[] = [
  { id: 'step1', label: 'Passo 1', status: 'completed' }
]
```

---

## ❌ Erro: "Cannot read property 'has' of undefined"

**Causa**: `Set` foi inicializado como `undefined` ou não foi definido

**Solução**:
```typescript
// ❌ ERRADO
const [completed, setCompleted] = useState()

// ✅ CORRETO
const [completed, setCompleted] = useState<Set<Section>>(new Set())
```

---

## ❌ Erro: "Button disabled but no validation feedback"

**Causa**: Prop `showValidationErrors` não está sendo passada

**Solução**:
```typescript
<SectionCard
  // ... outras props
  showValidationErrors={validationAttempts.has('section1')}
  // ↑ Isso ativa a exibição de erros
>
```

---

## ❌ TypeScript: "No overload matches this call"

**Causa**: Tipo do prop não corresponde à interface

**Solução Passo 1**: Verifique a interface esperada
```typescript
// Abra src/components/experiments/ProgressIndicator.tsx
// e veja o formato de `steps`
```

**Solução Passo 2**: Crie o objeto correto
```typescript
const steps = useMemo(() => [
  { id: 'step1', label: 'Step 1', status: getSectionStatus('step1') }
], [/* dependências */])

<ProgressIndicator steps={steps} currentStep={editing} />
```

---

## ⚠️ Aviso: "Empty dependency array in useMemo"

**Causa**: Dependências estão faltando

**Solução**:
```typescript
// ❌ ERRADO
const steps = useMemo(() => [...], [])

// ✅ CORRETO
const steps = useMemo(() => [
  { id: 'section1', label: 'Seção 1', status: getSectionStatus('section1') }
], [completedSections, editingSection, validationAttempts])
//  ↑ Inclua tudo que é usado dentro
```

---

## 🟡 Build Falha de Repente

**Causa Comum**: Arquivo foi modificado mas não salvo

**Solução**:
1. Salve todos os arquivos: `Ctrl+Shift+P` → "Save All"
2. Limpe cache: `rm -rf .next && npm run build`
3. Verifique erros: `npm run build 2>&1`

**Se persistir**:
```bash
# Reconstrua do zero
rm -rf node_modules .next
npm install
npm run build
```

---

## 🟡 Seção não mostra dados ao editar

**Causa**: Não está passando os dados iniciais ao state

**Solução**:
```typescript
const handleEdit = (section: Section) => {
  // ✅ Restaura dados no form
  if (section === 'material') {
    setFormData(prev => ({
      ...prev,
      material: materialData  // ← Dados vêm daqui
    }))
  }
  setEditingSection(section)
}
```

---

## 🟡 Componente não renderiza

**Causa**: Condicional errado

**Solução Padrão**:
```typescript
{editingSection === 'material' ? (
  <SectionCard>
    {/* Formulário */}
  </SectionCard>
) : completedSections.has('material') ? (
  <SectionSummaryCard>
    {/* Resumo */}
  </SectionSummaryCard>
) : (
  null  // ← Ou um estado "não iniciado"
)}
```

---

## 🟡 Validação não funciona

**Checklist**:
1. ✓ `showValidationErrors={true}` está sendo passado?
2. ✓ `requiredFields` está correto?
3. ✓ `filledFields` contém os campos preenchidos?
4. ✓ Botão "Concluir" foi clicado?

**Debug**:
```typescript
console.log('Validation Attempts:', validationAttempts)
console.log('Is section valid?', isSection1Valid)
console.log('Filled fields:', filledFields)
```

---

## 🟡 Progresso não atualiza

**Causa**: Não está atualizando `completedSections`

**Solução**:
```typescript
const handleSectionComplete = (section: Section) => {
  // Sempre faça isso:
  setCompletedSections(prev => new Set(prev).add(section))
  //                                         ↑ Cria novo Set
}
```

**Por quê?**: React não detecta mutações de Set, precisa ser novo Set

---

## 🟡 Campos não ficam verdes ao preencher

**Causa**: `filledFields` não está incluindo o campo

**Solução**:
```typescript
// ❌ ERRADO
const filledFields = ['Material']  // Estático

// ✅ CORRETO - Deve ser dinâmico
const filledFields = useMemo(() => {
  const fields = []
  if (formData.materialBrand) fields.push('Material')
  if (formData.materialColor) fields.push('Cor')
  return fields
}, [formData])
```

---

## 🟡 Sticky Sidebar não funciona no mobile

**Causa**: Posicionamento sticky não é responsivo

**Solução**:
```typescript
// ✅ Melhor abordagem
<div className="lg:sticky lg:top-8 space-y-6">
  {/* Sidebar */}
</div>
```

Isso faz o sticky só ativar em telas `lg` ou maiores.

---

## 📊 FAQ - Perguntas Frequentes

### P: Posso usar esses componentes fora de formulários?
**R**: Tecnicamente sim, mas foram projetados para formulários. Para outros casos, precisaria de adaptação.

### P: Como adiciono um novo passo?
**R**: Adicione à constante `SECTIONS` e crie um novo form component seguindo o padrão.

### P: Qual é o limite de seções?
**R**: Teoricamente ilimitado, mas fica ruim visualmente após ~10 seções. Considere dividir em múltiplas páginas.

### P: Posso customizar as cores?
**R**: Sim! Os componentes usam Tailwind, modifique as classes `bg-*`, `text-*`, `border-*`.

### P: Como faço validação assíncrona (servidor)?
**R**: Use um hook separado que faz a chamada e seta o estado:
```typescript
const validateEmail = async (email) => {
  const valid = await api.validateEmail(email)
  if (!valid) setValidationAttempts(...)
}
```

### P: Os dados persistem se eu recarregar a página?
**R**: Não, exceto se implementar `localStorage` ou `Session Storage`:
```typescript
useEffect(() => {
  localStorage.setItem('formData', JSON.stringify(formData))
}, [formData])
```

### P: Preciso de testes?
**R**: Recomendado. Veja [MIGRATION_GUIDE_NEW_COMPONENTS.md](./MIGRATION_GUIDE_NEW_COMPONENTS.md) para exemplos.

### P: Como trato dados muito grandes?
**R**: Divida o formulário em múltiplas páginas ou use virtualization para listas longas.

### P: Posso gerar código desse formulário?
**R**: Sim, adicione um JSON exporter:
```typescript
const exportToJSON = () => {
  const json = JSON.stringify(formData, null, 2)
  downloadFile(json, 'form-data.json')
}
```

---

## 🧪 Checklist de Debug

Quando algo não funciona:

```
[ ] Arquivo foi salvo? → Ctrl+S
[ ] Build sem erros? → npm run build
[ ] TypeScript? → npm run tsc
[ ] Componente importado? → Verifique import statement
[ ] Props corretos? → Compare com exemplo
[ ] Estado inicializado? → new Set(), null, etc
[ ] Funções chamadas? → console.log() nos handlers
[ ] Dependências do useMemo? → verificar array []
[ ] Props do SectionCard? → id, title, status, etc
[ ] onToggleExpand, onComplete, onEdit? → Conectados?
[ ] Validação? → showValidationErrors={true}?
```

---

## 🔧 Ferramentas de Debug

### VSCode DevTools
```bash
# Abra DevTools do browser
F12 → Components Tab (React)
```

### Console Logging
```typescript
useEffect(() => {
  console.log('completedSections:', completedSections)
  console.log('editingSection:', editingSection)
  console.log('validation attempts:', validationAttempts)
}, [completedSections, editingSection, validationAttempts])
```

### Build Detalhado
```bash
npm run build 2>&1 | Select-Object -Last 20
```

---

## 🚀 Performance Tips

1. **Use `useMemo` para steps**:
   ```typescript
   const steps = useMemo(() => [...], [deps])
   ```

2. **Use `useCallback` para handlers**:
   ```typescript
   const handleEdit = useCallback((section) => {
     setEditingSection(section)
   }, [])
   ```

3. **Lazy load heavy forms**:
   ```typescript
   const HeavyForm = lazy(() => import('./HeavyForm'))
   ```

4. **Evite re-renders desnecessários**:
   ```typescript
   const getSectionStatus = useCallback((section) => {
     if (completedSections.has(section)) return 'completed'
     // ...
   }, [completedSections])
   ```

---

## 📞 Quando Pedir Ajuda

- **Build falha**: Compartilhe output de `npm run build 2>&1`
- **Componentes não aparecem**: Screenshot + estado (F12)
- **Type error**: Copie a mensagem de erro exata
- **Comportamento estranho**: Passo a passo para reproduzir

---

## 📚 Recursos Adicionais

- [React Official Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [NEW_COMPONENTS_GUIDE.md](./NEW_COMPONENTS_GUIDE.md)
- [MIGRATION_GUIDE_NEW_COMPONENTS.md](./MIGRATION_GUIDE_NEW_COMPONENTS.md)

---

Created: 2026-02-18
Last Updated: 2026-02-18
Status: Comprehensive Reference ✅
