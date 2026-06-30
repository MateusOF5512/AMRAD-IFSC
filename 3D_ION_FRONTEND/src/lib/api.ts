/**
 * Normaliza a URL base da API
 * Garante que sempre tenha /api/v1 no final
 */

import { fetchWithAgent, formatFetchError } from './api-client'
import { logger } from './logger'
import { getPublicEnv } from './public-env'
import { getStoredAccessToken } from './auth-storage'
import { isSessionExpiredAuthError, refreshAccessTokenIfNeeded } from './supabase-auth'

export function getNormalizedApiUrl(): string {
  let apiUrl = getPublicEnv().apiUrl
  
  // Se a URL não contém /api/v1, adiciona
  if (!apiUrl.includes('/api/v1')) {
    apiUrl = apiUrl.replace(/\/$/, '') + '/api/v1'
  }
  
  return apiUrl
}

export const API_BASE_URL = getNormalizedApiUrl()

/**
 * Get authorization header with current user's JWT token
 * Token é salvo em localStorage pelo login do FastAPI
 * Returns empty headers if no token (allows backend to return 401)
 */
function getAuthHeader(accessToken?: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  const token = accessToken ?? getStoredAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

async function parseErrorResponse(response: Response): Promise<{ detail?: string; message?: string }> {
  try {
    const text = await response.text()
    return text ? JSON.parse(text) : {}
  } catch {
    return { detail: 'Unknown error' }
  }
}

/**
 * Generic API request function with retry logic
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<T> {
  const maxRetries = 2
  
  try {
    const accessToken = await refreshAccessTokenIfNeeded()
    const headers = getAuthHeader(accessToken)
    const fullUrl = `${API_BASE_URL}${endpoint}`

    const requestInit: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    }

    const response = await fetchWithAgent(fullUrl, requestInit)

    if (!response.ok) {
      const errorData = await parseErrorResponse(response)
      const errorDetail = String(errorData.detail || errorData.message || '')

      if (response.status === 401) {
        const canRetryAuth = retryCount === 0 && isSessionExpiredAuthError(errorDetail)

        if (canRetryAuth) {
          const refreshedToken = await refreshAccessTokenIfNeeded(true)
          if (refreshedToken) {
            return apiRequest<T>(endpoint, options, retryCount + 1)
          }
        }

        if (isSessionExpiredAuthError(errorDetail)) {
          throw new Error('Sessão expirada. Faça login novamente.')
        }

        throw new Error(errorDetail || 'Não autorizado')
      }

      const isExpectedStatus = response.status === 409 || response.status === 400 || response.status === 403 || response.status === 404

      if (isExpectedStatus) {
        logger.warn('api', `HTTP ${response.status}`)
      } else {
        logger.error('api', `HTTP ${response.status}`)
      }
      
      // Get error message from various possible locations
      let errorMessage = errorData.detail || errorData.message || `API error: ${response.status}`
      
      // Map status codes to helpful messages if detail is missing
      if (!errorData.detail && !errorData.message) {
        const statusMessages: Record<number, string> = {
          400: 'Solicitação inválida',
          403: 'Acesso negado',
          404: 'Recurso não encontrado',
          409: 'Conflito: recurso já existe ou está em estado inválido',
          500: 'Erro interno do server',
        }
        errorMessage = statusMessages[response.status] || errorMessage
      }
      
      throw new Error(errorMessage)
    }
    
    return await response.json()
  } catch (error: any) {
    // Detect network/connection errors (when fetch() fails before getting any response)
    const isNetworkError = error?.message === 'Failed to fetch' || 
                          error?.message?.includes('ERR_') ||
                          error?.message?.includes('ECONNREFUSED') ||
                          error?.message?.includes('ENOTFOUND') ||
                          error?.message?.includes('network') ||
                          error?.message?.includes('fetch')
    
    if (isNetworkError) {
      const detailedMessage = formatFetchError(error, API_BASE_URL)
      logger.error('api', detailedMessage)

      const detailedError = new Error(detailedMessage)

      if (retryCount < maxRetries) {
        logger.debug('api', `Retry ${retryCount + 1}/${maxRetries}`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
        return apiRequest<T>(endpoint, options, retryCount + 1)
      }

      throw detailedError
    }

    const isExpectedError = error.message?.includes('já possui') ||
                           error.message?.includes('Conflito') ||
                           error.message?.includes('status') ||
                           error.message?.includes('permissão') ||
                           error.message?.includes('não pode remover') ||
                           error.message?.includes('não encontrado') ||
                           error.message?.includes('não existe') ||
                           error.message?.includes('não cadastrado') ||
                           error.message?.includes('rebaixar') ||
                           error.message?.includes('próprias permissões')
    if (!isExpectedError) {
      logger.error('api', error.message)
    }

    if (retryCount < maxRetries &&
        (error.message?.includes('fetch') || error.message?.includes('network'))) {
      logger.debug('api', `Retry ${retryCount + 1}/${maxRetries}`)
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
      return apiRequest<T>(endpoint, options, retryCount + 1)
    }
    throw error
  }
}

// ============================================================================
// MATERIALS
// ============================================================================

export interface Material {
  id: string
  researcher_id: string
  brand: string
  model: string
  color: string
  is_composite: boolean
  composite_details: string | null
  status: 'pending' | 'approved'
  created_at: string
}

export interface MaterialCreate {
  brand: string
  model: string
  color: string
  is_composite: boolean
  composite_details?: string | null
  status?: 'pending' | 'approved'
}

export const materialsApi = {
  getAll: () => apiRequest<Material[]>('/materials'),
  
  getApproved: () => apiRequest<Material[]>('/materials/approved'),
  
  getById: (id: string) => apiRequest<Material>(`/materials/${id}`),
  
  create: (data: MaterialCreate) =>
    apiRequest<Material>('/materials', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    apiRequest<void>(`/materials/${id}`, {
      method: 'DELETE',
    }),
}

// ============================================================================
// MACHINES
// ============================================================================

export interface Machine {
  id: string
  researcher_id: string
  brand: string
  model: string
  technology_type: string
  other_specs: string | null
  status: 'pending' | 'approved'
  created_at: string
}

export interface MachineCreate {
  brand: string
  model: string
  technology_type: string
  other_specs?: string | null
  status?: 'pending' | 'approved'
}

export const machinesApi = {
  getAll: () => apiRequest<Machine[]>('/machines'),
  
  getApproved: () => apiRequest<Machine[]>('/machines/approved'),
  
  getById: (id: string) => apiRequest<Machine>(`/machines/${id}`),
  
  create: (data: MachineCreate) =>
    apiRequest<Machine>('/machines', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    apiRequest<void>(`/machines/${id}`, {
      method: 'DELETE',
    }),
}

// ============================================================================
// SAMPLES
// ============================================================================

export interface Sample {
  id: string
  researcher_id: string
  material_id: string
  machine_id: string
  shape_type: string
  shape_dimension: number | null  // DB column: single dimension value
  circle_roi_area: number | null  // DB column: circular ROI area
  dimension_a: number | null      // Regression coefficient A (slope)
  dimension_b: number | null      // Regression coefficient B (intercept)
  created_at: string
  pattern_type: string | null // JSON array of pattern IDs, e.g. '["rectilinear","grid"]'
  pattern_ids?: string[] // parsed convenience field
}

export interface SampleCreate {
  material_id: string
  machine_id: string
  shape_type: string
  shape_dimension?: number | null
  circle_roi_area?: number | null
  pattern_ids?: string[]
}

export const samplesApi = {
  getAll: () => apiRequest<Sample[]>('/samples'),
  
  getById: (id: string) => apiRequest<Sample>(`/samples/${id}`),
  
  create: (data: SampleCreate) =>
    apiRequest<Sample>('/samples', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    apiRequest<void>(`/samples/${id}`, {
      method: 'DELETE',
    }),
}

// ============================================================================
// EXPERIMENTS (Wizard)
// ============================================================================

export interface ExperimentWizardRequest {
  material: MaterialCreate
  machine: MachineCreate
  sample: Omit<SampleCreate, 'material_id' | 'machine_id'>
  infill_measurements?: Array<{
    infill_percentage: number
    hu_value?: number | null
    notes?: string | null
  }>
  mechanical_properties?: {
    sample_id?: string
    tensile_modulus_mpa?: number | null
    tensile_strength_mpa?: number | null
    break_deformation_percent?: number | null
    impact_charpy_kj_m2?: number | null
    impact_izod?: number | null
    hardness_rockwell?: number | null
    flexural_modulus_mpa?: number | null
    flexural_strength_mpa?: number | null
    test_condition?: string | null
  }
  linear_attenuation?: Array<{
    thickness: number
    value_lambert_beer: number
  }>
  beam_qualities?: {
    sample_id?: string
    rqr_2?: number | null
    rqr_3?: number | null
    rqr_4?: number | null
    rqr_5?: number | null
    rqr_6?: number | null
    rqr_7?: number | null
    rqr_8?: number | null
    rqr_9?: number | null
    rqr_10?: number | null
    rqt_8?: number | null
    rqt_9?: number | null
    rqt_10?: number | null
    rqr_m1?: number | null
    rqr_m2?: number | null
    rqr_m3?: number | null
    rqr_m4?: number | null
  }
}

export interface ExperimentWizardResponse {
  success: boolean
  message: string
  material_id: string
  machine_id: string
  sample_id: string
  experiment_id: string | null
}

export interface Experiment {
  id: string
  index_visual?: number
  researcher_id: string
  material_id: string
  machine_id: string
  shape_type: string
  created_at: string
  materials: Material
  machines: Machine
}

export const experimentsApi = {
  createComplete: (data: ExperimentWizardRequest) =>
    apiRequest<ExperimentWizardResponse>('/experiments/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  getMyExperiments: () =>
    apiRequest<{ success: boolean; count: number; experiments: Experiment[] }>(
      '/experiments/my-experiments'
    ),
}

// ============================================================================
// INFILL MEASUREMENTS
// ============================================================================

export interface InfillMeasurement {
  id: string
  sample_id: string
  infill_pct: number
  hu_mean: number
  notes?: string
  created_at: string
}

export interface InfillMeasurementCreate {
  sample_id: string
  infill_pct: number
  hu_mean: number
  notes?: string
}

export const infillApi = {
  create: (data: InfillMeasurementCreate) =>
    apiRequest<InfillMeasurement>('/infill-measurements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  createBatch: (data: InfillMeasurementCreate[]) =>
    apiRequest<InfillMeasurement[]>('/infill-measurements/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// ============================================================================
// MECHANICAL PROPERTIES
// ============================================================================

export interface MechanicalProperty {
  id: string
  sample_id: string
  tensile_modulus_mpa: number
  tensile_strength_mpa: number
  break_deformation_percent: number
  flexural_modulus_mpa: number
  flexural_strength_mpa: number
  hardness_rockwell?: string
  impact_charpy_kj_m2: number
  impact_izod: number
  test_condition: string
  created_at: string
}

export interface MechanicalPropertyCreate {
  sample_id: string
  tensile_modulus_mpa: number
  tensile_strength_mpa: number
  break_deformation_percent: number
  flexural_modulus_mpa: number
  flexural_strength_mpa: number
  hardness_rockwell?: string | null
  impact_charpy_kj_m2: number
  impact_izod: number
  test_condition: string
}

export const mechanicalApi = {
  create: (data: MechanicalPropertyCreate) =>
    apiRequest<MechanicalProperty>('/mechanical-properties', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// ============================================================================
// LINEAR ATTENUATION
// ============================================================================

export interface LinearAttenuation {
  id: string
  sample_id: string
  thickness: number
  value_lambert_beer: number
  created_at: string
}

export interface LinearAttenuationCreate {
  sample_id: string
  thickness: number
  value_lambert_beer: number
}

export const attenuationApi = {
  create: (data: LinearAttenuationCreate) =>
    apiRequest<LinearAttenuation>('/linear-attenuation', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  createBatch: (data: LinearAttenuationCreate[]) =>
    apiRequest<LinearAttenuation[]>('/linear-attenuation/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// ============================================================================
// BEAM QUALITIES
// ============================================================================

export interface BeamQuality {
  id: string
  sample_id: string
  rqr_2: number
  rqr_3: number
  rqr_4: number
  rqr_5: number
  rqr_6: number
  rqr_7: number
  rqr_8: number
  rqr_9: number
  rqr_10: number
  rqt_8: number
  rqt_9: number
  rqt_10: number
  rqr_m1: number
  rqr_m2: number
  rqr_m3: number
  rqr_m4: number
  created_at: string
}

export interface BeamQualityCreate {
  sample_id: string
  rqr_2: number
  rqr_3: number
  rqr_4: number
  rqr_5: number
  rqr_6: number
  rqr_7: number
  rqr_8: number
  rqr_9: number
  rqr_10: number
  rqt_8: number
  rqt_9: number
  rqt_10: number
  rqr_m1: number
  rqr_m2: number
  rqr_m3: number
  rqr_m4: number
}

export const beamApi = {
  create: (data: BeamQualityCreate) =>
    apiRequest<BeamQuality>('/beam-qualities', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// Admin API
import { AdminUser, UsersListResponse, UpdateUserStatusRequest, UpdateUserStatusResponse, UserStatus, AdminListResponse, UpdateAdminRoleRequest, UpdateAdminRoleResponse, AdminInfo } from './types/admin'

export const adminApi = {
  // Get users by status
  getUsersByStatus: (status: UserStatus, page: number = 1, per_page: number = 100): Promise<UsersListResponse> =>
    apiRequest<UsersListResponse>(`/admin/users?status=${status}&page=${page}&per_page=${per_page}`, {
      method: 'GET',
    }),

  // Update user status
  updateUserStatus: (email: string, newStatus: UserStatus): Promise<UpdateUserStatusResponse> =>
    apiRequest<UpdateUserStatusResponse>('/admin/users/status', {
      method: 'PATCH',
      body: JSON.stringify({
        email,
        new_status: newStatus,
      }),
    }),

  // Get all users (for bulk operations/reporting)
  getAllUsers: (page: number = 1, per_page: number = 50): Promise<UsersListResponse> =>
    apiRequest<UsersListResponse>(`/admin/users?page=${page}&per_page=${per_page}`, {
      method: 'GET',
    }),

  // Get all administrators
  getAdministrators: (): Promise<AdminListResponse> =>
    apiRequest<AdminListResponse>('/admin/administrators', {
      method: 'GET',
    }),

  // Update administrator role
  updateAdministratorRole: (email: string, newRole: 'admin' | 'pesquisador', password: string): Promise<UpdateAdminRoleResponse> =>
    apiRequest<UpdateAdminRoleResponse>('/admin/administrators/role', {
      method: 'PATCH',
      body: JSON.stringify({
        email,
        new_role: newRole,
        password,
      }),
    }),

  // Verify admin password for sensitive operations
  verifyAdminPassword: (password: string): Promise<{ success: boolean }> =>
    apiRequest<{ success: boolean }>('/admin/verify-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  // Validate admin role change before requesting password
  validateAdminRoleChange: (email: string, newRole: 'admin' | 'pesquisador'): Promise<{ success: boolean; message: string; can_proceed: boolean }> =>
    apiRequest<{ success: boolean; message: string; can_proceed: boolean }>('/admin/validate-admin-role-change', {
      method: 'POST',
      body: JSON.stringify({ email, new_role: newRole }),
    }),

  // Validate status change before requesting password
  validateStatusChange: (email: string, newStatus: 'regular' | 'irregular' | 'desativado'): Promise<{ success: boolean; message: string; can_proceed: boolean }> =>
    apiRequest<{ success: boolean; message: string; can_proceed: boolean }>('/admin/validate-status-change', {
      method: 'POST',
      body: JSON.stringify({ email, new_status: newStatus }),
    }),

  // Check database integrity
  checkDatabaseIntegrity: async (): Promise<{
    database_status: string
    connection_status: boolean
    overall_health: string
    tables: Array<{
      table_name: string
      status: string
      row_count: number
      last_updated: string | null
      message: string
    }>
    timestamp: string
    message: string
  }> => {
    const apiBaseUrl = getNormalizedApiUrl()
    const userDataStr = localStorage.getItem('user')
    if (!userDataStr) {
      throw new Error('Sem autenticação. Faça login novamente.')
    }

    let token = userDataStr
    try {
      const userData = JSON.parse(userDataStr)
      token = userData.access_token || userData.accessToken || userData.token || userDataStr
    } catch {
      token = userDataStr
    }

    const response = await fetchWithAgent(`${apiBaseUrl}/admin/check-database-integrity`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      let errorMessage = `Erro HTTP ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.detail || errorData.message || errorMessage
      } catch {
        const errorText = await response.text()
        if (errorText) errorMessage = errorText
      }
      throw new Error(errorMessage)
    }

    return response.json()
  },

  // Export all tables as ZIP
  exportTables: async (): Promise<Blob> => {
    const apiBaseUrl = getNormalizedApiUrl()
    const userDataStr = localStorage.getItem('user')
    if (!userDataStr) {
      throw new Error('Sem autenticação. Faça login novamente.')
    }

    let token = userDataStr
    try {
      const userData = JSON.parse(userDataStr)
      token = userData.access_token || userData.accessToken || userData.token || userDataStr
    } catch {
      token = userDataStr
    }

    const response = await fetchWithAgent(`${apiBaseUrl}/admin/export-tables`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      let errorMessage = `Erro HTTP ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.detail || errorData.message || errorMessage
      } catch {
        const errorText = await response.text()
        if (errorText) errorMessage = errorText
      }
      throw new Error(errorMessage)
    }

    return response.blob()
  },

  // Check system health
  checkSystemHealth: async (): Promise<{
    overall_status: string
    timestamp: string
    components: Array<{
      component: string
      status: string
      message: string
      response_time_ms?: number
    }>
    summary: string
    recommendations: string[]
    uptime_hours?: number
  }> => {
    const apiBaseUrl = getNormalizedApiUrl()
    const userDataStr = localStorage.getItem('user')
    if (!userDataStr) {
      throw new Error('Sem autenticação. Faça login novamente.')
    }

    let token = userDataStr
    try {
      const userData = JSON.parse(userDataStr)
      token = userData.access_token || userData.accessToken || userData.token || userDataStr
    } catch {
      token = userDataStr
    }

    const response = await fetchWithAgent(`${apiBaseUrl}/admin/system-health`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      let errorMessage = `Erro HTTP ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.detail || errorData.message || errorMessage
      } catch {
        const errorText = await response.text()
        if (errorText) errorMessage = errorText
      }
      throw new Error(errorMessage)
    }

    return response.json()
  },

  // Get experiments organized by status
  getExperimentsByStatus: (): Promise<{
    approved: Array<{
      id: string
      index_visual?: number
      researcher_id: string
      researcher_name?: string
      material_brand?: string
      material_model?: string
      material_color?: string
      machine_brand?: string
      machine_model?: string
      machine_technology?: string
      shape_type?: string
      roi_area_mm2?: number
      infill_hu_mean?: number
      infill_data_count?: number
      mechanical_data_count?: number
      attenuation_data_count?: number
      beam_qualities_exists?: boolean
      status: string
      created_at?: string
    }>
    in_analysis: Array<{
      id: string
      index_visual?: number
      researcher_id: string
      researcher_name?: string
      material_brand?: string
      material_model?: string
      material_color?: string
      machine_brand?: string
      machine_model?: string
      machine_technology?: string
      shape_type?: string
      roi_area_mm2?: number
      infill_hu_mean?: number
      infill_data_count?: number
      mechanical_data_count?: number
      attenuation_data_count?: number
      beam_qualities_exists?: boolean
      status: string
      created_at?: string
    }>
    total_approved: number
    total_in_analysis: number
    status_counts?: {
      submitted: number
      revisions: number
      review: number
      approved: number
    }
  }> =>
    apiRequest('/admin/experiments', { method: 'GET' }),

  updateExperimentStatus: (
    experimentId: string,
    newStatus: 'Revisions' | 'Review' | 'Approved',
    comment?: string
  ): Promise<unknown> => {
    const body: Record<string, string> = { status: newStatus }
    if (comment) body.comment = comment
    return apiRequest(`/admin/experiments/${experimentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  getExperimentDetails: (experimentId: string): Promise<unknown> =>
    apiRequest(`/admin/experiments/${experimentId}/details`, { method: 'GET' }),

  getExperimentsStatusHistory: (filters?: {
    old_status?: string
    new_status?: string
    changed_by_name?: string
    changed_by_role?: string
    start_date?: string
    end_date?: string
  }): Promise<{ success: boolean; total: number; data: unknown[] }> => {
    const params = new URLSearchParams()
    if (filters?.old_status) params.append('old_status', filters.old_status)
    if (filters?.new_status) params.append('new_status', filters.new_status)
    if (filters?.changed_by_name) params.append('changed_by_name', filters.changed_by_name)
    if (filters?.changed_by_role) params.append('changed_by_role', filters.changed_by_role)
    if (filters?.start_date) params.append('start_date', filters.start_date)
    if (filters?.end_date) params.append('end_date', filters.end_date)

    const endpoint = `/admin/experiments/status-history/all${params.toString() ? '?' + params.toString() : ''}`
    return apiRequest(endpoint, { method: 'GET' }) as Promise<{ success: boolean; total: number; data: unknown[] }>
  },

  getResearcherStatusHistory: (): Promise<unknown> =>
    apiRequest('/samples/researcher/status-history', { method: 'GET' }),

  resubmitExperiment: (experimentId: string): Promise<unknown> =>
    apiRequest(`/experiments/${experimentId}/resubmit`, { method: 'POST' }),

  getAdminLogs: (filters: {
    action_category?: string
    severity_level?: string
    start_date?: string
    end_date?: string
    entity_name?: string
  }): Promise<unknown> => {
    const params = new URLSearchParams()
    if (filters.action_category) params.append('action_category', filters.action_category)
    if (filters.severity_level) params.append('severity_level', filters.severity_level)
    if (filters.start_date) params.append('start_date', filters.start_date)
    if (filters.end_date) params.append('end_date', filters.end_date)
    if (filters.entity_name) params.append('entity_name', filters.entity_name)
    params.append('limit', '100')
    params.append('offset', '0')

    return apiRequest(`/logs/admin/all-logs?${params.toString()}`, { method: 'GET' })
  },

  getDatabaseSeedStatus: (): Promise<{
    is_empty: boolean
    experimental_row_count: number
    sample_count?: number
  }> =>
    apiRequest<{
      is_empty: boolean
      experimental_row_count: number
      sample_count?: number
    }>('/admin/database-seed-status', {
      method: 'GET',
    }),

  truncateExperimentalData: (password: string): Promise<{ success: boolean; message: string }> =>
    apiRequest<{ success: boolean; message: string }>('/admin/truncate-experimental-data', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  seedExperimentalData: (): Promise<{ success: boolean; message: string; details?: Record<string, unknown> }> =>
    apiRequest<{ success: boolean; message: string; details?: Record<string, unknown> }>(
      '/admin/seed-experimental-data',
      { method: 'POST' }
    ),
}

export { apiRequest, getAuthHeader }
