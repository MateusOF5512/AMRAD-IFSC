from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class MechanicalPropertyBase(BaseModel):
    """Base schema for Mechanical Properties"""
    sample_id: str = Field(..., description="Reference to sample")
    tensile_modulus_mpa: Optional[float] = Field(None, ge=0, description="Tensile modulus in MPa")
    tensile_strength_mpa: Optional[float] = Field(None, ge=0, description="Tensile strength in MPa")
    break_deformation_percent: Optional[float] = Field(None, ge=0, description="Break deformation percentage")
    impact_charpy_kj_m2: Optional[float] = Field(None, ge=0, description="Charpy impact in kJ/m²")
    impact_izod: Optional[float] = Field(None, ge=0, description="Izod impact")
    hardness_rockwell: Optional[float] = Field(None, description="Rockwell hardness")
    flexural_modulus_mpa: Optional[float] = Field(None, ge=0, description="Flexural modulus in MPa")
    flexural_strength_mpa: Optional[float] = Field(None, ge=0, description="Flexural strength in MPa")
    test_condition: Optional[str] = Field(None, max_length=500, description="Test conditions")
    
    @field_validator(
        'tensile_modulus_mpa', 'tensile_strength_mpa', 'break_deformation_percent',
        'impact_charpy_kj_m2', 'impact_izod', 'flexural_modulus_mpa', 'flexural_strength_mpa'
    )
    @classmethod
    def validate_non_negative(cls, v):
        """Ensure mechanical properties are non-negative if provided"""
        if v is not None and v < 0:
            raise ValueError('Mechanical property values must be non-negative')
        return v


class MechanicalPropertyCreate(MechanicalPropertyBase):
    """Schema for creating mechanical properties"""
    pass


class MechanicalPropertyUpdate(BaseModel):
    """Schema for updating mechanical properties"""
    tensile_modulus_mpa: Optional[float] = Field(None, ge=0)
    tensile_strength_mpa: Optional[float] = Field(None, ge=0)
    break_deformation_percent: Optional[float] = Field(None, ge=0)
    impact_charpy_kj_m2: Optional[float] = Field(None, ge=0)
    impact_izod: Optional[float] = Field(None, ge=0)
    hardness_rockwell: Optional[float] = None
    flexural_modulus_mpa: Optional[float] = Field(None, ge=0)
    flexural_strength_mpa: Optional[float] = Field(None, ge=0)
    test_condition: Optional[str] = Field(None, max_length=500)


class MechanicalPropertyResponse(MechanicalPropertyBase):
    """Schema for mechanical properties response"""
    id: str
    created_at: datetime
    
    model_config = {"from_attributes": True}
