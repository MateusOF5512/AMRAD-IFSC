#!/usr/bin/env python3
"""
Test script to verify boolean homogeneity data persistence.

This script tests the complete cycle:
1. Create a sample/experiment
2. Add infill measurements with has_homogeneity_issues = true
3. Create measurements with has_homogeneity_issues = false
4. Retrieve the data and verify it returns as boolean
5. Update measurements and verify the update preserves boolean type

Run from project root: python test_boolean_homogeneity.py
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
TEST_USER_EMAIL = "test@example.com"
TEST_USER_PASSWORD = "test_password_123"

class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_success(msg):
    print(f"{Colors.OKGREEN}✅ {msg}{Colors.ENDC}")

def print_error(msg):
    print(f"{Colors.FAIL}❌ {msg}{Colors.ENDC}")

def print_info(msg):
    print(f"{Colors.OKCYAN}ℹ️  {msg}{Colors.ENDC}")

def print_header(msg):
    print(f"\n{Colors.BOLD}{Colors.HEADER}{'='*60}")
    print(msg)
    print(f"{'='*60}{Colors.ENDC}\n")

def test_homogeneity_persistence():
    """Test the complete boolean homogeneity data cycle"""
    
    print_header("BOOLEAN HOMOGENEITY DATA PERSISTENCE TEST")
    
    session = requests.Session()
    session.verify = False  # For local testing
    
    try:
        # Step 1: Authenticate
        print_info("Step 1: Authenticating user...")
        auth_payload = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        auth_response = session.post(
            f"{BASE_URL}/auth/login",
            json=auth_payload
        )
        
        if auth_response.status_code not in [200, 201]:
            print_error(f"Authentication failed: {auth_response.status_code}")
            print_error(f"Response: {auth_response.text}")
            return False
        
        auth_data = auth_response.json()
        access_token = auth_data.get("access_token")
        user_id = auth_data.get("user", {}).get("id")
        
        if not access_token:
            print_error("No access token received")
            return False
        
        print_success(f"Authenticated as user: {user_id}")
        session.headers.update({"Authorization": f"Bearer {access_token}"})
        
        # Step 2: Create a sample
        print_info("Step 2: Creating a test sample/experiment...")
        sample_payload = {
            "material_id": "test_material",
            "machine_id": "test_machine",
            "shape_type": "cylinder",
            "pattern_type": "grid",
            "infill_pct": 100,
            "print_time_minutes": 120,
            "material_weight": 50.0,
            "status": "completed"
        }
        
        sample_response = session.post(
            f"{BASE_URL}/samples",
            json=sample_payload
        )
        
        if sample_response.status_code not in [200, 201]:
            print_error(f"Sample creation failed: {sample_response.status_code}")
            print_error(f"Response: {sample_response.text}")
            return False
        
        sample_data = sample_response.json()
        experiment_id = sample_data.get("id")
        print_success(f"Created sample with ID: {experiment_id}")
        
        # Step 3: Add infill measurements with has_homogeneity_issues
        print_info("Step 3: Adding infill measurements...")
        
        measurements = [
            {
                "infill_pct": 40,
                "hu_mean": 150.5,
                "sd_value": 10.2,
                "has_homogeneity_issues": True,
                "pattern_type": "grid",
                "notes": "Test measurement with homogeneity issues"
            },
            {
                "infill_pct": 60,
                "hu_mean": 160.3,
                "sd_value": 8.5,
                "has_homogeneity_issues": False,
                "pattern_type": "grid",
                "notes": "Test measurement without homogeneity issues"
            },
            {
                "infill_pct": 80,
                "hu_mean": 170.1,
                "sd_value": 5.3,
                "has_homogeneity_issues": True,
                "pattern_type": "grid",
                "notes": "Another test with issues"
            }
        ]
        
        added_measurements = []
        
        for i, measurement in enumerate(measurements):
            add_response = session.post(
                f"{BASE_URL}/experiments/{experiment_id}/add-infill",
                json=measurement
            )
            
            if add_response.status_code not in [200, 201]:
                print_error(f"Failed to add measurement {i+1}: {add_response.status_code}")
                print_error(f"Response: {add_response.text}")
                continue
            
            m_data = add_response.json()
            added_measurements.append(m_data)
            has_issues = measurement["has_homogeneity_issues"]
            print_success(f"Added measurement {i+1}: {measurement['infill_pct']}% - has_homogeneity_issues={has_issues}")
        
        if not added_measurements:
            print_error("No measurements were added successfully")
            return False
        
        # Step 4: Retrieve experiment and check data types
        print_info("Step 4: Retrieving experiment details...")
        detail_response = session.get(
            f"{BASE_URL}/experiments/{experiment_id}/detalhes"
        )
        
        if detail_response.status_code != 200:
            print_error(f"Failed to retrieve experiment: {detail_response.status_code}")
            print_error(f"Response: {detail_response.text}")
            return False
        
        detail_data = detail_response.json()
        infill_measurements = detail_data.get("infill_measurements", [])
        
        print_success(f"Retrieved {len(infill_measurements)} measurements")
        
        # Verify data types
        print_info("Step 5: Verifying data types and values...")
        all_correct = True
        
        for i, measurement in enumerate(infill_measurements):
            vh = measurement.get("visual_homogeneity")
            vh_type = type(vh).__name__
            
            print(f"  Measurement {i+1}:")
            print(f"    - infill_pct: {measurement.get('infill_pct')}")
            print(f"    - visual_homogeneity: {vh} (type: {vh_type})")
            print(f"    - hu_mean: {measurement.get('hu_mean')}")
            
            # Check if visual_homogeneity is boolean
            if not isinstance(vh, bool):
                print_error(f"    ❌ visual_homogeneity is not boolean! Type: {vh_type}")
                all_correct = False
            else:
                print_success(f"    ✓ visual_homogeneity is boolean")
            
            # Check value makes sense
            if vh is True:
                print_success(f"    ✓ has_homogeneity_issues = True")
            elif vh is False:
                print_success(f"    ✓ has_homogeneity_issues = False")
            else:
                print_warning(f"    ⚠ visual_homogeneity value: {vh}")
        
        if not all_correct:
            print_error("Some data types were incorrect!")
            return False
        
        # Step 6: Update a measurement and verify persistence
        print_info("Step 6: Updating a measurement...")
        
        if infill_measurements:
            first_measurement = infill_measurements[0]
            measurement_id = first_measurement.get("id")
            old_issues = first_measurement.get("visual_homogeneity")
            new_issues = not old_issues if isinstance(old_issues, bool) else True
            
            update_payload = {
                "measurements": [
                    {
                        "id": measurement_id,
                        "infill_pct": first_measurement.get("infill_pct"),
                        "hu_mean": first_measurement.get("hu_mean"),
                        "sd_value": first_measurement.get("sd_value"),
                        "has_homogeneity_issues": new_issues,
                        "pattern_type": first_measurement.get("pattern_type"),
                        "notes": "Updated test note"
                    }
                ]
            }
            
            update_response = session.put(
                f"{BASE_URL}/experiments/{experiment_id}/update-infills",
                json=update_payload
            )
            
            if update_response.status_code != 200:
                print_error(f"Update failed: {update_response.status_code}")
                print_error(f"Response: {update_response.text}")
                return False
            
            print_success(f"Updated measurement - changed has_homogeneity_issues from {old_issues} to {new_issues}")
            
            # Retrieve again to verify update
            detail_response = session.get(
                f"{BASE_URL}/experiments/{experiment_id}/detalhes"
            )
            if detail_response.status_code == 200:
                detail_data = detail_response.json()
                updated_measurement = next(
                    (m for m in detail_data.get("infill_measurements", []) if m.get("id") == measurement_id),
                    None
                )
                if updated_measurement:
                    updated_vh = updated_measurement.get("visual_homogeneity")
                    if updated_vh == new_issues:
                        print_success(f"✓ Update persisted correctly: visual_homogeneity={updated_vh}")
                    else:
                        print_error(f"✗ Update not persisted! Expected {new_issues}, got {updated_vh}")
                        return False
        
        print_header("TEST COMPLETED SUCCESSFULLY ✅")
        return True
        
    except Exception as e:
        print_error(f"Test failed with exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_homogeneity_persistence()
    sys.exit(0 if success else 1)
