/**
 * POWERLINK V7.2 - FIRMWARE DE PRODUCCIÓN (LCD Rollback + Heartbeat Corregido)
 *
 * Descripción:
 * Este firmware implementa la lógica completa para el medidor inteligente PowerLink.
 *
 * =================================================================
 * 🌳 CAMBIOS DE LA VERSIÓN 7.2
 * =================================================================
 * 1.  (PANTALLA) Se revierte la migración a OLED. Vuelve a usar la
 * librería <LiquidCrystal_I2C.h> para la pantalla LCD estándar.
 * 2.  (PINES I2C) Se restauran los pines I2C a SDA=8 y SCL=9.
 * 3.  (AJUSTE) Se mantiene el Filtro de Ruido de Corriente (KWh) en 0.12A.
 * 4.  (BUGFIX) Se mantiene la Lógica de Heartbeat No Bloqueante.
 * 5.  (BUGFIX) Se mantiene la autenticación corregida del Heartbeat de DB.
 * 6.  (PIN) Se mantiene el pin del relé en 18.
 * =================================================================
 */

// --- LIBRERÍAS ---
// Core
#include <Wire.h>
#include <Preferences.h> // Para guardar estado del relé en NVS
#include <time.h>

// Conectividad
#include <WiFi.h>
#include <WiFiManager.h>   // Portal cautivo
#include <HTTPClient.h>    // Para enviar datos a Supabase (POST y PATCH)
#include <WebSocketsClient.h> // Para escuchar comandos (Supabase Realtime)
#include <ArduinoJson.h>   // Para formatear y parsear JSON

// Tiempo
#include <WiFiUdp.h>
#include <NTPClient.h>     // Sincronización de hora

// Periféricos (¡REVERTIDO A LCD!)
#include <LiquidCrystal_I2C.h> // LCD

// --- CONFIGURACIÓN DEL BACKEND (¡REEMPLAZAR!) ---
const char* SUPABASE_URL = "https://dlyimebtdchiyxdluwrk.supabase.co"; // Reemplazar
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseWltZWJ0ZGNoaXl4ZGx1d3JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NDU2MTgsImV4cCI6MjA3ODIyMTYxOH0.YdvsEJgaKQ4H9ZMWplnyQ6Go04xM9MtrHdBx1tenCF4"; // Reemplazar

// --- CONFIGURACIÓN DEL HARDWARE ---
const int RELAY_PIN = 18; // ¡Pin 18! (Pin 4 original da conflicto con ADC1)
const int BUTTON_PIN = 5;
const int CURRENT_SENSOR_PIN = 1; // GPIO1 = ADC1_CH0

// --- PANTALLA LCD (¡REVERTIDO!) ---
// Dirección LCD
LiquidCrystal_I2C lcd(0x3F, 16, 2);

// --- CONFIGURACIÓN DE LÓGICA ---
const float VOLTAGE_RMS = 127.0; // Voltaje RMS (ej. 127V para México)
const float SENSOR_SENSITIVITY = 0.066; // Sensibilidad ACS712 (0.066V/A para 20A)
const long KWH_ACCUMULATION_INTERVAL_MS = 60000; // 1 minuto (Acumular energía)
const long DATA_SEND_INTERVAL_MS = 300000; // 5 minutos (Enviar datos al backend)
const long NTP_OFFSET_SECONDS = 0; // Offset UTC (ej. 0 para CST)

// (¡MODIFICACIÓN 2!) Ajusta este valor para ignorar ruido
const float NOISE_FLOOR_CURRENT = 0.12; // (Original: 0.08)

// --- VARIABLES GLOBALES DE ESTADO ---
bool relayState = false;
float instantPower = 0.0;     // Watts instantáneos
double accumulatedEnergy = 0.0; // Acumulador (en Watt-Segundos)
unsigned long lastKwhSendTime = 0;
unsigned long lastEnergyAccumulationTime = 0;
String deviceMacAddress = "";
int sensorZeroOffset = 2048; // ADC offset (0 Amps), se auto-calibra

