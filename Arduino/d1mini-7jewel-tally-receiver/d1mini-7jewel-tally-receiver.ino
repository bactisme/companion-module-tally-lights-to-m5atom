#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

#include <Adafruit_NeoPixel.h>
#define PIN        1
#define NUMPIXELS 7

Adafruit_NeoPixel pixels(NUMPIXELS, PIN, NEO_GRB + NEO_KHZ800);
#define DELAYVAL 1000

#define STASSID ""
#define STAPSK ""

const char* ssid = STASSID;
const char* password = STAPSK;

ESP8266WebServer server(80); 

void handleRoot(); // function prototypes for HTTP handlers

const int DOWN_STATE = 1;
const int UP_STATE = 2;

int tally_initialized = false;
int tally_state = DOWN_STATE;
String tally_color = "ff0000";
int tally_brightness = 100;
String tally_mode = "full";

void bluestart(){
  pixels.clear();
  pixels.setBrightness(100);
  pixels.setPixelColor(0, pixels.Color(0, 0, 255));
  pixels.show();
}

void blueWifiConnected(){
  pixels.clear();
  pixels.setBrightness(100);
  pixels.setPixelColor(0, pixels.Color(0, 255, 0));
  pixels.show();
}

void setup() {
  Serial.begin(115200);

  // M5 begin
  pixels.begin();
  bluestart();

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

  blueWifiConnected();
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

      pixels.clear();
      pixels.setBrightness(tally_brightness);

      for(int i=0; i<NUMPIXELS; i++) {
        pixels.setPixelColor(i, pixels.Color(0, 0, 0));
        pixels.show();
      }
    }else{
      char charBuf[7]; // Buffer pour convertir la chaîne String en char array

      tally_color.toCharArray(charBuf, 7); // Conversion de String en char array
      unsigned long hexValue = strtoul(charBuf, NULL, 16); // Conversion de char array en valeur hexadécimale

      int red = (hexValue >> 16) & 0xFF;
      int green = (hexValue >> 8) & 0xFF;
      int blue = hexValue & 0xFF;

      pixels.clear();
      pixels.setBrightness(tally_brightness);
      for(int i=0; i<NUMPIXELS; i++) {
        pixels.setPixelColor(i, pixels.Color(red, green, blue));
        pixels.show();
      }
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

}

void handleRoot() {
  server.sendHeader("Access-Control-Allow-Origin", "*");

  updateInternalState();

  // Redraw for change
  redraw();

  // reply with state
  String initialized = "";
  if (tally_initialized == false){
    initialized = "Not Initialized. ";
  }
  server.send(200, "text/plain", initialized + "Hello from " + WiFi.localIP().toString() + ". State " + getStateString()+ ". Brightness "+ String(tally_brightness) + ". Color " + tally_color);
}