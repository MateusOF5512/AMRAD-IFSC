from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from supabase import Client
import logging

from app.core.security import get_current_user
from app.core.user_utils import get_user_full_name
from app.database.supabase import get_supabase_client
from app.schemas.sample import SampleCreate, SampleResponse
from app.schemas.sample_status_history import (
    SampleStatusHistoryResponse,
    UpdateSampleStatusRequest,
    UpdateSampleStatusResponse,
    SampleStatusSummary
)
from app.database.sample_status_history import get_status_history_manager


router = APIRouter(prefix="/samples", tags=["Samples"])
logger = logging.getLogger(__name__)


@router.post("/", response_model=SampleResponse, status_code=status.HTTP_201_CREATED)
async def create_sample(
    sample: SampleCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new sample and record initial submission in status history"""
    supabase: Client = get_supabase_client()
    history_manager = get_status_history_manager()
    
    try:
        import json
        # Serialize pattern_ids to JSON string if provided
        pattern_type_value = None
        if sample.pattern_ids and len(sample.pattern_ids) > 0:
            pattern_type_value = json.dumps(sample.pattern_ids)
        
        # Create the sample
        response = supabase.table("samples").insert({
            "researcher_id": current_user["user_id"],
            "material_id": sample.material_id,
            "machine_id": sample.machine_id,
            "shape_type": sample.shape_type,
            "roi_area_mm2": sample.roi_area_mm2,
            "dimension_a": sample.dimension_a,
            "dimension_b": sample.dimension_b,
            "regression_a": sample.regression_a,
            "regression_b": sample.regression_b,
            "regression_r_squared": sample.regression_r_squared,
            "pattern_type": pattern_type_value,
            "pattern_ids": sample.pattern_ids
        }).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create sample"
            )
        
        sample_data = response.data[0]
        sample_id = sample_data.get("id")
        
        # Record initial submission in status history
        try:
            # Get the researcher's full name from database
            researcher_id = current_user.get("user_id") or current_user.get("id")
            logger.info(f"[SAMPLES] Recording initial submission for sample {sample_id} from researcher {researcher_id}")
            
            researcher_name = await get_user_full_name(researcher_id)
            researcher_email = current_user.get("email", "unknown@example.com")
            
            logger.info(f"[SAMPLES] Researcher name: {researcher_name}, email: {researcher_email}")
            
            history_record = history_manager.record_initial_submission(
                sample_id=sample_id,
                researcher_id=researcher_id,
                researcher_name=researcher_name,
                researcher_email=researcher_email
            )
            
            logger.info(f"[SAMPLES] ✓ Successfully recorded initial status history for {sample_id}: {history_record}")
            
        except Exception as history_error:
            # Log the error with full traceback
            logger.error(f"[SAMPLES] ✗ Failed to record initial status history for {sample_id}: {str(history_error)}")
            import traceback
            logger.error(f"[SAMPLES] Traceback: {traceback.format_exc()}")
            # Don't fail the sample creation, but log it clearly
            logger.error(f"[SAMPLES] WARNING: Sample {sample_id} was created but status history record failed!")
        
        return sample_data
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.get("/", response_model=List[SampleResponse])
async def get_samples(
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
):
    """Get all samples for current user"""
    supabase: Client = get_supabase_client()
    
    try:
        response = supabase.table("samples") \
            .select("*") \
            .eq("researcher_id", current_user["user_id"]) \
            .order("created_at", desc=True) \
            .range(skip, skip + limit - 1) \
            .execute()
        
        return response.data or []
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.get("/researcher/status-history")
async def get_researcher_status_history(
    current_user: dict = Depends(get_current_user)
):
    """
    Get complete status history for all experiments created by the current researcher
    
    Returns:
    - List of status history records for experiments created by this researcher
    - Only shows changes for experiments where researcher_id matches current user
    - Sorted by creation date in descending order (newest first)
    """
    try:
        researcher_id = current_user.get("user_id") or current_user.get("id")
        logger.info(f"[ResearcherHistory] Fetching status history for researcher: {researcher_id}")
        
        supabase = get_supabase_client()
        
        # Step 1: Get all samples created by this researcher
        logger.info("[ResearcherHistory] Fetching samples for this researcher...")
        samples_response = supabase.table("samples") \
            .select("id") \
            .eq("researcher_id", researcher_id) \
            .execute()
        
        logger.info(f"[ResearcherHistory] Samples query returned: {len(samples_response.data or [])} samples")
        
        if not samples_response.data:
            logger.info(f"[ResearcherHistory] No samples found for researcher {researcher_id}")
            return {
                "success": True,
                "researcher_id": researcher_id,
                "total_samples": 0,
                "total_history_records": 0,
                "data": []
            }
        
        sample_ids = [s["id"] for s in samples_response.data]
        logger.info(f"[ResearcherHistory] Found {len(sample_ids)} samples for this researcher")
        logger.info(f"[ResearcherHistory] Sample IDs: {sample_ids[:3]}...") # Log first 3 for debugging
        
        # Step 2: Get status history for all these samples - order by newest first
        logger.info("[ResearcherHistory] Fetching status history for these samples...")
        
        # Fetch all status history, ordered by created_at descending
        response = supabase.table("sample_status_history") \
            .select("id, sample_id, old_status, new_status, changed_by_user_id, changed_by_name, changed_by_email, changed_by_role, comment, is_system_action, created_at") \
            .order("created_at", desc=True) \
            .execute()
        
        logger.info(f"[ResearcherHistory] Status history query returned: {len(response.data or [])} total records")
        
        # Filter to only include history for researcher's samples
        filtered_data = [
            record for record in (response.data or [])
            if record.get("sample_id") in sample_ids
        ]
        
        logger.info(f"[ResearcherHistory] After filtering: {len(filtered_data)} status history records for this researcher")
        
        return {
            "success": True,
            "researcher_id": researcher_id,
            "total_samples": len(sample_ids),
            "total_history_records": len(filtered_data),
            "data": filtered_data
        }
        
    except Exception as e:
        logger.error(f"[ResearcherHistory] Error: {str(e)}")
        logger.error(f"[ResearcherHistory] Exception type: {type(e).__name__}")
        import traceback
        logger.error(f"[ResearcherHistory] Traceback: {traceback.format_exc()}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar histórico de status: {str(e)}"
        )


@router.get("/{sample_id}", response_model=SampleResponse)
async def get_sample(
    sample_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific sample"""
    supabase: Client = get_supabase_client()
    
    try:
        response = supabase.table("samples") \
            .select("*") \
            .eq("id", sample_id) \
            .eq("researcher_id", current_user["user_id"]) \
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sample not found"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.delete("/{sample_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sample(
    sample_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a sample and all related measurements"""
    supabase: Client = get_supabase_client()
    
    # First check if sample exists and belongs to user
    await get_sample(sample_id, current_user)
    
    try:
        # Delete will cascade to related tables if FK constraints are set up
        response = supabase.table("samples") \
            .delete() \
            .eq("id", sample_id) \
            .execute()
        
        return None
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


# ===== STATUS HISTORY ENDPOINTS =====

@router.get("/{sample_id}/status-history", response_model=SampleStatusHistoryResponse)
async def get_sample_status_history(
    sample_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get complete status history for a sample
    
    - Researcher can only view history for their own samples
    - Admin can view any sample's history
    - Returns all status transitions in chronological order
    """
    supabase: Client = get_supabase_client()
    history_manager = get_status_history_manager()
    
    try:
        # Verify user has access to this sample
        sample_response = supabase.table("samples").select("researcher_id").eq("id", sample_id).execute()
        
        if not sample_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sample not found"
            )
        
        sample = sample_response.data[0]
        
        # Check access (researcher can view own samples, admin can view all)
        researcher_id = sample.get("researcher_id")
        is_own_sample = researcher_id == current_user.get("user_id")
        is_admin = current_user.get("user_type") == "admin"
        
        if not is_own_sample and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this sample's history"
            )
        
        # Get the status history
        history = history_manager.get_sample_history(sample_id)
        return history
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve status history: {str(e)}"
        )


