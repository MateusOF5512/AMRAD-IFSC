from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime


class SampleBase(BaseModel):
    """Base schema for Sample"""
    material_id: str = Field(..., description="Reference to material")
    machine_id: str = Field(..., description="Reference to machine")
    shape_type: str = Field(..., min_length=1, max_length=50, description="Sample shape type")
    roi_area_mm2: Optional[float] = Field(None, gt=0, description="ROI area in mm²")
    dimension_a: Optional[float] = Field(None, gt=0, description="Dimension A in mm")
    dimension_b: Optional[float] = Field(None, gt=0, description="Dimension B in mm")
    regression_a: Optional[float] = Field(None, description="Regression coefficient A")
    regression_b: Optional[float] = Field(None, description="Regression coefficient B")
    regression_r_squared: Optional[float] = Field(None, ge=0, le=1, description="R² value (0-1)")
    pattern_ids: Optional[list[str]] = Field(None, description="List of selected pattern type IDs")
    pattern_type: Optional[str] = Field(None, description="JSON serialized pattern_ids for storage")
    
    @field_validator('shape_type')
    @classmethod
    def validate_not_empty(cls, v):
        """Ensure shape_type is not empty"""
        if not v or not v.strip():
            raise ValueError('shape_type cannot be empty')
        return v.strip()
    
    @field_validator('roi_area_mm2', 'dimension_a', 'dimension_b')
    @classmethod
    def validate_positive_dimensions(cls, v):
        """Ensure dimensions are positive if provided"""
        if v is not None and v <= 0:
            raise ValueError('Dimensions must be greater than 0')
        return v


class SampleCreate(SampleBase):
    """Schema for creating a new sample"""
    pass


class SampleUpdate(BaseModel):
    """Schema for updating a sample"""
    material_id: Optional[str] = None
    machine_id: Optional[str] = None
    shape_type: Optional[str] = Field(None, min_length=1, max_length=50)
    roi_area_mm2: Optional[float] = Field(None, gt=0)
    dimension_a: Optional[float] = Field(None, gt=0)
    dimension_b: Optional[float] = Field(None, gt=0)
    regression_a: Optional[float] = None
    regression_b: Optional[float] = None
    regression_r_squared: Optional[float] = Field(None, ge=0, le=1)
    pattern_ids: Optional[list[str]] = None
    pattern_type: Optional[str] = None


class SampleResponse(SampleBase):
    """Schema for sample response"""
    id: str
    researcher_id: str
    status: Literal['Submitted', 'Revisions', 'Review', 'Approved'] = Field(default='Submitted', description="Status of the sample experiment")
    created_at: datetime
    
    model_config = {"from_attributes": True}
