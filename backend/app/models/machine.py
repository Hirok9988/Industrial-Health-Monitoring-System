from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.core.database import Base


class Machine(Base):
    """
    Represents a registered machine in the system.
    A machine must be registered before it can send sensor data.
    """
    __tablename__ = "machines"

    machine_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=True)
    location = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    readings = relationship("MachineReading", back_populates="machine")
