"""
Pydantic schemas for Sample Status History tracking
Handles request/response models for status transitions and history retrieval
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class SampleStatusHistoryRecord(BaseModel):
    """
    Response schema for a single status history record
    Represents one status transition event
    """
    id: int
    sample_id: str = Field(..., description="UUID of the sample")
    old_status: Optional[Literal['Submitted', 'Revisions', 'Review', 'Approved']] = Field(
        None, 
        description="Previous status (NULL for initial submission)"
    )
    new_status: Literal['Submitted', 'Revisions', 'Review', 'Approved'] = Field(
        ..., 
        description="New status assigned"
    )
    changed_by_user_id: Optional[str] = None
    changed_by_name: Optional[str] = Field(None, description="Name of user who made the change")
    changed_by_email: Optional[str] = Field(None, description="Email of user who made the change")
    changed_by_role: Optional[str] = Field(None, description="Role: 'admin' or 'pesquisador'")
    comment: Optional[str] = Field(None, description="Optional explanation for the change")
    is_system_action: bool = Field(False, description="TRUE if system-generated (e.g., initial submission)")
    created_at: datetime = Field(..., description="When this status change occurred")

    model_config = {"from_attributes": True}


class UpdateSampleStatusRequest(BaseModel):
    """
    Request schema for updating sample status
    Used by admins to change sample status
    """
    new_status: Literal['Submitted', 'Revisions', 'Review', 'Approved'] = Field(
        ..., 
        description="New status to assign"
    )
    comment: Optional[str] = Field(
        None, 
        max_length=500,
        description="Optional explanation (recommended for 'Revisions')"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "new_status": "Review",
                "comment": "Sample ready for peer review"
            }
        }
    }


class UpdateSampleStatusResponse(BaseModel):
    """
    Response schema for status update operation
    Confirms the change and includes the new history record
    """
    success: bool
    message: str
    sample_id: str
    old_status: Literal['Submitted', 'Revisions', 'Review', 'Approved']
    new_status: Literal['Submitted', 'Revisions', 'Review', 'Approved']
    history_record: SampleStatusHistoryRecord


class SampleStatusHistoryResponse(BaseModel):
    """
    Response schema for complete status history of a sample
    Returns all status transitions in chronological order
    """
    sample_id: str = Field(..., description="UUID of the sample")
    current_status: Literal['Submitted', 'Revisions', 'Review', 'Approved'] = Field(
        ..., 
        description="Current status of the sample"
    )
    total_transitions: int = Field(..., description="Number of status changes made")
    history: list[SampleStatusHistoryRecord] = Field(
        ..., 
        description="All status transitions in chronological order (oldest first)"
    )
    first_submitted_at: Optional[datetime] = Field(None, description="When sample was first submitted")
    last_changed_at: Optional[datetime] = Field(None, description="When last status change occurred")


class StatusTransitionStats(BaseModel):
    """
    Statistics about status transitions
    Used for analytics and reporting
    """
    from_status: Optional[Literal['Submitted', 'Revisions', 'Review', 'Approved']]
    to_status: Literal['Submitted', 'Revisions', 'Review', 'Approved']
    count: int = Field(..., description="Number of times this transition occurred")
    average_duration_hours: Optional[float] = Field(None, description="Average time spent in from_status before transition")


class SampleStatusSummary(BaseModel):
    """
    Quick summary of sample status for listing views
    """
    sample_id: str
    current_status: Literal['Submitted', 'Revisions', 'Review', 'Approved']
    status_since: datetime = Field(..., description="When current status was assigned")
    days_in_current_status: int = Field(..., description="How many days in current status")
    total_transitions: int = Field(0, description="Total number of status changes")
    last_comment: Optional[str] = Field(None, description="Most recent status change comment")


class BulkStatusUpdateRequest(BaseModel):
    """
    Request schema for bulk status updates (admin only)
    """
    sample_ids: list[str] = Field(..., min_items=1, description="List of sample IDs to update")
    new_status: Literal['Submitted', 'Revisions', 'Review', 'Approved'] = Field(
        ..., 
        description="New status for all samples"
    )
    comment: Optional[str] = Field(
        None, 
        max_length=500,
        description="Comment to apply to all samples"
    )


class BulkStatusUpdateResponse(BaseModel):
    """
    Response schema for bulk status updates
    """
    success: bool
    message: str
    updated_count: int = Field(..., description="Number of samples successfully updated")
    failed_count: int = Field(..., description="Number of samples that failed to update")
    failed_samples: list[dict] = Field(default_factory=list, description="Details of failed updates")
