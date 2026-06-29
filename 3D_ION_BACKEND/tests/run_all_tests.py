"""
Run All Tests Suite
Main test runner that executes all test modules and generates a comprehensive report
"""

import os
import sys
import time
from pathlib import Path

# Add parent directory to path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import test modules
from tests.test_supabase_connection import run_all_connection_tests
from tests.test_auth_operations import run_all_auth_tests
from tests.test_database_operations import run_all_database_tests
from tests.test_api_endpoints import run_all_api_tests

def print_header(title):
    """Print a nice header"""
    print("\n" + "█" * 80)
    print(f"█ {title.center(76)} █")
    print("█" * 80)

def print_section_divider():
    """Print section divider"""
    print("\n" + "-" * 80 + "\n")

def run_complete_test_suite():
    """Run the complete test suite"""
    start_time = time.time()
    
    print_header("ION3D PLATFORM - COMPLETE TEST SUITE")
    print(f"Started at: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Dictionary to store all results
    all_results = {}
    
    # Run Connection Tests
    print_section_divider()
    print("Running Supabase Connection Tests...")
    print_section_divider()
    conn_result = run_all_connection_tests()
    all_results['Connection Tests'] = conn_result
    
    # Run Auth Tests
    print_section_divider()
    print("Running Authentication Tests...")
    print_section_divider()
    auth_result = run_all_auth_tests()
    all_results['Auth Tests'] = auth_result
    
    # Run Database Tests
    print_section_divider()
    print("Running Database Operation Tests...")
    print_section_divider()
    db_result = run_all_database_tests()
    all_results['Database Tests'] = db_result
    
    # Run API Tests
    print_section_divider()
    print("Running API Endpoint Tests...")
    print_section_divider()
    api_result = run_all_api_tests()
    all_results['API Tests'] = api_result
    
    # Print final summary
    print_section_divider()
    print_header("FINAL TEST SUMMARY")
    
    print("\nTest Suite Results:")
    print("-" * 80)
    
    for test_suite, result in all_results.items():
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{status:12} | {test_suite}")
    
    print("-" * 80)
    
    elapsed_time = time.time() - start_time
    all_passed = all(all_results.values())
    
    if all_passed:
        print(f"\n✓ ALL TEST SUITES PASSED! ✓")
        print(f"Elapsed time: {elapsed_time:.2f} seconds")
    else:
        print(f"\n✗ SOME TEST SUITES FAILED")
        print(f"Elapsed time: {elapsed_time:.2f} seconds")
        print(f"\nPlease review the errors above and check:")
        print(f"  1. Your .env file has correct credentials")
        print(f"  2. RLS policies are properly configured")
        print(f"  3. Database tables exist and have correct structure")
    
    print("\n" + "█" * 80)
    
    return all_passed

if __name__ == "__main__":
    success = run_complete_test_suite()
    sys.exit(0 if success else 1)
