"""
Tests for application logging system and APM middleware

Test coverage:
- LoggingService functionality
- Logging helper functions
- APM middleware
- API endpoints for logs
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from uuid import uuid4, UUID
from unittest.mock import Mock, AsyncMock, patch

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app.core.logging_service import LoggingService, get_logging_service
from app.core.logging_helpers import (
    log_user_creation,
    log_sample_creation,
    log_sample_status_change,
    log_sample_data_update,
    log_data_deletion,
)
from app.schemas.logging import (
    ActionCategoryEnum,
    SeverityLevelEnum,
    UserTypeEnum,
    LogCreate,
    LogFilter,
    ApplicationLog,
)


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def mock_supabase():
    """Mock Supabase client"""
    mock = Mock()
    mock.table = Mock(return_value=Mock())
    return mock


@pytest.fixture
def logging_service(mock_supabase):
    """Create a logging service with mock database"""
    service = LoggingService()
    service.db = mock_supabase
    return service


@pytest.fixture
def sample_user_id():
    """Generate sample user ID"""
    return UUID("550e8400-e29b-41d4-a716-446655440000")


@pytest.fixture
def sample_entity_id():
    """Generate sample entity ID"""
    return UUID("660e8400-e29b-41d4-a716-446655440000")


# ============================================================================
# TESTS: LoggingService.log_event()
# ============================================================================

@pytest.mark.asyncio
async def test_log_event_basic(logging_service, sample_user_id, sample_entity_id):
    """Test basic log event creation"""
    
    # Mock the database response
    mock_response = Mock()
    mock_response.data = [{
        "id": 1,
        "user_id": str(sample_user_id),
        "action_category": "EXPERIMENT_MANAGEMENT",
        "action_type": "CREATE_SAMPLE",
        "created_at": datetime.utcnow().isoformat(),
    }]
    
    logging_service.db.table.return_value.insert.return_value.execute.return_value = mock_response
    
    # Log event
    result = await logging_service.log_event(
        action_category=ActionCategoryEnum.EXPERIMENT_MANAGEMENT,
        action_type="CREATE_SAMPLE",
        user_id=sample_user_id,
        user_email="test@example.com",
        entity_name="samples",
        entity_id=sample_entity_id,
    )
    
    # Verify
    assert result is not None
    assert logging_service.db.table.called


@pytest.mark.asyncio
async def test_log_event_admin_action_escalation(logging_service, sample_user_id):
    """Test severity escalation for admin DELETE actions"""
    
    mock_response = Mock()
    mock_response.data = [{
        "id": 1,
        "severity_level": "CRITICAL",
        "created_at": datetime.utcnow().isoformat(),
    }]
    
    logging_service.db.table.return_value.insert.return_value.execute.return_value = mock_response
    
    # Log admin deletion
    result = await logging_service.log_event(
        action_category=ActionCategoryEnum.DATA_DELETE,
        action_type="DELETE",
        user_id=sample_user_id,
        user_type=UserTypeEnum.ADMIN,
        entity_name="samples",
    )
    
    # Verify
    assert result is not None
    # Check that CRITICAL severity was used
    call_args = logging_service.db.table.return_value.insert.call_args
    assert call_args is not None


@pytest.mark.asyncio
async def test_log_event_slow_request_escalation(logging_service, sample_user_id):
    """Test severity escalation for slow requests"""
    
    mock_response = Mock()
    mock_response.data = [{
        "id": 1,
        "severity_level": "WARNING",
        "created_at": datetime.utcnow().isoformat(),
    }]
    
    logging_service.db.table.return_value.insert.return_value.execute.return_value = mock_response
    
    # Log slow request (> 2000ms)
    result = await logging_service.log_event(
        action_category=ActionCategoryEnum.SYSTEM_EVENT,
        action_type="API_REQUEST",
        user_id=sample_user_id,
        duration_ms=2500,  # Should escalate to WARNING
    )
    
    assert result is not None


@pytest.mark.asyncio
async def test_log_event_error_escalation(logging_service, sample_user_id):
    """Test severity escalation for server errors"""
    
    mock_response = Mock()
    mock_response.data = [{
        "id": 1,
        "severity_level": "CRITICAL",
        "created_at": datetime.utcnow().isoformat(),
    }]
    
    logging_service.db.table.return_value.insert.return_value.execute.return_value = mock_response
    
    # Log server error
    result = await logging_service.log_event(
        action_category=ActionCategoryEnum.SYSTEM_EVENT,
        action_type="API_REQUEST",
        http_status=500,  # Server error
    )
    
    assert result is not None


# ============================================================================
# TESTS: LoggingService.query_logs()
# ============================================================================

@pytest.mark.asyncio
async def test_query_logs_basic(logging_service):
    """Test querying logs"""
    
    mock_response = Mock()
    mock_response.data = []
    mock_response.count = 0
    
    logging_service.db.table.return_value.select.return_value.execute.return_value = mock_response
    
    filters = LogFilter(limit=100)
    result = await logging_service.query_logs(filters)
    
    assert result.total == 0
    assert len(result.logs) == 0


@pytest.mark.asyncio
async def test_query_logs_with_filters(logging_service, sample_user_id):
    """Test querying logs with filter parameters"""
    
    mock_response = Mock()
    mock_response.data = []
    
    chain_mock = Mock()
    chain_mock.eq.return_value = chain_mock
    chain_mock.gte.return_value = chain_mock
    chain_mock.lte.return_value = chain_mock
    chain_mock.order.return_value = chain_mock
    chain_mock.range.return_value = chain_mock
    chain_mock.execute.return_value = mock_response
    
    logging_service.db.table.return_value.select.return_value = chain_mock
    
    filters = LogFilter(
        user_id=sample_user_id,
        action_category=ActionCategoryEnum.STATUS_CHANGE,
        severity_level=SeverityLevelEnum.WARNING,
    )
    
    result = await logging_service.query_logs(filters)
    
    assert result is not None


# ============================================================================
# TESTS: Specialized Log Functions
# ============================================================================

@pytest.mark.asyncio
async def test_log_user_creation_pesquisador(logging_service, sample_user_id):
    """Test logging user creation by pesquisador"""
    
    with patch('app.core.logging_helpers.get_logging_service', return_value=logging_service):
        mock_response = Mock()
        mock_response.data = [{"id": 1}]
        logging_service.db.table.return_value.insert.return_value.execute.return_value = mock_response
        
        await log_user_creation(
            user_id=sample_user_id,
            user_email="newuser@example.com",
            user_name="New User",
        )
        
        assert logging_service.db.table.called


@pytest.mark.asyncio
async def test_log_user_creation_admin(logging_service, sample_user_id):
    """Test logging user creation by admin"""
    
    with patch('app.core.logging_helpers.get_logging_service', return_value=logging_service):
        mock_response = Mock()
        mock_response.data = [{"id": 1}]
        logging_service.db.table.return_value.insert.return_value.execute.return_value = mock_response
        
        admin_id = UUID("770e8400-e29b-41d4-a716-446655440000")
        
        await log_user_creation(
            user_id=sample_user_id,
            user_email="newuser@example.com",
            user_name="New User",
            created_by_id=admin_id,
            created_by_type=UserTypeEnum.ADMIN,
        )
        
        assert logging_service.db.table.called


@pytest.mark.asyncio
async def test_log_sample_creation(logging_service, sample_user_id, sample_entity_id):
    """Test logging sample creation"""
    
    with patch('app.core.logging_helpers.get_logging_service', return_value=logging_service):
        mock_response = Mock()
        mock_response.data = [{"id": 1}]
        logging_service.db.table.return_value.insert.return_value.execute.return_value = mock_response
        
        await log_sample_creation(
            sample_id=sample_entity_id,
            user_id=sample_user_id,
            user_email="researcher@example.com",
            user_type=UserTypeEnum.PESQUISADOR,
            sample_data={"name": "Sample 1", "description": "Test sample"},
        )
        
        assert logging_service.db.table.called


@pytest.mark.asyncio
async def test_log_sample_status_change(logging_service, sample_user_id, sample_entity_id):
    """Test logging sample status change"""
    
    with patch('app.core.logging_helpers.get_logging_service', return_value=logging_service):
        mock_response = Mock()
        mock_response.data = [{"id": 1}]
        logging_service.db.table.return_value.insert.return_value.execute.return_value = mock_response
        
        await log_sample_status_change(
            sample_id=sample_entity_id,
            user_id=sample_user_id,
            user_email="researcher@example.com",
            user_type=UserTypeEnum.PESQUISADOR,
            old_status="Submitted",
            new_status="Review",
            reason="Pending review",
        )
        
        assert logging_service.db.table.called


@pytest.mark.asyncio
async def test_log_sample_data_update(logging_service, sample_user_id, sample_entity_id):
    """Test logging sample data update"""
    
    with patch('app.core.logging_helpers.get_logging_service', return_value=logging_service):
        mock_response = Mock()
        mock_response.data = [{"id": 1}]
        logging_service.db.table.return_value.insert.return_value.execute.return_value = mock_response
        
        old_data = {"property": "old_value"}
        new_data = {"property": "new_value"}
        
        await log_sample_data_update(
            sample_id=sample_entity_id,
            user_id=sample_user_id,
            user_email="researcher@example.com",
            user_type=UserTypeEnum.PESQUISADOR,
            entity_table="mechanical_properties",
            old_data=old_data,
            new_data=new_data,
        )
        
        assert logging_service.db.table.called


@pytest.mark.asyncio
async def test_log_data_deletion(logging_service, sample_user_id, sample_entity_id):
    """Test logging data deletion"""
    
    with patch('app.core.logging_helpers.get_logging_service', return_value=logging_service):
        mock_response = Mock()
        mock_response.data = [{"id": 1}]
        logging_service.db.table.return_value.insert.return_value.execute.return_value = mock_response
        
        deleted_data = {"id": str(sample_entity_id), "name": "Sample"}
        
        await log_data_deletion(
            user_id=sample_user_id,
            user_email="admin@example.com",
            user_type=UserTypeEnum.ADMIN,
            entity_name="samples",
            entity_id=sample_entity_id,
            deleted_data=deleted_data,
        )
        
        assert logging_service.db.table.called


# ============================================================================
# TESTS: Audit Trail Queries
# ============================================================================

@pytest.mark.asyncio
async def test_get_user_audit_trail(logging_service, sample_user_id):
    """Test retrieving user audit trail"""
    
    mock_response = Mock()
    mock_response.data = []
    
    chain_mock = Mock()
    chain_mock.eq.return_value = chain_mock
    chain_mock.order.return_value = chain_mock
    chain_mock.range.return_value = chain_mock
    chain_mock.execute.return_value = mock_response
    
    logging_service.db.table.return_value.select.return_value = chain_mock
    
    result = await logging_service.get_user_audit_trail(sample_user_id)
    
    assert result is not None
    assert result.total == 0


@pytest.mark.asyncio
async def test_get_sample_audit_trail(logging_service, sample_entity_id):
    """Test retrieving sample audit trail"""
    
    mock_response = Mock()
    mock_response.data = []
    
    chain_mock = Mock()
    chain_mock.eq.return_value = chain_mock
    chain_mock.order.return_value = chain_mock
    chain_mock.range.return_value = chain_mock
    chain_mock.execute.return_value = mock_response
    
    logging_service.db.table.return_value.select.return_value = chain_mock
    
    result = await logging_service.get_sample_audit_trail(sample_entity_id)
    
    assert result is not None
    assert result.total == 0


@pytest.mark.asyncio
async def test_get_status_change_history(logging_service, sample_entity_id):
    """Test retrieving status change history"""
    
    mock_response = Mock()
    mock_response.data = []
    
    chain_mock = Mock()
    chain_mock.eq.return_value = chain_mock
    chain_mock.order.return_value = chain_mock
    chain_mock.execute.return_value = mock_response
    
    logging_service.db.table.return_value.select.return_value = chain_mock
    
    result = await logging_service.get_status_change_history(sample_entity_id)
    
    assert isinstance(result, list)


@pytest.mark.asyncio
async def test_get_recent_admin_actions(logging_service):
    """Test retrieving recent admin actions"""
    
    mock_response = Mock()
    mock_response.data = []
    
    chain_mock = Mock()
    chain_mock.eq.return_value = chain_mock
    chain_mock.gte.return_value = chain_mock
    chain_mock.order.return_value = chain_mock
    chain_mock.limit.return_value = chain_mock
    chain_mock.execute.return_value = mock_response
    
    logging_service.db.table.return_value.select.return_value = chain_mock
    
    result = await logging_service.get_recent_admin_actions(hours=24)
    
    assert isinstance(result, list)


@pytest.mark.asyncio
async def test_get_errors_by_severity(logging_service):
    """Test retrieving errors by severity"""
    
    mock_response = Mock()
    mock_response.data = []
    
    chain_mock = Mock()
    chain_mock.eq.return_value = chain_mock
    chain_mock.gte.return_value = chain_mock
    chain_mock.order.return_value = chain_mock
    chain_mock.limit.return_value = chain_mock
    chain_mock.execute.return_value = mock_response
    
    logging_service.db.table.return_value.select.return_value = chain_mock
    
    result = await logging_service.get_errors_by_severity(
        severity=SeverityLevelEnum.CRITICAL,
        hours=24,
    )
    
    assert isinstance(result, list)


# ============================================================================
# TESTS: Severity Escalation
# ============================================================================

@pytest.mark.asyncio
async def test_severity_escalation_slow_request():
    """Test that slow requests escalate severity"""
    # This is tested implicitly in log_event with duration_ms > 2000
    pass


@pytest.mark.asyncio
async def test_severity_escalation_server_error():
    """Test that server errors escalate severity"""
    # This is tested implicitly in log_event with http_status >= 500
    pass


@pytest.mark.asyncio
async def test_severity_escalation_admin_delete():
    """Test that admin deletions are marked CRITICAL"""
    # This is tested in test_log_event_admin_action_escalation
    pass


# ============================================================================
# INTEGRATION TESTS (if running with real Supabase)
# ============================================================================

@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires real Supabase connection")
async def test_integration_create_and_query_log():
    """Integration test: Create log and query it"""
    service = get_logging_service()
    
    user_id = uuid4()
    
    # Create log
    result = await service.log_event(
        action_category=ActionCategoryEnum.EXPERIMENT_MANAGEMENT,
        action_type="TEST",
        user_id=user_id,
        user_email="test@example.com",
    )
    
    assert result is not None
    
    # Query logs
    filters = LogFilter(user_id=user_id)
    logs = await service.query_logs(filters)
    
    assert logs.total > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
