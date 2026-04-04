#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <DHT.h>

// ===== WIFI =====
const char* WIFI_SSID     = "Ox";
const char* WIFI_PASSWORD = "uxic20252";
const char* SERVER_IP     = "10.222.71.222"; // Fixed to match your laptop's current IP!
const int   SERVER_PORT   = 5000;

// ===== PINS =====
#define TRIG 4
#define ECHO 5
#define DHT_PIN 15
#define GAS_PIN 34
#define FLAME_PIN 35
#define BUZZER 12
#define SERVO_PIN 13

// LEFT DRIVER
#define L1 14
#define L2 27
#define L3 26
#define L4 25

// RIGHT DRIVER
#define R1 33
#define R2 32
#define R3 18
#define R4 19

// ===== OBJECTS =====
WebSocketsClient ws;
Servo myServo;
DHT dht(DHT_PIN, DHT11);

// ===== GLOBAL =====
bool wsConnected = false;
unsigned long lastSend = 0;
unsigned long lastCmdTime = 0;

// ===== ULTRASONIC =====
long getDistance() {
  digitalWrite(TRIG, LOW); delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long d = pulseIn(ECHO, HIGH, 30000) * 0.034 / 2;
  return (d == 0) ? 400 : d;
}

// ===== MOTOR =====
void stopMotors() {
  digitalWrite(L1,LOW); digitalWrite(L2,LOW);
  digitalWrite(L3,LOW); digitalWrite(L4,LOW);
  digitalWrite(R1,LOW); digitalWrite(R2,LOW);
  digitalWrite(R3,LOW); digitalWrite(R4,LOW);
}

void forward() {
  digitalWrite(L1,HIGH); digitalWrite(L2,LOW);
  digitalWrite(L3,HIGH); digitalWrite(L4,LOW);
  digitalWrite(R1,HIGH); digitalWrite(R2,LOW);
  digitalWrite(R3,HIGH); digitalWrite(R4,LOW);
}

void backward() {
  digitalWrite(L1,LOW); digitalWrite(L2,HIGH);
  digitalWrite(L3,LOW); digitalWrite(L4,HIGH);
  digitalWrite(R1,LOW); digitalWrite(R2,HIGH);
  digitalWrite(R3,LOW); digitalWrite(R4,HIGH);
}

void left() {
  digitalWrite(L1,LOW); digitalWrite(L2,HIGH);
  digitalWrite(L3,LOW); digitalWrite(L4,HIGH);
  digitalWrite(R1,HIGH); digitalWrite(R2,LOW);
  digitalWrite(R3,HIGH); digitalWrite(R4,LOW);
}

void right() {
  digitalWrite(L1,HIGH); digitalWrite(L2,LOW);
  digitalWrite(L3,HIGH); digitalWrite(L4,LOW);
  digitalWrite(R1,LOW); digitalWrite(R2,HIGH);
  digitalWrite(R3,LOW); digitalWrite(R4,HIGH);
}

// ===== SERVO SCAN =====
int scanDirection() {
  int leftDist, rightDist;

  myServo.write(135);
  delay(400);
  leftDist = getDistance();

  myServo.write(45);
  delay(400);
  rightDist = getDistance();

  myServo.write(90);
  delay(200);

  return (leftDist > rightDist) ? 1 : 2;
}

// ===== COMMAND =====
void handleCommand(String cmd) {

  Serial.println("CMD: " + cmd);
  lastCmdTime = millis();

  // Updated to support both old single-letter and new JSON-based full words!
  if(cmd=="F" || cmd=="FORWARD") forward();
  else if(cmd=="B" || cmd=="BACKWARD") backward();
  else if(cmd=="L" || cmd=="LEFT") left();
  else if(cmd=="R" || cmd=="RIGHT") right();
  else if(cmd=="S" || cmd=="STOP" || cmd=="NONE") stopMotors();

  else if(cmd=="AUTO"){
    int d = getDistance();
    if(d < 15){
      stopMotors();
      int dir = scanDirection();
      if(dir==1) left();
      else right();
    } else {
      forward();
    }
  }

  else if(cmd=="BUZ"){
    digitalWrite(BUZZER, !digitalRead(BUZZER));
  }
}

