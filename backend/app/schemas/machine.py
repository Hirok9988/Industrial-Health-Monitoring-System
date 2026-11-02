from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime, date
from app.schemas.reading import MachineReading
from app.schemas.alert import AlertResponse

class MachineCreate(BaseModel):
    """Schema for registering a new machine."""
    machine_id: str = Field(..., example="MACHINE_01")
    machine_name: str = Field(..., example="Test Motor")
    machine_type: str = Field(..., example="DC Motor")
    location: str = Field(..., example="Laboratory")
    installation_date: Optional[date] = Field(None, example="2024-01-15")
    status: str = Field(default="active", example="active")


class MachineUpdate(BaseModel):
    """Schema for updating an existing machine. All fields are optional."""
    machine_name: Optional[str] = None
    machine_type: Optional[str] = None
    location: Optional[str] = None
    installation_date: Optional[date] = None
    status: Optional[str] = None


class MachineResponse(BaseModel):
    """Schema for machine API responses."""
    machine_id: str
    machine_name: Optional[str] = None
    machine_type: Optional[str] = None
    location: Optional[str] = None
    installation_date: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class MachineSummary(BaseModel):
    """Dashboard summary schema for a machine."""
    machine_id: str
    machine_name: Optional[str] = None
    status: Optional[str] = None
    latest_reading: Optional[MachineReading] = None
    health_score: Optional[float] = None
    recent_alerts_count: int = 0
    latest_alert: Optional[AlertResponse] = None