// --- OBJETOS GLOBALES ---
Preferences preferences;     // Objeto NVS
WiFiManager wm;              // WiFiManager
WiFiUDP ntpUDP;              // NTP
NTPClient timeClient(ntpUDP, "pool.ntp.org", NTP_OFFSET_SECONDS);
WebSocketsClient webSocket;  // Supabase Realtime
HTTPClient http;             // Supabase Ingest

// Buffers estáticos para JSON (Evita fragmentación de memoria)
StaticJsonDocument<1024> wsJsonDoc;
StaticJsonDocument<256> httpJsonDoc;

// --- (¡MODIFICACIÓN 3!) Lógica de Heartbeat ---
String heartbeatPayload = "";
unsigned long lastHeartbeatSent = 0;   // Temporizador para el WebSocket (phx)
const long heartbeatInterval = 30000; // 30 segundos

unsigned long lastDbHeartbeat = 0;     // Temporizador para el `ultimo_heartbeat` (DB)
const long dbHeartbeatInterval = 60000; // 1 minuto

// =================================================================
// 🕋 MÓDULO DE INICIALIZACIÓN (SETUP)
// =================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("🚀 [POWERLINK V7.2] Iniciando Firmware (LCD)...");

  // 1. Inicializar I2C y LCD (¡REVERTIDO!)
  Wire.begin(8, 9); // Pines (SDA, SCL) originales
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.print("PowerLink V7.2");
  lcd.setCursor(0, 1);
  lcd.print("Iniciando...");
  Serial.println("📟 Display LCD inicializado (0x3F)");

  // 2. Inicializar Periféricos (Arquitectura)
  inicializar_perifericos();

  // 3. Calibrar Sensor (Crítico para RMS)
  calibrateSensor();

  // 4. Conectar WiFi (Arquitectura)
  conectar_wifi();

  // 5. Sincronizar Hora (Arquitectura)
  sincronizar_hora();

  // 6. Conectar Backend (Arquitectura)
  conectar_backend();

  // Estado listo
  Serial.println("✅ Sistema completamente inicializado.");
  updateDisplay(); // Mostrar estado inicial
}

// =================================================================
// 🔄 MÓDULO DE OPERACIÓN (LOOP)
// =================================================================
void loop() {
  unsigned long now = millis();

  // 1. Escuchar comandos del backend (Supabase Realtime)
  webSocket.loop();

  // 2. (¡MODIFICACIÓN 3!) Lógica de Heartbeat de WebSocket (No Bloqueante)
  if (webSocket.isConnected() && (now - lastHeartbeatSent > heartbeatInterval)) {
    webSocket.sendTXT(heartbeatPayload);
    lastHeartbeatSent = now;
    Serial.println("❤️  [WS] Enviando Heartbeat (phx)...");
  }

  // 3. (¡NUEVA FUNCIÓN!) Lógica de Heartbeat de Base de Datos (No Bloqueante)
  if (WiFi.status() == WL_CONNECTED && (now - lastDbHeartbeat > dbHeartbeatInterval)) {
    enviar_heartbeat_db(); // Esta función actualiza su propio temporizador
  }
  
  // 4. Control por botón físico (Prototipo)
  static unsigned long lastButtonPress = 0;
  if (digitalRead(BUTTON_PIN) == LOW && (now - lastButtonPress > 250)) {
    Serial.println("🎛️ Botón presionado");
    toggleRelay();
    lastButtonPress = now;
  }

  // 5. Leer sensor (Potencia instantánea)
  leer_sensor();

  // 6. Acumular energía (Arquitectura)
  acumular_energia();

  // 7. Enviar datos al backend (Arquitectura)
  enviar_datos_backend();

  // 8. Actualizar display (Prototipo modificado)
  static unsigned long lastDisplayUpdate = 0;
  if (now - lastDisplayUpdate > 500) {
    updateDisplay();
    lastDisplayUpdate = now;
  }
}

