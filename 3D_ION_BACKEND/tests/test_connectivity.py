#!/usr/bin/env python3
"""
Test script to verify backend connectivity and CORS configuration
Run this to diagnose "Failed to fetch" issues
"""

import requests
import json
import sys
from urllib.parse import urljoin

# Configuration
BACKEND_URL = "http://localhost:8000"
API_V1_URL = urljoin(BACKEND_URL, "api/v1")
TEST_ENDPOINT = urljoin(API_V1_URL, "experiments/resumo")

# Colors for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'
BOLD = '\033[1m'


def print_header(text):
    print(f"\n{BOLD}{BLUE}{'='*60}{RESET}")
    print(f"{BOLD}{BLUE}{text}{RESET}")
    print(f"{BOLD}{BLUE}{'='*60}{RESET}\n")


def print_success(text):
    print(f"{GREEN}✅ {text}{RESET}")


def print_error(text):
    print(f"{RED}❌ {text}{RESET}")


def print_warning(text):
    print(f"{YELLOW}⚠️  {text}{RESET}")


def print_info(text):
    print(f"{BLUE}ℹ️  {text}{RESET}")


def test_backend_connectivity():
    """Test if backend is running"""
    print_header("1. Testing Backend Connectivity")
    
    try:
        response = requests.get(f"{BACKEND_URL}/", timeout=5)
        print_success(f"Backend is running at {BACKEND_URL}")
        print(f"   Response: {response.json()}")
        return True
    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to backend at {BACKEND_URL}")
        print_warning("Make sure backend is running: python -m uvicorn app.main:app --reload")
        return False
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        return False


def test_api_health():
    """Test API health endpoint"""
    print_header("2. Testing API v1 Health Endpoint")
    
    try:
        response = requests.get(f"{API_V1_URL}/health", timeout=5)
        print_success(f"API v1 is healthy")
        print(f"   Response: {response.json()}")
        return True
    except Exception as e:
        print_error(f"Health check failed: {str(e)}")
        return False


def test_cors_diagnostics():
    """Test CORS configuration"""
    print_header("3. Testing CORS Configuration")
    
    try:
        # Simulate request from localhost:3000
        headers = {
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'GET',
        }
        
        response = requests.options(
            TEST_ENDPOINT,
            headers=headers,
            timeout=5
        )
        
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin', 'NOT SET'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods', 'NOT SET'),
            'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials', 'NOT SET'),
        }
        
        print_info(f"CORS Headers in Response:")
        for header, value in cors_headers.items():
            if value != 'NOT SET':
                print(f"   {header}: {value}")
            else:
                print_warning(f"   {header}: {value}")
        
        return True
    except Exception as e:
        print_error(f"CORS test failed: {str(e)}")
        return False


def test_experiments_endpoint():
    """Test experiments endpoint"""
    print_header("4. Testing /experiments/resumo Endpoint")
    
    try:
        response = requests.get(TEST_ENDPOINT, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Endpoint responding with status 200")
            print(f"   Experiments count: {data.get('count', 'N/A')}")
            print(f"   Success: {data.get('success', 'N/A')}")
            return True
        else:
            print_error(f"Endpoint returned status {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"Endpoint test failed: {str(e)}")
        return False


def test_diagnostics_endpoint():
    """Test diagnostics endpoint"""
    print_header("5. Testing Diagnostics Endpoint")
    
    try:
        response = requests.get(
            f"{API_V1_URL}/diagnostics/cors",
            headers={'Origin': 'http://localhost:3000'},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success("Diagnostics endpoint accessible")
            
            # Print allowed origins
            origins = data.get('cors_configuration', {}).get('allowed_origins', [])
            print(f"\n   Allowed Origins:")
            for origin in origins:
                print(f"   - {origin}")
            
            # Check if localhost:3000 is allowed
            if 'http://localhost:3000' in origins:
                print_success("✓ localhost:3000 is allowed")
            else:
                print_warning("⚠ localhost:3000 is NOT in allowed origins")
            
            return True
        else:
            print_error(f"Diagnostics endpoint returned status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Diagnostics test failed: {str(e)}")
        return False


def print_summary(results):
    """Print test summary"""
    print_header("Test Summary")
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    failed = total - passed
    
    print(f"Total Tests: {total}")
    print_success(f"Passed: {passed}")
    if failed > 0:
        print_error(f"Failed: {failed}")
    
    print()
    
    for test_name, result in results.items():
        status = f"{GREEN}✅ PASS{RESET}" if result else f"{RED}❌ FAIL{RESET}"
        print(f"{test_name}: {status}")
    
    print()
    
    if all(results.values()):
        print_success("All tests passed! Frontend should be able to fetch experiments.")
    else:
        print_error("Some tests failed. See details above.")
        print_warning("Review the failing tests and follow the troubleshooting guide:")
        print_info("File: docs/TROUBLESHOOTING_FAILED_FETCH.md")
    
    return all(results.values())


def main():
    print(f"\n{BOLD}🔧 AMRAD Backend Connectivity Test{RESET}\n")
    
    results = {}
    
    # Run all tests
    results["Backend Connectivity"] = test_backend_connectivity()
    if not results["Backend Connectivity"]:
        print_error("\nBackend is not running. Cannot proceed with other tests.")
        print_info("Start the backend with: python -m uvicorn app.main:app --reload")
        return False
    
    results["API v1 Health"] = test_api_health()
    results["CORS Configuration"] = test_cors_diagnostics()
    results["Experiments Endpoint"] = test_experiments_endpoint()
    results["Diagnostics Endpoint"] = test_diagnostics_endpoint()
    
    # Print summary
    all_passed = print_summary(results)
    
    return all_passed


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Test interrupted by user{RESET}")
        sys.exit(1)
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        sys.exit(1)
