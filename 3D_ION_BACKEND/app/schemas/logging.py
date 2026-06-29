"""
Pydantic schemas for application logging and APM
"""

from typing import Optional, Any, Dict
from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field
from ipaddress import IPv4Address, IPv6Address
from uuid import UUID


class ActionCategoryEnum(str, Enum):
    """Enum for action categories"""
    AUTH = "AUTH"
    USER_MANAGEMENT = "USER_MANAGEMENT"
    EXPERIMENT_MANAGEMENT = "EXPERIMENT_MANAGEMENT"
    STATUS_CHANGE = "STATUS_CHANGE"
    DATA_ENTRY = "DATA_ENTRY"
    DATA_UPDATE = "DATA_UPDATE"
    DATA_DELETE = "DATA_DELETE"
    VIEW = "VIEW"
    ADMIN_ACTION = "ADMIN_ACTION"
    SYSTEM_EVENT = "SYSTEM_EVENT"
    ERROR = "ERROR"
    NOTIFICATION = "NOTIFICATION"


class SeverityLevelEnum(str, Enum):
    """Enum for severity levels"""
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class UserTypeEnum(str, Enum):
    """User type enum"""
    PESQUISADOR = "pesquisador"
    ADMIN = "admin"


class LogCreate(BaseModel):
    """Schema for creating a log entry"""
    
    # User identification
    user_id: Optional[UUID] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_type: Optional[UserTypeEnum] = None
    
    # Action classification
    action_category: ActionCategoryEnum
    action_type: str
    
    # Entity affected
    entity_name: Optional[str] = None
    entity_id: Optional[UUID] = None
    
    # Status tracking
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    
    # Scientific snapshot
    old_data: Optional[Dict[str, Any]] = None
    new_data: Optional[Dict[str, Any]] = None
    
    # Technical monitoring
    endpoint: Optional[str] = None
    http_method: Optional[str] = None
    http_status: Optional[int] = None
    duration_ms: Optional[int] = None
    severity_level: SeverityLevelEnum = SeverityLevelEnum.INFO
    
    # Session context
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    # Description
    description: Optional[str] = None
    
    class Config:
        use_enum_values = True


class ApplicationLog(LogCreate):
    """Schema for application log (includes generated fields)"""
    
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
        use_enum_values = True


# ============================================================================
# SPECIALIZED LOG SCHEMAS FOR SPECIFIC ACTIONS
# ============================================================================

class UserCreationLog(LogCreate):
    """Log schema for user creation"""
    action_category: ActionCategoryEnum = ActionCategoryEnum.USER_MANAGEMENT
    action_type: str = "CREATE_USER"
    entity_name: str = "researchers"
    description: str = Field(default="Novo pesquisador cadastrado")
    severity_level: SeverityLevelEnum = SeverityLevelEnum.INFO


class SampleCreationLog(LogCreate):
    """Log schema for sample creation"""
    action_category: ActionCategoryEnum = ActionCategoryEnum.EXPERIMENT_MANAGEMENT
    action_type: str = "CREATE_SAMPLE"
    entity_name: str = "samples"
    new_status: str = "Submitted"
    severity_level: SeverityLevelEnum = SeverityLevelEnum.INFO


class SampleStatusChangeLog(LogCreate):
    """Log schema for sample status change"""
    action_category: ActionCategoryEnum = ActionCategoryEnum.STATUS_CHANGE
    action_type: str = "UPDATE_SAMPLE_STATUS"
    entity_name: str = "samples"
    severity_level: SeverityLevelEnum = SeverityLevelEnum.INFO


class SampleDataUpdateLog(LogCreate):
    """Log schema for sample data update"""
    action_category: ActionCategoryEnum = ActionCategoryEnum.DATA_UPDATE
    action_type: str = "UPDATE_SAMPLE_DATA"
    entity_name: str = "samples"
    severity_level: SeverityLevelEnum = SeverityLevelEnum.INFO


class AdminActionLog(LogCreate):
    """Log schema for admin actions"""
    action_category: ActionCategoryEnum = ActionCategoryEnum.ADMIN_ACTION
    severity_level: SeverityLevelEnum = SeverityLevelEnum.WARNING


class SystemEventLog(LogCreate):
    """Log schema for system events (APM)"""
    action_category: ActionCategoryEnum = ActionCategoryEnum.SYSTEM_EVENT
    severity_level: SeverityLevelEnum = SeverityLevelEnum.INFO


class ErrorLog(LogCreate):
    """Log schema for errors"""
    action_category: ActionCategoryEnum = ActionCategoryEnum.ERROR
    severity_level: SeverityLevelEnum = SeverityLevelEnum.WARNING


class NotificationLog(LogCreate):
    """Log schema for notifications"""
    action_category: ActionCategoryEnum = ActionCategoryEnum.NOTIFICATION
    action_type: str = "SAMPLE_STATUS_UPDATED"
    severity_level: SeverityLevelEnum = SeverityLevelEnum.INFO


# ============================================================================
# QUERY SCHEMAS
# ============================================================================

class LogFilter(BaseModel):
    """Schema for filtering logs"""
    user_id: Optional[UUID] = None
    entity_id: Optional[UUID] = None
    entity_name: Optional[str] = None
    action_category: Optional[ActionCategoryEnum] = None
    severity_level: Optional[SeverityLevelEnum] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = Field(default=100, le=1000)
    offset: int = Field(default=0, ge=0)


class LogResponse(BaseModel):
    """Response schema for retrieving logs"""
    total: int
    logs: list[ApplicationLog]
    
    class Config:
        from_attributes = True
