/**
 * Tipos para o módulo de administração
 */

// Status de usuário
export type UserStatus = 'regular' | 'irregular' | 'desativado'

// Usuário no contexto de admin
export interface AdminUser {
  id: string
  status: UserStatus
  name: string
  email: string | null
  user_type: 'admin' | 'pesquisador'
  institution: string | null
  country: string | null
  language: string | null
  created_at: string
  experimentos_criados_total: number
}

// Resposta de listagem de usuários
export interface UsersListResponse {
  users: AdminUser[]
  total: number
  page: number
  per_page: number
}

// Request para atualizar status
export interface UpdateUserStatusRequest {
  email: string
  new_status: UserStatus
}

// Response de atualização de status
export interface UpdateUserStatusResponse {
  success: boolean
  message: string
  user?: AdminUser
  old_status?: UserStatus
  new_status?: UserStatus
}

// Log de auditoria de status
export interface UserStatusLog {
  id: string
  admin_id: string
  user_id: string
  old_status: UserStatus
  new_status: UserStatus
  changed_at: string
}
// Types para Admin Management
export type UserRole = 'admin' | 'pesquisador'

export interface AdminInfo {
  id: string
  name: string
  email: string
  user_type: UserRole
  institution: string | null
  experimentos_criados_total: number
  created_at: string
}

export interface AdminListResponse {
  admins: AdminInfo[]
  total: number
}

export interface UpdateAdminRoleRequest {
  email: string
  new_role: UserRole
}

export interface UpdateAdminRoleResponse {
  success: boolean
  message: string
  user_email: string
  old_role: UserRole
  new_role: UserRole
}