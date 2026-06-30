from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from supabase import Client
from typing import Optional
import logging

from app.core.security import get_current_user, require_write_access
from app.core.user_utils import get_user_full_name
from app.database.supabase import get_supabase_client
from app.database.sample_status_history import get_status_history_manager
from app.repositories.experiment_repository import fetch_experiment_raw
from app.services.experiment_detail_service import build_experiment_detail_response
from app.services.regression_calculator import RegressionCalculator
from app.services.attenuation_storage import (
    count_attenuation_tests,
    fetch_attenuation_tests_for_sample,
    save_attenuation_tests,
)
from app.schemas.experiment import (
    ExperimentWizardRequest, 
    ExperimentWizardResponse,
    ExperimentsListResponse,
    ExperimentListItem,
    ExperimentSummary,
    ExperimentsSummaryResponse,
    ExperimentStatusCounts,
    ExperimentDetailResponse
)

logger = logging.getLogger(__name__)


def group_samples_by_id(samples: list) -> dict:
    """
    Group samples by ID and aggregate pattern information
    Since multiple rows can have the same sample ID (one per pattern),
    this consolidates them into a single record with pattern array
    
    Returns dict where key=sample_id and value=sample data with patterns array
    """
    grouped = {}
    
    for sample in samples:
        sample_id = sample.get("id")
        if sample_id not in grouped:
            # First time seeing this sample - create base record
            grouped[sample_id] = {
                "id": sample_id,
                "researcher_id": sample.get("researcher_id"),
                "material_id": sample.get("material_id"),
                "machine_id": sample.get("machine_id"),
                "shape_type": sample.get("shape_type"),
                "created_at": sample.get("created_at"),
                "updated_at": sample.get("updated_at"),
                "status": sample.get("status"),
                "index_visual": sample.get("index_visual"),
                "patterns": []
            }
        
        # Add pattern if present
        if sample.get("pattern_type") or sample.get("pattern_type_id"):
            grouped[sample_id]["patterns"].append({
                "pattern_type": sample.get("pattern_type"),
                "pattern_type_id": sample.get("pattern_type_id")
            })
    
    return grouped


router = APIRouter(prefix="/experiments", tags=["Experiments"])


@router.get("/stats/dashboard", response_model=dict)
async def get_dashboard_stats():
    """
    Get platform statistics for dashboard
    - Total approved experiments count
    - Total unique researchers with approved experiments
    - Total unique institutions with approved experiments
    Public endpoint - no authentication required
    Only counts experiments with status = 'Approved'
    """
    supabase: Client = get_supabase_client()
    
    try:
        # Get total approved experiments count (status = 'Approved')
        experiments_response = supabase.table("samples").select("id", count="exact").eq("status", "Approved").execute()
        total_experiments = experiments_response.count if experiments_response.count else 0
        
        # Get unique researchers IDs from approved experiments
        researchers_response = supabase.table("samples").select("researcher_id").eq("status", "Approved").execute()
        unique_researcher_ids = set()
        for sample in (researchers_response.data or []):
            researcher_id = sample.get("researcher_id")
            if researcher_id:
                unique_researcher_ids.add(researcher_id)
        unique_researchers = len(unique_researcher_ids)
        
        # Get unique institutions from researchers who have approved experiments
        if unique_researcher_ids:
            researchers_table = supabase.table("researchers").select("institution").in_("id", list(unique_researcher_ids)).execute()
        else:
            researchers_table = supabase.table("researchers").select("institution").eq("id", "null").execute()
        
        unique_institutions = len(set(
            r.get("institution") for r in (researchers_table.data or [])
            if r.get("institution") and r.get("institution").strip()
        ))
        
        return {
            "success": True,
            "total_experiments": total_experiments,
            "total_researchers": unique_researchers,
            "total_institutions": unique_institutions
        }
    
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {str(e)}")
        return {
            "success": False,
            "total_experiments": 0,
            "total_researchers": 0,
            "total_institutions": 0,
            "error": str(e)
        }


@router.get("/filter-options", response_model=dict)
async def get_filter_options():
    """
    Get available filter options for approved experiments
    Returns unique values for: materials, machines, shapes, institutions
    Only includes data from experiments with status = 'Approved'
    Public endpoint - no authentication required
    """
    supabase: Client = get_supabase_client()
    
    try:
        # Get all approved samples with their related IDs
        approved_samples = supabase.table("samples") \
            .select("id, researcher_id, material_id, machine_id, shape_type") \
            .eq("status", "Approved") \
            .execute()
        
        if not approved_samples.data:
            return {
                "success": True,
                "materials": [],
                "machines": [],
                "shapes": [],
                "institutions": []
            }
        
        # Extract unique IDs
        material_ids = set()
        machine_ids = set()
        researcher_ids = set()
        shapes = set()
        
        for sample in approved_samples.data:
            if sample.get("material_id"):
                material_ids.add(sample.get("material_id"))
            if sample.get("machine_id"):
                machine_ids.add(sample.get("machine_id"))
            if sample.get("researcher_id"):
                researcher_ids.add(sample.get("researcher_id"))
            if sample.get("shape_type"):
                shapes.add(sample.get("shape_type"))
        
        # Fetch materials
        materials_list = []
        if material_ids:
            materials_response = supabase.table("materials") \
                .select("id, brand") \
                .in_("id", list(material_ids)) \
                .execute()
            materials_list = sorted(list(set(
                m.get("brand") for m in (materials_response.data or [])
                if m.get("brand") and m.get("brand").strip()
            )))
        
        # Fetch machines
        machines_list = []
        if machine_ids:
            machines_response = supabase.table("machines") \
                .select("id, brand") \
                .in_("id", list(machine_ids)) \
                .execute()
            machines_list = sorted(list(set(
                m.get("brand") for m in (machines_response.data or [])
                if m.get("brand") and m.get("brand").strip()
            )))
        
        # Fetch institutions
        institutions_list = []
        if researcher_ids:
            researchers_response = supabase.table("researchers") \
                .select("id, institution") \
                .in_("id", list(researcher_ids)) \
                .execute()
            institutions_list = sorted(list(set(
                r.get("institution") for r in (researchers_response.data or [])
                if r.get("institution") and r.get("institution").strip()
            )))
        
        # Format shapes
        shapes_list = sorted(list(shapes))
        
        return {
            "success": True,
            "materials": materials_list,
            "machines": machines_list,
            "shapes": shapes_list,
            "institutions": institutions_list
        }
    
    except Exception as e:
        logger.error(f"Error fetching filter options: {str(e)}")
        return {
            "success": False,
            "materials": [],
            "machines": [],
            "shapes": [],
            "institutions": [],
            "error": str(e)
        }


@router.get("/patterns", response_model=dict)
async def get_available_patterns():
    """
    Get all available pattern types
    Public endpoint - no authentication required
    Returns list of patterns with id and name
    Note: Patterns are predefined and not stored in database
    """
    # Predefined pattern types - matches frontend PATTERN_NAME_MAP
    patterns_data = [
        {"id": "rectilinear", "name": "Rectilinear"},
        {"id": "grid", "name": "Grid"},
        {"id": "line", "name": "Line"},
        {"id": "cubic", "name": "Cubic"},
        {"id": "triangles", "name": "Triangles"},
        {"id": "gyroid", "name": "Gyroid"},
        {"id": "honeycomb", "name": "Honeycomb"},
        {"id": "cross", "name": "Cross"},
        {"id": "3d_honeycomb", "name": "3D Honeycomb"},
        {"id": "hilbert", "name": "Hilbert Curve"},
        {"id": "octagram", "name": "Octagram Spiral"},
        {"id": "crosshatch", "name": "CrossHatch"},
        {"id": "archimedean", "name": "Archimedean Chords"},
    ]
    
    return {
        "success": True,
        "patterns": patterns_data
    }


