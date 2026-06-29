"""
Performance Test - Measure database operation speeds
Measures performance of all CRUD operations
"""

import os
import time
import uuid
from load_env import load_project_env
from supabase import create_client

load_project_env()

class PerformanceTest:
    def __init__(self):
        self.client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        self.results = {}
    
    def measure_operation(self, operation_name, operation_func):
        """Measure time taken for an operation"""
        start = time.time()
        try:
            result = operation_func()
            elapsed = time.time() - start
            self.results[operation_name] = {
                "time_ms": elapsed * 1000,
                "status": "✓ PASS",
                "result": result
            }
            return elapsed
        except Exception as e:
            elapsed = time.time() - start
            self.results[operation_name] = {
                "time_ms": elapsed * 1000,
                "status": "✗ FAIL",
                "error": str(e)
            }
            raise
    
    def test_insert_performance(self):
        """Test INSERT performance"""
        print("\n" + "="*60)
        print("PERFORMANCE TEST: INSERT Operations")
        print("="*60)
        
        researcher_id = str(uuid.uuid4())
        
        # Create researcher
        print("Testing researcher insert...", end=" ")
        elapsed = self.measure_operation(
            "Insert Researcher",
            lambda: self.client.table('researchers').insert({
                "id": researcher_id,
                "name": f"Performance Test {uuid.uuid4().hex[:8]}",
                "institution": "Performance Test Institution",
                "email": f"perf_{uuid.uuid4().hex[:8]}@test.com"
            }).execute()
        )
        print(f"{elapsed*1000:.2f}ms ✓")
        
        # Create material
        material_id = str(uuid.uuid4())
        print("Testing material insert...", end=" ")
        elapsed = self.measure_operation(
            "Insert Material",
            lambda: self.client.table('materials').insert({
                "id": material_id,
                "researcher_id": researcher_id,
                "brand": "Performance Test",
                "model": "Test Model",
                "color": "Red"
            }).execute()
        )
        print(f"{elapsed*1000:.2f}ms ✓")
        
        # Create machine
        machine_id = str(uuid.uuid4())
        print("Testing machine insert...", end=" ")
        elapsed = self.measure_operation(
            "Insert Machine",
            lambda: self.client.table('machines').insert({
                "id": machine_id,
                "researcher_id": researcher_id,
                "brand": "Performance Test",
                "model": "Test Model",
                "technology_type": "SLA"
            }).execute()
        )
        print(f"{elapsed*1000:.2f}ms ✓")
        
        # Create sample
        sample_id = str(uuid.uuid4())
        print("Testing sample insert...", end=" ")
        elapsed = self.measure_operation(
            "Insert Sample",
            lambda: self.client.table('samples').insert({
                "id": sample_id,
                "researcher_id": researcher_id,
                "material_id": material_id,
                "machine_id": machine_id,
                "shape_type": "Cube",
                "dimension_a": 10.5,
                "dimension_b": 10.5
            }).execute()
        )
        print(f"{elapsed*1000:.2f}ms ✓")
        
        return {
            "researcher_id": researcher_id,
            "material_id": material_id,
            "machine_id": machine_id,
            "sample_id": sample_id
        }
    
    def test_select_performance(self):
        """Test SELECT performance"""
        print("\n" + "="*60)
        print("PERFORMANCE TEST: SELECT Operations")
        print("="*60)
        
        # Test reading 10 records
        print("Testing SELECT (limit 10)...", end=" ")
        elapsed = self.measure_operation(
            "Select Researchers (10)",
            lambda: self.client.table('researchers').select('*').limit(10).execute()
        )
        print(f"{elapsed*1000:.2f}ms ✓")
        
        # Test reading 100 records
        print("Testing SELECT (limit 100)...", end=" ")
        elapsed = self.measure_operation(
            "Select Researchers (100)",
            lambda: self.client.table('researchers').select('*').limit(100).execute()
        )
        print(f"{elapsed*1000:.2f}ms ✓")
        
        # Test with filters
        print("Testing SELECT with filter...", end=" ")
        elapsed = self.measure_operation(
            "Select with Filter",
            lambda: self.client.table('materials').select('*')
                .eq('is_composite', False)
                .limit(10)
                .execute()
        )
        print(f"{elapsed*1000:.2f}ms ✓")
    
    def test_update_performance(self, ids):
        """Test UPDATE performance"""
        print("\n" + "="*60)
        print("PERFORMANCE TEST: UPDATE Operations")
        print("="*60)
        
        researcher_id = ids['researcher_id']
        
        print("Testing single UPDATE...", end=" ")
        elapsed = self.measure_operation(
            "Update Researcher",
            lambda: self.client.table('researchers').update({
                "institution": f"Updated {time.time()}"
            }).eq("id", researcher_id).execute()
        )
        print(f"{elapsed*1000:.2f}ms ✓")
    
    def test_delete_performance(self, ids):
        """Test DELETE performance"""
        print("\n" + "="*60)
        print("PERFORMANCE TEST: DELETE Operations")
        print("="*60)
        
        # Delete in order to respect FK constraints
        sample_id = ids['sample_id']
        machine_id = ids['machine_id']
        material_id = ids['material_id']
        researcher_id = ids['researcher_id']
        
        print("Testing DELETE sample...", end=" ")
        elapsed = self.measure_operation(
            "Delete Sample",
            lambda: self.client.table('samples').delete().eq("id", sample_id).execute()
        )
        print(f"{elapsed*1000:.2f}ms ✓")
        
        print("Testing DELETE machine...", end=" ")
        elapsed = self.measure_operation(
            "Delete Machine",
            lambda: self.client.table('machines').delete().eq("id", machine_id).execute()
        )
        print(f"{elapsed*1000:.2f}ms ✓")
        
        print("Testing DELETE material...", end=" ")
        elapsed = self.measure_operation(
            "Delete Material",
            lambda: self.client.table('materials').delete().eq("id", material_id).execute()
        )
        print(f"{elapsed*1000:.2f}ms ✓")
        
        print("Testing DELETE researcher...", end=" ")
        elapsed = self.measure_operation(
            "Delete Researcher",
            lambda: self.client.table('researchers').delete().eq("id", researcher_id).execute()
        )
        print(f"{elapsed*1000:.2f}ms ✓")
    
    def print_summary(self):
        """Print performance summary"""
        print("\n" + "="*60)
        print("PERFORMANCE SUMMARY")
        print("="*60)
        print()
        print(f"{'Operation':<30} {'Time (ms)':>12} {'Status':>10}")
        print("-" * 60)
        
        total_time = 0
        for operation, data in self.results.items():
            time_ms = data['time_ms']
            status = data['status']
            total_time += time_ms
            print(f"{operation:<30} {time_ms:>12.2f} {status:>10}")
        
        print("-" * 60)
        print(f"{'TOTAL TIME':<30} {total_time:>12.2f}ms")
        print()
        
        # Performance metrics
        print("\nPerformance Metrics:")
        print(f"  Fastest operation: {min([d['time_ms'] for d in self.results.values()]):.2f}ms")
        print(f"  Slowest operation: {max([d['time_ms'] for d in self.results.values()]):.2f}ms")
        print(f"  Average operation: {sum([d['time_ms'] for d in self.results.values()]) / len(self.results):.2f}ms")

def run_performance_tests():
    """Run all performance tests"""
    print("\n" + "⚡ RUNNING PERFORMANCE TESTS" + "⚡".rjust(34))
    
    tester = PerformanceTest()
    
    try:
        # Test INSERT
        ids = tester.test_insert_performance()
        
        # Test SELECT
        tester.test_select_performance()
        
        # Test UPDATE
        tester.test_update_performance(ids)
        
        # Test DELETE
        tester.test_delete_performance(ids)
        
        # Print summary
        tester.print_summary()
        
        print("\n✓ Performance tests completed")
        return True
        
    except Exception as e:
        print(f"\n✗ Performance tests failed: {str(e)}")
        return False

if __name__ == "__main__":
    run_performance_tests()
