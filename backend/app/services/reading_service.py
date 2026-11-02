import logging
from typing import List, Optional
from datetime import datetime

from google.cloud.firestore_v1.base_query import FieldFilter

from app.core.database import db
from app.services.firestore_service import READINGS_COLLECTION

logger = logging.getLogger(__name__)

class ReadingService:
    @classmethod
    def get_latest_reading(cls, machine_id: str) -> Optional[dict]:
        """Fetch the single most recent reading for a machine."""
        docs = (
            db.collection(READINGS_COLLECTION)
            .where(filter=FieldFilter("machine_id", "==", machine_id))
            .order_by("timestamp", direction="DESCENDING")
            .limit(1)
            .stream()
        )
        
        # return the first one (there should only be 1 or 0)
        for doc in docs:
            return doc.to_dict()
        return None

    @classmethod
    def get_recent_readings(cls, machine_id: str, limit: int = 50) -> List[dict]:
        """Fetch the most recent N readings for a machine."""
        # Cap limit at 500 as requested
        if limit > 500:
            limit = 500
            
        docs = (
            db.collection(READINGS_COLLECTION)
            .where(filter=FieldFilter("machine_id", "==", machine_id))
            .order_by("timestamp", direction="DESCENDING")
            .limit(limit)
            .stream()
        )
        
        return [doc.to_dict() for doc in docs]

    @classmethod
    def get_history(
        cls, 
        machine_id: str, 
        start: Optional[datetime] = None, 
        end: Optional[datetime] = None, 
        limit: int = 100
    ) -> List[dict]:
        """Fetch readings with optional date/time filtering."""
        if limit > 500:
            limit = 500
            
        query = db.collection(READINGS_COLLECTION).where(filter=FieldFilter("machine_id", "==", machine_id))
        
        if start:
            query = query.where(filter=FieldFilter("timestamp", ">=", start))
        if end:
            query = query.where(filter=FieldFilter("timestamp", "<=", end))
            
        query = query.order_by("timestamp", direction="DESCENDING").limit(limit)
        
        docs = query.stream()
        return [doc.to_dict() for doc in docs]
