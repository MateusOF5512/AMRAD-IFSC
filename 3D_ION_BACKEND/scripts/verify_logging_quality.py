"""
Quick verification script to test logging improvements
Run this after applying the middleware fixes
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database.supabase import get_supabase_client


async def verify_logging_quality():
    """Verify the logging fixes are working"""
    db = get_supabase_client()
    
    print("🔍 Verifying Logging Quality Improvements")
    print("=" * 60)
    
    # Get all recent logs (last 20)
    response = db.table("application_logs").select("*").order("created_at", desc=True).limit(20).execute()
    logs = response.data
    
    print(f"\n📊 Analyzing {len(logs)} recent logs...\n")
    
    stats = {
        "total": len(logs),
        "with_user_id": 0,
        "with_user_name": 0,
        "with_user_type": 0,
        "options_requests": 0,
        "system_events": 0,
        "api_requests": 0,
        "blank_user_logs": 0,
        "incomplete_logs": 0,
    }
    
    # Analyze each log
    for i, log in enumerate(logs, 1):
        action_type = log.get("action_type", "")
        http_method = log.get("http_method", "")
        user_id = log.get("user_id")
        user_name = log.get("user_name")
        user_type = log.get("user_type")
        action_category = log.get("action_category", "")
        
        # Count stats
        if user_id:
            stats["with_user_id"] += 1
        if user_name:
            stats["with_user_name"] += 1
        if user_type:
            stats["with_user_type"] += 1
        
        if http_method == "OPTIONS":
            stats["options_requests"] += 1
        
        if action_category == "SYSTEM_EVENT":
            stats["system_events"] += 1
            if action_type == "API_REQUEST":
                stats["api_requests"] += 1
        
        # Check for blank fields
        if not user_id and not user_name and not user_type:
            stats["blank_user_logs"] += 1
        elif user_id and not user_name and action_category == "SYSTEM_EVENT":
            stats["incomplete_logs"] += 1
        
        # Print sample log details
        if i <= 3:
            print(f"📝 Log #{i}:")
            print(f"   Action: {action_type}")
            print(f"   Method: {http_method}")
            print(f"   User ID: {user_id or '(empty)'}")
            print(f"   User Name: {user_name or '(empty)'}")
            print(f"   User Type: {user_type or '(empty)'}")
            print()
    
    # Print statistics
    print("\n📊 Statistics:")
    print(f"  Total Logs: {stats['total']}")
    print(f"  ✓ With user_id: {stats['with_user_id']} ({stats['with_user_id']*100//stats['total']}%)")
    print(f"  ✓ With user_name: {stats['with_user_name']} ({stats['with_user_name']*100//stats['total']}%)")
    print(f"  ✓ With user_type: {stats['with_user_type']} ({stats['with_user_type']*100//stats['total']}%)")
    
    print(f"\n🎯 Improvements:")
    print(f"  • OPTIONS requests (should be 0): {stats['options_requests']}")
    print(f"  • System events (API requests): {stats['system_events']}")
    print(f"  • Blank user logs (should be 0): {stats['blank_user_logs']}")
    print(f"  • Incomplete logs (should be 0): {stats['incomplete_logs']}")
    
    # Quality Score
    total_analyzed = stats["system_events"]
    if total_analyzed > 0:
        quality_score = min(
            (stats["api_requests"] - stats["options_requests"]) / max(1, stats["api_requests"]) * 100,
            (stats["with_user_name"] / max(1, stats["api_requests"])) * 100 if stats["api_requests"] > 0 else 100
        )
        print(f"\n✅ Data Quality Score: {quality_score:.1f}%")
    
    # Recommendations
    print(f"\n💡 Recommendations:")
    if stats["options_requests"] > 0:
        print(f"  ⚠️  Found {stats['options_requests']} OPTIONS requests - middleware should skip them")
    if stats["blank_user_logs"] > 0:
        print(f"  ⚠️  Found {stats['blank_user_logs']} logs with blank user fields")
    if stats["incomplete_logs"] > 0:
        print(f"  ⚠️  Found {stats['incomplete_logs']} logs with missing user_name")
    
    if stats["options_requests"] == 0 and stats["blank_user_logs"] == 0 and stats["incomplete_logs"] == 0:
        print(f"  ✅ All checks passed! Logging quality is excellent.")


if __name__ == "__main__":
    asyncio.run(verify_logging_quality())
