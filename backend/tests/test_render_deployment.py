import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import Settings

class TestRenderDeployment(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_cors_exact_origin_parsing(self):
        """Verify that parsed_allowed_origins strictly trims and isolates exact domains."""
        custom_settings = Settings(
            ALLOWED_ORIGINS="https://ihms-prod.vercel.app, https://my-dashboard.vercel.app , http://localhost:5173"
        )
        origins = custom_settings.parsed_allowed_origins
        self.assertIn("https://ihms-prod.vercel.app", origins)
        self.assertIn("https://my-dashboard.vercel.app", origins)
        self.assertIn("http://localhost:5173", origins)
        self.assertEqual(len(origins), 3)

    def test_health_check_endpoint(self):
        """Verify the health check endpoint for Render health probes."""
        response = self.client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")

    @patch("app.api.routes.sensor_data.machine_exists")
    @patch("app.api.routes.sensor_data.db")
    def test_esp32_legacy_route_compatibility(self, mock_db, mock_machine_exists):
        """Ensure /api/sensor-data alias works alongside /api/v1/sensor-data."""
        mock_machine_exists.return_value = True
        payload = {
            "machine_id": "MACHINE_01",
            "temperature": 28.5,
            "ambient_temp": 26.0,
            "humidity": 55.0,
            "current": 1.2,
            "rpm": 3000.0,
            "acceleration": 0.1
        }
        # Post to legacy alias
        res_legacy = self.client.post("/api/sensor-data", json=payload)
        self.assertEqual(res_legacy.status_code, 200)
        self.assertTrue(res_legacy.json()["success"])

        # Post to v1 route
        res_v1 = self.client.post("/api/v1/sensor-data", json=payload)
        self.assertEqual(res_v1.status_code, 200)
        self.assertTrue(res_v1.json()["success"])

    @patch("app.api.routes.websockets.machine_exists")
    def test_websocket_connection(self, mock_machine_exists):
        """Verify that WebSocket endpoint accepts connections for existing machines."""
        mock_machine_exists.return_value = True
        with self.client.websocket_connect("/ws/v1/machines/MACHINE_01") as websocket:
            self.assertIsNotNone(websocket)

if __name__ == "__main__":
    unittest.main()
