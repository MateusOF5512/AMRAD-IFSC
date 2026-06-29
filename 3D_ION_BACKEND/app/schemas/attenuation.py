from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class AttenuationMeasurementInput(BaseModel):
    thickness: float = Field(..., ge=0, description="Thickness in mm")
    transmission: float = Field(..., gt=0, description="Measured radiation intensity")


class AttenuationTestInput(BaseModel):
    rqr_energy: str = Field(..., min_length=1, description="Beam quality e.g. RQR5")
    i0: float = Field(..., gt=0, description="Reference intensity without barrier")
    measurements: list[AttenuationMeasurementInput] = Field(
        ..., min_length=1, description="Thickness/transmission pairs"
    )


class AttenuationBatchCreate(BaseModel):
    sample_id: str
    tests: list[AttenuationTestInput] = Field(..., min_length=1)


class AttenuationMeasurementResponse(BaseModel):
    id: str
    thickness: float
    transmission: float
    ln_relative: Optional[float] = None


class AttenuationTestResponse(BaseModel):
    id: str
    sample_id: str
    rqr_energy: str
    i0: float
    mu_coefficient: Optional[float] = None
    regression_slope: Optional[float] = None
    regression_intercept: Optional[float] = None
    r_squared: Optional[float] = None
    measurements: list[AttenuationMeasurementResponse] = []
    regression_line: list[dict] = []
    created_at: Optional[datetime] = None


# Legacy linear_attenuation (backward compatibility)
class LinearAttenuationBase(BaseModel):
    sample_id: str = Field(..., description="Reference to sample")
    thickness: float = Field(..., ge=0, description="Sample thickness in mm")
    value_lambert_beer: float = Field(..., description="Lambert-Beer attenuation value")

    @field_validator("thickness")
    @classmethod
    def validate_thickness(cls, v):
        if v < 0:
            raise ValueError("Thickness must be >= 0")
        return v


class LinearAttenuationCreate(LinearAttenuationBase):
    pass


class LinearAttenuationBatchCreate(BaseModel):
    sample_id: str = Field(..., description="Reference to sample")
    measurements: list[dict[str, Optional[float]]] = Field(
        ...,
        description="List of measurements with thickness and value_lambert_beer",
    )


class LinearAttenuationUpdate(BaseModel):
    thickness: Optional[float] = Field(None, ge=0)
    value_lambert_beer: Optional[float] = None


class LinearAttenuationResponse(LinearAttenuationBase):
    id: str
    created_at: datetime

    model_config = {"from_attributes": True}