@router.get("", response_model=ExperimentsListResponse)
async def get_all_experiments(skip: int = 0, limit: int = 100):
    """
    Get all experiments (public endpoint)
    Available without authentication
    Returns lean DTOs with essential fields for dashboard display
    """
    supabase: Client = get_supabase_client()
    
    try:
        # Get samples (experiments) with related material and machine data
        response = supabase.table("samples") \
            .select("""
                id,
                researcher_id,
                shape_type,
                created_at,
                updated_at,
                materials:material_id (id, brand, model, color),
                machines:machine_id (id, brand, model, technology_type)
            """) \
            .eq("status", "Approved") \
            .order("created_at", desc=True) \
            .range(skip, skip + limit - 1) \
            .execute()
        
        experiments = []
        for item in (response.data or []):
            experiments.append(ExperimentListItem(
                id=item.get("id"),
                researcher_id=item.get("researcher_id"),
                shape_type=item.get("shape_type"),
                roi_area_mm2=None,  # Removed from samples table
                created_at=item.get("created_at"),
                updated_at=item.get("updated_at")
            ))
        
        return ExperimentsListResponse(
            success=True,
            count=len(experiments),
            experiments=experiments
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


def _count_experiments_by_status(
    supabase: Client,
    researcher_id: Optional[str] = None,
) -> ExperimentStatusCounts:
    """Count experiments per status, optionally filtered by researcher."""
    status_counts = ExperimentStatusCounts()
    for status_key, attr in [
        ("Submitted", "submitted"),
        ("Revisions", "revisions"),
        ("Review", "review"),
        ("Approved", "approved"),
    ]:
        query = supabase.table("samples").select("id", count="exact").eq("status", status_key)
        if researcher_id:
            query = query.eq("researcher_id", researcher_id)
        count_response = query.execute()
        setattr(status_counts, attr, count_response.count if count_response.count else 0)
    return status_counts


@router.get("/resumo", response_model=ExperimentsSummaryResponse)
async def get_experiments_summary(skip: int = 0, limit: int = 100, researcher_id: Optional[str] = None):
    """
    Get detailed summary of experiments with cross-referenced data
    Includes researcher, material, machine, and technical data summary
    
    Parameters:
    - skip: Number of records to skip (default: 0)
    - limit: Number of records to return (default: 100)
    - researcher_id: Optional filter by researcher ID. When set, returns all statuses
      for that researcher's experiments. Without it, only Approved experiments are returned (public view).
    """
    supabase: Client = get_supabase_client()
    
    try:
        status_counts = _count_experiments_by_status(supabase, researcher_id) if researcher_id else None
        total_count = (
            status_counts.submitted
            + status_counts.revisions
            + status_counts.review
            + status_counts.approved
        ) if status_counts else None

        # Get samples with related data through separate queries
        # First, fetch samples with basic info
        query = supabase.table("samples") \
            .select("id, researcher_id, material_id, machine_id, shape_type, pattern_type, created_at, status, index_visual")
        
        # Public listing shows only approved experiments; researcher view shows all statuses
        if researcher_id:
            query = query.eq("researcher_id", researcher_id)
        else:
            query = query.eq("status", "Approved")
        
        samples_response = query \
            .order("created_at", desc=True) \
            .range(skip, skip + limit - 1) \
            .execute()
        
        if not samples_response.data:
            return ExperimentsSummaryResponse(
                success=True,
                count=total_count or 0,
                experiments=[],
                status_counts=status_counts,
            )
        
        experiments_summary = []
        sample_ids = [s.get("id") for s in samples_response.data]
        
        # Fetch all researchers (map by id)
        researchers_response = supabase.table("researchers").select("id, name, institution").execute()
        researchers_map = {r["id"]: r for r in (researchers_response.data or [])}
        
        # Fetch all materials (map by id)
        materials_response = supabase.table("materials").select("id, brand, model, color").execute()
        materials_map = {m["id"]: m for m in (materials_response.data or [])}
        
        # Fetch all machines (map by id)
        machines_response = supabase.table("machines").select("id, brand, model, technology_type").execute()
        machines_map = {m["id"]: m for m in (machines_response.data or [])}
        
        # Fetch all infill measurements for these samples
        infill_response = supabase.table("infill_measurements") \
            .select("sample_id, hu_mean") \
            .in_("sample_id", sample_ids) \
            .execute()
        infill_map = {}
        for measurement in (infill_response.data or []):
            sample_id = measurement.get("sample_id")
            if sample_id not in infill_map:
                infill_map[sample_id] = []
            infill_map[sample_id].append(measurement)
        
        # Fetch all mechanical properties for these samples
        mech_response = supabase.table("mechanical_properties").select("sample_id, id").execute()
        mech_map = {}
        for mech in (mech_response.data or []):
            sample_id = mech.get("sample_id")
            if sample_id not in mech_map:
                mech_map[sample_id] = False
            mech_map[sample_id] = True
        
        # Fetch all CT scan measurements for these samples
        ct_response = supabase.table("ct_scan_points").select("sample_id, id").in_("sample_id", sample_ids).execute()
        ct_map = {}
        for ct in (ct_response.data or []):
            sample_id = ct.get("sample_id")
            if sample_id not in ct_map:
                ct_map[sample_id] = []
            ct_map[sample_id].append(ct)
        
        # Fetch all linear attenuation measurements for these samples
        attenuation_response = supabase.table("linear_attenuation").select("sample_id, id").in_("sample_id", sample_ids).execute()
        attenuation_map = {}
        for att in (attenuation_response.data or []):
            sample_id = att.get("sample_id")
            if sample_id not in attenuation_map:
                attenuation_map[sample_id] = []
            attenuation_map[sample_id].append(att)

        attenuation_test_counts = count_attenuation_tests(supabase, sample_ids)
        
        # Fetch all beam qualities for these samples
        beam_response = supabase.table("beam_qualities").select("sample_id, id").in_("sample_id", sample_ids).execute()
        beam_map = {}
        for beam in (beam_response.data or []):
            sample_id = beam.get("sample_id")
            if sample_id not in beam_map:
                beam_map[sample_id] = False
            beam_map[sample_id] = True
        
        # Build summaries
        for sample in samples_response.data:
            sample_id = sample.get("id")
            researcher_id_from_sample = sample.get("researcher_id")
            material_id = sample.get("material_id")
            machine_id = sample.get("machine_id")
            
            # Get related data from maps
            researcher = researchers_map.get(researcher_id_from_sample, {})
            material = materials_map.get(material_id, {})
            machine = machines_map.get(machine_id, {})
            
            # Calculate infill metrics
            infill_measurements = infill_map.get(sample_id, [])
            infill_hu_values = [m.get("hu_mean") for m in infill_measurements if m.get("hu_mean")]
            infill_hu_mean = sum(infill_hu_values) / len(infill_hu_values) if infill_hu_values else None
            
            
            # Check mechanical properties
            has_mechanical = mech_map.get(sample_id, False)
            
            # Get CT scan count
            ct_scans = ct_map.get(sample_id, [])
            ct_count = len(ct_scans)
            
            # Get Linear attenuation count (legacy rows + new RQR tests)
            attenuation_measurements = attenuation_map.get(sample_id, [])
            attenuation_count = len(attenuation_measurements) + attenuation_test_counts.get(sample_id, 0)
            
            # Check beam qualities
            has_beam = beam_map.get(sample_id, False)
            
            # Create summary
            summary = ExperimentSummary(
                experiment_id=sample_id,
                index_visual=sample.get("index_visual"),
                status=sample.get("status", "Submitted"),
                created_at=sample.get("created_at"),
                researcher_id=researcher_id_from_sample,
                researcher_name=researcher.get("name"),
                researcher_institution=researcher.get("institution"),
                material_brand=material.get("brand"),
                material_model=material.get("model"),
                material_color=material.get("color"),
                machine_brand=machine.get("brand"),
                machine_model=machine.get("model"),
                machine_technology=machine.get("technology_type"),
                shape_type=sample.get("shape_type"),
                roi_area_mm2=None,  # Removed from samples table
                dimension_a=None,   # Removed from samples table
                dimension_b=None,   # Removed from samples table
                infill_count=len(infill_measurements),
                infill_hu_mean=infill_hu_mean,
                ct_scan_count=ct_count,
                mechanical_tests=has_mechanical,
                attenuation_count=attenuation_count,
                beam_qualities_exists=has_beam
            )
            
            experiments_summary.append(summary)
        
        if total_count is None:
            count_query = supabase.table("samples").select("id", count="exact")
            if researcher_id:
                count_query = count_query.eq("researcher_id", researcher_id)
            else:
                count_query = count_query.eq("status", "Approved")
            total_count = count_query.execute().count or len(experiments_summary)

        return ExperimentsSummaryResponse(
            success=True,
            count=total_count,
            experiments=experiments_summary,
            status_counts=status_counts,
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.get("/{experiment_id}/detalhes", response_model=ExperimentDetailResponse)
async def get_experiment_details(experiment_id: str):
    """
    Get complete details of an approved experiment (public).
    Contact information (email, phone, Instagram) is not exposed.
    """
    try:
        raw = fetch_experiment_raw(experiment_id)
        sample_status = raw["sample"].get("status")
        if sample_status != "Approved":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Experiment not found",
            )
        return build_experiment_detail_response(raw, include_contact=False)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.get("/meus", response_model=ExperimentsListResponse)
async def get_my_experiments(
    current_user: dict = Depends(require_write_access),
    skip: int = 0,
    limit: int = 100
):
    """
    Get all experiments for the current authenticated user
    Only returns experiments belonging to the logged-in researcher
    """
    supabase: Client = get_supabase_client()
    
    try:
        # Get samples with related material and machine data
        response = supabase.table("samples") \
            .select("""
                id,
                researcher_id,
                shape_type,
                created_at,
                updated_at,
                materials:material_id (id, brand, model, color),
                machines:machine_id (id, brand, model, technology_type)
            """) \
            .eq("researcher_id", current_user["user_id"]) \
            .order("created_at", desc=True) \
            .range(skip, skip + limit - 1) \
            .execute()
        
        experiments = []
        for item in (response.data or []):
            experiments.append(ExperimentListItem(
                id=item.get("id"),
                researcher_id=item.get("researcher_id"),
                shape_type=item.get("shape_type"),
                roi_area_mm2=None,  # Removed from samples table
                created_at=item.get("created_at"),
                updated_at=item.get("updated_at")
            ))
        
        return ExperimentsListResponse(
            success=True,
            count=len(experiments),
            experiments=experiments
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.post("/create-material-machine", status_code=status.HTTP_201_CREATED)
async def create_material_and_machine(
    data: dict,
    current_user: dict = Depends(require_write_access)
):
    """
    Create material and machine in one step
    Returns both IDs for subsequent steps
    """
    supabase: Client = get_supabase_client()
    user_id = current_user["user_id"]
    
    try:
        # Create Material
        material_data = data.get("material", {})
        material_response = supabase.table("materials").insert({
            "researcher_id": user_id,
            "brand": material_data.get("brand"),
            "model": material_data.get("model"),
            "color": material_data.get("color"),
            "is_composite": material_data.get("is_composite", False),
            "composite_details": material_data.get("composite_details")
        }).execute()
        
        if not material_response.data:
            raise HTTPException(status_code=400, detail="Failed to create material")
        
        material = material_response.data[0]
        
        # Create Machine
        machine_data = data.get("machine", {})
        machine_response = supabase.table("machines").insert({
            "researcher_id": user_id,
            "brand": machine_data.get("brand"),
            "model": machine_data.get("model"),
            "technology_type": machine_data.get("technology_type"),
            "other_specs": machine_data.get("other_specs")
        }).execute()
        
        if not machine_response.data:
            raise HTTPException(status_code=400, detail="Failed to create machine")
        
        machine = machine_response.data[0]
        
        return {
            "success": True,
            "message": "Material and Machine created successfully",
            "material": {
                "id": material["id"],
                "brand": material["brand"],
                "model": material["model"],
                "color": material["color"],
                "is_composite": material["is_composite"],
                "composite_details": material.get("composite_details")
            },
            "machine": {
                "id": machine["id"],
                "brand": machine["brand"],
                "model": machine["model"],
                "technology_type": machine["technology_type"],
                "other_specs": machine.get("other_specs")
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create material and machine: {str(e)}"
        )


@router.put("/update-material-machine")
async def update_material_and_machine(
    request: Request,
    current_user: dict = Depends(require_write_access)
):
    """
    Update material and machine (for editing existing ones)
    """
    supabase: Client = get_supabase_client()
    
    try:
        data = await request.json()
        material_id = data.get("material_id")
        machine_id = data.get("machine_id")
        material_data = data.get("material", {})
        machine_data = data.get("machine", {})
        
        if not material_id or not machine_id:
            raise HTTPException(status_code=400, detail="Material ID and Machine ID are required")
        
        # Update Material
        material_response = supabase.table("materials").update({
            "brand": material_data.get("brand"),
            "model": material_data.get("model"),
            "color": material_data.get("color"),
            "is_composite": material_data.get("is_composite", False),
            "composite_details": material_data.get("composite_details")
        }).eq("id", material_id).execute()
        
        if not material_response.data:
            raise HTTPException(status_code=400, detail="Failed to update material")
        
        material = material_response.data[0]
        
        # Update Machine
        machine_response = supabase.table("machines").update({
            "brand": machine_data.get("brand"),
            "model": machine_data.get("model"),
            "technology_type": machine_data.get("technology_type"),
            "other_specs": machine_data.get("other_specs")
        }).eq("id", machine_id).execute()
        
        if not machine_response.data:
            raise HTTPException(status_code=400, detail="Failed to update machine")
        
        machine = machine_response.data[0]
        
        return {
            "success": True,
            "message": "Material and Machine updated successfully",
            "data": {
                "material": {
                    "id": material["id"],
                    "brand": material["brand"],
                    "model": material["model"],
                    "color": material["color"],
                    "is_composite": material["is_composite"],
                    "composite_details": material.get("composite_details")
                },
                "machine": {
                    "id": machine["id"],
                    "brand": machine["brand"],
                    "model": machine["model"],
                    "technology_type": machine["technology_type"],
                    "other_specs": machine.get("other_specs")
                }
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update material and machine: {str(e)}"
        )


@router.post("/create-sample", status_code=status.HTTP_201_CREATED)
async def create_sample_partial(
    data: dict = Body(...),
    current_user: dict = Depends(require_write_access)
):
    """
    Create sample with multiple patterns
    Stores pattern_ids as JSON array in pattern_type column
    
    Request body:
    {
        "material_id": "uuid",
        "machine_id": "uuid", 
        "shape_type": "Cube|Cylinder|Other",
        "pattern_ids": ["id1", "id2", ...] // List of pattern IDs or names
    }
    """
    supabase: Client = get_supabase_client()
    history_manager = get_status_history_manager()
    user_id = current_user["user_id"]
    
    try:
        # Validate input
        material_id = data.get("material_id")
        machine_id = data.get("machine_id")
        shape_type = data.get("shape_type")
        pattern_ids = data.get("pattern_ids", [])
        
        if not material_id or not machine_id or not shape_type:
            raise HTTPException(
                status_code=400, 
                detail="Missing required fields: material_id, machine_id, shape_type"
            )
        
        # ✨ NOVO: Se pattern_ids vazio, usar padrão "Generic"
        if not pattern_ids or len(pattern_ids) == 0:
            logger.warning(f"[CREATE-SAMPLE] No pattern_ids provided, using default: 'Generic'")
            pattern_ids = ["Generic"]
        
        # Convert pattern_ids to JSON string
        import json
        patterns_json = json.dumps(pattern_ids)
        
        # Create a single sample row with all patterns stored as JSON
        sample_response = supabase.table("samples").insert({
            "researcher_id": user_id,
            "material_id": material_id,
            "machine_id": machine_id,
            "shape_type": shape_type,
            "pattern_type": patterns_json,  # JSON array como string
            "shape_dimension": data.get("shape_dimension"),
            "circle_roi_area": data.get("circle_roi_area"),
        }).execute()
        
        if not sample_response.data:
            raise HTTPException(status_code=400, detail="Failed to create sample")
        
        sample = sample_response.data[0]
        sample_id = sample["id"]
        
        logger.info(f"[CREATE-SAMPLE] Created sample {sample_id} with {len(pattern_ids)} pattern(s)")
        
        # Record initial submission in status history
        try:
            researcher_name = await get_user_full_name(user_id)
            researcher_email = current_user.get("email", "unknown@example.com")
            
            history_record = history_manager.record_initial_submission(
                sample_id=sample_id,
                researcher_id=user_id,
                researcher_name=researcher_name,
                researcher_email=researcher_email
            )
            
            logger.info(f"[CREATE-SAMPLE] ✓ Status history recorded for {sample_id}")
            
        except Exception as history_error:
            logger.error(f"[CREATE-SAMPLE] ✗ Failed to record status history for {sample_id}: {str(history_error)}")
        
        return {
            "success": True,
            "message": f"Sample created successfully with {len(pattern_ids)} pattern(s)",
            "data": sample,
            "id": sample_id,
            "shape_type": shape_type,
            "pattern_count": len(pattern_ids),
            "pattern_ids": pattern_ids,
            "pattern_type": patterns_json  # ✨ Retornar também a versão JSON
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CREATE-SAMPLE] Error: {str(e)}")
        import traceback
        logger.error(f"[CREATE-SAMPLE] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create sample: {str(e)}"
        )


@router.put("/update-sample/{sample_id}")
async def update_sample(
    sample_id: str,
    request: Request,
    current_user: dict = Depends(require_write_access)
):
    """
    Update an existing sample (for editing)
    Only updates shape_type and pattern_type
    """
    supabase: Client = get_supabase_client()
    
    try:
        # Get JSON body from request
        data = await request.json()
        logger.info(f"Updating sample {sample_id} with data: {data}")
        
        # Prepare update data - only columns that exist in schema
        update_data = {
            "shape_type": data.get("shape_type")
        }
        
        # Update dimension and ROI if provided
        if data.get("shape_dimension") is not None:
            update_data["shape_dimension"] = data.get("shape_dimension")
        if data.get("circle_roi_area") is not None:
            update_data["circle_roi_area"] = data.get("circle_roi_area")
        
        # Update pattern_type if provided
        if "pattern_ids" in data:
            import json
            update_data["pattern_type"] = json.dumps(data.get("pattern_ids", []))
        
        # Update sample
        sample_response = supabase.table("samples").update(update_data).eq("id", sample_id).execute()
        
        logger.info(f"Sample response: {sample_response.data}")
        
        if not sample_response.data:
            raise HTTPException(status_code=400, detail="Failed to update sample")
        
        return {
            "success": True,
            "message": "Sample updated successfully",
            "data": sample_response.data[0]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating sample: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update sample: {str(e)}"
        )


@router.post("/add-infill", status_code=status.HTTP_201_CREATED)
async def add_infill_data(
    data: dict,
    current_user: dict = Depends(require_write_access)
):
    """
    Add infill measurements for a sample (incremental, row-based)
    Each measurement becomes a separate row in the table
    Unique constraint: (sample_id, infill_pct)
    """
    supabase: Client = get_supabase_client()
    
    try:
        sample_id = data.get("sample_id")
        measurements = data.get("measurements", [])
        
        if not sample_id or not measurements:
            raise HTTPException(status_code=400, detail="sample_id and measurements are required")
        
        # ✨ NOVO: Validar que nenhuma medição tem pattern_type null ou vazio
        for measurement in measurements:
            if not measurement.get("pattern_type") or not str(measurement.get("pattern_type")).strip():
                raise HTTPException(
                    status_code=400, 
                    detail="pattern_type é obrigatório em todas as medições de infill. Não pode ser null ou vazio."
                )
            # ✨ Validar hu_mean é obrigatório e > 0
            hu_mean = measurement.get("hu_mean")
            if hu_mean is None or hu_mean == "" or (isinstance(hu_mean, (int, float)) and hu_mean <= 0):
                raise HTTPException(
                    status_code=400,
                    detail="hu_mean é obrigatório e deve ser um valor maior que 0."
                )
        
        # Convert measurements to table row format and insert each one
        infill_rows = []
        for measurement in measurements:
            # Get infill_pct from either field name (infill_pct or infill_percentage)
            infill_pct = measurement.get("infill_pct") or measurement.get("infill_percentage")
            if infill_pct is None:
                raise ValueError("infill_pct is required in measurement")
            
            # Resolver image_url: frontend pode enviar image_urls (array) ou image_url (string)
            image_urls_list = measurement.get("image_urls") or []
            image_url_value = measurement.get("image_url") or (image_urls_list[0] if image_urls_list else None)
            
            row = {
                "sample_id": sample_id,
                "infill_pct": infill_pct,
                "hu_mean": measurement.get("hu_mean"),
                "notes": measurement.get("notes", ""),
                "sd_value": measurement.get("sd_value"),
                "visual_homogeneity": measurement.get("has_homogeneity_issues") or measurement.get("visual_homogeneity"),
                "image_url": image_url_value,
                "pattern_type": measurement.get("pattern_type"),
                "pattern_type_id": measurement.get("pattern_type_id")
            }
            infill_rows.append(row)
        
        # Insert all measurements (will fail on duplicate if same pct already exists)
        response = supabase.table("infill_measurements").insert(infill_rows).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to add infill measurements")
        
        return {
            "success": True,
            "message": f"Added {len(response.data)} infill measurements",
            "count": len(response.data),
            "data": response.data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add infill data: {str(e)}"
        )



@router.post("/add-multiple-infills", status_code=status.HTTP_201_CREATED)
async def add_multiple_infills(
    data: dict,
    current_user: dict = Depends(require_write_access)
):
    """
    Add multiple infill measurements at once, each with associated pattern_type
    Used when a sample has multiple patterns selected
    Each measurement includes pattern_type for linking to specific pattern
    
    Request body:
    {
        "sample_id": "uuid",
        "measurements": [
            {
                "pattern_type": "Rectilinear",
                "infill_pct": 10,
                "hu_mean": 100.5,
                "notes": "..."
            },
            ...
        ]
    }
    """
    supabase: Client = get_supabase_client()
    
    try:
        sample_id = data.get("sample_id")
        measurements = data.get("measurements", [])
        
        if not sample_id or not measurements:
            raise HTTPException(status_code=400, detail="sample_id and measurements are required")
        
        if len(measurements) == 0:
            raise HTTPException(status_code=400, detail="At least one measurement is required")
        
        # ✨ NOVO: Validar que nenhuma medição tem pattern_type null ou vazio
        for measurement in measurements:
            if not measurement.get("pattern_type") or not str(measurement.get("pattern_type")).strip():
                raise HTTPException(
                    status_code=400, 
                    detail="pattern_type é obrigatório em todas as medições de infill. Não pode ser null ou vazio."
                )
            # ✨ Validar hu_mean é obrigatório e > 0
            hu_mean = measurement.get("hu_mean")
            if hu_mean is None or hu_mean == "" or (isinstance(hu_mean, (int, float)) and hu_mean <= 0):
                raise HTTPException(
                    status_code=400,
                    detail="hu_mean é obrigatório e deve ser um valor maior que 0."
                )
        
        # Preparar rows para inserção com pattern_type
        infill_rows = []
        for measurement in measurements:
            # Get infill_pct from either field name (infill_pct or infill_percentage)
            infill_pct = measurement.get("infill_pct") or measurement.get("infill_percentage")
            if infill_pct is None:
                raise ValueError("infill_pct is required in measurement")
            
            # Resolver image_url: frontend pode enviar image_urls (array) ou image_url (string)
            image_urls_list = measurement.get("image_urls") or []
            image_url_value = measurement.get("image_url") or (image_urls_list[0] if image_urls_list else None)

            row = {
                "sample_id": sample_id,
                "infill_pct": infill_pct,
                "hu_mean": measurement.get("hu_mean"),
                "notes": measurement.get("notes") or "",
                "sd_value": measurement.get("sd_value"),
                "visual_homogeneity": measurement.get("has_homogeneity_issues") or measurement.get("visual_homogeneity"),
                "image_url": image_url_value,
                "pattern_type": measurement.get("pattern_type"),
                "pattern_type_id": measurement.get("pattern_type_id"),
            }
            infill_rows.append(row)
        
        # Inserir todos de uma vez
        response = supabase.table("infill_measurements").insert(infill_rows).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to add infill measurements")
        
        logger.info(f"[ADD-MULTIPLE-INFILLS] Created {len(response.data)} measurements for sample {sample_id}")
        
        return {
            "success": True,
            "message": f"Added {len(response.data)} infill measurements",
            "count": len(response.data),
            "data": response.data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ADD-MULTIPLE-INFILLS] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add infill measurements: {str(e)}"
        )


@router.post("/add-mechanical", status_code=status.HTTP_201_CREATED)
async def add_mechanical_data(
    data: dict,
    current_user: dict = Depends(require_write_access)
):
    """Add mechanical properties data for a sample"""
    supabase: Client = get_supabase_client()
    
    try:
        mech_response = supabase.table("mechanical_properties").insert({
            "sample_id": data.get("sample_id"),
            "tensile_modulus_mpa": data.get("tensile_modulus_mpa"),
            "tensile_strength_mpa": data.get("tensile_strength_mpa"),
            "break_deformation_percent": data.get("break_deformation_percent"),
            "impact_charpy_kj_m2": data.get("impact_charpy_kj_m2"),
            "impact_izod": data.get("impact_izod"),
            "hardness_rockwell": data.get("hardness_rockwell"),
            "flexural_modulus_mpa": data.get("flexural_modulus_mpa"),
            "flexural_strength_mpa": data.get("flexural_strength_mpa"),
            "test_condition": data.get("test_condition")
        }).execute()
        
        if not mech_response.data:
            raise HTTPException(status_code=400, detail="Failed to add mechanical data")
        
        return {
            "success": True,
            "message": "Mechanical properties added successfully",
            "data": mech_response.data[0]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add mechanical data: {str(e)}"
        )


@router.post("/add-attenuation", status_code=status.HTTP_201_CREATED)
async def add_attenuation_data(
    data: dict,
    current_user: dict = Depends(require_write_access)
):
    """
    Add attenuation tests (RQR + I0 + thickness/transmission pairs).
    Computes μ via Beer-Lambert regression. Legacy flat measurements still supported.
    """
    supabase: Client = get_supabase_client()

    try:
        sample_id = data.get("sample_id")
        if not sample_id:
            raise HTTPException(status_code=400, detail="sample_id is required")

        tests = data.get("tests")
        if tests:
            saved = save_attenuation_tests(supabase, sample_id, tests)
            if not saved:
                raise HTTPException(
                    status_code=400,
                    detail="Failed to add attenuation tests. Ensure at least 2 valid points per RQR.",
                )
            full = fetch_attenuation_tests_for_sample(supabase, sample_id)
            return {
                "success": True,
                "message": f"Added {len(saved)} attenuation test(s) with computed μ",
                "count": len(saved),
                "data": full[-len(saved) :] if full else saved,
            }

        measurements = data.get("measurements", [])
        if not measurements:
            raise HTTPException(
                status_code=400,
                detail="tests or measurements are required",
            )

        attenuation_rows = []
        for measurement in measurements:
            attenuation_rows.append({
                "sample_id": sample_id,
                "thickness": measurement.get("thickness"),
                "value_lambert_beer": measurement.get("value_lambert_beer"),
            })

        response = supabase.table("linear_attenuation").insert(attenuation_rows).execute()

        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to add attenuation data")

        return {
            "success": True,
            "message": f"Added {len(response.data)} attenuation measurements",
            "count": len(response.data),
            "data": response.data,
        }

    except HTTPException:
        raise
    except Exception as e:
        err = str(e).lower()
        if "attenuation_tests" in err or "does not exist" in err:
            raise HTTPException(
                status_code=503,
                detail="Run migration add_attenuation_tests.sql on the database before using the new attenuation flow.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add attenuation data: {str(e)}",
        )


@router.post("/add-beam", status_code=status.HTTP_201_CREATED)
async def add_beam_data(
    data: dict,
    current_user: dict = Depends(require_write_access)
):
    """Add beam quality data for a sample"""
    supabase: Client = get_supabase_client()
    
    try:
        beam_response = supabase.table("beam_qualities").insert({
            "sample_id": data.get("sample_id"),
            "rqr_2": data.get("rqr_2"),
            "rqr_3": data.get("rqr_3"),
            "rqr_4": data.get("rqr_4"),
            "rqr_5": data.get("rqr_5"),
            "rqr_6": data.get("rqr_6"),
            "rqr_7": data.get("rqr_7"),
            "rqr_8": data.get("rqr_8"),
            "rqr_9": data.get("rqr_9"),
            "rqr_10": data.get("rqr_10"),
            "rqt_8": data.get("rqt_8"),
            "rqt_9": data.get("rqt_9"),
            "rqt_10": data.get("rqt_10"),
            "rqr_m1": data.get("rqr_m1"),
            "rqr_m2": data.get("rqr_m2"),
            "rqr_m3": data.get("rqr_m3"),
            "rqr_m4": data.get("rqr_m4")
        }).execute()
        
        if not beam_response.data:
            raise HTTPException(status_code=400, detail="Failed to add beam quality data")
        
        return {
            "success": True,
            "message": "Beam quality data added successfully",
            "data": beam_response.data[0]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add beam data: {str(e)}"
        )


@router.put("/update-infill/{infill_id}")
async def update_infill_data(
    infill_id: str,
    request: Request,
    current_user: dict = Depends(require_write_access)
):
    """
    Update a specific infill measurement.
    
    Suporta novos campos:
    - dimension_a e dimension_b (regressão)
    - manual_a e manual_b (flags indicando se foram digitadas manualmente)
    
    Se manual_a or manual_b = true, NÃO recalcula regressão automática.
    """
    supabase: Client = get_supabase_client()
    
    try:
        data = await request.json()
        
        # Ler flags indicando modo manual
        manual_a = data.get("manual_a", False)
        manual_b = data.get("manual_b", False)
        
        # Resolver image_url: frontend pode enviar image_urls (array) ou image_url (string)
        image_urls_list = data.get("image_urls") or []
        image_url_value = data.get("image_url") or (image_urls_list[0] if image_urls_list else None)
        
        update_data = {
            "infill_pct": data.get("infill_pct"),
            "hu_mean": data.get("hu_mean"),
            "notes": data.get("notes") or "",
            "sd_value": data.get("sd_value"),
            "visual_homogeneity": data.get("has_homogeneity_issues") or data.get("visual_homogeneity"),
            "image_url": image_url_value,
            "pattern_type": data.get("pattern_type"),
            "pattern_type_id": data.get("pattern_type_id"),
            "dimension_a": data.get("dimension_a"),
            "dimension_b": data.get("dimension_b"),
        }
        
        # Remover campos None, mas permitir dimension_a e dimension_b serem None
        update_data = {
            k: v for k, v in update_data.items() 
            if v is not None or k in ("notes", "image_url", "dimension_a", "dimension_b")
        }
        
        # Atualizar a medição individual
        infill_response = supabase.table("infill_measurements") \
            .update(update_data) \
            .eq("id", infill_id) \
            .execute()
        
        if not infill_response.data:
            raise HTTPException(status_code=400, detail="Failed to update infill measurement")
        
        updated_row = infill_response.data[0]
        
        # 🆕: Calcular regressão automática se necessário
        # (Apenas se nem A nem B foram digitados manualmente)
        if not manual_a and not manual_b:
            logger.info(f"[update_infill_data] Avaliando regressão automática para infill {infill_id}")
            
            # Buscar informações da medição para identificar padrão/amostra
            sample_id = updated_row.get("sample_id")
            pattern_type = updated_row.get("pattern_type")
            
            if sample_id and pattern_type:
                # Buscar TODOS os infills da mesma amostra e padrão
                all_infills = supabase.table("infill_measurements") \
                    .select("*") \
                    .eq("sample_id", sample_id) \
                    .eq("pattern_type", pattern_type) \
                    .execute()
                
                infill_list = all_infills.data or []
                
                if len(infill_list) >= 2:  # Precisa de pelo menos 2 pontos
                    result = RegressionCalculator.calculate_for_pattern_sample(
                        infill_list, 
                        sample_id, 
                        pattern_type
                    )
                    
                    A = result.get('dimension_a')
                    B = result.get('dimension_b')
                    
                    if A is not None and B is not None:
                        # Atualizar TODOS os infills deste padrão com os mesmo A e B
                        supabase.table("infill_measurements") \
                            .update({
                                'dimension_a': A,
                                'dimension_b': B
                            }) \
                            .eq("sample_id", sample_id) \
                            .eq("pattern_type", pattern_type) \
                            .execute()
                        
                        logger.info(
                            f"[update_infill_data] Regressão AUTO calculada para {pattern_type}: "
                            f"A={A:.6f}, B={B:.6f} (R²={result.get('stats', {}).get('r_squared', 0):.4f})"
                        )
                        
                        # Recarregar dados da medição atualizada
                        infill_response = supabase.table("infill_measurements") \
                            .select("*") \
                            .eq("id", infill_id) \
                            .execute()
                        
                        if infill_response.data:
                            updated_row = infill_response.data[0]
                else:
                    logger.warning(
                        f"[update_infill_data] Dados insuficientes para regressão: {len(infill_list)} pontos"
                    )
        else:
            logger.info(
                f"[update_infill_data] Pulando regressão AUTO: "
                f"manual_a={manual_a}, manual_b={manual_b}"
            )
        
        return {
            "success": True,
            "message": "Infill measurement updated successfully",
            "data": updated_row
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[update_infill_data] Exception: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update infill data: {str(e)}"
        )


@router.put("/{experiment_id}/update-infills")
async def batch_update_infills(
    experiment_id: str,
    request: Request,
    current_user: dict = Depends(require_write_access)
):
    """
    Atualiza em lote as medições de infill de um experimento.
    Cada item do array DEVE ter um 'id' (UUID da linha).
    Faz UPDATE WHERE id — nunca cria novas linhas.

    Body:
    {
        "measurements": [
            {
                "id": "uuid-da-linha",
                "hu_mean": 120.50,
                "sd_value": 5.2,
                "visual_homogeneity": 85,
                "notes": "...",
                "image_url": "https://...",
                "dimension_a": 1.5,
                "dimension_b": 2.3
            },
            ...
        ]
    }
    """
    supabase: Client = get_supabase_client()

    try:
        body = await request.json()
        measurements = body.get("measurements", [])
        # 🆕 Ler flags indicando quais padrões têm A/B manuais
        pattern_manual_flags = body.get("pattern_manual_flags", {})

        if not measurements:
            raise HTTPException(status_code=400, detail="Nenhuma medição enviada")

        # ✨ NOVO: Validar que nenhuma medição tem pattern_type null ou vazio
        for measurement in measurements:
            if measurement.get("id") and (not measurement.get("pattern_type") or not str(measurement.get("pattern_type")).strip()):
                raise HTTPException(
                    status_code=400, 
                    detail="pattern_type é obrigatório em todas as medições de infill. Não pode ser null ou vazio."
                )

        # Verificar que o experimento pertence ao pesquisador autenticado
        sample_check = supabase.table("samples") \
            .select("researcher_id") \
            .eq("id", experiment_id) \
            .execute()
        if not sample_check.data:
            raise HTTPException(status_code=404, detail="Experimento não encontrado")
        if sample_check.data[0].get("researcher_id") != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Sem permissão para editar este experimento")

        updated = []
        errors = []
        regression_updates = {}  # Track {(sample_id, pattern_type): (A, B)}
        
        for m in measurements:
            row_id = m.get("id")
            if not row_id:
                errors.append({"error": "id ausente", "item": m})
                continue
            
            # ✨ NOVO: Validar que pattern_type não é null
            if not m.get("pattern_type") or not str(m.get("pattern_type")).strip():
                errors.append({"error": "pattern_type ausente ou vazio", "item": m})
                continue

            # Resolver image_url: frontend pode enviar image_urls (array) ou image_url (string)
            image_urls_list = m.get("image_urls") or []
            image_url_value = m.get("image_url") or (image_urls_list[0] if image_urls_list else None)
            
            update_fields = {
                "hu_mean":              m.get("hu_mean"),
                "sd_value":             m.get("sd_value"),
                "visual_homogeneity":   m.get("has_homogeneity_issues") or m.get("visual_homogeneity"),
                "notes":                m.get("notes") or "",
                "image_url":            image_url_value,
                "pattern_type":         m.get("pattern_type"),
                "pattern_type_id":      m.get("pattern_type_id"),
                "infill_pct":           m.get("infill_pct"),
                "dimension_a":          m.get("dimension_a"),
                "dimension_b":          m.get("dimension_b"),
            }
            # Remover chaves com valor None, EXCETO dimension_a e dimension_b que podem ser null intencionalmente
            # Mas também incluir notes e image_url na exceção
            update_fields = {k: v for k, v in update_fields.items() if v is not None or k in ("notes", "image_url", "dimension_a", "dimension_b")}

            result = supabase.table("infill_measurements") \
                .update(update_fields) \
                .eq("id", row_id) \
                .execute()

            if result.data:
                logger.info(f"[batch_update_infills] Updated row {row_id}: {update_fields}")
                updated.append(result.data[0])
                
                # ✨ NOVO: Rastrear padrões/amostras para calcular regressão depois
                pattern = m.get("pattern_type")
                if pattern and experiment_id:
                    key = (experiment_id, pattern)
                    if key not in regression_updates:
                        regression_updates[key] = True
            else:
                logger.warning(f"[batch_update_infills] Row not found or not updated: {row_id}")
                errors.append({"error": "linha não encontrada ou não atualizada", "id": row_id})

        # ✨ NOVO: Calcular e atualizar coeficientes de regressão (A e B)
        # MAS: NÃO sobrescrever se o usuário digitou manualmente
        if regression_updates:
            logger.info(f"[batch_update_infills] Avaliando regressão para {len(regression_updates)} padrões")
            
            # Buscar all infill data para este experiment
            all_infills = supabase.table("infill_measurements") \
                .select("*") \
                .eq("sample_id", experiment_id) \
                .execute()
            
            infill_list = all_infills.data or []
            
            # Para cada padrão/amostra, calcular A e B APENAS se não forem manuais
            for (sample_id, pattern_type), _ in regression_updates.items():
                # 🆕 Verificar se este padrão tem A ou B manual
                pattern_flags = pattern_manual_flags.get(pattern_type, {})
                manual_a = pattern_flags.get('manual_a', False)
                manual_b = pattern_flags.get('manual_b', False)
                
                # Se QUALQUER um deles for manual, NÃO calcular para preservar entrada do usuário
                if manual_a or manual_b:
                    logger.info(
                        f"[batch_update_infills] Pulando regressão para {pattern_type}: "
                        f"manual_a={manual_a}, manual_b={manual_b} (valores do usuário preservados)"
                    )
                    errors.append({
                        "info": f"Padrão {pattern_type}: Coeficientes manual definidos pelo usuário, regressão automática ignorada"
                    })
                    continue
                
                result = RegressionCalculator.calculate_for_pattern_sample(
                    infill_list, 
                    sample_id, 
                    pattern_type
                )
                
                A = result.get('dimension_a')
                B = result.get('dimension_b')
                
                if A is not None and B is not None:
                    # Atualizar TODOS os infills deste padrão com os mesmo A e B
                    update_data = {
                        'dimension_a': A,
                        'dimension_b': B
                    }
                    
                    try:
                        supabase.table("infill_measurements") \
                            .update(update_data) \
                            .eq("sample_id", sample_id) \
                            .eq("pattern_type", pattern_type) \
                            .execute()
                        
                        logger.info(
                            f"[batch_update_infills] Regressão AUTO calculada para {pattern_type}: "
                            f"A={A:.6f}, B={B:.6f} (R²={result.get('stats', {}).get('r_squared', 0):.4f})"
                        )
                    except Exception as e:
                        logger.error(f"[batch_update_infills] Erro ao atualizar regressão: {str(e)}")
                        errors.append({
                            "warning": f"Regressão não atualizada para {pattern_type}: {str(e)}",
                            "pattern": pattern_type
                        })
                else:
                    logger.warning(
                        f"[batch_update_infills] Não foi possível calcular regressão para {pattern_type}: "
                        f"A={A}, B={B}"
                    )
                    errors.append({
                        "warning": f"Regressão não calculada (dados insuficientes) para {pattern_type}",
                        "pattern": pattern_type
                    })

        return {
            "success": True,
            "updated": len(updated),
            "errors": errors,
            "data": updated,
            "regression_calculated": len(regression_updates)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar medições: {str(e)}"
        )


@router.put("/update-mechanical/{sample_id}")
async def update_mechanical_data(
    sample_id: str,
    request: Request,
    current_user: dict = Depends(require_write_access)
):
    """Update mechanical properties for a sample"""
    supabase: Client = get_supabase_client()
    
    try:
        data = await request.json()
        mech_response = supabase.table("mechanical_properties").update({
            "tensile_modulus_mpa": data.get("tensile_modulus_mpa"),
            "tensile_strength_mpa": data.get("tensile_strength_mpa"),
            "break_deformation_percent": data.get("break_deformation_percent"),
            "impact_charpy_kj_m2": data.get("impact_charpy_kj_m2"),
            "impact_izod": data.get("impact_izod"),
            "hardness_rockwell": data.get("hardness_rockwell"),
            "flexural_modulus_mpa": data.get("flexural_modulus_mpa"),
            "flexural_strength_mpa": data.get("flexural_strength_mpa"),
            "test_condition": data.get("test_condition")
        }).eq("sample_id", sample_id).execute()
        
        if not mech_response.data:
            raise HTTPException(status_code=400, detail="Failed to update mechanical properties")
        
        return {
            "success": True,
            "message": "Mechanical properties updated successfully",
            "data": mech_response.data[0]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update mechanical data: {str(e)}"
        )


@router.put("/update-attenuation/{attenuation_id}")
async def update_attenuation_data(
    attenuation_id: str,
    request: Request,
    current_user: dict = Depends(require_write_access)
):
    """Update a specific linear attenuation measurement"""
    supabase: Client = get_supabase_client()
    
    try:
        data = await request.json()
        attenuation_response = supabase.table("linear_attenuation").update({
            "thickness": data.get("thickness"),
            "value_lambert_beer": data.get("value_lambert_beer")
        }).eq("id", attenuation_id).execute()
        
        if not attenuation_response.data:
            raise HTTPException(status_code=400, detail="Failed to update attenuation measurement")
        
        return {
            "success": True,
            "message": "Attenuation measurement updated successfully",
            "data": attenuation_response.data[0]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update attenuation data: {str(e)}"
        )


@router.put("/update-beam/{sample_id}")
async def update_beam_data(
    sample_id: str,
    request: Request,
    current_user: dict = Depends(require_write_access)
):
    """Update beam quality data for a sample"""
    supabase: Client = get_supabase_client()
    
    try:
        data = await request.json()
        beam_response = supabase.table("beam_qualities").update({
            "rqr_2": data.get("rqr_2"),
            "rqr_3": data.get("rqr_3"),
            "rqr_4": data.get("rqr_4"),
            "rqr_5": data.get("rqr_5"),
            "rqr_6": data.get("rqr_6"),
            "rqr_7": data.get("rqr_7"),
            "rqr_8": data.get("rqr_8"),
            "rqr_9": data.get("rqr_9"),
            "rqr_10": data.get("rqr_10"),
            "rqt_8": data.get("rqt_8"),
            "rqt_9": data.get("rqt_9"),
            "rqt_10": data.get("rqt_10"),
            "rqr_m1": data.get("rqr_m1"),
            "rqr_m2": data.get("rqr_m2"),
            "rqr_m3": data.get("rqr_m3"),
            "rqr_m4": data.get("rqr_m4")
        }).eq("sample_id", sample_id).execute()
        
        if not beam_response.data:
            raise HTTPException(status_code=400, detail="Failed to update beam quality data")
        
        return {
            "success": True,
            "message": "Beam quality data updated successfully",
            "data": beam_response.data[0]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update beam data: {str(e)}"
        )


@router.post("/{experiment_id}/resubmit", status_code=status.HTTP_200_OK)
async def resubmit_experiment(
    experiment_id: str,
    current_user: dict = Depends(require_write_access)
):
    """
    Resubmit experiment after revisions
    Allows researcher to resubmit an experiment from Revisions status back to Submitted
    
    - Records the status change in history: Revisions → Submitted
    - Only researcher who owns the experiment can resubmit
    - Validates that experiment is in Revisions status
    """
    supabase: Client = get_supabase_client()
    history_manager = get_status_history_manager()
    user_id = current_user["user_id"]
    
    try:
        # Verify sample exists and belongs to user
        sample_response = supabase.table("samples") \
            .select("id, status, researcher_id") \
            .eq("id", experiment_id) \
            .eq("researcher_id", user_id) \
            .execute()
        
        if not sample_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Experiment not found or does not belong to you"
            )
        
        sample = sample_response.data[0]
        old_status = sample.get("status")
        new_status = "Submitted"
        
        # Validate that experiment is in Revisions status
        if old_status != "Revisions":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Experiment can only be resubmitted from 'Revisions' status. Current status: {old_status}"
            )
        
        # Validate transition (Revisions → Submitted is always allowed)
        is_valid, error_message = history_manager.validate_status_transition(old_status, new_status)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
        
        # Update sample status
        update_response = supabase.table("samples").update({
            "status": new_status
        }).eq("id", experiment_id).execute()
        
        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update experiment status"
            )
        
        # Record the status change in history
        researcher_name = await get_user_full_name(user_id)
        researcher_email = current_user.get("email", "unknown@example.com")
        
        logger.info(f"[RESUBMIT] Recording status change for experiment {experiment_id}: {old_status} → {new_status}")
        
        history_record = history_manager.record_status_change(
            sample_id=experiment_id,
            old_status=old_status,
            new_status=new_status,
            changed_by_user_id=user_id,
            changed_by_name=researcher_name,
            changed_by_email=researcher_email,
            changed_by_role="pesquisador",
            comment="Resubmitted after revisions",
            is_system_action=False
        )
        
        logger.info(f"[RESUBMIT] ✓ Successfully recorded status history for {experiment_id}: {history_record}")
        
        return {
            "success": True,
            "message": f"Experiment resubmitted successfully",
            "experiment_id": experiment_id,
            "old_status": old_status,
            "new_status": new_status,
            "history_record": history_record
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[RESUBMIT] Error resubmitting experiment: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resubmit experiment: {str(e)}"
        )


