from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class InfillMeasurementBase(BaseModel):
    """Base schema for Infill Measurement"""
    sample_id: str = Field(..., description="Reference to sample")
    infill_percentage: float = Field(..., ge=0, le=100, description="Infill percentage (0-100)")
    hu_value: Optional[float] = Field(None, description="Hounsfield Unit value")
    notes: Optional[str] = Field(None, max_length=1000, description="Additional notes")
    dimension_a: Optional[float] = Field(None, description="Regression coefficient A (slope)")
    dimension_b: Optional[float] = Field(None, description="Regression coefficient B (intercept)")
    sd_value: Optional[float] = Field(None, description="Standard deviation value")
    has_homogeneity_issues: Optional[bool] = Field(None, description="Whether this infill percentage has homogeneity issues (burrs/defects)")
    visual_homogeneity: Optional[int] = Field(None, ge=0, le=100, description="Visual homogeneity score (0-100) [DEPRECATED: use has_homogeneity_issues instead]")
    pattern_type: Optional[str] = Field(None, description="Pattern type for this measurement")
    
    @field_validator('hu_value')
    @classmethod
    def validate_hu_value(cls, v):
        """Ensure HU value is reasonable if provided"""
        if v is not None and (v < -1024 or v > 3071):
            raise ValueError('HU value must be between -1024 and 3071')
        return v


class InfillMeasurementCreate(InfillMeasurementBase):
    """Schema for creating infill measurement"""
    pass


class InfillMeasurementBatchCreate(BaseModel):
    """Schema for batch creating infill measurements"""
    sample_id: str = Field(..., description="Reference to sample")
    measurements: list[dict[str, Optional[float]]] = Field(
        ..., 
        description="List of measurements with infill_percentage and hu_value"
    )
    notes: Optional[str] = Field(None, max_length=1000)


class InfillMeasurementUpdate(BaseModel):
    """Schema for updating infill measurement"""
    infill_percentage: Optional[float] = Field(None, ge=0, le=100)
    hu_value: Optional[float] = None
    notes: Optional[str] = Field(None, max_length=1000)
    dimension_a: Optional[float] = None
    dimension_b: Optional[float] = None
    sd_value: Optional[float] = None
    has_homogeneity_issues: Optional[bool] = None
    visual_homogeneity: Optional[int] = Field(None, ge=0, le=100)
    pattern_type: Optional[str] = None


class InfillMeasurementResponse(InfillMeasurementBase):
    """Schema for infill measurement response"""
    id: str
    created_at: datetime
    
    model_config = {"from_attributes": True}
