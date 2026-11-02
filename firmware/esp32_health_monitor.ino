/*
 * ======================================================================================
 * Industrial Health Monitoring System - ESP32 Firmware with Wi-Fi & Backend Cloud Sync
 * ======================================================================================
 * Components & Pin Mapping:
 *  - FC-03 IR Optical Speed Sensor    : DO -> GPIO 18 (Interrupt)
 *  - MPU-6050 (Accelerometer / Motion): SDA -> GPIO 21, SCL -> GPIO 22 (I2C: 0x68)
 *  - DS18B20 (Motor Casing Temp)      : DATA -> GPIO 5 (with 4.7kΩ pull-up to 3.3V)
 *  - DHT11 / DHT22 (Ambient Temp)     : DATA -> GPIO 4
 *  - ACS712 Current Sensor (5A)       : OUT -> GPIO 34 (ADC)
 *  - Relay Module (Emergency Trip)    : IN -> GPIO 26 (Active LOW)
 *  - Piezo Buzzer                     : (+) -> GPIO 27
 *  - Status LEDs                      : Red -> GPIO 14, Yellow -> GPIO 12, Green -> GPIO 13
 * ======================================================================================
 */

#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// -----------------------------------------------------------------------------
// 1. NETWORK & BACKEND CONFIGURATION
// -----------------------------------------------------------------------------
// Set to 'true' to transmit telemetry to your FastAPI backend over Wi-Fi
// Set to 'false' to run in standalone offline mode (bench testing)
#define ENABLE_WIFI true

// Enter your Wi-Fi details (must be a 2.4 GHz network)
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Target FastAPI endpoint
// NOTE: Use your computer's local IP address on the network (NOT 'localhost' or '127.0.0.1')
const char* BACKEND_URL   = "http://10.239.175.182:8000/api/v1/sensor-data";
const char* MACHINE_ID    = "MACHINE_01";

// -----------------------------------------------------------------------------
// DHT Sensor Config (Ambient Temperature & Humidity)
// -----------------------------------------------------------------------------
#define DHTPIN 4
#define DHTTYPE DHT11   // Change to DHT22 if using the white DHT22 sensor
DHT dht(DHTPIN, DHTTYPE);

// -----------------------------------------------------------------------------
// DS18B20 Sensor Config (Motor Casing Probe Temperature)
// -----------------------------------------------------------------------------
#define PIN_DS18B20 5   // OneWire data bus connected to GPIO 5
OneWire oneWire(PIN_DS18B20);
DallasTemperature ds18b20Sensors(&oneWire);

// -----------------------------------------------------------------------------
// Pin Definitions
// -----------------------------------------------------------------------------
#define PIN_RPM_SENSOR      18  // FC-03 DO pin (Interrupt)
#define PIN_ACS712          34  // ACS712 Current Sensor OUT pin (Analog ADC1)
#define PIN_RELAY           26  // 5V Relay IN pin (Active LOW)
#define PIN_BUZZER          27  // Piezo Buzzer
#define PIN_LED_GREEN       13  // Normal status LED
#define PIN_LED_YELLOW      12  // Warning status LED
#define PIN_LED_RED         14  // Critical fault LED

#define MPU6050_ADDR        0x68

// -----------------------------------------------------------------------------
// System Thresholds (Aligned with backend health_service.py)
// -----------------------------------------------------------------------------
const float THRESHOLD_TEMP_WARN       = 40.0;   // °C
const float THRESHOLD_TEMP_CRIT       = 50.0;   // °C

const float THRESHOLD_CURRENT_WARN    = 1.5;    // Amperes
const float THRESHOLD_CURRENT_CRIT    = 2.5;    // Amperes

const float THRESHOLD_RPM_WARN_LOW    = 1500.0; // RPM
const float THRESHOLD_RPM_CRIT_LOW    = 1000.0; // RPM

