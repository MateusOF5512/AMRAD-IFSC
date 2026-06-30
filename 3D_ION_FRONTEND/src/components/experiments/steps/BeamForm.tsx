'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'

interface BeamFormProps {
  sampleId: string
  optional?: boolean
  onSubmit: (data: any) => Promise<void>
  initialData?: {
    id?: string
    rqr_2?: number; rqr_3?: number; rqr_4?: number; rqr_5?: number; rqr_6?: number; rqr_7?: number
    rqr_8?: number; rqr_9?: number; rqr_10?: number
    rqt_8?: number; rqt_9?: number; rqt_10?: number
    rqr_m1?: number; rqr_m2?: number; rqr_m3?: number; rqr_m4?: number
  } | null
}

const BeamForm = forwardRef<{ submit: () => Promise<void> }, BeamFormProps>(
  ({ sampleId, optional = false, onSubmit, initialData }, ref) => {
    const [id, setId] = useState('')
    const [rqr, setRqr] = useState({
      rqr_2: '', rqr_3: '', rqr_4: '', rqr_5: '', rqr_6: '', rqr_7: '',
      rqr_8: '', rqr_9: '', rqr_10: '',
    })

    const [rqt, setRqt] = useState({
      rqt_8: '', rqt_9: '', rqt_10: '',
    })

    const [rqrm, setRqrm] = useState({
      rqr_m1: '', rqr_m2: '', rqr_m3: '', rqr_m4: '',
    })

    const [error, setError] = useState<string | null>(null)
    const [skip, setSkip] = useState(false)
    const [activeTab, setActiveTab] = useState<'rqr' | 'rqt' | 'rqrm'>('rqr')
    const [isLoading, setIsLoading] = useState(false)
    const [formRef, setFormRef] = useState<HTMLFormElement | null>(null)

    useImperativeHandle(ref, () => ({
      submit: async () => {
        if (formRef) {
          const event = new Event('submit', { bubbles: true, cancelable: true })
          formRef.dispatchEvent(event)
        }
      },
    }))

    // Sincroniza com initialData quando mudar (para edição)
    useEffect(() => {
      if (initialData) {
        setId(initialData.id || '')
        setRqr({
          rqr_2: initialData.rqr_2?.toString() || '',
          rqr_3: initialData.rqr_3?.toString() || '',
          rqr_4: initialData.rqr_4?.toString() || '',
          rqr_5: initialData.rqr_5?.toString() || '',
          rqr_6: initialData.rqr_6?.toString() || '',
          rqr_7: initialData.rqr_7?.toString() || '',
          rqr_8: initialData.rqr_8?.toString() || '',
          rqr_9: initialData.rqr_9?.toString() || '',
          rqr_10: initialData.rqr_10?.toString() || '',
        })
        setRqt({
          rqt_8: initialData.rqt_8?.toString() || '',
          rqt_9: initialData.rqt_9?.toString() || '',
          rqt_10: initialData.rqt_10?.toString() || '',
        })
        setRqrm({
          rqr_m1: initialData.rqr_m1?.toString() || '',
          rqr_m2: initialData.rqr_m2?.toString() || '',
          rqr_m3: initialData.rqr_m3?.toString() || '',
          rqr_m4: initialData.rqr_m4?.toString() || '',
        })
      }
    }, [initialData?.id])

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      setIsLoading(true)

      try {
        if (skip) {
          await onSubmit(null)
          return
        }

        const payload = {
          id: id || undefined,
        sample_id: sampleId,
        rqr_2: rqr.rqr_2 ? parseFloat(rqr.rqr_2) : 0,
        rqr_3: rqr.rqr_3 ? parseFloat(rqr.rqr_3) : 0,
        rqr_4: rqr.rqr_4 ? parseFloat(rqr.rqr_4) : 0,
        rqr_5: rqr.rqr_5 ? parseFloat(rqr.rqr_5) : 0,
        rqr_6: rqr.rqr_6 ? parseFloat(rqr.rqr_6) : 0,
        rqr_7: rqr.rqr_7 ? parseFloat(rqr.rqr_7) : 0,
        rqr_8: rqr.rqr_8 ? parseFloat(rqr.rqr_8) : 0,
        rqr_9: rqr.rqr_9 ? parseFloat(rqr.rqr_9) : 0,
        rqr_10: rqr.rqr_10 ? parseFloat(rqr.rqr_10) : 0,
        rqt_8: rqt.rqt_8 ? parseFloat(rqt.rqt_8) : 0,
        rqt_9: rqt.rqt_9 ? parseFloat(rqt.rqt_9) : 0,
        rqt_10: rqt.rqt_10 ? parseFloat(rqt.rqt_10) : 0,
        rqr_m1: rqrm.rqr_m1 ? parseFloat(rqrm.rqr_m1) : 0,
        rqr_m2: rqrm.rqr_m2 ? parseFloat(rqrm.rqr_m2) : 0,
        rqr_m3: rqrm.rqr_m3 ? parseFloat(rqrm.rqr_m3) : 0,
        rqr_m4: rqrm.rqr_m4 ? parseFloat(rqrm.rqr_m4) : 0,
      }

      await onSubmit(payload)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao registrar qualidade de feixes'
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

    if (skip) {
      return (
        <form ref={setFormRef} onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-900">
              Você pulará o registro de qualidade de feixes. Pode finalizar.
            </p>
          </div>
        </form>
      )
    }

    return (
      <form ref={setFormRef} onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(['rqr', 'rqt', 'rqrm'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-green-600 text-primary'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {tab === 'rqr' && 'Série RQR'}
            {tab === 'rqt' && 'Série RQT'}
            {tab === 'rqrm' && 'Série RQR-M'}
          </button>
        ))}
      </div>

      {/* RQR Tab */}
      {activeTab === 'rqr' && (
        <div className="space-y-3">
          <p className="text-sm text-muted mb-4">RQR 2 a 10 (Norma IEC 61267)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <div key={num}>
                <label className="block text-xs font-medium text-foreground mb-1">
                  RQR {num}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={rqr[`rqr_${num}` as keyof typeof rqr]}
                  onChange={(e) =>
                    setRqr({ ...rqr, [`rqr_${num}`]: e.target.value })
                  }
                  className="w-full px-2 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                  placeholder="0.0000"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RQT Tab */}
      {activeTab === 'rqt' && (
        <div className="space-y-3">
          <p className="text-sm text-muted mb-4">RQT 8 a 10 (Norma IEC 61267)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[8, 9, 10].map((num) => (
              <div key={num}>
                <label className="block text-xs font-medium text-foreground mb-1">
                  RQT {num}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={rqt[`rqt_${num}` as keyof typeof rqt]}
                  onChange={(e) =>
                    setRqt({ ...rqt, [`rqt_${num}`]: e.target.value })
                  }
                  className="w-full px-2 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                  placeholder="0.0000"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RQR-M Tab */}
      {activeTab === 'rqrm' && (
        <div className="space-y-3">
          <p className="text-sm text-muted mb-4">RQR-M 1 a 4 (Norma IEC 61267 - Mamografia)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((num) => (
              <div key={num}>
                <label className="block text-xs font-medium text-foreground mb-1">
                  RQR-M {num}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={rqrm[`rqr_m${num}` as keyof typeof rqrm]}
                  onChange={(e) =>
                    setRqrm({ ...rqrm, [`rqr_m${num}`]: e.target.value })
                  }
                  className="w-full px-2 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                  placeholder="0.0000"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mt-6">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">ℹ️ Nota:</span> Preencha apenas as qualidades que foram medidas. Deixe como 0 ou em branco as qualidades não testadas.
        </p>
      </div>
    </form>
  )
  }
)

BeamForm.displayName = 'BeamForm'

export default BeamForm
