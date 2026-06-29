"""
Helper functions for logging critical events across the application
"""

from typing import Optional, Any, Dict
from uuid import UUID
from fastapi import Request

from app.core.logging_service import get_logging_service
from app.schemas.logging import (
    ActionCategoryEnum,
    SeverityLevelEnum,
    UserTypeEnum,
)


async def log_user_creation(
    user_id: UUID,
    user_email: str,
    user_name: str,
    created_by_id: Optional[UUID] = None,
    created_by_type: Optional[UserTypeEnum] = None,
) -> None:
    """Log user creation event"""
    service = get_logging_service()
    
    # Determine if this is an admin action
    action_category = (
        ActionCategoryEnum.ADMIN_ACTION
        if created_by_type == UserTypeEnum.ADMIN
        else ActionCategoryEnum.USER_MANAGEMENT
    )
    
    await service.log_event(
        action_category=action_category,
        action_type="CREATE_USER",
        user_id=created_by_id,
        user_type=created_by_type,
        entity_name="researchers",
        entity_id=user_id,
        new_data={"user_id": str(user_id), "email": user_email, "name": user_name},
        description="Novo pesquisador cadastrado",
        severity_level=SeverityLevelEnum.INFO,
    )


async def log_sample_creation(
    sample_id: UUID,
    user_id: UUID,
    user_email: str,
    user_type: UserTypeEnum,
    sample_data: Dict[str, Any],
) -> None:
    """Log sample (experiment) creation event"""
    service = get_logging_service()
    
    await service.log_event(
        action_category=ActionCategoryEnum.EXPERIMENT_MANAGEMENT,
        action_type="CREATE_SAMPLE",
        user_id=user_id,
        user_email=user_email,
        user_type=user_type,
        entity_name="samples",
        entity_id=sample_id,
        new_status="Submitted",
        new_data=sample_data,
        description="Novo experimento (amostra) cadastrado",
        severity_level=SeverityLevelEnum.INFO,
    )


async def log_sample_status_change(
    sample_id: UUID,
    user_id: UUID,
    user_email: str,
    user_type: UserTypeEnum,
    old_status: str,
    new_status: str,
    reason: Optional[str] = None,
) -> None:
    """Log sample status change event - CRITICAL"""
    service = get_logging_service()
    
    # Determine severity
    severity = SeverityLevelEnum.INFO
    if user_type == UserTypeEnum.ADMIN:
        severity = SeverityLevelEnum.WARNING
    
    description = f"Status alterado de {old_status} para {new_status}"
    if reason:
        description += f": {reason}"
    
    await service.log_event(
        action_category=ActionCategoryEnum.STATUS_CHANGE,
        action_type="UPDATE_SAMPLE_STATUS",
        user_id=user_id,
        user_email=user_email,
        user_type=user_type,
        entity_name="samples",
        entity_id=sample_id,
        old_status=old_status,
        new_status=new_status,
        description=description,
        severity_level=severity,
    )


async def log_sample_data_update(
    sample_id: UUID,
    user_id: UUID,
    user_email: str,
    user_type: UserTypeEnum,
    entity_table: str,  # "mechanical_properties", "beam_qualities", etc
    old_data: Optional[Dict[str, Any]] = None,
    new_data: Optional[Dict[str, Any]] = None,
) -> None:
    """Log sample data update event"""
    service = get_logging_service()
    
    await service.log_event(
        action_category=ActionCategoryEnum.DATA_UPDATE,
        action_type="UPDATE_SAMPLE_DATA",
        user_id=user_id,
        user_email=user_email,
        user_type=user_type,
        entity_name=entity_table,
        entity_id=sample_id,
        old_data=old_data,
        new_data=new_data,
        description=f"Atualização de dados em {entity_table}",
        severity_level=SeverityLevelEnum.INFO,
    )


async def log_data_deletion(
    user_id: UUID,
    user_email: str,
    user_type: UserTypeEnum,
    entity_name: str,
    entity_id: UUID,
    deleted_data: Optional[Dict[str, Any]] = None,
) -> None:
    """Log data deletion event - CRITICAL"""
    service = get_logging_service()
    
    # Admin deletions are CRITICAL
    severity = (
        SeverityLevelEnum.CRITICAL
        if user_type == UserTypeEnum.ADMIN
        else SeverityLevelEnum.WARNING
    )
    
    await service.log_event(
        action_category=ActionCategoryEnum.DATA_DELETE,
        action_type="DELETE_DATA",
        user_id=user_id,
        user_email=user_email,
        user_type=user_type,
        entity_name=entity_name,
        entity_id=entity_id,
        old_data=deleted_data,
        description=f"Exclusão de dados: {entity_name} {entity_id}",
        severity_level=severity,
    )


async def log_admin_action(
    user_id: UUID,
    user_email: str,
    action_type: str,
    entity_name: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    description: Optional[str] = None,
    severity: SeverityLevelEnum = SeverityLevelEnum.WARNING,
) -> None:
    """Log admin-specific action"""
    service = get_logging_service()
    
    await service.log_event(
        action_category=ActionCategoryEnum.ADMIN_ACTION,
        action_type=action_type,
        user_id=user_id,
        user_email=user_email,
        user_type=UserTypeEnum.ADMIN,
        entity_name=entity_name,
        entity_id=entity_id,
        description=description,
        severity_level=severity,
    )


async def log_auth_event(
    user_id: Optional[UUID] = None,
    user_email: Optional[str] = None,
    action_type: str = "LOGIN",
    description: Optional[str] = None,
    request: Optional[Request] = None,
) -> None:
    """Log authentication event"""
    service = get_logging_service()
    
    ip_address = None
    user_agent = None
    
    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "")
    
    await service.log_event(
        action_category=ActionCategoryEnum.AUTH,
        action_type=action_type,
        user_id=user_id,
        user_email=user_email,
        ip_address=ip_address,
        user_agent=user_agent,
        description=description or f"Evento de autenticação: {action_type}",
        severity_level=SeverityLevelEnum.INFO,
    )


async def log_error_event(
    action_type: str,
    description: str,
    user_id: Optional[UUID] = None,
    user_email: Optional[str] = None,
    entity_name: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    severity: SeverityLevelEnum = SeverityLevelEnum.WARNING,
) -> None:
    """Log error event"""
    service = get_logging_service()
    
    await service.log_event(
        action_category=ActionCategoryEnum.ERROR,
        action_type=action_type,
        user_id=user_id,
        user_email=user_email,
        entity_name=entity_name,
        entity_id=entity_id,
        description=description,
        severity_level=severity,
    )
