from pydantic import BaseModel
from typing import Optional, Literal
from app.schemas.material import MaterialCreate
from app.schemas.machine import MachineCreate
from app.schemas.sample import SampleCreate
from app.schemas.infill import InfillMeasurementCreate
from app.schemas.mechanical import MechanicalPropertyCreate
from app.schemas.attenuation import LinearAttenuationCreate
from app.schemas.beam_quality import BeamQualityCreate


class ExperimentWizardRequest(BaseModel):
    """
    Complete experiment creation wizard
    Consolidates all data from multi-step form
    """
    # Step 1: Material
    material: MaterialCreate
    
    # Step 2: Machine
    machine: MachineCreate
    
    # Step 3: Sample
    sample: SampleCreate
    
    # Step 4: Measurements (Optional)
    infill_measurements: Optional[list[dict]] = None
    mechanical_properties: Optional[MechanicalPropertyCreate] = None
    linear_attenuation: Optional[list[dict]] = None
    beam_qualities: Optional[BeamQualityCreate] = None


class ExperimentWizardResponse(BaseModel):
    """Response for complete experiment creation"""
    success: bool
    message: str
    material_id: str
    machine_id: str
    sample_id: str
    experiment_id: Optional[str] = None
    
    model_config = {"from_attributes": True}


class ExperimentListItem(BaseModel):
    """
    Lean DTO for experiment listing (public)
    Only includes essential fields for display
    """
    id: str
    researcher_id: str
    shape_type: Optional[str] = None
    roi_area_mm2: Optional[float] = None
    status: Literal['Submitted', 'Revisions', 'Review', 'Approved'] = 'Submitted'
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    model_config = {"from_attributes": True}


class ExperimentsListResponse(BaseModel):
    """Response for experiments list endpoint"""
    success: bool
    count: int
    experiments: list[ExperimentListItem]
    
    model_config = {"from_attributes": True}


class ExperimentSummary(BaseModel):
    """
    Resumo detalhado do experimento cruzando informações de pesquisador, amostra e dados técnicos
    Usado para exibição na interface pública de experimentos
    """
    # Experiment ID and dates
    experiment_id: str
    index_visual: Optional[int] = None
    status: Literal['Submitted', 'Revisions', 'Review', 'Approved'] = 'Submitted'
    created_at: Optional[str] = None
    
    # Researcher info
    researcher_id: Optional[str] = None
    researcher_name: Optional[str] = None
    researcher_institution: Optional[str] = None
    
    # Material info
    material_brand: Optional[str] = None
    material_model: Optional[str] = None
    material_color: Optional[str] = None
    
    # Machine info
    machine_brand: Optional[str] = None
    machine_model: Optional[str] = None
    machine_technology: Optional[str] = None
    
    # Sample info
    shape_type: Optional[str] = None
    roi_area_mm2: Optional[float] = None
    dimension_a: Optional[float] = None
    dimension_b: Optional[float] = None
    
    # Technical summary
    infill_count: int = 0
    infill_hu_mean: Optional[float] = None  # Média dos HU values
    ct_scan_count: int = 0  # Count of CT scan measurements
    mechanical_tests: bool = False
    attenuation_count: int = 0  # Count of linear attenuation measurements
    beam_qualities_exists: bool = False  # Whether beam qualities data exists
    
    model_config = {"from_attributes": True}


class ExperimentStatusCounts(BaseModel):
    """Total experiment counts per status"""
    submitted: int = 0
    revisions: int = 0
    review: int = 0
    approved: int = 0


class ExperimentsSummaryResponse(BaseModel):
    """Response for experiments summary list endpoint"""
    success: bool
    count: int
    experiments: list[ExperimentSummary]
    status_counts: Optional[ExperimentStatusCounts] = None
    
    model_config = {"from_attributes": True}


class ExperimentDetailResponse(BaseModel):
    """Complete experiment details with all related data"""
    # Sample/Experiment info
    experiment_id: str
    index_visual: Optional[int] = None
    researcher_id: str
    material_id: str
    machine_id: str
    status: Literal['Submitted', 'Revisions', 'Review', 'Approved'] = 'Submitted'
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    # Researcher data
    researcher_name: Optional[str] = None
    researcher_institution: Optional[str] = None
    researcher_email: Optional[str] = None
    researcher_phone: Optional[str] = None
    researcher_instagram: Optional[str] = None
    
    # Material data
    material_brand: Optional[str] = None
    material_model: Optional[str] = None
    material_color: Optional[str] = None
    material_is_composite: Optional[bool] = None
    material_composite_details: Optional[str] = None
    
    # Machine data
    machine_brand: Optional[str] = None
    machine_model: Optional[str] = None
    machine_technology: Optional[str] = None
    machine_specs: Optional[str] = None
    
    # Sample data
    shape_type: Optional[str] = None
    shape_dimension: Optional[float] = None
    circle_roi_area: Optional[float] = None
    dimension_a: Optional[float] = None   # Regression coefficient A (slope)
    dimension_b: Optional[float] = None   # Regression coefficient B (intercept)
    pattern_type: Optional[str] = None
    
    # Measurements
    infill_measurements: list[dict] = []
    mechanical_properties: Optional[dict] = None
    linear_attenuation: list[dict] = []
    attenuation_tests: list[dict] = []
    beam_qualities: Optional[dict] = None
    
    model_config = {"from_attributes": True}
