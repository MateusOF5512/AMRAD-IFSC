"""
Database helper functions for Sample Status History
Manages all operations related to status history tracking
"""

from typing import Optional, List
from datetime import datetime
from uuid import UUID
from supabase import Client

from app.database.supabase import get_supabase_client
from app.schemas.sample_status_history import (
    SampleStatusHistoryRecord,
    SampleStatusHistoryResponse,
    UpdateSampleStatusResponse,
    SampleStatusSummary
)


class SampleStatusHistoryManager:
    """
    Manager class for all sample status history operations
    Ensures consistency and provides a clean interface for status tracking
    """

    def __init__(self):
        self.supabase: Client = get_supabase_client()

    def record_initial_submission(
        self,
        sample_id: str,
        researcher_id: str,
        researcher_name: str,
        researcher_email: str
    ) -> dict:
        """
        Record the initial submission of a sample
        Called automatically when a new sample is created
        
        Args:
            sample_id: UUID of the newly created sample
            researcher_id: ID of the researcher who created it
            researcher_name: Name of the researcher
            researcher_email: Email of the researcher
            
        Returns:
            The created history record as dict
        """
        try:
            history_entry = {
                "sample_id": sample_id,
                "old_status": None,  # NULL for initial submission
                "new_status": "Submitted",
                "changed_by_user_id": researcher_id,
                "changed_by_name": researcher_name,
                "changed_by_email": researcher_email,
                "changed_by_role": "pesquisador",  # Initial submission is always by researcher
                "comment": None,
                "is_system_action": True,  # System-generated (automatic on creation)
                "created_at": datetime.utcnow().isoformat()
            }

            response = self.supabase.table("sample_status_history").insert(history_entry).execute()
            
            if response.data:
                return response.data[0]
            else:
                raise Exception("Failed to insert initial status history record")
                
        except Exception as e:
            # Log error but don't crash - status history is important but not critical
            print(f"[STATUS_HISTORY] Error recording initial submission for {sample_id}: {str(e)}")
            raise

    def record_status_change(
        self,
        sample_id: str,
        old_status: Optional[str],
        new_status: str,
        changed_by_user_id: str,
        changed_by_name: str,
        changed_by_email: str,
        changed_by_role: str,
        comment: Optional[str] = None,
        is_system_action: bool = False
    ) -> dict:
        """
        Record a status change in the history table
        Called whenever a sample status is updated
        
        Args:
            sample_id: UUID of the sample
            old_status: Previous status
            new_status: New status to assign
            changed_by_user_id: ID of the user making the change
            changed_by_name: Name of the user
            changed_by_email: Email of the user
            changed_by_role: Role of the user ('admin' or 'pesquisador')
            comment: Optional explanation for the change
            is_system_action: Whether this is a system-generated action
            
        Returns:
            The created history record
        """
        try:
            history_entry = {
                "sample_id": sample_id,
                "old_status": old_status,
                "new_status": new_status,
                "changed_by_user_id": changed_by_user_id,
                "changed_by_name": changed_by_name,
                "changed_by_email": changed_by_email,
                "changed_by_role": changed_by_role,
                "comment": comment if comment and comment.strip() else None,
                "is_system_action": is_system_action,
                "created_at": datetime.utcnow().isoformat()
            }

            response = self.supabase.table("sample_status_history").insert(history_entry).execute()
            
            if response.data:
                return response.data[0]
            else:
                raise Exception("Failed to insert status history record")
                
        except Exception as e:
            print(f"[STATUS_HISTORY] Error recording status change for {sample_id}: {str(e)}")
            raise

    def get_sample_history(self, sample_id: str) -> SampleStatusHistoryResponse:
        """
        Get complete status history for a sample
        
        Args:
            sample_id: UUID of the sample
            
        Returns:
            SampleStatusHistoryResponse with all transitions
        """
        try:
            # Get sample current status
            sample_response = self.supabase.table("samples").select("status").eq("id", sample_id).execute()
            
            if not sample_response.data:
                raise Exception(f"Sample {sample_id} not found")
            
            current_status = sample_response.data[0].get("status")
            
            # Get all history records ordered by created_at
            history_response = self.supabase.table("sample_status_history") \
                .select("*") \
                .eq("sample_id", sample_id) \
                .order("created_at", desc=False) \
                .execute()
            
            records = history_response.data or []
            history_records = [
                SampleStatusHistoryRecord(**record) 
                for record in records
            ]
            
            # Calculate timestamps
            first_submitted_at = None
            last_changed_at = None
            
            if history_records:
                first_submitted_at = history_records[0].created_at
                last_changed_at = history_records[-1].created_at
            
            return SampleStatusHistoryResponse(
                sample_id=sample_id,
                current_status=current_status,
                total_transitions=len(records),
                history=history_records,
                first_submitted_at=first_submitted_at,
                last_changed_at=last_changed_at
            )
            
        except Exception as e:
            print(f"[STATUS_HISTORY] Error retrieving history for {sample_id}: {str(e)}")
            raise

    def get_latest_status_change(self, sample_id: str) -> Optional[SampleStatusHistoryRecord]:
        """
        Get the most recent status change for a sample
        
        Args:
            sample_id: UUID of the sample
            
        Returns:
            The most recent history record or None
        """
        try:
            response = self.supabase.table("sample_status_history") \
                .select("*") \
                .eq("sample_id", sample_id) \
                .order("created_at", desc=True) \
                .limit(1) \
                .execute()
            
            if response.data:
                return SampleStatusHistoryRecord(**response.data[0])
            return None
            
        except Exception as e:
            print(f"[STATUS_HISTORY] Error retrieving latest change for {sample_id}: {str(e)}")
            return None

    def get_samples_by_status_duration(
        self,
        status: str,
        days_threshold: int = 7
    ) -> List[SampleStatusSummary]:
        """
        Get samples that have been in a specific status for N+ days
        Useful for identifying samples that need attention
        
        Args:
            status: The status to filter by
            days_threshold: Number of days to check
            
        Returns:
            List of samples with duration info
        """
        try:
            cutoff_date = datetime.utcnow().timestamp()
            
            samples_response = self.supabase.table("samples") \
                .select("id, status, created_at") \
                .eq("status", status) \
                .execute()
            
            summaries = []
            
            for sample in samples_response.data or []:
                sample_id = sample.get("id")
                
                # Get when this sample entered the current status
                history_response = self.supabase.table("sample_status_history") \
                    .select("*") \
                    .eq("sample_id", sample_id) \
                    .eq("new_status", status) \
                    .order("created_at", desc=True) \
                    .limit(1) \
                    .execute()
                
                status_since = None
                if history_response.data:
                    status_since = datetime.fromisoformat(
                        history_response.data[0].get("created_at").replace('Z', '+00:00')
                    )
                
                if status_since:
                    days = (datetime.utcnow() - status_since.replace(tzinfo=None)).days
                    
                    if days >= days_threshold:
                        # Get last comment
                        all_history = self.supabase.table("sample_status_history") \
                            .select("comment") \
                            .eq("sample_id", sample_id) \
                            .not_("comment", "is", "null") \
                            .order("created_at", desc=True) \
                            .limit(1) \
                            .execute()
                        
                        last_comment = None
                        if all_history.data:
                            last_comment = all_history.data[0].get("comment")
                        
                        # Count transitions
                        count_response = self.supabase.table("sample_status_history") \
                            .select("id", count="exact") \
                            .eq("sample_id", sample_id) \
                            .execute()
                        
                        total_transitions = count_response.count or 0
                        
                        summary = SampleStatusSummary(
                            sample_id=sample_id,
                            current_status=status,
                            status_since=status_since,
                            days_in_current_status=days,
                            total_transitions=total_transitions,
                            last_comment=last_comment
                        )
                        summaries.append(summary)
            
            return summaries
            
        except Exception as e:
            print(f"[STATUS_HISTORY] Error getting samples by duration: {str(e)}")
            return []

    def validate_status_transition(
        self,
        current_status: str,
        new_status: str
    ) -> tuple[bool, Optional[str]]:
        """
        Validate if a status transition is allowed
        Implements the workflow rules:
        - Submitted → Review OR Approved (direct approval)
        - Review → Approved or Revisions
        - Revisions → Review
        - Approved → Revisions, Review, or Submitted (fully flexible)
        
        Args:
            current_status: Current status of the sample
            new_status: Desired new status
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Define allowed transitions
        # UPDATED: Submitted can now go directly to Approved, and Approved is now flexible
        allowed_transitions = {
            'Submitted': ['Review', 'Approved'],  # NEW: Direct approval without mandatory review
            'Review': ['Approved', 'Revisions'],
            'Revisions': ['Review', 'Approved'],  # NEW: Can approve after revisions without re-review
            'Approved': ['Revisions', 'Review', 'Submitted']  # UPDATED: Approved is now flexible - can go to revisions, review, or back to submitted
        }
        
        if current_status not in allowed_transitions:
            return False, f"Invalid current status: {current_status}"
        
        if new_status not in allowed_transitions[current_status]:
            valid = ', '.join(allowed_transitions[current_status])
            return False, f"Cannot transition from '{current_status}' to '{new_status}'. Valid transitions: {valid}"
        
        return True, None

    def sync_sample_status_with_history(self, sample_id: str) -> bool:
        """
        Verify that the sample current status matches the latest history record
        Used for integrity checks
        
        Args:
            sample_id: UUID of the sample
            
        Returns:
            True if synchronized, False if mismatch found
        """
        try:
            # Get sample current status
            sample_response = self.supabase.table("samples") \
                .select("status") \
                .eq("id", sample_id) \
                .execute()
            
            latest_history = self.get_latest_status_change(sample_id)
            
            if not sample_response.data:
                print(f"[STATUS_HISTORY] Sample {sample_id} not found")
                return False
            
            current_status = sample_response.data[0].get("status")
            
            if latest_history and latest_history.new_status != current_status:
                print(f"[STATUS_HISTORY] Sync mismatch for {sample_id}: "
                      f"sample={current_status}, history={latest_history.new_status}")
                return False
            
            return True
            
        except Exception as e:
            print(f"[STATUS_HISTORY] Error validating sync for {sample_id}: {str(e)}")
            return False


def get_status_history_manager() -> SampleStatusHistoryManager:
    """
    Dependency injection helper to get status history manager
    """
    return SampleStatusHistoryManager()
