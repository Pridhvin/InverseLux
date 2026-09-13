# InverseLux: Circadian Hostility Engine 🎯

## Basic Details

### Team Name: 2Bytes

### Team Members

- Team Lead: Pridhvin - Mar Athanasius College of Engineering (MACE), Kothamangalam
- Member 2: Fathima Jabbar - Mar Athanasius College of Engineering (MACE), Kothamangalam

### Project Description

InverseLux is an adversarial ambient light governor that enforces the exact opposite of healthy screen ergonomics. It continuously audits your physical environment via webcam, detonating your screen with a blinding #FFFFFF flashbang in pitch darkness and plunging your display into an unreadable blackout void under bright daylight.

### The Problem (that doesn't exist)

Modern operating systems coddle users with adaptive brightness, night shift, and auto dark mode to prevent "eye fatigue." This artificial biological comfort has made human eyes weak, soft, and unaccustomed to real optical adversity.

### The Solution (that nobody asked for)

We built an in-browser photometric surveillance engine using real-time canvas pixel sampling. The moment you seek sanctuary in a dark room at 3:00 AM, the engine triggers a 140% brightness flashbang to wake your retinas up; step into broad daylight or turn on your desk lamp, and it immediately activates pitch-black contrast suppression so you can't read a single line of text.

---

## Technical Details

### Technologies/Components Used

For Software:

- Languages: JavaScript (ES6+), CSS3, HTML5
- APIs: WebRTC (`navigator.mediaDevices.getUserMedia`), HTML5 Canvas API, Web Audio API
- Frameworks / Environments: Chromium Extension Architecture (Manifest V3)
- Tools: Google Chrome DevTools, VS Code

For Hardware:

- Main Components: Integrated Laptop Webcam or USB Webcam (used as an optical lux meter)
- Specifications: Minimum 64x64 video capture stream at 15+ FPS
- Tools Required: A hand or dark cloth (for inducing simulated nighttime)

---

### Implementation

For Software:

# Installation

1. Clone or download this repository to your local machine:

```bash
git clone https://github.com/Pridhvin/inverselux.git
cd inverselux

```

2. Open Google Chrome and navigate to:

```text
chrome://extensions

```

3. Enable **Developer mode** via the toggle switch in the top-right corner.
4. Click **Load unpacked** in the top-left and select the `inverselux` project root directory.

# Run

1. Open any website (e.g., Wikipedia, Hacker News, or documentation).
2. Click anywhere on the webpage to grant the one-time webcam sensor permission.
3. Observe ambient light audit HUD in the bottom-right corner.
4. Turn off your room lights or cover the webcam lens with your thumb to receive an instant #FFFFFF flashbang.

---

### Project Documentation

For Software:

# Screenshots

!![alt text](<Screenshot 2026-09-13 161309.png>) ![alt text](<Screenshot 2026-09-13 161322.png>) ![alt text](<Screenshot 2026-09-13 161333.png>)

### Project Demo

# Video

[Add your demo video link here]
_Demonstrates live transitions between room lighting conditions, showing the instant inverted glare and the HUD audit response._

# Additional Demos

- Console Drop-in Script: Available in `/src/injected.js` for instant testing via browser DevTools without loading the extension.

---

## Team Contributions

- Pridhvin: Core photometric canvas sampling engine, dynamic CSS inversion logic, and extension architecture. HUD telemetry interface, audio cue synthesis via Web Audio API, and threshold calibration.
- Fathima: Testing across edge-case DOM layouts, demo setup, documentation, and presentation scripting.

---

Made with ❤️ at TinkerHub Useless Projects

```

```
