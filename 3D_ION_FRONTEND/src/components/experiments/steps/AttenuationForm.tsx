'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { AlertCircle, X, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { RQR_ENERGY_OPTIONS } from '@/lib/constants/rqr-options'
import {
  ScientificNumberInput,
  parseScientificNumber,
} from '@/components/ui/ScientificNumberInput'

interface MeasurementFields {
  thickness: string
  transmission: string
}

interface TestFormBlock {
  id?: string
  rqr_energy: string
  i0: string
  measurements: MeasurementFields[]
}

export interface AttenuationTestBlock {
  id?: string
  rqr_energy: string
  i0: number
  measurements: { thickness: number; transmission: number }[]
}

interface AttenuationFormProps {
  sampleId: string
  optional?: boolean
  onSubmit: (data: any) => Promise<void>
  initialData?: AttenuationTestBlock[] | null
  legacyInitialData?: {
    id?: string
    thickness?: number
    value_lambert_beer?: number
  }[] | null
}

const emptyMeasurement = (): MeasurementFields => ({ thickness: '', transmission: '' })

const emptyTest = (): TestFormBlock => ({
  rqr_energy: 'RQR5',
  i0: '100',
  measurements: [emptyMeasurement()],
})

function toFormBlock(test: AttenuationTestBlock): TestFormBlock {
  return {
    id: test.id,
    rqr_energy: test.rqr_energy || 'RQR5',
    i0: String(test.i0 ?? 100),
    measurements:
      test.measurements?.length > 0
        ? test.measurements.map((m) => ({
            thickness: m.thickness ? String(m.thickness) : '',
            transmission: m.transmission ? String(m.transmission) : '',
          }))
        : [emptyMeasurement()],
  }
}

