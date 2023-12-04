# companion-module-tally-lights-to-m5atom

m5atom is a incredibly inexpensive esp32 paired with a 5x5 NeoPixel matix.
It's absolutely perfect to make tally lights.

Companion is the software to control Elgato stream deck.

This module provide two things: 
 - the code to be uploaded to the m5atom, to act as receiver
 - the companion module to send command

## Usage

First understand the layer concept.


## Setup 

- Buy m5atom hardware and set it up:
    - Download Arduino IDE, open the project in the Arduino directory
    - In the Arduino IDE:
        - Add the m5atom Board Manager repository in Arduino IDE preferences : https://m5stack.oss-cn-shenzhen.aliyuncs.com/resource/arduino/package_m5stack_index.json
        - In the Library Manager, add NeoPixel, NeoMatrix etc.
        - In the code, look to Wifi setup

- Download this code in a directory
    - Setup node > 18 with codepack on the computer
    - npm install to install library
    - Add the directory as source in companion
