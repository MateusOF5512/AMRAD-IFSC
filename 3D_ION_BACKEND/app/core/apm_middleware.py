"""
APM (Application Performance Monitor) Middleware
Automatically captures request/response metrics and logs performance data
"""

import time
import logging
import json
import uuid
from typing import Optional, Callable
from datetime import datetime

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp, Receive, Receive, Scope, Send

from app.core.logging_service import get_logging_service
from app.schemas.logging import ActionCategoryEnum, SeverityLevelEnum, UserTypeEnum
from app.core.security import verify_jwt_token
from app.database.supabase import get_supabase_client

logger = logging.getLogger(__name__)


class APMMiddleware(BaseHTTPMiddleware):
    """
    Middleware for Application Performance Monitoring (APM).
    
    Automatically logs all API requests with:
    - Endpoint
    - HTTP method and status
    - Request duration
    - User information
    - IP address and user agent
    
    Severity is automatically escalated for:
    - Slow requests (> 2000ms)
    - Server errors (5xx)
    """
    
    # Endpoints to exclude from logging (to avoid noise)
    EXCLUDED_PATHS = {
        "/docs",
        "/redoc",
        "/openapi.json",
        "/",
        "/test",
        "/health",
    }
    
    # HTTP methods to skip (CORS preflight requests)
    SKIP_METHODS = {"OPTIONS"}
    
    async def _get_user_name(self, user_id: str) -> Optional[str]:
        """Fetch user name from database"""
        try:
            db = get_supabase_client()
            response = db.table("researchers").select("name").eq("id", user_id).execute()
            if response.data:
                return response.data[0].get("name")
        except Exception as e:
            logger.debug(f"Could not fetch user name: {str(e)}")
        return None
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and log APM data"""
        
        # Skip excluded paths
        if request.url.path in self.EXCLUDED_PATHS:
            return await call_next(request)
        
        # Skip CORS preflight requests (OPTIONS) - they don't add value to logs
        if request.method in self.SKIP_METHODS:
            return await call_next(request)
        
        # Extract request context
        start_time = time.time()
        session_id = str(uuid.uuid4())
        
        try:
            # Get user information from token if available
            user_id = None
            user_email = None
            user_name = None
            user_type = None
            
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                try:
                    payload = verify_jwt_token(token)
                    user_id = payload.get("sub")
                    user_email = payload.get("email")
                    user_type = payload.get("user_type", "pesquisador")
                    
                    # Fetch user_name from database if we have user_id
                    if user_id:
                        user_name = await self._get_user_name(user_id)
                except Exception as e:
                    logger.debug(f"Could not verify token: {str(e)}")
            
            # Get IP address
            ip_address = request.client.host if request.client else None
            
            # Get user agent
            user_agent = request.headers.get("user-agent", "")
            
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Determine severity
            severity = SeverityLevelEnum.INFO
            
            # Escalate for slow requests
            if duration_ms > 2000:
                severity = SeverityLevelEnum.WARNING
                logger.warning(f"Slow request: {request.method} {request.url.path} ({duration_ms}ms)")
            
            # Escalate for errors
            if response.status_code >= 500:
                severity = SeverityLevelEnum.CRITICAL
                logger.error(f"Server error: {request.method} {request.url.path} ({response.status_code})")
            elif response.status_code >= 400:
                severity = SeverityLevelEnum.WARNING
                logger.warning(f"Client error: {request.method} {request.url.path} ({response.status_code})")
            
            # Log to application_logs (non-blocking)
            try:
                logging_service = get_logging_service()
                await logging_service.log_event(
                    action_category=ActionCategoryEnum.SYSTEM_EVENT,
                    action_type="API_REQUEST",
                    user_id=user_id,
                    user_name=user_name,
                    user_email=user_email,
                    user_type=UserTypeEnum(user_type) if user_type else None,
                    endpoint=request.url.path,
                    http_method=request.method,
                    http_status=response.status_code,
                    duration_ms=duration_ms,
                    severity_level=severity,
                    session_id=session_id,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    description=f"{request.method} {request.url.path} - {response.status_code} ({duration_ms}ms)",
                )
            except Exception as e:
                logger.error(f"Failed to log APM data: {str(e)}")
            
            # Add custom headers for tracing
            response.headers["X-Request-ID"] = session_id
            response.headers["X-Response-Time"] = f"{duration_ms}ms"
            
            return response
            
        except Exception as e:
            logger.error(f"APM middleware error: {str(e)}", exc_info=True)
            raise


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware to attach context information to requests.
    This allows handlers to access user info and session ID.
    """
    
    async def _get_user_name(self, user_id: str) -> Optional[str]:
        """Fetch user name from database"""
        try:
            db = get_supabase_client()
            response = db.table("researchers").select("name").eq("id", user_id).execute()
            if response.data:
                return response.data[0].get("name")
        except Exception as e:
            logger.debug(f"Could not fetch user name: {str(e)}")
        return None
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Attach context to request"""
        
        # Create session ID if not present
        if not hasattr(request.state, "session_id"):
            request.state.session_id = str(uuid.uuid4())
        
        # Extract user information
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = verify_jwt_token(token)
                request.state.user_id = payload.get("sub")
                request.state.user_email = payload.get("email")
                request.state.user_type = payload.get("user_type", "pesquisador")
                
                # Fetch user_name from database if we have user_id
                if request.state.user_id:
                    request.state.user_name = await self._get_user_name(request.state.user_id)
            except Exception:
                pass
        
        # IP address
        request.state.ip_address = request.client.host if request.client else None
        
        # User agent
        request.state.user_agent = request.headers.get("user-agent", "")
        
        return await call_next(request)
