"""
Quick test to verify status history filters are working correctly
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database.supabase import get_supabase_client

def test_filters():
    """Test different filter combinations"""
    
    supabase = get_supabase_client()
    
    print("=" * 80)
    print("STATUS HISTORY FILTER TESTS")
    print("=" * 80)
    
    # Test 1: Count total records
    print("\n[TEST 1] Total status history records")
    response = supabase.table("sample_status_history").select("id", count='exact').execute()
    print(f"✓ Total records: {response.count}")
    
    # Test 2: Count records with NULL old_status (initial submissions)
    print("\n[TEST 2] Records with NULL old_status (initial submissions)")
    response = supabase.table("sample_status_history") \
        .select("id, sample_id, old_status, new_status, changed_by_name") \
        .is_("old_status", "null") \
        .execute()
    print(f"✓ Records with NULL old_status: {len(response.data)}")
    if response.data:
        print(f"  Sample: {response.data[0]['sample_id'][:8]}... | New: {response.data[0]['new_status']} | By: {response.data[0]['changed_by_name']}")
    
    # Test 3: Count records with old_status = "Submitted"
    print("\n[TEST 3] Records with old_status = 'Submitted'")
    response = supabase.table("sample_status_history") \
        .select("id, sample_id, old_status, new_status, changed_by_name") \
        .eq("old_status", "Submitted") \
        .execute()
    print(f"✓ Records with Submitted->X transitions: {len(response.data)}")
    if response.data:
        for i, rec in enumerate(response.data[:3]):
            print(f"  [{i+1}] {rec['sample_id'][:8]}... | {rec['old_status']} → {rec['new_status']}")
    
    # Test 4: Count records with new_status = "Approved"
    print("\n[TEST 4] Records with new_status = 'Approved'")
    response = supabase.table("sample_status_history") \
        .select("id, sample_id, old_status, new_status, changed_by_name") \
        .eq("new_status", "Approved") \
        .execute()
    print(f"✓ Records with X->Approved transitions: {len(response.data)}")
    if response.data:
        for i, rec in enumerate(response.data[:3]):
            print(f"  [{i+1}] {rec['sample_id'][:8]}... | {rec['old_status']} → {rec['new_status']}")
    
    # Test 5: Combination filter - NULL old_status AND new_status = "Submitted"
    print("\n[TEST 5] Combination: old_status=NULL AND new_status='Submitted' (initial submissions)")
    response = supabase.table("sample_status_history") \
        .select("id, sample_id, old_status, new_status, changed_by_name, changed_by_role") \
        .is_("old_status", "null") \
        .eq("new_status", "Submitted") \
        .execute()
    print(f"✓ Initial submissions (NULL->Submitted): {len(response.data)}")
    if response.data:
        for i, rec in enumerate(response.data[:3]):
            role = "🔐 Admin" if rec['changed_by_role'] == 'admin' else "👤 Researcher"
            print(f"  [{i+1}] {rec['sample_id'][:8]}... | NULL → Submitted | {rec['changed_by_name']} {role}")
    
    # Test 6: Filter by partial name match
    print("\n[TEST 6] Filter by partial name match 'MATEUS'")
    response = supabase.table("sample_status_history") \
        .select("id, sample_id, changed_by_name") \
        .ilike("changed_by_name", "%MATEUS%") \
        .execute()
    print(f"✓ Records with 'MATEUS' in name: {len(response.data)}")
    if response.data:
        names = set(rec['changed_by_name'] for rec in response.data)
        for name in list(names)[:3]:
            count = sum(1 for rec in response.data if rec['changed_by_name'] == name)
            print(f"  - {name}: {count} records")
    
    # Test 7: Filter by role
    print("\n[TEST 7] Filter by role='admin'")
    response = supabase.table("sample_status_history") \
        .select("id, changed_by_name, changed_by_role") \
        .eq("changed_by_role", "admin") \
        .execute()
    print(f"✓ Records by admin: {len(response.data)}")
    
    print("\n[TEST 8] Filter by role='pesquisador'")
    response = supabase.table("sample_status_history") \
        .select("id, changed_by_name, changed_by_role") \
        .eq("changed_by_role", "pesquisador") \
        .execute()
    print(f"✓ Records by pesquisador: {len(response.data)}")
    
    print("\n" + "=" * 80)
    print("✓ All filter tests completed successfully!")
    print("=" * 80)

if __name__ == "__main__":
    try:
        test_filters()
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
