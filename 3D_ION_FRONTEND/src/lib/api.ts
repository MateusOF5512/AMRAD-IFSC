/**
 * Normaliza a URL base da API
 * Garante que sempre tenha /api/v1 no final
 */

import { fetchWithAgent } from './api-client'

export function getNormalizedApiUrl(): string {
  let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
  
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
function getAuthHeader(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  try {
    const userData = localStorage.getItem('user')
    if (!userData) return headers

    const user = JSON.parse(userData)
    const token = user.access_token || user.token
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  } catch {
    // localStorage unavailable (SSR) or invalid JSON
  }

  return headers
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
    const headers = getAuthHeader()
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
      if (response.status === 401) {
        try {
          localStorage.removeItem('user')
          localStorage.removeItem('auth_token')
        } catch {
          // ignore
        }

        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }

        throw new Error('Sessão expirada. Faça login novamente.')
      }

      const logLevel = (response.status === 409 || response.status === 400 || response.status === 403 || response.status === 404) ? 'warn' : 'error'
      
      let errorData: any
      try {
        const text = await response.text()
        if (text) {
          errorData = JSON.parse(text)
        } else {
          errorData = {}
        }
        if (logLevel === 'warn') {
          console.warn('[apiRequest] Response body:', errorData)
        } else {
          console.error('[apiRequest] Error response body:', errorData)
        }
      } catch {
        console[logLevel]('[apiRequest] Could not parse error response')
        errorData = { detail: 'Unknown error' }
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
    
    const responseData = await response.json()
    console.log('[apiRequest] Response received successfully')
    return responseData
  } catch (error: any) {
    // Detect network/connection errors (when fetch() fails before getting any response)
    const isNetworkError = error?.message === 'Failed to fetch' || 
                          error?.message?.includes('ERR_') ||
                          error?.message?.includes('ECONNREFUSED') ||
                          error?.message?.includes('ENOTFOUND') ||
                          error?.message?.includes('network') ||
                          error?.message?.includes('fetch')
    
    if (isNetworkError) {
      console.error('[apiRequest] ❌ NETWORK ERROR - Backend not reachable!')
      console.error('[apiRequest] API URL configured:', API_BASE_URL)
      console.error('[apiRequest] Check: 1) Is backend running? 2) Correct URL? 3) Network available?')
      console.error('[apiRequest] Original error:', error.message)
      
      // Provide detailed error message for the UI
      const detailedError = new Error(
        `Falha na conexão com o servidor. ` +
        `Verifique se:\n` +
        `1. O backend está rodando (http://localhost:8000)\n` +
        `2. A URL da API está correta (${API_BASE_URL})\n` +
        `3. Não há problemas de rede\n\n` +
        `Erro original: ${error.message}`
      )
      
      // Retry on network errors
      if (retryCount < maxRetries) {
        console.log(`[apiRequest] Retrying network request (attempt ${retryCount + 1}/${maxRetries})...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
        return apiRequest<T>(endpoint, options, retryCount + 1)
      }
      
      throw detailedError
    }
    
    // Use warn for expected validation errors (conflicts, status validation, permission denied, not found), error for others
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
    if (isExpectedError) {
      console.warn('[apiRequest] Expected error:', error.message)
    } else {
      console.error('[apiRequest] Error caught:', error.message)
    }
    
    // Retry on network errors or 5xx errors (but not on 401 or 409 errors)
    if (retryCount < maxRetries && 
        (error.message?.includes('fetch') || error.message?.includes('network'))) {
      console.log(`[apiRequest] Retrying (attempt ${retryCount + 1}/${maxRetries})`)
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
  getUsersByStatus: (status: UserStatus, page: number = 1, per_page: number = 100): Promise<UsersListResponse> => {
    const endpoint = `/admin/users?status=${status}&page=${page}&per_page=${per_page}`
    console.log(`[API] Calling endpoint: ${endpoint}`)
    return apiRequest<UsersListResponse>(endpoint, {
      method: 'GET',
    }).then((response) => {
      console.log(`[API] Response received:`, response)
      if (response.users && response.users.length > 0) {
        console.log(`[API] First user from response:`, response.users[0])
        console.log(`[API] First user user_type:`, response.users[0].user_type)
        console.log(`[API] First user experimentos_criados_total:`, response.users[0].experimentos_criados_total)
        console.log(`[API] Total users returned: ${response.users.length}`)
        console.log(`[API] Total users in DB: ${response.total}`)
        console.log(`[API] All users user_type values:`, response.users.map(u => ({ name: u.name, user_type: u.user_type })))
      }
      return response
    })
  },

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
  getAdministrators: async (): Promise<AdminListResponse> => {
    console.log('[adminApi.getAdministrators] Starting request')
    try {
      const response = await apiRequest<AdminListResponse>('/admin/administrators', {
        method: 'GET',
      })
      console.log('[adminApi.getAdministrators] Response:', response)
      console.log('[adminApi.getAdministrators] Response type:', typeof response)
      console.log('[adminApi.getAdministrators] Response.admins:', response.admins)
      if (response.admins && response.admins.length > 0) {
        console.log('[adminApi.getAdministrators] First admin:', response.admins[0])
        console.log('[adminApi.getAdministrators] First admin keys:', Object.keys(response.admins[0]))
        console.log('[adminApi.getAdministrators] First admin experimentos_criados_total:', response.admins[0].experimentos_criados_total)
        console.log('[adminApi.getAdministrators] Type of experimentos_criados_total:', typeof response.admins[0].experimentos_criados_total)
      }
      return response
    } catch (error) {
      console.error('[adminApi.getAdministrators] Error caught:', error)
      throw error
    }
  },

  // Update administrator role
  updateAdministratorRole: (email: string, newRole: 'admin' | 'pesquisador'): Promise<UpdateAdminRoleResponse> =>
    apiRequest<UpdateAdminRoleResponse>('/admin/administrators/role', {
      method: 'PATCH',
      body: JSON.stringify({
        email,
        new_role: newRole,
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
    try {
      const apiBaseUrl = getNormalizedApiUrl()
      console.log('[checkDatabaseIntegrity] Starting integrity check...')
      
      let userDataStr: string | null = null
      try {
        userDataStr = localStorage.getItem('user')
      } catch (e) {
        console.error('[checkDatabaseIntegrity] Error accessing localStorage:', e)
      }

      if (!userDataStr) {
        throw new Error('Sem autenticação. Faça login novamente.')
      }

      let token = userDataStr
      try {
        const userData = JSON.parse(userDataStr)
        token = userData.access_token || userData.accessToken || userData.token || userDataStr
      } catch (e) {
        token = userDataStr
      }

      const response = await fetchWithAgent(`${apiBaseUrl}/admin/check-database-integrity`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('[checkDatabaseIntegrity] Response status:', response.status)
      
      if (!response.ok) {
        let errorMessage = `Erro HTTP ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorData.message || errorMessage
        } catch (e) {
          const errorText = await response.text()
          if (errorText) errorMessage = errorText
        }
        console.error('[checkDatabaseIntegrity] Error response:', errorMessage)
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('[checkDatabaseIntegrity] Result:', result)
      return result
    } catch (error) {
      console.error('[checkDatabaseIntegrity] Complete error:', error)
      throw error
    }
  },

  // Export all tables as ZIP
  exportTables: async (): Promise<Blob> => {
    try {
      const apiBaseUrl = getNormalizedApiUrl()
      console.log('[exportTables] API Base URL:', apiBaseUrl)
      
      let userDataStr: string | null = null
      try {
        userDataStr = localStorage.getItem('user')
        console.log('[exportTables] User data exists:', !!userDataStr)
      } catch (e) {
        console.error('[exportTables] Error accessing localStorage:', e)
      }

      if (!userDataStr) {
        throw new Error('Sem autenticação. Faça login novamente.')
      }

      let token = userDataStr
      try {
        const userData = JSON.parse(userDataStr)
        console.log('[exportTables] Parsed userData keys:', Object.keys(userData))
        
        // Try different token field names
        token = userData.access_token || userData.accessToken || userData.token || userDataStr
        console.log('[exportTables] Extracted token length:', token.length)
      } catch (e) {
        console.log('[exportTables] Could not parse JSON, using raw token')
        token = userDataStr
      }

      console.log('[exportTables] Calling endpoint with token...')
      const response = await fetchWithAgent(`${apiBaseUrl}/admin/export-tables`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('[exportTables] Response status:', response.status)
      
      if (!response.ok) {
        let errorMessage = `Erro HTTP ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorData.message || errorMessage
        } catch (e) {
          const errorText = await response.text()
          if (errorText) errorMessage = errorText
        }
        console.error('[exportTables] Error response:', errorMessage)
        throw new Error(errorMessage)
      }

      console.log('[exportTables] Response OK, converting to blob...')
      const blob = await response.blob()
      console.log('[exportTables] Blob size:', blob.size, 'bytes')
      
      return blob
    } catch (error) {
      console.error('[exportTables] Complete error:', error)
      throw error
    }
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
    try {
      console.log('[checkSystemHealth] Starting system health check...')
      const apiBaseUrl = getNormalizedApiUrl()
      
      let userDataStr: string | null = null
      try {
        userDataStr = localStorage.getItem('user')
      } catch (e) {
        console.error('[checkSystemHealth] Error accessing localStorage:', e)
      }

      if (!userDataStr) {
        throw new Error('Sem autenticação. Faça login novamente.')
      }

      let token = userDataStr
      try {
        const userData = JSON.parse(userDataStr)
        token = userData.access_token || userData.accessToken || userData.token || userDataStr
      } catch (e) {
        token = userDataStr
      }

      const response = await fetchWithAgent(`${apiBaseUrl}/admin/system-health`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        let errorMessage = `Erro HTTP ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorData.message || errorMessage
        } catch (e) {
          const errorText = await response.text()
          if (errorText) errorMessage = errorText
        }
        console.error('[checkSystemHealth] Error:', errorMessage)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('[checkSystemHealth] ✓ Response received:', data.overall_status)
      return data
    } catch (error) {
      console.error('[checkSystemHealth] Complete error:', error)
      throw error
    }
  },

  // Get experiments organized by status
  getExperimentsByStatus: async (): Promise<{
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
  }> => {
    try {
      console.log('[getExperimentsByStatus] Starting request...')
      const response = await apiRequest('/admin/experiments', {
        method: 'GET',
      })
      console.log('[getExperimentsByStatus] Response:', response)
      return response as any
    } catch (error) {
      console.error('[getExperimentsByStatus] Error:', error)
      throw error
    }
  },

  updateExperimentStatus: async (
    experimentId: string,
    newStatus: 'Revisions' | 'Review' | 'Approved',
    comment?: string
  ): Promise<any> => {
    try {
      console.log(`[updateExperimentStatus] Updating experiment ${experimentId} to ${newStatus}`)
      const body: any = { status: newStatus }
      if (comment) {
        body.comment = comment
      }
      const response = await apiRequest(`/admin/experiments/${experimentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      console.log('[updateExperimentStatus] Response:', response)
      return response
    } catch (error) {
      console.error('[updateExperimentStatus] Error:', error)
      throw error
    }
  },

  getExperimentDetails: async (experimentId: string): Promise<any> => {
    try {
      console.log(`[getExperimentDetails] Fetching details for experiment ${experimentId}`)
      const response = await apiRequest(`/admin/experiments/${experimentId}/details`, {
        method: 'GET',
      })
      console.log('[getExperimentDetails] Response:', response)
      return response
    } catch (error) {
      console.error('[getExperimentDetails] Error:', error)
      throw error
    }
  },

  getExperimentsStatusHistory: async (filters?: {
    old_status?: string
    new_status?: string
    changed_by_name?: string
    changed_by_role?: string
    start_date?: string
    end_date?: string
  }): Promise<{ success: boolean; total: number; data: any[] }> => {
    try {
      const params = new URLSearchParams()
      if (filters?.old_status) params.append('old_status', filters.old_status)
      if (filters?.new_status) params.append('new_status', filters.new_status)
      if (filters?.changed_by_name) params.append('changed_by_name', filters.changed_by_name)
      if (filters?.changed_by_role) params.append('changed_by_role', filters.changed_by_role)
      if (filters?.start_date) params.append('start_date', filters.start_date)
      if (filters?.end_date) params.append('end_date', filters.end_date)

      const endpoint = `/admin/experiments/status-history/all${params.toString() ? '?' + params.toString() : ''}`
      console.log('[getExperimentsStatusHistory] Fetching from:', endpoint)
      const response = await apiRequest(endpoint, {
        method: 'GET',
      })
      console.log('[getExperimentsStatusHistory] Response:', response)
      return response as { success: boolean; total: number; data: any[] }
    } catch (error) {
      console.error('[getExperimentsStatusHistory] Error:', error)
      throw error
    }
  },

  getResearcherStatusHistory: async (): Promise<any> => {
    try {
      console.log('[getResearcherStatusHistory] Fetching researcher status history')
      const endpoint = '/samples/researcher/status-history'
      const response = await apiRequest(endpoint, {
        method: 'GET',
      })
      console.log('[getResearcherStatusHistory] Response:', response)
      return response
    } catch (error) {
      console.error('[getResearcherStatusHistory] Error:', error)
      throw error
    }
  },

  resubmitExperiment: async (experimentId: string): Promise<any> => {
    try {
      console.log('[resubmitExperiment] Resubmitting experiment:', experimentId)
      const endpoint = `/experiments/${experimentId}/resubmit`
      const response = await apiRequest(endpoint, {
        method: 'POST',
      })
      console.log('[resubmitExperiment] Response:', response)
      return response
    } catch (error) {
      console.error('[resubmitExperiment] Error:', error)
      throw error
    }
  },

  getAdminLogs: async (filters: {
    action_category?: string
    severity_level?: string
    start_date?: string
    end_date?: string
    entity_name?: string
  }): Promise<any> => {
    try {
      const params = new URLSearchParams()
      if (filters.action_category) params.append('action_category', filters.action_category)
      if (filters.severity_level) params.append('severity_level', filters.severity_level)
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)
      if (filters.entity_name) params.append('entity_name', filters.entity_name)
      params.append('limit', '100')
      params.append('offset', '0')

      const endpoint = `/logs/admin/all-logs?${params.toString()}`
      console.log('[getAdminLogs] Fetching logs from:', endpoint)
      const response = await apiRequest(endpoint, {
        method: 'GET',
      })
      console.log('[getAdminLogs] Response:', response)
      return response
    } catch (error) {
      console.error('[getAdminLogs] Error:', error)
      throw error
    }
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
