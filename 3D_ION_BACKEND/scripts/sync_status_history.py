"""
Script to synchronize status history for all existing experiments
Checks every sample in the database and ensures it has proper status history records
"""

import sys
from pathlib import Path
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Tuple

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database.supabase import get_supabase_client
from app.database.sample_status_history import get_status_history_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def analyze_experiments() -> Tuple[List[str], List[Dict], int]:
    """
    Analyze all experiments and find ones missing status history
    
    Returns:
        Tuple of:
        - List of sample IDs missing history
        - List of samples with their details
        - Total number of samples
    """
    try:
        supabase = get_supabase_client()
        logger.info("=" * 80)
        logger.info("STARTING STATUS HISTORY SYNCHRONIZATION")
        logger.info("=" * 80)
        
        # Fetch all samples
        logger.info("\n[STEP 1] Fetching all samples from database...")
        samples_response = supabase.table("samples").select("id, status, created_at, researcher_id").execute()
        samples = samples_response.data or []
        
        logger.info(f"✓ Found {len(samples)} total samples")
        
        if not samples:
            logger.warning("No samples found in database")
            return [], [], 0
        
        # Check each sample for history
        logger.info("\n[STEP 2] Checking status history for each sample...")
        samples_missing_history = []
        samples_with_full_info = []
        
        for idx, sample in enumerate(samples, 1):
            sample_id = sample.get("id")
            status = sample.get("status")
            created_at = sample.get("created_at")
            researcher_id = sample.get("researcher_id")
            
            # Check if history exists
            history_response = supabase.table("sample_status_history") \
                .select("id") \
                .eq("sample_id", sample_id) \
                .execute()
            
            has_history = bool(history_response.data and len(history_response.data) > 0)
            
            sample_info = {
                "id": sample_id,
                "status": status,
                "created_at": created_at,
                "researcher_id": researcher_id,
                "has_history": has_history,
                "history_count": len(history_response.data) if history_response.data else 0
            }
            
            samples_with_full_info.append(sample_info)
            
            if not has_history:
                samples_missing_history.append(sample_id)
                logger.warning(f"  [{idx}/{len(samples)}] ❌ Sample {sample_id} - NO HISTORY (Created: {created_at}, Status: {status})")
            else:
                history_count = len(history_response.data)
                logger.info(f"  [{idx}/{len(samples)}] ✓ Sample {sample_id} - Has {history_count} history record(s)")
        
        return samples_missing_history, samples_with_full_info, len(samples)
        
    except Exception as e:
        logger.error(f"ERROR during analysis: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return [], [], 0


def get_researcher_info(researcher_id: str) -> Tuple[str, str]:
    """
    Get researcher name and email from database
    
    Returns:
        Tuple of (name, email)
    """
    try:
        supabase = get_supabase_client()
        response = supabase.table("researchers") \
            .select("name, email") \
            .eq("id", researcher_id) \
            .execute()
        
        if response.data and len(response.data) > 0:
            researcher = response.data[0]
            name = researcher.get("name", "Unknown Researcher")
            email = researcher.get("email", "unknown@example.com")
            return name, email
        
        return "Unknown Researcher", "unknown@example.com"
        
    except Exception as e:
        logger.warning(f"Failed to fetch researcher info for {researcher_id}: {str(e)}")
        return "Unknown Researcher", "unknown@example.com"


def create_missing_history_records(samples_missing_history: List[str], 
                                   samples_info: List[Dict]) -> int:
    """
    Create missing status history records for samples
    
    Args:
        samples_missing_history: List of sample IDs without history
        samples_info: Complete sample information
        
    Returns:
        Number of records successfully created
    """
    if not samples_missing_history:
        logger.info("\n✓ All samples have status history records. Nothing to sync!")
        return 0
    
    logger.info(f"\n[STEP 3] Creating missing history records for {len(samples_missing_history)} samples...")
    logger.info("-" * 80)
    
    supabase = get_supabase_client()
    history_manager = get_status_history_manager()
    created_count = 0
    failed_count = 0
    
    # Create a map for quick lookup
    samples_map = {s["id"]: s for s in samples_info}
    
    for idx, sample_id in enumerate(samples_missing_history, 1):
        try:
            sample = samples_map.get(sample_id)
            if not sample:
                logger.error(f"  [{idx}/{len(samples_missing_history)}] ✗ Sample {sample_id} - NOT FOUND in samples list")
                failed_count += 1
                continue
            
            researcher_id = sample.get("researcher_id")
            researcher_name, researcher_email = get_researcher_info(researcher_id)
            sample_created_at = sample.get("created_at")
            
            # Create initial submission record
            history_entry = {
                "sample_id": sample_id,
                "old_status": None,  # NULL for initial submission
                "new_status": "Submitted",
                "changed_by_user_id": researcher_id,
                "changed_by_name": researcher_name,
                "changed_by_email": researcher_email,
                "changed_by_role": "pesquisador",
                "comment": "Sincronizado automaticamente - registro retroativo",
                "is_system_action": True,
                "created_at": sample_created_at  # Use sample's creation date for history
            }
            
            # Insert the record
            response = supabase.table("sample_status_history").insert(history_entry).execute()
            
            if response.data and len(response.data) > 0:
                logger.info(f"  [{idx}/{len(samples_missing_history)}] ✓ Created history for {sample_id} (Researcher: {researcher_name})")
                created_count += 1
            else:
                logger.error(f"  [{idx}/{len(samples_missing_history)}] ✗ Failed to create history for {sample_id}")
                failed_count += 1
                
        except Exception as e:
            logger.error(f"  [{idx}/{len(samples_missing_history)}] ✗ Error creating history for {sample_id}: {str(e)}")
            failed_count += 1
    
    logger.info("-" * 80)
    logger.info(f"\n✓ Created {created_count} history records")
    if failed_count > 0:
        logger.warning(f"✗ Failed to create {failed_count} history records")
    
    return created_count


def print_summary(total_samples: int, 
                  samples_missing: List[str], 
                  samples_info: List[Dict],
                  created_count: int):
    """Print a summary of the synchronization"""
    
    logger.info("\n" + "=" * 80)
    logger.info("SYNCHRONIZATION SUMMARY")
    logger.info("=" * 80)
    
    logger.info(f"\nTotal samples in database: {total_samples}")
    logger.info(f"Samples with history records: {total_samples - len(samples_missing)}")
    logger.info(f"Samples missing history: {len(samples_missing)}")
    logger.info(f"Records created: {created_count}")
    
    if created_count > 0:
        logger.info(f"\n✓ Successfully synchronized {created_count} samples")
    
    if len(samples_missing) > created_count:
        remaining = len(samples_missing) - created_count
        logger.warning(f"\n✗ WARNING: {remaining} samples still missing history records")
    
    # Show breakdown by status
    logger.info("\n[STATUS BREAKDOWN]")
    status_counts = {}
    for sample in samples_info:
        status = sample.get("status", "Unknown")
        status_counts[status] = status_counts.get(status, 0) + 1
    
    for status, count in sorted(status_counts.items()):
        logger.info(f"  {status}: {count} samples")
    
    logger.info("\n" + "=" * 80)


def main():
    """Main execution"""
    try:
        # Step 1: Analyze experiments
        samples_missing, samples_info, total_samples = analyze_experiments()
        
        # Step 2: Create missing records
        created_count = create_missing_history_records(samples_missing, samples_info)
        
        # Step 3: Print summary
        print_summary(total_samples, samples_missing, samples_info, created_count)
        
        if created_count > 0:
            logger.info("\n✓ Synchronization completed successfully!")
            return 0
        elif len(samples_missing) == 0:
            logger.info("\n✓ No synchronization needed - all samples have history records!")
            return 0
        else:
            logger.error("\n✗ Synchronization completed with errors!")
            return 1
            
    except Exception as e:
        logger.error(f"\nFATAL ERROR: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
