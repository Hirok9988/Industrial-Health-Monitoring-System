from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SensorDataIn(BaseModel):
    """
    Incoming ESP32 payload schema with physical range validation.
    All sensor fields are required — malformed or out-of-range data is rejected with 422.
    """
    machine_id: str = Field(..., example="MACHINE_01")

    # Temperature fields — no strict bounds, just must be numeric
    temperature: float = Field(
        ..., example=36.4,
        description="Motor temperature from DS18B20 (°C)"
    )
    ambient_temp: float = Field(
        ..., example=29.6,
        description="Room temperature from DHT11 (°C)"
    )

    # Humidity — physically bounded 0–100%
    humidity: float = Field(
        ..., ge=0.0, le=100.0,
        example=56.0,
        description="Relative humidity from DHT11 (%). Must be 0–100."
    )

    # Current — cannot be negative
    current: float = Field(
        ..., ge=0.0,
        example=0.68,
        description="Motor current from ACS712 (A). Must be >= 0."
    )

    # RPM — cannot be negative
    rpm: float = Field(
        ..., ge=0.0,
        example=1835.0,
        description="Motor speed from LM393 (RPM). Must be >= 0."
    )

    # Acceleration & 3-Axis Motion from MPU6050
    acceleration: Optional[float] = Field(
        None, ge=0.0,
        example=0.21,
        description="Total dynamic acceleration from MPU6050 (g). Must be >= 0."
    )
    accel_x: Optional[float] = Field(
        0.0, example=0.02,
        description="X-axis lateral acceleration from MPU6050 (g)."
    )
    accel_y: Optional[float] = Field(
        0.0, example=0.04,
        description="Y-axis axial acceleration from MPU6050 (g)."
    )
    accel_z: Optional[float] = Field(
        0.0, example=0.98,
        description="Z-axis vertical acceleration from MPU6050 (g)."
    )

    # Legacy field support (defaults to 0.0 if omitted)
    vibration: Optional[float] = Field(
        0.0, ge=0.0,
        example=0.21,
        description="Legacy acceleration/vibration field for backward compatibility."
    )


class SensorDataResponse(BaseModel):
    """Response returned after a successful sensor data ingestion."""
    success: bool
    message: str
    machine_id: str
    recorded_at: datetime
