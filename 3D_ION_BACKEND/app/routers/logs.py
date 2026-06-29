"""
Router for application logs and audit trail API endpoints
"""

from typing import Optional
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer

from app.core.logging_service import get_logging_service
from app.core.config import settings
from app.core.security import get_current_user, verify_sample_access
from app.schemas.logging import (
    LogResponse,
    LogFilter,
    ActionCategoryEnum,
    SeverityLevelEnum,
    ApplicationLog,
)

router = APIRouter(prefix="/logs", tags=["Audit & Logs"])
security_scheme = HTTPBearer()


@router.get(
    "/my-logs",
    response_model=LogResponse,
    summary="Obter meus logs",
    description="Retorna o histórico de ações do usuário autenticado"
)
async def get_my_logs(
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
) -> LogResponse:
    """
    Get audit trail for the current authenticated user.
    
    Returns all actions performed by the user, including:
    - Sample creations and modifications
    - Status changes
    - Data entries
    - Admin actions (if user is admin)
    """
    
    user_id = current_user["user_id"]

    try:
        service = get_logging_service()
        filters = LogFilter(
            user_id=UUID(user_id),
            limit=limit,
            offset=offset,
        )
        return await service.query_logs(filters)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving logs: {str(e)}"
        )


@router.get(
    "/sample/{sample_id}",
    response_model=LogResponse,
    summary="Obter histórico completo de uma amostra",
    description="Retorna todas as ações e mudanças de status de uma amostra específica"
)
async def get_sample_audit_trail(
    sample_id: UUID,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
) -> LogResponse:
    """
    Get complete audit trail for a specific sample.
    
    Returns all events related to the sample, including:
    - Creation
    - Data updates
    - Status changes
    - Data deletions
    """
    
    verify_sample_access(sample_id, current_user)

    try:
        service = get_logging_service()
        return await service.get_sample_audit_trail(sample_id, limit, offset)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving sample logs: {str(e)}"
        )


@router.get(
    "/sample/{sample_id}/status-changes",
    response_model=list[ApplicationLog],
    summary="Obter histórico de mudanças de status",
    description="Retorna apenas as mudanças de status de uma amostra"
)
async def get_sample_status_changes(
    sample_id: UUID,
    current_user: dict = Depends(get_current_user),
) -> list[ApplicationLog]:
    """
    Get status change history for a specific sample.
    
    Returns only STATUS_CHANGE events, ordered chronologically.
    """
    
    verify_sample_access(sample_id, current_user)

    try:
        service = get_logging_service()
        return await service.get_status_change_history(sample_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving status changes: {str(e)}"
        )


@router.get(
    "/admin/all-logs",
    response_model=LogResponse,
    summary="[ADMIN] Obter todos os logs",
    description="Retorna todos os logs registrados (apenas para administradores)"
)
async def get_all_logs(
    user_type: Optional[str] = Query(None),
    action_category: Optional[ActionCategoryEnum] = Query(None),
    severity_level: Optional[SeverityLevelEnum] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    entity_name: Optional[str] = Query(None),
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
) -> LogResponse:
    """
    Get all logs with flexible filtering (admin only).
    
    Accessible only to admin users. Allows filtering by:
    - User type
    - Action category
    - Severity level
    - Date range
    - Entity name
    """
    
    if current_user.get("user_type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view all logs",
        )

    try:
        service = get_logging_service()
        filters = LogFilter(
            action_category=action_category,
            severity_level=severity_level,
            start_date=start_date,
            end_date=end_date,
            entity_name=entity_name,
            limit=limit,
            offset=offset,
        )
        return await service.query_logs(filters)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving logs: {str(e)}"
        )


@router.get(
    "/admin/recent-actions",
    response_model=list[ApplicationLog],
    summary="[ADMIN] Ações admin recentes",
    description="Retorna ações administrativas recentes para monitoramento"
)
async def get_recent_admin_actions(
    hours: int = Query(24, ge=1, le=720),
    limit: int = Query(50, le=500),
    current_user: dict = Depends(get_current_user),
) -> list[ApplicationLog]:
    """
    Get recent admin actions for monitoring.
    
    Returns admin actions from the last N hours, useful for:
    - Auditing admin activities
    - Monitoring for unauthorized changes
    - Compliance reporting
    """
    
    if current_user.get("user_type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view admin actions",
        )

    try:
        service = get_logging_service()
        return await service.get_recent_admin_actions(hours, limit)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving admin actions: {str(e)}"
        )


@router.get(
    "/admin/errors",
    response_model=list[ApplicationLog],
    summary="[ADMIN] Erros por severidade",
    description="Retorna erros e avisos para diagnóstico do sistema"
)
async def get_errors_by_severity(
    severity: SeverityLevelEnum = Query(SeverityLevelEnum.WARNING),
    hours: int = Query(24, ge=1, le=720),
    limit: int = Query(50, le=500),
    current_user: dict = Depends(get_current_user),
) -> list[ApplicationLog]:
    """
    Get errors by severity level for system diagnostics.
    
    Returns errors and warnings to help identify:
    - System performance issues
    - Error patterns
    - Problematic endpoints
    """
    
    if current_user.get("user_type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view error logs",
        )

    try:
        service = get_logging_service()
        return await service.get_errors_by_severity(severity, hours, limit)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving errors: {str(e)}"
        )


@router.get(
    "/user/{user_id}/audit-trail",
    response_model=LogResponse,
    summary="[ADMIN] Auditoria de usuário",
    description="Retorna histórico completo de um usuário específico (apenas admin)"
)
async def get_user_audit_trail(
    user_id: UUID,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
) -> LogResponse:
    """
    Get complete audit trail for a specific user (admin only).
    
    Returns all actions performed by the user for auditing purposes.
    """
    
    if current_user.get("user_type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view other users' logs",
        )

    try:
        service = get_logging_service()
        return await service.get_user_audit_trail(user_id, limit, offset)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user logs: {str(e)}"
        )
