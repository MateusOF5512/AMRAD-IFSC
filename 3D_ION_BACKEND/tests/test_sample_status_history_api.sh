"""
API Test Suite for Sample Status History System

This file contains curl commands and Python request examples
for testing all status history endpoints.
"""

# =============================================================================
# API TEST EXAMPLES - Sample Status History
# =============================================================================

# Replace these with actual values:
# - BASE_URL: http://localhost:8000
# - RESEARCHER_TOKEN: JWT token for a researcher
# - ADMIN_TOKEN: JWT token for an admin user
# - SAMPLE_ID: UUID of an existing sample

BASE_URL="http://localhost:8000"
RESEARCHER_TOKEN="eyJhbGc..."  # Replace with actual token
ADMIN_TOKEN="eyJhbGc..."      # Replace with actual token
SAMPLE_ID="550e8400-e29b-41d4-a716-446655440000"  # Replace with actual ID


# =============================================================================
# TEST 1: Get Sample Status History
# =============================================================================

# Description: Retrieve complete status history for a sample
# Expected: 200 OK with history array

echo "TEST 1: Get Sample Status History"
curl -X GET "$BASE_URL/samples/$SAMPLE_ID/status-history" \
  -H "Authorization: Bearer $RESEARCHER_TOKEN" \
  -H "Content-Type: application/json" | python -m json.tool


# Expected Response:
# {
#   "sample_id": "550e8400-e29b-41d4-a716-446655440000",
#   "current_status": "Review",
#   "total_transitions": 2,
#   "first_submitted_at": "2026-02-24T10:00:00Z",
#   "last_changed_at": "2026-02-24T11:00:00Z",
#   "history": [
#     {
#       "id": 1,
#       "sample_id": "550e8400-e29b-41d4-a716-446655440000",
#       "old_status": null,
#       "new_status": "Submitted",
#       "changed_by_user_id": "researcher-id",
#       "changed_by_name": "João Silva",
#       "changed_by_email": "joao@example.com",
#       "changed_by_role": "pesquisador",
#       "comment": null,
#       "is_system_action": true,
#       "created_at": "2026-02-24T10:00:00Z"
#     }
#   ]
# }


# =============================================================================
# TEST 2: Get Status Summary
# =============================================================================

# Description: Get quick status summary (no full history)
# Expected: 200 OK with summary info

echo "TEST 2: Get Status Summary"
curl -X GET "$BASE_URL/samples/status-summary/$SAMPLE_ID" \
  -H "Authorization: Bearer $RESEARCHER_TOKEN" \
  -H "Content-Type: application/json" | python -m json.tool


# Expected Response:
# {
#   "sample_id": "550e8400-e29b-41d4-a716-446655440000",
#   "current_status": "Review",
#   "status_since": "2026-02-24T11:00:00Z",
#   "days_in_current_status": 3,
#   "total_transitions": 2,
#   "last_comment": "Entering peer review"
# }


# =============================================================================
# TEST 3: Update Sample Status (Valid Transition)
# =============================================================================

# Description: Change sample status from Review to Revisions
# Expected: 200 OK with history record created

echo "TEST 3: Update Status (Valid)"
curl -X POST "$BASE_URL/samples/$SAMPLE_ID/update-status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "new_status": "Revisions",
    "comment": "Please clarify the methodology section"
  }' | python -m json.tool


# Expected Response:
# {
#   "success": true,
#   "message": "Sample status updated from Review to Revisions",
#   "sample_id": "550e8400-e29b-41d4-a716-446655440000",
#   "old_status": "Review",
#   "new_status": "Revisions",
#   "history_record": {
#     "id": 2,
#     "sample_id": "550e8400-e29b-41d4-a716-446655440000",
#     "old_status": "Review",
#     "new_status": "Revisions",
#     "changed_by_user_id": "admin-id",
#     "changed_by_name": "Admin User",
#     "changed_by_email": "admin@example.com",
#     "changed_by_role": "admin",
#     "comment": "Please clarify the methodology section",
#     "is_system_action": false,
#     "created_at": "2026-02-24T14:30:00Z"
#   }
# }


