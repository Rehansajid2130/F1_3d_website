import * as THREE from 'three';
import { ThemeManager } from './ui/themeManager.js';
import { SceneManager } from './scene/sceneManager.js';
import { F1CarModel } from './scene/f1CarModel.js';
import { WindTunnel } from './scene/windTunnel.js';
import { AnnotationsManager } from './scene/annotations.js';
import { TelemetryHUD } from './ui/telemetryHUD.js';
import { sound } from './audio/soundEngine.js';

class App {
  constructor() {
    this.canvasContainer = document.getElementById('webgl-canvas');
    this.annotationsContainer = document.getElementById('annotations-container');

    // 1. Initialize Theme Manager (Default: Oracle Stealth Crimson)
    this.themeManager = new ThemeManager('oracle-crimson');
    const currentTheme = this.themeManager.getCurrentTheme();
    this.themeManager.setTheme('oracle-crimson');

    // 2. Initialize 3D Scene Manager
    this.sceneManager = new SceneManager(this.canvasContainer, currentTheme);

    // 3. Initialize Procedural 3D F1 Car Model
    this.f1Car = new F1CarModel(currentTheme);
    this.sceneManager.scene.add(this.f1Car.group);

    // 4. Initialize Wind Tunnel Particle Streamlines
    this.windTunnel = new WindTunnel(this.sceneManager.scene);

    // 5. Initialize 3D Annotations & Hotspots
    this.annotations = new AnnotationsManager(
      this.sceneManager.camera,
      this.annotationsContainer,
      (hotspot) => this.focusOnHotspot(hotspot)
    );

    // 6. Connect Theme Changes to 3D Scene & Car Materials
    this.themeManager.onThemeChange((newTheme) => {
      this.f1Car.updateTheme(newTheme);
      this.sceneManager.updateTheme(newTheme);
    });

    // 7. Initialize UI & Telemetry HUD Controls
    this.hud = new TelemetryHUD({
      onThemeSelect: (themeKey) => {
        this.themeManager.setTheme(themeKey);
      },
      onToggleExploded: (isExploded) => {
        this.f1Car.setExploded(isExploded);
        // Hide annotations when exploded to prevent overlap
        this.annotations.setVisible(!isExploded && !this.isTrackMode);
      },
      onToggleWindTunnel: (isEnabled) => {
        this.windTunnel.toggle(isEnabled);
      },
      onToggleCockpit: (isCockpit) => {
        if (isCockpit) {
          this.sceneManager.setCameraMode('cockpit');
          this.annotations.setVisible(false);
        } else {
          if (this.isTrackMode) {
            this.sceneManager.setCameraMode('chase');
          } else {
            this.sceneManager.setCameraMode('orbit');
            this.annotations.setVisible(true);
          }
        }
      },
      onToggleDRS: (isDRS) => {
        this.f1Car.setDRS(isDRS);
      },
      onRevEngine: () => {
        this.isRevving = true;
        setTimeout(() => {
          this.isRevving = false;
        }, 2200);
      },
      onToggleAutoRotate: (autoRotate) => {
        this.sceneManager.autoRotate = autoRotate;
      },
      onToggleTrackMode: (isTrack) => {
        this.toggleTrackMode(isTrack);
      },
      onPedalThrottle: (isPressed) => {
        this.isThrottlePressed = isPressed;
      },
      onPedalBrake: (isPressed) => {
        this.isBrakePressed = isPressed;
      }
    });

    // 8. Driving State & Physical Simulation Variables
    this.isTrackMode = false;
    this.speedKmh = 0;
    this.throttleInput = 0;
    this.brakeInput = 0;
    this.isThrottlePressed = false;
    this.isBrakePressed = false;
    this.currentGear = 1;
    this.currentRpm = 4200;
    this.gForce = 0;
    this.lapTimeSeconds = 78.42;

    this.bindQuickInspectChips();
    this.bindKeyboardShortcuts();

    // 9. Start High-Performance Animation Loop
    this.clock = new THREE.Clock();
    this.isRevving = false;
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  toggleTrackMode(enable) {
    this.isTrackMode = enable;
    this.sceneManager.setMode(enable ? 'track' : 'showroom');
    this.annotations.setVisible(!enable);
    this.hud.setTrackModeActive(enable);

    if (enable) {
      sound.initContinuousEngine();
      if (this.speedKmh < 1) {
        this.speedKmh = 0;
        this.currentGear = 1;
        this.currentRpm = 4500;
      }
    } else {
      sound.stopContinuousEngine();
      this.speedKmh = 0;
      this.throttleInput = 0;
      this.brakeInput = 0;
      this.isThrottlePressed = false;
      this.isBrakePressed = false;
      this.sceneManager.camera.fov = 42;
      this.sceneManager.camera.updateProjectionMatrix();
      this.annotations.setVisible(true);
    }
  }

  focusOnHotspot(hotspot) {
    if (this.isTrackMode) return;
    this.sceneManager.setCameraMode('focus', hotspot.camPosition, hotspot.camTarget);
    this.hud.showDossier(hotspot);
  }

  bindQuickInspectChips() {
    document.querySelectorAll('.shortcut-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        if (this.isTrackMode) return;
        const targetId = chip.dataset.target;
        const hotspot = this.annotations.hotspots.find((h) => h.id === targetId);
        if (hotspot) {
          this.focusOnHotspot(hotspot);
        }
      });
    });
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Throttle hold
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        this.isThrottlePressed = true;
      }
      // Brake hold
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        this.isBrakePressed = true;
      }
      // 'T': Track Mode Toggle
      if (e.key === 't' || e.key === 'T') {
        document.getElementById('btn-track-mode')?.click();
      }
      // Space: Rev Engine (or Launch Boost in Track Mode)
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.isTrackMode) {
          this.isThrottlePressed = true;
        } else {
          document.getElementById('btn-rev')?.click();
        }
      }
      // 'E': Explode Aero
      if (e.key === 'e' || e.key === 'E') {
        document.getElementById('btn-exploded')?.click();
      }
      // 'D': DRS
      if (e.key === 'd' || e.key === 'D') {
        document.getElementById('btn-drs')?.click();
      }
      // 'C': Cockpit POV
      if (e.key === 'c' || e.key === 'C') {
        document.getElementById('btn-cockpit')?.click();
      }
      // 'Escape': Close modal or reset to orbit
      if (e.key === 'Escape') {
        document.getElementById('dossier-modal')?.classList.remove('open');
        if (!this.isTrackMode) {
          this.sceneManager.setCameraMode('orbit');
          this.annotations.setVisible(true);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        this.isThrottlePressed = false;
      }
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        this.isBrakePressed = false;
      }
      if (e.code === 'Space' && this.isTrackMode) {
        this.isThrottlePressed = false;
      }
    });
  }

  animate() {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    if (this.isTrackMode) {
      // 1. Throttle & Brake input smoothing
      const throttleTarget = this.isThrottlePressed ? 1.0 : 0.0;
      const brakeTarget = this.isBrakePressed ? 1.0 : 0.0;

      this.throttleInput += (throttleTarget - this.throttleInput) * Math.min(deltaTime * 10, 1.0);
      this.brakeInput += (brakeTarget - this.brakeInput) * Math.min(deltaTime * 14, 1.0);

      const prevSpeed = this.speedKmh;
      const topSpeed = this.f1Car.drsOpen ? 365 : 345;

      // 2. F1 Acceleration, Braking, and Aerodynamic Drag
      if (this.throttleInput > 0.02 && this.brakeInput < 0.1) {
        // Authentic F1 acceleration curve (high initial torque, aero drag damping at top speed)
        const aeroDragFactor = Math.pow(this.speedKmh / 350, 1.8);
        const accelKmhS = Math.max(8.0, (72 - aeroDragFactor * 54)) * this.throttleInput;
        this.speedKmh = Math.min(topSpeed, this.speedKmh + accelKmhS * deltaTime);
      } else if (this.brakeInput > 0.02) {
        // F1 Carbon-Carbon brakes: -5G deceleration
        const decelKmhS = (115 + (this.speedKmh / 350) * 50) * this.brakeInput;
        this.speedKmh = Math.max(0, this.speedKmh - decelKmhS * deltaTime);
      } else {
        // Natural aero coasting drag
        if (this.speedKmh > 0) {
          const dragKmhS = 5.0 + (this.speedKmh / 350) * 18.0;
          this.speedKmh = Math.max(0, this.speedKmh - dragKmhS * deltaTime);
        }
      }

      // 3. Instantaneous longitudinal G-force
      const dvMs = ((this.speedKmh - prevSpeed) / 3.6) / Math.max(0.001, deltaTime);
      const targetGForce = dvMs / 9.80665;
      this.gForce += (targetGForce - this.gForce) * Math.min(deltaTime * 8, 1.0);

      // 4. 8-Speed F1 Gearbox and RPM Mapping
      const gearLimits = [
        { gear: 1, min: 0, max: 98 },
        { gear: 2, min: 92, max: 138 },
        { gear: 3, min: 132, max: 182 },
        { gear: 4, min: 176, max: 226 },
        { gear: 5, min: 220, max: 268 },
        { gear: 6, min: 262, max: 305 },
        { gear: 7, min: 298, max: 336 },
        { gear: 8, min: 330, max: 375 }
      ];

      let currentGearObj = gearLimits[0];
      for (let i = gearLimits.length - 1; i >= 0; i--) {
        if (this.speedKmh >= gearLimits[i].min) {
          currentGearObj = gearLimits[i];
          break;
        }
      }
      this.currentGear = currentGearObj.gear;

      if (this.speedKmh < 1.0) {
        // Idle RPM with slight throttle blip
        this.currentRpm = 4500 + this.throttleInput * 3000;
      } else {
        const span = currentGearObj.max - currentGearObj.min;
        const progress = Math.max(0, Math.min(1, (this.speedKmh - currentGearObj.min) / span));
        this.currentRpm = 9500 + progress * (14800 - 9500) + (Math.random() - 0.5) * 70;
      }

      // 5. Update Continuous Engine V6 Hybrid Audio
      sound.updateEngineSound(this.currentRpm, this.throttleInput, true);

      // 6. Lap Timer Progression
      this.lapTimeSeconds += deltaTime;
      const mins = Math.floor(this.lapTimeSeconds / 60);
      const secs = (this.lapTimeSeconds % 60).toFixed(3);
      const lapTimeStr = `0${mins}:${secs.padStart(6, '0')}`;
      const deltaStr = this.speedKmh > 260 ? '-0.462s' : (this.speedKmh > 180 ? '-0.318s' : '+0.124s');

      // 7. Push Live Telemetry to HUD
      this.hud.updateLiveTelemetry({
        speed: this.speedKmh,
        rpm: this.currentRpm,
        gear: this.currentGear,
        drs: this.f1Car.drsOpen,
        gForce: this.gForce,
        throttle: this.throttleInput,
        brake: this.brakeInput,
        lapTime: lapTimeStr,
        delta: deltaStr
      });

      // 8. 3D Model Wheel Spin and Thermal Rotor Glow
      this.f1Car.setDriveState(this.speedKmh, this.isBrakePressed, deltaTime);
      this.f1Car.update(deltaTime, false);

      // 9. Dynamic Track Environment & Camera Shake
      this.sceneManager.update(deltaTime, this.speedKmh, this.isThrottlePressed, this.isBrakePressed);
    } else {
      // Showroom Mode
      this.f1Car.update(deltaTime, this.isRevving);
      this.windTunnel.update(deltaTime);
      this.sceneManager.update(deltaTime, 0, false, false);
      this.annotations.update(this.sceneManager.camera, this.sceneManager.renderer);
    }

    // Render 3D Frame
    this.sceneManager.render();
  }
}

// Bootstrap on DOM loaded
window.addEventListener('DOMContentLoaded', () => {
  new App();
});