@router.post("/{sample_id}/update-status", response_model=UpdateSampleStatusResponse, status_code=status.HTTP_200_OK)
async def update_sample_status(
    sample_id: str,
    status_update: UpdateSampleStatusRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update sample status (Admin only)
    
    - Records the status change in history
    - Validates transition rules
    - Includes optional comment (especially useful for 'Revisions')
    - Returns updated status and new history record
    """
    supabase: Client = get_supabase_client()
    history_manager = get_status_history_manager()
    
    # Only admins can change status
    if current_user.get("user_type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can change sample status"
        )
    
    try:
        # Get current sample
        sample_response = supabase.table("samples").select("*").eq("id", sample_id).execute()
        
        if not sample_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sample not found"
            )
        
        sample = sample_response.data[0]
        old_status = sample.get("status")
        new_status = status_update.new_status
        
        # Check if status is different
        if old_status == new_status:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Sample already has status '{old_status}'"
            )
        
        # Validate transition
        is_valid, error_message = history_manager.validate_status_transition(old_status, new_status)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
        
        # Update sample status
        update_response = supabase.table("samples").update({
            "status": new_status
        }).eq("id", sample_id).execute()
        
        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update sample status"
            )
        
        # Record the status change in history
        admin_user_id = current_user.get("user_id") or current_user.get("id")
        admin_name = await get_user_full_name(admin_user_id)
        admin_email = current_user.get("email", "unknown@example.com")
        
        history_record = history_manager.record_status_change(
            sample_id=sample_id,
            old_status=old_status,
            new_status=new_status,
            changed_by_user_id=admin_user_id,
            changed_by_name=admin_name,
            changed_by_email=admin_email,
            changed_by_role="admin",
            comment=status_update.comment,
            is_system_action=False
        )
        
        return UpdateSampleStatusResponse(
            success=True,
            message=f"Sample status updated from '{old_status}' to '{new_status}'",
            sample_id=sample_id,
            old_status=old_status,
            new_status=new_status,
            history_record=history_record
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update status: {str(e)}"
        )


@router.get("/status-summary/{sample_id}", response_model=SampleStatusSummary)
async def get_sample_status_summary(
    sample_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a quick summary of sample status
    
    - Shows current status and how long it's been in that state
    - Useful for quick status checks in listings
    """
    supabase: Client = get_supabase_client()
    history_manager = get_status_history_manager()
    
    try:
        # Verify user has access to this sample
        sample_response = supabase.table("samples").select("researcher_id, status").eq("id", sample_id).execute()
        
        if not sample_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sample not found"
            )
        
        sample = sample_response.data[0]
        
        # Check access
        researcher_id = sample.get("researcher_id")
        is_own_sample = researcher_id == current_user.get("user_id")
        is_admin = current_user.get("user_type") == "admin"
        
        if not is_own_sample and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this information"
            )
        
        current_status = sample.get("status")
        
        # Get when sample entered current status
        history_response = supabase.table("sample_status_history") \
            .select("created_at, comment") \
            .eq("sample_id", sample_id) \
            .eq("new_status", current_status) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        
        status_since = None
        last_comment = None
        if history_response.data:
            from datetime import datetime
            status_since = datetime.fromisoformat(
                history_response.data[0].get("created_at").replace('Z', '+00:00')
            )
            last_comment = history_response.data[0].get("comment")
        else:
            # Fallback to sample creation date
            from datetime import datetime
            status_since = datetime.fromisoformat(
                sample.get("created_at", "").replace('Z', '+00:00')
            )
        
        # Calculate days in current status
        from datetime import datetime as dt
        days_in_status = (dt.utcnow() - status_since.replace(tzinfo=None)).days
        
        # Get total transitions
        count_response = supabase.table("sample_status_history") \
            .select("id", count="exact") \
            .eq("sample_id", sample_id) \
            .execute()
        
        total_transitions = count_response.count or 0
        
        return SampleStatusSummary(
            sample_id=sample_id,
            current_status=current_status,
            status_since=status_since,
            days_in_current_status=days_in_status,
            total_transitions=total_transitions,
            last_comment=last_comment
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve status summary: {str(e)}"
        )
