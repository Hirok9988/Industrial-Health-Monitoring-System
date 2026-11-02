import logging
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from app.schemas.machine import MachineCreate, MachineUpdate, MachineResponse, MachineSummary
from app.schemas.reading import MachineReading, MachineReadingList
from app.schemas.alert import AlertList
from app.schemas.maintenance_log import MaintenanceLogList
from app.services.machine_service import MachineService
from app.services.reading_service import ReadingService
from app.services.alert_service import AlertService
from app.services.maintenance_service import MaintenanceService
from app.services.firestore_service import machine_exists

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=List[MachineResponse], summary="List all machines")
def list_machines():
    """Returns all registered machines ordered by creation date."""
    machines = MachineService.get_all_machines()
    return machines


@router.get("/{machine_id}", response_model=MachineResponse, summary="Get a machine by ID")
def get_machine(machine_id: str):
    """Returns details for a single registered machine."""
    machine = MachineService.get_machine(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found.")
    return machine


@router.post("", response_model=MachineResponse, status_code=201, summary="Register a new machine")
def create_machine(payload: MachineCreate):
    """Registers a new machine."""
    result = MachineService.create_machine(payload)
    if result is None:
        raise HTTPException(status_code=409, detail=f"Machine '{payload.machine_id}' already exists.")
    return result


@router.put("/{machine_id}", response_model=MachineResponse, summary="Update a machine")
def update_machine(machine_id: str, payload: MachineUpdate):
    """Updates editable fields of an existing machine."""
    result = MachineService.update_machine(machine_id, payload)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found.")
    return result


@router.get("/{machine_id}/latest", response_model=MachineReading, summary="Get latest sensor reading")
def get_latest_reading(machine_id: str):
    """Returns the single most recent sensor reading for a machine."""
    if not machine_exists(machine_id):
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found.")
        
    reading = ReadingService.get_latest_reading(machine_id)
    if not reading:
        raise HTTPException(status_code=404, detail=f"No readings found for machine '{machine_id}'.")
        
    return reading


@router.get("/{machine_id}/history/recent", response_model=MachineReadingList, summary="Get recent sensor readings")
def get_recent_readings(
    machine_id: str, 
    limit: int = Query(50, ge=1, le=500)
):
    """Returns the most recent N sensor readings for a machine."""
    if not machine_exists(machine_id):
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found.")
        
    readings = ReadingService.get_recent_readings(machine_id, limit)
    return MachineReadingList(machine_id=machine_id, count=len(readings), readings=readings)


@router.get("/{machine_id}/history", response_model=MachineReadingList, summary="Get reading history with filtering")
def get_reading_history(
    machine_id: str,
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    limit: int = Query(100, ge=1, le=500)
):
    """Fetch historical sensor readings for a machine, with optional date filtering."""
    if not machine_exists(machine_id):
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found.")
        
    readings = ReadingService.get_history(machine_id, start, end, limit)
    return MachineReadingList(machine_id=machine_id, count=len(readings), readings=readings)


@router.get("/{machine_id}/alerts", response_model=AlertList, summary="Get machine alerts")
def get_machine_alerts(
    machine_id: str,
    limit: int = Query(20, ge=1, le=100),
    acknowledged: Optional[bool] = Query(None)
):
    """Returns alerts for a specific machine."""
    if not machine_exists(machine_id):
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found.")
        
    alerts = AlertService.get_alerts(machine_id, limit, acknowledged)
    return AlertList(machine_id=machine_id, count=len(alerts), alerts=alerts)


@router.get("/{machine_id}/maintenance", response_model=MaintenanceLogList, summary="Get maintenance logs")
def get_maintenance_logs(
    machine_id: str,
    limit: int = Query(50, ge=1, le=100)
):
    """Returns maintenance logs for a specific machine."""
    if not machine_exists(machine_id):
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found.")
        
    logs = MaintenanceService.get_logs(machine_id, limit)
    return MaintenanceLogList(machine_id=machine_id, count=len(logs), logs=logs)


@router.get("/{machine_id}/summary", response_model=MachineSummary, summary="Get machine dashboard summary")
def get_machine_summary(machine_id: str):
    """Returns aggregated summary information for the dashboard."""
    machine = MachineService.get_machine(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found.")
        
    latest_reading = ReadingService.get_latest_reading(machine_id)
    latest_alert = AlertService.get_latest_alert(machine_id)
    
    # We will compute real health scores in a later part.
    # For now, if no score exists on the machine document, we return None as requested.
    health_score = machine.get("health_score") 
    
    # Just fetching recent unacknowledged alerts count
    alerts = AlertService.get_alerts(machine_id, limit=50, acknowledged=False)
    
    return MachineSummary(
        machine_id=machine_id,
        machine_name=machine.get("machine_name"),
        status=machine.get("status"),
        latest_reading=latest_reading,
        health_score=health_score,
        recent_alerts_count=len(alerts),
        latest_alert=latest_alert
    )
