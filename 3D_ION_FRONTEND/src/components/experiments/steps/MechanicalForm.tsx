'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  ScientificNumberInput,
  parseScientificNumber,
} from '@/components/ui/ScientificNumberInput'

interface MechanicalFormProps {
  sampleId: string
  optional?: boolean
  onSubmit: (data: any) => Promise<void>
  initialData?: {
    id?: string
    tensile_modulus_mpa?: number
    tensile_strength_mpa?: number
    break_deformation_percent?: number
    flexural_modulus_mpa?: number
    flexural_strength_mpa?: number
    hardness_rockwell?: number
    impact_charpy_kj_m2?: number
    impact_izod?: number
    test_condition?: string
  } | null
}

type FormState = {
  id: string
  tensile_modulus_mpa: string
  tensile_strength_mpa: string
  break_deformation_percent: string
  flexural_modulus_mpa: string
  flexural_strength_mpa: string
  hardness_rockwell: string
  impact_charpy_kj_m2: string
  impact_izod: string
  test_condition: 'Before Irradiation' | 'After Irradiation'
}

const MechanicalForm = forwardRef<{ submit: () => Promise<void> }, MechanicalFormProps>(
  ({ sampleId, optional = false, onSubmit, initialData }, ref) => {
    const { t } = useTranslation()
    const [formData, setFormData] = useState<FormState>({
      id: '',
      tensile_modulus_mpa: '',
      tensile_strength_mpa: '',
      break_deformation_percent: '',
      flexural_modulus_mpa: '',
      flexural_strength_mpa: '',
      hardness_rockwell: '',
      impact_charpy_kj_m2: '',
      impact_izod: '',
      test_condition: 'Before Irradiation',
    })
    const [error, setError] = useState<string | null>(null)
    const [skip, setSkip] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [formRef, setFormRef] = useState<HTMLFormElement | null>(null)

    useImperativeHandle(ref, () => ({
      submit: async () => {
        formRef?.requestSubmit()
      },
    }))

    useEffect(() => {
      if (initialData) {
        setFormData({
          id: initialData.id || '',
          tensile_modulus_mpa: initialData.tensile_modulus_mpa?.toString() || '',
          tensile_strength_mpa: initialData.tensile_strength_mpa?.toString() || '',
          break_deformation_percent: initialData.break_deformation_percent?.toString() || '',
          flexural_modulus_mpa: initialData.flexural_modulus_mpa?.toString() || '',
          flexural_strength_mpa: initialData.flexural_strength_mpa?.toString() || '',
          hardness_rockwell: initialData.hardness_rockwell?.toString() || '',
          impact_charpy_kj_m2: initialData.impact_charpy_kj_m2?.toString() || '',
          impact_izod: initialData.impact_izod?.toString() || '',
          test_condition: (initialData.test_condition as FormState['test_condition']) || 'Before Irradiation',
        })
      }
    }, [initialData?.id])

    const num = (raw: string, fallback = 0) => parseScientificNumber(raw) ?? fallback

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      setIsLoading(true)

      try {
        if (skip) {
          await onSubmit(null)
          return
        }

        await onSubmit({
          id: formData.id || undefined,
          sample_id: sampleId,
          tensile_modulus_mpa: num(formData.tensile_modulus_mpa),
          tensile_strength_mpa: num(formData.tensile_strength_mpa),
          break_deformation_percent: num(formData.break_deformation_percent),
          flexural_modulus_mpa: num(formData.flexural_modulus_mpa),
          flexural_strength_mpa: num(formData.flexural_strength_mpa),
          hardness_rockwell: formData.hardness_rockwell.trim() || null,
          impact_charpy_kj_m2: num(formData.impact_charpy_kj_m2),
          impact_izod: num(formData.impact_izod),
          test_condition: formData.test_condition,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao registrar propriedades mecânicas')
      } finally {
        setIsLoading(false)
      }
    }

    if (skip) {
      return (
        <form ref={setFormRef} onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-900">
              Você pulará o registro de propriedades mecânicas. Pode continuar.
            </p>
          </div>
        </form>
      )
    }

    return (
      <form ref={setFormRef} onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700">
          <p className="font-medium text-slate-900 mb-1">Como preencher os valores</p>
          <p>
            Use ponto ou vírgula como decimal (ex: <strong>1212222,12</strong> ou <strong>45.8</strong>).
            Campos numéricos vazios são salvos como 0. Dureza aceita texto livre (ex: 75 Shore A).
          </p>
        </div>

        {error && (
          <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Condição do Experimento <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(['Before Irradiation', 'After Irradiation'] as const).map((condition) => (
              <label
                key={condition}
                className="flex items-center gap-2 p-3 border border-border rounded-lg cursor-pointer hover:bg-background"
                style={{
                  borderColor: formData.test_condition === condition ? '#16a34a' : undefined,
                  backgroundColor: formData.test_condition === condition ? '#dcfce7' : undefined,
                }}
              >
                <input
                  type="radio"
                  value={condition}
                  checked={formData.test_condition === condition}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      test_condition: e.target.value as FormState['test_condition'],
                    })
                  }
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm font-medium">
                  {condition === 'Before Irradiation' ? 'Antes' : 'Depois'} da Irradiação
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-border" />

        <div>
          <h3 className="font-semibold text-foreground mb-4">Tração e Ruptura</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ScientificNumberInput
              label="Módulo Tração"
              unit="MPa"
              value={formData.tensile_modulus_mpa}
              onChange={(v) => setFormData({ ...formData, tensile_modulus_mpa: v })}
            />
            <ScientificNumberInput
              label="Resistência Tração"
              unit="MPa"
              value={formData.tensile_strength_mpa}
              onChange={(v) => setFormData({ ...formData, tensile_strength_mpa: v })}
            />
            <ScientificNumberInput
              label="Deformação Ruptura"
              unit="%"
              value={formData.break_deformation_percent}
              onChange={(v) => setFormData({ ...formData, break_deformation_percent: v })}
            />
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-4">Flexão e Dureza</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ScientificNumberInput
              label="Módulo Flexão"
              unit="MPa"
              value={formData.flexural_modulus_mpa}
              onChange={(v) => setFormData({ ...formData, flexural_modulus_mpa: v })}
            />
            <ScientificNumberInput
              label="Resistência Flexão"
              unit="MPa"
              value={formData.flexural_strength_mpa}
              onChange={(v) => setFormData({ ...formData, flexural_strength_mpa: v })}
            />
            <HardnessField formData={formData} setFormData={setFormData} />
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-4">Impacto</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ScientificNumberInput
              label="Impacto Charpy"
              unit="kJ/m²"
              value={formData.impact_charpy_kj_m2}
              onChange={(v) => setFormData({ ...formData, impact_charpy_kj_m2: v })}
            />
            <ScientificNumberInput
              label="Impacto Izod"
              value={formData.impact_izod}
              onChange={(v) => setFormData({ ...formData, impact_izod: v })}
            />
          </div>
        </div>

        {isLoading && <p className="text-sm text-muted">{t('common.loading')}</p>}
      </form>
    )
  }
)

function HardnessField({
  formData,
  setFormData,
}: {
  formData: FormState
  setFormData: React.Dispatch<React.SetStateAction<FormState>>
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        Dureza (Shore A / Rockwell)
      </label>
      <input
        type="text"
        value={formData.hardness_rockwell}
        onChange={(e) => setFormData({ ...formData, hardness_rockwell: e.target.value })}
        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/40"
        placeholder="Ex: 75 Shore A"
      />
    </div>
  )
}

MechanicalForm.displayName = 'MechanicalForm'

export default MechanicalForm
