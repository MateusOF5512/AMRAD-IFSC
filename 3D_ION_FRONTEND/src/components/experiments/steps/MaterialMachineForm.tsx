'use client'

import { useState, useMemo, forwardRef, useImperativeHandle, useEffect, Ref } from 'react'
import { MaterialCreate, MachineCreate, Material, Machine, materialsApi, machinesApi } from '@/lib/api'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import FormFieldLabel from '../FormFieldLabel'
import { logger } from '@/lib/logger'

interface MaterialMachineFormProps {
  initialData?: {
    material?: Material | MaterialCreate
    machine?: Machine | MachineCreate
  }
  onSubmit: (data: { material: any; machine: any }) => Promise<void>
  onValidationChange?: (isValid: boolean) => void
}

interface MaterialMachineFormHandle {
  submit: () => Promise<void>
}

const TECH_OPTIONS = [
  'FFF',
  'FDM',
  'SLA',
  'MSLA',
  'DLP',
  'SLS',
  'SLM',
  'Other'
]

// Componente reutilizável para input com seletor
const SelectableInput = ({ 
  label, 
  value, 
  onChange, 
  options = [], 
  placeholder,
  required = false,
  hint,
  t
}: {
  label: string
  value: string
  onChange: (val: string) => void
  options?: string[]
  placeholder?: string
  required?: boolean
  hint?: string
  t: any
}) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(value.toLowerCase()) && opt !== value
  ).slice(0, 5)

  return (
    <div className="relative">
      <FormFieldLabel label={label} required={required} hint={hint} />
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setShowDropdown(true)
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-colors ${
          value ? 'border-green-300 bg-primary-light' : 'border-border'
        }`}
      />
      
      {showDropdown && (filteredOptions.length > 0 || options.length > 0) && (
        <div className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt)
                  setShowDropdown(false)
                }}
                className="w-full text-left px-3 py-2 hover:bg-primary-muted transition-colors text-sm"
              >
                {opt}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-muted text-sm">
              {t('experimentWizardNew.forms.materialMachine.noSuggestions')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const MaterialMachineForm = forwardRef<MaterialMachineFormHandle, MaterialMachineFormProps>(
  function MaterialMachineForm({ initialData, onSubmit, onValidationChange }, ref: Ref<MaterialMachineFormHandle>) {
  const { t } = useTranslation()
  const [material, setMaterial] = useState<MaterialCreate>({
    brand: initialData?.material?.brand || '',
    model: initialData?.material?.model || '',
    color: initialData?.material?.color || '',
    is_composite: initialData?.material?.is_composite || false,
    composite_details: initialData?.material?.composite_details || '',
    status: 'approved',
  })

  const [machine, setMachine] = useState<MachineCreate>({
    brand: initialData?.machine?.brand || '',
    model: initialData?.machine?.model || '',
    technology_type: initialData?.machine?.technology_type || 'FFF',
    other_specs: initialData?.machine?.other_specs || '',
    status: 'approved',
  })

  const [approvedMaterials, setApprovedMaterials] = useState<Material[]>([])
  const [approvedMachines, setApprovedMachines] = useState<Machine[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(true)
  const [loadingMachines, setLoadingMachines] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Load approved materials and machines from API
  useEffect(() => {
    const loadApprovedItems = async () => {
      try {
        const [materials, machines] = await Promise.all([
          materialsApi.getApproved(),
          machinesApi.getApproved(),
        ])
        setApprovedMaterials(materials)
        setApprovedMachines(machines)
      } catch (err) {
        logger.error('MaterialMachineForm', err instanceof Error ? err.message : 'Unknown error')
        setApprovedMaterials([])
        setApprovedMachines([])
      } finally {
        setLoadingMaterials(false)
        setLoadingMachines(false)
      }
    }

    loadApprovedItems()
  }, [])

  // Sincroniza estado com initialData quando mudar (para edição)
  useEffect(() => {
    if (initialData?.material) {
      setMaterial({
        brand: initialData.material?.brand || '',
        model: initialData.material?.model || '',
        color: initialData.material?.color || '',
        is_composite: initialData.material?.is_composite || false,
        composite_details: initialData.material?.composite_details || '',
      })
    }
    if (initialData?.machine) {
      setMachine({
        brand: initialData.machine?.brand || '',
        model: initialData.machine?.model || '',
        technology_type: initialData.machine?.technology_type || 'FFF',
        other_specs: initialData.machine?.other_specs || '',
      })
    }
  }, [initialData?.material, initialData?.machine])

  // Validação de campos obrigatórios
  const isFormValid: boolean = useMemo(() => {
    const materialValid = material.brand && material.model && material.color
    const compositeValid = material.is_composite ? material.composite_details : true
    const machineValid = machine.brand && machine.model && machine.technology_type
    return !!(materialValid && compositeValid && machineValid)
  }, [material, machine])

  // Função de submit que pode ser chamada por ref
  const submitForm = async () => {
    setError(null)
    
    if (!isFormValid) {
      setError(t('experimentWizardNew.forms.materialMachine.errors.fillRequired'))
      return
    }

    setIsLoading(true)

    try {
      await onSubmit({
        material,
        machine,
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao salvar dados'
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  // Expõe o método submit através do ref
  useImperativeHandle(ref, () => ({
    submit: submitForm,
  }))

  // Notifica quando validação muda
  useEffect(() => {
    onValidationChange?.(isFormValid)
  }, [isFormValid, onValidationChange])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitForm()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Material Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <span>⚛️</span>
          <span>{t('experimentWizardNew.forms.materialMachine.materialSection')}</span>
          {material.brand && material.model && material.color && (
            <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
          )}
        </h3>

        {/* Extract unique options from approved materials */}
        {(() => {
          const materialBrands = [...new Set(approvedMaterials.map(m => m.brand))].sort()
          const materialModels = [...new Set(approvedMaterials.map(m => m.model))].sort()
          const materialColors = [...new Set(approvedMaterials.map(m => m.color))].sort()

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Brand Selector */}
              <SelectableInput
                label={t('experimentWizardNew.forms.materialMachine.brand')}
                value={material.brand}
                onChange={(val) => {
                  setMaterial({ ...material, brand: val })
                }}
                options={materialBrands}
                placeholder={t('experimentWizardNew.forms.materialMachine.placeholders.brand')}
                required
                hint={loadingMaterials ? t('experimentWizardNew.forms.materialMachine.hints.loading') : ''}
                t={t}
              />

              {/* Model Selector */}
              <SelectableInput
                label={t('experimentWizardNew.forms.materialMachine.model')}
                value={material.model}
                onChange={(val) => {
                  setMaterial({ ...material, model: val })
                }}
                options={materialModels}
                placeholder={t('experimentWizardNew.forms.materialMachine.placeholders.model')}
                required
                t={t}
              />

              {/* Color Selector */}
              <SelectableInput
                label={t('experimentWizardNew.forms.materialMachine.color')}
                value={material.color}
                onChange={(val) => {
                  setMaterial({ ...material, color: val })
                }}
                options={materialColors}
                placeholder={t('experimentWizardNew.forms.materialMachine.placeholders.color')}
                required
                t={t}
              />

              {/* Is Composite Checkbox */}
              <div className="flex items-end">
                <label className="flex items-center gap-2 h-full">
                  <input
                    type="checkbox"
                    checked={material.is_composite}
                    onChange={(e) => setMaterial({ ...material, is_composite: e.target.checked })}
                    className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary/40"
                  />
                  <span className="text-sm font-medium text-foreground">{t('experimentWizardNew.forms.materialMachine.isComposite')}</span>
                </label>
              </div>
            </div>
          )
        })()}

        {material.is_composite && (
          <div>
            <FormFieldLabel label={t('experimentWizardNew.forms.materialMachine.compositeDetails')} required hint={t('experimentWizardNew.forms.materialMachine.hints.compositeDetails')} />
            <textarea
              value={material.composite_details || ''}
              onChange={(e) => setMaterial({ ...material, composite_details: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-colors ${
                material.composite_details ? 'border-green-300 bg-primary-light' : 'border-border'
              }`}
              placeholder={t('experimentWizardNew.forms.materialMachine.placeholders.compositeDetails')}
              rows={3}
            />
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Machine Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <span>🖨️</span>
          <span>{t('experimentWizardNew.forms.materialMachine.machineSection')}</span>
          {machine.brand && machine.model && machine.technology_type && (
            <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
          )}
        </h3>

        {/* Extract unique options from approved machines */}
        {(() => {
          const machineBrands = [...new Set(approvedMachines.map(m => m.brand))].sort()
          const machineModels = [...new Set(approvedMachines.map(m => m.model))].sort()

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Brand Selector */}
              <SelectableInput
                label={t('experimentWizardNew.forms.materialMachine.brand')}
                value={machine.brand}
                onChange={(val) => {
                  setMachine({ ...machine, brand: val })
                }}
                options={machineBrands}
                placeholder={t('experimentWizardNew.forms.materialMachine.placeholders.brand')}
                required
                hint={loadingMachines ? t('experimentWizardNew.forms.materialMachine.hints.loading') : ''}
                t={t}
              />

              {/* Model Selector */}
              <SelectableInput
                label={t('experimentWizardNew.forms.materialMachine.model')}
                value={machine.model}
                onChange={(val) => {
                  setMachine({ ...machine, model: val })
                }}
                options={machineModels}
                placeholder={t('experimentWizardNew.forms.materialMachine.placeholders.machineModel')}
                required
                t={t}
              />

              {/* Technology Type - Fixed dropdown */}
              <div className="sm:col-span-2">
                <FormFieldLabel label={t('experimentWizardNew.forms.materialMachine.technology')} required />
                <select
                  value={machine.technology_type}
                  onChange={(e) => setMachine({ ...machine, technology_type: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-colors ${
                    machine.technology_type ? 'border-green-300 bg-primary-light' : 'border-border'
                  }`}
                >
                  {TECH_OPTIONS.map((tech) => (
                    <option key={tech} value={tech}>
                      {tech}
                    </option>
                  ))}
                </select>
              </div>

              {/* Other Specs */}
              <div className="sm:col-span-2">
                <FormFieldLabel label={t('experimentWizardNew.forms.materialMachine.otherSpecs')} optional hint={t('experimentWizardNew.forms.materialMachine.hints.otherSpecs')} />
                <textarea
                  value={machine.other_specs || ''}
                  onChange={(e) => setMachine({ ...machine, other_specs: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-colors ${
                    machine.other_specs ? 'border-green-300 bg-primary-light' : 'border-border'
                  }`}
                  placeholder={t('experimentWizardNew.forms.materialMachine.placeholders.otherSpecs')}
                  rows={3}
                />
              </div>
            </div>
          )
        })()}
      </div>

      {error && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mt-8">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}
    </form>
  )
}
)

MaterialMachineForm.displayName = 'MaterialMachineForm'

export default MaterialMachineForm
