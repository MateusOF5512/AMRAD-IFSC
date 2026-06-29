'use client'

import { useState, useMemo, forwardRef, useImperativeHandle, useEffect, Ref } from 'react'
import { Sample } from '@/lib/api'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import FormFieldLabel from '../FormFieldLabel'
import PatternSelect from './PatternSelect'

interface SampleFormProps {
  materialId: string
  machineId: string
  onSubmit: (data: any) => Promise<void>
  onValidationChange?: (isValid: boolean) => void
  initialSampleData?: Sample
}

interface SampleFormHandle {
  submit: () => Promise<void>
}

const SampleForm = forwardRef<SampleFormHandle, SampleFormProps>(
  function SampleForm({ materialId, machineId, onSubmit, onValidationChange, initialSampleData }, ref: Ref<SampleFormHandle>) {
  const { t } = useTranslation()
  const [shapeType, setShapeType] = useState<'Cube' | 'Cylinder' | 'Other'>('Cube')
  const [shapeDimension, setShapeDimension] = useState<number>(0)  // DB: shape_dimension
  const [circleRoiArea, setCircleRoiArea] = useState<number>(0)    // DB: circle_roi_area
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([])
  const [patternError, setPatternError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Sincroniza estado com initialSampleData quando mudar (para edição)
  useEffect(() => {
    if (initialSampleData) {
      const sampleType = initialSampleData.shape_type as 'Cube' | 'Cylinder' | 'Other'
      setShapeType(sampleType || 'Cube')
      setShapeDimension(initialSampleData.shape_dimension || 0)
      setCircleRoiArea(initialSampleData.circle_roi_area || 0)

      // Restaurar padrões selecionados a partir de pattern_type (JSON string) ou pattern_ids
      let patterns: string[] = []
      if (initialSampleData.pattern_ids && initialSampleData.pattern_ids.length > 0) {
        patterns = initialSampleData.pattern_ids
      } else if (initialSampleData.pattern_type) {
        try {
          const parsed = JSON.parse(initialSampleData.pattern_type)
          if (Array.isArray(parsed)) patterns = parsed
        } catch {
          patterns = [initialSampleData.pattern_type]
        }
      }
      if (patterns.length > 0) setSelectedPatterns(patterns)
    }
  }, [initialSampleData])

  // Validação de campos obrigatórios
  const isFormValid: boolean = useMemo(() => {
    return !!(shapeDimension > 0 && circleRoiArea > 0 && selectedPatterns.length > 0)
  }, [shapeDimension, circleRoiArea, selectedPatterns])

  // Função de submit que pode ser chamada por ref
  const submitForm = async () => {
    setError(null)

    if (!isFormValid) {
      if (selectedPatterns.length === 0) {
        setError(t('experimentWizardNew.forms.sample.errors.selectPattern'))
      } else {
        setError(t('experimentWizardNew.forms.sample.errors.fillAllFields'))
      }
      return
    }

    setIsLoading(true)

    try {
      if (!materialId || !machineId) {
        throw new Error(t('experimentWizardNew.forms.materialMachine.errors.materialMachineRequired'))
      }

      const sample = {
        shape_type: shapeType,
        shape_dimension: shapeDimension,
        circle_roi_area: circleRoiArea,
        pattern_ids: selectedPatterns,
      }

      await onSubmit(sample)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao registrar amostra'
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            {t('experimentWizardNew.forms.sample.format')} <span className="text-red-500">*</span>
          </label>
          {shapeType && <CheckCircle2 className="w-5 h-5 text-green-600" />}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(['Cube', 'Cylinder', 'Other'] as const).map((type) => (
            <label
              key={type}
              className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                shapeType === type
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                value={type}
                checked={shapeType === type}
                onChange={(e) => setShapeType(e.target.value as typeof shapeType)}
                className="w-4 h-4 text-green-600"
              />
              <span className="text-sm font-medium">
                {type === 'Cube' && '📦'}
                {type === 'Cylinder' && '🔴'}
                {type === 'Other' && '❓'}
                {' '}{type === 'Other' ? t('experimentWizardNew.forms.sample.other') : type}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Dimensions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">{t('experimentWizardNew.forms.sample.dimension')}</label>
          {shapeDimension > 0 && <CheckCircle2 className="w-5 h-5 text-green-600" />}
        </div>
        <div>
          <FormFieldLabel
            label={shapeType === 'Cube' ? t('experimentWizardNew.forms.sample.edge') : t('experimentWizardNew.forms.sample.radius')}
            required
          />
          <input
            type="number"
            step="0.01"
            min="0"
            value={shapeDimension || ''}
            onChange={(e) => setShapeDimension(parseFloat(e.target.value) || 0)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
              shapeDimension > 0 ? 'border-green-300 bg-green-50' : 'border-gray-300'
            }`}
            placeholder={t('experimentWizardNew.forms.sample.placeholders.dimension')}
          />
        </div>
      </div>

      {/* ROI Area */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <FormFieldLabel label={t('experimentWizardNew.forms.sample.roiArea')} required hint={t('experimentWizardNew.forms.sample.hints.roiArea')} />
          {circleRoiArea > 0 && <CheckCircle2 className="w-5 h-5 text-green-600" />}
        </div>
        <input
          type="number"
          step="0.01"
          min="0"
          value={circleRoiArea || ''}
          onChange={(e) => setCircleRoiArea(parseFloat(e.target.value) || 0)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
            circleRoiArea > 0 ? 'border-green-300 bg-green-50' : 'border-gray-300'
          }`}
          placeholder={t('experimentWizardNew.forms.sample.placeholders.roiArea')}
        />
      </div>

      {/* Pattern Select */}
      <PatternSelect 
        selectedPatterns={selectedPatterns}
        onChange={setSelectedPatterns}
        onError={setPatternError}
      />

      {error && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mt-6">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}
    </form>
  )
}
)

SampleForm.displayName = 'SampleForm'

export default SampleForm
