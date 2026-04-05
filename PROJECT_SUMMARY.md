# NDRF OmniRover — Complete Project Summary
**AI-Powered Disaster Rescue Ground Control Station**

---

## Project Overview

OmniRover is a real-time disaster rescue rover system built for NDRF (National Disaster Response Force). It combines a React web dashboard, Node.js backend, Python AI detection service, and ESP32 hardware controller into a unified rescue operations platform.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT DASHBOARD (Port 3000)               │
│  Dashboard | Control | Map | Camera | Analytics | Data Logs  │
└──────────────────────┬──────────────────────────────────────┘
                       │ WebSocket ws://localhost:5000
┌──────────────────────▼──────────────────────────────────────┐
│                 NODE.JS SERVER (Port 5000)                    │
│  Express REST API + WebSocket Server + Groq LLM Integration  │
└──────┬───────────────────────────────────────┬──────────────┘
       │ WebSocket /hardware                   │ HTTPS API
┌──────▼──────────┐                  ┌─────────▼──────────────┐
│   ESP32 ROVER   │                  │   GROQ CLOUD API        │
│ Sensors+Motors  │                  │ Llama 3.1 + Llama 4     │
└─────────────────┘                  └────────────────────────┘
       │ WebSocket ws://localhost:5001
┌──────▼──────────────────────────────────────────────────────┐
│              PYTHON YOLO SERVICE (Port 5001)                  │
│     YOLOv8n + Fire Model + HSV Color Detection               │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Components

### 1. App.jsx
**Role:** Root component and tab router
- Manages 6 tabs: Dashboard, Control, Map, Camera, Analytics, Data Logs
- Connects `useSensorData` hook to all child components
- Handles sound alerts via `useAlertSound` hook
- Merges ESP32 sensor data with camera AI detections
- Shows loading screen while waiting for rover connection

---

### 2. Navbar.jsx
**Role:** Top navigation bar
- Shows mission title: "NDRF · OMNI ROVER GROUND CONTROL STATION"
- Displays live mission timer (HH:MM:SS)
- Shows risk level badge (SAFE / WARNING / DANGER)
- Shows server connection status indicator

---

### 3. Sidebar.jsx
**Role:** Left navigation panel
- 6 tab buttons with icons
- Active tab highlighting
- Tabs: DASHBOARD, CONTROL, LIVE MAP, CAMERA, ANALYTICS, DATA LOGS

---

### 4. AlertBanner.jsx
**Role:** Dynamic alert notification bar
- Shows active alerts from sensor thresholds
- Color coded: RED = DANGER, YELLOW = WARNING
- Alert types: Toxic Gas, Extreme Heat, Obstacle, Smoke, Survivor Detected
- Auto-dismisses when condition clears

---

### 5. SensorCard.jsx
**Role:** Individual sensor display widget
- Shows Temperature (°C), Gas Level (ppm), Distance (cm)
- Animated progress bar with threshold indicator
- Color changes: Green → Yellow → Red based on danger level
- Real-time updates from ESP32 via WebSocket

---

### 6. RiskIndicator.jsx
**Role:** Overall mission risk display
- Large visual indicator: SAFE / WARNING / DANGER / OFFLINE
- Animated pulse effect on danger
- Aggregates all sensor readings into single risk level

---

### 7. AIDetectionPanel.jsx
**Role:** YOLO detection results display
- Shows detected objects: Human, Fire, Gas, Debris
- Confidence scores for each detection
- Color coded badges per detection type
- Updates in real-time from camera feed

---

### 8. RecommendationPanel.jsx
**Role:** LLM tactical recommendation display
- Shows Groq Llama 3.1 generated recommendations
- Military-style tactical advice based on sensor data
- Updates every 10 seconds
- Falls back to rule-based recommendations if API unavailable

---

### 9. LiveMap.jsx
**Role:** Real-time tactical GPS map
**Technology:** OpenLayers with CartoDB dark tiles
- Shows user's real GPS location (blue dot)
- Shows rover position with trail (green)
- Drops detection markers when sensors fire:
  - ▲ RED = Human detected
  - ▲ ORANGE = Fire detected
  - ▲ PURPLE = Gas detected
  - ▲ YELLOW = Debris detected
- Interactive: drag, zoom, recenter
- Detection log panel with coordinates and timestamps
- Rover patrols automatically in demo mode

