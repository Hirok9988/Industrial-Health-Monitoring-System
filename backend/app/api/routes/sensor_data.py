import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, BackgroundTasks

from app.core.database import db
from app.schemas.sensor_data import SensorDataIn, SensorDataResponse
from app.services.firestore_service import machine_exists, READINGS_COLLECTION, MACHINES_COLLECTION
from app.services.health_service import HealthService
from app.services.alert_service import AlertService
from app.services.websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("", response_model=SensorDataResponse, summary="Receive sensor data from ESP32")
def receive_sensor_data(payload: SensorDataIn, background_tasks: BackgroundTasks):
    """
    Accepts a sensor reading from an ESP32 device.
    - Validates the JSON payload via Pydantic.
    - Evaluates health score and machine status.
    - Generates deduplicated alerts if abnormal conditions are detected.
    - Stores the reading and updates the machine status.
    - Broadcasts the update via WebSockets.
    """
    # 1. Verify machine exists
    if not machine_exists(payload.machine_id):
        logger.warning(f"Sensor data received for unknown machine: {payload.machine_id}")
        raise HTTPException(
            status_code=404,
            detail=f"Machine '{payload.machine_id}' not found. Register the machine first."
        )

    # 2. Evaluate Health Score and Status (Rolling window over past 5-10 samples, updated every 1 min)
    now = datetime.now(timezone.utc)
    reading_dict = payload.model_dump() if hasattr(payload, 'model_dump') else payload.dict()
    
    health_assessment, _ = HealthService.evaluate_window(payload.machine_id, reading_dict)

    # 3. Build the reading document
    accel_val = payload.acceleration if payload.acceleration is not None else (payload.vibration or 0.0)
    accel_x_val = payload.accel_x if payload.accel_x is not None else 0.0
    accel_y_val = payload.accel_y if payload.accel_y is not None else 0.0
    accel_z_val = payload.accel_z if payload.accel_z is not None else 0.0

    reading_data = {
        "machine_id": payload.machine_id,
        "timestamp": now,
        "temperature": payload.temperature,
        "ambient_temp": payload.ambient_temp,
        "humidity": payload.humidity,
        "current": payload.current,
        "rpm": payload.rpm,
        "acceleration": accel_val,
        "accel_x": accel_x_val,
        "accel_y": accel_y_val,
        "accel_z": accel_z_val,
        "vibration": accel_val,  # Retained for backward-compatibility
        "health_score": health_assessment.health_score,
        "status": health_assessment.status
    }

    # 4. Store reading and update machine document
    try:
        # Store reading
        db.collection(READINGS_COLLECTION).add(reading_data)
        
        # Update machine document with latest status
        db.collection(MACHINES_COLLECTION).document(payload.machine_id).update({
            "health_score": health_assessment.health_score,
            "status": health_assessment.status,
            "updated_at": now
        })
        
        logger.info(f"Reading stored for {payload.machine_id} (Score: {health_assessment.health_score}, Status: {health_assessment.status})")
    except Exception as e:
        logger.error(f"Firestore error saving reading: {e}")
        raise HTTPException(status_code=500, detail="Failed to store sensor data.")

    # 5. Process Alerts (Deduplication handled in AlertService)
    for condition in health_assessment.abnormal_conditions:
        alert_payload = {
            "machine_id": payload.machine_id,
            "severity": condition["severity"],
            "parameter": condition["parameter"],
            "message": condition["message"],
            "value": condition["value"],
            "threshold": condition["threshold"],
        }
        AlertService.create_alert_if_needed(alert_payload)

    # 6. Broadcast via WebSocket
    ws_message = {
        "type": "machine_update",
        "machine_id": payload.machine_id,
        "timestamp": now.isoformat(),
        "temperature": payload.temperature,
        "ambient_temp": payload.ambient_temp,
        "humidity": payload.humidity,
        "current": payload.current,
        "rpm": payload.rpm,
        "acceleration": accel_val,
        "accel_x": accel_x_val,
        "accel_y": accel_y_val,
        "accel_z": accel_z_val,
        "vibration": accel_val,
        "health_score": health_assessment.health_score,
        "status": health_assessment.status,
        "possible_conditions": health_assessment.abnormal_conditions
    }
    background_tasks.add_task(manager.broadcast, payload.machine_id, ws_message)

    return SensorDataResponse(
        success=True,
        message="Sensor data received",
        machine_id=payload.machine_id,
        recorded_at=now,
    )