@router.post("/{experiment_id}/finalize", status_code=status.HTTP_200_OK)
async def finalize_experiment(
    experiment_id: str,
    current_user: dict = Depends(require_write_access)
):
    """
    Finalize experiment with validation and status update
    BUSINESS RULES (RN-01, RN-02):
    - Sample must exist
    - At least 1 infill measurement must exist
    - Updates status to Submitted and records in history
    Returns success confirmation
    """
    supabase: Client = get_supabase_client()
    history_manager = get_status_history_manager()
    user_id = current_user["user_id"]
    
    try:
        # Verify sample exists and belongs to user
        sample_response = supabase.table("samples") \
            .select("*") \
            .eq("id", experiment_id) \
            .eq("researcher_id", user_id) \
            .execute()
        
        if not sample_response.data:
            raise HTTPException(
                status_code=404,
                detail="Experiment (sample) not found or does not belong to you"
            )
        
        sample = sample_response.data[0]
        old_status = sample.get("status")
        
        # Verify at least 1 infill measurement exists
        infill_response = supabase.table("infill_measurements") \
            .select("id") \
            .eq("sample_id", experiment_id) \
            .execute()
        
        if not infill_response.data:
            raise HTTPException(
                status_code=400,
                detail="At least one infill measurement is required before finalizing"
            )
        
        # Count technical data
        mech_response = supabase.table("mechanical_properties").select("id").eq("sample_id", experiment_id).execute()
        attenuation_response = supabase.table("linear_attenuation").select("id").eq("sample_id", experiment_id).execute()
        beam_response = supabase.table("beam_qualities").select("id").eq("sample_id", experiment_id).execute()
        
        # Update status to Submitted
        new_status = "Submitted"
        logger.info(f"[FINALIZE] Updating experiment {experiment_id} status from {old_status} to {new_status}")
        
        update_response = supabase.table("samples").update({
            "status": new_status
        }).eq("id", experiment_id).execute()
        
        if not update_response.data:
            logger.error(f"[FINALIZE] Failed to update status for {experiment_id}")
            raise HTTPException(
                status_code=500,
                detail="Failed to update experiment status"
            )
        
        # Record status change in history only if status actually changed
        if old_status != new_status:
            try:
                logger.info(f"[FINALIZE] Recording status change for {experiment_id}: {old_status} → {new_status}")
                
                researcher_name = await get_user_full_name(user_id)
                researcher_email = current_user.get("email", "unknown@example.com")
                
                history_record = history_manager.record_status_change(
                    sample_id=experiment_id,
                    old_status=old_status,
                    new_status=new_status,
                    changed_by_user_id=user_id,
                    changed_by_name=researcher_name,
                    changed_by_email=researcher_email,
                    changed_by_role="pesquisador",
                    comment="Experiment finalized and submitted for review",
                    is_system_action=False
                )
                
                logger.info(f"[FINALIZE] ✓ Successfully recorded status history for {experiment_id}")
            except Exception as history_error:
                logger.error(f"[FINALIZE] ✗ Failed to record status history: {str(history_error)}")
                import traceback
                logger.error(f"[FINALIZE] Traceback: {traceback.format_exc()}")
        
        return {
            "success": True,
            "message": "Experiment finalized successfully",
            "experiment_id": experiment_id,
            "status": new_status,
            "technical_data_count": len(infill_response.data or []) + len(mech_response.data or []) + len(attenuation_response.data or []) + len(beam_response.data or [])
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to finalize experiment: {str(e)}"
        )


