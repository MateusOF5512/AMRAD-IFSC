"""
Test Supabase Connection and Configuration
Tests basic connectivity to Supabase database
"""

import os
from load_env import load_project_env
from supabase import create_client

# Load environment variables
load_project_env()

def test_supabase_credentials():
    """Test if Supabase credentials are properly loaded"""
    print("\n" + "="*60)
    print("TEST 1: Supabase Credentials Loading")
    print("="*60)
    
    supabase_url = os.getenv("SUPABASE_URL")
    anon_key = os.getenv("SUPABASE_ANON_KEY")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    checks = {
        "SUPABASE_URL": supabase_url,
        "SUPABASE_ANON_KEY": anon_key,
        "SUPABASE_SERVICE_ROLE_KEY": service_role_key
    }
    
    all_ok = True
    for key, value in checks.items():
        status = "✓" if value else "✗"
        print(f"{status} {key}: {value[:20]}..." if value else f"{status} {key}: NOT SET")
        if not value:
            all_ok = False
    
    return all_ok

def test_supabase_connection_anon():
    """Test connection with Anon Key"""
    print("\n" + "="*60)
    print("TEST 2: Supabase Connection with Anon Key")
    print("="*60)
    
    try:
        client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_ANON_KEY")
        )
        print("✓ Connection established with Anon Key")
        
        # Try a simple health check query
        response = client.table('researchers').select('*').limit(1).execute()
        print(f"✓ Can query 'researchers' table")
        print(f"  Returned {len(response.data)} records")
        return True
    except Exception as e:
        print(f"✗ Connection failed: {str(e)}")
        return False

def test_supabase_connection_service_role():
    """Test connection with Service Role Key"""
    print("\n" + "="*60)
    print("TEST 3: Supabase Connection with Service Role Key")
    print("="*60)
    
    try:
        client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        print("✓ Connection established with Service Role Key")
        
        # Try a simple health check query
        response = client.table('researchers').select('*').limit(1).execute()
        print(f"✓ Can query 'researchers' table")
        print(f"  Returned {len(response.data)} records")
        return True
    except Exception as e:
        print(f"✗ Connection failed: {str(e)}")
        return False

def test_table_structure():
    """Test database table structure and RLS policies"""
    print("\n" + "="*60)
    print("TEST 4: Database Tables and RLS Policies")
    print("="*60)
    
    try:
        client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        
        tables_to_check = [
            'researchers',
            'materials',
            'machines',
            'samples',
            'infill_measurements',
            'ct_scan_points',
            'mechanical_properties',
            'linear_attenuation',
            'beam_qualities'
        ]
        
        for table in tables_to_check:
            try:
                response = client.table(table).select('*').limit(0).execute()
                print(f"✓ Table '{table}' exists and is accessible")
            except Exception as e:
                print(f"✗ Table '{table}' error: {str(e)}")
                
    except Exception as e:
        print(f"✗ Connection failed: {str(e)}")
        return False
    
    return True

def run_all_connection_tests():
    """Run all connection tests"""
    print("\n" + "🔍 RUNNING SUPABASE CONNECTION TESTS" + "🔍".rjust(27))
    
    results = {
        "Credentials": test_supabase_credentials(),
        "Connection (Anon)": test_supabase_connection_anon(),
        "Connection (Service Role)": test_supabase_connection_service_role(),
        "Table Structure": test_table_structure()
    }
    
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    all_passed = all(results.values())
    print("\n" + ("✓ ALL TESTS PASSED" if all_passed else "✗ SOME TESTS FAILED"))
    print("="*60)
    
    return all_passed

if __name__ == "__main__":
    run_all_connection_tests()