// =================================================================
// 🔧 FUNCIONES AUXILIARES (SETUP)
// =================================================================

/**
 * @brief (Arquitectura) Configura pines y recupera estado del relé.
 */
void inicializar_perifericos() {
  Serial.println("🔧 Inicializando periféricos...");
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  preferences.begin("powerlink", false);
  relayState = preferences.getBool("relayState", false);
  digitalWrite(RELAY_PIN, relayState);
  Serial.print("🔌 Estado de relé recuperado: ");
  Serial.println(relayState ? "ON" : "OFF");
}

/**
 * @brief (Prototipo mejorado) Calibra el offset "cero" del ACS712.
 */
void calibrateSensor() {
  Serial.println("🔧 Calibrando sensor... (No conectar carga)");
  lcd.clear();
  lcd.print("Calibrando...");
  
  long totalAdc = 0;
  for (int i = 0; i < 500; i++) {
    totalAdc += analogRead(CURRENT_SENSOR_PIN);
    delay(2);
  }
  sensorZeroOffset = totalAdc / 500;
  
  Serial.print("🔧 Offset ADC (Cero Amps): ");
  Serial.println(sensorZeroOffset);

  lcd.setCursor(0, 1);
  lcd.print("Offset: ");
  lcd.print(sensorZeroOffset);
  delay(2000);
}

/**
 * @brief (Arquitectura) Conecta a WiFi usando WiFiManager.
 */
void conectar_wifi() {
  Serial.println("🌐 Conectando a WiFi...");
  lcd.clear();
  lcd.print("Conectando WiFi");

  WiFi.mode(WIFI_STA);
  wm.setConnectTimeout(20);
  wm.setConfigPortalTimeout(180); // 3 minutos

  if (!wm.autoConnect("PowerLink-Setup")) {
    Serial.println("❌ Falló la conexión (timeout). Reiniciando...");
    lcd.clear();
    lcd.print("Error WiFi");
    lcd.setCursor(0, 1);
    lcd.print("Reiniciando...");
    delay(3000);
    ESP.restart();
  }

  deviceMacAddress = WiFi.macAddress();
  Serial.print("✅ WiFi Conectado! IP: "); Serial.println(WiFi.localIP());
  Serial.print("🆔 MAC (Device ID): "); Serial.println(deviceMacAddress);
  
  lcd.clear();
  lcd.print("WiFi Conectado!");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP());
  delay(2000);
}

/**
 * @brief (Arquitectura) Sincroniza la hora mundial usando NTP.
 */
void sincronizar_hora() {
  Serial.println("🕑 Sincronizando hora (NTP)...");
  lcd.clear();
  lcd.print("Sincronizando");
  lcd.setCursor(0, 1);
  lcd.print("Hora (NTP)...");
  
  timeClient.begin();
  if (timeClient.forceUpdate()) {
    time_t epochTime = timeClient.getEpochTime();
    struct tm * ptm;
    ptm = gmtime(&epochTime);
    Serial.print("✅ Hora sincronizada (UTC): ");
    Serial.print(asctime(ptm));
    lcd.clear();
    lcd.print("Hora OK");
  } else {
    Serial.println("❌ Error al sincronizar hora.");
    lcd.clear();
    lcd.print("Error de Hora");
  }
  delay(1500);
}


/**
 * @brief (Arquitectura) Inicia la conexión WebSocket con Supabase Realtime.
 */
