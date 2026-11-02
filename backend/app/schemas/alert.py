"""
Alert schema — data structure only.
Alert generation logic will be implemented in a later part.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class AlertCreate(BaseModel):
    machine_id: str = Field(..., example="MACHINE_01")
    severity: str = Field(..., example="WARNING")         # "INFO", "WARNING", "CRITICAL"
    parameter: str = Field(..., example="temperature")
    message: str = Field(..., example="Temperature exceeded threshold")
    value: float = Field(..., example=45.2)
    threshold: float = Field(..., example=45.0)


class AlertResponse(BaseModel):
    id: str
    machine_id: str
    severity: str
    parameter: str
    message: str
    value: float
    threshold: float
    acknowledged: bool
    timestamp: Optional[datetime] = None
    created_at: Optional[datetime] = None

class AlertList(BaseModel):
    machine_id: str
    count: int
    alerts: List[AlertResponse]