const float THRESHOLD_ACCEL_WARN      = 0.5;    // g (dynamic acceleration)
const float THRESHOLD_ACCEL_CRIT      = 1.0;    // g

// -----------------------------------------------------------------------------
// Hardware Calibration & Timing
// -----------------------------------------------------------------------------
const unsigned long SAMPLE_INTERVAL_MS = 5000; // 5 seconds interval between sensor reads & transmissions
const int ENCODER_SLOTS = 20;                  // Number of slots in FC-03 encoder disc
const float ACS712_SENSITIVITY = 0.185;        // 185 mV/A for ACS712-05B
const float ACS712_VREF = 2.50;                // Quiescent voltage at 0 Amps

// -----------------------------------------------------------------------------
// Data Structures
// -----------------------------------------------------------------------------
struct SensorReading {
  float temperature;
  float ambient_temp;
  float humidity;
  float current;
  float rpm;
  float acceleration; // Resultant total acceleration in g (sqrt(ax²+ay²+az²))
  float accel_x;      // X-axis acceleration in g
  float accel_y;      // Y-axis acceleration in g
  float accel_z;      // Z-axis acceleration in g (gravity-removed)
};

volatile unsigned long pulseCounter = 0;
unsigned long lastSampleTime = 0;

enum MachineStatus { STATUS_NORMAL, STATUS_WARNING, STATUS_CRITICAL };
MachineStatus currentStatus = STATUS_NORMAL;

// -----------------------------------------------------------------------------
// Interrupt Service Routine for FC-03 RPM Sensor
// -----------------------------------------------------------------------------
void IRAM_ATTR countPulse() {
  pulseCounter++;
}

// -----------------------------------------------------------------------------
// Wi-Fi Connect Routine
// -----------------------------------------------------------------------------
void connectToWiFi() {
  if (!ENABLE_WIFI) return;

  Serial.printf("[Wi-Fi] Connecting to: %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 25) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connected successfully!");
    Serial.printf("[Wi-Fi] ESP32 IP Address: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[Wi-Fi] Failed to connect. Running in local-only mode.");
  }
}

// -----------------------------------------------------------------------------
// Setup Function
// -----------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==================================================");
  Serial.println("  Industrial Health Monitoring System - ESP32     ");
  Serial.println("==================================================");

  // Initialize GPIO Pins
  pinMode(PIN_RPM_SENSOR, INPUT_PULLUP);
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);

  // Default state: Motor running, Green LED on
  digitalWrite(PIN_RELAY, LOW); 
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_LED_GREEN, HIGH);
  digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_RED, LOW);

  // Attach interrupt for optical encoder
  attachInterrupt(digitalPinToInterrupt(PIN_RPM_SENSOR), countPulse, RISING);

  // Initialize I2C Bus for MPU-6050 (SDA = 21, SCL = 22)
  Wire.begin(21, 22);

  // Initialize MPU-6050
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x6B); // Wake up MPU-6050
  Wire.write(0x00);
  Wire.endTransmission();

  // Initialize DHT and DS18B20
  dht.begin();
  ds18b20Sensors.begin();

  // Connect to Wi-Fi if enabled
  if (ENABLE_WIFI) {
    connectToWiFi();
  }

  Serial.println("[OK] Setup completed.");
  Serial.println("==================================================\n");
}

