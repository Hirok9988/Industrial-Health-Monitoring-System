# 🏭 Industrial Health Monitoring System (IHMS)
### IoT Multi-Sensor Machine Condition Monitoring, Automated Relay Protection & Early Fault Detection Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![ESP32](https://img.shields.io/badge/ESP32-WROOM--32-E7352C.svg?logo=espressif&logoColor=white)](https://www.espressif.com/)
[![Firebase Firestore](https://img.shields.io/badge/Firebase-Firestore-FFCA28.svg?logo=firebase&logoColor=black)](https://firebase.google.com/)

An end-to-end industrial IoT predictive maintenance ecosystem that continuously monitors rotating machinery (motors, pumps, drivetrains), evaluates electromechanical health scores in real time, triggers automatic hardware emergency circuit trips upon critical faults, and streams live telemetry to a reactive operator dashboard via WebSockets.

---

## 📑 Table of Contents
- [Project Overview](#-project-overview)
- [End-to-End System Pipeline](#-end-to-end-system-pipeline)
- [Hardware Architecture & Components](#-hardware-architecture--components)
- [Wiring & Pinout Reference](#-wiring--pinout-reference)
- [Circuit Schematic](#-circuit-schematic)
- [Software Architecture & Tech Stack](#-software-architecture--tech-stack)
- [Health Score Engine & Fault Detection](#-health-score-engine--fault-detection)
- [Project Directory Structure](#-project-directory-structure)
- [Getting Started / Installation](#-getting-started--installation)
  - [1. Backend Setup (FastAPI & Firebase)](#1-backend-setup-fastapi--firebase)
  - [2. Frontend Setup (React & Vite)](#2-frontend-setup-react--vite)
  - [3. Firmware Flashing (ESP32)](#3-firmware-flashing-esp32)
- [API & WebSocket Reference](#-api--websocket-reference)
- [Author & License](#-author--license)

---

## 🔍 Project Overview

Unexpected mechanical failures, bearing degradation, rotor lockups, and thermal runaway cause catastrophic downtime in industrial manufacturing. The **Industrial Health Monitoring System** solves this by bridging physical sensing with cloud intelligence:

1. **Edge Sampling & Protection (ESP32):** Ingests physical metrics (motor temperature, dynamic tri-axial acceleration, in-line electrical current, rotational speed, and room humidity) every 5 seconds. Evaluates thresholds on the edge and instantly trips a physical **5V Relay circuit breaker** if critical limits are breached.
2. **Noise-Isolated Dual Power Design:** Separates the microcontroller logic power rail from the DC motor drive rail, eliminating inductive back-EMF spikes and prevent brownouts.
3. **High-Performance Ingestion Backend (FastAPI):** Ingests telemetry via HTTP REST, logs records to **Firebase Cloud Firestore**, tracks machine alerts, and calculates rolling 1-minute windowed health indices.
4. **Reactive Operator Console (React + Vite):** Receives instant telemetry over native WebSockets, visualizes tri-axial accelerometer vectors ($A_x, A_y, A_z$), provides sparkline trend charts, and renders a comprehensive **AI System Health Report**.

---

## 🚀 End-to-End System Pipeline

```
                                      +---------------------------------------------+
                                      |          ROTATING INDUSTRIAL MOTOR          |
                                      +---------------------------------------------+
                                                             |
            +--------------------+---------------------------+---------------------+--------------------+
            |                    |                           |                     |                    |
     [DS18B20 Probe]       [MPU-6050]                    [ACS712]               [FC-03]              [DHT22]
     Motor Surface Temp    3-Axis Dynamic Acceleration   Current Load (A)       Optical RPM          Ambient Temp & %RH
            |                    |                           |                     |                    |
            +--------------------+---------------------------+---------------------+--------------------+
                                                             |
                                                             v
                                             +-------------------------------+
                                             |       ESP32 MICROCONTROLLER   |
                                             |  - Non-blocking pulse counts  |
                                             |  - Raw-to-g vector math       |
                                             |  - 5-second sampling cadence  |
                                             +-------------------------------+
                                               /                           \
                              [CRITICAL THRESHOLD?]               [TELEMETRY DISPATCH]
                                      /                                     \
                                     v                                       v
                     +-------------------------------+             +--------------------+
                     |    1-CHANNEL SAFETY RELAY     |             | Wi-Fi HTTP POST    |
                     |  - Cuts DC Motor Supply       |             | JSON Payload       |
                     |  - Active LOW Trip Breaker    |             +--------------------+
                     |  - Buzzer / Red LED Alarms    |                       |
                     +-------------------------------+                       v
                                                                   +--------------------+
                                                                   |  FASTAPI BACKEND   |
                                                                   |  Port: 8000        |
                                                                   +--------------------+
                                                                    /                  \
                                                        [STORE DATA]             [PUSH TO CLIENTS]
                                                            /                              \
                                                           v                                v
                                              +-------------------------+      +-------------------------+
                                              |  FIREBASE CLOUD DB      |      |   WEBSOCKET MANAGER     |
                                              |  - machine_readings     |      |   /ws/v1/machines/{id}  |
                                              |  - machines             |      +-------------------------+
                                              |  - alerts               |                   |
                                              +-------------------------+                   v
                                                                               +-------------------------+
                                                                               |  REACT OPERATOR CONSOLE |
                                                                               |  - Live Health Dial     |
                                                                               |  - Tri-Axial Accel Card |
                                                                               |  - AI Health Report     |
                                                                               +-------------------------+
```

---

## ⚡ Hardware Architecture & Components

| Component | Part / Module | Function & Role | Communication Protocol |
| :--- | :--- | :--- | :--- |
| **Microcontroller** | **ESP32 NodeMCU** (30/38 pin) | High-speed edge processor, Wi-Fi telemetry client, and actuator controller | Wi-Fi 802.11 b/g/n, Dual-core FreeRTOS |
| **Shaft Speed Sensor** | **FC-03 Optical IR Slotted Sensor** | Reads disc slots to measure rotational speed (RPM) | Digital Interrupt (`RISING`) |
| **Motion / Acceleration** | **MPU-6050 6-DOF IMU** | Measures tri-axial casing vibration, mechanical shock, and tilt in $g$ units | $\text{I}^2\text{C}$ Bus (`SDA / SCL`) |
| **Motor Temperature** | **DS18B20 Waterproof Probe** | High-precision thermal contact measurement of motor metallic casing | OneWire with $4.7\text{k}\Omega$ Pull-Up |
| **Ambient Environment**| **DHT22 (or DHT11)** | Measures ambient air temperature & relative humidity to detect heat-trapping | Single-bus Digital |
| **Electrical Load** | **ACS712-05B Current Sensor** | Measures motor real-time current draw to detect electrical overload or stalls | Analog Output ($\text{ADC1}$) |
| **Safety Circuit Trip**| **1-Channel 5V Relay Module** | Electromechanical breaker that opens and cuts motor power upon critical state | Digital GPIO (Active LOW) |
| **Status Indicators** | **LEDs (Red, Yellow, Green) & Buzzer** | Local visual and acoustic notification for normal, warning, and alarm states | Digital GPIO Output |
| **Power Isolation** | **Dual Independent Power Supplies** | Separate battery rails for ESP32 logic vs DC motor to eliminate inductive kickback | Isolated Direct DC Rails |

---

## 🔌 Wiring & Pinout Reference

| Component Pin | ESP32 Pin | Logic Level | Notes |
| :--- | :--- | :--- | :--- |
| **FC-03 (DO)** | **GPIO 18** | $3.3\text{V} / 5\text{V}$ | Hardware interrupt pin counting encoder wheel pulses |
| **MPU-6050 (SDA)**| **GPIO 21** | $3.3\text{V}$ | $\text{I}^2\text{C}$ Data Line |
| **MPU-6050 (SCL)**| **GPIO 22** | $3.3\text{V}$ | $\text{I}^2\text{C}$ Clock Line |
| **DS18B20 (DATA)**| **GPIO 5** | $3.3\text{V}$ | Requires $4.7\text{k}\Omega$ external pull-up resistor to $3.3\text{V}$ |
| **DHT22 (DATA)** | **GPIO 4** | $3.3\text{V}$ | Digital pin for ambient air temperature & relative humidity |
| **ACS712 (OUT)** | **GPIO 34** | $3.3\text{V}$ max | Uses $\text{ADC1}$ (safe while Wi-Fi is active; avoids $\text{ADC2}$ conflict) |
| **Relay (IN)** | **GPIO 26** | $3.3\text{V} / 5\text{V}$ | Active LOW: `LOW` = Motor Circuit Closed, `HIGH` = Motor Tripped |
| **Green LED** | **GPIO 13** | $3.3\text{V}$ | Normal State |
| **Yellow LED** | **GPIO 12** | $3.3\text{V}$ | Warning State |
| **Red LED** | **GPIO 14** | $3.3\text{V}$ | Critical State |
| **Buzzer (+)** | **GPIO 27** | $3.3\text{V}$ | Warning chirp / Critical continuous alarm |

---

## 📐 Circuit Schematic

The complete physical wiring diagram shows the dual-rail power isolation, sensor bus wiring, and relay breaker configuration:

![Industrial Health Monitoring System Circuit Diagram](./Circuit%20_Diagram/CIRCUIT_DIGRAM.png)

---

## 💻 Software Architecture & Tech Stack

### 1. Embedded Firmware (`/firmware`)
- **Framework:** Arduino / C++ on ESP32.
- **Interrupt Sampling:** Uses hardware ISR on GPIO 18 to count optical disc pulses over a configurable 5-second interval:
  $$\text{RPM} = \frac{\text{Pulses} \times \left(\frac{60}{\text{Interval Seconds}}\right)}{\text{Encoder Slots}}$$
- **Resultant Acceleration Math:** Translates raw 16-bit MPU-6050 registers into gravitational $g$ units ($16384\text{ LSB/g}$), zeroes static 1g gravity from the Z-axis, and computes the dynamic shock vector:
  $$a_{\text{total}} = \sqrt{a_x^2 + a_y^2 + a_z^2}$$
- **Fail-Safe Logic:** If temperature, current, or dynamic acceleration cross critical thresholds, the relay instantly opens (`digitalWrite(PIN_RELAY, HIGH)`).

### 2. Backend Infrastructure (`/backend`)
- **FastAPI (Asynchronous Python 3.9+):** Non-blocking HTTP REST routes and WebSockets.
- **Pydantic v2:** Validates payloads, handles schema transformations, and ensures backward compatibility between legacy vibration parameters and multi-axis acceleration fields.
- **Firebase Firestore:** Document-based storage:
  - `machines`: Master register of monitored machines and status summaries.
  - `machine_readings`: Time-series sensor log.
  - `alerts`: Deduplicated warning and critical notification logs.
  - `maintenance_logs`: Records of operator actions.
- **Real-Time WebSocket Server:** Pushes live JSON telemetry to all connected frontend clients whenever a new packet arrives from the ESP32.

### 3. Frontend Dashboard & Diagnostics (`/src`)
- **React 19 + Vite 8:** Ultra-fast bundling, single-page application with responsive layouts.
- **Interactive Gauges & Cards:**
  - Health score dial ($0 - 100$) with status badges.
  - Tri-axial accelerometer card featuring $A_x, A_y, A_z$ sub-gauges and total acceleration sparklines.
  - Live charts for Motor Temperature, Current, and Shaft RPM.
- **AI System Health Report:** Synthesizes multi-sensor parameters according to:
  - **ISO 20816:** Mechanical vibration and acceleration severity limits.
  - **NEMA MG 1:** Electric motor temperature rise classifications.
  - **Dew Point & Condensation Buffer:** Evaluates moisture condensation risk inside electrical junction enclosures.
  - **Rotor Slip Percentage:** Detects mechanical drag and pending stalls.

---

## 📊 Health Score Engine & Fault Detection

The backend runs a multi-criteria scoring algorithm on every incoming reading or rolling window:

| Parameter | Normal Range | Warning Threshold | Critical Fault | Target Fault Detected |
| :--- | :--- | :--- | :--- | :--- |
| **Motor Temperature** | $< 40.0^\circ\text{C}$ | $\ge 40.0^\circ\text{C}$ | $\ge 50.0^\circ\text{C}$ | Bearing friction, winding insulation breakdown |
| **Current (ACS712)** | $< 1.50\text{ A}$ | $\ge 1.50\text{ A}$ | $\ge 2.50\text{ A}$ | Rotor stall, electrical overload, mechanical jam |
| **Shaft Speed (RPM)** | $> 1500\text{ RPM}$ | $\le 1500\text{ RPM}$ | $\le 1000\text{ RPM}$ | Belt slippage, coupling wear, mechanical drag |
| **Dynamic Acceleration**| $< 0.50\text{ g}$ | $\ge 0.50\text{ g}$ | $\ge 1.00\text{ g}$ | Mass unbalance, shaft misalignment, broken mountings |

---

## 📁 Project Directory Structure

```text
Industrial Health Monitoring System/
├── backend/                             # FastAPI Backend & Telemetry Server
│   ├── app/
│   │   ├── api/routes/                  # Health, Machines, Ingestion, WebSockets
│   │   ├── core/                        # Config & Firebase DB initializers
│   │   ├── models/                      # Internal data models
│   │   ├── schemas/                     # Pydantic request/response schemas
│   │   ├── services/                    # Health scoring, Firestore & WS managers
│   │   └── main.py                      # FastAPI Application entrypoint
│   ├── tests/                           # Unit test suite (13 automated tests)
│   ├── .env.example                     # Backend environment template
│   ├── requirements.txt                 # Python dependencies
│   └── README.md                        # Backend detailed guide
├── Circuit _Diagram/                    # Original circuit schematic image
│   └── CIRCUIT_DIGRAM.png
├── firmware/                            # ESP32 C++ Arduino Source Code
│   └── esp32_health_monitor.ino         # Full firmware with live sensor drivers
├── public/                              # Static website assets & icons
│   └── picture/
│       └── circuit_diagram.png          # Production-synced circuit schematic
├── src/                                 # React Frontend (Vite)
│   ├── assets/                          # SVG icons and visual assets
│   ├── components/                      # AI Health Report & reusable UI
│   ├── hooks/                           # WebSocket & data fetch hooks
│   ├── pages/                           # LandingPage and DashboardPage
│   ├── services/                        # REST API client
│   ├── App.jsx                          # Main view router
│   ├── dashboard.css                    # Live monitoring layout styling
│   └── system.css                       # Architecture slide styling
├── .env.example                         # Frontend environment template
├── .gitignore                           # Git ignore rules for keys & node_modules
├── index.html                           # Web entrypoint
├── package.json                         # Node dependencies & scripts
├── vite.config.js                       # Vite configuration
└── README.md                            # Main project documentation (this file)
```

---

## 🛠️ Getting Started / Installation

### 1. Backend Setup (FastAPI & Firebase)

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a Python virtual environment:**
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Place your Firebase service account private key in `backend/firebase-credentials.json`.
   - Update `FIREBASE_CREDENTIALS_PATH` in `.env`.

5. **Run tests:**
   ```bash
   python -m unittest discover tests
   ```

6. **Start the backend server:**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *Interactive API Docs will be available at:* [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 2. Frontend Setup (React & Vite)

1. **Return to the root directory:**
   ```bash
   cd ..
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Start the Vite development server:**
   ```bash
   npm run dev -- --host 0.0.0.0
   ```
   *Open your browser at:* [http://localhost:5173/](http://localhost:5173/)

---

### 3. Firmware Flashing (ESP32)

1. Open `firmware/esp32_health_monitor.ino` in **Arduino IDE** or **PlatformIO**.
2. Install required Arduino libraries via Library Manager:
   - `DHT sensor library` (Adafruit)
   - `OneWire` (Paul Stoffregen)
   - `DallasTemperature` (Miles Burton)
3. Set your Wi-Fi credentials in the sketch:
   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_SSID";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   ```
4. Set the target server IP address to your computer's local network IP:
   ```cpp
   const char* BACKEND_URL   = "http://<YOUR_COMPUTER_IP>:8000/api/v1/sensor-data";
   ```
5. Connect your ESP32 board via USB, select **ESP32 Dev Module**, and click **Upload**.
6. Open the Serial Monitor at **115200 baud** to verify live hardware sensor logs and HTTP 200 OK responses.

---

## 📡 API & WebSocket Reference

### Ingest Live Sensor Telemetry
```http
POST /api/v1/sensor-data
Content-Type: application/json
```
**Payload:**
```json
{
  "machine_id": "MACHINE_01",
  "temperature": 36.4,
  "ambient_temp": 28.5,
  "humidity": 52.0,
  "current": 0.85,
  "rpm": 1820.0,
  "acceleration": 0.22,
  "accel_x": 0.08,
  "accel_y": 0.14,
  "accel_z": 0.12
}
```

### Real-Time WebSocket Channel
```text
ws://<SERVER_IP>:8000/ws/v1/machines/{machine_id}
```
Streams instantaneous JSON updates to connected dashboards every time a new sensor reading is ingested.

### Health Check
```http
GET /api/v1/health
```
**Response:**
```json
{
  "status": "ok",
  "service": "industrial-machine-monitoring-api"
}
```

---

## 👤 Author & License

Developed by **Hirok Jyoti Bordoloi**  
GitHub: [@Hirok9988](https://github.com/Hirok9988)

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
