# companion-module-tally-lights-to-m5atom

The M5Atom is an incredibly affordable ESP32 paired with a 5x5 NeoPixel matrix. It's perfect for creating cost-effective tally lights to indicate which camera is live in a broadcast stream.

![image](https://github.com/bactisme/companion-module-tally-lights-to-m5atom/assets/369622/f0b3d9ef-309f-4b64-bc8c-1a7c1ab121e6)

Companion is a software to control Elgato Stream Deck.

Companion is software used to control the Elgato Stream Deck. This module provides two components:

- Code to be uploaded to the M5Atom, enabling it to act as a receiver.
- A Companion module for sending commands.

## Usage

### Availables actions
- Set a container with UP and DOWN values: The primary function. UP turns a tally on, DOWN turns it off.
- Reset a container with DOWN values: Cancels the configuration for a container. Useful for cancelling views with multiple cameras.
- Change brightness for all: Sets and sends a default brightness to all tally lights.
- Change color for all: Sets and sends a default color to all tally lights.

### Containers
This feature allows for complex setups, enabling switches between views with one camera and those with multiple cameras. 
In a split-screen scenario, each container controls the tally for one section.

### TODOs
- Multiplex commands for brightness and color
- Single tally command
- Text on tallys?

## Setup 

- Buy m5atom hardware and set it up:
    - Download Arduino IDE, open the project in the Arduino directory
    - In the Arduino IDE:
        - In the Arduino IDE preferences, add the m5atom Board Manager repository: https://m5stack.oss-cn-shenzhen.aliyuncs.com/resource/arduino/package_m5stack_index.json
        - In the Library Manager, add M5Atom library
        - In the code, look to Wifi setup line 5 and 6
        - Connect the M5atom, select the correct connection for the board, upload the code.
        - Check the Serial Monitor to get the IP

- Download this code in a directory (as it is not yet a standard module)
    - Setup node > 18 with codepack on the computer
    - npm install to install library
    - Add the directory as source in companion

- Setup the companion module and use actions

![Capture d’écran 2023-12-05 à 17 22 54](https://github.com/bactisme/companion-module-tally-lights-to-m5atom/assets/369622/9edc2c08-47c2-4991-80c2-c9f62d1d5c17)

![Capture d’écran 2023-12-05 à 17 23 28](https://github.com/bactisme/companion-module-tally-lights-to-m5atom/assets/369622/73280d6e-fbf7-4a25-b0c0-83978b674ce5)