@router.post("/complete", response_model=ExperimentWizardResponse, status_code=status.HTTP_201_CREATED)
async def create_complete_experiment(
    experiment: ExperimentWizardRequest,
    current_user: dict = Depends(require_write_access)
):
    """
    Create a complete experiment with all data in one request
    This endpoint handles the multi-step form submission from the frontend wizard
    """
    supabase: Client = get_supabase_client()
    user_id = current_user["user_id"]
    
    try:
        # Step 1: Create Material
        material_response = supabase.table("materials").insert({
            "researcher_id": user_id,
            "brand": experiment.material.brand,
            "model": experiment.material.model,
            "color": experiment.material.color,
            "is_composite": experiment.material.is_composite,
            "composite_details": experiment.material.composite_details
        }).execute()
        
        if not material_response.data:
            raise HTTPException(status_code=400, detail="Failed to create material")
        
        material_id = material_response.data[0]["id"]
        
        # Step 2: Create Machine
        machine_response = supabase.table("machines").insert({
            "researcher_id": user_id,
            "brand": experiment.machine.brand,
            "model": experiment.machine.model,
            "technology_type": experiment.machine.technology_type,
            "other_specs": experiment.machine.other_specs
        }).execute()
        
        if not machine_response.data:
            raise HTTPException(status_code=400, detail="Failed to create machine")
        
        machine_id = machine_response.data[0]["id"]
        
        # Step 3: Create Sample
        sample_response = supabase.table("samples").insert({
            "researcher_id": user_id,
            "material_id": material_id,
            "machine_id": machine_id,
            "shape_type": experiment.sample.shape_type,
            "shape_dimension": experiment.sample.shape_dimension,
            "circle_roi_area": experiment.sample.circle_roi_area,
        }).execute()
        
        if not sample_response.data:
            raise HTTPException(status_code=400, detail="Failed to create sample")
        
        sample_id = sample_response.data[0]["id"]
        
        # Step 4: Create Optional Measurements
        
        # Infill Measurements (batch)
        if experiment.infill_measurements:
            infill_rows = []
            for measurement in experiment.infill_measurements:
                infill_pct = measurement.get("infill_pct") or measurement.get("infill_percentage")
                hu_mean = measurement.get("hu_mean") or measurement.get("hu_value")
                if infill_pct is None or hu_mean is None:
                    continue
                infill_rows.append({
                    "sample_id": sample_id,
                    "infill_pct": infill_pct,
                    "hu_mean": hu_mean,
                    "pattern_type": measurement.get("pattern_type"),
                    "notes": measurement.get("notes") or "",
                })
            
            if infill_rows:
                supabase.table("infill_measurements").insert(infill_rows).execute()
        
        # Mechanical Properties
        if experiment.mechanical_properties:
            mp = experiment.mechanical_properties
            supabase.table("mechanical_properties").insert({
                "sample_id": sample_id,
                "tensile_modulus_mpa": mp.tensile_modulus_mpa,
                "tensile_strength_mpa": mp.tensile_strength_mpa,
                "break_deformation_percent": mp.break_deformation_percent,
                "impact_charpy_kj_m2": mp.impact_charpy_kj_m2,
                "impact_izod": mp.impact_izod,
                "hardness_rockwell": mp.hardness_rockwell,
                "flexural_modulus_mpa": mp.flexural_modulus_mpa,
                "flexural_strength_mpa": mp.flexural_strength_mpa,
                "test_condition": mp.test_condition
            }).execute()
        
        # Linear Attenuation (batch)
        if experiment.linear_attenuation:
            attenuation_rows = []
            for attenuation in experiment.linear_attenuation:
                attenuation_rows.append({
                    "sample_id": sample_id,
                    "thickness": attenuation.get("thickness"),
                    "value_lambert_beer": attenuation.get("value_lambert_beer")
                })
            
            if attenuation_rows:
                supabase.table("linear_attenuation").insert(attenuation_rows).execute()
        
        # Beam Qualities
        if experiment.beam_qualities:
            bq = experiment.beam_qualities
            supabase.table("beam_qualities").insert({
                "sample_id": sample_id,
                "rqr_2": bq.rqr_2, "rqr_3": bq.rqr_3, "rqr_4": bq.rqr_4,
                "rqr_5": bq.rqr_5, "rqr_6": bq.rqr_6, "rqr_7": bq.rqr_7,
                "rqr_8": bq.rqr_8, "rqr_9": bq.rqr_9, "rqr_10": bq.rqr_10,
                "rqt_8": bq.rqt_8, "rqt_9": bq.rqt_9, "rqt_10": bq.rqt_10,
                "rqr_m1": bq.rqr_m1, "rqr_m2": bq.rqr_m2,
                "rqr_m3": bq.rqr_m3, "rqr_m4": bq.rqr_m4
            }).execute()
        
        return ExperimentWizardResponse(
            success=True,
            message="Experiment created successfully",
            material_id=material_id,
            machine_id=machine_id,
            sample_id=sample_id,
            experiment_id=sample_id  # Using sample_id as experiment_id
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create experiment: {str(e)}"
        )


