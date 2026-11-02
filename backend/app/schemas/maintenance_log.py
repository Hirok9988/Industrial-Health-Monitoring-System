"""
Maintenance log schema — data structure only.
Maintenance management logic will be implemented in a later part.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from datetime import date as dt_date


class MaintenanceLogCreate(BaseModel):
    machine_id: str = Field(..., example="MACHINE_01")
    date: dt_date = Field(..., example="2024-10-01")
    maintenance_type: str = Field(..., example="Inspection")
    description: str = Field(..., example="Routine inspection of motor bearings")
    technician: str = Field(..., example="John Doe")


class MaintenanceLogResponse(MaintenanceLogCreate):
    id: str
    created_at: Optional[datetime] = None


class MaintenanceLogList(BaseModel):
    machine_id: str
    count: int
    logs: List[MaintenanceLogResponse]
