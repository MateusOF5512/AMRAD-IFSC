"""
Centralized logging service for application audit trail and APM
"""

import json
import logging
from typing import Optional, Any, Dict, List
from datetime import datetime, timedelta
from uuid import UUID
import asyncio
from functools import lru_cache

from supabase import Client
from app.database.supabase import get_supabase_client
from app.schemas.logging import (
    LogCreate,
    ActionCategoryEnum,
    SeverityLevelEnum,
    UserTypeEnum,
    LogFilter,
    LogResponse,
    ApplicationLog,
)

# Configure logger
logger = logging.getLogger(__name__)


class LoggingService:
    """
    Centralized service for managing application logs.
    Handles data validation, async logging, and querying.
    """
    
    TABLE_NAME = "application_logs"
    
    def __init__(self):
        self.db: Client = get_supabase_client()
        self._batch_logs: List[LogCreate] = []
        self._batch_size = 50
        self._flush_interval = 5  # seconds
        
    async def log_event(
        self,
        action_category: ActionCategoryEnum,
        action_type: str,
        user_id: Optional[UUID] = None,
        user_name: Optional[str] = None,
        user_email: Optional[str] = None,
        user_type: Optional[UserTypeEnum] = None,
        entity_name: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        old_status: Optional[str] = None,
        new_status: Optional[str] = None,
        old_data: Optional[Dict[str, Any]] = None,
        new_data: Optional[Dict[str, Any]] = None,
        endpoint: Optional[str] = None,
        http_method: Optional[str] = None,
        http_status: Optional[int] = None,
        duration_ms: Optional[int] = None,
        severity_level: SeverityLevelEnum = SeverityLevelEnum.INFO,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        description: Optional[str] = None,
    ) -> Optional[ApplicationLog]:
        """
        Log an event to the application_logs table.
        
        This is the main method to record all application events.
        
        Args:
            action_category: Category of the action (AUTH, EXPERIMENT_MANAGEMENT, etc)
            action_type: Specific type of action (CREATE_SAMPLE, UPDATE_SAMPLE_STATUS, etc)
            user_id: UUID of the user performing the action
            user_name: Name of the user
            user_email: Email of the user
            user_type: Type of user (pesquisador or admin)
            entity_name: Name of the entity affected (samples, researchers, etc)
            entity_id: UUID of the entity affected
            old_status: Previous status (for status changes)
            new_status: New status (for status changes)
            old_data: Previous data snapshot (for updates)
            new_data: New data snapshot (for updates)
            endpoint: API endpoint that was called
            http_method: HTTP method used
            http_status: HTTP response status code
            duration_ms: Request duration in milliseconds
            severity_level: Severity of the event (INFO, WARNING, CRITICAL)
            session_id: Session identifier
            ip_address: IP address of the request
            user_agent: User agent string
            description: Human-readable description of the event
        
        Returns:
            ApplicationLog if successful, None on error
        """
        try:
            # Determine severity for admin actions
            if user_type == UserTypeEnum.ADMIN:
                if action_type == "DELETE":
                    severity_level = SeverityLevelEnum.CRITICAL
                elif action_category == ActionCategoryEnum.ADMIN_ACTION:
                    severity_level = SeverityLevelEnum.WARNING
            
            # Auto-escalate severity for slow requests
            if duration_ms and duration_ms > 2000:
                severity_level = SeverityLevelEnum.WARNING
            
            # Auto-escalate severity for errors
            if http_status and http_status >= 500:
                severity_level = SeverityLevelEnum.CRITICAL
            
            log_data = {
                "user_id": str(user_id) if user_id else None,
                "user_name": user_name,
                "user_email": user_email,
                "user_type": user_type.value if user_type else None,
                "action_category": action_category.value,
                "action_type": action_type,
                "entity_name": entity_name,
                "entity_id": str(entity_id) if entity_id else None,
                "old_status": old_status,
                "new_status": new_status,
                "old_data": old_data,
                "new_data": new_data,
                "endpoint": endpoint,
                "http_method": http_method,
                "http_status": http_status,
                "duration_ms": duration_ms,
                "severity_level": severity_level.value,
                "session_id": session_id,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "description": description,
            }
            
            # Remove None values to allow defaults
            log_data = {k: v for k, v in log_data.items() if v is not None}
            
            # Skip logging if this is a system event with no user context (noise reduction)
            # We still want to log user actions even without user_name (for status changes, entity operations)
            if (action_category == ActionCategoryEnum.SYSTEM_EVENT and 
                not user_id and 
                http_status and 
                http_status == 200):
                logger.debug(f"Skipping empty system event log: {action_type} to {endpoint}")
                return None
            
            # Insert to database
            response = self.db.table(self.TABLE_NAME).insert(log_data).execute()
            
            if response.data:
                logger.info(
                    f"Log created: {action_category.value}::{action_type} "
                    f"[entity={entity_name}:{entity_id}]"
                )
                return ApplicationLog(**response.data[0])
            else:
                logger.error(f"Failed to insert log: {response}")
                return None
                
        except Exception as e:
            logger.error(f"Error logging event: {str(e)}", exc_info=True)
            return None
    
    async def query_logs(self, filters: LogFilter) -> LogResponse:
        """
        Query logs with flexible filtering.
        
        Args:
            filters: LogFilter object with query parameters
        
        Returns:
            LogResponse with total count and list of logs
        """
        try:
            query = self.db.table(self.TABLE_NAME).select("*")
            
            # Apply filters
            if filters.user_id:
                query = query.eq("user_id", str(filters.user_id))
            
            if filters.entity_id:
                query = query.eq("entity_id", str(filters.entity_id))
            
            if filters.entity_name:
                query = query.eq("entity_name", filters.entity_name)
            
            if filters.action_category:
                query = query.eq("action_category", filters.action_category.value)
            
            if filters.severity_level:
                query = query.eq("severity_level", filters.severity_level.value)
            
            if filters.start_date:
                query = query.gte("created_at", filters.start_date.isoformat())
            
            if filters.end_date:
                query = query.lte("created_at", filters.end_date.isoformat())
            
            # Get total count before pagination
            count_response = self.db.table(self.TABLE_NAME).select(
                "count", count="exact"
            )
            
            if filters.user_id:
                count_response = count_response.eq("user_id", str(filters.user_id))
            if filters.entity_id:
                count_response = count_response.eq("entity_id", str(filters.entity_id))
            if filters.entity_name:
                count_response = count_response.eq("entity_name", filters.entity_name)
            if filters.action_category:
                count_response = count_response.eq("action_category", filters.action_category.value)
            if filters.severity_level:
                count_response = count_response.eq("severity_level", filters.severity_level.value)
            if filters.start_date:
                count_response = count_response.gte("created_at", filters.start_date.isoformat())
            if filters.end_date:
                count_response = count_response.lte("created_at", filters.end_date.isoformat())
            
            total = count_response.execute().count or 0
            
            # Apply pagination and sorting
            response = (
                query
                .order("created_at", desc=True)
                .range(filters.offset, filters.offset + filters.limit - 1)
                .execute()
            )
            
            logs = [ApplicationLog(**log) for log in response.data]
            
            return LogResponse(total=total, logs=logs)
            
        except Exception as e:
            logger.error(f"Error querying logs: {str(e)}", exc_info=True)
            return LogResponse(total=0, logs=[])
    
    async def get_user_audit_trail(
        self,
        user_id: UUID,
        limit: int = 100,
        offset: int = 0,
    ) -> LogResponse:
        """
        Get complete audit trail for a specific user.
        
        Args:
            user_id: User UUID to query
            limit: Maximum number of logs to return
            offset: Pagination offset
        
        Returns:
            LogResponse with user's logs
        """
        filters = LogFilter(
            user_id=user_id,
            limit=limit,
            offset=offset,
        )
        return await self.query_logs(filters)
    
    async def get_sample_audit_trail(
        self,
        sample_id: UUID,
        limit: int = 100,
        offset: int = 0,
    ) -> LogResponse:
        """
        Get complete audit trail for a specific sample.
        
        Args:
            sample_id: Sample UUID to query
            limit: Maximum number of logs to return
            offset: Pagination offset
        
        Returns:
            LogResponse with sample's logs (all related changes)
        """
        filters = LogFilter(
            entity_id=sample_id,
            entity_name="samples",
            limit=limit,
            offset=offset,
        )
        return await self.query_logs(filters)
    
    async def get_status_change_history(
        self,
        sample_id: UUID,
    ) -> List[ApplicationLog]:
        """
        Get status change history for a specific sample.
        
        Args:
            sample_id: Sample UUID to query
        
        Returns:
            List of status change logs ordered by date
        """
        try:
            response = (
                self.db.table(self.TABLE_NAME)
                .select("*")
                .eq("entity_id", str(sample_id))
                .eq("entity_name", "samples")
                .eq("action_category", ActionCategoryEnum.STATUS_CHANGE.value)
                .order("created_at", desc=False)
                .execute()
            )
            
            return [ApplicationLog(**log) for log in response.data]
            
        except Exception as e:
            logger.error(f"Error getting status change history: {str(e)}", exc_info=True)
            return []
    
    async def get_recent_admin_actions(
        self,
        hours: int = 24,
        limit: int = 100,
    ) -> List[ApplicationLog]:
        """
        Get recent admin actions for monitoring.
        
        Args:
            hours: Number of hours to look back
            limit: Maximum number of logs to return
        
        Returns:
            List of recent admin action logs
        """
        try:
            start_date = datetime.utcnow() - timedelta(hours=hours)
            
            response = (
                self.db.table(self.TABLE_NAME)
                .select("*")
                .eq("action_category", ActionCategoryEnum.ADMIN_ACTION.value)
                .gte("created_at", start_date.isoformat())
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            
            return [ApplicationLog(**log) for log in response.data]
            
        except Exception as e:
            logger.error(f"Error getting recent admin actions: {str(e)}", exc_info=True)
            return []
    
    async def get_errors_by_severity(
        self,
        severity: SeverityLevelEnum,
        hours: int = 24,
        limit: int = 100,
    ) -> List[ApplicationLog]:
        """
        Get errors by severity level for monitoring.
        
        Args:
            severity: Severity level to filter by
            hours: Number of hours to look back
            limit: Maximum number of logs to return
        
        Returns:
            List of error logs
        """
        try:
            start_date = datetime.utcnow() - timedelta(hours=hours)
            
            response = (
                self.db.table(self.TABLE_NAME)
                .select("*")
                .eq("severity_level", severity.value)
                .gte("created_at", start_date.isoformat())
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            
            return [ApplicationLog(**log) for log in response.data]
            
        except Exception as e:
            logger.error(f"Error getting errors by severity: {str(e)}", exc_info=True)
            return []


# Singleton instance
@lru_cache(maxsize=1)
def get_logging_service() -> LoggingService:
    """Get the logging service singleton"""
    return LoggingService()
