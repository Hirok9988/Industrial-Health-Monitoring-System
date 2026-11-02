import logging
from typing import List, Optional
from datetime import datetime, timezone

from google.cloud.firestore_v1.base_query import FieldFilter

from app.core.database import db
from app.services.firestore_service import ALERTS_COLLECTION

logger = logging.getLogger(__name__)


class AlertService:
    @classmethod
    def get_alerts(cls, machine_id: str, limit: int = 50, acknowledged: Optional[bool] = None) -> List[dict]:
        """Fetch alerts for a machine, optionally filtering by acknowledgment status."""
        query = db.collection(ALERTS_COLLECTION).where(filter=FieldFilter("machine_id", "==", machine_id))
        
        if acknowledged is not None:
            query = query.where(filter=FieldFilter("acknowledged", "==", acknowledged))
            
        # Order by timestamp. Note: if acknowledged filter is used, 
        # a composite index (machine_id, acknowledged, timestamp) will be needed in Firestore.
        query = query.order_by("timestamp", direction="DESCENDING").limit(limit)
        
        docs = query.stream()
        
        alerts = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            alerts.append(data)
            
        return alerts
        
    @classmethod
    def get_latest_alert(cls, machine_id: str) -> Optional[dict]:
        """Fetch the most recent unacknowledged alert for a machine."""
        query = (
            db.collection(ALERTS_COLLECTION)
            .where(filter=FieldFilter("machine_id", "==", machine_id))
            .where(filter=FieldFilter("acknowledged", "==", False))
            .order_by("timestamp", direction="DESCENDING")
            .limit(1)
        )
        
        docs = query.stream()
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            return data
            
        return None

    @classmethod
    def create_alert_if_needed(cls, alert_data: dict) -> bool:
        """
        Deduplication logic:
        Checks if an unacknowledged alert already exists for this machine_id and parameter.
        If it does, we avoid creating a duplicate to prevent alert spam.
        Returns True if a new alert was created, False if deduplicated.
        """
        machine_id = alert_data.get("machine_id")
        parameter = alert_data.get("parameter")
        
        # Check for existing unacknowledged alert for this parameter
        query = (
            db.collection(ALERTS_COLLECTION)
            .where(filter=FieldFilter("machine_id", "==", machine_id))
            .where(filter=FieldFilter("parameter", "==", parameter))
            .where(filter=FieldFilter("acknowledged", "==", False))
            .limit(1)
        )
        
        # Since we just filter by equalities, no composite index beyond single fields is strictly needed,
        # but Firebase might want one for (machine_id, parameter, acknowledged).
        # To avoid new composite index requirements immediately, we can just fetch unacknowledged alerts for the machine
        # and filter by parameter in memory, since unacknowledged alerts per machine are usually few.
        
        unack_alerts = cls.get_alerts(machine_id, limit=50, acknowledged=False)
        for existing in unack_alerts:
            if existing.get("parameter") == parameter:
                # We already have an active alert for this condition
                logger.debug(f"Deduplicated alert for {machine_id} / {parameter}")
                return False
                
        # No active alert for this parameter, create one
        now = datetime.now(timezone.utc)
        alert_data["timestamp"] = now
        alert_data["created_at"] = now
        alert_data["acknowledged"] = False
        
        db.collection(ALERTS_COLLECTION).add(alert_data)
        logger.warning(f"New alert created for {machine_id}: {alert_data.get('message')}")
        return True
