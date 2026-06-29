"""
Test Database Operations
Tests CRUD operations on all tables
"""

import os
import time
import uuid
from load_env import load_project_env
from supabase import create_client

load_project_env()

class TestDatabaseOperations:
    def __init__(self):
        self.client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        self.researcher_id = None
        self.material_id = None
        self.machine_id = None
        self.sample_id = None
    
    def test_create_researcher(self):
        """Test creating a researcher"""
        print("\n" + "="*60)
        print("TEST 1: Create Researcher")
        print("="*60)
        
        try:
            researcher_id = str(uuid.uuid4())
            self.researcher_id = researcher_id
            
            response = self.client.table('researchers').insert({
                "id": researcher_id,
                "name": "Test Researcher",
                "institution": "Test Institution",
                "email": f"researcher_{uuid.uuid4().hex[:8]}@test.com",
                "phone_number": "+5511999999999",
                "user_type": "pesquisador"
            }).execute()
            
            if response.data:
                print(f"✓ Researcher created successfully")
                print(f"  ID: {researcher_id}")
                return True
            else:
                print(f"✗ Researcher creation returned no data")
                return False
                
        except Exception as e:
            print(f"✗ Failed to create researcher: {str(e)}")
            return False
    
    def test_create_material(self):
        """Test creating a material"""
        print("\n" + "="*60)
        print("TEST 2: Create Material")
        print("="*60)
        
        if not self.researcher_id:
            print(f"✗ Researcher must be created first")
            return False
        
        try:
            material_id = str(uuid.uuid4())
            self.material_id = material_id
            
            response = self.client.table('materials').insert({
                "id": material_id,
                "researcher_id": self.researcher_id,
                "brand": "Test Brand",
                "model": "Test Model",
                "color": "Red",
                "is_composite": False
            }).execute()
            
            if response.data:
                print(f"✓ Material created successfully")
                print(f"  ID: {material_id}")
                return True
            else:
                print(f"✗ Material creation returned no data")
                return False
                
        except Exception as e:
            print(f"✗ Failed to create material: {str(e)}")
            return False
    
    def test_create_machine(self):
        """Test creating a machine"""
        print("\n" + "="*60)
        print("TEST 3: Create Machine")
        print("="*60)
        
        if not self.researcher_id:
            print(f"✗ Researcher must be created first")
            return False
        
        try:
            machine_id = str(uuid.uuid4())
            self.machine_id = machine_id
            
            response = self.client.table('machines').insert({
                "id": machine_id,
                "researcher_id": self.researcher_id,
                "brand": "Formlabs",
                "model": "Form 3B",
                "technology_type": "SLA"
            }).execute()
            
            if response.data:
                print(f"✓ Machine created successfully")
                print(f"  ID: {machine_id}")
                return True
            else:
                print(f"✗ Machine creation returned no data")
                return False
                
        except Exception as e:
            print(f"✗ Failed to create machine: {str(e)}")
            return False
    
    def test_create_sample(self):
        """Test creating a sample"""
        print("\n" + "="*60)
        print("TEST 4: Create Sample")
        print("="*60)
        
        if not all([self.researcher_id, self.material_id, self.machine_id]):
            print(f"✗ Researcher, Material, and Machine must be created first")
            return False
        
        try:
            sample_id = str(uuid.uuid4())
            self.sample_id = sample_id
            
            response = self.client.table('samples').insert({
                "id": sample_id,
                "researcher_id": self.researcher_id,
                "material_id": self.material_id,
                "machine_id": self.machine_id,
                "shape_type": "Cube",
                "dimension_a": 10.5,
                "dimension_b": 10.5
            }).execute()
            
            if response.data:
                print(f"✓ Sample created successfully")
                print(f"  ID: {sample_id}")
                return True
            else:
                print(f"✗ Sample creation returned no data")
                return False
                
        except Exception as e:
            print(f"✗ Failed to create sample: {str(e)}")
            return False
    
    def test_create_infill_measurement(self):
        """Test creating an infill measurement"""
        print("\n" + "="*60)
        print("TEST 5: Create Infill Measurement")
        print("="*60)
        
        if not self.sample_id:
            print(f"✗ Sample must be created first")
            return False
        
        try:
            response = self.client.table('infill_measurements').insert({
                "sample_id": self.sample_id,
                "infill_pct": 85.5,
                "hu_mean": -200,
                "hu_sd": 50
            }).execute()
            
            if response.data:
                print(f"✓ Infill measurement created successfully")
                return True
            else:
                print(f"✗ Infill measurement creation returned no data")
                return False
                
        except Exception as e:
            print(f"✗ Failed to create infill measurement: {str(e)}")
            return False
    
    def test_read_operations(self):
        """Test reading data"""
        print("\n" + "="*60)
        print("TEST 6: Read Operations")
        print("="*60)
        
        try:
            # Test reading researchers
            researchers = self.client.table('researchers').select('*').limit(5).execute()
            print(f"✓ Read researchers: {len(researchers.data)} records")
            
            # Test reading materials
            materials = self.client.table('materials').select('*').limit(5).execute()
            print(f"✓ Read materials: {len(materials.data)} records")
            
            # Test reading machines
            machines = self.client.table('machines').select('*').limit(5).execute()
            print(f"✓ Read machines: {len(machines.data)} records")
            
            # Test reading samples
            samples = self.client.table('samples').select('*').limit(5).execute()
            print(f"✓ Read samples: {len(samples.data)} records")
            
            return True
            
        except Exception as e:
            print(f"✗ Read operations failed: {str(e)}")
            return False
    
    def test_update_operations(self):
        """Test updating data"""
        print("\n" + "="*60)
        print("TEST 7: Update Operations")
        print("="*60)
        
        if not self.researcher_id:
            print(f"✗ Researcher must be created first")
            return False
        
        try:
            response = self.client.table('researchers').update({
                "institution": "Updated Institution"
            }).eq("id", self.researcher_id).execute()
            
            if response.data:
                print(f"✓ Update researcher successful")
                return True
            else:
                print(f"✗ Update returned no data")
                return False
                
        except Exception as e:
            print(f"✗ Update operation failed: {str(e)}")
            return False
    
    def test_delete_operations(self):
        """Test deleting data"""
        print("\n" + "="*60)
        print("TEST 8: Delete Operations")
        print("="*60)
        
        if not self.sample_id:
            print(f"✗ Sample must be created first")
            return False
        
        try:
            # Delete sample (should cascade to measurements)
            response = self.client.table('samples').delete().eq("id", self.sample_id).execute()
            
            print(f"✓ Delete sample successful")
            
            # Delete machine
            if self.machine_id:
                self.client.table('machines').delete().eq("id", self.machine_id).execute()
                print(f"✓ Delete machine successful")
            
            # Delete material
            if self.material_id:
                self.client.table('materials').delete().eq("id", self.material_id).execute()
                print(f"✓ Delete material successful")
            
            # Delete researcher
            if self.researcher_id:
                self.client.table('researchers').delete().eq("id", self.researcher_id).execute()
                print(f"✓ Delete researcher successful")
            
            return True
            
        except Exception as e:
            print(f"✗ Delete operations failed: {str(e)}")
            return False

def run_all_database_tests():
    """Run all database tests"""
    print("\n" + "🗄️  RUNNING DATABASE OPERATION TESTS" + "🗄️".rjust(26))
    
    tester = TestDatabaseOperations()
    
    results = {
        "Create Researcher": tester.test_create_researcher(),
        "Create Material": tester.test_create_material(),
        "Create Machine": tester.test_create_machine(),
        "Create Sample": tester.test_create_sample(),
        "Create Infill Measurement": tester.test_create_infill_measurement(),
        "Read Operations": tester.test_read_operations(),
        "Update Operations": tester.test_update_operations(),
        "Delete Operations": tester.test_delete_operations()
    }
    
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    all_passed = all(results.values())
    print("\n" + ("✓ ALL TESTS PASSED" if all_passed else "⚠ SOME TESTS FAILED - See details above"))
    print("="*60)
    
    return all_passed

if __name__ == "__main__":
    run_all_database_tests()
