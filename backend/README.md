# Industrial Health Monitoring System - Backend

## 1. Project Overview
This project provides the backend infrastructure for an IoT-based Multi-Sensor Industrial Machine Health Monitoring & Early Fault Detection System. It receives real-time telemetry from ESP32 microcontrollers, stores it securely in Firebase Cloud Firestore, performs rule-based health assessment and alerting, and broadcasts updates instantly to React dashboards via WebSockets.

## 2. Architecture
The architecture is designed to cleanly separate ingestion, processing, and real-time frontend delivery:
**ESP32 → HTTP POST → FastAPI → Firestore → React Dashboard (via REST and WebSockets)**

## 3. Technology Stack
- **Python 3.9+**
- **FastAPI**: High-performance asynchronous API framework.
- **Uvicorn**: ASGI web server.
- **Pydantic**: Data validation and settings management.
- **Firebase Admin SDK**: Server-side Firestore access.
- **WebSockets**: Real-time push updates to the dashboard.

## 4. Project Structure
```text
backend/
├── app/
│   ├── api/
│   │   └── routes/
│   │       ├── health.py        # /api/v1/health readiness checks
│   │       ├── machines.py      # /api/v1/machines CRUD & historical data
│   │       ├── sensor_data.py   # /api/v1/sensor-data (ESP32 webhook)
│   │       └── websockets.py    # /ws/v1/machines WebSockets
│   ├── core/
│   │   ├── config.py            # Environment configuration
│   │   └── database.py          # Firebase initialization
│   ├── schemas/                 # Pydantic models (requests/responses)
│   └── services/                # Business logic (health, alerts, DB queries)
├── tests/                       # Unit tests
├── .env                         # Environment variables (git-ignored)
├── .env.example                 # Configuration placeholders
├── requirements.txt             # Dependencies
└── firebase-credentials.json    # Private key (git-ignored!)
```

## 5. Firebase Setup
The backend uses the Firebase Admin SDK. **Never expose the service account credentials to the React frontend or the ESP32.**
1. Create a Firebase Project in the Firebase Console.
2. Enable Cloud Firestore.
3. Generate a new private key from **Project Settings > Service Accounts**.
4. Save the JSON file in the `backend/` directory (e.g., `firebase-credentials.json`).

## 6. Environment Variables
Copy `.env.example` to `.env` and fill in the values:
```env
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

## 7. How to Run Locally
```bash
# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate  # Windows
source venv/bin/activate # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## 8. How to Test the API
You can interact with the API using the interactive Swagger UI at:
**http://localhost:8000/docs**

To test unit tests:
```bash
python -m unittest discover tests
```

## 9. ESP32 Integration
The ESP32 communicates over standard HTTP POST. It does not calculate health scores or interact with WebSockets.
**Endpoint:** `POST http://<SERVER_IP>:8000/api/sensor-data`
*(Note: A backward-compatible `/api/sensor-data` alias exists for legacy ESP32 firmware, while the main API operates at `/api/v1/sensor-data`)*

**Payload:**
```json
{
  "machine_id": "MACHINE_01",
  "temperature": 36.4,
  "ambient_temp": 29.6,
  "humidity": 56,
  "current": 0.68,
  "rpm": 1835,
  "vibration": 0.21
}
```

## 10. Firestore Collections
- `machines`: Master record of registered industrial machines and their latest status/health.
- `machine_readings`: Raw time-series telemetry data from ESP32s.
- `alerts`: Deduplicated records of abnormal conditions (warning/critical).
- `maintenance_logs`: Records of operator actions and machine maintenance.

**Required Composite Indexes:**
- Collection `alerts`: Fields `machine_id` (Ascending), `timestamp` (Descending)
- Collection `alerts`: Fields `machine_id` (Ascending), `acknowledged` (Ascending), `timestamp` (Descending)
- Collection `maintenance_logs`: Fields `machine_id` (Ascending), `date` (Descending)

## 11. WebSocket Endpoint
Dashboard clients connect to receive real-time push updates for specific machines.
**Endpoint:** `ws://<SERVER_IP>:8000/ws/v1/machines/{machine_id}`
*(A legacy alias `/ws/machines/{machine_id}` also exists).*

## 12. React Frontend Integration
The frontend should fetch historical data via the `/api/v1/machines` REST endpoints, and then open a native browser WebSocket connection to listen for updates. Firebase credentials must remain on the backend; the React app should ONLY talk to the FastAPI backend.

## 13. Deployment Considerations
- Use HTTPS and WSS (Secure WebSockets) in production.
- Update `ALLOWED_ORIGINS` in your production environment variables to lock down CORS.
- Keep `firebase-credentials.json` out of version control. Use secure secret managers (e.g. AWS Secrets Manager, GitHub Secrets) during deployment CI/CD.
- Consider deploying via Docker.
