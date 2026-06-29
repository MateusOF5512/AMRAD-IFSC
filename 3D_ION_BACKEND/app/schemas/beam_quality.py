from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class BeamQualityBase(BaseModel):
    """Base schema for Beam Quality measurements"""
    sample_id: str = Field(..., description="Reference to sample")
    
    # RQR series (Radiation Quality - Radiography)
    rqr_2: Optional[float] = Field(None, description="RQR-2 measurement")
    rqr_3: Optional[float] = Field(None, description="RQR-3 measurement")
    rqr_4: Optional[float] = Field(None, description="RQR-4 measurement")
    rqr_5: Optional[float] = Field(None, description="RQR-5 measurement")
    rqr_6: Optional[float] = Field(None, description="RQR-6 measurement")
    rqr_7: Optional[float] = Field(None, description="RQR-7 measurement")
    rqr_8: Optional[float] = Field(None, description="RQR-8 measurement")
    rqr_9: Optional[float] = Field(None, description="RQR-9 measurement")
    rqr_10: Optional[float] = Field(None, description="RQR-10 measurement")
    
    # RQT series (Radiation Quality - Tomography)
    rqt_8: Optional[float] = Field(None, description="RQT-8 measurement")
    rqt_9: Optional[float] = Field(None, description="RQT-9 measurement")
    rqt_10: Optional[float] = Field(None, description="RQT-10 measurement")
    
    # RQR-M series (Mammography)
    rqr_m1: Optional[float] = Field(None, description="RQR-M1 measurement")
    rqr_m2: Optional[float] = Field(None, description="RQR-M2 measurement")
    rqr_m3: Optional[float] = Field(None, description="RQR-M3 measurement")
    rqr_m4: Optional[float] = Field(None, description="RQR-M4 measurement")


class BeamQualityCreate(BeamQualityBase):
    """Schema for creating beam quality"""
    pass


class BeamQualityUpdate(BaseModel):
    """Schema for updating beam quality"""
    rqr_2: Optional[float] = None
    rqr_3: Optional[float] = None
    rqr_4: Optional[float] = None
    rqr_5: Optional[float] = None
    rqr_6: Optional[float] = None
    rqr_7: Optional[float] = None
    rqr_8: Optional[float] = None
    rqr_9: Optional[float] = None
    rqr_10: Optional[float] = None
    rqt_8: Optional[float] = None
    rqt_9: Optional[float] = None
    rqt_10: Optional[float] = None
    rqr_m1: Optional[float] = None
    rqr_m2: Optional[float] = None
    rqr_m3: Optional[float] = None
    rqr_m4: Optional[float] = None


class BeamQualityResponse(BeamQualityBase):
    """Schema for beam quality response"""
    id: str
    created_at: datetime
    
    model_config = {"from_attributes": True}
