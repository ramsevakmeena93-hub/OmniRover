# OmniRover Hardware Connection Guide

## Your Network
- Laptop IP: 192.168.1.11
- Server Port: 5000
- All devices must be on same WiFi

---

## ESP32 Arduino Code

Install these libraries in Arduino IDE first:
- WebSockets by Markus Sattler
- ArduinoJson by Benoit Blanchon
- DHT sensor library by Adafruit (if using DHT)

```cpp
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

// ── CONFIG ──────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_IP     = "192.168.1.11";  // Your laptop IP
const int   SERVER_PORT   = 5000;
const char* WS_PATH       = "/hardware";

// ── PIN CONFIG ───────────────────────────
// Ultrasonic Front (HC-SR04)
#define TRIG_FRONT 5
#define ECHO_FRONT 18

// Ultrasonic Left
#define TRIG_LEFT  19
#define ECHO_LEFT  21

// Ultrasonic Right
#define TRIG_RIGHT 22
#define ECHO_RIGHT 23

// Gas sensor (MQ-2 or MQ-135) — analog
#define GAS_PIN    34

// Temperature (LM35 or DHT11) — analog/digital
#define TEMP_PIN   35

// Motor pins (L298N)
#define MOTOR_L_FWD  25
#define MOTOR_L_BWD  26
#define MOTOR_R_FWD  27
#define MOTOR_R_BWD  14

WebSocketsClient ws;
bool wsConnected = false;

// ── ULTRASONIC READ ──────────────────────
long readUltrasonic(int trig, int echo) {
  digitalWrite(trig, LOW);
  delayMicroseconds(2);
  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long duration = pulseIn(echo, HIGH, 30000);
  return duration * 0.034 / 2;  // cm
}

// ── MOTOR CONTROL ────────────────────────
void stopMotors() {
  digitalWrite(MOTOR_L_FWD, LOW); digitalWrite(MOTOR_L_BWD, LOW);
  digitalWrite(MOTOR_R_FWD, LOW); digitalWrite(MOTOR_R_BWD, LOW);
}
void moveForward()  { digitalWrite(MOTOR_L_FWD,HIGH); digitalWrite(MOTOR_R_FWD,HIGH); digitalWrite(MOTOR_L_BWD,LOW); digitalWrite(MOTOR_R_BWD,LOW); }
void moveBackward() { digitalWrite(MOTOR_L_BWD,HIGH); digitalWrite(MOTOR_R_BWD,HIGH); digitalWrite(MOTOR_L_FWD,LOW); digitalWrite(MOTOR_R_FWD,LOW); }
void turnLeft()     { digitalWrite(MOTOR_R_FWD,HIGH); digitalWrite(MOTOR_L_BWD,HIGH); digitalWrite(MOTOR_L_FWD,LOW); digitalWrite(MOTOR_R_BWD,LOW); }
void turnRight()    { digitalWrite(MOTOR_L_FWD,HIGH); digitalWrite(MOTOR_R_BWD,HIGH); digitalWrite(MOTOR_L_BWD,LOW); digitalWrite(MOTOR_R_FWD,LOW); }

// ── WEBSOCKET EVENTS ─────────────────────
void onWsEvent(WStype_t type, uint8_t* payload, size_t length) {
  if (type == WStype_CONNECTED) {
    wsConnected = true;
    Serial.println("[WS] Connected to server");
  }
  else if (type == WStype_DISCONNECTED) {
    wsConnected = false;
    Serial.println("[WS] Disconnected");
  }
  else if (type == WStype_TEXT) {
    // Receive commands from website
    StaticJsonDocument<200> doc;
    deserializeJson(doc, payload, length);
    String cmd = doc["cmd"] | "STOP";
    Serial.println("[CMD] " + cmd);
    if      (cmd == "FORWARD")  moveForward();
    else if (cmd == "BACKWARD") moveBackward();
    else if (cmd == "LEFT")     turnLeft();
    else if (cmd == "RIGHT")    turnRight();
    else                        stopMotors();
  }
}

void setup() {
  Serial.begin(115200);

  // Motor pins
  pinMode(MOTOR_L_FWD, OUTPUT); pinMode(MOTOR_L_BWD, OUTPUT);
  pinMode(MOTOR_R_FWD, OUTPUT); pinMode(MOTOR_R_BWD, OUTPUT);
  stopMotors();

  // Ultrasonic pins
  pinMode(TRIG_FRONT, OUTPUT); pinMode(ECHO_FRONT, INPUT);
  pinMode(TRIG_LEFT,  OUTPUT); pinMode(ECHO_LEFT,  INPUT);
  pinMode(TRIG_RIGHT, OUTPUT); pinMode(ECHO_RIGHT, INPUT);

  // Connect WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WiFi] Connecting");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\n[WiFi] Connected! IP: " + WiFi.localIP().toString());

  // Connect WebSocket to laptop server
  ws.begin(SERVER_IP, SERVER_PORT, WS_PATH);
  ws.onEvent(onWsEvent);
  ws.setReconnectInterval(3000);
}

unsigned long lastSend = 0;

void loop() {
  ws.loop();

  // Send sensor data every 500ms
  if (millis() - lastSend > 500) {
    lastSend = millis();

    long u1 = readUltrasonic(TRIG_FRONT, ECHO_FRONT);
    long u2 = readUltrasonic(TRIG_LEFT,  ECHO_LEFT);
    long u3 = readUltrasonic(TRIG_RIGHT, ECHO_RIGHT);

    int gasRaw  = analogRead(GAS_PIN);
    int tempRaw = analogRead(TEMP_PIN);

    // Convert raw to meaningful values
    float gasPPM  = map(gasRaw,  0, 4095, 0, 600);
    float tempC   = map(tempRaw, 0, 4095, 0, 100);  // adjust for your sensor

    StaticJsonDocument<256> doc;
    doc["temperature"] = tempC;
    doc["gas"]         = gasPPM;
    doc["distance"]    = u1;
    doc["ultrasonic1"] = u1;  // front
    doc["ultrasonic2"] = u2;  // left
    doc["ultrasonic3"] = u3;  // right

    String json;
    serializeJson(doc, json);

    if (wsConnected) {
      ws.sendTXT(json);
    }
    Serial.println("[SENSOR] " + json);
  }
}
```

---

## Step 3 — Enable Hardware Mode on Server

Edit `server/.env` and add:
```
USE_HARDWARE=true
```

Then restart server:
```
node index.js
```

---

## Step 4 — Add Hardware WebSocket endpoint to server

The server needs a `/hardware` WebSocket endpoint to receive ESP32 data.
This is already handled — see server/index.js hardware section.

---

## Wiring Summary

| Sensor | ESP32 Pin |
|--------|-----------|
| Ultrasonic Front TRIG | GPIO 5 |
| Ultrasonic Front ECHO | GPIO 18 |
| Ultrasonic Left TRIG | GPIO 19 |
| Ultrasonic Left ECHO | GPIO 21 |
| Ultrasonic Right TRIG | GPIO 22 |
| Ultrasonic Right ECHO | GPIO 23 |
| Gas Sensor (analog) | GPIO 34 |
| Temperature (analog) | GPIO 35 |
| Motor L Forward | GPIO 25 |
| Motor L Backward | GPIO 26 |
| Motor R Forward | GPIO 27 |
| Motor R Backward | GPIO 14 |
