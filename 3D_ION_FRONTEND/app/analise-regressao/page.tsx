'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, Download, RefreshCw, Filter } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { InfillHURegressionChart } from '@/components/experiments/charts/InfillHURegressionChart'
import { getNormalizedApiUrl } from '@/lib/api'
import { fetchWithAgent } from '@/lib/api-client'

function getAuthToken(): string | null {
  try {
    const userData = localStorage.getItem('user')
    if (!userData) return null
    const user = JSON.parse(userData)
    return user.access_token || user.token || null
  } catch {
    return null
  }
}

async function analysisGet<T>(endpoint: string): Promise<T> {
  const token = getAuthToken()
  const response = await fetchWithAgent(`${getNormalizedApiUrl()}${endpoint}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json() as Promise<T>
}

interface RegressionStats {
  a: number
  b: number
  r2: number
  p_value: number
  std_err: number
  num_points: number
  x_min: number
  x_max: number
  y_min: number
  y_max: number
}

interface RegressionGroup {
  label: string
  group_values: Record<string, string>
  points: Array<{ x: number; y: number }>
  regression: RegressionStats | null
  point_count: number
}

interface AnalysisResponse {
  groups: RegressionGroup[]
  overall_regression: RegressionStats | null
  metadata: {
    total_points: number
    total_groups: number
    filters: Record<string, any>
    x_axis_label?: string
    y_axis_label?: string
  }
}

interface FilterOption {
  id: string
  label: string
}

interface AvailableFilters {
  materials: FilterOption[]
  patterns: string[]
  machines: FilterOption[]
}

export default function AnalysisPage() {
  const router = useRouter()
  const { t } = useTranslation()

  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null)
  const [availableFilters, setAvailableFilters] = useState<AvailableFilters | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [selectedMaterial, setSelectedMaterial] = useState<string>('')
  const [selectedPattern, setSelectedPattern] = useState<string>('')
  const [selectedMachine, setSelectedMachine] = useState<string>('')

  // Display options
  const [showEquation, setShowEquation] = useState(true)
  const [showR2, setShowR2] = useState(true)
  const [showRegressionLine, setShowRegressionLine] = useState(true)

  // Fetch available filters
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const data = await analysisGet<AvailableFilters>('/analysis/filters')
        setAvailableFilters(data)
      } catch (err) {
        console.error('Error loading filters:', err)
        setError('Erro ao carregar filtros disponíveis')
      }
    }

    loadFilters()
  }, [])

  // Fetch analysis data
  const loadAnalysis = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (selectedMaterial) params.append('material_id', selectedMaterial)
      if (selectedPattern) params.append('pattern_type', selectedPattern)
      if (selectedMachine) params.append('machine_id', selectedMachine)

      const data = await analysisGet<AnalysisResponse>(
        `/analysis/infill-hu?${params.toString()}`
      )

      setAnalysisData(data)
    } catch (err) {
      console.error('Error loading analysis:', err)
      setError('Erro ao carregar dados de análise')
    } finally {
      setLoading(false)
    }
  }, [selectedMaterial, selectedPattern, selectedMachine])

  // Load analysis when page mounts or filters change
  useEffect(() => {
    loadAnalysis()
  }, [loadAnalysis])

  // Handle export
  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const params = new URLSearchParams()
      if (selectedMaterial) params.append('material_id', selectedMaterial)
      if (selectedPattern) params.append('pattern_type', selectedPattern)
      if (selectedMachine) params.append('machine_id', selectedMachine)
      params.append('format', format)

      const token = getAuthToken()
      const response = await fetchWithAgent(
        `${getNormalizedApiUrl()}/analysis/infill-hu/export?${params.toString()}`,
        {
          method: 'GET',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const element = document.createElement('a')
      if (format === 'csv') {
        const csvText = await response.text()
        element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csvText)}`)
        element.setAttribute('download', 'infill_hu_regression.csv')
      } else {
        const jsonData = await response.json()
        const jsonString = JSON.stringify(jsonData, null, 2)
        element.setAttribute('href', `data:text/json;charset=utf-8,${encodeURIComponent(jsonString)}`)
        element.setAttribute('download', 'infill_hu_regression.json')
      }

      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
    } catch (err) {
      console.error(`Error exporting ${format}:`, err)
      setError(`Erro ao exportar dados em formato ${format.toUpperCase()}`)
    }
  }

  if (!availableFilters) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-600 text-sm">Carregando análise de regressão...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📊 Análise de Regressão Linear
          </h1>
          <p className="text-gray-600">
            Infill (%) vs Hounsfield Units (HU)
          </p>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            {/* Material Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Material
              </label>
              <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="">Todos os materiais</option>
                {availableFilters?.materials?.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Pattern Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Padrão de Preenchimento
              </label>
              <select
                value={selectedPattern}
                onChange={(e) => setSelectedPattern(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="">Todos os padrões</option>
                {availableFilters?.patterns?.map((pattern) => (
                  <option key={pattern} value={pattern}>
                    {pattern}
                  </option>
                ))}
              </select>
            </div>

            {/* Machine Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Máquina
              </label>
              <select
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="">Todas as máquinas</option>
                {availableFilters?.machines?.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <div className="flex items-end">
              <button
                onClick={loadAnalysis}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Carregando...' : 'Atualizar'}
              </button>
            </div>
          </div>

          {/* Display Options */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Opções de Visualização</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showEquation}
                  onChange={(e) => setShowEquation(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">Mostrar Equação</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showR2}
                  onChange={(e) => setShowR2(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">Mostrar R²</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRegressionLine}
                  onChange={(e) => setShowRegressionLine(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">Mostrar Linha de Regressão</span>
              </label>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="border-t border-gray-200 mt-4 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Exportar Dados</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('csv')}
                disabled={!analysisData || analysisData.metadata.total_points === 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                disabled={!analysisData || analysisData.metadata.total_points === 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar JSON
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Erro</p>
              <p className="text-sm text-red-800 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Chart Section */}
        {analysisData && (
          <InfillHURegressionChart
            groups={analysisData.groups}
            overallRegression={analysisData.overall_regression}
            metadata={analysisData.metadata}
            isLoading={loading}
            showEquation={showEquation}
            showR2={showR2}
            showRegressionLine={showRegressionLine}
          />
        )}

        {/* Empty State */}
        {!loading && analysisData && analysisData.groups.length === 0 && !error && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600">Nenhum dado encontrado para os filtros selecionados</p>
            <p className="text-gray-400 text-sm mt-1">Tente ajustar os filtros e tentar novamente</p>
          </div>
        )}
      </div>
    </div>
  )
}
