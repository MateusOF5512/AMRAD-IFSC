'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, AlertCircle, Plus, Eye, ChevronDown, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ExperimentReportModal } from '@/components/experiments/ExperimentReportModal'
import { SimplifiedExperimentComparison } from '@/components/experiments/comparison/SimplifiedExperimentComparison'

interface ExperimentSummary {
  experiment_id: string
  index_visual?: number
  created_at?: string
  researcher_name?: string
  researcher_institution?: string
  material_brand?: string
  material_model?: string
  material_color?: string
  machine_brand?: string
  machine_model?: string
  machine_technology?: string
  shape_type?: string
  roi_area_mm2?: number
  dimension_a?: number
  dimension_b?: number
  infill_count: number
  infill_hu_mean?: number
  ct_scan_count: number
  mechanical_tests: boolean
  attenuation_count?: number
  beam_qualities_exists?: boolean
  status?: 'Submitted' | 'Revisions' | 'Review' | 'Approved'
}

interface ExperimentsResponse {
  success: boolean
  count: number
  experiments: ExperimentSummary[]
}

export default function MeusExperimentosPage() {
  const router = useRouter()
  const { t, i18n } = useTranslation()
  const [user, setUser] = useState<{ user_id: string; name: string; email: string } | null>(null)
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedExperimentSection, setSelectedExperimentSection] = useState<'analise' | 'aprovados' | null>(null)
  const [selectedExperimentStatus, setSelectedExperimentStatus] = useState<string | null>(null)
  const [currentPageAnalise, setCurrentPageAnalise] = useState(1)
  const [currentPageAprovados, setCurrentPageAprovados] = useState(1)
  const [isHelpExpanded, setIsHelpExpanded] = useState(false)
  const [statusHistory, setStatusHistory] = useState<any[]>([])
  const [statusHistoryLoading, setStatusHistoryLoading] = useState(false)
  const [statusHistoryError, setStatusHistoryError] = useState<string | null>(null)
  const [currentStatusHistoryPage, setCurrentStatusHistoryPage] = useState(1)
  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false)
  const [selectedExperimentIds, setSelectedExperimentIds] = useState<string[]>([])
  const itemsPerPage = 5
  const statusHistoryPerPage = 8

  // Check authentication
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userData) as any
      setUser(parsedUser)
    } catch {
      localStorage.removeItem('user')
      router.push('/login')
    }
  }, [router])

  // Fetch experiments with summary data
  useEffect(() => {
    if (!user) return

    const fetchExperiments = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = (user as any).access_token || (user as any).token
        if (!token) {
          throw new Error('Token de autenticação não encontrado')
        }

        // Normalizando a URL para evitar duplicação de /api/v1
        let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
        
        // Se a URL não termina com /api/v1, adiciona
        if (!apiUrl.includes('/api/v1')) {
          apiUrl = apiUrl.replace(/\/$/, '') + '/api/v1'
        }
        
        // Passando o researcher_id (user_id) como parâmetro para filtrar apenas os experimentos do usuário
        const url = `${apiUrl}/experiments/resumo?skip=0&limit=100&researcher_id=${user.user_id}`
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        })

        if (response.status === 401) {
          localStorage.removeItem('user')
          router.push('/login')
          return
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            errorData.detail || 
            `HTTP ${response.status}: Erro ao buscar seus experimentos`
          )
        }

        const data: ExperimentsResponse = await response.json()
        // Backend já filtra os experimentos pelo researcher_id, então não precisa filtrar aqui
        setExperiments(data.experiments || [])
      } catch (err) {
        console.error('Error fetching experiments:', err)
        const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar experimentos'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchExperiments()
  }, [user, router])

  // Refresh function for status history (can be called anytime)
  const refreshStatusHistory = async (userContext?: any) => {
    const userToUse = userContext || user
    if (!userToUse) return

    try {
      setStatusHistoryLoading(true)
      setStatusHistoryError(null)

      const token = (userToUse as any).access_token || (userToUse as any).token
      if (!token) {
        throw new Error('Token de autenticação não encontrado')
      }

      // Normalizando a URL para evitar duplicação de /api/v1
      let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      
      // Se a URL não termina com /api/v1, adiciona
      if (!apiUrl.includes('/api/v1')) {
        apiUrl = apiUrl.replace(/\/$/, '') + '/api/v1'
      }

      const response = await fetch(`${apiUrl}/samples/researcher/status-history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        localStorage.removeItem('user')
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Erro ao buscar histórico de status')
      }

      const data = await response.json()
      console.log('[MeusExperimentos] Status history response:', data)
      setStatusHistory(data.data || [])
      setCurrentStatusHistoryPage(1) // Reset to first page on refresh
    } catch (err) {
      console.error('[MeusExperimentos] Error fetching status history:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar histórico'
      setStatusHistoryError(errorMessage)
    } finally {
      setStatusHistoryLoading(false)
    }
  }

  // Fetch researcher status history on mount
  useEffect(() => {
    if (!user) return
    console.log('[MeusExperimentos] Loading status history on page load')
    refreshStatusHistory(user)
  }, [user])

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (!user || isRefreshingHistory) return
    setIsRefreshingHistory(true)
    console.log('[MeusExperimentos] Manual refresh triggered by user')
    await refreshStatusHistory(user)
    setIsRefreshingHistory(false)
  }

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    try {
      const dateObj = new Date(dateString)
      if (i18n.language === 'en' || i18n.language === 'en-US' || i18n.language === 'en-GB') {
        // English format: yyyy/mm/dd
        const year = dateObj.getFullYear()
        const month = String(dateObj.getMonth() + 1).padStart(2, '0')
        const day = String(dateObj.getDate()).padStart(2, '0')
        return `${year}/${month}/${day}`
      }
      // Portuguese format: dd/mm/yyyy
      return dateObj.toLocaleDateString('pt-BR')
    } catch {
      return '-'
    }
  }

  // Format number
  const formatNumber = (value?: number, decimals: number = 2) => {
    if (value === undefined || value === null) return '-'
    return value.toFixed(decimals)
  }

  // Get status badge
  const getStatusBadge = (experiment: ExperimentSummary) => {
    // Determina o status do experimento
    const status = experiment.status || 'Submitted'
    
    if (status === 'Approved') {
      return {
        label: t('myExperiments.status.approved'),
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        icon: '✅'
      }
    }

    if (status === 'Submitted') {
      return {
        label: t('myExperiments.status.submitted'),
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        icon: '📤'
      }
    }

    if (status === 'Review') {
      return {
        label: t('myExperiments.status.review'),
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        icon: '🔍'
      }
    }

    if (status === 'Revisions') {
      return {
        label: t('myExperiments.status.revisions'),
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-800',
        icon: '⚠️'
      }
    }
    
    return {
      label: t('myExperiments.status.inCuration'),
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      icon: '⏳'
    }
  }

  // Get emoji for sample shape type
  const getShapeEmoji = (shapeType?: string) => {
    if (!shapeType) return '❓'
    const normalized = shapeType.toLowerCase().trim()
    
    // Check for Cube variations
    if (normalized.includes('cube') || normalized.includes('cubo')) return '📦'
    
    // Check for Cylinder variations
    if (normalized.includes('cylinder') || normalized.includes('cilindro')) return '🔴'
    
    // Default to question mark
    return '❓'
  }

  // Handle opening details modal
  const handleViewDetails = (experimentId: string, section: 'analise' | 'aprovados' = 'analise', status: string = 'Submitted') => {
    setSelectedExperimentId(experimentId)
    setSelectedExperimentSection(section)
    setSelectedExperimentStatus(status)
    setIsModalOpen(true)
  }

  // Handle closing details modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedExperimentId(null)
    setSelectedExperimentSection(null)
    setSelectedExperimentStatus(null)
  }

  // Handle experiment selection for comparison
  const toggleExperimentSelection = (experimentId: string) => {
    setSelectedExperimentIds((prev) =>
      prev.includes(experimentId)
        ? prev.filter((id) => id !== experimentId)
        : [...prev, experimentId]
    )
  }

  const handleClearSelection = () => {
    setSelectedExperimentIds([])
  }

  // Helper function to check if experiment is in analysis
  const isExperimentEmAnalise = (experiment: ExperimentSummary): boolean => {
    const status = experiment.status || 'Submitted'
    return ['Submitted', 'Review', 'Revisions'].includes(status)
  }

  // Helper function to check if experiment is approved
  const isExperimentAprovado = (experiment: ExperimentSummary): boolean => {
    const status = experiment.status || 'Submitted'
    return status === 'Approved'
  }

  // Format date and time for status history
  const formatStatusHistoryDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      const time = `${hour}:${minute}`
      
      if (i18n.language === 'en' || i18n.language === 'en-US' || i18n.language === 'en-GB') {
        // English format: yyyy/mm/dd hh:mm
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}/${month}/${day} ${time}`
      }
      
      // Portuguese format: dd/mm/yyyy hh:mm
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  // Create a map of experiments by experiment_id for quick lookup of index_visual
  const experimentIndexMap = experiments.reduce((acc, exp) => {
    if (exp.experiment_id) {
      acc[exp.experiment_id] = exp.index_visual || 0
    }
    return acc
  }, {} as Record<string, number>)

  // Get role badge for status history
  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return { label: 'Admin', icon: '🔐', color: 'bg-red-100 text-red-800' }
    }
    return { label: 'Pesquisador', icon: '👤', color: 'bg-blue-100 text-blue-800' }
  }

  // Get status transition colors
  const getStatusTransitionColors = (oldStatus: string | null, newStatus: string) => {
    const statusColors: Record<string, string> = {
      'Submitted': 'bg-blue-100 text-blue-800',
      'Review': 'bg-yellow-100 text-yellow-800',
      'Revisions': 'bg-orange-100 text-orange-800',
      'Approved': 'bg-green-100 text-green-800'
    }
    
    // For initial submission (null status), use very light gray
    const oldColor = oldStatus ? (statusColors[oldStatus] || 'bg-gray-100 text-gray-800') : 'bg-gray-50 text-gray-400'
    
    return {
      old: oldColor,
      new: statusColors[newStatus] || 'bg-gray-100 text-gray-800'
    }
  }

  // Get status label in Portuguese
  const getStatusLabel = (status: string | null): string => {
    const statusLabels: Record<string, string> = {
      'Submitted': 'Submetido',
      'Review': 'Em Revisão',
      'Revisions': 'Ajustes Necessários',
      'Approved': 'Aprovado'
    }
    
    return statusLabels[status || 'Submitted'] || status || 'Inicial'
  }

  // Get status label for history table (empty for initial/null status)
  const getStatusLabelForHistory = (status: string | null): string => {
    if (!status) return '' // Empty string for null/initial status
    
    const statusLabels: Record<string, string> = {
      'Submitted': 'Submetido',
      'Review': 'Em Revisão',
      'Revisions': 'Ajustes Necessários',
      'Approved': 'Aprovado'
    }
    
    return statusLabels[status] || status
  }

  // Separate experiments by status
  const experimentsEmAnalise = experiments.filter(isExperimentEmAnalise)
  const experimentsAprovados = experiments.filter(isExperimentAprovado)

  // Pagination for Em Análise
  const totalPagesAnalise = Math.ceil(experimentsEmAnalise.length / itemsPerPage)
  const startIndexAnalise = (currentPageAnalise - 1) * itemsPerPage
  const paginatedAnalise = experimentsEmAnalise.slice(
    startIndexAnalise,
    startIndexAnalise + itemsPerPage
  )

  // Pagination for Aprovados
  const totalPagesAprovados = Math.ceil(experimentsAprovados.length / itemsPerPage)
  const startIndexAprovados = (currentPageAprovados - 1) * itemsPerPage
  const paginatedAprovados = experimentsAprovados.slice(
    startIndexAprovados,
    startIndexAprovados + itemsPerPage
  )

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="text-gray-600">{t('myExperiments.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('myExperiments.title')}
              </h1>
              <p className="mt-2 text-gray-600">
                {t('myExperiments.subtitle', { count: experiments.length })}
              </p>
            </div>
            <Link
              href="/novo-experimento"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              {t('experiments.newExperiment')}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">{t('myExperiments.errorMessages.loadError')}</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {experiments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 mb-4">{t('myExperiments.noExperiments')}</p>
            <Link
              href="/novo-experimento"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              {t('myExperiments.createFirstExperiment')}
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Status Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Submetido */}
              <div className="bg-white rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-shadow p-4">
                <div className="flex flex-col items-center">
                  <div className="text-3xl mb-2">📤</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {experiments.filter(e => e.status === 'Submitted').length}
                  </div>
                  <div className="text-xs text-gray-600 text-center mt-1">{t('myExperiments.status.submitted')}</div>
                </div>
              </div>

              {/* Ajustes Necessários */}
              <div className="bg-white rounded-lg border border-orange-200 shadow-sm hover:shadow-md transition-shadow p-4">
                <div className="flex flex-col items-center">
                  <div className="text-3xl mb-2">⚠️</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {experiments.filter(e => e.status === 'Revisions').length}
                  </div>
                  <div className="text-xs text-gray-600 text-center mt-1">{t('myExperiments.status.revisions')}</div>
                </div>
              </div>

              {/* Em Revisão */}
              <div className="bg-white rounded-lg border border-yellow-200 shadow-sm hover:shadow-md transition-shadow p-4">
                <div className="flex flex-col items-center">
                  <div className="text-3xl mb-2">🔍</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {experiments.filter(e => e.status === 'Review').length}
                  </div>
                  <div className="text-xs text-gray-600 text-center mt-1">{t('myExperiments.status.review')}</div>
                </div>
              </div>

              {/* Aprovado */}
              <div className="bg-white rounded-lg border border-green-200 shadow-sm hover:shadow-md transition-shadow p-4">
                <div className="flex flex-col items-center">
                  <div className="text-3xl mb-2">✅</div>
                  <div className="text-2xl font-bold text-green-600">
                    {experiments.filter(e => e.status === 'Approved').length}
                  </div>
                  <div className="text-xs text-gray-600 text-center mt-1">{t('myExperiments.status.approved')}</div>
                </div>
              </div>
            </div>

            {/* Em Análise Section */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100">
                  <span className="text-xl">⏳</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{t('myExperiments.sections.inAnalysis.title')}</h2>
                  <p className="text-sm text-gray-500 mt-1">{t('myExperiments.sections.inAnalysis.subtitle')}</p>
                </div>
              </div>
              {experimentsEmAnalise.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center hover:shadow-md transition-shadow">
                  <div className="flex justify-center mb-4">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200">
                      <span className="text-3xl">📋</span>
                    </div>
                  </div>
                  <p className="text-gray-600 font-medium">{t('myExperiments.sections.inAnalysis.empty')}</p>
                  <p className="text-sm text-gray-500 mt-1">{t('myExperiments.sections.inAnalysis.emptySubtitle')}</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="bg-gradient-to-r from-amber-50 via-amber-50 to-orange-50 px-6 py-4 border-b-2 border-amber-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-amber-900">{t('myExperiments.sections.inAnalysis.tableTitle')}</h3>
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold text-sm">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        {t('myExperiments.table.count_one', { count: experimentsEmAnalise.length })}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-900 uppercase tracking-wider w-12">
                            <input
                              type="checkbox"
                              checked={selectedExperimentIds.length > 0 && selectedExperimentIds.length === paginatedAnalise.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedExperimentIds(paginatedAnalise.map((exp) => exp.experiment_id))
                                } else {
                                  handleClearSelection()
                                }
                              }}
                              className="rounded w-4 h-4 cursor-pointer"
                              title="Selecionar/Desselecionar todos nesta página"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            {t('myExperiments.table.columns.index')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            {t('myExperiments.table.columns.status')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            {t('myExperiments.table.columns.date')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            {t('myExperiments.table.columns.machine')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            {t('myExperiments.table.columns.material')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            {t('myExperiments.table.columns.sample')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            {t('myExperiments.table.columns.infill')}
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            {t('myExperiments.table.columns.data')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            {t('myExperiments.table.columns.details')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedAnalise.map((experiment, index) => {
                          const statusBadge = getStatusBadge(experiment)
                          return (
                            <tr key={experiment.experiment_id || `experiment-${index}`} className="hover:bg-gray-50 transition-colors">
                              {/* Checkbox */}
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedExperimentIds.includes(experiment.experiment_id)}
                                  onChange={() => toggleExperimentSelection(experiment.experiment_id)}
                                  className="rounded w-4 h-4 cursor-pointer"
                                  title="Selecionar para comparação"
                                />
                              </td>

                              {/* Index */}
                              <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                {experiment.index_visual || '-'}
                              </td>

                              {/* Status */}
                              <td className="px-6 py-4 text-sm">
                                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-xs ${statusBadge.bgColor} ${statusBadge.textColor}`}>
                                  {statusBadge.icon} {statusBadge.label}
                                </span>
                              </td>

                              {/* Data */}
                              <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                {formatDate(experiment.created_at)}
                              </td>

                              {/* Máquina */}
                              <td className="px-6 py-4 text-sm">
                                <div className="font-medium text-gray-900">
                                  {experiment.machine_brand || '-'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {experiment.machine_model || '-'}
                                </div>
                              </td>

                              {/* Material */}
                              <td className="px-6 py-4 text-sm">
                                <div className="font-medium text-gray-900">
                                  {experiment.material_brand || '-'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {experiment.material_model || '-'}
                                </div>
                              </td>

                              {/* Amostra (Forma) */}
                              <td className="px-6 py-4 text-sm">
                                <div className="font-medium text-gray-900">
                                  {getShapeEmoji(experiment.shape_type)} {experiment.shape_type || '-'}
                                </div>
                              </td>

                              {/* Infill (HU) */}
                              <td className="px-6 py-4 text-sm">
                                {experiment.infill_count > 0 ? (
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {formatNumber(experiment.infill_hu_mean)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      ({experiment.infill_count} med.)
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>

                              {/* Dados Técnicos */}
                              <td className="px-6 py-4 text-sm text-center">
                                <div className="flex gap-2 justify-center items-center">
                                  {experiment.mechanical_tests && (
                                    <span className="text-lg cursor-help hover:scale-110 transition-transform" title="Propriedades Mecânicas">
                                      ⚙️
                                    </span>
                                  )}
                                  {(experiment.attenuation_count ?? 0) > 0 && (
                                    <span className="text-lg cursor-help hover:scale-110 transition-transform" title="Atenuação Linear">
                                      📉
                                    </span>
                                  )}
                                  {experiment.beam_qualities_exists && (
                                    <span className="text-lg cursor-help hover:scale-110 transition-transform" title="Qualidades de Feixe">
                                      ☢️
                                    </span>
                                  )}
                                  {!experiment.mechanical_tests && (experiment.attenuation_count ?? 0) === 0 && !experiment.beam_qualities_exists && (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </div>
                              </td>

                              {/* Detalhes */}
                              <td className="px-6 py-4 text-sm">
                                <button
                                  onClick={() => handleViewDetails(experiment.experiment_id, 'analise', experiment.status || 'Submitted')}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all hover:shadow-sm font-medium text-xs"
                                  title="Ver detalhes do experimento"
                                >
                                  <Eye className="h-4 w-4" />
                                  {t('myExperiments.table.buttons.view')}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination for Em Análise */}
                  {totalPagesAnalise > 1 && (
                    <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setCurrentPageAnalise(prev => Math.max(prev - 1, 1))}
                        disabled={currentPageAnalise === 1}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('myExperiments.table.pagination.previous')}
                      </button>
                      <div className="flex gap-1">
                        {Array.from({ length: totalPagesAnalise }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPageAnalise(page)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                              currentPageAnalise === page
                                ? 'bg-green-600 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentPageAnalise(prev => Math.min(prev + 1, totalPagesAnalise))}
                        disabled={currentPageAnalise === totalPagesAnalise}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('myExperiments.table.pagination.next')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Aprovados Section */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100">
                  <span className="text-xl">✅</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{t('myExperiments.sections.approved.title')}</h2>
                  <p className="text-sm text-gray-500 mt-1">{t('myExperiments.sections.approved.subtitle')}</p>
                </div>
              </div>
              {experimentsAprovados.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center hover:shadow-md transition-shadow">
                  <div className="flex justify-center mb-4">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200">
                      <span className="text-3xl">🎯</span>
                    </div>
                  </div>
                  <p className="text-gray-600 font-medium">{t('myExperiments.sections.approved.empty')}</p>
                  <p className="text-sm text-gray-500 mt-1">{t('myExperiments.sections.approved.emptySubtitle')}</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="bg-gradient-to-r from-emerald-50 via-emerald-50 to-teal-50 px-6 py-4 border-b-2 border-emerald-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-emerald-900">{t('myExperiments.sections.approved.tableTitle')}</h3>
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {t('myExperiments.table.count_one', { count: experimentsAprovados.length })}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-900 uppercase tracking-wider w-12">
                            <input
                              type="checkbox"
                              checked={selectedExperimentIds.length > 0 && selectedExperimentIds.length === paginatedAprovados.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedExperimentIds(paginatedAprovados.map((exp) => exp.experiment_id))
                                } else {
                                  handleClearSelection()
                                }
                              }}
                              className="rounded w-4 h-4 cursor-pointer"
                              title="Selecionar/Desselecionar todos nesta página"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            {t('myExperiments.table.columns.index')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            {t('myExperiments.table.columns.status')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            {t('myExperiments.table.columns.date')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            {t('myExperiments.table.columns.machine')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            {t('myExperiments.table.columns.material')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            {t('myExperiments.table.columns.sample')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            {t('myExperiments.table.columns.infill')}
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            {t('myExperiments.table.columns.data')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            {t('myExperiments.table.columns.details')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedAprovados.map((experiment, index) => {
                          const statusBadge = getStatusBadge(experiment)
                          return (
                            <tr key={experiment.experiment_id || `experiment-${index}`} className="hover:bg-gray-50 transition-colors">
                              {/* Checkbox */}
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedExperimentIds.includes(experiment.experiment_id)}
                                  onChange={() => toggleExperimentSelection(experiment.experiment_id)}
                                  className="rounded w-4 h-4 cursor-pointer"
                                  title="Selecionar para comparação"
                                />
                              </td>

                              {/* Index */}
                              <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                {experiment.index_visual || '-'}
                              </td>

                              {/* Status */}
                              <td className="px-6 py-4 text-sm">
                                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-xs ${statusBadge.bgColor} ${statusBadge.textColor}`}>
                                  {statusBadge.icon} {statusBadge.label}
                                </span>
                              </td>

                              {/* Data */}
                              <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                {formatDate(experiment.created_at)}
                              </td>

                              {/* Máquina */}
                              <td className="px-6 py-4 text-sm">
                                <div className="font-medium text-gray-900">
                                  {experiment.machine_brand || '-'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {experiment.machine_model || '-'}
                                </div>
                              </td>

                              {/* Material */}
                              <td className="px-6 py-4 text-sm">
                                <div className="font-medium text-gray-900">
                                  {experiment.material_brand || '-'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {experiment.material_model || '-'}
                                </div>
                              </td>

                              {/* Amostra (Forma) */}
                              <td className="px-6 py-4 text-sm">
                                <div className="font-medium text-gray-900">
                                  {getShapeEmoji(experiment.shape_type)} {experiment.shape_type || '-'}
                                </div>
                              </td>

                              {/* Infill (HU) */}
                              <td className="px-6 py-4 text-sm">
                                {experiment.infill_count > 0 ? (
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {formatNumber(experiment.infill_hu_mean)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      ({experiment.infill_count} med.)
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>

                              {/* Dados Técnicos */}
                              <td className="px-6 py-4 text-sm text-center">
                                <div className="flex gap-2 justify-center items-center">
                                  {experiment.mechanical_tests && (
                                    <span className="text-lg cursor-help hover:scale-110 transition-transform" title="Propriedades Mecânicas">
                                      ⚙️
                                    </span>
                                  )}
                                  {(experiment.attenuation_count ?? 0) > 0 && (
                                    <span className="text-lg cursor-help hover:scale-110 transition-transform" title="Atenuação Linear">
                                      📉
                                    </span>
                                  )}
                                  {experiment.beam_qualities_exists && (
                                    <span className="text-lg cursor-help hover:scale-110 transition-transform" title="Qualidades de Feixe">
                                      ☢️
                                    </span>
                                  )}
                                  {!experiment.mechanical_tests && (experiment.attenuation_count ?? 0) === 0 && !experiment.beam_qualities_exists && (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </div>
                              </td>

                              {/* Detalhes */}
                              <td className="px-6 py-4 text-sm">
                                <button
                                  onClick={() => handleViewDetails(experiment.experiment_id, 'aprovados')}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all hover:shadow-sm font-medium text-xs"
                                >
                                  <Eye className="h-4 w-4" />
                                  {t('myExperiments.table.buttons.view')}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination for Aprovados */}
                  {totalPagesAprovados > 1 && (
                    <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setCurrentPageAprovados(prev => Math.max(prev - 1, 1))}
                        disabled={currentPageAprovados === 1}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('myExperiments.table.pagination.previous')}
                      </button>
                      <div className="flex gap-1">
                        {Array.from({ length: totalPagesAprovados }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPageAprovados(page)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                              currentPageAprovados === page
                                ? 'bg-green-600 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentPageAprovados(prev => Math.min(prev + 1, totalPagesAprovados))}
                        disabled={currentPageAprovados === totalPagesAprovados}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('myExperiments.table.pagination.next')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Help Section - Sistema de Análise */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
          <button
            onClick={() => setIsHelpExpanded(!isHelpExpanded)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                <span className="text-lg">ℹ️</span>
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-900">{t('myExperiments.help.title')}</h3>
                <p className="text-sm text-gray-500 mt-1">{t('myExperiments.help.subtitle')}</p>
              </div>
            </div>
            <ChevronDown
              className={`h-6 w-6 text-gray-600 transition-transform ${isHelpExpanded ? 'transform rotate-180' : ''}`}
            />
          </button>

          {isHelpExpanded && (
            <div className="border-t border-gray-200 px-6 py-6 space-y-6">
              {/* Fluxo de Processos */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span>📊</span> {t('myExperiments.help.analysisFlow')}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex-shrink-0">
                      1
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{t('myExperiments.help.step1.title')}</div>
                      <p className="text-sm text-gray-600 mt-0.5">{t('myExperiments.help.step1.description')}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 font-bold text-sm flex-shrink-0">
                      2
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{t('myExperiments.help.step2.title')}</div>
                      <p className="text-sm text-gray-600 mt-0.5">{t('myExperiments.help.step2.description')}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-bold text-sm flex-shrink-0">
                      3
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{t('myExperiments.help.step3.title')}</div>
                      <p className="text-sm text-gray-600 mt-0.5">{t('myExperiments.help.step3.description')}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm flex-shrink-0">
                      4
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{t('myExperiments.help.step4.title')}</div>
                      <p className="text-sm text-gray-600 mt-0.5">{t('myExperiments.help.step4.description')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Critérios de Análise */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>✓</span> {t('myExperiments.help.criteria')}
                </h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="text-sm text-gray-700 flex gap-2">
                    <span className="text-blue-600 flex-shrink-0">•</span>
                    <span>{t('myExperiments.help.criterion1')}</span>
                  </div>
                  <div className="text-sm text-gray-700 flex gap-2">
                    <span className="text-blue-600 flex-shrink-0">•</span>
                    <span>{t('myExperiments.help.criterion2')}</span>
                  </div>
                  <div className="text-sm text-gray-700 flex gap-2">
                    <span className="text-blue-600 flex-shrink-0">•</span>
                    <span>{t('myExperiments.help.criterion3')}</span>
                  </div>
                  <div className="text-sm text-gray-700 flex gap-2">
                    <span className="text-blue-600 flex-shrink-0">•</span>
                    <span>{t('myExperiments.help.criterion4')}</span>
                  </div>
                </div>
              </div>

              {/* Período Estimado */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>⏱️</span> {t('myExperiments.help.timeframe')}
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-600">{t('myExperiments.help.timeframe1')}</div>
                      <div className="text-lg font-bold text-blue-600">{t('myExperiments.help.timeframe1Value')}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-600">{t('myExperiments.help.timeframe2')}</div>
                      <div className="text-lg font-bold text-yellow-600">{t('myExperiments.help.timeframe2Value')}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-600">{t('myExperiments.help.timeframe3')}</div>
                      <div className="text-lg font-bold text-orange-600">{t('myExperiments.help.timeframe3Value')}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-600">{t('myExperiments.help.timeframe4')}</div>
                      <div className="text-lg font-bold text-green-600">{t('myExperiments.help.timeframe4Value')}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dicas Úteis */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>💡</span> {t('myExperiments.help.tips')}
                </h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <span className="text-green-600 flex-shrink-0">✓</span>
                    <span>{t('myExperiments.help.tip1')}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-green-600 flex-shrink-0">✓</span>
                    <span>{t('myExperiments.help.tip2')}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-green-600 flex-shrink-0">✓</span>
                    <span>{t('myExperiments.help.tip3')}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-green-600 flex-shrink-0">✓</span>
                    <span>{t('myExperiments.help.tip4')}</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status History Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>📋</span> {t('myExperiments.statusHistory.title')}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {t('myExperiments.statusHistory.subtitle')}
              </p>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshingHistory}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              title={t('myExperiments.statusHistory.refreshButton')}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshingHistory ? 'animate-spin' : ''}`} />
              {isRefreshingHistory ? t('myExperiments.statusHistory.refreshing') : t('myExperiments.statusHistory.refreshButton')}
            </button>
          </div>

          <div className="p-6">
            {statusHistoryLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              </div>
            ) : statusHistoryError ? (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900">{t('myExperiments.errorMessages.historyLoadFailed')}</h3>
                  <p className="text-sm text-red-700">{statusHistoryError}</p>
                </div>
              </div>
            ) : statusHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-5xl mb-3">📭</div>
                <p className="text-gray-600">{t('myExperiments.statusHistory.noHistory')}</p>
              </div>
            ) : (
              <>
                {/* History Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">{t('myExperiments.statusHistory.columns.index')}</th>
                        <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">{t('myExperiments.statusHistory.columns.previousStatus')}</th>
                        <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">{t('myExperiments.statusHistory.columns.newStatus')}</th>
                        <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">{t('myExperiments.statusHistory.columns.changedBy')}</th>
                        <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">{t('myExperiments.statusHistory.columns.comment')}</th>
                        <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">{t('myExperiments.statusHistory.columns.date')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {statusHistory
                        .slice(
                          (currentStatusHistoryPage - 1) * statusHistoryPerPage,
                          currentStatusHistoryPage * statusHistoryPerPage
                        )
                        .map((record: any, displayIndex: number) => {
                          const statusColors = getStatusTransitionColors(record.old_status, record.new_status)
                          const oldStatusLabel = getStatusLabelForHistory(record.old_status)
                          const newStatusLabel = getStatusLabel(record.new_status)
                          const visualIndex = experimentIndexMap[record.sample_id] || '-'
                          
                          return (
                            <tr
                              key={displayIndex}
                              className={`transition hover:bg-gray-50 ${displayIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                            >
                              <td className="px-3 sm:px-4 py-3 font-semibold text-gray-900">
                                {visualIndex}
                              </td>
                              <td className="px-3 sm:px-4 py-3">
                                {record.old_status ? (
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors.old}`}>
                                    {oldStatusLabel}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-3 sm:px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors.new}`}>
                                  {newStatusLabel}
                                </span>
                              </td>
                              <td className="px-3 sm:px-4 py-3 text-gray-600 truncate max-w-xs">
                                <div className="flex items-center gap-1">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    record.changed_by_role === 'admin'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {record.changed_by_role === 'admin' ? '🔐 Admin' : '👤 Pesquisador'}
                                  </span>
                                  <span className="text-gray-600">{record.changed_by_name}</span>
                                </div>
                              </td>
                              <td className="px-3 sm:px-4 py-3 text-gray-600 truncate max-w-xs">
                                {record.comment ? (
                                  <span
                                    title={record.comment}
                                    className="text-gray-800"
                                  >
                                    {record.comment.length > 30
                                      ? `${record.comment.substring(0, 30)}...`
                                      : record.comment}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-3 sm:px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                                {formatDate(record.created_at)}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {Math.ceil(statusHistory.length / statusHistoryPerPage) > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                      onClick={() =>
                        setCurrentStatusHistoryPage(Math.max(1, currentStatusHistoryPage - 1))
                      }
                      disabled={currentStatusHistoryPage === 1}
                      className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('myExperiments.statusHistory.pagination.previous')}
                    </button>
                    <div className="flex items-center gap-2">
                      {Array.from({
                        length: Math.ceil(statusHistory.length / statusHistoryPerPage)
                      }).map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => setCurrentStatusHistoryPage(i + 1)}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            currentStatusHistoryPage === i + 1
                              ? 'bg-green-600 text-white'
                              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() =>
                        setCurrentStatusHistoryPage(
                          Math.min(
                            Math.ceil(statusHistory.length / statusHistoryPerPage),
                            currentStatusHistoryPage + 1
                          )
                        )
                      }
                      disabled={
                        currentStatusHistoryPage ===
                        Math.ceil(statusHistory.length / statusHistoryPerPage)
                      }
                      className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('myExperiments.statusHistory.pagination.next')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Simplified Comparison Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-200 bg-gray-50">
        <SimplifiedExperimentComparison
          selectedIds={selectedExperimentIds}
          experiments={experiments}
        />
      </div>

      {/* Details Modal */}
      <ExperimentReportModal
        experimentId={selectedExperimentId || ''}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        showStatus={false}
        showEditButton={selectedExperimentSection === 'analise'}
      />
    </div>
  )
}
