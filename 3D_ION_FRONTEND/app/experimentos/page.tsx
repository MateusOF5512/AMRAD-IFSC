'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, AlertCircle, Plus, Eye, ChevronDown, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ExperimentReportModal } from '@/components/experiments/ExperimentReportModal'
import { ExperimentComparison } from '@/components/experiments/comparison/ExperimentComparison'
import { fetchWithAgent } from '@/lib/api-client'
import { logger } from '@/lib/logger'
import { getNormalizedApiUrl } from '@/lib/api'
import { getPublicEnv } from '@/lib/public-env'

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
  status?: string
}

interface ExperimentsResponse {
  success: boolean
  count: number
  experiments: ExperimentSummary[]
}

export default function ExperimentsPage() {
  const router = useRouter()
  const { t, ready, i18n } = useTranslation()
  const [user, setUser] = useState<{ user_id: string; name: string; email: string } | null>(null)
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedExperimentIds, setSelectedExperimentIds] = useState<string[]>([])
  const [filters, setFilters] = useState({
    researcher_name: '',
    researcher_institution: '',
    material_brand: '',
    machine_brand: '',
    shape_type: '',
    infill_hu_min: '',
    infill_hu_max: '',
    has_mechanical: false,
    has_attenuation: false,
    has_beam: false,
    no_data: false,
    date_from: '',
    date_to: ''
  })
  const [filteredExperiments, setFilteredExperiments] = useState<ExperimentSummary[]>([])
  const [filtersApplied, setFiltersApplied] = useState(false)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)
  const [filterOptions, setFilterOptions] = useState({
    materials: [] as string[],
    machines: [] as string[],
    shapes: [] as string[],
    institutions: [] as string[]
  })
  const [loadingFilterOptions, setLoadingFilterOptions] = useState(true)

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setLoadingFilterOptions(true)
        
        let apiUrl = getNormalizedApiUrl()
        if (!apiUrl.includes('/api/v1')) {
          apiUrl = apiUrl.replace(/\/$/, '') + '/api/v1'
        }
        
        const url = `${apiUrl}/experiments/filter-options`
        
        const response = await fetchWithAgent(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setFilterOptions({
              materials: data.materials || [],
              machines: data.machines || [],
              shapes: data.shapes || [],
              institutions: data.institutions || []
            })
          }
        }
      } catch (err) {
        logger.error('experimentos', err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoadingFilterOptions(false)
      }
    }

    fetchFilterOptions()
  }, [])

  // Check if user is authenticated
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch {
        setUser(null)
      }
    }
  }, [])

  // Fetch experiments with summary data
  useEffect(() => {
    const fetchExperiments = async () => {
      try {
        setLoading(true)
        setError(null)

        // Normalizando a URL para evitar duplicação de /api/v1
        let apiUrl = getNormalizedApiUrl()
        
        // Se a URL não termina com /api/v1, adiciona
        if (!apiUrl.includes('/api/v1')) {
          apiUrl = apiUrl.replace(/\/$/, '') + '/api/v1'
        }
        
        const url = `${apiUrl}/experiments/resumo?skip=0&limit=100`

        const response = await fetchWithAgent(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            errorData.detail || 
            `HTTP ${response.status}: Erro ao buscar experimentos. Verifique se o servidor backend está rodando em ${apiUrl.replace('/api/v1', '')}`
          )
        }

        const data: ExperimentsResponse = await response.json()

        // Filter only approved experiments (status === "Approved")
        const approvedExperiments = (data.experiments || []).filter(
          exp => exp.status === 'Approved'
        )
        
        setExperiments(approvedExperiments)
      } catch (err) {
        logger.error('experimentos', err instanceof Error ? err.message : 'Unknown error')
        const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar experimentos'
        
        let displayError = errorMessage
        
        // Tratamento específico para erros comuns
        if (errorMessage.includes('CERTIFICATE_VERIFY_FAILED') || errorMessage.includes('self-signed')) {
          displayError = 
            '❌ Erro de Certificado SSL:\n\n' +
            'O servidor backend está usando um certificado auto-assinado.\n' +
            'Esta situação está sendo ignorada em modo desenvolvedor.\n\n' +
            'Se o problema persistir:\n' +
            '1. Verifique se o servidor está rodando\n' +
            '2. Confirme a URL da API: ' + getPublicEnv().apiUrl + '\n' +
            '3. Consulte os logs do servidor para mais detalhes'
        } else if (errorMessage.includes('Failed to fetch')) {
          displayError = 
            '❌ Erro de Conexão: Não conseguiu conectar ao servidor.\n\n' +
            'Possíveis causas:\n' +
            '1. Backend não está rodando (' + getPublicEnv().apiUrl + ')\n' +
            '2. CORS bloqueado - verifique a configuração\n' +
            '3. Problema de rede ou firewall\n\n' +
            'Verifique o console do navegador (F12) para mais detalhes.'
        } else if (errorMessage.includes('HTTP 500')) {
          displayError = 
            '❌ Erro no Servidor (500):\n\n' +
            'O servidor respondeu com um erro interno.\n' +
            'Verifique os logs do backend para mais informações.'
        }
        
        setError(displayError)
      } finally {
        setLoading(false)
      }
    }

    fetchExperiments()
  }, [])

  // Pagination calculations
  const displayedExperiments = filtersApplied ? filteredExperiments : experiments
  const totalPages = Math.ceil(displayedExperiments.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedExperiments = displayedExperiments.slice(
    startIndex,
    startIndex + itemsPerPage
  )

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

  // Apply filters
  const applyFilters = () => {
    let filtered = experiments
    
    if (filters.researcher_name) {
      filtered = filtered.filter(e => 
        e.researcher_name?.toLowerCase() === filters.researcher_name.toLowerCase()
      )
    }
    
    if (filters.researcher_institution) {
      filtered = filtered.filter(e => 
        e.researcher_institution?.toLowerCase() === filters.researcher_institution.toLowerCase()
      )
    }
    
    if (filters.material_brand) {
      filtered = filtered.filter(e => 
        e.material_brand?.toLowerCase() === filters.material_brand.toLowerCase()
      )
    }
    
    if (filters.machine_brand) {
      filtered = filtered.filter(e => 
        e.machine_brand?.toLowerCase() === filters.machine_brand.toLowerCase()
      )
    }
    
    if (filters.shape_type) {
      filtered = filtered.filter(e => 
        e.shape_type?.toLowerCase() === filters.shape_type.toLowerCase()
      )
    }
    
    if (filters.infill_hu_min) {
      filtered = filtered.filter(e => 
        e.infill_hu_mean && e.infill_hu_mean >= parseFloat(filters.infill_hu_min)
      )
    }
    
    if (filters.infill_hu_max) {
      filtered = filtered.filter(e => 
        e.infill_hu_mean && e.infill_hu_mean <= parseFloat(filters.infill_hu_max)
      )
    }
    
    if (filters.has_mechanical) {
      filtered = filtered.filter(e => e.mechanical_tests)
    }
    
    if (filters.has_attenuation) {
      filtered = filtered.filter(e => e.attenuation_count && e.attenuation_count > 0)
    }
    
    if (filters.has_beam) {
      filtered = filtered.filter(e => e.beam_qualities_exists)
    }
    
    if (filters.no_data) {
      filtered = filtered.filter(e => !e.mechanical_tests && (!e.attenuation_count || e.attenuation_count === 0) && !e.beam_qualities_exists)
    }
    
    if (filters.date_from) {
      filtered = filtered.filter(e => {
        if (!e.created_at) return false
        return new Date(e.created_at) >= new Date(filters.date_from)
      })
    }
    
    if (filters.date_to) {
      filtered = filtered.filter(e => {
        if (!e.created_at) return false
        return new Date(e.created_at) <= new Date(filters.date_to)
      })
    }
    
    setFilteredExperiments(filtered)
    setFiltersApplied(true)
    setCurrentPage(1)
  }
  
  const clearFilters = () => {
    setFilters({
      researcher_name: '',
      researcher_institution: '',
      material_brand: '',
      machine_brand: '',
      shape_type: '',
      infill_hu_min: '',
      infill_hu_max: '',
      has_mechanical: false,
      has_attenuation: false,
      has_beam: false,
      no_data: false,
      date_from: '',
      date_to: ''
    })
    setFiltersApplied(false)
    setCurrentPage(1)
  }

  // Handle opening details modal
  const handleViewDetails = (experimentId: string) => {
    setSelectedExperimentId(experimentId)
    setIsModalOpen(true)
  }

  // Handle closing details modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedExperimentId(null)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted">{ready ? t('experiments.loading') : 'Loading...'}</p>
        </div>
      </div>
    )
  }

 if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted">Initializing...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {t('experiments.allExperiments')}
              </h1>
              <p className="mt-2 text-muted">
                {t('experiments.availableCount', { count: experiments.length })}
              </p>
            </div>
            <div className="flex gap-2">
              {user && (
                <Link
                  href="/novo-experimento"
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  {t('experiments.newExperiment')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-100 rounded-lg border border-border">
            {/* Filter Header / Toggle */}
            <button
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-100 transition-colors"
            >
              <h3 className="text-sm font-semibold text-foreground">{t('experiments.filters.toggle')}</h3>
              <ChevronDown
                size={20}
                className={`text-muted transition-transform ${isFiltersExpanded ? 'transform rotate-180' : ''}`}
              />
            </button>

            {/* Filter Content - Expandable */}
            {isFiltersExpanded && (
              <div className="border-t border-border px-6 pb-6 pt-6 space-y-4">
                {/* Row 1: Text Input - Pesquisador */}
                <div className="grid grid-cols-1 gap-3">
                  <input
                    type="text"
                    placeholder={t('experiments.filters.researcher')}
                    value={filters.researcher_name}
                    onChange={(e) => setFilters({...filters, researcher_name: e.target.value})}
                    className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {/* Row 2: Select Dropdowns - Instituição, Material, Máquina */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Instituição */}
                  <select
                    value={filters.researcher_institution}
                    onChange={(e) => setFilters({...filters, researcher_institution: e.target.value})}
                    className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 bg-surface"
                  >
                    <option value="">{t('experiments.filters.allInstitutions')}</option>
                    {filterOptions.institutions.map((inst) => (
                      <option key={inst} value={inst}>
                        {inst}
                      </option>
                    ))}
                  </select>
                  
                  {/* Material */}
                  <select
                    value={filters.material_brand}
                    onChange={(e) => setFilters({...filters, material_brand: e.target.value})}
                    className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 bg-surface"
                  >
                    <option value="">{t('experiments.filters.allMaterials')}</option>
                    {filterOptions.materials.map((mat) => (
                      <option key={mat} value={mat}>
                        {mat}
                      </option>
                    ))}
                  </select>
                  
                  {/* Máquina */}
                  <select
                    value={filters.machine_brand}
                    onChange={(e) => setFilters({...filters, machine_brand: e.target.value})}
                    className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 bg-surface"
                  >
                    <option value="">{t('experiments.filters.allMachines')}</option>
                    {filterOptions.machines.map((maq) => (
                      <option key={maq} value={maq}>
                        {maq}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Row 3: Other Inputs - Formato, HU, Datas */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {/* Formato Amostra */}
                  <select
                    value={filters.shape_type}
                    onChange={(e) => setFilters({...filters, shape_type: e.target.value})}
                    className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 bg-surface"
                  >
                    <option value="">{t('experiments.filters.allFormats')}</option>
                    {filterOptions.shapes.map((fmt) => (
                      <option key={fmt} value={fmt}>
                        {fmt}
                      </option>
                    ))}
                  </select>
                  
                  {/* HU Min */}
                  <input
                    type="number"
                    placeholder={t('experiments.filters.huMin')}
                    value={filters.infill_hu_min}
                    onChange={(e) => setFilters({...filters, infill_hu_min: e.target.value})}
                    className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  
                  {/* HU Max */}
                  <input
                    type="number"
                    placeholder={t('experiments.filters.huMax')}
                    value={filters.infill_hu_max}
                    onChange={(e) => setFilters({...filters, infill_hu_max: e.target.value})}
                    className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  
                  {/* Data From */}
                  <input
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => setFilters({...filters, date_from: e.target.value})}
                    className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  
                  {/* Data To */}
                  <input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => setFilters({...filters, date_to: e.target.value})}
                    className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {/* Row 4: Checkboxes - Dados do Experimento */}
                <div className="flex flex-wrap gap-4 items-center pt-2 pb-2">
                  <span className="text-sm font-semibold text-foreground">{t('experiments.filters.dataTitle')}</span>
                
                  {/* Checkboxes for optional data */}
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.has_mechanical}
                      onChange={(e) => setFilters({...filters, has_mechanical: e.target.checked})}
                      className="rounded w-4 h-4 cursor-pointer"
                    />
                    <span className="text-foreground">{t('experiments.filters.mechanical')}</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.has_attenuation}
                      onChange={(e) => setFilters({...filters, has_attenuation: e.target.checked})}
                      className="rounded w-4 h-4 cursor-pointer"
                    />
                    <span className="text-foreground">{t('experiments.filters.attenuation')}</span>
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.has_beam}
                      onChange={(e) => setFilters({...filters, has_beam: e.target.checked})}
                      className="rounded w-4 h-4 cursor-pointer"
                    />
                    <span className="text-foreground">{t('experiments.filters.beamQuality')}</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.no_data}
                      onChange={(e) => setFilters({...filters, no_data: e.target.checked})}
                      className="rounded w-4 h-4 cursor-pointer"
                    />
                    <span className="text-foreground">{t('experiments.filters.noData')}</span>
                  </label>
                </div>

                {/* Row 5: Action Buttons */}
                <div className="flex gap-3 flex-wrap pt-2">
                  <button
                    onClick={applyFilters}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
                  >
                    {t('experiments.filters.applyFilters')}
                  </button>
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-slate-300 text-foreground rounded-lg hover:bg-slate-400 transition-colors text-sm font-medium"
                  >
                    {t('experiments.filters.clearFilters')}
                  </button>
                  {filtersApplied && (
                    <span className="text-sm text-muted py-2 ml-2">
                      {t('experiments.filters.results', { count: displayedExperiments.length })}
                    </span>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">{t('experiments.loadError')}</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {experiments.length === 0 ? (
          <div className="bg-surface rounded-lg shadow p-12 text-center">
            <p className="text-muted mb-4">{t('experiments.empty.title')}</p>
            {user && (
              <Link
                href="/novo-experimento"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              >
                <Plus className="h-5 w-5" />
                {t('experiments.empty.createFirst')}
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Table Header with Modern Design */}
            <div className="bg-surface rounded-lg shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-linear-to-r from-green-50 via-green-50 to-emerald-50 px-6 py-4 border-b-2 border-primary/30">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-primary">{t('experiments.allExperiments')}</h3>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-muted text-primary font-semibold text-sm">
                    <span className="w-2 h-2 rounded-full bg-primary-light0"></span>
                    {displayedExperiments.length} {displayedExperiments.length === 1 ? t('experiments.table.singularExperiment') : t('experiments.table.pluralExperiments')}
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider w-12">
                        <input
                          type="checkbox"
                          checked={selectedExperimentIds.length > 0 && selectedExperimentIds.length === paginatedExperiments.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedExperimentIds(paginatedExperiments.map((exp) => exp.experiment_id))
                            } else {
                              handleClearSelection()
                            }
                          }}
                          className="rounded w-4 h-4 cursor-pointer"
                          title={t('experiments.table.selectAllTooltip')}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                        {t('experiments.table.columns.index')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                        {t('experiments.table.columns.date')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                        {t('experiments.table.columns.researcher')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                        {t('experiments.table.columns.material')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                        {t('experiments.table.columns.machine')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                        {t('experiments.table.columns.sample')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                        {t('experiments.table.columns.infill')}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">
                        {t('experiments.table.columns.data')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                        {t('experiments.table.columns.details')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedExperiments.map((experiment, index) => (
                      <tr key={experiment.experiment_id || `experiment-${index}`} className={`transition-colors ${
                        selectedExperimentIds.includes(experiment.experiment_id)
                          ? 'bg-primary-light hover:bg-primary-muted'
                          : 'hover:bg-background'
                      }`}>
                        {/* Checkbox */}
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedExperimentIds.includes(experiment.experiment_id)}
                            onChange={() => toggleExperimentSelection(experiment.experiment_id)}
                            className="rounded w-4 h-4 cursor-pointer"
                            title={t('experiments.table.selectForComparison')}
                          />
                        </td>

                        {/* Index */}
                        <td className="px-4 py-3 text-sm font-semibold text-foreground">
                          {experiment.index_visual || '-'}
                        </td>

                        {/* Data */}
                        <td className="px-4 py-3 text-sm text-muted font-medium">
                          {formatDate(experiment.created_at)}
                        </td>

                        {/* Pesquisador */}
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-foreground">
                            {experiment.researcher_name || '-'}
                          </div>
                          <div className="text-xs text-muted">
                            {experiment.researcher_institution || '-'}
                          </div>
                        </td>

                        {/* Material */}
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-foreground">
                            {experiment.material_brand || '-'}
                          </div>
                          <div className="text-xs text-muted">
                            {experiment.material_model || '-'}
                          </div>
                          {experiment.material_color && (
                            <div className="text-xs text-muted">
                              {t('experiments.table.color')} {experiment.material_color}
                            </div>
                          )}
                        </td>

                        {/* Máquina */}
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-foreground">
                            {experiment.machine_brand || '-'}
                          </div>
                          <div className="text-xs text-muted">
                            {experiment.machine_model || '-'}
                          </div>
                          {experiment.machine_technology && (
                            <div className="text-xs text-muted">
                              {experiment.machine_technology}
                            </div>
                          )}
                        </td>

                        {/* Amostra */}
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium text-foreground">
                                {getShapeEmoji(experiment.shape_type)} {experiment.shape_type || '-'}
                              </div>
                              {experiment.dimension_a && experiment.dimension_b && (
                                <div className="text-xs text-muted">
                                  {formatNumber(experiment.dimension_a, 1)} × {formatNumber(experiment.dimension_b, 1)}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Infill HU Mean */}
                        <td className="px-4 py-3 text-sm">
                          {experiment.infill_count > 0 ? (
                            <div>
                              <div className="font-medium text-foreground">
                                {formatNumber(experiment.infill_hu_mean)}
                              </div>
                              <div className="text-xs text-muted">
                                ({experiment.infill_count} {t('experiments.table.measurements')})
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>

                        {/* Dados Técnicos - Resume only 3 optional characteristics with emojis */}
                        <td className="px-4 py-3 text-sm text-center h-full">
                          <div className="flex gap-3 justify-center items-center h-full">
                            {experiment.mechanical_tests && (
                              <span className="text-lg cursor-help" title={t('experiments.table.tooltips.mechanical')}>
                                ⚙️
                              </span>
                            )}
                            {(experiment.attenuation_count ?? 0) > 0 && (
                              <span className="text-lg cursor-help" title={t('experiments.table.tooltips.attenuation')}>
                                📉
                              </span>
                            )}
                            {experiment.beam_qualities_exists && (
                              <span className="text-lg cursor-help" title={t('experiments.table.tooltips.beamQuality')}>
                                ☢️
                              </span>
                            )}
                            {!experiment.mechanical_tests && experiment.attenuation_count === 0 && !experiment.beam_qualities_exists && (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </div>
                        </td>

                        {/* Detalhes Button */}
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleViewDetails(experiment.experiment_id)}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-primary-muted text-primary rounded-lg hover:bg-green-200 transition-colors font-medium text-xs"
                            title={t('experiments.table.viewDetails')}
                          >
                            <Eye className="h-4 w-4" />
                            {t('experiments.table.viewButton')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded text-sm font-medium bg-surface border border-border text-foreground hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.pagination.previous')}
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded text-sm font-medium ${
                      currentPage === page
                        ? 'bg-primary text-white'
                        : 'bg-surface border border-border text-foreground hover:bg-background'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 rounded text-sm font-medium bg-surface border border-border text-foreground hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.pagination.next')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Comparison Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-border bg-background">
        <ExperimentComparison
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
      />
    </div>
  )
}