// -----------------------------------------------------------------------------
// Read Live Sensors
// -----------------------------------------------------------------------------
SensorReading readLiveSensors() {
  SensorReading data;

  // 1. Calculate RPM from FC-03 pulses over the sample interval
  noInterrupts();
  unsigned long pulses = pulseCounter;
  pulseCounter = 0;
  interrupts();
  float intervalSeconds = SAMPLE_INTERVAL_MS / 1000.0;
  data.rpm = (float)(pulses * (60.0 / intervalSeconds)) / ENCODER_SLOTS;

  // 2. Read Motor Temperature (DS18B20) and Ambient Environment (DHT)
  ds18b20Sensors.requestTemperatures();
  float motorTemp = ds18b20Sensors.getTempCByIndex(0);

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  data.ambient_temp = isnan(t) ? 28.0 : t;
  data.humidity     = isnan(h) ? 50.0 : h;

  // Use DS18B20 motor temp, or fallback to ambient + offset if probe not attached
  if (motorTemp == DEVICE_DISCONNECTED_C || motorTemp < -50.0 || isnan(motorTemp)) {
    data.temperature = data.ambient_temp + 5.0; // Fallback estimate
  } else {
    data.temperature = motorTemp;
  }

  // 3. Read Current from ACS712
  long adcSum = 0;
  for (int i = 0; i < 50; i++) {
    adcSum += analogRead(PIN_ACS712);
    delayMicroseconds(200);
  }
  float avgAdc = adcSum / 50.0;
  float voltage = (avgAdc / 4095.0) * 3.3;
  float currentAmps = abs((voltage - (ACS712_VREF * (3.3 / 5.0))) / ACS712_SENSITIVITY);
  data.current = (currentAmps < 0.05) ? 0.0 : currentAmps;

  // 4. Read Acceleration from MPU-6050
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom((uint16_t)MPU6050_ADDR, (uint8_t)6, true);

  if (Wire.available() >= 6) {
    int16_t rawX = Wire.read() << 8 | Wire.read();
    int16_t rawY = Wire.read() << 8 | Wire.read();
    int16_t rawZ = Wire.read() << 8 | Wire.read();

    // Convert to g (±2g range: LSB sensitivity = 16384 LSB/g)
    data.accel_x = rawX / 16384.0f;
    data.accel_y = rawY / 16384.0f;
    // Remove gravity from Z-axis (static gravity ≈ 1g when flat)
    data.accel_z = (rawZ / 16384.0f) - 1.0f;
    // Total dynamic acceleration resultant
    data.acceleration = sqrt(data.accel_x * data.accel_x +
                             data.accel_y * data.accel_y +
                             data.accel_z * data.accel_z);
  } else {
    data.accel_x = 0.0f;
    data.accel_y = 0.0f;
    data.accel_z = 0.0f;
    data.acceleration = 0.0f;
  }

  return data;
}

// -----------------------------------------------------------------------------
// Threshold Evaluation
// -----------------------------------------------------------------------------
MachineStatus evaluateHealth(const SensorReading& d) {
  if (d.temperature >= THRESHOLD_TEMP_CRIT ||
      d.current     >= THRESHOLD_CURRENT_CRIT ||
      d.rpm         <= THRESHOLD_RPM_CRIT_LOW ||
      d.acceleration >= THRESHOLD_ACCEL_CRIT) {
    return STATUS_CRITICAL;
  }

  if (d.temperature >= THRESHOLD_TEMP_WARN ||
      d.current     >= THRESHOLD_CURRENT_WARN ||
      d.rpm         <= THRESHOLD_RPM_WARN_LOW ||
      d.acceleration >= THRESHOLD_ACCEL_WARN) {
    return STATUS_WARNING;
  }

  return STATUS_NORMAL;
}

// -----------------------------------------------------------------------------
// Hardware Actuators
// -----------------------------------------------------------------------------
void handleActuators(MachineStatus status) {
  switch (status) {
    case STATUS_NORMAL:
      digitalWrite(PIN_LED_GREEN, HIGH);
      digitalWrite(PIN_LED_YELLOW, LOW);
      digitalWrite(PIN_LED_RED, LOW);
      digitalWrite(PIN_RELAY, LOW);   // Motor Circuit Connected (RUN)
      digitalWrite(PIN_BUZZER, LOW);
      break;

    case STATUS_WARNING:
      digitalWrite(PIN_LED_GREEN, LOW);
      digitalWrite(PIN_LED_YELLOW, HIGH);
      digitalWrite(PIN_LED_RED, LOW);
      digitalWrite(PIN_RELAY, LOW);   // Motor Circuit Connected (RUN)
      digitalWrite(PIN_BUZZER, HIGH);
      delay(60);
      digitalWrite(PIN_BUZZER, LOW);
      break;

    case STATUS_CRITICAL:
      digitalWrite(PIN_LED_GREEN, LOW);
      digitalWrite(PIN_LED_YELLOW, LOW);
      digitalWrite(PIN_LED_RED, HIGH);
      digitalWrite(PIN_RELAY, HIGH);  // TRIP MOTOR (Cut power for protection!)
      digitalWrite(PIN_BUZZER, HIGH); // Continuous alarm
      break;
  }
}

