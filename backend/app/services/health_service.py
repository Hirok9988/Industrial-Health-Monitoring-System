from collections import deque
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Optional
from pydantic import BaseModel

class MachineThresholds(BaseModel):
    """
    Configurable prototype thresholds for rule-based condition detection.
    These are baseline values and should be experimentally calibrated.
    """
    # Temperature (°C)
    temp_warning: float = 40.0
    temp_critical: float = 50.0
    
    # Current (A)
    current_warning: float = 1.5
    current_critical: float = 2.5
    
    # RPM
    rpm_lower_warning: float = 1500.0
    rpm_lower_critical: float = 1000.0
    
    # Acceleration / Dynamic Mechanical Force (g or m/s²)
    accel_warning: float = 0.5
    accel_critical: float = 1.0
    
    # Legacy aliases
    vibration_warning: float = 0.5
    vibration_critical: float = 1.0


class HealthAssessment(BaseModel):
    health_score: float
    status: str
    abnormal_conditions: List[dict]


class HealthService:
    # In-memory sliding window buffer storing the last 10 readings per machine
    _reading_buffers: Dict[str, deque] = {}
    # Cache for the last evaluated assessment and timestamp per machine
    _last_evaluations: Dict[str, Dict] = {}

    @classmethod
    def calculate_health_score(cls, reading: Dict[str, float], thresholds: MachineThresholds = MachineThresholds()) -> float:
        """
        Calculates a health score from 0 to 100.
        Starts at 100 and deducts points for parameters exceeding warning/critical thresholds.
        """
        score = 100.0
        
        # Temperature deductions
        if reading.get("temperature", 0) >= thresholds.temp_critical:
            score -= 30
        elif reading.get("temperature", 0) >= thresholds.temp_warning:
            score -= 15
            
        # Current deductions
        if reading.get("current", 0) >= thresholds.current_critical:
            score -= 30
        elif reading.get("current", 0) >= thresholds.current_warning:
            score -= 15
            
        # RPM deductions (low RPM is bad)
        if reading.get("rpm", 0) <= thresholds.rpm_lower_critical:
            score -= 30
        elif reading.get("rpm", 0) <= thresholds.rpm_lower_warning:
            score -= 15
            
        # Acceleration / Dynamic force deductions
        accel_val = reading.get("acceleration")
        if accel_val is None:
            accel_val = reading.get("vibration", 0.0)
        accel = float(accel_val or 0.0)

        warn_accel = getattr(thresholds, 'accel_warning', getattr(thresholds, 'vibration_warning', 0.5))
        crit_accel = getattr(thresholds, 'accel_critical', getattr(thresholds, 'vibration_critical', 1.0))
        if accel >= crit_accel:
            score -= 30
        elif accel >= warn_accel:
            score -= 15
            
        return max(0.0, score)

    @classmethod
    def determine_status(cls, health_score: float) -> str:
        """
        Determines machine status based on health score.
        """
        if health_score >= 80:
            return "NORMAL"
        elif health_score >= 50:
            return "WARNING"
        else:
            return "CRITICAL"

    @classmethod
    def detect_possible_conditions(cls, reading: Dict[str, float], thresholds: MachineThresholds = MachineThresholds()) -> List[Dict]:
        """
        Rule-based pattern detection to identify possible abnormal conditions.
        Does NOT provide definitive engineering diagnoses.
        """
        conditions = []
        
        t = reading.get("temperature", 0)
        c = reading.get("current", 0)
        r = reading.get("rpm", 0)
        accel_val = reading.get("acceleration")
        if accel_val is None:
            accel_val = reading.get("vibration", 0.0)
        a = float(accel_val or 0.0)

        warn_accel = getattr(thresholds, 'accel_warning', getattr(thresholds, 'vibration_warning', 0.5))
        crit_accel = getattr(thresholds, 'accel_critical', getattr(thresholds, 'vibration_critical', 1.0))
        param_name = "vibration" if ("vibration" in reading and reading.get("acceleration") is None) else "acceleration"
        param_msg = f"Possible abnormal {param_name}"

        # 1. Temperature ↑ + Current ↑ + RPM ↓
        if t >= thresholds.temp_warning and c >= thresholds.current_warning and r <= thresholds.rpm_lower_warning:
            conditions.append({
                "severity": "CRITICAL",
                "parameter": "multi_parameter",
                "message": "Possible motor overload or mechanical obstruction",
                "value": c,
                "threshold": thresholds.current_warning
            })
            
        # 2. Acceleration ↑ + RPM approx normal + Temp approx normal
        elif a >= warn_accel and r > thresholds.rpm_lower_warning and t < thresholds.temp_warning:
            conditions.append({
                "severity": "WARNING" if a < crit_accel else "CRITICAL",
                "parameter": param_name,
                "message": param_msg,
                "value": a,
                "threshold": warn_accel
            })
            
        # 3. Temperature ↑ without major current/RPM change
        elif t >= thresholds.temp_warning and c < thresholds.current_warning and r > thresholds.rpm_lower_warning:
            conditions.append({
                "severity": "WARNING" if t < thresholds.temp_critical else "CRITICAL",
                "parameter": "temperature",
                "message": "Possible overheating or environmental influence",
                "value": t,
                "threshold": thresholds.temp_warning
            })
            
        # Add single parameter fallbacks if no complex condition caught them
        if not conditions:
            if c >= thresholds.current_warning:
                conditions.append({
                    "severity": "WARNING" if c < thresholds.current_critical else "CRITICAL",
                    "parameter": "current",
                    "message": "Possible abnormal current draw",
                    "value": c,
                    "threshold": thresholds.current_warning
                })
            elif a >= warn_accel:
                conditions.append({
                    "severity": "WARNING" if a < crit_accel else "CRITICAL",
                    "parameter": param_name,
                    "message": param_msg,
                    "value": a,
                    "threshold": warn_accel
                })
            elif t >= thresholds.temp_warning:
                conditions.append({
                    "severity": "WARNING" if t < thresholds.temp_critical else "CRITICAL",
                    "parameter": "temperature",
                    "message": "Possible overheating",
                    "value": t,
                    "threshold": thresholds.temp_warning
                })
                
        return conditions

    @classmethod
    def evaluate(cls, reading: Dict[str, float], thresholds: MachineThresholds = MachineThresholds()) -> HealthAssessment:
        """
        Performs a full health evaluation on a sensor reading.
        """
        score = cls.calculate_health_score(reading, thresholds)
        status = cls.determine_status(score)
        conditions = cls.detect_possible_conditions(reading, thresholds)
        
        return HealthAssessment(
            health_score=score,
            status=status,
            abnormal_conditions=conditions
        )

    @classmethod
    def evaluate_window(
        cls,
        machine_id: str,
        reading: Dict[str, float],
        window_size: int = 10,
        update_interval_seconds: int = 60,
        thresholds: MachineThresholds = MachineThresholds()
    ) -> Tuple[HealthAssessment, bool]:
        """
        Maintains an in-memory sliding buffer of the past 5-10 measurements.
        Re-evaluates and updates the Health Score every `update_interval_seconds` (default: 60s / 1 min).
        Returns: (HealthAssessment, is_newly_evaluated: bool)
        """
        if machine_id not in cls._reading_buffers:
            cls._reading_buffers[machine_id] = deque(maxlen=window_size)

        cls._reading_buffers[machine_id].append(reading)

        now = datetime.now(timezone.utc)
        last_eval = cls._last_evaluations.get(machine_id)

        # Recalculate if first reading or >= 60 seconds have passed since last evaluation
        should_recalculate = False
        if not last_eval:
            should_recalculate = True
        else:
            time_elapsed = (now - last_eval["timestamp"]).total_seconds()
            if time_elapsed >= update_interval_seconds:
                should_recalculate = True

        if should_recalculate:
            window = list(cls._reading_buffers[machine_id])
            n = len(window)

            avg_reading = {
                "temperature": sum(float(r.get("temperature") or 0.0) for r in window) / n,
                "ambient_temp": sum(float(r.get("ambient_temp") or 0.0) for r in window) / n,
                "humidity": sum(float(r.get("humidity") or 0.0) for r in window) / n,
                "current": sum(float(r.get("current") or 0.0) for r in window) / n,
                "rpm": sum(float(r.get("rpm") or 0.0) for r in window) / n,
                "acceleration": sum(float(r.get("acceleration") if r.get("acceleration") is not None else (r.get("vibration") or 0.0)) for r in window) / n,
                "accel_x": sum(float(r.get("accel_x") or 0.0) for r in window) / n,
                "accel_y": sum(float(r.get("accel_y") or 0.0) for r in window) / n,
                "accel_z": sum(float(r.get("accel_z") or 0.0) for r in window) / n,
                "vibration": sum(float(r.get("vibration") if r.get("vibration") is not None else (r.get("acceleration") or 0.0)) for r in window) / n,
            }

            new_assessment = cls.evaluate(avg_reading, thresholds)
            cls._last_evaluations[machine_id] = {
                "timestamp": now,
                "assessment": new_assessment
            }
            return new_assessment, True
        else:
            # Within the 1-minute window: maintain the existing evaluated score and status
            return last_eval["assessment"], False