# Legacy endpoint - kept for backward compatibility
@router.get("/my-experiments")
async def get_my_experiments_legacy(
    current_user: dict = Depends(require_write_access),
    skip: int = 0,
    limit: int = 100
):
    """
    Legacy endpoint - use /meus instead
    Get all experiments (samples with related data) for current user
    """
    supabase: Client = get_supabase_client()
    
    try:
        # Get samples with related material and machine data
        response = supabase.table("samples") \
            .select("""
                *,
                materials (*),
                machines (*)
            """) \
            .eq("researcher_id", current_user["user_id"]) \
            .order("created_at", desc=True) \
            .range(skip, skip + limit - 1) \
            .execute()
        
        return {
            "success": True,
            "count": len(response.data) if response.data else 0,
            "experiments": response.data or []
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


# ==================== EDIT EXPERIMENT ENDPOINT ====================
# Consolidated endpoint for editing experiments
# Updates material, machine, sample, and all optional data in one call

@router.put("/{experiment_id}/edit")
async def edit_experiment(
    experiment_id: str,
    request: Request,
    current_user: dict = Depends(require_write_access)
):
    """
    Edit a complete experiment (sample + all related data)
    
    Payload structure:
    {
        "material": { id, brand, model, color, is_composite, composite_details },
        "machine": { id, brand, model, technology_type, other_specs },
        "sample": { shape_type, dimension_a, dimension_b, regression_a, regression_b, regression_r_squared, roi_area_mm2 },
        "infill_measurements": [ { id?, infill_pct, hu_mean, notes } ],
        "mechanical_properties": { tensile_modulus_mpa, tensile_strength_mpa, break_deformation_percent, ... },
        "linear_attenuation": [ { id?, thickness, value_lambert_beer } ],
        "beam_qualities": { rqr_2, rqr_3, ..., rqt_8, rqt_9 }
    }
    """
    supabase: Client = get_supabase_client()
    history_manager = get_status_history_manager()
    user_id = current_user["user_id"]
    
    try:
        data = await request.json()
        
        # Get current status BEFORE updating (for history recording)
        current_sample = supabase.table("samples").select("status, researcher_id").eq("id", experiment_id).execute()
        if not current_sample.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Experiment not found"
            )
        
        old_status = current_sample.data[0].get("status")
        new_status = "Review"
        
        # Verify researcher owns this experiment
        if current_sample.data[0].get("researcher_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to edit this experiment"
            )
        
        # 1. Update Sample (experiment) with basic info
        if "sample" in data:
            sample_update = {
                "shape_type": data["sample"].get("shape_type"),
                "shape_dimension": data["sample"].get("shape_dimension"),
                "circle_roi_area": data["sample"].get("circle_roi_area"),
                "status": new_status  # Update status to Review after edit
            }
            supabase.table("samples").update(sample_update).eq("id", experiment_id).execute()
        
        # 2. UPDATE de infill measurements — sempre UPDATE pelo UUID da linha.
        # O frontend envia o campo `id` (UUID) de cada linha existente.
        # Iso garante que apenas a linha correta é alterada, sem criar duplicatas.
        # Ao usar upsert com on_conflict como fallback, resolvemos o caso de linha nova.
        if "infill_measurements" in data and data["infill_measurements"]:
            for infill in data["infill_measurements"]:
                if infill.get("infill_pct") is None or infill.get("hu_mean") is None:
                    continue
                # Resolver image_url: frontend pode enviar image_urls (array) ou image_url (string)
                image_urls_list = infill.get("image_urls") or []
                image_url_value = infill.get("image_url") or (image_urls_list[0] if image_urls_list else None)

                fields = {
                    "infill_pct": infill.get("infill_pct"),
                    "hu_mean": infill.get("hu_mean"),
                    "notes": infill.get("notes") or "",
                    "sd_value": infill.get("sd_value"),
                    "visual_homogeneity": infill.get("visual_homogeneity"),
                    "image_url": image_url_value,
                    "pattern_type": infill.get("pattern_type"),
                    "pattern_type_id": infill.get("pattern_type_id"),
                }

                infill_id = infill.get("id")
                if infill_id:
                    # Linha já existe — UPDATE simples pelo PK
                    supabase.table("infill_measurements") \
                        .update(fields) \
                        .eq("id", infill_id) \
                        .execute()
                else:
                    # Linha nova (não deveria acontecer na edição normal) — upsert seguro
                    fields["sample_id"] = experiment_id
                    supabase.table("infill_measurements") \
                        .upsert(fields, on_conflict="sample_id,pattern_type,infill_pct") \
                        .execute()
        
        # 3. Update Mechanical properties
        if "mechanical_properties" in data and data["mechanical_properties"]:
            mech = data["mechanical_properties"]
            existing = supabase.table("mechanical_properties").select("id").eq("sample_id", experiment_id).execute()
            
            if existing.data:
                # Update existing
                supabase.table("mechanical_properties").update({
                    "tensile_modulus_mpa": mech.get("tensile_modulus_mpa"),
                    "tensile_strength_mpa": mech.get("tensile_strength_mpa"),
                    "break_deformation_percent": mech.get("break_deformation_percent"),
                    "impact_charpy_kj_m2": mech.get("impact_charpy_kj_m2"),
                    "impact_izod": mech.get("impact_izod"),
                    "hardness_rockwell": mech.get("hardness_rockwell"),
                    "flexural_modulus_mpa": mech.get("flexural_modulus_mpa"),
                    "flexural_strength_mpa": mech.get("flexural_strength_mpa"),
                    "test_condition": mech.get("test_condition")
                }).eq("sample_id", experiment_id).execute()
            else:
                # Create new
                supabase.table("mechanical_properties").insert({
                    "sample_id": experiment_id,
                    "tensile_modulus_mpa": mech.get("tensile_modulus_mpa"),
                    "tensile_strength_mpa": mech.get("tensile_strength_mpa"),
                    "break_deformation_percent": mech.get("break_deformation_percent"),
                    "impact_charpy_kj_m2": mech.get("impact_charpy_kj_m2"),
                    "impact_izod": mech.get("impact_izod"),
                    "hardness_rockwell": mech.get("hardness_rockwell"),
                    "flexural_modulus_mpa": mech.get("flexural_modulus_mpa"),
                    "flexural_strength_mpa": mech.get("flexural_strength_mpa"),
                    "test_condition": mech.get("test_condition")
                }).execute()
        
        # 4. Update Linear attenuation (handle both new and existing)
        if "linear_attenuation" in data and data["linear_attenuation"]:
            for attenuation in data["linear_attenuation"]:
                if attenuation.get("id"):
                    # Update existing - validate required fields
                    if attenuation.get("thickness") is not None and attenuation.get("value_lambert_beer") is not None:
                        supabase.table("linear_attenuation").update({
                            "thickness": attenuation.get("thickness"),
                            "value_lambert_beer": attenuation.get("value_lambert_beer")
                        }).eq("id", attenuation.get("id")).execute()
                else:
                    # Create new (only if has valid required fields)
                    if attenuation.get("thickness") is not None and attenuation.get("value_lambert_beer") is not None:
                        supabase.table("linear_attenuation").insert({
                            "sample_id": experiment_id,
                            "thickness": attenuation.get("thickness"),
                            "value_lambert_beer": attenuation.get("value_lambert_beer")
                        }).execute()
        
        # 5. Update Beam qualities
        if "beam_qualities" in data and data["beam_qualities"]:
            beam = data["beam_qualities"]
            existing = supabase.table("beam_qualities").select("id").eq("sample_id", experiment_id).execute()
            
            if existing.data:
                # Update existing
                supabase.table("beam_qualities").update({
                    "rqr_2": beam.get("rqr_2"),
                    "rqr_3": beam.get("rqr_3"),
                    "rqr_4": beam.get("rqr_4"),
                    "rqr_5": beam.get("rqr_5"),
                    "rqr_6": beam.get("rqr_6"),
                    "rqr_7": beam.get("rqr_7"),
                    "rqr_8": beam.get("rqr_8"),
                    "rqr_9": beam.get("rqr_9"),
                    "rqr_10": beam.get("rqr_10"),
                    "rqt_8": beam.get("rqt_8"),
                    "rqt_9": beam.get("rqt_9"),
                }).eq("sample_id", experiment_id).execute()
            else:
                # Create new
                supabase.table("beam_qualities").insert({
                    "sample_id": experiment_id,
                    "rqr_2": beam.get("rqr_2"),
                    "rqr_3": beam.get("rqr_3"),
                    "rqr_4": beam.get("rqr_4"),
                    "rqr_5": beam.get("rqr_5"),
                    "rqr_6": beam.get("rqr_6"),
                    "rqr_7": beam.get("rqr_7"),
                    "rqr_8": beam.get("rqr_8"),
                    "rqr_9": beam.get("rqr_9"),
                    "rqr_10": beam.get("rqr_10"),
                    "rqt_8": beam.get("rqt_8"),
                    "rqt_9": beam.get("rqt_9"),
                }).execute()
        
        # Record status change in history (Revisions → Review when researcher edits)
        if old_status != new_status:
            try:
                logger.info(f"[EDIT] Recording status change for experiment {experiment_id}: {old_status} → {new_status}")
                
                # Validate transition
                is_valid, error_message = history_manager.validate_status_transition(old_status, new_status)
                if not is_valid:
                    logger.warning(f"[EDIT] Invalid transition attempt: {old_status} → {new_status}: {error_message}")
                else:
                    researcher_name = await get_user_full_name(user_id)
                    researcher_email = current_user.get("email", "unknown@example.com")
                    
                    history_record = history_manager.record_status_change(
                        sample_id=experiment_id,
                        old_status=old_status,
                        new_status=new_status,
                        changed_by_user_id=user_id,
                        changed_by_name=researcher_name,
                        changed_by_email=researcher_email,
                        changed_by_role="pesquisador",
                        comment="Updated experiment data",
                        is_system_action=False
                    )
                    logger.info(f"[EDIT] ✓ Successfully recorded status history for {experiment_id}: {history_record}")
            except Exception as e:
                logger.error(f"[EDIT] Error recording history for {experiment_id}: {str(e)}")
                # Don't raise - still return success as the update was already done
        
        return {
            "success": True,
            "message": "Experiment updated successfully",
            "experiment_id": experiment_id,
            "status_changed": old_status != new_status,
            "old_status": old_status,
            "new_status": new_status
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error editing experiment {experiment_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to edit experiment: {str(e)}"
        )

