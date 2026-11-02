import logging
from typing import List

from google.cloud.firestore_v1.base_query import FieldFilter

from app.core.database import db
from app.services.firestore_service import MAINTENANCE_LOGS_COLLECTION

logger = logging.getLogger(__name__)

class MaintenanceService:
    @classmethod
    def get_logs(cls, machine_id: str, limit: int = 50) -> List[dict]:
        """Fetch maintenance logs for a machine."""
        query = (
            db.collection(MAINTENANCE_LOGS_COLLECTION)
            .where(filter=FieldFilter("machine_id", "==", machine_id))
            .order_by("date", direction="DESCENDING")
            .limit(limit)
        )
        
        docs = query.stream()
        
        logs = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            logs.append(data)
            
        return logs
