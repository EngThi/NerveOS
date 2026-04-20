// NerveOS Serial Bridge — ESP32
// Qualquer texto recebido via Serial é ecoado + resposta de status
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("DATA:CPU:12|TEMP:38|ENC:0");  // boot packet
  Serial.println("NerveOS Bridge Ready");
}

void loop() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    
    if (cmd == "SYSTEM:PING")         Serial.println("PONG:OK");
    else if (cmd == "SYSTEM:REBOOT")  { Serial.println("Rebooting..."); delay(500); ESP.restart(); }
    else if (cmd == "SCAN:WIFI")      Serial.println("WiFi: Scanning... 3 networks found");
    else if (cmd == "LED:BLINK:SOS")  { Serial.println("SOS: Blinking"); }
    else if (cmd.startsWith("DATA:")) Serial.println("DATA:CPU:15|TEMP:42|ENC:120");
    else {
      // Eco genérico de qualquer comando
      Serial.print("ACK:");
      Serial.println(cmd);
    }
  }
  
  // Envia telemetria a cada 5 segundos
  static unsigned long last = 0;
  if (millis() - last > 5000) {
    last = millis();
    int cpu = random(10, 60);
    int temp = random(35, 55);
    Serial.print("DATA:CPU:"); Serial.print(cpu);
    Serial.print("|TEMP:"); Serial.print(temp);
    Serial.println("|ENC:0");
  }
}
