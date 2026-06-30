'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { transformApiDataToEditFormat, EditExperimentData } from '@/lib/utils/transformExperimentData'
import { logger } from '@/lib/logger'
import { getNormalizedApiUrl } from '@/lib/api'

// ⚡ PERFORMANCE: Lazy load heavy components
const ExperimentEditWizard = dynamic(() => import('./ExperimentEditWizard'), { ssr: false })
const LinearAttenuationChart = dynamic(() => import('./charts/LinearAttenuationChart').then(m => ({ default: m.LinearAttenuationChart })), { ssr: false })

interface ExperimentReportModalProps {
  experimentId: string
  isOpen: boolean
  onClose: () => void
  showStatus?: boolean
  showEditButton?: boolean
}

export function ExperimentReportModal({ 
  experimentId, 
  isOpen, 
  onClose,
  showStatus = false,
  showEditButton = false
}: ExperimentReportModalProps) {
  const { t, i18n } = useTranslation()
  const [experimentData, setExperimentData] = useState<any | null>(null)
  const [editData, setEditData] = useState<EditExperimentData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (!isOpen || !experimentId) return

    const fetchExperimentDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        let apiUrl = getNormalizedApiUrl()
        if (!apiUrl.includes('/api/v1')) {
          apiUrl = apiUrl.replace(/\/$/, '') + '/api/v1'
        }

        const response = await fetch(`${apiUrl}/experiments/${experimentId}/detalhes`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Erro ao carregar detalhes do experimento')
        }

        const data = await response.json()
        setExperimentData(data)
        // Transform data for editing (but don't show edit mode yet)
        const transformed = transformApiDataToEditFormat(data)
        setEditData(transformed)
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados')
        logger.error('ExperimentReportModal', err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchExperimentDetails()
  }, [experimentId, isOpen])

  if (!isOpen) return null

  // ============================================================
  // HELPER FUNCTIONS - Declare all functions BEFORE JSX
  // ============================================================

  const getStatusBadge = (status?: string) => {
    if (status === 'Approved') {
      return { label: t('experiments.report.status.approved'), icon: '✅', bgColor: 'bg-primary-muted', textColor: 'text-primary' }
    }
    if (status === 'Submitted') {
      return { label: t('experiments.report.status.submitted'), icon: '📤', bgColor: 'bg-blue-100', textColor: 'text-blue-800' }
    }
    if (status === 'Review') {
      return { label: t('experiments.report.status.review'), icon: '🔍', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' }
    }
    if (status === 'Revisions') {
      return { label: t('experiments.report.status.revisions'), icon: '⚠️', bgColor: 'bg-orange-100', textColor: 'text-orange-800' }
    }
    return { label: status || t('experiments.report.status.unknown'), icon: '❓', bgColor: 'bg-slate-100', textColor: 'text-foreground' }
  }

  const getShapeEmoji = (shapeType?: string): string => {
    if (!shapeType) return '📦'
    const type = shapeType.toLowerCase()
    if (type.includes('cylinder') || type.includes('cilindro')) return '🔴'
    if (type.includes('cube') || type.includes('cubo')) return '📦'
    if (type.includes('sphere') || type.includes('esfera')) return '⚪'
    if (type.includes('rectangular') || type.includes('retangular')) return '▭'
    return '📦'
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-'
    const dateObj = new Date(dateString)
    const hour = String(dateObj.getHours()).padStart(2, '0')
    const minute = String(dateObj.getMinutes()).padStart(2, '0')
    const time = `${hour}:${minute}`
    
    if (i18n.language === 'en' || i18n.language === 'en-US' || i18n.language === 'en-GB') {
      // English format: yyyy/mm/dd hh:mm
      const year = dateObj.getFullYear()
      const month = String(dateObj.getMonth() + 1).padStart(2, '0')
      const day = String(dateObj.getDate()).padStart(2, '0')
      return `${year}/${month}/${day} ${time}`
    }
    // Portuguese format: dd/mm/yyyy hh:mm
    return dateObj.toLocaleString('pt-BR')
  }

  const formatNumber = (value?: number | string, decimals: number = 2) => {
    if (value === undefined || value === null) return '-'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '-'
    return num.toFixed(decimals)
  }

  const isStageComplete = (stageName: string): boolean => {
    switch (stageName) {
      case 'material_machine':
        return !!(experimentData.material_brand || experimentData.material_model) && 
               !!(experimentData.machine_brand || experimentData.machine_model)
      case 'sample':
        return !!(experimentData.shape_type && experimentData.shape_dimension)
      case 'infill':
        return experimentData.infill_measurements && experimentData.infill_measurements.length > 0
      case 'beam_quality':
        return experimentData.beam_qualities && Object.values(experimentData.beam_qualities).some((v: any) => v !== null)
      case 'linear_attenuation':
        return (
          (experimentData.linear_attenuation && experimentData.linear_attenuation.length > 0) ||
          (experimentData.attenuation_tests && experimentData.attenuation_tests.length > 0)
        )
      case 'mechanical':
        return experimentData.mechanical_properties && 
               Object.values(experimentData.mechanical_properties).some((v: any) => v !== null && v !== undefined)
      default:
        return false
    }
  }

  const getStageStyle = (isComplete: boolean) => {
    if (isComplete) {
      return {
        bgColor: 'bg-primary-light',
        borderColor: 'border-green-300',
        titleColor: 'text-primary',
        icon: '✅',
      }
    } else {
      return {
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-300',
        titleColor: 'text-orange-900',
        icon: '⚠️',
      }
    }
  }

  const handleEditComplete = async () => {
    // Exit edit mode and reload experiment data
    setIsEditing(false)
    
    // Reload experiment data from API
    try {
      let apiUrl = getNormalizedApiUrl()
      if (!apiUrl.includes('/api/v1')) {
        apiUrl = apiUrl.replace(/\/$/, '') + '/api/v1'
      }

      const response = await fetch(`${apiUrl}/experiments/${experimentId}/detalhes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setExperimentData(data)
        const transformed = transformApiDataToEditFormat(data)
        setEditData(transformed)
      }
    } catch (err) {
      logger.error('ExperimentReportModal', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleEditExperiment = () => {
    // Enter edit mode - wizard will be shown instead of report
    setIsEditing(true)
  }

  // ============================================================
  // RENDER JSX
  // ============================================================

  // Handle edit mode - show wizard instead of report
  if (isEditing && editData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
        <div className="bg-surface rounded-t-2xl sm:rounded-lg shadow-xl w-full max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto">
          {/* Wizard in Edit Mode */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-gradient-to-r from-green-50 via-green-50 to-emerald-50 border-primary/30 sticky top-0 flex items-start sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-primary">
                {t('experiments.report.editButton')}
              </h2>
              <p className="text-xs sm:text-sm text-primary mt-1">
                {t('experiments.report.editSubtitle')}
              </p>
            </div>
            <button
              onClick={() => setIsEditing(false)}
              className="text-muted hover:text-foreground text-2xl leading-none min-h-11 min-w-11 flex items-center justify-center shrink-0"
            >
              ✕
            </button>
          </div>

          <div className="p-4 sm:p-6">
            <ExperimentEditWizard 
              initialData={editData} 
              experimentId={experimentId}
              onEditComplete={handleEditComplete}
            />
          </div>
        </div>
      </div>
    )
  }

  // Regular report view (approved experiments section)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-surface rounded-t-2xl sm:rounded-lg shadow-xl max-w-4xl w-full max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-gradient-to-r from-blue-50 via-blue-50 to-cyan-50 border-blue-200 sticky top-0 z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-blue-900">
                📋 {t('experiments.report.title')}
              </h2>
              <p className="text-xs sm:text-sm text-blue-700 mt-1">
                {t('experiments.report.subtitle')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-muted hover:text-foreground text-2xl leading-none min-h-11 min-w-11 flex items-center justify-center shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="px-4 sm:px-6 py-8 sm:py-12 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-blue-600 font-medium">{t('experiments.report.loading')}</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="px-4 sm:px-6 py-4 bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        {/* Content */}
        {!loading && experimentData && (
          <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-6 sm:pb-8">
            
            {/* Informações Básicas e Pesquisador */}
            <div className="border rounded-lg p-4 bg-emerald-50 border-emerald-300">
              <h3 className="text-lg font-bold text-emerald-900 mb-4">👤 {t('experiments.report.sections.info')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-surface rounded border border-emerald-100">
                  <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.index')}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{experimentData.index_visual || '-'}</p>
                </div>
                <div className="p-3 bg-surface rounded border border-emerald-100">
                  <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.researcher')}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{experimentData.researcher_name || '-'}</p>
                </div>
                <div className="p-3 bg-surface rounded border border-emerald-100">
                  <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.institution')}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{experimentData.researcher_institution || '-'}</p>
                </div>
                <div className="p-3 bg-surface rounded border border-emerald-100">
                  <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.createdDate')}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{formatDateTime(experimentData.created_at)}</p>
                </div>
                {showStatus && (
                  <div className="p-3 bg-surface rounded border border-emerald-100 md:col-span-2">
                    <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.status')}</p>
                    <p className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mt-1 ${getStatusBadge(experimentData.status).bgColor} ${getStatusBadge(experimentData.status).textColor}`}>
                      {getStatusBadge(experimentData.status).icon} {getStatusBadge(experimentData.status).label}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* =============== 6 ESTÁGIOS COM CORES =============== */}

            {/* ESTÁGIO 1: Material e Máquina */}
            {(() => {
              const isComplete = isStageComplete('material_machine')
              const style = getStageStyle(isComplete)
              return (
                <div className={`border rounded-lg p-4 ${style.bgColor} ${style.borderColor}`}>
                  <h3 className={`text-lg font-bold ${style.titleColor} mb-4`}>
                    {style.icon} {t('experiments.report.sections.materialMachine')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Material */}
                    <div>
                      <h4 className="text-sm font-bold text-foreground mb-2">{t('experiments.report.sectionTitles.material')}</h4>
                      <div className="space-y-2">
                        <div className="p-2 bg-surface rounded border border-border">
                          <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.brand')}</p>
                          <p className="text-sm font-semibold text-foreground">{experimentData.material_brand || '-'}</p>
                        </div>
                        <div className="p-2 bg-surface rounded border border-border">
                          <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.model')}</p>
                          <p className="text-sm font-semibold text-foreground">{experimentData.material_model || '-'}</p>
                        </div>
                        <div className="p-2 bg-surface rounded border border-border">
                          <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.color')}</p>
                          <p className="text-sm font-semibold text-foreground">{experimentData.material_color || '-'}</p>
                        </div>
                        {experimentData.material_is_composite !== null && (
                          <div className="p-2 bg-surface rounded border border-border">
                            <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.composite')}</p>
                            <p className="text-sm font-semibold text-foreground">{experimentData.material_is_composite ? t('experiments.report.boolean.yes') : t('experiments.report.boolean.no')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Máquina */}
                    <div>
                      <h4 className="text-sm font-bold text-foreground mb-2">{t('experiments.report.sectionTitles.machine')}</h4>
                      <div className="space-y-2">
                        <div className="p-2 bg-surface rounded border border-border">
                          <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.brand')}</p>
                          <p className="text-sm font-semibold text-foreground">{experimentData.machine_brand || '-'}</p>
                        </div>
                        <div className="p-2 bg-surface rounded border border-border">
                          <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.model')}</p>
                          <p className="text-sm font-semibold text-foreground">{experimentData.machine_model || '-'}</p>
                        </div>
                        {experimentData.machine_technology && (
                          <div className="p-2 bg-surface rounded border border-border">
                            <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.technology')}</p>
                            <p className="text-sm font-semibold text-foreground">{experimentData.machine_technology}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ESTÁGIO 2: Amostra */}
            {(() => {
              const isComplete = isStageComplete('sample')
              const style = getStageStyle(isComplete)
              return (
                <div className={`border rounded-lg p-4 ${style.bgColor} ${style.borderColor}`}>
                  <h3 className={`text-lg font-bold ${style.titleColor} mb-4`}>
                    {style.icon} {t('experiments.report.sections.sample')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-surface rounded border border-border">
                      <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.shapeType')}</p>
                      <p className="text-sm font-semibold text-foreground mt-1">
                        {getShapeEmoji(experimentData.shape_type)} {experimentData.shape_type || '-'}
                      </p>
                    </div>
                    <div className="p-3 bg-surface rounded border border-border">
                      <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.dimension')}</p>
                      <p className="text-sm font-semibold text-foreground mt-1">{formatNumber(experimentData.shape_dimension)}</p>
                    </div>
                    {experimentData.circle_roi_area !== null && (
                      <div className="p-3 bg-surface rounded border border-border">
                        <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.roiArea')}</p>
                        <p className="text-sm font-semibold text-foreground mt-1">{formatNumber(experimentData.circle_roi_area)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* ESTÁGIO 3: Infill / Preenchimento */}
            {(() => {
              const isComplete = isStageComplete('infill')
              const style = getStageStyle(isComplete)
              return (
                <div className={`border rounded-lg p-4 ${style.bgColor} ${style.borderColor}`}>
                  <h3 className={`text-lg font-bold ${style.titleColor} mb-4`}>
                    {style.icon} {t('experiments.report.sections.infill')}
                  </h3>
                  {experimentData.infill_measurements && experimentData.infill_measurements.length > 0 ? (
                    <div className="space-y-3">
                      {experimentData.infill_measurements
                        .sort((a: any, b: any) => {
                          // Ordenar por percentual de infill de forma ascendente
                          const aPercentage = a.infill_percentage ?? a.infill_pct ?? 0
                          const bPercentage = b.infill_percentage ?? b.infill_pct ?? 0
                          return aPercentage - bPercentage
                        })
                        .map((im: any, idx: number) => (
                        <div key={idx} className="p-3 bg-surface rounded border border-border">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {im.infill_percentage !== null && (
                              <div>
                                <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.infillPercentage')}</p>
                                <p className="text-sm font-semibold text-foreground mt-1">
                                  {formatNumber(im.infill_percentage ?? im.infill_pct)}%
                                </p>
                              </div>
                            )}
                            {im.hu_mean !== null && (
                              <div>
                                <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.huMean')}</p>
                                <p className="text-sm font-semibold text-foreground mt-1">{formatNumber(im.hu_mean)}</p>
                              </div>
                            )}
                            {im.hu_value !== null && (
                              <div>
                                <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.huMeasured')}</p>
                                <p className="text-sm font-semibold text-foreground mt-1">{formatNumber(im.hu_value)}</p>
                              </div>
                            )}
                            {im.notes && (
                              <div className="md:col-span-2">
                                <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.notes')}</p>
                                <p className="text-sm font-semibold text-foreground mt-1">{im.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted italic">{t('experiments.report.messages.noInfillMeasurements')}</p>
                  )}
                </div>
              )
            })()}

            {/* ESTÁGIO 4: Qualidade de Feixe */}
            {(() => {
              const isComplete = isStageComplete('beam_quality')
              const style = getStageStyle(isComplete)
              return (
                <div className={`border rounded-lg p-4 ${style.bgColor} ${style.borderColor}`}>
                  <h3 className={`text-lg font-bold ${style.titleColor} mb-4`}>
                    {style.icon} {t('experiments.report.sections.beamQuality')}
                  </h3>
                  {experimentData.beam_qualities ? (
                    <div className="p-3 bg-surface rounded border border-border">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {experimentData.beam_qualities.rqr_2 !== null && (
                          <div>
                            <p className="text-muted font-semibold uppercase text-xs">RQR-2</p>
                            <p className="text-foreground font-bold mt-1">{experimentData.beam_qualities.rqr_2 || '-'}</p>
                          </div>
                        )}
                        {experimentData.beam_qualities.rqr_3 !== null && (
                          <div>
                            <p className="text-muted font-semibold uppercase text-xs">RQR-3</p>
                            <p className="text-foreground font-bold mt-1">{experimentData.beam_qualities.rqr_3 || '-'}</p>
                          </div>
                        )}
                        {experimentData.beam_qualities.rqr_4 !== null && (
                          <div>
                            <p className="text-muted font-semibold uppercase text-xs">RQR-4</p>
                            <p className="text-foreground font-bold mt-1">{experimentData.beam_qualities.rqr_4 || '-'}</p>
                          </div>
                        )}
                        {experimentData.beam_qualities.rqr_5 !== null && (
                          <div>
                            <p className="text-muted font-semibold uppercase text-xs">RQR-5</p>
                            <p className="text-foreground font-bold mt-1">{experimentData.beam_qualities.rqr_5 || '-'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted italic">{t('experiments.report.messages.noBeamQualities')}</p>
                  )}
                </div>
              )
            })()}

            {/* ESTÁGIO 5: Atenuação Linear */}
            {(() => {
              const isComplete = isStageComplete('linear_attenuation')
              const style = getStageStyle(isComplete)
              return (
                <div className={`border rounded-lg p-4 ${style.bgColor} ${style.borderColor}`}>
                  <h3 className={`text-lg font-bold ${style.titleColor} mb-4`}>
                    {style.icon} {t('experiments.report.sections.linearAttenuation')}
                  </h3>
                  {(experimentData.attenuation_tests?.length > 0 ||
                    experimentData.linear_attenuation?.length > 0) ? (
                    <div className="space-y-4">
                      {/* Dados Tabulares */}
                      {experimentData.attenuation_tests?.map((test: any) => (
                        <div key={test.id} className="p-3 bg-surface rounded border border-border mb-3">
                          <p className="text-sm font-semibold text-foreground mb-2">
                            {test.rqr_energy} · I₀ = {formatNumber(test.i0)} · μ ={' '}
                            {test.mu_coefficient != null ? formatNumber(test.mu_coefficient) : '—'}
                          </p>
                          {test.measurements?.map((m: any, midx: number) => (
                            <div key={midx} className="grid grid-cols-2 gap-4 text-sm text-foreground">
                              <span>
                                {t('experiments.report.fields.thickness')}: {formatNumber(m.thickness)} mm
                              </span>
                              <span>Transmissão: {formatNumber(m.transmission)}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                      <div className="space-y-3">
                        {(experimentData.linear_attenuation || []).map((la: any, idx: number) => (
                          <div key={idx} className="p-3 bg-surface rounded border border-border">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.thickness')}</p>
                                <p className="text-sm font-semibold text-foreground mt-1">{formatNumber(la.thickness)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted uppercase font-semibold">{t('experiments.report.fields.lambertBeer')}</p>
                                <p className="text-sm font-semibold text-foreground mt-1">{formatNumber(la.value_lambert_beer)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Gráfico dentro do Card */}
                      <div className="mt-6 pt-4 border-t border-border">
                        <LinearAttenuationChart
                          data={experimentData.linear_attenuation}
                          tests={experimentData.attenuation_tests}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted italic">{t('experiments.report.messages.noLinearAttenuation')}</p>
                  )}
                </div>
              )
            })()}

            {/* ESTÁGIO 6: Propriedades Mecânicas */}
            {(() => {
              const isComplete = isStageComplete('mechanical')
              const style = getStageStyle(isComplete)
              return (
                <div className={`border rounded-lg p-4 ${style.bgColor} ${style.borderColor}`}>
                  <h3 className={`text-lg font-bold ${style.titleColor} mb-4`}>
                    {style.icon} {t('experiments.report.sections.mechanicalProperties')}
                  </h3>
                  {experimentData.mechanical_properties ? (
                    <div className="space-y-4">
                      {/* Dados Tabulares */}
                      <div className="p-3 bg-surface rounded border border-border">
                        {experimentData.mechanical_properties.test_condition && (
                          <div className="mb-4 p-2 bg-background rounded">
                            <p className="text-xs text-muted uppercase font-bold">{t('experiments.report.fields.testCondition')}</p>
                            <p className="text-foreground font-semibold">{experimentData.mechanical_properties.test_condition}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {experimentData.mechanical_properties.tensile_modulus_mpa !== null && (
                            <div>
                              <p className="text-muted uppercase font-semibold text-xs">{t('experiments.report.fields.tensileModulus')}</p>
                              <p className="text-foreground font-bold mt-1">{formatNumber(experimentData.mechanical_properties.tensile_modulus_mpa)} MPa</p>
                            </div>
                          )}
                          {experimentData.mechanical_properties.tensile_strength_mpa !== null && (
                            <div>
                              <p className="text-muted uppercase font-semibold text-xs">{t('experiments.report.fields.tensileStrength')}</p>
                              <p className="text-foreground font-bold mt-1">{formatNumber(experimentData.mechanical_properties.tensile_strength_mpa)} MPa</p>
                            </div>
                          )}
                          {experimentData.mechanical_properties.break_deformation_percent !== null && (
                            <div>
                              <p className="text-muted uppercase font-semibold text-xs">{t('experiments.report.fields.breakDeformation')}</p>
                              <p className="text-foreground font-bold mt-1">{formatNumber(experimentData.mechanical_properties.break_deformation_percent)}%</p>
                            </div>
                          )}
                          {experimentData.mechanical_properties.flexural_modulus_mpa !== null && (
                            <div>
                              <p className="text-muted uppercase font-semibold text-xs">{t('experiments.report.fields.flexuralModulus')}</p>
                              <p className="text-foreground font-bold mt-1">{formatNumber(experimentData.mechanical_properties.flexural_modulus_mpa)} MPa</p>
                            </div>
                          )}
                          {experimentData.mechanical_properties.flexural_strength_mpa !== null && (
                            <div>
                              <p className="text-muted uppercase font-semibold text-xs">{t('experiments.report.fields.flexuralStrength')}</p>
                              <p className="text-foreground font-bold mt-1">{formatNumber(experimentData.mechanical_properties.flexural_strength_mpa)} MPa</p>
                            </div>
                          )}
                          {experimentData.mechanical_properties.hardness_rockwell !== null && (
                            <div>
                              <p className="text-muted uppercase font-semibold text-xs">{t('experiments.report.fields.hardnessRockwell')}</p>
                              <p className="text-foreground font-bold mt-1">{experimentData.mechanical_properties.hardness_rockwell}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted italic">{t('experiments.report.messages.noMechanicalProperties')}</p>
                  )}
                </div>
              )
            })()}

          </div>
        )}

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t bg-background flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 sticky bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {showEditButton && (
            <button
              onClick={handleEditExperiment}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
            >
              {t('experiments.report.buttonLabels.edit')}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            {t('experiments.report.buttonLabels.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
