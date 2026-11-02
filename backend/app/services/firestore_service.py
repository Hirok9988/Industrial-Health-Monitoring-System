"""
Shared Firestore collection constants and helper utilities.
Import these in services and routes to avoid magic strings.
"""
from app.core.database import db

# Collection names
MACHINES_COLLECTION = "machines"
READINGS_COLLECTION = "machine_readings"
ALERTS_COLLECTION = "alerts"
MAINTENANCE_LOGS_COLLECTION = "maintenance_logs"


def machine_exists(machine_id: str) -> bool:
    """Return True if a machine document exists in Firestore."""
    return db.collection(MACHINES_COLLECTION).document(machine_id).get().exists
