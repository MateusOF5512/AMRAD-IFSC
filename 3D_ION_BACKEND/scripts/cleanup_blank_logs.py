"""
Script to clean up blank and incomplete logs from application_logs table
Removes test data and empty records before going to production
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database.supabase import get_supabase_client
from app.core.logging_service import LoggingService


async def cleanup_logs():
    """Remove blank and incomplete logs"""
    db = get_supabase_client()
    service = LoggingService()
    
    print("🔍 Analyzing existing logs...")
    
    # Get all current logs
    response = db.table("application_logs").select("*").execute()
    all_logs = response.data
    
    print(f"Total logs in database: {len(all_logs)}")
    
    # Categorize logs
    blank_user_logs = []
    incomplete_logs = []
    system_event_logs = []
    
    for log in all_logs:
        # Check if user fields are completely empty
        user_id = log.get("user_id")
        user_name = log.get("user_name")
        user_type = log.get("user_type")
        
        action_category = log.get("action_category")
        http_status = log.get("http_status")
        
        # Identify blank user logs
        if not user_id and not user_name and not user_type:
            blank_user_logs.append(log)
        
        # Identify incomplete logs (user_id but no user_name)
        elif user_id and not user_name and action_category == "SYSTEM_EVENT":
            incomplete_logs.append(log)
        
        # System events (API requests)
        if action_category == "SYSTEM_EVENT":
            system_event_logs.append(log)
    
    # Print analysis
    print(f"\n📊 Log Analysis:")
    print(f"  - Blank user fields: {len(blank_user_logs)}")
    print(f"  - Incomplete (user_id but no user_name): {len(incomplete_logs)}")
    print(f"  - System events (API requests): {len(system_event_logs)}")
    print(f"  - Total to clean: {len(blank_user_logs) + len(incomplete_logs)}")
    
    if not blank_user_logs and not incomplete_logs:
        print("\n✅ No blank logs to clean up!")
        return
    
    # Show sample of blank logs
    if blank_user_logs:
        print(f"\n📝 Sample of blank user logs:")
        for log in blank_user_logs[:2]:
            print(f"  - ID: {log['id']}, Action: {log['action_type']}, Status: {log['http_status']}")
    
    # Ask for confirmation
    response_input = input("\n❓ Delete these logs? (yes/no): ").strip().lower()
    
    if response_input != "yes":
        print("❌ Cleanup cancelled.")
        return
    
    # Delete blank user logs
    ids_to_delete = [log["id"] for log in blank_user_logs + incomplete_logs]
    
    print(f"\n🗑️  Deleting {len(ids_to_delete)} logs...")
    
    for log_id in ids_to_delete:
        try:
            db.table("application_logs").delete().eq("id", log_id).execute()
            print(f"  ✓ Deleted: {log_id}")
        except Exception as e:
            print(f"  ✗ Failed to delete {log_id}: {str(e)}")
    
    print(f"\n✅ Cleanup complete! Deleted {len(ids_to_delete)} blank logs.")
    
    # Show remaining stats
    response = db.table("application_logs").select("*").execute()
    remaining = response.data
    print(f"📊 Remaining logs: {len(remaining)}")


if __name__ == "__main__":
    print("🧹 Application Logs Cleanup Tool")
    print("=" * 50)
    asyncio.run(cleanup_logs())