const AttenuationForm = forwardRef<{ submit: () => Promise<void> }, AttenuationFormProps>(
  ({ sampleId, optional = false, onSubmit, initialData, legacyInitialData }, ref) => {
    const { t } = useTranslation()
    const [tests, setTests] = useState<TestFormBlock[]>([emptyTest()])
    const [error, setError] = useState<string | null>(null)
    const [skip, setSkip] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [formRef, setFormRef] = useState<HTMLFormElement | null>(null)

    useImperativeHandle(ref, () => ({
      submit: async () => {
        if (formRef) {
          formRef.requestSubmit()
        }
      },
    }))

    useEffect(() => {
      if (initialData && initialData.length > 0) {
        setTests(initialData.map(toFormBlock))
        return
      }
      if (legacyInitialData && legacyInitialData.length > 0) {
        setTests([
          {
            rqr_energy: 'RQR5',
            i0: '100',
            measurements: legacyInitialData.map((item) => ({
              thickness: item.thickness ? String(item.thickness) : '',
              transmission: item.value_lambert_beer ? String(item.value_lambert_beer) : '',
            })),
          },
        ])
      }
    }, [initialData, legacyInitialData])

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      setIsLoading(true)

      try {
        if (skip) {
          await onSubmit(null)
          return
        }

        const payloadTests = tests
          .map((test) => {
            const i0 = parseScientificNumber(test.i0)
            const validMeasurements = test.measurements
              .map((m) => {
                const thickness = parseScientificNumber(m.thickness)
                const transmission = parseScientificNumber(m.transmission)
                if (thickness == null || transmission == null || thickness < 0 || transmission <= 0) {
                  return null
                }
                return { thickness, transmission }
              })
              .filter((m): m is { thickness: number; transmission: number } => m !== null)

            return {
              id: test.id,
              rqr_energy: test.rqr_energy,
              i0: i0 ?? 0,
              measurements: validMeasurements,
            }
          })
          .filter((row) => row.measurements.length >= 2 && row.i0 > 0 && row.rqr_energy)

        if (payloadTests.length === 0) {
          setError(t('experimentWizard.attenuation.validationMinPoints'))
          return
        }

        await onSubmit({ sample_id: sampleId, tests: payloadTests })
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('experimentWizard.attenuation.errors.registrationError')
        )
      } finally {
        setIsLoading(false)
      }
    }

    if (skip) {
      return (
        <form ref={setFormRef} onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-900">{t('experimentWizard.attenuation.skip')}</p>
          </div>
        </form>
      )
    }

    return (
      <form ref={setFormRef} onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700">
          <p className="font-medium text-slate-900 mb-1">Como preencher (PQR / Beer-Lambert)</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>I₀</strong>: intensidade sem barreira (ex: 100).
            </li>
            <li>
              Para cada espessura (mm), informe a <strong>transmissão</strong> medida.
            </li>
            <li>Mínimo de 2 pares por energia RQR. Use vírgula ou ponto nos decimais.</li>
          </ul>
        </div>
        {error && (
          <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-foreground">{t('experimentWizard.attenuation.title')}</h3>
          <p className="text-xs text-muted">{t('experimentWizard.attenuation.pqrHint')}</p>
        </div>

        {tests.map((test, testIndex) => (
          <TestCard
            key={testIndex}
            test={test}
            testIndex={testIndex}
            canRemoveTest={tests.length > 1}
            t={t}
            onRemoveTest={() => setTests(tests.filter((_, i) => i !== testIndex))}
            onRqrChange={(v) => {
              const next = [...tests]
              next[testIndex] = { ...next[testIndex], rqr_energy: v }
              setTests(next)
            }}
            onI0Change={(v) => {
              const next = [...tests]
              next[testIndex] = { ...next[testIndex], i0: v }
              setTests(next)
            }}
            onAddThickness={() => {
              const next = [...tests]
              next[testIndex] = {
                ...next[testIndex],
                measurements: [...next[testIndex].measurements, emptyMeasurement()],
              }
              setTests(next)
            }}
            onUpdateMeasurement={(mi, field, value) => {
              const next = [...tests]
              const measurements = [...next[testIndex].measurements]
              measurements[mi] = { ...measurements[mi], [field]: value }
              next[testIndex] = { ...next[testIndex], measurements }
              setTests(next)
            }}
            onRemoveMeasurement={(mi) => {
              const next = [...tests]
              if (next[testIndex].measurements.length <= 1) return
              next[testIndex] = {
                ...next[testIndex],
                measurements: next[testIndex].measurements.filter((_, i) => i !== mi),
              }
              setTests(next)
            }}
          />
        ))}

        <button
          type="button"
          onClick={() => setTests([...tests, emptyTest()])}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
        >
          <Plus className="w-4 h-4" />
          {t('experimentWizard.attenuation.addRqrTest')}
        </button>

        {optional && (
          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={skip}
              onChange={(e) => setSkip(e.target.checked)}
              className="rounded"
            />
            {t('experimentWizard.attenuation.skip')}
          </label>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">📝</span> {t('experimentWizard.attenuation.note')}
          </p>
        </div>

        {isLoading && <p className="text-sm text-muted">{t('common.loading')}</p>}
      </form>
    )
  }
)

interface TestCardProps {
  test: TestFormBlock
  testIndex: number
  canRemoveTest: boolean
  t: (k: string, o?: Record<string, unknown>) => string
  onRemoveTest: () => void
  onRqrChange: (v: string) => void
  onI0Change: (v: string) => void
  onAddThickness: () => void
  onUpdateMeasurement: (mi: number, field: keyof MeasurementFields, value: string) => void
  onRemoveMeasurement: (mi: number) => void
}

function TestCard({
  test,
  testIndex,
  canRemoveTest,
  t,
  onRemoveTest,
  onRqrChange,
  onI0Change,
  onAddThickness,
  onUpdateMeasurement,
  onRemoveMeasurement,
}: TestCardProps) {
  return (
    <div className="border border-border rounded-lg p-4 space-y-4 bg-surface">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          {t('experimentWizard.attenuation.testLabel', { index: testIndex + 1 })}
        </span>
        {canRemoveTest && (
          <button type="button" onClick={onRemoveTest} className="p-1 text-red-600 hover:bg-red-50 rounded">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">
            {t('experimentWizard.attenuation.rqrLabel')}
          </label>
          <select
            value={test.rqr_energy}
            onChange={(e) => onRqrChange(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/40"
          >
            {RQR_ENERGY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <ScientificNumberInput
          label={t('experimentWizard.attenuation.i0Label')}
          hint="Intensidade em espessura 0 mm"
          value={test.i0}
          onChange={onI0Change}
          placeholder="100"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted">
          {t('experimentWizard.attenuation.measurementsTitle')}
        </p>
        {test.measurements.map((m, mi) => (
          <div key={mi} className="flex gap-3 items-end">
            <NumberField
              label={t('experimentWizard.attenuation.thicknessLabel')}
              value={m.thickness}
              onChange={(v) => onUpdateMeasurement(mi, 'thickness', v)}
            />
            <NumberField
              label={t('experimentWizard.attenuation.transmissionLabel')}
              value={m.transmission}
              onChange={(v) => onUpdateMeasurement(mi, 'transmission', v)}
            />
            {test.measurements.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveMeasurement(mi)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={onAddThickness}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
        >
          <Plus className="w-4 h-4" />
          {t('experimentWizard.attenuation.addThickness')}
        </button>
      </div>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex-1">
      <ScientificNumberInput label={label} value={value} onChange={onChange} />
    </div>
  )
}

AttenuationForm.displayName = 'AttenuationForm'

export default AttenuationForm