---

### 10. CameraFeed.jsx
**Role:** Live camera with AI detection overlay
**Technology:** getUserMedia API + WebSocket + Canvas
- Two modes: Laptop Camera / Phone Camera (IP Webcam)
- Sends frames to Python YOLO service at 10 FPS
- Draws bounding boxes on canvas with labels
- Color coding: Green=Human, Red=Fire, Yellow=Gas, Blue=Debris
- Shows detection log with risk levels
- HUD overlay with timestamp and FPS counter
- Corner bracket style detection boxes

---

### 11. VisionPanel.jsx
**Role:** AI scene description from camera
**Technology:** Groq Llama 4 Scout Vision Model
- Captures camera frame on demand
- Sends to Llama 4 Scout for visual analysis
- Returns military-style scene description
- Auto mode: analyzes every 8 seconds
- Keeps history of past analyses
- Rate limited to 1 request per 5 seconds

---

### 12. UltrasonicPanel.jsx
**Role:** Ultrasonic sensor visualization
- Visual rover diagram showing sensor directions
- 3 sensor bars: Front, Left, Right
- Color coded: Green=Clear, Yellow=Caution, Orange=Warning, Red=Critical
- Proximity detection alert when object < 80cm
- Shows "CONFIRMED" when both camera and ultrasonic detect human
- Handles missing sensors gracefully (shows --)

---

### 13. RoverController.jsx
**Role:** Motor control and rover management
**Technology:** fetch API → Node.js → WebSocket → ESP32
- 3 modes: Manual, Auto Patrol, Standby/E-Stop
- D-pad buttons (hold to move — sends command every 400ms)
- Keyboard control: Arrow keys + Q/E + Space
- Speed slider (10-100%)
- Camera servo angle slider (0-180°)
- Lights and Horn controls
- Auto patrol sequence visualizer
- Live telemetry: Temp, Gas, Distance, Flame, Human
- Command log with timestamps
- Shows ROVER CONNECTED / OFFLINE status

---

### 14. AnalyticsPanel.jsx
**Role:** Historical sensor data graphs
- 3 line graphs: Temperature, Gas Level, Ultrasonic Distance
- Last 20 readings displayed
- Danger threshold lines on each graph
- Real-time updates as new data arrives

---

### 15. MissionReport.jsx
**Role:** Mission data export and reporting
- Quick stats: Duration, Peak Temp, Peak Gas, Detections
- Full military-format mission report viewer
- Government advisory section for NDRF command
- Download as CSV (all sensor readings)
- Download as TXT (formatted mission report)
- Includes GPS coordinates, AI recommendations

---

### 16. DataLogs.jsx
**Role:** Raw sensor data table
- Scrollable table of all sensor readings
- Timestamps, all sensor values, risk levels
- Color coded rows by risk level

---

## Custom Hooks

### useSensorData.js
**Role:** Real-time data connection manager
- Connects to Node.js server via WebSocket
- Falls back to HTTP polling if WebSocket fails
- Enriches raw data with risk levels and alerts
- Maintains history arrays for analytics graphs
- Auto-reconnects every 5 seconds on disconnect

### useAlertSound.js
**Role:** Audio alert system
**Technology:** Web Audio API (no external files needed)
- Generates sounds programmatically using oscillators
- Alert types:
  - Fire/Smoke: Wailing siren (frequency sweep)
  - Danger: Rapid alarm beeps
  - Gas: Hiss + warning beeps
  - Human Found: Ascending tones (positive alert)
  - Debris: Short whoop
- Throttled to prevent sound spam

---

## Backend Modules

### server/index.js
**Role:** Main Node.js server
- Express REST API server on port 5000
- Two WebSocket servers:
  - `/` — Frontend dashboard clients
  - `/hardware` — ESP32 rover connection
- Routes WebSocket upgrades by URL path
- Broadcasts sensor data to all frontend clients
- Translates website commands (FORWARD) to ESP32 format (F)
- Command polling endpoint for ESP32
- Vision LLM endpoint with rate limiting

### server/sensorManager.js
**Role:** Sensor data state manager
- Stores latest sensor readings
- Hardware-only mode (no simulation)
- Normalizes field names (temp → temperature)
- Called by WebSocket handler when ESP32 sends data

