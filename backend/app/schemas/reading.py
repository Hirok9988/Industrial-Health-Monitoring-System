from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class MachineReading(BaseModel):
    """A single sensor reading returned from the API."""
    machine_id: str
    timestamp: Optional[datetime] = None
    temperature: Optional[float] = None
    ambient_temp: Optional[float] = None
    humidity: Optional[float] = None
    current: Optional[float] = None
    rpm: Optional[float] = None
    vibration: Optional[float] = None
    acceleration: Optional[float] = None
    accel_x: Optional[float] = None
    accel_y: Optional[float] = None
    accel_z: Optional[float] = None


class MachineReadingList(BaseModel):
    """A paginated list of sensor readings for a machine."""
    machine_id: str
    count: int
    readings: List[MachineReading]
