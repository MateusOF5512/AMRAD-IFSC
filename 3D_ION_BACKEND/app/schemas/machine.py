from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime


class MachineBase(BaseModel):
    """Base schema for Machine"""
    brand: str = Field(..., min_length=1, max_length=100, description="Machine brand")
    model: str = Field(..., min_length=1, max_length=100, description="Machine model")
    technology_type: str = Field(..., min_length=1, max_length=100, description="3D printing technology type")
    other_specs: Optional[str] = Field(None, max_length=1000, description="Additional specifications")
    status: Literal['pending', 'approved'] = Field(default='approved', description="Machine approval status")
    
    @field_validator('brand', 'model', 'technology_type')
    @classmethod
    def validate_not_empty(cls, v):
        """Ensure strings are not empty or whitespace"""
        if not v or not v.strip():
            raise ValueError('Field cannot be empty or whitespace')
        return v.strip()


class MachineCreate(MachineBase):
    """Schema for creating a new machine"""
    pass


class MachineUpdate(BaseModel):
    """Schema for updating a machine"""
    brand: Optional[str] = Field(None, min_length=1, max_length=100)
    model: Optional[str] = Field(None, min_length=1, max_length=100)
    technology_type: Optional[str] = Field(None, min_length=1, max_length=100)
    other_specs: Optional[str] = Field(None, max_length=1000)
    status: Optional[Literal['pending', 'approved']] = None


class MachineResponse(MachineBase):
    """Schema for machine response"""
    id: str
    researcher_id: str
    created_at: datetime
    
    model_config = {"from_attributes": True}