// ===== WEBSOCKET =====
void onWsEvent(WStype_t type, uint8_t* payload, size_t length) {

  if (type == WStype_CONNECTED) {
    wsConnected = true;
    Serial.println("WS CONNECTED");
  }

  else if (type == WStype_DISCONNECTED) {
    wsConnected = false;
    stopMotors();
  }

  else if (type == WStype_TEXT) {
    // Safely convert payload to String using the known length to avoid garbage characters
    String msg = "";
    for(size_t i=0; i<length; i++) msg += (char)payload[i];
    
    // Check if the payload is a JSON object from our newly updated server
    if (msg.startsWith("{")) {
      StaticJsonDocument<256> doc;
      // deserializeJson is extremely safe when given length
      DeserializationError err = deserializeJson(doc, payload, length);
      if (!err) {
        String cmd = doc["cmd"] | "STOP";
        int angle = doc["angle"] | -1;
        
        // Handle servo panning from the website directly!
        if (angle >= 0 && angle <= 180) {
          myServo.write(angle);
        }
        
        // Execute the parsed command
        handleCommand(cmd);
      } else {
        Serial.println("JSON Parse Failed: " + String(err.c_str()));
      }
    } else {
      // Fallback for plain text commands (e.g. "F", "B")
      handleCommand(msg);
    }
  }
}

// ===== SETUP =====
void setup() {
  Serial.begin(115200);

  pinMode(L1,OUTPUT); pinMode(L2,OUTPUT);
  pinMode(L3,OUTPUT); pinMode(L4,OUTPUT);
  pinMode(R1,OUTPUT); pinMode(R2,OUTPUT);
  pinMode(R3,OUTPUT); pinMode(R4,OUTPUT);

  pinMode(TRIG,OUTPUT);
  pinMode(ECHO,INPUT);

  pinMode(GAS_PIN,INPUT);
  pinMode(FLAME_PIN,INPUT);

  pinMode(BUZZER,OUTPUT);
  digitalWrite(BUZZER,HIGH); // OFF

  dht.begin();

  // Default servo attachment (prevents locking up some servos)
  myServo.setPeriodHertz(50);
  myServo.attach(SERVO_PIN);
  myServo.write(90);

  stopMotors();

  // WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected: " + WiFi.localIP().toString());

  ws.begin(SERVER_IP, SERVER_PORT, "/hardware");
  ws.onEvent(onWsEvent);
  ws.setReconnectInterval(3000);
}

// ===== LOOP =====
void loop() {
  ws.loop();  // must run as fast as possible

  // Non-blocking distance read — only every 100ms
  static unsigned long lastDist = 0;
  static long d = 400;
  if (millis() - lastDist > 100) {
    lastDist = millis();
    d = getDistance();
  }

  ws.loop();  // call again after blocking operations

  // HARD STOP
  if (d < 15) { stopMotors(); }

  // FAILSAFE — stop if no command for 2 seconds
  if (millis() - lastCmdTime > 2000) { stopMotors(); }

  ws.loop();  // call again

  // SEND SENSOR DATA every 1 second
  if (millis() - lastSend > 1000) {
    lastSend = millis();
    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();
    int gas    = analogRead(GAS_PIN);
    int flame  = digitalRead(FLAME_PIN);

    StaticJsonDocument<256> doc;
    doc["distance"] = d;
    doc["temp"]     = isnan(temp) ? 0 : temp;
    doc["humidity"] = isnan(hum)  ? 0 : hum;
    doc["gas"]      = gas;
    doc["flame"]    = (flame == 0 ? "DETECTED" : "NORMAL");
    String json;
    serializeJson(doc, json);
    if (wsConnected) ws.sendTXT(json);
    Serial.println(json);
  }

  ws.loop();  // final call
}
