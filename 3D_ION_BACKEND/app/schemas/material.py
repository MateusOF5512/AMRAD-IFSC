from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime


class MaterialBase(BaseModel):
    """Base schema for Material"""
    brand: str = Field(..., min_length=1, max_length=100, description="Material brand")
    model: str = Field(..., min_length=1, max_length=100, description="Material model")
    color: str = Field(..., min_length=1, max_length=50, description="Material color")
    is_composite: bool = Field(..., description="Whether material is composite")
    composite_details: Optional[str] = Field(None, max_length=500, description="Composite details if applicable")
    status: Literal['pending', 'approved'] = Field(default='approved', description="Material approval status")
    
    @field_validator('composite_details')
    @classmethod
    def validate_composite_details(cls, v, info):
        """Validate that composite_details is provided when is_composite is True"""
        is_composite = info.data.get('is_composite')
        if is_composite and not v:
            raise ValueError('composite_details is required when is_composite is True')
        return v
    
    @field_validator('brand', 'model', 'color')
    @classmethod
    def validate_not_empty(cls, v):
        """Ensure strings are not empty or whitespace"""
        if not v or not v.strip():
            raise ValueError('Field cannot be empty or whitespace')
        return v.strip()


class MaterialCreate(MaterialBase):
    """Schema for creating a new material"""
    pass


class MaterialUpdate(BaseModel):
    """Schema for updating a material"""
    brand: Optional[str] = Field(None, min_length=1, max_length=100)
    model: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = Field(None, min_length=1, max_length=50)
    is_composite: Optional[bool] = None
    composite_details: Optional[str] = Field(None, max_length=500)
    status: Optional[Literal['pending', 'approved']] = None


class MaterialResponse(MaterialBase):
    """Schema for material response"""
    id: str
    researcher_id: str
    created_at: datetime
    
    model_config = {"from_attributes": True}