// -----------------------------------------------------------------------------
// Send Telemetry to FastAPI Backend
// -----------------------------------------------------------------------------
void sendTelemetryToBackend(const SensorReading& d) {
  if (!ENABLE_WIFI || WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");

  // Construct JSON payload matching SensorDataIn schema
  char jsonPayload[320];
  snprintf(jsonPayload, sizeof(jsonPayload),
    "{"
    "\"machine_id\":\"%s\","
    "\"temperature\":%.2f,"
    "\"ambient_temp\":%.2f,"
    "\"humidity\":%.2f,"
    "\"current\":%.2f,"
    "\"rpm\":%.2f,"
    "\"acceleration\":%.3f,"
    "\"accel_x\":%.3f,"
    "\"accel_y\":%.3f,"
    "\"accel_z\":%.3f"
    "}",
    MACHINE_ID,
    d.temperature,
    d.ambient_temp,
    d.humidity,
    d.current,
    d.rpm,
    d.acceleration,
    d.accel_x,
    d.accel_y,
    d.accel_z
  );

  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    Serial.printf("[API POST] Success (%d) -> %s\n", httpResponseCode, jsonPayload);
  } else {
    Serial.printf("[API POST ERROR] Code %d (%s)\n", httpResponseCode, http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}

// -----------------------------------------------------------------------------
// Print to Serial Monitor
// -----------------------------------------------------------------------------
void printTelemetry(const SensorReading& d, MachineStatus status) {
  Serial.println("--------------------------------------------------");
  Serial.println("Mode       : LIVE HARDWARE INGESTION");
  Serial.printf("Speed (RPM): %.1f RPM\n", d.rpm);
  Serial.printf("Current    : %.2f A\n", d.current);
  Serial.printf("Temperature: %.1f °C\n", d.temperature);
  Serial.printf("Ambient    : %.1f °C | Humidity: %.0f %%\n", d.ambient_temp, d.humidity);
  Serial.printf("Acceleration: %.2f g [Ax:%.2f, Ay:%.2f, Az:%.2f]\n", d.acceleration, d.accel_x, d.accel_y, d.accel_z);
  Serial.print("Machine State: ");
  if (status == STATUS_NORMAL)       Serial.println("NORMAL (Green LED, Motor RUN)");
  else if (status == STATUS_WARNING) Serial.println("WARNING (Yellow LED, Motor RUN, Beep)");
  else                               Serial.println("CRITICAL FAULT! (Red LED, Motor TRIPPED, Siren)");
  Serial.println("--------------------------------------------------");
}

// -----------------------------------------------------------------------------
// Main Loop
// -----------------------------------------------------------------------------
void loop() {
  unsigned long currentMillis = millis();

  // Run sampling and update routine every 5 seconds
  if (currentMillis - lastSampleTime >= SAMPLE_INTERVAL_MS) {
    lastSampleTime = currentMillis;

    // 1. Read live telemetry from all connected sensors
    SensorReading reading = readLiveSensors();

    // 2. Local threshold health evaluation and protective hardware trip
    currentStatus = evaluateHealth(reading);
    handleActuators(currentStatus);

    // 3. Output live status to Serial Monitor
    printTelemetry(reading, currentStatus);

    // 4. Transmit live JSON telemetry to FastAPI backend
    sendTelemetryToBackend(reading);
  }
}
