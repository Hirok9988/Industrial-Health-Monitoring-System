from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import unittest
import json

from app.main import app

client = TestClient(app)

class TestAPIEndpoints(unittest.TestCase):

    def test_health_check(self):
        response = client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "service": "industrial-machine-monitoring-api"})

    @patch("app.api.routes.sensor_data.machine_exists")
    @patch("app.api.routes.sensor_data.db")
    def test_sensor_data_ingestion_success(self, mock_db, mock_machine_exists):
        mock_machine_exists.return_value = True
        
        payload = {
            "machine_id": "MACHINE_01",
            "temperature": 35.0,
            "ambient_temp": 30.0,
            "humidity": 50.0,
            "current": 1.0,
            "rpm": 1800.0,
            "vibration": 0.2
        }
        
        response = client.post("/api/v1/sensor-data", json=payload)
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertEqual(response.json()["machine_id"], "MACHINE_01")
        
        # Verify db.collection("machine_readings").add was called
        mock_db.collection.assert_called()

    @patch("app.api.routes.sensor_data.machine_exists")
    def test_sensor_data_unknown_machine(self, mock_machine_exists):
        # Simulate machine not existing
        mock_machine_exists.return_value = False
        
        payload = {
            "machine_id": "UNKNOWN_MACHINE",
            "temperature": 35.0,
            "ambient_temp": 30.0,
            "humidity": 50.0,
            "current": 1.0,
            "rpm": 1800.0,
            "vibration": 0.2
        }
        
        response = client.post("/api/v1/sensor-data", json=payload)
        
        # Should return 404
        self.assertEqual(response.status_code, 404)
        self.assertIn("not found", response.json()["detail"])

    def test_sensor_data_invalid_payload(self):
        # Missing required temperature
        payload = {
            "machine_id": "MACHINE_01",
            "ambient_temp": 30.0,
            "humidity": 50.0,
            "current": 1.0,
            "rpm": 1800.0,
            "vibration": 0.2
        }
        
        response = client.post("/api/v1/sensor-data", json=payload)
        
        # Pydantic validation should fail with 422
        self.assertEqual(response.status_code, 422)

    @patch("app.api.routes.sensor_data.machine_exists")
    @patch("app.api.routes.sensor_data.db")
    def test_sensor_data_firestore_failure(self, mock_db, mock_machine_exists):
        mock_machine_exists.return_value = True
        
        # Simulate firestore throwing an error during add()
        mock_collection = MagicMock()
        mock_collection.add.side_effect = Exception("Firestore offline")
        mock_db.collection.return_value = mock_collection
        
        payload = {
            "machine_id": "MACHINE_01",
            "temperature": 35.0,
            "ambient_temp": 30.0,
            "humidity": 50.0,
            "current": 1.0,
            "rpm": 1800.0,
            "vibration": 0.2
        }
        
        response = client.post("/api/v1/sensor-data", json=payload)
        
        # Should gracefully return 500 without crashing
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["detail"], "Failed to store sensor data.")

    @patch("app.api.routes.sensor_data.machine_exists")
    @patch("app.api.routes.sensor_data.db")
    def test_sensor_data_ingestion_with_acceleration(self, mock_db, mock_machine_exists):
        mock_machine_exists.return_value = True
        
        payload = {
            "machine_id": "MACHINE_01",
            "temperature": 35.0,
            "ambient_temp": 30.0,
            "humidity": 50.0,
            "current": 1.0,
            "rpm": 1800.0,
            "acceleration": 0.22,
            "accel_x": 0.08,
            "accel_y": 0.15,
            "accel_z": 0.12
        }
        
        response = client.post("/api/v1/sensor-data", json=payload)
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertEqual(response.json()["machine_id"], "MACHINE_01")
        mock_db.collection.assert_called()

if __name__ == "__main__":
    unittest.main()