### server/llm.js
**Role:** Groq AI integration
- Two functions:
  1. `getLLMRecommendation()` — Llama 3.1 text recommendations
  2. `getVisionDescription()` — Llama 4 Scout image analysis
- Builds military-style prompts with sensor context
- 3 second timeout with fallback responses
- Fallback rule-based recommendations if API fails

### server/yoloClient.js
**Role:** YOLO service connector
- Connects frontend detection results to server state

---

## Python AI Service

### server/yolo/app.py
**Role:** Real-time object detection service
- FastAPI WebSocket server on port 5001
- Receives base64 encoded camera frames
- Runs 3 detection methods simultaneously:
  1. YOLOv8n — detects humans and debris
  2. Fire model (fire_debris.pt) — detects fire/smoke
  3. HSV color detection — fire fallback (no model needed)
- Lazy model loading (loads on first frame to save RAM)
- Returns JSON with bounding boxes, classes, confidence scores
- Risk level calculation: SAFE / WARNING / CRITICAL

---

## Hardware (ESP32)

### ESP32_OmniRover.ino
**Role:** Rover embedded controller
- WiFi connection to same network as laptop
- WebSocket client connecting to server /hardware path
- Sends sensor JSON every 1 second
- Receives single-letter commands: F/B/L/R/S
- 2-second failsafe: stops motors if no command received
- Hard stop: stops if obstacle < 15cm
- Sensors: DHT11, MQ-2, HC-SR04, Flame sensor
- Motors: 2x L298N drivers (4-wheel drive)
- Servo: Camera pan control

---

## Data Flow Summary

```
1. ESP32 reads sensors every 500ms
2. Sends JSON via WebSocket to server /hardware
3. Server normalizes data, calls Groq LLM every 10s
4. Server broadcasts enriched data to all frontend clients
5. Frontend updates all sensor cards, risk indicator, map
6. Camera tab sends frames to YOLO service
7. YOLO returns detections → bounding boxes drawn on canvas
8. Detections merged with sensor data for unified risk assessment
9. Sound alerts triggered on threshold crossings
10. All data logged for mission report generation
```

---

## File Structure

```
OmniRover/
├── rescue-rover/              # React Frontend
│   ├── src/
│   │   ├── App.jsx            # Root + tab router
│   │   ├── components/        # 14 UI components
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── AlertBanner.jsx
│   │   │   ├── SensorCard.jsx
│   │   │   ├── RiskIndicator.jsx
│   │   │   ├── AIDetectionPanel.jsx
│   │   │   ├── RecommendationPanel.jsx
│   │   │   ├── LiveMap.jsx
│   │   │   ├── CameraFeed.jsx
│   │   │   ├── VisionPanel.jsx
│   │   │   ├── UltrasonicPanel.jsx
│   │   │   ├── RoverController.jsx
│   │   │   ├── AnalyticsPanel.jsx
│   │   │   ├── MissionReport.jsx
│   │   │   ├── DataLogs.jsx
│   │   │   └── SensorCard.jsx
│   │   └── hooks/
│   │       ├── useSensorData.js
│   │       └── useAlertSound.js
│   └── package.json
│
├── server/                    # Node.js Backend
│   ├── index.js               # Main server
│   ├── llm.js                 # Groq AI integration
│   ├── sensorManager.js       # Sensor state
│   ├── yoloClient.js          # YOLO connector
│   └── yolo/                  # Python AI Service
│       ├── app.py             # FastAPI YOLO server
│       ├── yolov8n.pt         # Human detection model
│       ├── fire_debris.pt     # Fire detection model
│       └── requirements.txt
│
├── ESP32_OmniRover.ino        # Arduino ESP32 code
├── HARDWARE_SETUP.md          # Wiring guide
└── PROJECT_SUMMARY.md         # This file
```

---

## Technology Stack Summary

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, Tailwind CSS, OpenLayers |
| Backend | Node.js, Express, WebSocket (ws) |
| AI Detection | Python, FastAPI, YOLOv8, OpenCV, PyTorch |
| AI Language | Groq API, Llama 3.1 8B, Llama 4 Scout |
| Hardware | ESP32, Arduino IDE, DHT11, MQ-2, HC-SR04 |
| Communication | WebSocket, HTTP REST, WiFi 802.11 |
| Hosting | Vercel (frontend), Railway (backend) |
| Version Control | GitHub |
