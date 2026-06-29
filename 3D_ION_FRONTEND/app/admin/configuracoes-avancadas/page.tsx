'use client'

import { useAdminProtection } from '@/lib/hooks/useAdminProtection'
import { useState, useEffect, useMemo as useMemoBrowser } from 'react'
import { Settings, Users, Lock, Database, AlertCircle, Loader2, Shield, Download, Activity, Eye } from 'lucide-react'
import { adminApi } from '@/lib/api'
import { AdminUser, UsersListResponse, UserStatus, AdminInfo, UserRole } from '@/lib/types/admin'
import { formatDateTime, formatDateTimeByLanguage } from '@/lib/utils'
import { UsersTable } from '@/components/admin/UsersTable'
import { UpdateStatusForm } from '@/components/admin/UpdateStatusForm'
import { AdminsTable } from '@/components/admin/AdminsTable'
import { UpdateAdminRoleForm } from '@/components/admin/UpdateAdminRoleForm'
import { DatabaseDangerZone } from '@/components/admin/DatabaseDangerZone'
import { useTranslation } from 'react-i18next'

export default function ConfiguracaesAvancadasPage() {
  const user = useAdminProtection()
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState<'experiments' | 'users' | 'administradores' | 'database' | 'system'>('experiments')
  const [isLoading, setIsLoading] = useState(false)
  const [isExportingTables, setIsExportingTables] = useState(false)
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false)
  const [integrityResult, setIntegrityResult] = useState<any>(null)
  const [showIntegrityModal, setShowIntegrityModal] = useState(false)
  const [isCheckingSystemHealth, setIsCheckingSystemHealth] = useState(false)
  const [systemHealthResult, setSystemHealthResult] = useState<any>(null)
  const [showHealthModal, setShowHealthModal] = useState(false)

  // Users management state
  const [regularUsers, setRegularUsers] = useState<AdminUser[]>([])
  const [irregularUsers, setIrregularUsers] = useState<AdminUser[]>([])
  const [desativatedUsers, setDesativatedUsers] = useState<AdminUser[]>([])
  const [loadingStates, setLoadingStates] = useState({
    regular: false,
    irregular: false,
    desativado: false,
  })
  const [errorStates, setErrorStates] = useState({
    regular: null as string | null,
    irregular: null as string | null,
    desativado: null as string | null,
  })
  const [prefilledEmail, setPrefilledEmail] = useState<string>('')
  const [showUpdateForm, setShowUpdateForm] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false)

  // Admins management state
  const [admins, setAdmins] = useState<AdminInfo[]>([])
  const [adminsLoading, setAdminsLoading] = useState(false)
  const [adminsError, setAdminsError] = useState<string | null>(null)
  const [selectedAdmin, setSelectedAdmin] = useState<AdminInfo | null>(null)
  const [showAdminRoleForm, setShowAdminRoleForm] = useState(false)

  // Experiments management state
  const [approvedExperiments, setApprovedExperiments] = useState<any[]>([])
  const [inAnalysisExperiments, setInAnalysisExperiments] = useState<any[]>([])
  const [experimentsLoading, setExperimentsLoading] = useState(false)
  const [experimentsError, setExperimentsError] = useState<string | null>(null)
  const [selectedExperiment, setSelectedExperiment] = useState<any | null>(null)
  const [showExperimentDetailsModal, setShowExperimentDetailsModal] = useState(false)
  const [selectedExperimentForStatusChange, setSelectedExperimentForStatusChange] = useState<any | null>(null)
  const [statusChangeLoading, setStatusChangeLoading] = useState(false)
  const [statusChangeMessage, setStatusChangeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [statusChangeComment, setStatusChangeComment] = useState<string>('')
  const [experimentDetailsLoading, setExperimentDetailsLoading] = useState(false)
  const [experimentFullData, setExperimentFullData] = useState<any | null>(null)
  const [currentAnalysisPage, setCurrentAnalysisPage] = useState(1)
  const [currentApprovedPage, setCurrentApprovedPage] = useState(1)
  const [experimentsPerPage] = useState(8)

  // Status History state
  const [statusHistoryData, setStatusHistoryData] = useState<any[]>([])
  const [statusHistoryLoading, setStatusHistoryLoading] = useState(false)
  const [statusHistoryError, setStatusHistoryError] = useState<string | null>(null)
  const [statusHistoryFilters, setStatusHistoryFilters] = useState({
    old_status: '',
    new_status: '',
    changed_by_name: '',
    changed_by_role: '',
    start_date: '',
    end_date: ''
  })
  const [currentStatusHistoryPage, setCurrentStatusHistoryPage] = useState(1)
  const [statusHistoryPerPage] = useState(8)

  // System logs state
  const [systemLogs, setSystemLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [logFilters, setLogFilters] = useState({
    action_category: '',
    severity_level: '',
    start_date: '',
    end_date: '',
    entity_name: ''
  })
  const [currentLogPage, setCurrentLogPage] = useState(1)
  const [logsPerPage] = useState(20)

  // Create a map of sample_id (experiment id) to index_visual for quick lookup in history
  const experimentIndexMap = useMemoBrowser(() => {
    const map: Record<string, number> = {}
    approvedExperiments.forEach(exp => {
      if (exp.id) {
        map[exp.id] = exp.index_visual || 0
      }
    })
    inAnalysisExperiments.forEach(exp => {
      if (exp.id) {
        map[exp.id] = exp.index_visual || 0
      }
    })
    return map
  }, [approvedExperiments, inAnalysisExperiments])

  const fetchUsersByStatus = async (status: UserStatus) => {
    console.log(`[Page] Fetching users with status: ${status}`)
    setLoadingStates((prev) => ({ ...prev, [status]: true }))
    setErrorStates((prev) => ({ ...prev, [status]: null }))
    try {
      console.log(`[Page] Calling adminApi.getUsersByStatus("${status}")`)
      const response = await adminApi.getUsersByStatus(status)
      console.log(`[Page] Response received for status ${status}:`, response)
      console.log(`[Page] Total users: ${response.users.length}`)
      if (response.users.length > 0) {
        console.log(`[Page] First user:`, response.users[0])
        console.log(`[Page] First user experimentos_criados_total:`, response.users[0].experimentos_criados_total)
      }
      
      if (status === 'regular') {
        setRegularUsers(response.users)
      } else if (status === 'irregular') {
        setIrregularUsers(response.users)
      } else {
        setDesativatedUsers(response.users)
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao carregar usuários'
      console.error(`[Page] Error fetching users ${status}:`, error)
      console.error(`[Page] Error message:`, errorMessage)
      
      // Check if it's a 401 Unauthorized error
      if (errorMessage.includes('Sessão expirada') || errorMessage.includes('401') || errorMessage.includes('Não autorizado')) {
        console.error('[Page] ❌ 401 Unauthorized - User needs to login again')
        setErrorStates((prev) => ({ 
          ...prev, 
          [status]: t('admin.advanced.errors.sessionExpired') 
        }))
      } else {
        setErrorStates((prev) => ({ ...prev, [status]: errorMessage }))
      }
    } finally {
      setLoadingStates((prev) => ({ ...prev, [status]: false }))
    }
  }

  // Fetch administrators
  const fetchAdministrators = async () => {
    console.log('[Page] Fetching administrators')
    setAdminsLoading(true)
    setAdminsError(null)
    try {
      console.log('[Page] About to call adminApi.getAdministrators()')
      const response = await adminApi.getAdministrators()
      console.log('[Page] Response received:', response)
      console.log('[Page] Response object type:', typeof response)
      console.log('[Page] Response.admins type:', typeof response.admins)
      console.log('[Page] Response.admins is array:', Array.isArray(response.admins))
      console.log('[Page] Response.admins length:', response.admins ? response.admins.length : 'undefined')
      console.log('[Page] Full response.admins:', response.admins)
      if (response.admins && response.admins.length > 0) {
        console.log('[Page] First admin:', response.admins[0])
        console.log('[Page] First admin keys:', Object.keys(response.admins[0]))
        console.log('[Page] First admin experimentos_criados_total:', response.admins[0].experimentos_criados_total)
        console.log('[Page] Type:', typeof response.admins[0].experimentos_criados_total)
      }
      console.log('[Page] About to call setAdmins with:', response.admins)
      setAdmins(response.admins)
      console.log('[Page] setAdmins called successfully')
    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao carregar administradores'
      console.error('[Page] Error fetching administrators:', error)
      console.error('[Page] Error full object:', JSON.stringify(error, null, 2))
      
      // Check if it's a 401 Unauthorized error
      if (errorMessage.includes('Sessão expirada') || errorMessage.includes('401') || errorMessage.includes('Não autorizado')) {
        console.error('[Page] ❌ 401 Unauthorized - User needs to login again')
        setAdminsError('Sua sessão expirou. Por favor, faça login novamente.')
      } else {
        setAdminsError(errorMessage)
      }
    } finally {
      setAdminsLoading(false)
    }
  }

  // Fetch experiments
  const fetchExperiments = async () => {
    console.log('[Page] Fetching experiments')
    setExperimentsLoading(true)
    setExperimentsError(null)
    try {
      const response = await adminApi.getExperimentsByStatus()
      console.log('[Page] Experiments response:', response)
      setApprovedExperiments(response.approved)
      setInAnalysisExperiments(response.in_analysis)
    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao carregar experimentos'
      console.error('[Page] Error fetching experiments:', error)
      
      if (errorMessage.includes('Sessão expirada') || errorMessage.includes('401') || errorMessage.includes('Não autorizado')) {
        setExperimentsError('Sua sessão expirou. Por favor, faça login novamente.')
      } else {
        setExperimentsError(errorMessage)
      }
    } finally {
      setExperimentsLoading(false)
    }
  }

  // Fetch status history with filters
  const fetchStatusHistory = async () => {
    console.log('[Page] Fetching status history with filters:', statusHistoryFilters)
    setStatusHistoryLoading(true)
    setStatusHistoryError(null)
    try {
      // Build filters, excluding empty strings but including __NULL__ values
      const filters: any = {}
      if (statusHistoryFilters.old_status) filters.old_status = statusHistoryFilters.old_status
      if (statusHistoryFilters.new_status) filters.new_status = statusHistoryFilters.new_status
      if (statusHistoryFilters.changed_by_name) filters.changed_by_name = statusHistoryFilters.changed_by_name
      if (statusHistoryFilters.changed_by_role) filters.changed_by_role = statusHistoryFilters.changed_by_role
      if (statusHistoryFilters.start_date) filters.start_date = statusHistoryFilters.start_date
      if (statusHistoryFilters.end_date) filters.end_date = statusHistoryFilters.end_date
      
      console.log('[Page] Sending filters to API:', filters)
      const response = await adminApi.getExperimentsStatusHistory(filters)
      console.log('[Page] Status history response:', response)
      setStatusHistoryData(response.data || [])
    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao carregar histórico de status'
      console.error('[Page] Error fetching status history:', error)
      
      if (errorMessage.includes('Sessão expirada') || errorMessage.includes('401') || errorMessage.includes('Não autorizado')) {
        setStatusHistoryError('Sua sessão expirou. Por favor, faça login novamente.')
      } else {
        setStatusHistoryError(errorMessage)
      }
    } finally {
      setStatusHistoryLoading(false)
    }
  }

  // Define allowed transitions for each status (must match backend rules)
  const getValidTransitions = (currentStatus: string): ('Revisions' | 'Review' | 'Approved')[] => {
    const transitionRules: Record<string, ('Revisions' | 'Review' | 'Approved')[]> = {
      'Submitted': ['Review', 'Approved'],
      'Review': ['Approved', 'Revisions'],
      'Revisions': ['Review', 'Approved'],
      'Approved': ['Revisions', 'Review']
    }
    return transitionRules[currentStatus] || []
  }

  const getAvailableStatusActions = (currentStatus: string): ('Revisions' | 'Review' | 'Approved')[] =>
    getValidTransitions(currentStatus).filter((status) => status !== currentStatus)

  const applyLocalExperimentStatusUpdate = (experiment: { id: string; status?: string; [key: string]: unknown }, newStatus: string) => {
    const experimentId = experiment.id
    const updatedExperiment = { ...experiment, status: newStatus }
    const inAnalysisStatuses = ['Submitted', 'Revisions', 'Review']

    setSelectedExperiment(updatedExperiment)

    setExperimentFullData((prev: any | null) => {
      if (!prev) return prev
      const sampleId = prev.sample?.id ?? prev.id
      if (sampleId !== experimentId) return prev
      return {
        ...prev,
        status: newStatus,
        ...(prev.sample ? { sample: { ...prev.sample, status: newStatus } } : {}),
      }
    })

    if (newStatus === 'Approved') {
      setInAnalysisExperiments((prev) => prev.filter((e) => e.id !== experimentId))
      setApprovedExperiments((prev) => [updatedExperiment, ...prev.filter((e) => e.id !== experimentId)])
    } else if (inAnalysisStatuses.includes(newStatus)) {
      setApprovedExperiments((prev) => prev.filter((e) => e.id !== experimentId))
      setInAnalysisExperiments((prev) => {
        if (prev.some((e) => e.id === experimentId)) {
          return prev.map((e) => (e.id === experimentId ? updatedExperiment : e))
        }
        return [updatedExperiment, ...prev]
      })
    }
  }

  // Update experiment status
  const handleUpdateExperimentStatus = async (newStatus: 'Revisions' | 'Review' | 'Approved') => {
    if (!selectedExperiment) return

    if (newStatus === selectedExperiment.status) {
      setStatusChangeMessage({
        type: 'error',
        text: `O experimento já possui o status "${getStatusBadge(newStatus).label}".`,
      })
      return
    }

    setStatusChangeLoading(true)
    setStatusChangeMessage(null)

    try {
      await adminApi.updateExperimentStatus(selectedExperiment.id, newStatus, statusChangeComment || undefined)

      applyLocalExperimentStatusUpdate(selectedExperiment, newStatus)

      const statusLabel = getStatusBadge(newStatus).label
      const statusIcon = getStatusBadge(newStatus).icon

      setStatusChangeMessage({
        type: 'success',
        text: `${statusIcon} Status atualizado para "${statusLabel}" com sucesso!`,
      })

      setStatusChangeComment('')

      await Promise.all([fetchExperiments(), fetchStatusHistory()])
    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao atualizar status'
      console.error('[Page] Error updating experiment status:', error)

      const alreadyHasStatusMatch = errorMessage.match(/já possui o status '(\w+)'/)
      if (alreadyHasStatusMatch && selectedExperiment) {
        const serverStatus = alreadyHasStatusMatch[1]
        applyLocalExperimentStatusUpdate(selectedExperiment, serverStatus)
        await fetchExperiments()

        setStatusChangeMessage({
          type: 'success',
          text: `Status sincronizado: o experimento já está como "${getStatusBadge(serverStatus).label}".`,
        })
        return
      }

      setStatusChangeMessage({
        type: 'error',
        text: errorMessage,
      })
    } finally {
      setStatusChangeLoading(false)
    }
  }

  // ==================== FUNÇÕES PARA DETECÇÃO DE ETAPAS ====================

  /**
   * Detecta se uma etapa tem dados preenchidos
   */
  const isStageComplete = (stageName: string): boolean => {
    if (!experimentFullData) return false

    switch (stageName) {
      case 'material_machine':
        return !!(experimentFullData.material || experimentFullData.machine)
      case 'sample':
        return !!experimentFullData.sample
      case 'infill':
        return !!(experimentFullData.infill_measurements && experimentFullData.infill_measurements.length > 0)
      case 'beam_qualities':
        return !!(experimentFullData.beam_qualities && experimentFullData.beam_qualities.length > 0)
      case 'linear_attenuation':
        return !!(experimentFullData.linear_attenuation && experimentFullData.linear_attenuation.length > 0)
      case 'mechanical':
        return !!(experimentFullData.mechanical_properties && experimentFullData.mechanical_properties.length > 0)
      default:
        return false
    }
  }

  /**
   * Retorna cor e estilos para cada etapa
   */
  const getStageStyle = (isComplete: boolean) => {
    if (isComplete) {
      return {
        bg: 'bg-green-50',
        border: 'border-green-300',
        textColor: 'text-green-900',
        headerBg: 'bg-gradient-to-r from-green-100 to-emerald-100',
        icon: '✅',
        status: 'Preenchido'
      }
    } else {
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-300',
        textColor: 'text-orange-900',
        headerBg: 'bg-gradient-to-r from-orange-100 to-amber-100',
        icon: '❌',
        status: 'Não Preenchido'
      }
    }
  }

  // Load data when tab changes
  useEffect(() => {
    console.log(`[Page] useEffect triggered: activeTab=${activeTab}, user=${user ? user.name : 'null'}`)
    if (activeTab === 'users' && user) {
      const loadAllUsers = async () => {
        console.log('[Page] loadAllUsers started')
        await Promise.all([
          fetchUsersByStatus('regular'),
          fetchUsersByStatus('irregular'),
          fetchUsersByStatus('desativado'),
        ])
        console.log('[Page] loadAllUsers completed')
      }
      loadAllUsers()
    } else if (activeTab === 'administradores' && user) {
      fetchAdministrators()
    } else if (activeTab === 'experiments' && user) {
      fetchExperiments()
      fetchStatusHistory()
    } else if (activeTab === 'system') {
      fetchSystemLogs()
    }
  }, [activeTab, user])

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  const handleUserClick = (clickedUser: AdminUser) => {
    setPrefilledEmail(clickedUser.email || '')
    setShowUpdateForm(true)
  }

  const handleStatusUpdate = () => {
    // Recarregar dados após atualização
    const loadAllUsers = async () => {
      await Promise.all([
        fetchUsersByStatus('regular'),
        fetchUsersByStatus('irregular'),
        fetchUsersByStatus('desativado'),
      ])
    }
    loadAllUsers()
    setShowUpdateForm(false)
  }

  const handleAdminRoleUpdate = async (email: string, newRole: UserRole) => {
    console.log(`[Page] Updating admin role: ${email} -> ${newRole}`)
    try {
      const response = await adminApi.updateAdministratorRole(email, newRole)
      console.log('[Page] Admin role updated:', response)
      // Reload admins list after successful update
      await fetchAdministrators()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // Erros esperados (validação): conflito (409), status inválido (400), ou permissão negada (403)
      // Também são registrados mas não como erro crítico
      const isExpectedError = errorMessage.includes('já possui') || 
                             errorMessage.includes('Conflito') ||
                             errorMessage.includes('status') ||
                             errorMessage.includes('permissão') ||
                             errorMessage.includes('não pode remover') ||
                             errorMessage.includes('não encontrado') ||
                             errorMessage.includes('não existe') ||
                             errorMessage.includes('não cadastrado') ||
                             errorMessage.includes('rebaixar') ||
                             errorMessage.includes('próprias permissões')
      
      if (isExpectedError) {
        console.warn('[Page] Expected validation error:', errorMessage)
      } else {
        console.error('[Page] Error updating admin role:', error)
      }
      
      throw error // Relançar para que o componente trate com warning/error
    }
  }

  const handleAdminRoleUpdateSuccess = () => {
    setShowAdminRoleForm(false)
    setSelectedAdmin(null)
    fetchAdministrators()
  }

  const handleExportTables = async () => {
    setIsExportingTables(true)
    setExportMessage(null)
    try {
      const blob = await adminApi.exportTables()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `3d_ion_backup_${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      setExportMessage({
        type: 'success',
        text: '✅ Exportação realizada com sucesso! Arquivo baixado.'
      })
    } catch (error: any) {
      console.error('Error exporting tables:', error)
      setExportMessage({
        type: 'error',
        text: `❌ Erro ao exportar: ${error.message}`
      })
    } finally {
      setIsExportingTables(false)
    }
  }

  const handleCheckIntegrity = async () => {
    setIsCheckingIntegrity(true)
    setShowIntegrityModal(true)
    setIntegrityResult(null)
    try {
      const result = await adminApi.checkDatabaseIntegrity()
      console.log('Integrity check result:', result)
      setIntegrityResult(result)
    } catch (error: any) {
      console.error('Error checking integrity:', error)
      setIntegrityResult({
        database_status: 'error',
        connection_status: false,
        overall_health: 'error',
        message: `❌ Erro ao verificar integridade: ${error.message}`,
        tables: []
      })
    } finally {
      setIsCheckingIntegrity(false)
    }
  }

  const handleCheckSystemHealth = async () => {
    setIsCheckingSystemHealth(true)
    setShowHealthModal(true)
    setSystemHealthResult(null)
    try {
      const result = await adminApi.checkSystemHealth()
      console.log('System health check result:', result)
      setSystemHealthResult(result)
    } catch (error: any) {
      console.error('Error checking system health:', error)
      setSystemHealthResult({
        overall_status: 'error',
        timestamp: new Date().toISOString(),
        components: [],
        summary: `❌ ${t('admin.advanced.errors.checkingSystemHealth')}: ${error.message}`,
        recommendations: [t('admin.advanced.errors.verifyConnection')]
      })
    } finally {
      setIsCheckingSystemHealth(false)
    }
  }

  const fetchSystemLogs = async () => {
    setLogsLoading(true)
    setLogsError(null)
    try {
      const data = await adminApi.getAdminLogs(logFilters)
      
      // Sort logs by created_at in descending order (newest first)
      const sortedLogs = (data.logs || []).sort((a: any, b: any) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return dateB - dateA
      })
      
      console.log('[fetchSystemLogs] Loaded logs:', sortedLogs.length, 'logs')
      if (sortedLogs.length > 0) {
        console.log('[fetchSystemLogs] First log:', sortedLogs[0])
      }
      setSystemLogs(sortedLogs)
    } catch (err) {
      console.error('Error fetching logs:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar logs'
      
      // Improve error message for connection issues
      let displayError = errorMessage
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Falha na conexão')) {
        displayError = `Não foi possível conectar ao servidor de logs.\n\nVerifique:\n1. O backend está rodando?\n2. Porta 8000 está acessível?\n3. Há problemas de rede?`
      }
      
      setLogsError(displayError)
    } finally {
      setLogsLoading(false)
    }
  }

  const handleApplyLogFilters = () => {
    setCurrentLogPage(1)
    fetchSystemLogs()
  }

  const handleClearLogFilters = () => {
    setLogFilters({
      action_category: '',
      severity_level: '',
      start_date: '',
      end_date: '',
      entity_name: ''
    })
    setCurrentLogPage(1)
  }

  const handleViewDetails = async (experimentId: string) => {
    const experiment = [...approvedExperiments, ...inAnalysisExperiments].find((e) => e.id === experimentId)
    if (!experiment) return

    setSelectedExperiment(experiment)
    setExperimentDetailsLoading(true)
    setShowExperimentDetailsModal(true)
    setStatusChangeMessage(null)

    try {
      const response = await adminApi.getExperimentDetails(experimentId)
      setExperimentFullData(response)

      const freshStatus = response.sample?.status
      if (freshStatus && freshStatus !== experiment.status) {
        applyLocalExperimentStatusUpdate(experiment, freshStatus)
      } else if (freshStatus) {
        setSelectedExperiment({ ...experiment, status: freshStatus })
      }
    } catch (error) {
      console.error('Error fetching experiment details:', error)
      setExperimentFullData(experiment)
    } finally {
      setExperimentDetailsLoading(false)
    }
  }

  const getShapeEmoji = (shapeType?: string): string => {
    if (!shapeType) return '📦'
    const type = shapeType.toLowerCase()
    if (type.includes('cylinder') || type.includes('cilindro')) return '🔴'
    if (type.includes('cube') || type.includes('cubo')) return '🟫'
    if (type.includes('sphere') || type.includes('esfera')) return '⚪'
    if (type.includes('rectangular') || type.includes('retangular')) return '▭'
    return '📦'
  }

  const formatNumber = (value?: number, decimals: number = 2): string => {
    if (value === null || value === undefined) return '-'
    return value.toFixed(decimals)
  }

  const getStatusBadge = (status: string) => {
    if (status === 'Approved') {
      return {
        label: t('common.status.approved'),
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        icon: '✓'
      }
    }

    if (status === 'Submitted') {
      return {
        label: t('common.status.submitted'),
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        icon: '📤'
      }
    }

    if (status === 'Review') {
      return {
        label: t('common.status.under_review'),
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        icon: '🔍'
      }
    }

    if (status === 'Revisions') {
      return {
        label: t('common.status.needs_adjustment'),
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-800',
        icon: '⚠️'
      }
    }
    
    return {
      label: status,
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      icon: '❓'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <Settings className="h-8 w-8 text-orange-600" />
              <h1 className="text-3xl font-bold text-gray-900">{t('admin.advanced.title')}</h1>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
              <Lock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">
                {t('admin.advanced.adminBadge', { email: user.email })}
              </span>
            </div>
          </div>
          <p className="text-gray-600">
            {t('admin.advanced.subtitle')}
          </p>
        </div>

        {/* Restricted Access Warning */}
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4 shadow-sm">
          <div className="flex gap-3">
            <div className="shrink-0 text-orange-600 font-bold text-xl">⚠️</div>
            <div>
              <h3 className="text-sm font-semibold text-orange-800 mb-1">{t('admin.advanced.restrictedWarning.title')}</h3>
              <p className="text-sm text-orange-700">
                {t('admin.advanced.restrictedWarning.message')}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('experiments')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'experiments'
                  ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Database className="h-5 w-5" />
                {t('admin.advanced.tabs.experiments')}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'users'
                  ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="h-5 w-5" />
                {t('admin.advanced.tabs.users')}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('administradores')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'administradores'
                  ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Shield className="h-5 w-5" />
                {t('admin.advanced.tabs.admins')}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'database'
                  ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Database className="h-5 w-5" />
                {t('admin.advanced.tabs.database')}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'system'
                  ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {t('admin.advanced.tabs.system')}
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {/* Experimentos */}
            {activeTab === 'experiments' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">{t('admin.advanced.experimentsTab.title')}</h2>
                  <p className="text-gray-600 mb-6">
                    {t('admin.advanced.experimentsTab.description')}
                  </p>

                  {/* Status Indicators */}
                  {!experimentsLoading && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      {/* Submetido */}
                      <div className="bg-white rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-shadow p-4">
                        <div className="flex flex-col items-center">
                          <div className="text-3xl mb-2">📤</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {[...approvedExperiments, ...inAnalysisExperiments].filter(e => e.status === 'Submitted').length}
                          </div>
                          <div className="text-xs text-gray-600 text-center mt-1">{t('admin.advanced.experimentsTab.statusCounters.submitted')}</div>
                        </div>
                      </div>

                      {/* Ajustes Necessários */}
                      <div className="bg-white rounded-lg border border-orange-200 shadow-sm hover:shadow-md transition-shadow p-4">
                        <div className="flex flex-col items-center">
                          <div className="text-3xl mb-2">⚠️</div>
                          <div className="text-2xl font-bold text-orange-600">
                            {[...approvedExperiments, ...inAnalysisExperiments].filter(e => e.status === 'Revisions').length}
                          </div>
                          <div className="text-xs text-gray-600 text-center mt-1">{t('admin.advanced.experimentsTab.statusCounters.adjustment')}</div>
                        </div>
                      </div>

                      {/* Em Revisão */}
                      <div className="bg-white rounded-lg border border-yellow-200 shadow-sm hover:shadow-md transition-shadow p-4">
                        <div className="flex flex-col items-center">
                          <div className="text-3xl mb-2">🔍</div>
                          <div className="text-2xl font-bold text-yellow-600">
                            {[...approvedExperiments, ...inAnalysisExperiments].filter(e => e.status === 'Review').length}
                          </div>
                          <div className="text-xs text-gray-600 text-center mt-1">{t('admin.advanced.experimentsTab.statusCounters.underReview')}</div>
                        </div>
                      </div>

                      {/* Aprovado */}
                      <div className="bg-white rounded-lg border border-green-200 shadow-sm hover:shadow-md transition-shadow p-4">
                        <div className="flex flex-col items-center">
                          <div className="text-3xl mb-2">✅</div>
                          <div className="text-2xl font-bold text-green-600">
                            {[...approvedExperiments, ...inAnalysisExperiments].filter(e => e.status === 'Approved').length}
                          </div>
                          <div className="text-xs text-gray-600 text-center mt-1">{t('admin.advanced.experimentsTab.statusCounters.approved')}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {experimentsError && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-700">{experimentsError}</p>
                    </div>
                  )}


                  {experimentsLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Experimentos em Análise */}
                      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="bg-gradient-to-r from-amber-50 via-amber-50 to-orange-50 px-6 py-4 border-b-2 border-amber-200">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-amber-900">{t('admin.advanced.experimentsTab.tables.underAnalysis')}</h3>
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold text-sm">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                              {inAnalysisExperiments.length} experimentos
                            </span>
                          </div>
                        </div>
                        <div className="border-t border-gray-200">
                          {inAnalysisExperiments.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs sm:text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                                  <tr>
                                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">{t('admin.advanced.experimentsTab.columns.index')}</th>
                                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">{t('admin.advanced.experimentsTab.columns.status')}</th>
                                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">{t('admin.advanced.experimentsTab.columns.date')}</th>
                                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">{t('admin.advanced.experimentsTab.columns.researcher')}</th>
                                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">{t('admin.advanced.experimentsTab.columns.material')}</th>
                                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">{t('admin.advanced.experimentsTab.columns.machine')}</th>
                                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">{t('admin.advanced.experimentsTab.columns.sample')}</th>
                                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">{t('admin.advanced.experimentsTab.columns.infill')}</th>
                                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">{t('admin.advanced.experimentsTab.columns.data')}</th>
                                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">{t('admin.advanced.experimentsTab.columns.details')}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {inAnalysisExperiments.slice((currentAnalysisPage - 1) * experimentsPerPage, currentAnalysisPage * experimentsPerPage).map((experiment) => (
                                    <tr 
                                      key={experiment.id} 
                                      className="transition cursor-pointer font-medium hover:bg-blue-50 hover:border-l-4 hover:border-blue-400"
                                      onClick={() => handleViewDetails(experiment.id)}
                                    >
                                      <td className="px-3 sm:px-4 py-3 font-semibold text-gray-900">
                                        {experiment.index_visual || '-'}
                                      </td>
                                      <td className="px-3 sm:px-4 py-3">
                                        <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(experiment.status).bgColor} ${getStatusBadge(experiment.status).textColor}`}>
                                          {getStatusBadge(experiment.status).icon} {getStatusBadge(experiment.status).label}
                                        </span>
                                      </td>
                                      <td className="px-3 sm:px-4 py-3 text-gray-600 whitespace-nowrap">
                                        {experiment.created_at ? (() => {const d = new Date(experiment.created_at); return i18n.language === 'en' || i18n.language === 'en-US' || i18n.language === 'en-GB' ? `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}` : d.toLocaleDateString('pt-BR')})() : '-'}
                                      </td>
                                      <td className="px-3 sm:px-4 py-3 text-gray-600 truncate max-w-xs">
                                        {experiment.researcher_name || '-'}
                                      </td>
                                      <td className="px-3 sm:px-4 py-3 text-gray-600 truncate max-w-xs">
                                        {experiment.material_brand && experiment.material_model
                                          ? `${experiment.material_brand} ${experiment.material_model}`
                                          : experiment.material_brand || '-'
                                        }
                                      </td>
                                      <td className="px-3 sm:px-4 py-3 text-gray-600 truncate max-w-xs">
                                        {experiment.machine_brand && experiment.machine_model
                                          ? `${experiment.machine_brand} ${experiment.machine_model}`
                                          : experiment.machine_brand || '-'
                                        }
                                      </td>
                                      <td className="px-3 sm:px-4 py-3 text-gray-600 truncate max-w-xs">
                                        {experiment.shape_type || '-'}
                                      </td>
                                      <td className="px-3 sm:px-4 py-3 text-gray-600 font-medium">
                                        {experiment.infill_hu_mean ? experiment.infill_hu_mean.toFixed(2) : '-'}
                                      </td>
                                      <td className="px-3 sm:px-4 py-3 text-gray-600 text-center h-full">
                                        <div className="flex gap-3 justify-center items-center h-full">
                                          {experiment.mechanical_data_count > 0 && (
                                            <span className="text-lg" title="Propriedades Mecânicas">
                                              ⚙️
                                            </span>
                                          )}
                                          {experiment.attenuation_data_count > 0 && (
                                            <span className="text-lg" title="Atenuação Linear">
                                              📉
                                            </span>
                                          )}
                                          {experiment.beam_qualities_exists && (
                                            <span className="text-lg" title="Qualidade de Feixes">
                                              ☢️
                                            </span>
                                          )}
                                          {experiment.mechanical_data_count === 0 && experiment.attenuation_data_count === 0 && !experiment.beam_qualities_exists && (
                                            <span className="text-gray-400 text-xs">-</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-3 sm:px-4 py-3">
                                        <button
                                          onClick={() => handleViewDetails(experiment.id)}
                                          className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium text-xs"
                                          title="Ver detalhes completos do experimento"
                                        >
                                          <Eye className="h-4 w-4" />
                                          Ver
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="px-6 py-8 text-center">
                              <p className="text-gray-500">{t('admin.advanced.experimentsTab.empty.underAnalysis')}</p>
                            </div>
                          )}
                        </div>
                        {/* Pagination for Analysis Experiments */}
                        {inAnalysisExperiments.length > experimentsPerPage && (
                          <div className="px-6 py-4 border-t border-gray-200 flex justify-center items-center gap-2">
                            <button
                              onClick={() => setCurrentAnalysisPage(Math.max(1, currentAnalysisPage - 1))}
                              disabled={currentAnalysisPage === 1}
                              className="px-3 py-2 rounded text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Anterior
                            </button>
                            {Array.from({ length: Math.ceil(inAnalysisExperiments.length / experimentsPerPage) }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => setCurrentAnalysisPage(page)}
                                className={`px-3 py-2 rounded text-sm font-medium ${
                                  currentAnalysisPage === page
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                            <button
                              onClick={() => setCurrentAnalysisPage(Math.min(Math.ceil(inAnalysisExperiments.length / experimentsPerPage), currentAnalysisPage + 1))}
                              disabled={currentAnalysisPage === Math.ceil(inAnalysisExperiments.length / experimentsPerPage)}
                              className="px-3 py-2 rounded text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Próximo
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Experimentos Aprovados */}
                      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="bg-gradient-to-r from-green-50 via-green-50 to-teal-50 px-6 py-4 border-b-2 border-green-200">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-green-900">{t('admin.advanced.experimentsTab.tables.approved')}</h3>
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-sm">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                              {approvedExperiments.length} experimentos
                            </span>
                          </div>
                        </div>
                        <div className="border-t border-gray-200">
                          {approvedExperiments.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs sm:text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                                  <tr>
                                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">{t('admin.advanced.experimentsTab.columns.index')}</th>
                                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">{t('admin.advanced.experimentsTab.columns.status')}</th>
                                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">{t('admin.advanced.experimentsTab.columns.date')}</th>
                                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">{t('admin.advanced.experimentsTab.columns.researcher')}</th>
                                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">{t('admin.advanced.experimentsTab.columns.material')}</th>
                                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">{t('admin.advanced.experimentsTab.columns.machine')}</th>
                                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">{t('admin.advanced.experimentsTab.columns.sample')}</th>
                                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">{t('admin.advanced.experimentsTab.columns.infill')}</th>
                                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">{t('admin.advanced.experimentsTab.columns.data')}</th>
                                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">{t('admin.advanced.experimentsTab.columns.details')}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {approvedExperiments.slice((currentApprovedPage - 1) * experimentsPerPage, currentApprovedPage * experimentsPerPage).map((experiment) => (
                                    <tr 
                                      key={experiment.id} 
                                      className="transition cursor-pointer font-medium hover:bg-blue-50 hover:border-l-4 hover:border-blue-400"
                                      onClick={() => handleViewDetails(experiment.id)}
                                    >
                                      <td className="px-3 sm:px-4 py-3 font-semibold text-gray-900">
                                        {experiment.index_visual || '-'}
                                      </td>
                                      <td className="px-3 sm:px-4 py-3">
                                        <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(experiment.status).bgColor} ${getStatusBadge(experiment.status).textColor}`}>
                                          {getStatusBadge(experiment.status).icon} {getStatusBadge(experiment.status).label}
                                        </span>
                                      </td>
                                      <td className="px-3 sm:px-4 py-3 text-gray-600 whitespace-nowrap">
                                        {experiment.created_at ? (() => {const d = new Date(experiment.created_at); return i18n.language === 'en' || i18n.language === 'en-US' || i18n.language === 'en-GB' ? `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}` : d.toLocaleDateString('pt-BR')})() : '-'}
                                      </td>
                                      <td className="px-3 sm:px-4 py-3 text-gray-600 truncate max-w-xs">
                                        {experiment.researcher_name || '-'}
                                      </td>
                                      <td className="px-3 sm:px-4 py-3 text-gray-600 truncate max-w-xs">
                                        {experiment.material_brand && experiment.material_model 
                                          ? `${experiment.material_brand} ${experiment.material_model}`
                                          : experiment.material_brand || '-'
                                        }
                                      </td>
                                      <td className="px-3 sm:px-4 py-3 text-gray-600 truncate max-w-xs">
                                        {experiment.machine_brand && experiment.machine_model
                                          ? `${experiment.machine_brand} ${experiment.machine_model}`
                                          : experiment.machine_brand || '-'
                                        }
                                      </td>
                                      <td className="px-3 sm:px-4 py-3 text-gray-600 truncate max-w-xs">
                                        {experiment.shape_type || '-'}
                                      </td>
                                      <td className="px-3 sm:px-4 py-3 text-gray-600 font-medium">
                                        {experiment.infill_hu_mean ? experiment.infill_hu_mean.toFixed(2) : '-'}
                                      </td>
                                      <td className="px-3 sm:px-4 py-3 text-center h-full">
                                        <div className="flex gap-3 justify-center items-center h-full">
                                          {experiment.mechanical_data_count > 0 && (
                                            <span className="text-lg" title="Propriedades Mecânicas">
                                              ⚙️
                                            </span>
                                          )}
                                          {experiment.attenuation_data_count > 0 && (
                                            <span className="text-lg" title="Atenuação Linear">
                                              📉
                                            </span>
                                          )}
                                          {experiment.beam_qualities_exists && (
                                            <span className="text-lg" title="Qualidade de Feixes">
                                              ☢️
                                            </span>
                                          )}
                                          {experiment.mechanical_data_count === 0 && experiment.attenuation_data_count === 0 && !experiment.beam_qualities_exists && (
                                            <span className="text-gray-400 text-xs">-</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-3 sm:px-4 py-3">
                                        <button
                                          onClick={() => handleViewDetails(experiment.id)}
                                          className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium text-xs"
                                          title="Ver detalhes completos do experimento"
                                        >
                                          <Eye className="h-4 w-4" />
                                          Ver
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="px-6 py-8 text-center">
                              <p className="text-gray-500">{t('admin.advanced.experimentsTab.empty.approved')}</p>
                            </div>
                          )}
                        </div>
                        {/* Pagination for Approved Experiments */}
                        {approvedExperiments.length > experimentsPerPage && (
                          <div className="px-6 py-4 border-t border-gray-200 flex justify-center items-center gap-2">
                            <button
                              onClick={() => setCurrentApprovedPage(Math.max(1, currentApprovedPage - 1))}
                              disabled={currentApprovedPage === 1}
                              className="px-3 py-2 rounded text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Anterior
                            </button>
                            {Array.from({ length: Math.ceil(approvedExperiments.length / experimentsPerPage) }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => setCurrentApprovedPage(page)}
                                className={`px-3 py-2 rounded text-sm font-medium ${
                                  currentApprovedPage === page
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                            <button
                              onClick={() => setCurrentApprovedPage(Math.min(Math.ceil(approvedExperiments.length / experimentsPerPage), currentApprovedPage + 1))}
                              disabled={currentApprovedPage === Math.ceil(approvedExperiments.length / experimentsPerPage)}
                              className="px-3 py-2 rounded text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Próximo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Gerenciar Status Experimentos */}
            {activeTab === 'experiments' && (
              <div className="space-y-6 mt-12 pt-8 border-t border-gray-200">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">{t('admin.advanced.experimentsTab.history.title')}</h2>
                  <p className="text-gray-600 mb-6">
                    {t('admin.advanced.experimentsTab.history.description')}
                  </p>

                  {/* Filters */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('common.filters')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Old Status Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status Anterior</label>
                        <select
                          value={statusHistoryFilters.old_status}
                          onChange={(e) => {
                            setStatusHistoryFilters({ ...statusHistoryFilters, old_status: e.target.value })
                            setCurrentStatusHistoryPage(1)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Todos</option>
                          <option value="__NULL__">Inicial (Nenhum)</option>
                          <option value="Submitted">Submetido</option>
                          <option value="Review">Em Revisão</option>
                          <option value="Revisions">Ajustes</option>
                          <option value="Approved">Aprovado</option>
                        </select>
                      </div>

                      {/* New Status Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status Novo</label>
                        <select
                          value={statusHistoryFilters.new_status}
                          onChange={(e) => {
                            setStatusHistoryFilters({ ...statusHistoryFilters, new_status: e.target.value })
                            setCurrentStatusHistoryPage(1)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Todos</option>
                          <option value="Submitted">Submetido</option>
                          <option value="Review">Em Revisão</option>
                          <option value="Revisions">Ajustes</option>
                          <option value="Approved">Aprovado</option>
                        </select>
                      </div>

                      {/* Changed By Name Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Alterado Por (Nome)</label>
                        <input
                          type="text"
                          placeholder="Digite o nome..."
                          value={statusHistoryFilters.changed_by_name}
                          onChange={(e) => {
                            setStatusHistoryFilters({ ...statusHistoryFilters, changed_by_name: e.target.value })
                            setCurrentStatusHistoryPage(1)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Changed By Role Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Alterado Por (Papel)</label>
                        <select
                          value={statusHistoryFilters.changed_by_role}
                          onChange={(e) => {
                            setStatusHistoryFilters({ ...statusHistoryFilters, changed_by_role: e.target.value })
                            setCurrentStatusHistoryPage(1)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Todos os Papéis</option>
                          <option value="admin">Admin</option>
                          <option value="pesquisador">Pesquisador</option>
                        </select>
                      </div>

                      {/* Start Date Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
                        <input
                          type="date"
                          value={statusHistoryFilters.start_date}
                          onChange={(e) => {
                            setStatusHistoryFilters({ ...statusHistoryFilters, start_date: e.target.value })
                            setCurrentStatusHistoryPage(1)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* End Date Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
                        <input
                          type="date"
                          value={statusHistoryFilters.end_date}
                          onChange={(e) => {
                            setStatusHistoryFilters({ ...statusHistoryFilters, end_date: e.target.value })
                            setCurrentStatusHistoryPage(1)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={fetchStatusHistory}
                        disabled={statusHistoryLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                      >
                        {statusHistoryLoading ? 'Buscando...' : 'Buscar'}
                      </button>
                      <button
                        onClick={() => {
                          setStatusHistoryFilters({ old_status: '', new_status: '', changed_by_name: '', changed_by_role: '', start_date: '', end_date: '' })
                          setCurrentStatusHistoryPage(1)
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                      >
                        Limpar Filtros
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  {statusHistoryError && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-700">{statusHistoryError}</p>
                    </div>
                  )}

                  {/* Status History Table */}
                  {statusHistoryLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                      <div className="bg-gradient-to-r from-purple-50 via-purple-50 to-pink-50 px-6 py-4 border-b-2 border-purple-200">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-purple-900">Histórico de Status</h3>
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold text-sm">
                            {statusHistoryData.length} registros
                          </span>
                        </div>
                      </div>

                      {statusHistoryData.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs sm:text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                              <tr>
                                <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">Index</th>
                                <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">Status Anterior</th>
                                <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">Novo Status</th>
                                <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">Alterado Por</th>
                                <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">Papel</th>
                                <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">Comentário</th>
                                <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700">Data/Hora</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {statusHistoryData.slice((currentStatusHistoryPage - 1) * statusHistoryPerPage, currentStatusHistoryPage * statusHistoryPerPage).map((record, idx) => (
                                <tr key={idx} className="transition hover:bg-gray-50">
                                  <td className="px-3 sm:px-4 py-3 font-semibold text-gray-900">
                                    {experimentIndexMap[record.sample_id] || '-'}
                                  </td>
                                  <td className="px-3 sm:px-4 py-3">
                                    {record.old_status ? (
                                      <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(record.old_status).bgColor} ${getStatusBadge(record.old_status).textColor}`}>
                                        {getStatusBadge(record.old_status).icon} {getStatusBadge(record.old_status).label}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="px-3 sm:px-4 py-3">
                                    <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(record.new_status).bgColor} ${getStatusBadge(record.new_status).textColor}`}>
                                      {getStatusBadge(record.new_status).icon} {getStatusBadge(record.new_status).label}
                                    </span>
                                  </td>
                                  <td className="px-3 sm:px-4 py-3 text-gray-600 truncate max-w-xs">
                                    {record.changed_by_name || record.changed_by_email || '-'}
                                  </td>
                                  <td className="px-3 sm:px-4 py-3">
                                    {record.changed_by_role ? (
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        record.changed_by_role === 'admin'
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-blue-100 text-blue-700'
                                      }`}>
                                        {record.changed_by_role === 'admin' ? '🔐 Admin' : '👤 Pesquisador'}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="px-3 sm:px-4 py-3 text-gray-600 truncate max-w-xs" title={record.comment || ''}>
                                    {record.comment ? record.comment.substring(0, 30) + (record.comment.length > 30 ? '...' : '') : '-'}
                                  </td>
                                  <td className="px-3 sm:px-4 py-3 text-gray-600 whitespace-nowrap">
                                    {record.created_at ? formatDateTimeByLanguage(record.created_at, i18n.language) : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="px-6 py-8 text-center">
                          <p className="text-gray-500">Nenhum registro encontrado</p>
                        </div>
                      )}

                      {/* Pagination */}
                      {statusHistoryData.length > statusHistoryPerPage && (
                        <div className="px-6 py-4 border-t border-gray-200 flex justify-center items-center gap-2">
                          <button
                            onClick={() => setCurrentStatusHistoryPage(Math.max(1, currentStatusHistoryPage - 1))}
                            disabled={currentStatusHistoryPage === 1}
                            className="px-3 py-2 rounded text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Anterior
                          </button>
                          {Array.from({ length: Math.ceil(statusHistoryData.length / statusHistoryPerPage) }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentStatusHistoryPage(page)}
                              className={`px-3 py-2 rounded text-sm font-medium ${
                                currentStatusHistoryPage === page
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            onClick={() => setCurrentStatusHistoryPage(Math.min(Math.ceil(statusHistoryData.length / statusHistoryPerPage), currentStatusHistoryPage + 1))}
                            disabled={currentStatusHistoryPage === Math.ceil(statusHistoryData.length / statusHistoryPerPage)}
                            className="px-3 py-2 rounded text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Próximo
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Gerenciar Usuários */}
            {activeTab === 'users' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{t('admin.advanced.usersTab.title')}</h2>
                  <p className="text-gray-600 mb-6">
                    {t('admin.advanced.usersTab.description')}
                  </p>

                  {/* Usuários Regulares */}
                  <div className="mb-8">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="bg-gradient-to-r from-green-50 via-green-50 to-emerald-50 px-6 py-4 border-b-2 border-green-200">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-green-900">{t('admin.advanced.usersTab.regularUsers')}</h3>
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-sm">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            {regularUsers.length} {regularUsers.length === 1 ? t('admin.advanced.usersTab.userSingular') : t('admin.advanced.usersTab.userPlural')}
                          </span>
                        </div>
                      </div>
                      <UsersTable
                        users={regularUsers}
                        status="regular"
                        isLoading={loadingStates.regular}
                        error={errorStates.regular}
                        onStatusChange={handleUserClick}
                        onViewDetails={(user) => {
                          setSelectedUser(user)
                          setShowUserDetailsModal(true)
                        }}
                      />
                    </div>
                  </div>

                  {/* Usuários Irregulares */}
                  <div className="mb-8">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="bg-gradient-to-r from-yellow-50 via-yellow-50 to-amber-50 px-6 py-4 border-b-2 border-yellow-200">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-yellow-900">{t('admin.advanced.usersTab.irregularUsers')}</h3>
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold text-sm">
                            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                            {irregularUsers.length} {irregularUsers.length === 1 ? t('admin.advanced.usersTab.userSingular') : t('admin.advanced.usersTab.userPlural')}
                          </span>
                        </div>
                      </div>
                      <UsersTable
                        users={irregularUsers}
                        status="irregular"
                        isLoading={loadingStates.irregular}
                        error={errorStates.irregular}
                        onStatusChange={handleUserClick}
                        onViewDetails={(user) => {
                          setSelectedUser(user)
                          setShowUserDetailsModal(true)
                        }}
                      />
                    </div>
                  </div>

                  {/* Usuários Desativados */}
                  <div className="mb-8">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="bg-gradient-to-r from-gray-50 via-gray-50 to-slate-50 px-6 py-4 border-b-2 border-gray-200">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">{t('admin.advanced.usersTab.deactivatedUsers')}</h3>
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-200 text-gray-700 font-semibold text-sm">
                            <span className="w-2 h-2 rounded-full bg-gray-500 animate-pulse"></span>
                            {desativatedUsers.length} {desativatedUsers.length === 1 ? t('admin.advanced.usersTab.userSingular') : t('admin.advanced.usersTab.userPlural')}
                          </span>
                        </div>
                      </div>
                      <UsersTable
                        users={desativatedUsers}
                        status="desativado"
                        isLoading={loadingStates.desativado}
                        error={errorStates.desativado}
                        onStatusChange={handleUserClick}
                        onViewDetails={(user) => {
                          setSelectedUser(user)
                          setShowUserDetailsModal(true)
                        }}
                      />
                    </div>
                  </div>

                  {/* Update Status Form */}
                  <div className="mt-12 pt-8 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">
                      {t('admin.advanced.usersTab.updateStatusTitle')}
                    </h3>
                    {showUpdateForm ? (
                      <UpdateStatusForm
                        prefilledEmail={prefilledEmail}
                        onStatusUpdate={handleStatusUpdate}
                        onDismiss={() => {
                          setShowUpdateForm(false)
                          setPrefilledEmail('')
                        }}
                      />
                    ) : (
                      <div className="text-center py-8 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-orange-700 mb-4">
                          {t('admin.advanced.usersTab.updateFormHint')}
                        </p>
                        <button
                          onClick={() => setShowUpdateForm(true)}
                          className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                        >
                          {t('admin.advanced.usersTab.openForm')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Administradores */}
            {activeTab === 'administradores' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{t('admin.advanced.adminsTab.title')}</h2>
                  <p className="text-gray-600 mb-6">
                    {t('admin.advanced.adminsTab.description')}
                  </p>

                  {/* Admins List */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="h-5 w-5 text-orange-600" />
                      <h3 className="text-lg font-semibold text-gray-800">
                        Administradores ({admins.length})
                      </h3>
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <AdminsTable
                        admins={admins}
                        isLoading={adminsLoading}
                        error={adminsError}
                      />
                    </div>
                  </div>

                  {/* Update Role Form */}
                  <div className="mt-12 pt-8 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">
                      {selectedAdmin ? t('admin.advanced.adminsTab.editPermissions') : t('admin.advanced.adminsTab.promoteTitle')}
                    </h3>
                    {showAdminRoleForm ? (
                      <UpdateAdminRoleForm
                        admin={selectedAdmin}
                        onSubmit={handleAdminRoleUpdate}
                        isLoading={adminsLoading}
                        onSuccess={handleAdminRoleUpdateSuccess}
                      />
                    ) : (
                      <div className="text-center py-8 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-orange-700 mb-4">
                          {t('admin.advanced.adminsTab.promoteHint')}
                        </p>
                        <button
                          onClick={() => setShowAdminRoleForm(true)}
                          className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                        >
                          {t('admin.advanced.adminsTab.openForm')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Banco de Dados */}
            {activeTab === 'database' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">{t('admin.advanced.databaseTab.title')}</h2>
                  <p className="text-gray-600 mb-6">
                    {t('admin.advanced.databaseTab.description')}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-bold text-blue-900 mb-2">{t('admin.advanced.databaseTab.integrity.title')}</h3>
                      <p className="text-sm text-blue-700 mb-4">
                        {t('admin.advanced.databaseTab.integrity.description')}
                      </p>
                      <button 
                        onClick={handleCheckIntegrity}
                        disabled={isCheckingIntegrity}
                        className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2 ${
                          isCheckingIntegrity
                            ? 'bg-blue-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {isCheckingIntegrity ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('admin.advanced.databaseTab.integrity.checking')}
                          </>
                        ) : (
                          <>
                            <Database className="h-4 w-4" />
                            {t('admin.advanced.databaseTab.integrity.button')}
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-bold text-green-900 mb-2">{t('admin.advanced.databaseTab.backup.title')}</h3>
                      <p className="text-sm text-green-700 mb-4">
                        {t('admin.advanced.databaseTab.backup.description')}
                      </p>
                      {exportMessage && (
                        <div className={`mb-4 p-3 rounded text-sm ${
                          exportMessage.type === 'success' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {exportMessage.text}
                        </div>
                      )}
                      <button 
                        onClick={handleExportTables}
                        disabled={isExportingTables}
                        className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2 ${
                          isExportingTables
                            ? 'bg-green-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {isExportingTables ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('admin.advanced.databaseTab.backup.exporting')}
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            {t('admin.advanced.databaseTab.backup.button')}
                          </>
                        )}
                      </button>
                    </div>

                    <DatabaseDangerZone
                      onDataChanged={() => {
                        fetchExperiments()
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Sistema */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{t('admin.advanced.systemTab.title')}</h2>
                  <p className="text-gray-600 mb-6">
                    {t('admin.advanced.systemTab.description')}
                  </p>

                  {/* Filters Section */}
                  <div className="bg-gray-100 rounded-lg border border-gray-200 p-6 mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('admin.advanced.systemTab.filters.title')}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                      {/* Action Category */}
                      <select
                        value={logFilters.action_category}
                        onChange={(e) => setLogFilters({...logFilters, action_category: e.target.value})}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">{t('admin.advanced.systemTab.filters.allCategories')}</option>
                        <option value="CREATE">{t('admin.advanced.systemTab.filters.create')}</option>
                        <option value="UPDATE">{t('admin.advanced.systemTab.filters.update')}</option>
                        <option value="DELETE">{t('admin.advanced.systemTab.filters.delete')}</option>
                        <option value="STATUS_CHANGE">{t('admin.advanced.systemTab.filters.statusChange')}</option>
                        <option value="AUTH">{t('admin.advanced.systemTab.filters.auth')}</option>
                        <option value="ERROR">{t('admin.advanced.systemTab.filters.error')}</option>
                      </select>

                      {/* Severity Level */}
                      <select
                        value={logFilters.severity_level}
                        onChange={(e) => setLogFilters({...logFilters, severity_level: e.target.value})}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">{t('admin.advanced.systemTab.filters.allSeverities')}</option>
                        <option value="INFO">ℹ️ {t('admin.advanced.systemTab.filters.info')}</option>
                        <option value="WARNING">⚠️ {t('admin.advanced.systemTab.filters.warning')}</option>
                        <option value="ERROR">❌ {t('admin.advanced.systemTab.filters.error')}</option>
                        <option value="CRITICAL">🔴 {t('admin.advanced.systemTab.filters.critical')}</option>
                      </select>

                      {/* Entity Name */}
                      <input
                        type="text"
                        placeholder={t('admin.advanced.systemTab.filters.entityPlaceholder')}
                        value={logFilters.entity_name}
                        onChange={(e) => setLogFilters({...logFilters, entity_name: e.target.value})}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      {/* Start Date */}
                      <input
                        type="date"
                        value={logFilters.start_date}
                        onChange={(e) => setLogFilters({...logFilters, start_date: e.target.value})}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      {/* End Date */}
                      <input
                        type="date"
                        value={logFilters.end_date}
                        onChange={(e) => setLogFilters({...logFilters, end_date: e.target.value})}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleApplyLogFilters}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        {t('admin.advanced.systemTab.filters.apply')}
                      </button>
                      <button
                        onClick={handleClearLogFilters}
                        className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium"
                      >
                        {t('admin.advanced.systemTab.filters.clear')}
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  {logsError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-red-900">{t('admin.advanced.systemTab.table.error')}</h3>
                        <p className="text-sm text-red-700">{logsError}</p>
                      </div>
                    </div>
                  )}

                  {/* Loading State */}
                  {logsLoading && (
                    <div className="flex justify-center p-8">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <p className="text-gray-600">{t('admin.advanced.systemTab.table.loading')}</p>
                      </div>
                    </div>
                  )}

                  {/* Logs Table */}
                  {!logsLoading && systemLogs.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-50 via-blue-50 to-cyan-50 px-6 py-4 border-b-2 border-blue-200">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-blue-900">Logs do Sistema</h3>
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            {systemLogs.length} registros
                          </span>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Data/Hora</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Categoria</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Severidade</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Tipo de Ação</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Descrição</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Usuário</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {systemLogs.slice((currentLogPage - 1) * logsPerPage, currentLogPage * logsPerPage).map((log: any, idx: number) => {
                              // Format date correctly, handling various possible input formats
                              let formattedDate = '-'
                              try {
                                const dateStr = log.created_at || log.timestamp
                                if (dateStr) {
                                  const date = new Date(dateStr)
                                  // Validate that date is valid
                                  if (!isNaN(date.getTime())) {
                                    formattedDate = date.toLocaleString('pt-BR')
                                  }
                                }
                              } catch (e) {
                                console.warn('[Logs] Error formatting date:', log.created_at || log.timestamp, e)
                              }

                              return (
                              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-sm text-gray-900 font-medium whitespace-nowrap">
                                  {formattedDate}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {log.action_category || '-'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    log.severity_level === 'INFO' ? 'bg-blue-100 text-blue-800' :
                                    log.severity_level === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                                    log.severity_level === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {log.severity_level || '-'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-mono">
                                    {log.action_type || log.entity_name || '-'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {log.description || log.message || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-medium text-gray-900">
                                      {log.user_name || log.user_email || log.user_id || '-'}
                                    </span>
                                    <span className="text-xs text-gray-500 font-mono">
                                      {log.ip_address || '-'}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            )})}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {Math.ceil(systemLogs.length / logsPerPage) > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200 flex justify-center items-center gap-2">
                          <button
                            onClick={() => setCurrentLogPage(Math.max(1, currentLogPage - 1))}
                            disabled={currentLogPage === 1}
                            className="px-3 py-2 rounded text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Anterior
                          </button>
                          {Array.from({ length: Math.ceil(systemLogs.length / logsPerPage) }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentLogPage(page)}
                              className={`px-3 py-2 rounded text-sm font-medium ${
                                currentLogPage === page
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            onClick={() => setCurrentLogPage(Math.min(Math.ceil(systemLogs.length / logsPerPage), currentLogPage + 1))}
                            disabled={currentLogPage === Math.ceil(systemLogs.length / logsPerPage)}
                            className="px-3 py-2 rounded text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Próximo
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Empty State */}
                  {!logsLoading && systemLogs.length === 0 && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
                      <p className="text-gray-600">{t('admin.advanced.systemTab.table.noLogs')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Database Integrity Modal */}
        {showIntegrityModal && integrityResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className={`px-6 py-4 border-b ${
                integrityResult.overall_health === 'healthy' ? 'bg-green-50 border-green-200' :
                integrityResult.overall_health === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className={`text-xl font-bold ${
                      integrityResult.overall_health === 'healthy' ? 'text-green-900' :
                      integrityResult.overall_health === 'warning' ? 'text-yellow-900' :
                      'text-red-900'
                    }`}>
                      {t('admin.advanced.databaseTab.integrity.modalTitle')}
                    </h2>
                    <p className={`text-sm mt-1 ${
                      integrityResult.overall_health === 'healthy' ? 'text-green-700' :
                      integrityResult.overall_health === 'warning' ? 'text-yellow-700' :
                      'text-red-700'
                    }`}>
                      {integrityResult.message}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowIntegrityModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 space-y-4">
                {/* Status Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">{t('admin.advanced.databaseTab.integrity.connectionStatus')}</p>
                    <p className={`text-sm font-semibold ${
                      integrityResult.connection_status ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {integrityResult.connection_status ? t('admin.advanced.databaseTab.integrity.connected') : t('admin.advanced.databaseTab.integrity.disconnected')}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">{t('admin.advanced.databaseTab.integrity.generalHealth')}</p>
                    <p className={`text-sm font-semibold ${
                      integrityResult.overall_health === 'healthy' ? 'text-green-600' :
                      integrityResult.overall_health === 'warning' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {integrityResult.overall_health === 'healthy' ? t('admin.advanced.databaseTab.integrity.intact') :
                       integrityResult.overall_health === 'warning' ? t('admin.advanced.databaseTab.integrity.withWarnings') :
                       t('admin.advanced.databaseTab.integrity.withErrors')}
                    </p>
                  </div>
                </div>

                {/* Tables Status - Grid Layout */}
                {integrityResult.tables && integrityResult.tables.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">{t('admin.advanced.databaseTab.integrity.tablesStatus', { count: integrityResult.tables.length })}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {integrityResult.tables.map((table: any, idx: number) => (
                        <div key={idx} className={`p-3 border rounded-lg transition-colors ${
                          table.status === 'healthy' ? 'bg-green-50 border-green-200 hover:bg-green-100' :
                          table.status === 'warning' ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100' :
                          'bg-red-50 border-red-200 hover:bg-red-100'
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate">{table.table_name}</p>
                              <p className={`text-xs mt-1 font-semibold ${
                                table.status === 'healthy' ? 'text-green-700' :
                                table.status === 'warning' ? 'text-yellow-700' :
                                'text-red-700'
                              }`}>
                                {table.message}
                              </p>
                            </div>
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
                              table.status === 'healthy' ? 'bg-green-200 text-green-900' :
                              table.status === 'warning' ? 'bg-yellow-200 text-yellow-900' :
                              'bg-red-200 text-red-900'
                            }`}>
                              {table.status === 'healthy' ? '✓' :
                               table.status === 'warning' ? '⚠' :
                               'ERRO'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div className="text-xs text-gray-500 pt-3 border-t">
                  {t('admin.advanced.databaseTab.integrity.verifiedAt', { date: new Date(integrityResult.timestamp).toLocaleString('pt-BR') })}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t bg-gray-50 flex justify-end gap-2">
                <button
                  onClick={() => setShowIntegrityModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  {t('common.close')}
                </button>
                <button
                  onClick={handleCheckIntegrity}
                  disabled={isCheckingIntegrity}
                  className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium ${
                    isCheckingIntegrity
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isCheckingIntegrity ? t('admin.advanced.databaseTab.integrity.checking') : t('admin.advanced.databaseTab.integrity.checkAgain')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* System Health Modal */}
        {showHealthModal && systemHealthResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className={`px-6 py-4 border-b ${
                systemHealthResult.overall_status === 'healthy' ? 'bg-green-50 border-green-200' :
                systemHealthResult.overall_status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className={`text-xl font-bold ${
                      systemHealthResult.overall_status === 'healthy' ? 'text-green-900' :
                      systemHealthResult.overall_status === 'warning' ? 'text-yellow-900' :
                      'text-red-900'
                    }`}>
                      {t('admin.advanced.systemTab.systemHealth.modalTitle')}
                    </h2>
                    <p className={`text-sm mt-1 ${
                      systemHealthResult.overall_status === 'healthy' ? 'text-green-700' :
                      systemHealthResult.overall_status === 'warning' ? 'text-yellow-700' :
                      'text-red-700'
                    }`}>
                      {systemHealthResult.summary}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowHealthModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 space-y-4">
                {/* Components Status - Grid Layout */}
                {systemHealthResult.components && systemHealthResult.components.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Componentes do Sistema ({systemHealthResult.components.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {systemHealthResult.components.map((component: any, idx: number) => (
                        <div key={idx} className={`p-3 border rounded-lg transition-colors ${
                          component.status === 'healthy' ? 'bg-green-50 border-green-200 hover:bg-green-100' :
                          component.status === 'warning' ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100' :
                          'bg-red-50 border-red-200 hover:bg-red-100'
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm">{component.component}</p>
                              <p className={`text-xs mt-1 font-semibold ${
                                component.status === 'healthy' ? 'text-green-700' :
                                component.status === 'warning' ? 'text-yellow-700' :
                                'text-red-700'
                              }`}>
                                {component.message}
                              </p>
                              {component.response_time_ms && (
                                <p className="text-xs text-gray-600 mt-1">
                                  Latência: {component.response_time_ms.toFixed(1)}ms
                                </p>
                              )}
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap ${
                              component.status === 'healthy' ? 'bg-green-200 text-green-900' :
                              component.status === 'warning' ? 'bg-yellow-200 text-yellow-900' :
                              'bg-red-200 text-red-900'
                            }`}>
                              {component.status === 'healthy' ? '✓' :
                               component.status === 'warning' ? '⚠' :
                               'ERRO'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {systemHealthResult.recommendations && systemHealthResult.recommendations.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Recomendações</h3>
                    <ul className="space-y-1">
                      {systemHealthResult.recommendations.map((rec: string, idx: number) => (
                        <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                          <span className="text-blue-600 font-bold">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Timestamp */}
                <div className="text-xs text-gray-500 pt-3 border-t">
                  Verificado em: {new Date(systemHealthResult.timestamp).toLocaleString('pt-BR')}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t bg-gray-50 flex justify-end gap-2">
                <button
                  onClick={() => setShowHealthModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Fechar
                </button>
                <button
                  onClick={handleCheckSystemHealth}
                  disabled={isCheckingSystemHealth}
                  className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium ${
                    isCheckingSystemHealth
                      ? 'bg-purple-400 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {isCheckingSystemHealth ? t('admin.advanced.databaseTab.integrity.checking') : t('admin.advanced.databaseTab.integrity.checkAgain')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Experiment Details Modal */}
        {showExperimentDetailsModal && selectedExperiment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 via-blue-50 to-cyan-50 border-blue-200 sticky top-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-blue-900">
                      {t('admin.advanced.experimentsTab.detailsModal.title')}
                    </h2>
                    <p className="text-sm text-blue-700 mt-1">
                      {t('admin.advanced.experimentsTab.detailsModal.subtitle')}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowExperimentDetailsModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Loading State */}
              {experimentDetailsLoading && (
                <div className="px-6 py-12 flex justify-center items-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-blue-600 font-medium">{t('admin.advanced.experimentsTab.detailsModal.loading')}</span>
                </div>
              )}

              {/* Content */}
              {!experimentDetailsLoading && experimentFullData && (
                <div className="px-6 py-6 space-y-6">
                  {/* Informações Básicas do Experimento */}
                  <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                    <h3 className="text-lg font-bold text-blue-900 mb-4">{t('admin.advanced.experimentsTab.detailsModal.basicInfo')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-white rounded border border-blue-100">
                        <p className="text-xs text-gray-600 uppercase font-semibold">Index</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{selectedExperiment.index_visual || '-'}</p>
                      </div>
                      <div className="p-3 bg-white rounded border border-blue-100">
                        <p className="text-xs text-gray-600 uppercase font-semibold">Status</p>
                        <p className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mt-1 ${getStatusBadge(selectedExperiment.status).bgColor} ${getStatusBadge(selectedExperiment.status).textColor}`}>
                          {getStatusBadge(selectedExperiment.status).icon} {getStatusBadge(selectedExperiment.status).label}
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded border border-blue-100">
                        <p className="text-xs text-gray-600 uppercase font-semibold">Pesquisador</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{experimentFullData.researcher?.name || '-'}</p>
                      </div>
                      <div className="p-3 bg-white rounded border border-blue-100">
                        <p className="text-xs text-gray-600 uppercase font-semibold">Data de Criação</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{formatDateTime(selectedExperiment.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* ==================== ETAPAS DO EXPERIMENTO ==================== */}

                  {/* ETAPA 1: Máquinas e Material */}
                  {(() => {
                    const isComplete = isStageComplete('material_machine')
                    const style = getStageStyle(isComplete)
                    return (
                      <div className={`border rounded-lg p-4 ${style.bg} ${style.border}`}>
                        <div className={`${style.headerBg} -m-4 mb-4 p-4 rounded-t-lg`}>
                          <div className="flex items-center justify-between">
                            <h3 className={`text-lg font-bold ${style.textColor}`}>⚙️ Máquinas e Material</h3>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${style.headerBg} text-gray-700`}>
                              {style.icon} {style.status}
                            </span>
                          </div>
                        </div>

                        {isComplete ? (
                          <div className="space-y-4">
                            {/* Material */}
                            {experimentFullData.material && (
                              <div className="border rounded p-3 bg-white border-green-100">
                                <p className="text-xs font-bold text-green-700 uppercase mb-3">🎨 Material</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-gray-600 font-semibold">Marca</p>
                                    <p className="text-gray-900 mt-1">{experimentFullData.material.brand || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600 font-semibold">Modelo</p>
                                    <p className="text-gray-900 mt-1">{experimentFullData.material.model || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600 font-semibold">Cor</p>
                                    <p className="text-gray-900 mt-1">{experimentFullData.material.color || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600 font-semibold">Compósito</p>
                                    <p className="text-gray-900 mt-1">{experimentFullData.material.is_composite ? '✅ Sim' : '❌ Não'}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Máquina */}
                            {experimentFullData.machine && (
                              <div className="border rounded p-3 bg-white border-green-100">
                                <p className="text-xs font-bold text-green-700 uppercase mb-3">⚙️ Máquina</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-gray-600 font-semibold">Marca</p>
                                    <p className="text-gray-900 mt-1">{experimentFullData.machine.brand || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600 font-semibold">Modelo</p>
                                    <p className="text-gray-900 mt-1">{experimentFullData.machine.model || '-'}</p>
                                  </div>
                                  <div className="md:col-span-2">
                                    <p className="text-gray-600 font-semibold">Tipo de Tecnologia</p>
                                    <p className="text-gray-900 mt-1">{experimentFullData.machine.technology_type || '-'}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className={`text-sm font-semibold ${style.textColor}`}>Nenhum dado de material ou máquina foi preenchido.</p>
                        )}
                      </div>
                    )
                  })()}

                  {/* ETAPA 2: Amostra */}
                  {(() => {
                    const isComplete = isStageComplete('sample')
                    const style = getStageStyle(isComplete)
                    return (
                      <div className={`border rounded-lg p-4 ${style.bg} ${style.border}`}>
                        <div className={`${style.headerBg} -m-4 mb-4 p-4 rounded-t-lg`}>
                          <div className="flex items-center justify-between">
                            <h3 className={`text-lg font-bold ${style.textColor}`}>🧪 Amostra</h3>
                            <span className={`px-2 py-1 rounded text-xs font-semibold text-gray-700`}>
                              {style.icon} {style.status}
                            </span>
                          </div>
                        </div>

                        {isComplete && experimentFullData.sample ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="p-3 bg-white rounded border border-green-100">
                              <p className="text-xs text-gray-600 font-semibold">Tipo de Forma</p>
                              <p className="text-sm font-bold text-gray-900 mt-1">{getShapeEmoji(experimentFullData.sample.shape_type)} {experimentFullData.sample.shape_type || '-'}</p>
                            </div>
                            <div className="p-3 bg-white rounded border border-green-100">
                              <p className="text-xs text-gray-600 font-semibold">Dimensão A</p>
                              <p className="text-sm font-bold text-gray-900 mt-1">{experimentFullData.sample.dimension_a || '-'}</p>
                            </div>
                            <div className="p-3 bg-white rounded border border-green-100">
                              <p className="text-xs text-gray-600 font-semibold">Dimensão B</p>
                              <p className="text-sm font-bold text-gray-900 mt-1">{experimentFullData.sample.dimension_b || '-'}</p>
                            </div>
                            <div className="p-3 bg-white rounded border border-green-100">
                              <p className="text-xs text-gray-600 font-semibold">Índice Visual</p>
                              <p className="text-sm font-bold text-gray-900 mt-1">{experimentFullData.sample.index_visual || '-'}</p>
                            </div>
                            <div className="p-3 bg-white rounded border border-green-100">
                              <p className="text-xs text-gray-600 font-semibold">Regressão A</p>
                              <p className="text-sm font-bold text-gray-900 mt-1">{experimentFullData.sample.regression_a || '-'}</p>
                            </div>
                            <div className="p-3 bg-white rounded border border-green-100">
                              <p className="text-xs text-gray-600 font-semibold">Regressão B</p>
                              <p className="text-sm font-bold text-gray-900 mt-1">{experimentFullData.sample.regression_b || '-'}</p>
                            </div>
                          </div>
                        ) : (
                          <p className={`text-sm font-semibold ${style.textColor}`}>Nenhum dado de amostra foi preenchido.</p>
                        )}
                      </div>
                    )
                  })()}

                  {/* ETAPA 3: Infill */}
                  {(() => {
                    const isComplete = isStageComplete('infill')
                    const style = getStageStyle(isComplete)
                    return (
                      <div className={`border rounded-lg p-4 ${style.bg} ${style.border}`}>
                        <div className={`${style.headerBg} -m-4 mb-4 p-4 rounded-t-lg`}>
                          <div className="flex items-center justify-between">
                            <h3 className={`text-lg font-bold ${style.textColor}`}>📈 Medições de Preenchimento (Infill)</h3>
                            <span className={`px-2 py-1 rounded text-xs font-semibold text-gray-700`}>
                              {style.icon} {style.status}
                            </span>
                          </div>
                        </div>

                        {isComplete && experimentFullData.infill_measurements && experimentFullData.infill_measurements.length > 0 ? (
                          <div className="space-y-3">
                            {experimentFullData.infill_measurements
                              .sort((a: any, b: any) => {
                                const aPercentage = a.infill_pct ?? a.infill_percentage ?? 0
                                const bPercentage = b.infill_pct ?? b.infill_percentage ?? 0
                                return aPercentage - bPercentage
                              })
                              .map((im: any, idx: number) => (
                              <div key={idx} className="p-3 bg-white rounded border border-green-100">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                  <div>
                                    <p className="text-gray-600 font-semibold">Preenchimento</p>
                                    <p className="text-gray-900 font-bold mt-1">{im.infill_pct}%</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600 font-semibold">Hu Média</p>
                                    <p className="text-gray-900 font-bold mt-1">{im.hu_mean || '-'}</p>
                                  </div>
                                  {im.notes && (
                                    <div>
                                      <p className="text-gray-600 font-semibold">Notas</p>
                                      <p className="text-gray-900 font-bold mt-1">{im.notes}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className={`text-sm font-semibold ${style.textColor}`}>Nenhum dado de infill foi preenchido.</p>
                        )}
                      </div>
                    )
                  })()}

                  {/* ETAPA 4: Qualidade de Feixe */}
                  {(() => {
                    const isComplete = isStageComplete('beam_qualities')
                    const style = getStageStyle(isComplete)
                    return (
                      <div className={`border rounded-lg p-4 ${style.bg} ${style.border}`}>
                        <div className={`${style.headerBg} -m-4 mb-4 p-4 rounded-t-lg`}>
                          <div className="flex items-center justify-between">
                            <h3 className={`text-lg font-bold ${style.textColor}`}>📊 Qualidades de Feixe (Beam Quality)</h3>
                            <span className={`px-2 py-1 rounded text-xs font-semibold text-gray-700`}>
                              {style.icon} {style.status}
                            </span>
                          </div>
                        </div>

                        {isComplete && experimentFullData.beam_qualities && experimentFullData.beam_qualities.length > 0 ? (
                          <div className="space-y-3">
                            {experimentFullData.beam_qualities.map((bq: any, idx: number) => (
                              <div key={idx} className="p-3 bg-white rounded border border-green-100">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                  {Object.entries(bq).map(([key, value]: [string, any]) => 
                                    key !== 'id' && key !== 'sample_id' && key !== 'created_at' && value !== null && (
                                      <div key={key}>
                                        <p className="text-gray-600 font-semibold capitalize">{key.replace(/_/g, ' ')}</p>
                                        <p className="text-gray-900 font-bold mt-1">{String(value)}</p>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className={`text-sm font-semibold ${style.textColor}`}>Nenhum dado de qualidade de feixe foi preenchido.</p>
                        )}
                      </div>
                    )
                  })()}

                  {/* ETAPA 5: Atenuação Linear */}
                  {(() => {
                    const isComplete = isStageComplete('linear_attenuation')
                    const style = getStageStyle(isComplete)
                    return (
                      <div className={`border rounded-lg p-4 ${style.bg} ${style.border}`}>
                        <div className={`${style.headerBg} -m-4 mb-4 p-4 rounded-t-lg`}>
                          <div className="flex items-center justify-between">
                            <h3 className={`text-lg font-bold ${style.textColor}`}>📏 Atenuação Linear</h3>
                            <span className={`px-2 py-1 rounded text-xs font-semibold text-gray-700`}>
                              {style.icon} {style.status}
                            </span>
                          </div>
                        </div>

                        {isComplete && experimentFullData.linear_attenuation && experimentFullData.linear_attenuation.length > 0 ? (
                          <div className="space-y-3">
                            {experimentFullData.linear_attenuation.map((la: any, idx: number) => (
                              <div key={idx} className="p-3 bg-white rounded border border-green-100">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <p className="text-gray-600 font-semibold">Espessura</p>
                                    <p className="text-gray-900 font-bold mt-1">{la.thickness || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600 font-semibold">Lambert-Beer</p>
                                    <p className="text-gray-900 font-bold mt-1">{la.value_lambert_beer || '-'}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className={`text-sm font-semibold ${style.textColor}`}>Nenhum dado de atenuação linear foi preenchido.</p>
                        )}
                      </div>
                    )
                  })()}

                  {/* ETAPA 6: Propriedades Mecânicas */}
                  {(() => {
                    const isComplete = isStageComplete('mechanical')
                    const style = getStageStyle(isComplete)
                    return (
                      <div className={`border rounded-lg p-4 ${style.bg} ${style.border}`}>
                        <div className={`${style.headerBg} -m-4 mb-4 p-4 rounded-t-lg`}>
                          <div className="flex items-center justify-between">
                            <h3 className={`text-lg font-bold ${style.textColor}`}>💪 Propriedades Mecânicas</h3>
                            <span className={`px-2 py-1 rounded text-xs font-semibold text-gray-700`}>
                              {style.icon} {style.status}
                            </span>
                          </div>
                        </div>

                        {isComplete && experimentFullData.mechanical_properties && experimentFullData.mechanical_properties.length > 0 ? (
                          <div className="space-y-3">
                            {experimentFullData.mechanical_properties.map((mp: any, idx: number) => (
                              <div key={idx} className="p-3 bg-white rounded border border-green-100">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                  {mp.test_condition && (
                                    <div className="md:col-span-3 p-2 bg-green-50 rounded">
                                      <p className="text-xs text-green-700 font-bold">Condição de Teste</p>
                                      <p className="text-green-900 font-bold">{mp.test_condition}</p>
                                    </div>
                                  )}
                                  {mp.tensile_modulus_mpa !== null && (
                                    <div>
                                      <p className="text-gray-600 font-semibold">Módulo de Tração</p>
                                      <p className="text-gray-900 font-bold mt-1">{mp.tensile_modulus_mpa} MPa</p>
                                    </div>
                                  )}
                                  {mp.tensile_strength_mpa !== null && (
                                    <div>
                                      <p className="text-gray-600 font-semibold">Resistência à Tração</p>
                                      <p className="text-gray-900 font-bold mt-1">{mp.tensile_strength_mpa} MPa</p>
                                    </div>
                                  )}
                                  {mp.break_deformation_percent !== null && (
                                    <div>
                                      <p className="text-gray-600 font-semibold">Deformação</p>
                                      <p className="text-gray-900 font-bold mt-1">{mp.break_deformation_percent}%</p>
                                    </div>
                                  )}
                                  {mp.flexural_modulus_mpa !== null && (
                                    <div>
                                      <p className="text-gray-600 font-semibold">Módulo de Flexão</p>
                                      <p className="text-gray-900 font-bold mt-1">{mp.flexural_modulus_mpa} MPa</p>
                                    </div>
                                  )}
                                  {mp.flexural_strength_mpa !== null && (
                                    <div>
                                      <p className="text-gray-600 font-semibold">Resistência à Flexão</p>
                                      <p className="text-gray-900 font-bold mt-1">{mp.flexural_strength_mpa} MPa</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className={`text-sm font-semibold ${style.textColor}`}>Nenhum dado de propriedades mecânicas foi preenchido.</p>
                        )}
                      </div>
                    )
                  })()}

                  {/* Card com Informações do Pesquisador */}
                  {experimentFullData.researcher && (
                    <div className="border rounded-lg p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300">
                      <h3 className="text-lg font-bold text-emerald-900 mb-4">👤 Informações do Pesquisador</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nome */}
                        <div className="md:col-span-2 p-3 bg-white rounded border border-emerald-100">
                          <p className="text-xs text-gray-600 uppercase font-semibold">Nome Completo</p>
                          <p className="text-sm font-bold text-gray-900 mt-1">{experimentFullData.researcher.name || '-'}</p>
                        </div>

                        {/* Email */}
                        <div className="p-3 bg-white rounded border border-emerald-100">
                          <p className="text-xs text-gray-600 uppercase font-semibold">Email</p>
                          <a 
                            href={`mailto:${experimentFullData.researcher.email}`}
                            className="text-sm font-semibold text-emerald-600 hover:text-emerald-800 hover:underline mt-1 break-all"
                          >
                            {experimentFullData.researcher.email || '-'}
                          </a>
                        </div>

                        {/* Instituição */}
                        <div className="p-3 bg-white rounded border border-emerald-100">
                          <p className="text-xs text-gray-600 uppercase font-semibold">Instituição</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{experimentFullData.researcher.institution || '-'}</p>
                        </div>

                        {/* Telefone */}
                        {experimentFullData.researcher.phone_number && (
                          <div className="p-3 bg-white rounded border border-emerald-100">
                            <p className="text-xs text-gray-600 uppercase font-semibold">Telefone</p>
                            <a 
                              href={`tel:${experimentFullData.researcher.phone_number}`}
                              className="text-sm font-semibold text-emerald-600 hover:text-emerald-800 hover:underline mt-1"
                            >
                              {experimentFullData.researcher.phone_number}
                            </a>
                          </div>
                        )}

                        {/* Instagram */}
                        {experimentFullData.researcher.instagram && (
                          <div className="p-3 bg-white rounded border border-emerald-100">
                            <p className="text-xs text-gray-600 uppercase font-semibold">Instagram</p>
                            <a 
                              href={`https://instagram.com/${experimentFullData.researcher.instagram.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-semibold text-emerald-600 hover:text-emerald-800 hover:underline mt-1 flex items-center gap-1"
                            >
                              <span>@{experimentFullData.researcher.instagram.replace('@', '')}</span>
                              <span>↗</span>
                            </a>
                          </div>
                        )}

                        {/* País */}
                        {experimentFullData.researcher.country && (
                          <div className="p-3 bg-white rounded border border-emerald-100">
                            <p className="text-xs text-gray-600 uppercase font-semibold">País</p>
                            <p className="text-sm font-semibold text-gray-900 mt-1">{experimentFullData.researcher.country}</p>
                          </div>
                        )}

                        {/* Idioma */}
                        {experimentFullData.researcher.language && (
                          <div className="p-3 bg-white rounded border border-emerald-100">
                            <p className="text-xs text-gray-600 uppercase font-semibold">Idioma</p>
                            <p className="text-sm font-semibold text-gray-900 mt-1">{experimentFullData.researcher.language}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status Message */}
              {statusChangeMessage && (
                <div className={`p-4 rounded-lg font-medium text-sm animate-pulse ${
                  statusChangeMessage.type === 'success'
                    ? 'bg-green-100 border-l-4 border-green-500 text-green-800 shadow-lg'
                    : 'bg-red-100 border-l-4 border-red-500 text-red-800 shadow-lg'
                }`}>
                  <div className="flex items-center gap-2">
                    {statusChangeMessage.type === 'success' ? (
                      <>
                        <span className="text-xl">✅</span>
                        <span>{statusChangeMessage.text}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl">❌</span>
                        <span>{statusChangeMessage.text}</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Status Change Buttons */}
              <div className="border-t pt-6 pb-8">
                <p className="text-sm font-semibold text-gray-700 mb-4">🎯 Editar Status do Experimento:</p>
                
                {/* Comment Field */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    💬 Comentário (Opcional)
                  </label>
                  <textarea
                    value={statusChangeComment}
                    onChange={(e) => setStatusChangeComment(e.target.value)}
                    placeholder="Adicione um comentário sobre esta mudança de status (feedback, motivo, instruções para o pesquisador, etc.)"
                    className="w-full px-3 py-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    disabled={statusChangeLoading || experimentDetailsLoading}
                  />
                  <p className="text-xs text-gray-500 mt-2">O comentário será registrado no histórico de mudanças de status</p>
                </div>

                {experimentDetailsLoading ? (
                  <p className="text-sm text-gray-500 italic">Carregando status atualizado do servidor...</p>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getAvailableStatusActions(selectedExperiment.status || 'Submitted').includes('Review') && (
                    <button
                      onClick={() => handleUpdateExperimentStatus('Review')}
                      disabled={statusChangeLoading || experimentDetailsLoading}
                      className="group relative px-6 py-4 bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-300 text-blue-900 rounded-lg hover:from-blue-200 hover:to-blue-100 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm transition-all shadow-md hover:shadow-lg"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xl">{getStatusBadge('Review').icon}</span>
                        <span>{statusChangeLoading ? 'Atualizando...' : getStatusBadge('Review').label}</span>
                      </div>
                    </button>
                  )}

                  {getAvailableStatusActions(selectedExperiment.status || 'Submitted').includes('Revisions') && (
                    <button
                      onClick={() => handleUpdateExperimentStatus('Revisions')}
                      disabled={statusChangeLoading || experimentDetailsLoading}
                      className="group relative px-6 py-4 bg-gradient-to-br from-orange-100 to-orange-50 border-2 border-orange-300 text-orange-900 rounded-lg hover:from-orange-200 hover:to-orange-100 hover:border-orange-400 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm transition-all shadow-md hover:shadow-lg"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xl">{getStatusBadge('Revisions').icon}</span>
                        <span>{statusChangeLoading ? 'Atualizando...' : getStatusBadge('Revisions').label}</span>
                      </div>
                    </button>
                  )}

                  {getAvailableStatusActions(selectedExperiment.status || 'Submitted').includes('Approved') && (
                    <button
                      onClick={() => handleUpdateExperimentStatus('Approved')}
                      disabled={statusChangeLoading || experimentDetailsLoading}
                      className="group relative px-6 py-4 bg-gradient-to-br from-green-100 to-green-50 border-2 border-green-300 text-green-900 rounded-lg hover:from-green-200 hover:to-green-100 hover:border-green-400 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm transition-all shadow-md hover:shadow-lg"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xl">{getStatusBadge('Approved').icon}</span>
                        <span>{statusChangeLoading ? 'Atualizando...' : getStatusBadge('Approved').label}</span>
                      </div>
                    </button>
                  )}
                </div>
                )}

                {/* Show message if no transitions available */}
                {!experimentDetailsLoading && getAvailableStatusActions(selectedExperiment.status || 'Submitted').length === 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                    <p className="text-sm text-yellow-900">ℹ️ Nenhuma transição de status disponível para o estado atual.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0">
                <button
                  onClick={() => {
                    setShowExperimentDetailsModal(false)
                    setStatusChangeMessage(null)
                    setStatusChangeComment('')
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {showUserDetailsModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="px-6 py-4 border-b bg-blue-50 border-blue-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-blue-900">
                      Detalhes do Pesquisador
                    </h2>
                    <p className="text-sm text-blue-700 mt-1">
                      Informações completas de cadastro e atividades
                    </p>
                  </div>
                  <button
                    onClick={() => setShowUserDetailsModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 space-y-6">
                {/* Informações Básicas */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                    Informações Básicas
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600">Nome Completo</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{selectedUser.name}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600">E-mail</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{selectedUser.email}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600">Tipo de Usuário</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {selectedUser.user_type === 'admin' ? '💼 Administrador' : '🔎 Pesquisador'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600">Status</p>
                      <p className={`text-sm font-semibold mt-1 ${
                        selectedUser.status === 'regular' ? 'text-green-700' :
                        selectedUser.status === 'irregular' ? 'text-yellow-700' :
                        'text-gray-700'
                      }`}>
                        {selectedUser.status === 'regular' ? '✅ Regular' :
                         selectedUser.status === 'irregular' ? '⚠️ Irregular' :
                         '🚫 Desativado'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Informações Institucionais */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                    Informações Institucionais
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600">Instituição</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{selectedUser.institution || '-'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600">País</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{selectedUser.country || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Atividades */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                    Atividades
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-xs text-blue-600 uppercase tracking-wide font-semibold">Experimentos Criados</p>
                      <p className="text-2xl font-bold text-blue-900 mt-2">
                        {selectedUser.experimentos_criados_total}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded">
                      <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Membro desde</p>
                      <p className="text-sm font-semibold text-gray-900 mt-2">
                        {formatDateTime(selectedUser.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t bg-gray-50 flex justify-end">
                <button
                  onClick={() => setShowUserDetailsModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
