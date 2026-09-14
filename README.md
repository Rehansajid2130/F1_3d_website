# 🏎️ APEX PROTO-1 // Next-Gen Formula 1 3D Showroom

[![Three.js](https://img.shields.io/badge/Three.js-r170-black?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![WebGL](https://img.shields.io/badge/WebGL-2.0-990000?style=for-the-badge&logo=webgl&logoColor=white)](https://www.khronos.org/webgl/)
[![JavaScript](https://img.shields.io/badge/ES6+-Modern%20JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

An ultra-high-fidelity, interactive **3D Formula 1 Race Car Showroom & Telemetry Simulator** built with **Three.js** and **Vite**. Features dynamic team liveries, real-time telemetry HUD, an animated aerodynamic wind tunnel, interactive driving physics with thermal brake glow, exploded engineering views, and a synthesized hybrid engine sound generator.

---

## 🌟 Key Features

### 🏎️ 1. High-Fidelity 3D PBR Car Model
- **Draco-Compressed GLTF/GLB Asset**: Ultra-fast asset loading and geometry decoding.
- **Satin Automotive Lacquer Materials**: Realistic physical lighting with tuned roughness, subtle metallic sheen, carbon fiber undercuts, and balanced studio HDRI lighting.
- **Functional Components**: Articulated DRS (Drag Reduction System) rear wing flap, rotating wheel assemblies, and glowing brake discs.

### 🎨 2. Real-Time Team Livery & UI Synchronization
Seamlessly switch between iconic Formula 1 colorways. Changing the team livery dynamically repaints the car body and recalculates all UI accent colors, background gradients, and studio spotlights:
- **Oracle Stealth & Red** (*Oracle Red Bull Racing*)
- **Silver Arrow & AMG Cyan** (*Mercedes-AMG Petronas*)
- **Papaya Velocity & Blue** (*McLaren Formula 1 Team*)
- **Scuderia Corsa & Giallo** (*Scuderia Ferrari*)
- **Aston Racing & Acid Lime** (*Aston Martin Aramco*)

### 🏁 3. Interactive Track Mode & Driving Physics
- **Dynamic Racing Circuit**: High-speed procedural asphalt track, alternating red/white kerbs, dynamic apex cones, and high-speed motion blur lines.
- **Pedal Box & Drive Mechanics**: Realistic throttle acceleration and brake deceleration curves.
- **Wheel Spin & Thermal Brake Glow**: Wheels rotate in sync with track velocity, while hard braking heats the carbon-ceramic brake discs into a radiant cherry-red incandescence.
- **Dynamic Lap Timing & Sector Delta**: Live hot-lap timer with dynamic sector deltas.

### 📊 4. Live Telemetry HUD Cluster
Inspired by official Formula 1 broadcast telemetry:
- **Speedometer & Gear Cluster**: Real-time KM/H speedometer, automatic 8-speed seamless-shift transmission logic, and engine RPM tachometer.
- **Aero Downforce Gauge**: Dynamic aerodynamic downforce load calculations (up to 3,200+ kg at V-Max).
- **MGU-K Hybrid Energy Recovery**: Real-time battery state of charge (SoC) that drains during acceleration and regenerates under braking.
- **Tire Thermal Window**: Temperature monitoring for optimal compound performance.
- **G-Force Accelerometer**: Real-time longitudinal acceleration and deceleration force measurement.

### 💨 5. Aerodynamic Wind Tunnel Visualization
- **Streamline Particle Flow**: Thousands of animated vector streamlines mapping airflow velocity over the front wing, cockpit halo, sidepod channels, and rear diffuser.
- **Flow Velocity Gradients**: Dynamic aerodynamic color mapping highlighting laminar flow and wake turbulence.

### 💥 6. Exploded Aero Deconstruction View
- Smoothly separates and translates exterior aerodynamic bodywork, wings, sidepod channels, and wheels outward along exploded engineering vectors to inspect the car's internal packaging and hybrid architecture.

### 🎥 7. Dynamic Camera Director & Cockpit POV
- **Studio Orbit Controls**: Smooth orbit, pan, and zoom with auto-rotating turntable mode.
- **Cockpit Driver POV**: Immersive first-person camera positioned inside the survival cell behind the steering wheel and Halo protection ring.
- **Quick-Focus Hotspots**: Instant cinematic camera focus on the **Front Wing**, **Halo Cockpit**, **V6 Hybrid Power Unit**, and **DRS Wing**.

### 🔊 8. Procedural Web Audio Sound Engine
- 100% synthesized through the **Web Audio API** (zero heavy external audio files needed):
  - Dynamic V6 Turbo Hybrid engine pitch mapped directly to RPM and throttle.
  - Realistic pneumatic gear-shift clicks.
  - DRS flap hydraulic actuation SFX.

---

## 🎮 Interactive Controls

### On-Screen Interface
- **Mode Buttons**: Track Mode, Explode Aero, Wind Tunnel, Cockpit POV, Toggle DRS, Throttle Rev.
- **Interactive Pedals**: Hold Throttle or Brake buttons to drive.
- **Livery Dock**: Click any team card to switch liveries and UI themes.
- **Inspection Chips**: Click any component chip for direct engineering dossiers.

### Keyboard Shortcuts

| Key | Action |
|---|---|
| <kbd>W</kbd> or <kbd>↑</kbd> | **Throttle / Accelerate** |
| <kbd>S</kbd> or <kbd>↓</kbd> | **Brake / Decelerate** (Thermal disc glow) |
| <kbd>D</kbd> | **Toggle DRS** (Drag Reduction System) |
| <kbd>C</kbd> | **Toggle Cockpit POV** / Orbit Camera |
| <kbd>Space</kbd> | **Throttle Blip / Rev** |

---

## 🛠️ Project Structure

```
3d_web/
├── index.html                 # Main entry HTML, HUD overlays, and SVG icons
├── package.json               # Dependencies and build scripts
├── vite.config.js             # Vite bundler configuration
├── public/
│   ├── models/
│   │   └── f1_car.glb         # Draco-compressed 3D Formula 1 car model
│   └── draco/                 # WebAssembly Draco decoders
└── src/
    ├── main.js                # App bootstrap & event coordinator
    ├── style.css              # Cyber-aerodynamic glassmorphism UI stylesheet
    ├── audio/
    │   └── soundEngine.js     # Web Audio API procedural sound synthesizer
    ├── scene/
    │   ├── sceneManager.js    # Three.js renderer, lighting, cameras, loop
    │   ├── f1CarModel.js      # Car loader, PBR materials, livery, animations
    │   ├── f1BodyMesh.js      # Procedural fallback F1 chassis geometry
    │   ├── trackEnvironment.js# High-speed asphalt track, kerbs, motion grid
    │   ├── windTunnel.js      # Aerodynamic particle streamline flow system
    │   └── annotations.js     # 3D interactive hotspot pins & dossiers
    └── ui/
        ├── telemetryHUD.js    # Speedometer, RPM, G-Force, and gear management
        └── themeManager.js    # Dynamic color syncing across 3D scene & DOM
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0 or higher recommended)
- `npm` or `yarn` or `pnpm`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Rehansajid2130/F1_3d_website.git
   cd F1_3d_website
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to the local URL displayed in the terminal (typically `http://localhost:5173/` or `http://localhost:5180/`).

### Production Build

To compile and bundle optimized assets for deployment:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

---

## 💻 Tech Stack

- **Graphics Core**: [Three.js](https://threejs.org/) (WebGL 2.0 PBR rendering)
- **Asset Pipeline**: Draco 3D geometry compression (`DRACOLoader` & `GLTFLoader`)
- **Audio**: Web Audio API (real-time frequency synthesis)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Typography**: Google Fonts (*Orbitron* for telemetry, *Outfit* for modern luxury UI)

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">
  <sub>Engineered with precision for motorsport and 3D web enthusiasts.</sub>
</div>