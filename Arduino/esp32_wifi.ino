#include <WiFi.h>
#include <WebServer.h>
#include "M5Atom.h"

#define STASSID "Humanoid"
#define STAPSK "welcometo137"

const char* ssid = STASSID;
const char* password = STAPSK;

WebServer server(80); 

void handleRoot(); // function prototypes for HTTP handlers

const int DOWN_STATE = 1;
const int UP_STATE = 2;

int tally_initialized = false;
int tally_state = DOWN_STATE;
String tally_color = "ff0000";
int tally_brightness = 100;
String tally_mode = "full";

void setup() {
  Serial.begin(115200);

  // M5 begin
  M5.begin(true, false, true);
  delay(50);
  M5.dis.fillpix(0x000000);

  // We start by connecting to a WiFi network

  Serial.println();
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  /* Explicitly set the ESP8266 to be a WiFi-client, otherwise, it by default,
     would try to act as both a client and an access-point and could cause
     network-issues with your other WiFi-devices on your WiFi-network. */
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  //pinMode(BUILTIN_LED, OUTPUT);  // Initialize the LED_BUILTIN pin as an output

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());

  server.on("/", handleRoot);
  server.begin();

  //digitalWrite(BUILTIN_LED, HIGH);
}

void loop() {
  server.handleClient();
}

String getStateString(){
  if (tally_state == UP_STATE){
    return "UP";
  }else{
    return "DOWN";
  }
} 

void redraw(){
  if (tally_mode == "full"){
    if (tally_state == DOWN_STATE){
      M5.dis.fillpix(0x000000);
      M5.dis.setBrightness(0);
    }else{
      char charBuf[7]; // Buffer pour convertir la chaîne String en char array

      tally_color.toCharArray(charBuf, 7); // Conversion de String en char array
      unsigned long hexValue = strtoul(charBuf, NULL, 16); // Conversion de char array en valeur hexadécimale

      M5.dis.setBrightness(tally_brightness);
      M5.dis.fillpix(hexValue);
    }
  }
}

void updateInternalState(){

  // UP OR DOWN
  if (server.hasArg("state")){
    if (server.arg("state") == "UP"){
      tally_state = UP_STATE;
      Serial.println("State Updated");
    }
    if (server.arg("state") == "DOWN"){
      tally_state = DOWN_STATE;
      Serial.println("State Updated Down");
    }
  }

  if (server.hasArg("init")){
    tally_initialized = true;
  }

  // brightness
  if (server.hasArg("brightness")){
    int br = server.arg("brightness").toInt();
    if (br > 0 && br <= 100){
      tally_brightness = br;
    }
  }

  //COLOR setup
  if (server.hasArg("color")){
    tally_color = server.arg("color");
  }

  // MODE
  if (server.hasArg("mode")){
    tally_mode = server.arg("color");
  }

  String initialized = "";
  if (tally_initialized == false){
    initialized = "Not Initialized. ";
  }
}

void handleRoot() {
  server.sendHeader("Access-Control-Allow-Origin", "*");

  updateInternalState();

  // Redraw for change
  redraw();

  // reply with state
  server.send(200, "text/plain", initialized + "Hello from " + WiFi.localIP().toString() + ". State " + getStateString()+ ". Brightness "+ String(tally_brightness) + ". Color " + tally_color);
}