# =============================================================================
# TEST 4: Update Status (Invalid Transition)
# =============================================================================

# Description: Try to change from Revisions to Submitted (not allowed)
# Expected: 400 Bad Request

echo "TEST 4: Update Status (Invalid)"
curl -X POST "$BASE_URL/samples/$SAMPLE_ID/update-status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "new_status": "Submitted",
    "comment": "Try to go back"
  }' | python -m json.tool


# Expected Response:
# {
#   "detail": "Cannot transition from 'Revisions' to 'Submitted'. Valid transitions: Review"
# }


# =============================================================================
# TEST 5: Update Status (No Permission)
# =============================================================================

# Description: Researcher tries to change status (only admins can)
# Expected: 403 Forbidden

echo "TEST 5: Update Status (No Permission)"
curl -X POST "$BASE_URL/samples/$SAMPLE_ID/update-status" \
  -H "Authorization: Bearer $RESEARCHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "new_status": "Approved",
    "comment": "I approve"
  }' | python -m json.tool


# Expected Response:
# {
#   "detail": "Only administrators can change sample status"
# }


# =============================================================================
# TEST 6: Admin Update Experiment Status (Old Endpoint Still Works)
# =============================================================================

# Description: Use admin endpoint to change status (legacy compatibility)
# Expected: 200 OK

echo "TEST 6: Admin Update Status"
curl -X PATCH "$BASE_URL/admin/experiments/$SAMPLE_ID/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Approved",
    "comment": "Final approval for publication"
  }' | python -m json.tool


# Expected Response:
# {
#   "success": true,
#   "message": "Status atualizado de 'Review' para 'Approved'",
#   "experiment_id": "550e8400-e29b-41d4-a716-446655440000",
#   "old_status": "Review",
#   "new_status": "Approved",
#   "history_recorded": true
# }


# =============================================================================
# TEST 7: Verify History After Multiple Changes
# =============================================================================

# Description: Get full history after multiple status changes
# Expected: 200 OK with all transitions recorded

echo "TEST 7: Verify Complete History"
curl -X GET "$BASE_URL/samples/$SAMPLE_ID/status-history" \
  -H "Authorization: Bearer $RESEARCHER_TOKEN" \
  -H "Content-Type: application/json" | python -m json.tool


# Expected Response Should Show Progression:
# Initial Submission (old_status=null, new_status='Submitted')
#   ↓
# -> Review (old_status='Submitted', new_status='Review')
#   ↓
# -> Revisions (old_status='Review', new_status='Revisions')
#   ↓
# -> Review (old_status='Revisions', new_status='Review')
#   ↓
# -> Approved (old_status='Review', new_status='Approved')


# =============================================================================
# TEST 8: Same Status Error
# =============================================================================

# Description: Try to change to same status (should fail)
# Expected: 409 Conflict

echo "TEST 8: Same Status Error"
# First get current status
CURRENT_STATUS=$(curl -s -X GET "$BASE_URL/samples/$SAMPLE_ID/status-history" \
  -H "Authorization: Bearer $RESEARCHER_TOKEN" | python -c "import sys, json; print(json.load(sys.stdin)['current_status'])")

# Try to change to same status
curl -X POST "$BASE_URL/samples/$SAMPLE_ID/update-status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"new_status\": \"$CURRENT_STATUS\",
    \"comment\": \"No change\"
  }" | python -m json.tool


# Expected Response:
# {
#   "detail": "Sample already has status 'Approved'"
# }


# =============================================================================
# PYTHON REQUEST EXAMPLES
# =============================================================================

