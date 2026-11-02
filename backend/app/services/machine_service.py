import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from app.core.database import db
from app.schemas.machine import MachineCreate, MachineUpdate

logger = logging.getLogger(__name__)

class MachineService:
    collection_name = "machines"

    @classmethod
    def create_machine(cls, machine_data: MachineCreate) -> Dict[str, Any]:
        machine_ref = db.collection(cls.collection_name).document(machine_data.machine_id)
        
        if machine_ref.get().exists:
            return None # Indicate it already exists

        now = datetime.now(timezone.utc)
        
        # Convert date to string if present
        install_date = machine_data.installation_date.isoformat() if machine_data.installation_date else None

        doc_data = {
            "machine_id": machine_data.machine_id,
            "machine_name": machine_data.machine_name,
            "machine_type": machine_data.machine_type,
            "location": machine_data.location,
            "installation_date": install_date,
            "status": machine_data.status,
            "created_at": now,
            "updated_at": now,
        }

        machine_ref.set(doc_data)
        return doc_data

    @classmethod
    def get_machine(cls, machine_id: str) -> Optional[Dict[str, Any]]:
        doc = db.collection(cls.collection_name).document(machine_id).get()
        if doc.exists:
            return doc.to_dict()
        return None

    @classmethod
    def get_all_machines(cls, limit: int = 100) -> List[Dict[str, Any]]:
        # Use order_by and limit as requested
        docs = db.collection(cls.collection_name).order_by("created_at").limit(limit).stream()
        return [doc.to_dict() for doc in docs]

    @classmethod
    def update_machine(cls, machine_id: str, update_data: MachineUpdate) -> Optional[Dict[str, Any]]:
        machine_ref = db.collection(cls.collection_name).document(machine_id)
        
        if not machine_ref.get().exists:
            return None
            
        update_dict = update_data.model_dump(exclude_unset=True)
        
        if not update_dict:
            return machine_ref.get().to_dict() # Nothing to update
            
        # Handle date conversion if present
        if "installation_date" in update_dict and update_dict["installation_date"]:
            update_dict["installation_date"] = update_dict["installation_date"].isoformat()
            
        update_dict["updated_at"] = datetime.now(timezone.utc)
        
        machine_ref.update(update_dict)
        return machine_ref.get().to_dict()
