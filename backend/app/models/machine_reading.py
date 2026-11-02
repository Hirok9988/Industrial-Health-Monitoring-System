from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.core.database import Base


class MachineReading(Base):
    """
    Stores one sensor reading snapshot from the ESP32.
    Each row is one HTTP POST from the device.
    """
    __tablename__ = "machine_readings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    machine_id = Column(String, ForeignKey("machines.machine_id"), nullable=False, index=True)

    # Sensor values from ESP32
    temperature = Column(Float, nullable=True)      # Motor temperature from DS18B20 (°C)
    ambient_temp = Column(Float, nullable=True)     # Room temperature from DHT11 (°C)
    humidity = Column(Float, nullable=True)         # Relative humidity from DHT11 (%)
    current = Column(Float, nullable=True)          # Motor current from ACS712 (A)
    rpm = Column(Float, nullable=True)              # Motor speed from LM393 (RPM)
    vibration = Column(Float, nullable=True)        # Vibration from MPU6050 (m/s²)

    # Server-side timestamp — never trust the device clock
    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    machine = relationship("Machine", back_populates="readings")