"""
import requests
import json

BASE_URL = "http://localhost:8000"
ADMIN_TOKEN = "your_admin_token"
SAMPLE_ID = "your_sample_id"

# Get status history
def get_status_history(sample_id, token):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(
        f"{BASE_URL}/samples/{sample_id}/status-history",
        headers=headers
    )
    
    if response.status_code == 200:
        history = response.json()
        print(f"Sample {sample_id} Status: {history['current_status']}")
        print(f"Total transitions: {history['total_transitions']}")
        
        for record in history['history']:
            print(f"  {record['old_status']} → {record['new_status']} "
                  f"({record['changed_by_name']}, {record['created_at']})")
    else:
        print(f"Error: {response.status_code} - {response.text}")

# Get status summary
def get_status_summary(sample_id, token):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(
        f"{BASE_URL}/samples/status-summary/{sample_id}",
        headers=headers
    )
    
    if response.status_code == 200:
        summary = response.json()
        print(f"Status: {summary['current_status']}")
        print(f"Days in status: {summary['days_in_current_status']}")
        print(f"Total transitions: {summary['total_transitions']}")
        if summary['last_comment']:
            print(f"Last comment: {summary['last_comment']}")
    else:
        print(f"Error: {response.status_code}")

# Update sample status
def update_sample_status(sample_id, new_status, comment, token):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    data = {
        "new_status": new_status,
        "comment": comment
    }
    
    response = requests.post(
        f"{BASE_URL}/samples/{sample_id}/update-status",
        headers=headers,
        json=data
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✓ Status updated: {result['old_status']} → {result['new_status']}")
        return True
    else:
        print(f"✗ Error: {response.status_code} - {response.json()['detail']}")
        return False

# Usage examples:
if __name__ == "__main__":
    # Get status summary
    get_status_summary(SAMPLE_ID, ADMIN_TOKEN)
    
    # Update to Review
    update_sample_status(SAMPLE_ID, "Review", "Ready for review", ADMIN_TOKEN)
    
    # Get full history
    get_status_history(SAMPLE_ID, ADMIN_TOKEN)
    
    # Try invalid transition
    update_sample_status(SAMPLE_ID, "Submitted", "Try to go back", ADMIN_TOKEN)
"""


# =============================================================================
# WORKFLOW TEST - Complete Scenario
# =============================================================================

"""
Complete workflow test from creation to approval:

1. Create sample (automatic history record created)
2. Get history (should show 1 record: Submitted)
3. Admin changes to Review (history now shows 2 records)
4. Get summary (should show 0 days, since just changed)
5. Admin changes to Revisions with comment
6. Get history (should show 3 records with comment)
7. Admin changes to Approved
8. Get summary (should show metrics)
9. Verify all transitions recorded with user info

All transitions should be recorded in sample_status_history table
with user details and timestamps.
"""


# =============================================================================
# ERROR SCENARIOS TO TEST
# =============================================================================

"""
Error Scenarios:

1. Invalid Token
   → 401 Unauthorized

2. Non-existent Sample
   → 404 Not Found

3. Researcher accessing other's sample history
   → 403 Forbidden (for researcher)
   → 200 OK (for admin)

4. Invalid status value
   → 400 Bad Request: "Invalid status value"

5. Transition not allowed
   → 400 Bad Request: "Cannot transition from X to Y"

6. Trying to change to same status
   → 409 Conflict: "Sample already has status X"

7. Non-admin trying to change status
   → 403 Forbidden: "Only administrators can change..."

8. Database unavailable
   → 500 Internal Server Error
"""

# =============================================================================
# PERFORMANCE TESTS
# =============================================================================

"""
Performance Benchmarks:

1. Create Sample: < 200ms
2. Get Status History (1000 records): < 500ms
3. Update Status: < 300ms
4. Get Status Summary: < 100ms

All indexed operations should perform well.
Use Apache Bench or similar tool to measure:

    ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" \\
       http://localhost:8000/samples/$SAMPLE_ID/status-history
"""

# =============================================================================
# SUCCESS CRITERIA
# =============================================================================

"""
All tests should pass:

✅ History records created on sample creation
✅ History records created on status updates
✅ Transition rules enforced
✅ Comments saved correctly
✅ User identification recorded
✅ Timestamps accurate
✅ Access control working
✅ All endpoints return correct status codes
✅ No data loss in transitions
✅ Performance acceptable
✅ Database indexes working
"""
