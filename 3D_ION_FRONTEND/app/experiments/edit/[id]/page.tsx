'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import ExperimentEditWizard from '@/components/experiments/ExperimentEditWizard'
import { getNormalizedApiUrl } from '@/lib/api'
import { transformApiDataToEditFormat, EditExperimentData } from '@/lib/utils/transformExperimentData'
import { logger } from '@/lib/logger'
import { useResearcherWriteProtection } from '@/lib/hooks/useResearcherWriteProtection'

const API_BASE_URL = getNormalizedApiUrl()

export default function EditExperimentPage() {
  const router = useRouter()
  const params = useParams()
  const experimentId = params.id as string
  const user = useResearcherWriteProtection()

  const [isLoadingExperiment, setIsLoadingExperiment] = useState(false)
  const [editData, setEditData] = useState<EditExperimentData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !experimentId) return
    loadExperimentData(experimentId, user.access_token || '')
  }, [experimentId, user])

  const loadExperimentData = async (id: string, token: string) => {
    if (!token) return

    setIsLoadingExperiment(true)
    setLoadError(null)
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/experiments/${id}/detalhes`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Falha ao carregar dados do experimento')
      }

      const data = await response.json()
      const editData = transformApiDataToEditFormat(data)
      setEditData(editData)
    } catch (error) {
      logger.error('edit-experiment', error instanceof Error ? error.message : 'Unknown error')
      setLoadError(
        error instanceof Error 
          ? error.message 
          : 'Falha ao carregar dados do experimento'
      )
    } finally {
      setIsLoadingExperiment(false)
    }
  }

  if (!user || isLoadingExperiment) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold text-red-800">Erro ao carregar experimento</h2>
          <p className="text-red-700">{loadError}</p>
          <button
            onClick={() => router.push('/meus-experimentos')}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Voltar para Meus Experimentos
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {experimentId && (
        <div className="mb-4 rounded-lg border-l-4 border-info bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            <strong>Editar Experimento:</strong> #{experimentId}
          </p>
        </div>
      )}
      <ExperimentEditWizard initialData={editData} experimentId={experimentId} />
    </>
  )
}
