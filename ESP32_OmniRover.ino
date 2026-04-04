/*
  OmniRover ESP32 — HTTP POST version (simpler, more reliable)
  Libraries needed:
  - ArduinoJson by Benoit Blanchon
  - DHT sensor library by Adafruit
  - Adafruit Unified Sensor by Adafruit
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <ESP32Servo.h>

// ── CHANGE THESE ─────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_IP     = "10.222.71.222";  // your laptop IP
// ─────────────────────────────────────────────────────────────

String SERVER_URL = String("http://") + SERVER_IP + ":5000/api/hardware";
String CMD_URL    = String("http://") + SERVER_IP + ":5000/api/command-poll";

// ── PINS ─────────────────────────────────────────────────────
#define TRIG1     5
#define ECHO1     18
#define TRIG2     19
#define ECHO2     21
#define DHT_PIN   4
#define DHT_TYPE  DHT11
#define GAS_PIN   34
#define FLAME_PIN 35
#define MOT_L_FWD 25
#define MOT_L_BWD 26
#define MOT_L_EN  32
#define MOT_R_FWD 27
#define MOT_R_BWD 14
#define MOT_R_EN  33
#define SERVO_PIN 13

DHT dht(DHT_PIN, DHT_TYPE);
Servo camServo;
int currentSpeed = 180;

long readUltrasonic(int trig, int echo) {
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long d = pulseIn(echo, HIGH, 25000) * 0.034 / 2;
  return (d == 0 || d > 400) ? 400 : d;
}

void stopMotors()        { digitalWrite(MOT_L_FWD,LOW);  digitalWrite(MOT_L_BWD,LOW);  digitalWrite(MOT_R_FWD,LOW);  digitalWrite(MOT_R_BWD,LOW);  analogWrite(MOT_L_EN,0);   analogWrite(MOT_R_EN,0); }
void moveForward(int s)  { analogWrite(MOT_L_EN,s); analogWrite(MOT_R_EN,s); digitalWrite(MOT_L_FWD,HIGH); digitalWrite(MOT_L_BWD,LOW);  digitalWrite(MOT_R_FWD,HIGH); digitalWrite(MOT_R_BWD,LOW); }
void moveBackward(int s) { analogWrite(MOT_L_EN,s); analogWrite(MOT_R_EN,s); digitalWrite(MOT_L_BWD,HIGH); digitalWrite(MOT_L_FWD,LOW);  digitalWrite(MOT_R_BWD,HIGH); digitalWrite(MOT_R_FWD,LOW); }
void turnLeft(int s)     { analogWrite(MOT_L_EN,s); analogWrite(MOT_R_EN,s); digitalWrite(MOT_L_BWD,HIGH); digitalWrite(MOT_L_FWD,LOW);  digitalWrite(MOT_R_FWD,HIGH); digitalWrite(MOT_R_BWD,LOW); }
void turnRight(int s)    { analogWrite(MOT_L_EN,s); analogWrite(MOT_R_EN,s); digitalWrite(MOT_L_FWD,HIGH); digitalWrite(MOT_L_BWD,LOW);  digitalWrite(MOT_R_BWD,HIGH); digitalWrite(MOT_R_FWD,LOW); }

void executeCommand(String cmd, int spd) {
  currentSpeed = map(spd, 0, 100, 80, 255);
  Serial.println("[CMD] " + cmd);
  if      (cmd == "FORWARD")  moveForward(currentSpeed);
  else if (cmd == "BACKWARD") moveBackward(currentSpeed);
  else if (cmd == "LEFT")     turnLeft(currentSpeed);
  else if (cmd == "RIGHT")    turnRight(currentSpeed);
  else                        stopMotors();
}

void setup() {
  Serial.begin(115200);
  pinMode(MOT_L_FWD,OUTPUT); pinMode(MOT_L_BWD,OUTPUT); pinMode(MOT_L_EN,OUTPUT);
  pinMode(MOT_R_FWD,OUTPUT); pinMode(MOT_R_BWD,OUTPUT); pinMode(MOT_R_EN,OUTPUT);
  stopMotors();
  pinMode(TRIG1,OUTPUT); pinMode(ECHO1,INPUT);
  pinMode(TRIG2,OUTPUT); pinMode(ECHO2,INPUT);
  pinMode(FLAME_PIN,INPUT);
  
  // Only allocate ONE timer for the servo instead of all 4!
  // If we allocate all timers, analogWrite fails and drops motor speed drastically.
  ESP32PWM::allocateTimer(0);
  camServo.setPeriodHertz(50);
  camServo.attach(SERVO_PIN); // Use default pulse widths to prevent 180° hard-locks
  camServo.write(90); // Center by default

  dht.begin();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WiFi] Connecting");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\n[WiFi] Connected! IP: " + WiFi.localIP().toString());
  Serial.println("[SERVER] Sending to: " + SERVER_URL);
}

unsigned long lastSend = 0;
unsigned long lastCmdPoll = 0;

void loop() {
  // Send sensor data every 500ms
  if (millis() - lastSend > 500) {
    lastSend = millis();

    long u1 = readUltrasonic(TRIG1, ECHO1);
    long u2 = readUltrasonic(TRIG2, ECHO2);
    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();
    if (isnan(temp)) temp = 0;
    if (isnan(hum))  hum  = 0;
    float gasPPM = map(analogRead(GAS_PIN), 0, 4095, 0, 600);
    bool flame   = (digitalRead(FLAME_PIN) == LOW);

    StaticJsonDocument<300> doc;
    doc["temperature"] = round(temp * 10) / 10.0;
    doc["humidity"]    = round(hum);
    doc["gas"]         = round(gasPPM);
    doc["distance"]    = u1;
    doc["ultrasonic1"] = u1;
    doc["ultrasonic2"] = u2;
    doc["ultrasonic3"] = u2;
    doc["flameDetected"] = flame;
    doc["humanNearby"]   = (u1 < 80 || u2 < 80);

    String json;
    serializeJson(doc, json);
    Serial.println(json);

    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(SERVER_URL);
      http.addHeader("Content-Type", "application/json");
      int code = http.POST(json);
      if (code == 200) Serial.println("[HTTP] Sent OK");
      else Serial.println("[HTTP] Error: " + String(code));
      http.end();
    }
  }

  // Poll for commands every 300ms
  if (millis() - lastCmdPoll > 300) {
    lastCmdPoll = millis();
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(CMD_URL);
      int code = http.GET();
      if (code == 200) {
        String payload = http.getString();
        StaticJsonDocument<256> doc;
        if (!deserializeJson(doc, payload)) {
          String cmd = doc["cmd"] | "STOP";
          int spd    = doc["speed"] | 60;
          int angle  = doc["angle"] | -1;
          
          if (angle != -1 && angle >= 0 && angle <= 180) {
            camServo.write(angle);
          }
          if (cmd != "NONE") executeCommand(cmd, spd);
        }
      }
      http.end();
    }
  }
}