void conectar_backend() {
  Serial.println("🚀 Conectando a Supabase Realtime...");
  lcd.clear();
  lcd.print("Conectando");
  lcd.setCursor(0, 1);
  lcd.print("Backend...");

  String url = SUPABASE_URL;
  url.replace("https://", "");
  String host = url;
  String realtimePath = "/realtime/v1/websocket?apikey=" + String(SUPABASE_ANON_KEY) + "&vsn=1.0.0";

  webSocket.beginSSL(host.c_str(), 443, realtimePath.c_str());
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

// =================================================================
// ⚙️ FUNCIONES PRINCIPALES (LOOP)
// =================================================================

/**
 * @brief (Arquitectura - Crítico) Lee el sensor y calcula Potencia (W).
 */
void leer_sensor() {
  unsigned long startTime = millis();
  double sumOfSquares = 0;
  int sampleCount = 0;
  int adcReading;

  while (millis() - startTime < 100) {
    adcReading = analogRead(CURRENT_SENSOR_PIN);
    double sample = (double)adcReading - sensorZeroOffset;
    sumOfSquares += sample * sample;
    sampleCount++;
  }

  if (sampleCount == 0) {
    instantPower = 0.0;
    return;
  }

  double mean = sumOfSquares / (double)sampleCount;
  double rmsAdc = sqrt(mean);
  double rmsVoltage = (rmsAdc * 3.3) / 4095.0;
  double rmsCurrent = rmsVoltage / SENSOR_SENSITIVITY;

  // (¡MODIFICACIÓN 2!) Filtrar ruido (si la corriente es muy baja, es 0)
  if (rmsCurrent < NOISE_FLOOR_CURRENT) { 
    rmsCurrent = 0.0;
  }

  instantPower = VOLTAGE_RMS * rmsCurrent;
}

/**
 * @brief (Arquitectura) Acumula la potencia (W) en Watt-Segundos.
 */
void acumular_energia() {
  unsigned long now = millis();
  float timeDeltaSeconds = (float)(now - lastEnergyAccumulationTime) / 1000.0;
  accumulatedEnergy += (double)instantPower * (double)timeDeltaSeconds;
  lastEnergyAccumulationTime = now;

  static unsigned long lastDebug = 0;
  if (now - lastDebug > 5000) {
    Serial.printf("⚡️ Pwr: %.2f W | 🔋 Energy (W-s): %.2f\n", instantPower, accumulatedEnergy);
    lastDebug = now;
  }
}

/**
 * @brief (Arquitectura) Envía los KWh acumulados a la API /ingest.
 */
void enviar_datos_backend() {
  unsigned long now = millis();
  if (now - lastKwhSendTime < DATA_SEND_INTERVAL_MS) {
    return;
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("📤 [ERROR] No hay WiFi, reintentando envío más tarde.");
    lastKwhSendTime = now;
    return;
  }
  
  double kwh_consumed = accumulatedEnergy / 3600000.0;
  Serial.println("📤 Preparando envío de datos a la API /ingest...");
  Serial.printf("   KWh Acumulados: %.6f\n", kwh_consumed);

  timeClient.update();
  time_t epochTime = timeClient.getEpochTime();
  struct tm * ptm;
  ptm = gmtime(&epochTime);
  char timestamp[21];
  strftime(timestamp, 21, "%Y-%m-%dT%H:%M:%SZ", ptm);

  httpJsonDoc.clear();
  httpJsonDoc["id_hardware"] = deviceMacAddress;
  httpJsonDoc["timestamp"] = timestamp;
  httpJsonDoc["kwh_consumed"] = kwh_consumed;
  String payload;
  serializeJson(httpJsonDoc, payload);

  String ingestUrl = String(SUPABASE_URL) + "/functions/v1/ingest"; 
  http.begin(ingestUrl);
  // (¡Correcto!) Las Edge Functions usan "Authorization: Bearer"
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  http.addHeader("Content-Type", "application/json");

  Serial.print("   Enviando a: "); Serial.println(ingestUrl);
  Serial.print("   Payload: "); Serial.println(payload);
  int httpCode = http.POST(payload);

  if (httpCode >= 200 && httpCode < 300) {
    Serial.printf("✅ [HTTP %d] Datos enviados a /ingest correctamente.\n", httpCode);
    accumulatedEnergy = 0.0;
  } else {
    Serial.printf("❌ [HTTP %d] Error al enviar datos a /ingest.\n", httpCode);
    Serial.println(http.getString());
  }
  http.end();
  lastKwhSendTime = now;
}

/**
 * @brief (¡FUNCIÓN CORREGIDA!) Envía un 'heartbeat' a la DB cada minuto.
 * Actualiza la columna 'ultimo_heartbeat' para mostrar que está vivo.
 */
void enviar_heartbeat_db() {
  Serial.println("❤️  [DB] Preparando Heartbeat para Supabase...");
  lastDbHeartbeat = millis(); // Actualizar el temporizador INMEDIATAMENTE para evitar envíos dobles

  // 1. Obtener Timestamp
  timeClient.update();
  time_t epochTime = timeClient.getEpochTime();
  struct tm * ptm;
  ptm = gmtime(&epochTime);
  char timestamp[21];
  strftime(timestamp, 21, "%Y-%m-%dT%H:%M:%SZ", ptm);

  // 2. Construir JSON (solo la columna a actualizar)
  httpJsonDoc.clear();
  httpJsonDoc["ultimo_heartbeat"] = timestamp;
  String payload;
  serializeJson(httpJsonDoc, payload);

  // 3. Construir URL para el PATCH
  String patchUrl = String(SUPABASE_URL) + "/rest/v1/dispositivos?id_hardware=eq." + deviceMacAddress;

  http.begin(patchUrl);
  // =================================================================
  // ¡¡¡ CAMBIO CRÍTICO (V7.1) !!!
  // La API REST (/rest/v1) necesita 'apikey' para el gateway
  // y 'Authorization' para identificar el rol ('anon' en este caso).
  http.addHeader("apikey", String(SUPABASE_ANON_KEY));
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  // =================================================================
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal"); // No necesitamos que nos devuelva la fila

  // 4. Enviar PATCH
  Serial.print("   Enviando a: "); Serial.println(patchUrl);
  int httpCode = http.PATCH(payload);

  if (httpCode >= 200 && httpCode < 300) {
    Serial.printf("✅ [HTTP %d] Heartbeat de DB enviado correctamente.\n", httpCode);
  } else {
    Serial.printf("❌ [HTTP %d] Error al enviar heartbeat de DB.\n", httpCode);
    Serial.println(http.getString());
  }
  http.end();
}


// =================================================================
// 🎮 CONTROL Y DISPLAY
// =================================================================

/**
 * @brief (Arquitectura + Prototipo) Actúa sobre el relé y guarda el estado.
 */
void actuar_rele(bool state) {
  relayState = state;
  digitalWrite(RELAY_PIN, state);
  preferences.putBool("relayState", state); // Guardar en NVS
  Serial.print("🔌 Relay: ");
  Serial.println(state ? "ON 🟢" : "OFF 🔴");
  updateDisplay(); // Actualizar LCD inmediatamente
}

/**
 * @brief (Prototipo) Cambia el estado del relé.
 */
void toggleRelay() {
  actuar_rele(!relayState);
}

/**
 * @brief (¡REVERTIDO!) Actualiza la pantalla LCD.
 */
void updateDisplay() {
  // Línea 1: Estado del Relay
  lcd.setCursor(0, 0);
  lcd.print("Relay: ");
  lcd.print(relayState ? "ON " : "OFF");
  
  // Indicador de "vivo"
  lcd.setCursor(15, 0);
  lcd.print(millis() % 1000 < 500 ? "*" : " ");

  // Línea 2: Potencia Instantánea
  lcd.setCursor(0, 1);
  lcd.print("Pwr: ");
  
  String pwrStr = String(instantPower, 1); // 1 decimal
  lcd.print(pwrStr);
  lcd.print(" W");
  
  // Limpiar espacios sobrantes
  for (int i = pwrStr.length() + 6; i < 16; i++) {
    lcd.print(" ");
  }
}

// =================================================================
// 📡 MANEJADOR DE EVENTOS WEBSOCKET (SUPABASE REALTIME)
// =================================================================

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("📡 [WS] Desconectado.");
      lcd.clear();
      lcd.print("Backend");
      lcd.setCursor(0, 1);
      lcd.print("Desconectado");
      delay(2000);
      updateDisplay();
      break;

    case WStype_CONNECTED: {
      Serial.println("📡 [WS] Conectado!");
      lcd.clear();
      lcd.print("Backend");
      lcd.setCursor(0, 1);
      lcd.print("Conectado");
      delay(2000);
      
      // 1. Suscripción a "Postgres Changes" (sin cambios)
      wsJsonDoc.clear();
      wsJsonDoc["topic"] = "realtime:public:dispositivos"; 
      wsJsonDoc["event"] = "phx_join";
      JsonObject payloadConfig = wsJsonDoc["payload"].createNestedObject("config");
      JsonArray postgresChanges = payloadConfig.createNestedArray("postgres_changes");
      JsonObject filter = postgresChanges.createNestedObject();
      filter["table"] = "dispositivos";
      filter["schema"] = "public";
      filter["filter"] = "id_hardware=eq." + deviceMacAddress; 
      wsJsonDoc["ref"] = "1";
      String joinMsg;
      serializeJson(wsJsonDoc, joinMsg);
      webSocket.sendTXT(joinMsg);
      Serial.print("   Suscrito a cambios en 'dispositivos' para: "); 
      Serial.println(deviceMacAddress);
      
      // 2. (¡MODIFICACIÓN 3!) Preparar el Heartbeat (¡PERO NO ENVIARLO!)
      wsJsonDoc.clear();
      wsJsonDoc["topic"] = "phoenix";
      wsJsonDoc["event"] = "heartbeat";
      wsJsonDoc["payload"] = JsonObject();
      wsJsonDoc["ref"] = "2";
      serializeJson(wsJsonDoc, heartbeatPayload); 
      
      // El loop() principal se encargará de enviarlo por primera vez
      lastHeartbeatSent = millis(); // Inicia el contador
    }
    break;

    case WStype_TEXT: {
      Serial.print("📡 [WS] RX: "); Serial.println((char*)payload);
      
      DeserializationError error = deserializeJson(wsJsonDoc, payload);
      if (error) {
        Serial.print("   Error parseando JSON: ");
        Serial.println(error.c_str());
        return;
      }
      
      const char* event = wsJsonDoc["event"];
      const char* ref = wsJsonDoc["ref"];

      // 1. (¡MODIFICACIÓN 3!) Manejar el Heartbeat ACK (No Bloqueante)
      if (ref != nullptr && strcmp(ref, "2") == 0) {
        Serial.println("   Heartbeat ACK");
        // ¡NO HAY DELAY! ¡NO HAY SEND!
        // Solo salimos. El loop() se encargará del próximo envío.
        return; 
      }

      // 2. Manejar "postgres_changes" (Corregido)
      if (event != nullptr && strcmp(event, "postgres_changes") == 0) {
        JsonObject data = wsJsonDoc["payload"]["data"];
        String type = data["type"];
        String table = data["table"];
        
        if (type == "UPDATE" && table == "dispositivos") {
          Serial.println("   ¡Cambio detectado en nuestro dispositivo!");
          bool newState = data["record"]["estado_rele_actual"].as<bool>();
          Serial.print("   Comando recibido de la DB: ");
          Serial.println(newState ? "ON" : "OFF");
          actuar_rele(newState);
        }
      }
    }
    break;
      
    case WStype_ERROR:
    case WStype_FRAGMENT_TEXT_START:
    case WStype_FRAGMENT_BIN_START:
    case WStype_FRAGMENT:
    case WStype_FRAGMENT_FIN:
    case WStype_BIN:
    case WStype_PING:
    case WStype_PONG:
      break;
  }
}