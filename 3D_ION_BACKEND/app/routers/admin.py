"""
Admin Router
Handles admin panel operations including user management and status updates
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
import re
import csv
import io
import zipfile
import logging
from datetime import datetime

from app.database.supabase import get_supabase_client
from app.core.config import settings
from app.core.security import CustomHTTPBearer, verify_supabase_token
from app.core.user_roles import is_admin_role, researcher_role
from app.core.password import verify_password
from app.core.user_utils import get_user_full_name
from app.database.sample_status_history import get_status_history_manager
from app.repositories.experiment_repository import fetch_admin_experiment_details
from app.services.database_management import (
    is_experimental_database_empty,
    seed_experimental_data,
    truncate_experimental_data,
)

router = APIRouter(prefix="/admin", tags=["Admin"])
logger = logging.getLogger(__name__)

security_scheme = CustomHTTPBearer()


# ===== SCHEMAS =====

class AdminUserResponse(BaseModel):
    """Response model for admin user data"""
    id: str
    status: str
    name: str
    email: str
    user_type: str
    institution: Optional[str] = None
    country: Optional[str] = None
    language: Optional[str] = None
    created_at: str
    experimentos_criados_total: int


class UsersListResponse(BaseModel):
    """Response model for users list endpoint"""
    users: List[AdminUserResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class UpdateStatusRequest(BaseModel):
    """Request model for updating user status"""
    email: str = Field(..., description="User email")
    new_status: str = Field(..., description="New status: regular, irregular, desativado")


class UpdateStatusResponse(BaseModel):
    """Response model for status update"""
    success: bool
    message: str
    user: AdminUserResponse
    old_status: str
    new_status: str


class AdminInfo(BaseModel):
    """Response model for admin/administrator data"""
    id: str
    name: str
    email: str
    user_type: str
    institution: Optional[str] = None
    experimentos_criados_total: int
    created_at: str
    
    class Config:
        # Ensure all fields are included in serialization
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "id": "123",
                "name": "Admin Name",
                "email": "admin@example.com",
                "user_type": "admin",
                "institution": "IFSC",
                "experimentos_criados_total": 10,
                "created_at": "2026-02-19T10:00:00"
            }
        }


class AdminListResponse(BaseModel):
    """Response model for list of admins"""
    admins: List[AdminInfo]
    total: int


class UpdateAdminRoleRequest(BaseModel):
    """Request model for updating admin role"""
    email: str = Field(..., description="User email")
    new_role: str = Field(..., description="New role: admin or pesquisador")


class UpdateAdminRoleResponse(BaseModel):
    """Response model for admin role update"""
    success: bool
    message: str
    user_email: str
    old_role: str
    new_role: str


class VerifyPasswordRequest(BaseModel):
    """Request model for verifying admin password"""
    password: str = Field(..., description="Admin password")


class VerifyPasswordResponse(BaseModel):
    """Response model for password verification"""
    success: bool


class ValidateAdminRoleChangeRequest(BaseModel):
    """Request model for validating admin role change"""
    email: str = Field(..., description="User email")
    new_role: str = Field(..., description="New role: admin or pesquisador")


class ValidateAdminRoleChangeResponse(BaseModel):
    """Response model for admin role change validation"""
    success: bool
    message: str
    can_proceed: bool


class ValidateStatusChangeRequest(BaseModel):
    """Request model for validating status change"""
    email: str = Field(..., description="User email")
    new_status: str = Field(..., description="New status: regular, irregular, desativado")


class ValidateStatusChangeResponse(BaseModel):
    """Response model for status change validation"""
    success: bool
    message: str
    can_proceed: bool


class ExperimentItem(BaseModel):
    """Experiment item for admin listing"""
    id: str
    index_visual: Optional[int] = None
    researcher_id: str
    researcher_name: Optional[str] = None
    material_brand: Optional[str] = None
    material_model: Optional[str] = None
    material_color: Optional[str] = None
    machine_brand: Optional[str] = None
    machine_model: Optional[str] = None
    machine_technology: Optional[str] = None
    shape_type: Optional[str] = None
    roi_area_mm2: Optional[float] = None
    infill_hu_mean: Optional[float] = None
    infill_data_count: int = 0
    mechanical_data_count: int = 0
    attenuation_data_count: int = 0
    beam_qualities_exists: bool = False
    status: str = 'Submitted'
    created_at: Optional[str] = None


class ExperimentsResponse(BaseModel):
    """Response for experiments list endpoint"""
    approved: List[ExperimentItem] = []
    in_analysis: List[ExperimentItem] = []
    total_approved: int = 0
    total_in_analysis: int = 0





class DatabaseTableStatus(BaseModel):
    """Response model for individual table status"""
    table_name: str
    status: str  # "healthy", "warning", "error"
    row_count: int
    last_updated: Optional[str]
    message: str


class DatabaseIntegrityResponse(BaseModel):
    """Response model for database integrity check"""
    database_status: str  # "healthy", "warning", "error"
    connection_status: bool
    overall_health: str
    tables: List[DatabaseTableStatus]
    timestamp: str
    message: str


class SystemComponentStatus(BaseModel):
    """Status of individual system component"""
    component: str
    status: str  # "healthy", "warning", "error"
    message: str
    response_time_ms: Optional[float] = None


class DatabaseSeedStatusResponse(BaseModel):
    """Experimental data status for admin seed UI"""
    is_empty: bool
    experimental_row_count: int
    sample_count: int = 0


class TruncateDatabaseRequest(BaseModel):
    """Password confirmation for destructive truncate"""
    password: str = Field(..., min_length=1, description="Admin password")


class DatabaseOperationResponse(BaseModel):
    """Generic success payload for truncate/seed"""
    success: bool
    message: str
    details: Optional[dict] = None


class SystemHealthResponse(BaseModel):
    """Complete system health check response"""
    overall_status: str  # "healthy", "warning", "error"
    timestamp: str
    components: List[SystemComponentStatus]
    summary: str
    recommendations: List[str] = []
    uptime_hours: Optional[float] = None


# ===== HELPER FUNCTIONS =====

def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> dict:
    """
    Validate bearer token (custom JWT or Supabase OAuth) and require admin role.
    Always re-reads user_type from the database on each request.
    """
    try:
        user_context = verify_supabase_token(credentials.credentials)
        user_id = user_context.get("user_id")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Não autenticado",
            )

        supabase = get_supabase_client()
        response = (
            supabase.table("researchers")
            .select("id, user_type, email, name, status")
            .eq("id", user_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Não autenticado",
            )

        user = response.data[0]

        if not is_admin_role(user.get("user_type")):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissão negada. Apenas admins podem acessar esta rota.",
            )

        if user.get("status") == "desativado":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Conta desativada.",
            )

        return user

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado",
        )


def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_status(status_value: str) -> bool:
    """Validate status value"""
    valid_statuses = ["regular", "irregular", "desativado"]
    return status_value in valid_statuses


def format_user_response(user: dict) -> AdminUserResponse:
    """Convert database user record to AdminUserResponse"""
    return AdminUserResponse(
        id=user.get("id"),
        status=user.get("status", "regular"),
        name=user.get("name", ""),
        email=user.get("email", ""),
        user_type=user.get("user_type", "pesquisador"),
        institution=user.get("institution"),
        country=user.get("country"),
        language=user.get("language"),
        created_at=str(user.get("created_at", "")),
        experimentos_criados_total=int(user.get("experimentos_criados_total", 0))
    )


# ===== ENDPOINTS =====

@router.get("/users", response_model=UsersListResponse)
async def get_users_by_status(
    status_param: str = Query(..., alias="status", description="User status: regular, irregular, desativado"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=100, description="Records per page"),
    search: Optional[str] = Query(None, description="Search by email or name"),
    admin_user: dict = Depends(get_current_admin)
):
    """
    Get users by status with experiment count
    
    - Requires JWT token with admin role
    - Returns paginated list of users filtered by status
    - Includes count of experiments created by each user
    """
    
    # Validate status parameter
    if not validate_status(status_param):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status inválido. Use: 'regular', 'irregular' ou 'desativado'"
        )
    
    supabase = get_supabase_client()
    
    try:
        # Calculate offset for pagination
        offset = (page - 1) * per_page
        
        # Fetch users by status
        users_query = supabase.table("researchers").select("*").eq("status", status_param)
        
        # Add search filter if provided
        if search:
            users_response = users_query.execute()
            # Filter locally by name or email
            all_users = [
                u for u in users_response.data
                if search.lower() in u.get("name", "").lower() or search.lower() in u.get("email", "").lower()
            ]
        else:
            users_response = users_query.execute()
            all_users = users_response.data
        
        # Sort by created_at descending
        all_users.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        # Get total count
        total = len(all_users)
        total_pages = (total + per_page - 1) // per_page
        
        # Apply pagination
        paginated_users = all_users[offset:offset + per_page]
        
        # Count samples (experiments) for each user
        users_with_experiments = []
        for user in paginated_users:
            user_id = user.get("id")
            experiment_count = 0
            
            # Count samples for this researcher (with fallback)
            try:
                samples_response = supabase.table("samples").select("id", count="exact").eq("researcher_id", user_id).execute()
                experiment_count = samples_response.count if samples_response.count is not None else 0
            except Exception as exp_error:
                # Table doesn't exist or RLS blocks access, set count to 0
                # This is a graceful fallback
                experiment_count = 0
            
            user["experimentos_criados_total"] = experiment_count
            users_with_experiments.append(user)
        
        # Format response
        formatted_users = [format_user_response(u) for u in users_with_experiments]
        
        return UsersListResponse(
            users=formatted_users,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao carregar usuários: {str(e)}"
        )


@router.patch("/users/status", response_model=UpdateStatusResponse)
async def update_user_status(
    request: UpdateStatusRequest,
    admin_user: dict = Depends(get_current_admin)
):
    """
    Update user status and create audit log
    
    - Requires JWT token with admin role
    - Validates email format and target status
    - Creates entry in user_status_logs for audit trail
    - Returns updated user data
    """
    
    # Validate email
    if not request.email or not validate_email(request.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-mail inválido"
        )
    
    # Validate status
    if not validate_status(request.new_status):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status inválido. Use: 'regular', 'irregular' ou 'desativado'"
        )
    
    supabase = get_supabase_client()
    
    try:
        # Find user by email (case-insensitive)
        user_response = supabase.table("researchers").select("*").eq("email", request.email.lower()).execute()
        
        if not user_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        
        user = user_response.data[0]
        old_status = user.get("status", "regular")
        
        # Check if status is different
        if old_status == request.new_status:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"O usuário já possui o status '{old_status}'"
            )
        
        user_id = user.get("id")
        
        # Update user status
        update_response = supabase.table("researchers").update({
            "status": request.new_status
        }).eq("id", user_id).execute()
        
        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao atualizar status"
            )
        
        updated_user = update_response.data[0]
        
        # Create audit log entry
        try:
            log_entry = {
                "id": str(__import__('uuid').uuid4()),
                "admin_id": admin_user.get("id"),
                "user_id": user_id,
                "old_status": old_status,
                "new_status": request.new_status,
                "changed_at": datetime.utcnow().isoformat()
            }
            
            # Try to insert log (table might not exist yet, so we'll ignore if it fails)
            try:
                supabase.table("user_status_logs").insert(log_entry).execute()
            except:
                # Log table might not exist yet, silently continue
                pass
        except:
            pass
        
        # Count samples (experiments) for the user (with fallback)
        experiment_count = 0
        try:
            samples_response = supabase.table("samples").select("id", count="exact").eq("researcher_id", user_id).execute()
            experiment_count = samples_response.count if samples_response.count is not None else 0
        except Exception as exp_error:
            # Table doesn't exist or RLS blocks access, set count to 0
            experiment_count = 0
        
        updated_user["experimentos_criados_total"] = experiment_count
        
        return UpdateStatusResponse(
            success=True,
            message="Status atualizado com sucesso",
            user=format_user_response(updated_user),
            old_status=old_status,
            new_status=request.new_status
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar status: {str(e)}"
        )

@router.get("/administrators", response_model=AdminListResponse)
async def get_administrators(
    admin_user: dict = Depends(get_current_admin)
):
    """
    Get list of all administrators in the system
    
    - Requires JWT token with admin role
    - Returns all users with user_type='admin' including institution and experiment count
    """
    supabase = get_supabase_client()
    
    try:
        # Fetch all users with user_type='admin'
        response = supabase.table("researchers").select("id, name, email, user_type, institution, created_at").eq("user_type", "admin").execute()
        
        admins_data = response.data if response.data else []
        
        # Convert to AdminInfo objects with experiment counts
        admins = []
        for admin in admins_data:
            admin_id = admin.get("id")
            experiment_count = 0
            
            # Count samples (experiments) for this admin using the same method as users endpoint
            try:
                samples_response = supabase.table("samples").select("id", count="exact").eq("researcher_id", admin_id).execute()
                experiment_count = samples_response.count if samples_response.count is not None else 0
            except Exception as exp_error:
                # Graceful fallback if table doesn't exist or RLS blocks access
                experiment_count = 0
            
            admin_info = AdminInfo(
                id=admin.get("id"),
                name=admin.get("name", ""),
                email=admin.get("email", ""),
                user_type=admin.get("user_type", "admin"),
                institution=admin.get("institution"),
                experimentos_criados_total=int(experiment_count),  # Explicit int conversion
                created_at=str(admin.get("created_at", ""))
            )
            admins.append(admin_info)
        
        response_obj = AdminListResponse(
            admins=admins,
            total=len(admins)
        )
        return response_obj
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao carregar administradores: {str(e)}"
        )


@router.patch("/administrators/role", response_model=UpdateAdminRoleResponse)
async def update_administrator_role(
    request: UpdateAdminRoleRequest,
    admin_user: dict = Depends(get_current_admin)
):
    """
    Update user role (admin or pesquisador)
    
    - Requires JWT token with admin role
    - Can promote pesquisador to admin or demote admin to pesquisador
    - Changes take effect on next login
    """
    
    # Validate email
    if not request.email or not validate_email(request.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-mail inválido"
        )
    
    # Validate role
    valid_roles = ["admin", "pesquisador"]
    if request.new_role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role inválido. Use: {', '.join(valid_roles)}"
        )
    
    supabase = get_supabase_client()
    
    try:
        # Find user by email (case-insensitive)
        # Fetch both user_type and status for validation
        user_response = supabase.table("researchers").select("id, email, user_type, status").eq("email", request.email.lower()).execute()
        
        if not user_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        
        user = user_response.data[0]
        old_role = user.get("user_type", "pesquisador")
        user_status = user.get("status", "regular")
        user_id = user.get("id")
        
        # Check if role is different
        if old_role == request.new_role:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"O usuário já possui o role '{old_role}'"
            )
        
        # When promoting to admin, user MUST have status "regular"
        if request.new_role == "admin" and user_status != "regular":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Apenas usuários com status 'regular' podem ser promovidos a administrador. Status atual: '{user_status}'"
            )
        
        # Prevent demoting self
        if admin_user.get("id") == user_id and request.new_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não pode remover suas próprias permissões de admin"
            )
        
        # Update user role in database
        update_response = supabase.table("researchers").update({
            "user_type": request.new_role
        }).eq("id", user_id).execute()
        
        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao atualizar role"
            )
        
        return UpdateAdminRoleResponse(
            success=True,
            message=f"Role atualizado para '{request.new_role}' com sucesso. Mudança será efetiva no próximo login.",
            user_email=request.email,
            old_role=old_role,
            new_role=request.new_role
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar role: {str(e)}"
        )


@router.post("/verify-password", response_model=VerifyPasswordResponse)
def verify_admin_password(
    request: VerifyPasswordRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """
    Verify admin password for sensitive operations
    Only accessible by authenticated admins
    """
    try:
        supabase = get_supabase_client()
        admin_id = current_admin.get("id")
        admin_email = current_admin.get("email")
        
        # Get admin from database
        response = supabase.table("researchers").select("*").eq("id", admin_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuário não encontrado"
            )
        
        admin = response.data[0]
        
        # Verify password using JWT verification 
        # The password is verified by checking if current user can authenticate with provided password
        try:
            stored_password_hash = admin.get("password_hash")
            if not stored_password_hash:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Dados de autenticação inválidos"
                )
            
            # Verify password hash
            if not verify_password(request.password, stored_password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Senha incorreta"
                )
        except HTTPException:
            raise
        except ImportError:
            # If verify_password not available, use a simple approach
            # In production,should have proper password verification
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Sistema de autenticação indisponível"
            )
        
        return VerifyPasswordResponse(success=True)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao verificar senha: {str(e)}"
        )


@router.post("/validate-admin-role-change", response_model=ValidateAdminRoleChangeResponse)
def validate_admin_role_change(
    request: ValidateAdminRoleChangeRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """
    Validate admin role change before requesting password confirmation.
    ALL validations happen here - password is only requested if ALL checks pass.
    """
    try:
        supabase = get_supabase_client()
        
        # CRITICAL: Get normalized current admin email
        current_admin_id = current_admin.get("id")
        current_admin_email_raw = current_admin.get("email")
        if not current_admin_email_raw:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao recuperar email do administrador atual"
            )
        current_admin_email = current_admin_email_raw.lower().strip()
        
        # VALIDATION 1: Check if target email is empty
        if not request.email or not request.email.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="E-mail é obrigatório"
            )
        
        target_email = request.email.lower().strip()
        
        # CRITICAL VALIDATION: Check if trying to change SELF first (before other validations)
        if target_email == current_admin_email:
            if request.new_role == "pesquisador":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Não é possível remover suas próprias permissões."
                )
            elif request.new_role != "admin":
                # Any other role that's not admin
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Você não pode remover suas próprias permissões de administrador"
                )
        
        # VALIDATION 2: Check if user exists
        user_response = supabase.table("researchers").select("*").eq("email", target_email).execute()
        
        if not user_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuário com e-mail '{request.email}' não encontrado"
            )
        
        user = user_response.data[0]
        user_status = user.get("status", "regular")
        current_role = user.get("user_type", "pesquisador")
        
        # VALIDATION 3: If promoting to admin, check status
        if request.new_role == "admin":
            if user_status != "regular":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Apenas usuários com status 'regular' podem ser promovidos a admin. Status atual: '{user_status}'"
                )
        
        # VALIDATION 4: Check if trying to change to same role
        if current_role == request.new_role:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Usuário já possui o role '{request.new_role}'"
            )
        
        # All validations passed - can proceed with password confirmation
        return ValidateAdminRoleChangeResponse(
            success=True,
            message="Validação realizada com sucesso. Prossiga com a confirmação de senha.",
            can_proceed=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao validar mudança: {str(e)}"
        )


@router.post("/validate-status-change", response_model=ValidateStatusChangeResponse)
def validate_status_change(
    request: ValidateStatusChangeRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """
    Validate status change before requesting password confirmation.
    Checks if the change is valid without modifying any data.
    """
    try:
        supabase = get_supabase_client()
        
        # Check if email is empty
        if not request.email.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="E-mail é obrigatório"
            )
        
        # Check if user exists
        user_response = supabase.table("researchers").select("*").eq("email", request.email.lower()).execute()
        
        if not user_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        
        user = user_response.data[0]
        current_status = user.get("status", "regular")
        
        # Check if trying to change to same status
        if current_status == request.new_status:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Usuário já possui o status '{request.new_status}'"
            )
        
        # All validations passed
        return ValidateStatusChangeResponse(
            success=True,
            message="Validação realizada com sucesso. Prossiga com a confirmação de senha.",
            can_proceed=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao validar mudança: {str(e)}"
        )


@router.post("/check-database-integrity")
def check_database_integrity(admin_user: dict = Depends(get_current_admin)):
    """
    Check database connection and integrity
    Validates all tables and returns status
    """
    try:
        print("[INTEGRITY] Starting database integrity check...")
        print(f"[INTEGRITY] Admin verified ({admin_user.get('email')}), checking tables...")

        supabase = get_supabase_client()
        
        # Initialize results
        tables_to_check = [
            "researchers",
            "samples",
            "materials",
            "machines",
            "beam_qualities",
            "infill_measurements",
            "linear_attenuation",
            "mechanical_properties",
            "historico"
        ]
        table_statuses = []
        connection_ok = True
        all_healthy = True
        
        for table_name in tables_to_check:
            try:
                print(f"[INTEGRITY] Checking table: {table_name}")
                
                # Try to count rows
                response = supabase.table(table_name).select("count", count="exact").execute()
                row_count = response.count if hasattr(response, 'count') else 0
                
                # Get latest record for timestamp
                # Special handling for historico table which doesn't have created_at
                last_updated = None
                if table_name == "historico":
                    # historico table has DATA and HORARIO columns instead of created_at
                    # Skip timestamp retrieval for this table
                    pass
                else:
                    try:
                        latest_response = supabase.table(table_name).select("*").order("created_at", desc=True).limit(1).execute()
                        if latest_response.data and len(latest_response.data) > 0:
                            last_updated = latest_response.data[0].get("created_at", None)
                    except Exception as timestamp_error:
                        # If we can't get the timestamp, just continue - table exists and is accessible
                        print(f"[INTEGRITY] Warning: Could not get timestamp for {table_name}: {str(timestamp_error)}")
                
                # Determine status
                table_status = "healthy"
                message = f"✓ {row_count} registros"
                
                if row_count == 0:
                    table_status = "warning"
                    message = "⚠️ Tabela vazia"
                    all_healthy = False
                
                table_info = DatabaseTableStatus(
                    table_name=table_name,
                    status=table_status,
                    row_count=row_count,
                    last_updated=last_updated,
                    message=message
                )
                table_statuses.append(table_info)
                print(f"[INTEGRITY] ✓ Table {table_name}: {table_status} ({row_count} rows)")
                
            except Exception as e:
                print(f"[INTEGRITY] ✗ Error checking table {table_name}: {str(e)}")
                connection_ok = False
                all_healthy = False
                
                error_msg = str(e)
                if "does not exist" in error_msg.lower() or "404" in error_msg:
                    status_text = "error"
                    msg = "❌ Tabela não existe"
                else:
                    status_text = "error"
                    msg = f"❌ Erro ao verificar: {error_msg[:50]}"
                
                table_info = DatabaseTableStatus(
                    table_name=table_name,
                    status=status_text,
                    row_count=0,
                    last_updated=None,
                    message=msg
                )
                table_statuses.append(table_info)
        
        # Determine overall status
        overall_status = "healthy" if all_healthy and connection_ok else "warning"
        if not connection_ok:
            overall_status = "error"
        
        # Create summary message
        if overall_status == "healthy":
            summary = "✅ Banco de dados íntegro e funcionando normalmente"
        elif overall_status == "warning":
            summary = "⚠️ Banco de dados com avisos - verifique as tabelas vazias"
        else:
            summary = "❌ Erro ao conectar ao banco de dados"
        
        timestamp = datetime.now().isoformat()
        
        response_data = DatabaseIntegrityResponse(
            database_status=overall_status,
            connection_status=connection_ok,
            overall_health=overall_status,
            tables=table_statuses,
            timestamp=timestamp,
            message=summary
        )
        
        print(f"[INTEGRITY] ✓ Check completed: {overall_status}")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[INTEGRITY] ✗ Integrity check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao verificar integridade: {str(e)}"
        )


@router.post("/export-tables")
def export_all_tables(admin_user: dict = Depends(get_current_admin)):
    """
    Export all database tables as CSV files in a ZIP archive
    Only admins can export data
    """
    try:
        print("[EXPORT] Starting table export...")
        print(f"[EXPORT] Admin verified: {admin_user.get('email')}")

        supabase = get_supabase_client()

        # Create ZIP file in memory
        print("[EXPORT] Creating ZIP buffer...")
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # List of tables to export
            tables_to_export = ["researchers", "experiments", "samples", "material_machine"]
            exported_count = 0
            
            for table_name in tables_to_export:
                try:
                    print(f"[EXPORT] Exporting table: {table_name}")
                    # Fetch all data from table
                    response = supabase.table(table_name).select("*").execute()
                    
                    if not response.data:
                        print(f"[EXPORT] Table {table_name} is empty")
                        continue
                    
                    print(f"[EXPORT] Found {len(response.data)} rows in {table_name}")
                    
                    # Create CSV content
                    csv_buffer = io.StringIO()
                    
                    # Get headers from first row
                    headers = list(response.data[0].keys())
                    writer = csv.DictWriter(csv_buffer, fieldnames=headers)
                    
                    # Write header and data
                    writer.writeheader()
                    for row in response.data:
                        # Convert datetime objects to strings
                        row_clean = {}
                        for key, value in row.items():
                            if isinstance(value, datetime):
                                row_clean[key] = value.isoformat() if value else ""
                            elif isinstance(value, (list, dict)):
                                row_clean[key] = str(value)
                            else:
                                row_clean[key] = value if value is not None else ""
                        writer.writerow(row_clean)
                    
                    # Add CSV to ZIP
                    csv_content = csv_buffer.getvalue()
                    zip_file.writestr(f"{table_name}.csv", csv_content.encode('utf-8'))
                    csv_buffer.close()
                    exported_count += 1
                    print(f"[EXPORT] ✓ Table {table_name} exported successfully")
                    
                except Exception as e:
                    # Skip tables that don't exist
                    print(f"[EXPORT] Warning: Could not export table {table_name}: {str(e)}")
                    continue
        
        print(f"[EXPORT] Total tables exported: {exported_count}")
        
        # Reset buffer position
        zip_buffer.seek(0)
        zip_size = zip_buffer.getbuffer().nbytes
        print(f"[EXPORT] ZIP file size: {zip_size} bytes")
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"amrad_backup_{timestamp}.zip"
        
        # Log export action
        print(f"[EXPORT] ✓ User {user_id} successfully exported all tables")
        
        return StreamingResponse(
            iter([zip_buffer.getvalue()]),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Export tables failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao exportar tabelas: {str(e)}"
        )


@router.post("/system-health")
def check_system_health(admin_user: dict = Depends(get_current_admin)):
    """
    Comprehensive system health check
    Verifies API, database, authentication, and performance
    """
    import time
    import psutil
    import os
    
    try:
        print("[HEALTH] Starting system health check...")
        start_time = time.time()
        print(f"[HEALTH] Admin verified ({admin_user.get('email')}), checking all components...")

        supabase = get_supabase_client()
        
        components = []
        overall_healthy = True
        recommendations = []
        
        # ===== 1. API/Server Status =====
        print("[HEALTH] Checking API/Server status...")
        try:
            api_start = time.time()
            # Simple check - if we're here, API is responsive
            api_time = (time.time() - api_start) * 1000
            components.append(SystemComponentStatus(
                component="API/Servidor",
                status="healthy",
                message="✅ API respondendo normalmente",
                response_time_ms=api_time
            ))
            print("[HEALTH] ✓ API/Server: healthy")
        except Exception as e:
            overall_healthy = False
            components.append(SystemComponentStatus(
                component="API/Servidor",
                status="error",
                message=f"❌ Erro na API: {str(e)[:60]}"
            ))
            recommendations.append("Reinicie o servidor da API")
            print("[HEALTH] ✗ API/Server: error")
        
        # ===== 2. Database Connection =====
        print("[HEALTH] Checking database connection...")
        try:
            db_start = time.time()
            response = supabase.table("researchers").select("count", count="exact").execute()
            db_time = (time.time() - db_start) * 1000
            
            if db_time > 5000:  # More than 5 seconds is slow
                status_text = "warning"
                message = f"⚠️ Banco de dados lento ({db_time:.0f}ms)"
                overall_healthy = False
                recommendations.append(f"Otimize consultas ao banco de dados (latência: {db_time:.0f}ms)")
            else:
                status_text = "healthy"
                message = f"✅ Banco de dados responsivo ({db_time:.0f}ms)"
            
            components.append(SystemComponentStatus(
                component="Banco de Dados",
                status=status_text,
                message=message,
                response_time_ms=db_time
            ))
            print(f"[HEALTH] ✓ Database: {status_text}")
        except Exception as e:
            overall_healthy = False
            components.append(SystemComponentStatus(
                component="Banco de Dados",
                status="error",
                message=f"❌ Falha na conexão: {str(e)[:60]}"
            ))
            recommendations.append("Verifique a conexão com o Supabase")
            print("[HEALTH] ✗ Database: error")
        
        # ===== 3. Authentication System =====
        print("[HEALTH] Checking authentication system...")
        try:
            auth_start = time.time()
            # Check if we can verify current token (already did above, so it's working)
            auth_time = (time.time() - auth_start) * 1000
            components.append(SystemComponentStatus(
                component="Autenticação/JWT",
                status="healthy",
                message="✅ Sistema de autenticação funcionando",
                response_time_ms=auth_time
            ))
            print("[HEALTH] ✓ Authentication: healthy")
        except Exception as e:
            overall_healthy = False
            components.append(SystemComponentStatus(
                component="Autenticação/JWT",
                status="error",
                message=f"❌ Erro de autenticação: {str(e)[:60]}"
            ))
            recommendations.append("Verifique configurações de JWT e tokens")
            print("[HEALTH] ✗ Authentication: error")
        
        # ===== 4. Database Tables Integrity =====
        print("[HEALTH] Checking database tables...")
        try:
            tables_to_check = [
                "researchers", "samples", "materials", "machines",
                "beam_qualities", "infill_measurements", "linear_attenuation",
                "mechanical_properties", "historico"
            ]
            
            tables_status = "healthy"
            tables_with_issues = []
            
            for table_name in tables_to_check:
                try:
                    # Use limit 1 to avoid loading data, just check existence
                    response = supabase.table(table_name).select("count", count="exact").limit(0).execute()
                    row_count = response.count if hasattr(response, 'count') else 0
                    
                    if row_count == 0:
                        tables_with_issues.append(f"{table_name} (vazia)")
                        tables_status = "warning"
                except Exception as table_error:
                    tables_with_issues.append(f"{table_name} (erro)")
                    tables_status = "error"
            
            if tables_status == "healthy":
                message = f"✅ Todas as {len(tables_to_check)} tabelas OK"
            elif tables_status == "warning":
                message = f"⚠️ {len(tables_with_issues)} tabelas vazias"
                recommendations.append(f"Verifique tabelas vazias: {', '.join(tables_with_issues)}")
            else:
                message = f"❌ Algumas tabelas com problemas"
                recommendations.append(f"Verifique tabelas com erro: {', '.join(tables_with_issues)}")
                overall_healthy = False
            
            components.append(SystemComponentStatus(
                component="Integridade de Tabelas",
                status=tables_status,
                message=message
            ))
            print(f"[HEALTH] ✓ Tables: {tables_status}")
        except Exception as e:
            overall_healthy = False
            components.append(SystemComponentStatus(
                component="Integridade de Tabelas",
                status="error",
                message=f"❌ Erro ao verificar: {str(e)[:60]}"
            ))
            print("[HEALTH] ✗ Tables: error")
        
        # ===== 5. System Resources =====
        print("[HEALTH] Checking system resources...")
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            
            resources_status = "healthy"
            resource_issues = []
            
            if cpu_percent > 80:
                resources_status = "warning"
                resource_issues.append(f"CPU alta ({cpu_percent:.0f}%)")
                recommendations.append("CPU em alto uso - monitore processos")
            
            if memory.percent > 85:
                resources_status = "warning"
                resource_issues.append(f"Memória alta ({memory.percent:.0f}%)")
                recommendations.append("Memória em alto uso - libere espaço")
            
            resource_msg = f"✅ CPU: {cpu_percent:.0f}% | Memória: {memory.percent:.0f}%"
            if resource_issues:
                resource_msg = f"⚠️ {', '.join(resource_issues)}"
            
            components.append(SystemComponentStatus(
                component="Recursos do Sistema",
                status=resources_status,
                message=resource_msg
            ))
            print(f"[HEALTH] ✓ Resources: {resources_status}")
        except Exception as e:
            # Resources check is optional
            components.append(SystemComponentStatus(
                component="Recursos do Sistema",
                status="warning",
                message=f"⚠️ Não foi possível verificar: {str(e)[:40]}"
            ))
            print("[HEALTH] ⚠️ Resources: skipped")
        
        # ===== 6. File System =====
        print("[HEALTH] Checking file system...")
        try:
            disk = psutil.disk_usage('/')
            
            fs_status = "healthy"
            if disk.percent > 90:
                fs_status = "warning"
                recommendations.append(f"Disco em alto uso ({disk.percent:.0f}%) - libere espaço")
            
            fs_msg = f"✅ Disco livre: {disk.free / (1024**3):.1f} GB ({100-disk.percent:.0f}%)"
            if fs_status == "warning":
                fs_msg = f"⚠️ Disco em {disk.percent:.0f}% - apenas {disk.free / (1024**3):.1f} GB livres"
            
            components.append(SystemComponentStatus(
                component="Sistema de Arquivos",
                status=fs_status,
                message=fs_msg
            ))
            print(f"[HEALTH] ✓ FileSystem: {fs_status}")
        except Exception as e:
            components.append(SystemComponentStatus(
                component="Sistema de Arquivos",
                status="warning",
                message=f"⚠️ Não foi possível verificar"
            ))
            print("[HEALTH] ⚠️ FileSystem: skipped")
        
        # ===== Determine Overall Status =====
        error_count = sum(1 for c in components if c.status == "error")
        warning_count = sum(1 for c in components if c.status == "warning")
        
        if error_count > 0:
            overall_status = "error"
            summary = f"❌ Sistema com {error_count} erro(s) - ação necessária"
        elif warning_count > 0:
            overall_status = "warning"
            summary = f"⚠️ Sistema com {warning_count} aviso(s) - verifique em breve"
        else:
            overall_status = "healthy"
            summary = "✅ Sistema operacional, todos os componentes OK"
        
        # Add general recommendations if healthy
        if overall_status == "healthy" and not recommendations:
            recommendations.append("Continue monitorando regularmente")
        
        total_time = time.time() - start_time
        print(f"[HEALTH] ✓ Health check completed in {total_time:.2f}s: {overall_status}")
        
        return SystemHealthResponse(
            overall_status=overall_status,
            timestamp=datetime.now().isoformat(),
            components=components,
            summary=summary,
            recommendations=recommendations,
            uptime_hours=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[HEALTH] ✗ Health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao verificar saúde do sistema: {str(e)}"
        )


@router.get("/experiments", response_model=ExperimentsResponse)
async def get_experiments_by_status(
    admin_user: dict = Depends(get_current_admin)
):
    """
    Get experiments organized by status (Approved vs In Analysis)
    
    - Requires JWT token with admin role
    - Returns two lists: approved experiments and in-analysis experiments
    - In-analysis includes: Submitted, Revisions, Review
    - Approved includes: Approved
    - LIMITED to 50 most recent experiments per status for performance
    """
    supabase = get_supabase_client()
    
    try:
        # Fetch samples with LIMIT to avoid loading too many records
        # Fetch approved samples
        approved_samples_response = supabase.table("samples").select(
            "*"
        ).eq("status", "Approved").order("created_at", desc=True).limit(50).execute()
        approved_samples = approved_samples_response.data or []
        
        # Fetch in-analysis samples (Submitted, Revisions, Review)
        in_analysis_samples_response = supabase.table("samples").select(
            "*"
        ).in_("status", ["Submitted", "Revisions", "Review"]).order("created_at", desc=True).limit(50).execute()
        in_analysis_samples = in_analysis_samples_response.data or []
        
        all_samples = approved_samples + in_analysis_samples
        sample_ids = [s.get("id") for s in all_samples]
        
        # Batch fetch all related data
        # Fetch all researchers
        researcher_ids = list(set([s.get("researcher_id") for s in all_samples if s.get("researcher_id")]))
        researchers_map = {}
        try:
            if researcher_ids:
                researchers_response = supabase.table("researchers").select("id, name").in_("id", researcher_ids).execute()
                researchers_map = {r.get("id"): r.get("name") for r in researchers_response.data}
        except:
            pass
        
        # Fetch all materials
        material_ids = list(set([s.get("material_id") for s in all_samples if s.get("material_id")]))
        materials_map = {}
        try:
            if material_ids:
                materials_response = supabase.table("materials").select("id, brand, model, color").in_("id", material_ids).execute()
                materials_map = {m.get("id"): m for m in materials_response.data}
        except:
            pass
        
        # Fetch all machines
        machine_ids = list(set([s.get("machine_id") for s in all_samples if s.get("machine_id")]))
        machines_map = {}
        try:
            if machine_ids:
                machines_response = supabase.table("machines").select("id, brand, model, technology_type").in_("id", machine_ids).execute()
                machines_map = {m.get("id"): m for m in machines_response.data}
        except:
            pass
        
        # Fetch all infill measurements in batch
        infill_map = {}
        try:
            if sample_ids:
                infill_response = supabase.table("infill_measurements").select("sample_id, hu_mean").in_("sample_id", sample_ids).execute()
                for inf in infill_response.data:
                    sample_id = inf.get("sample_id")
                    if sample_id not in infill_map:
                        infill_map[sample_id] = []
                    infill_map[sample_id].append(inf.get("hu_mean"))
        except:
            pass
        
        # Batch fetch mechanical properties and count by sample_id
        mechanical_counts = {sid: 0 for sid in sample_ids}
        try:
            if sample_ids:
                mech_response = supabase.table("mechanical_properties").select("sample_id, id").in_("sample_id", sample_ids).execute()
                for mech in (mech_response.data or []):
                    sample_id = mech.get("sample_id")
                    mechanical_counts[sample_id] = mechanical_counts.get(sample_id, 0) + 1
        except:
            pass
        
        # Batch fetch attenuation data and count by sample_id
        attenuation_counts = {sid: 0 for sid in sample_ids}
        try:
            if sample_ids:
                atten_response = supabase.table("linear_attenuation").select("sample_id, id").in_("sample_id", sample_ids).execute()
                for att in (atten_response.data or []):
                    sample_id = att.get("sample_id")
                    attenuation_counts[sample_id] = attenuation_counts.get(sample_id, 0) + 1
        except:
            pass
        
        # Batch check beam qualities
        beam_counts = {sid: False for sid in sample_ids}
        try:
            if sample_ids:
                beam_response = supabase.table("beam_qualities").select("sample_id, id").in_("sample_id", sample_ids).execute()
                for beam in (beam_response.data or []):
                    sample_id = beam.get("sample_id")
                    beam_counts[sample_id] = True
        except:
            pass
        
        # Process approved experiments
        approved_experiments = []
        for sample in approved_samples:
            sample_id = sample.get("id")
            material = materials_map.get(sample.get("material_id"), {})
            machine = machines_map.get(sample.get("machine_id"), {})
            
            # Calculate infill mean
            infill_hu_mean = None
            if sample_id in infill_map and infill_map[sample_id]:
                valid_values = [v for v in infill_map[sample_id] if v is not None]
                if valid_values:
                    infill_hu_mean = sum(valid_values) / len(valid_values)
            
            experiment_item = ExperimentItem(
                id=sample_id,
                index_visual=sample.get("index_visual"),
                researcher_id=sample.get("researcher_id"),
                researcher_name=researchers_map.get(sample.get("researcher_id")),
                material_brand=material.get("brand"),
                material_model=material.get("model"),
                material_color=material.get("color"),
                machine_brand=machine.get("brand"),
                machine_model=machine.get("model"),
                machine_technology=machine.get("technology_type"),
                shape_type=sample.get("shape_type"),
                roi_area_mm2=None,  # Removed from samples table
                infill_hu_mean=infill_hu_mean,
                infill_data_count=len(infill_map.get(sample_id, [])),
                mechanical_data_count=mechanical_counts.get(sample_id, 0),
                attenuation_data_count=attenuation_counts.get(sample_id, 0),
                beam_qualities_exists=beam_counts.get(sample_id, False),
                status=sample.get("status", "Submitted"),
                created_at=sample.get("created_at")
            )
            approved_experiments.append(experiment_item)
        
        # Process in-analysis experiments
        in_analysis_experiments = []
        for sample in in_analysis_samples:
            sample_id = sample.get("id")
            material = materials_map.get(sample.get("material_id"), {})
            machine = machines_map.get(sample.get("machine_id"), {})
            
            # Calculate infill mean
            infill_hu_mean = None
            if sample_id in infill_map and infill_map[sample_id]:
                valid_values = [v for v in infill_map[sample_id] if v is not None]
                if valid_values:
                    infill_hu_mean = sum(valid_values) / len(valid_values)
            
            experiment_item = ExperimentItem(
                id=sample_id,
                index_visual=sample.get("index_visual"),
                researcher_id=sample.get("researcher_id"),
                researcher_name=researchers_map.get(sample.get("researcher_id")),
                material_brand=material.get("brand"),
                material_model=material.get("model"),
                material_color=material.get("color"),
                machine_brand=machine.get("brand"),
                machine_model=machine.get("model"),
                machine_technology=machine.get("technology_type"),
                shape_type=sample.get("shape_type"),
                roi_area_mm2=None,  # Removed from samples table
                infill_hu_mean=infill_hu_mean,
                infill_data_count=len(infill_map.get(sample_id, [])),
                mechanical_data_count=mechanical_counts.get(sample_id, 0),
                attenuation_data_count=attenuation_counts.get(sample_id, 0),
                beam_qualities_exists=beam_counts.get(sample_id, False),
                status=sample.get("status", "Submitted"),
                created_at=sample.get("created_at")
            )
            in_analysis_experiments.append(experiment_item)
        
        return ExperimentsResponse(
            approved=approved_experiments,
            in_analysis=in_analysis_experiments,
            total_approved=len(approved_experiments),
            total_in_analysis=len(in_analysis_experiments)
        )
        
    except Exception as e:
        logger.error(f"Error fetching experiments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao carregar experimentos: {str(e)}"
        )


@router.get("/experiments/status-history/all")
async def get_all_experiments_status_history(
    old_status: Optional[str] = Query(None, description="Filter by old status (use __NULL__ for initial submissions)"),
    new_status: Optional[str] = Query(None, description="Filter by new status"),
    changed_by_name: Optional[str] = Query(None, description="Filter by name of user who changed"),
    changed_by_role: Optional[str] = Query(None, description="Filter by role who changed (admin, pesquisador)"),
    start_date: Optional[str] = Query(None, description="Filter by start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="Filter by end date (ISO format)"),
    admin_user: dict = Depends(get_current_admin)
):
    """
    Get complete status history for all experiments with optional filters
    
    Note: Use old_status='__NULL__' to filter for initial submissions (where old_status IS NULL)
    """
    try:
        logger.info(f"[StatusHistory] Request from admin: {admin_user.get('email', 'unknown')}")
        logger.info(f"[StatusHistory] Filters - old_status: {old_status}, new_status: {new_status}, changed_by_name: {changed_by_name}, role: {changed_by_role}")
        
        supabase = get_supabase_client()
        
        # Start with base query - select all columns
        query = supabase.table("sample_status_history").select("id, sample_id, old_status, new_status, changed_by_user_id, changed_by_name, changed_by_email, changed_by_role, comment, is_system_action, created_at")
        
        # Apply filters
        # Handle old_status filter with special case for NULL
        if old_status:
            if old_status.strip() == "__NULL__":
                logger.info("[StatusHistory] Filtering by old_status: NULL (initial submissions)")
                query = query.is_("old_status", "null")
            else:
                logger.info(f"[StatusHistory] Filtering by old_status: {old_status}")
                query = query.eq("old_status", old_status.strip())
        
        if new_status and new_status.strip():
            logger.info(f"[StatusHistory] Filtering by new_status: {new_status}")
            query = query.eq("new_status", new_status.strip())
        
        if changed_by_name and changed_by_name.strip():
            logger.info(f"[StatusHistory] Filtering by name: {changed_by_name}")
            # Use ilike for case-insensitive partial match
            query = query.ilike("changed_by_name", f"%{changed_by_name.strip()}%")
        
        if changed_by_role and changed_by_role.strip():
            logger.info(f"[StatusHistory] Filtering by role: {changed_by_role}")
            query = query.eq("changed_by_role", changed_by_role.strip())
        
        if start_date and start_date.strip():
            logger.info(f"[StatusHistory] Filtering from date: {start_date}")
            query = query.gte("created_at", f"{start_date.strip()}T00:00:00")
        
        if end_date and end_date.strip():
            logger.info(f"[StatusHistory] Filtering to date: {end_date}")
            query = query.lte("created_at", f"{end_date.strip()}T23:59:59")
        
        # Execute with ordering
        logger.info("[StatusHistory] Executing query...")
        response = query.order("created_at", desc=True).execute()
        
        logger.info(f"[StatusHistory] Query executed successfully. Records: {len(response.data) if response.data else 0}")
        
        return {
            "success": True,
            "total": len(response.data) if response.data else 0,
            "data": response.data if response.data else []
        }
        
    except Exception as e:
        logger.error(f"[StatusHistory] Error: {str(e)}")
        logger.error(f"[StatusHistory] Exception type: {type(e).__name__}")
        import traceback
        logger.error(f"[StatusHistory] Traceback: {traceback.format_exc()}")
        
        return {
            "success": False,
            "total": 0,
            "data": [],
            "error": str(e)
        }




@router.get("/debug/status-history-test")
async def debug_status_history_test(
    admin_user: dict = Depends(get_current_admin),
):
    """
    DEBUG ONLY: Verify sample_status_history table access (admin + DEBUG required).
    """
    if not settings.DEBUG:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    try:
        supabase = get_supabase_client()
        response = supabase.table("sample_status_history").select("id", count="exact").limit(1).execute()

        return {
            "success": True,
            "table_exists": True,
            "total_records": response.count or 0,
        }

    except Exception as e:
        logger.error("[DEBUG] ERROR: %s", str(e), exc_info=True)
        return {
            "success": False,
            "error": "Debug query failed",
        }


@router.get("/debug/sample/{sample_id}/history")
async def debug_sample_history(
    sample_id: str,
    admin_user: dict = Depends(get_current_admin),
):
    """
    DEBUG ONLY: Check status history for a sample (admin + DEBUG required).
    """
    if not settings.DEBUG:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    try:
        supabase = get_supabase_client()
        sample_response = supabase.table("samples").select("id, status, researcher_id, created_at").eq("id", sample_id).execute()

        if not sample_response.data:
            return {
                "success": False,
                "error": "Sample not found",
            }

        sample_data = sample_response.data[0]
        history_response = (
            supabase.table("sample_status_history")
            .select("id, sample_id, old_status, new_status, created_at")
            .eq("sample_id", sample_id)
            .order("created_at", desc=False)
            .execute()
        )
        history_records = history_response.data or []

        return {
            "success": True,
            "sample_status": sample_data.get("status"),
            "history_records_count": len(history_records),
            "has_initial_submission_record": any(
                record.get("old_status") is None and record.get("new_status") == "Submitted"
                for record in history_records
            ),
        }

    except Exception as e:
        logger.error("[DEBUG] ERROR checking sample history: %s", str(e), exc_info=True)
        return {
            "success": False,
            "error": "Debug query failed",
        }


@router.post("/sync/status-history")
async def sync_status_history(
    admin_user: dict = Depends(get_current_admin)
):
    """
    ADMIN ONLY: Synchronize status history for all samples missing records
    
    This endpoint:
    1. Scans all samples in database
    2. Identifies which ones are missing status history records
    3. Creates missing initial submission records
    4. Returns detailed synchronization report
    
    Use this to fix historical data or after system migrations
    """
    try:
        logger.info(f"[SYNC] Synchronization initiated by admin: {admin_user.get('email', 'unknown')}")
        
        supabase = get_supabase_client()
        
        # Step 1: Fetch all samples
        logger.info("[SYNC] Step 1: Fetching all samples...")
        samples_response = supabase.table("samples").select("id, status, created_at, researcher_id").execute()
        samples = samples_response.data or []
        
        logger.info(f"[SYNC] Found {len(samples)} total samples")
        
        # Step 2: Check which samples are missing history
        logger.info("[SYNC] Step 2: Checking for missing history records...")
        samples_missing_history = []
        
        for sample in samples:
            sample_id = sample.get("id")
            history_response = supabase.table("sample_status_history") \
                .select("id") \
                .eq("sample_id", sample_id) \
                .execute()
            
            if not history_response.data or len(history_response.data) == 0:
                samples_missing_history.append(sample)
        
        logger.info(f"[SYNC] Found {len(samples_missing_history)} samples missing history")
        
        # Step 3: Create missing records
        logger.info("[SYNC] Step 3: Creating missing history records...")
        created_count = 0
        failed_count = 0
        
        for idx, sample in enumerate(samples_missing_history, 1):
            try:
                sample_id = sample.get("id")
                researcher_id = sample.get("researcher_id")
                created_at = sample.get("created_at")
                
                # Get researcher info
                researcher_response = supabase.table("researchers") \
                    .select("name, email") \
                    .eq("id", researcher_id) \
                    .execute()
                
                if researcher_response.data and len(researcher_response.data) > 0:
                    researcher = researcher_response.data[0]
                    researcher_name = researcher.get("name", "Unknown Researcher")
                    researcher_email = researcher.get("email", "unknown@example.com")
                else:
                    researcher_name = "Unknown Researcher"
                    researcher_email = "unknown@example.com"
                
                # Create history record
                history_entry = {
                    "sample_id": sample_id,
                    "old_status": None,
                    "new_status": "Submitted",
                    "changed_by_user_id": researcher_id,
                    "changed_by_name": researcher_name,
                    "changed_by_email": researcher_email,
                    "changed_by_role": "pesquisador",
                    "comment": "Sincronizado automaticamente - registro retroativo",
                    "is_system_action": True,
                    "created_at": created_at
                }
                
                response = supabase.table("sample_status_history").insert(history_entry).execute()
                
                if response.data and len(response.data) > 0:
                    logger.info(f"[SYNC]   [{idx}/{len(samples_missing_history)}] ✓ Created history for {sample_id}")
                    created_count += 1
                else:
                    logger.error(f"[SYNC]   [{idx}/{len(samples_missing_history)}] ✗ Failed to create history for {sample_id}")
                    failed_count += 1
                    
            except Exception as e:
                logger.error(f"[SYNC]   [{idx}/{len(samples_missing_history)}] ✗ Error: {str(e)}")
                failed_count += 1
        
        logger.info(f"[SYNC] Synchronization completed. Created: {created_count}, Failed: {failed_count}")
        
        return {
            "success": True,
            "total_samples": len(samples),
            "samples_missing_history": len(samples_missing_history),
            "records_created": created_count,
            "records_failed": failed_count,
            "message": f"Sincronização concluída: {created_count} registros criados, {failed_count} falhados"
        }
        
    except Exception as e:
        logger.error(f"[SYNC] ERROR during synchronization: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__
        }


@router.patch("/experiments/{experiment_id}/status")
async def update_experiment_status(
    experiment_id: str,
    status_update: dict,
    admin_user: dict = Depends(get_current_admin)
):
    """
    Update experiment (sample) status
    
    - Requires JWT token with admin role
    - Valid status values: Submitted, Revisions, Review, Approved
    - Records the change in sample status history for audit trail
    - Returns updated experiment with history record
    """
    try:
        new_status = status_update.get("status")
        comment = status_update.get("comment")
        
        if not new_status:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Status é obrigatório"
            )
        
        valid_statuses = ["Submitted", "Revisions", "Review", "Approved"]
        if new_status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Status inválido. Deve ser um de: {', '.join(valid_statuses)}"
            )
        
        # Get Supabase client and history manager
        supabase = get_supabase_client()
        history_manager = get_status_history_manager()
        
        # Get current sample to check old status
        sample_response = supabase.table("samples").select("*").eq("id", experiment_id).execute()
        
        if not sample_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Experimento não encontrado"
            )
        
        sample = sample_response.data[0]
        old_status = sample.get("status")
        
        # Check if status is different
        if old_status == new_status:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"O experimento já possui o status '{old_status}'"
            )
        
        # Validate transition rules
        is_valid, error_message = history_manager.validate_status_transition(old_status, new_status)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
        
        # Update the sample status
        response = supabase.table("samples").update({"status": new_status}).eq("id", experiment_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao atualizar status do experimento"
            )
        
        # Record the status change in history
        try:
            # Get the admin's full name from database
            admin_user_id = admin_user.get("id")
            admin_name = await get_user_full_name(admin_user_id)
            admin_email = admin_user.get("email", "admin@example.com")
            
            history_record = history_manager.record_status_change(
                sample_id=experiment_id,
                old_status=old_status,
                new_status=new_status,
                changed_by_user_id=admin_user_id,
                changed_by_name=admin_name,
                changed_by_email=admin_email,
                changed_by_role="admin",
                comment=comment,
                is_system_action=False
            )
        except Exception as history_error:
            # Log error but don't fail the status update
            logger.error(f"Failed to record status history for {experiment_id}: {str(history_error)}")
            history_record = None
        
        return {
            "success": True,
            "message": f"Status atualizado de '{old_status}' para '{new_status}'",
            "experiment_id": experiment_id,
            "old_status": old_status,
            "new_status": new_status,
            "history_recorded": history_record is not None
        }
        
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error updating experiment status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar status: {str(e)}"
        )



@router.get("/experiments/{experiment_id}/details")
async def get_experiment_details(
    experiment_id: str,
    admin_user: dict = Depends(get_current_admin)
):
    """
    Get complete experiment details with all related data
    
    - Includes sample, material, machine data
    - Includes beam_qualities, infill_measurements, linear_attenuation, mechanical_properties
    - Includes researcher information
    """
    try:
        return fetch_admin_experiment_details(experiment_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching experiment details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao carregar detalhes do experimento: {str(e)}"
        )


@router.get("/database-seed-status", response_model=DatabaseSeedStatusResponse)
def get_database_seed_status(current_admin: dict = Depends(get_current_admin)):
    """Check if experimental tables are empty (seed button enabled only when empty)."""
    try:
        supabase = get_supabase_client()
        is_empty, total = is_experimental_database_empty(supabase)
        from app.services.database_management import count_table_rows

        sample_count = count_table_rows(supabase, "samples")
        return DatabaseSeedStatusResponse(
            is_empty=is_empty,
            experimental_row_count=total,
            sample_count=sample_count,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao verificar estado do banco: {str(e)}",
        )


@router.post("/truncate-experimental-data", response_model=DatabaseOperationResponse)
def truncate_database_experimental(
    request: TruncateDatabaseRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """
    Remove all experimental rows (materials, samples, measurements).
    Requires admin role and password confirmation. Preserves researchers.
    """
    try:
        supabase = get_supabase_client()
        admin_id = current_admin.get("id")

        response = supabase.table("researchers").select("password_hash").eq("id", admin_id).execute()
        if not response.data:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")

        stored_hash = response.data[0].get("password_hash")
        if not stored_hash or not verify_password(request.password, stored_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Senha incorreta")

        truncate_experimental_data(supabase)
        return DatabaseOperationResponse(
            success=True,
            message="Dados experimentais excluídos com sucesso.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[truncate-experimental-data] %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao excluir dados experimentais: {str(e)}",
        )


@router.post("/seed-experimental-data", response_model=DatabaseOperationResponse)
def seed_database_experimental(current_admin: dict = Depends(get_current_admin)):
    """
    Append 5 complete experiments with scientifically coherent mock data.
    Can be run multiple times to aggregate more test data.
    """
    try:
        supabase = get_supabase_client()
        researcher_id = current_admin.get("id")
        if not researcher_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ID do administrador não encontrado",
            )

        details = seed_experimental_data(supabase, researcher_id)
        n = details.get("samples_created", 5)
        return DatabaseOperationResponse(
            success=True,
            message=f"{n} experimentos completos adicionados com sucesso.",
            details=details,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[seed-experimental-data] %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao popular banco de dados: {str(e)}",
        )