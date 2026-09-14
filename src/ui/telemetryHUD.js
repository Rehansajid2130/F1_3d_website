// Telemetry HUD and Interactive Control Suite
import { THEMES } from './themeManager.js';
import { sound } from '../audio/soundEngine.js';

export class TelemetryHUD {
  constructor({ onThemeSelect, onToggleExploded, onToggleWindTunnel, onToggleCockpit, onToggleDRS, onRevEngine, onToggleAutoRotate, onToggleTrackMode, onPedalThrottle, onPedalBrake }) {
    this.handlers = {
      onThemeSelect,
      onToggleExploded,
      onToggleWindTunnel,
      onToggleCockpit,
      onToggleDRS,
      onRevEngine,
      onToggleAutoRotate,
      onToggleTrackMode,
      onPedalThrottle,
      onPedalBrake
    };

    this.state = {
      speed: 318,
      rpm: 12400,
      gear: 7,
      drs: false,
      downforce: 2850,
      battery: 84,
      exploded: false,
      windTunnel: false,
      cockpit: false,
      autoRotate: true,
      muted: false,
      trackMode: false
    };

    this.initDOM();
    this.startTelemetryTick();
  }

  initDOM() {
    this.renderLiverySelector();
    this.bindButtons();
  }

  renderLiverySelector() {
    const listEl = document.getElementById('livery-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    Object.values(THEMES).forEach((t, idx) => {
      const btn = document.createElement('button');
      btn.className = `livery-card ${idx === 0 ? 'active' : ''}`;
      btn.dataset.theme = t.id;
      btn.innerHTML = `
        <div class="livery-swatches">
          <span class="swatch" style="background:${t.primaryColor}; box-shadow: 0 0 8px ${t.glowColor}"></span>
          <span class="swatch" style="background:${t.secondaryColor}"></span>
          <span class="swatch" style="background:${t.carBaseColor}"></span>
        </div>
        <div class="livery-info">
          <span class="livery-name">${t.name}</span>
          <span class="livery-team">${t.team}</span>
        </div>
      `;

      btn.addEventListener('click', () => {
        document.querySelectorAll('.livery-card').forEach((c) => c.classList.remove('active'));
        btn.classList.add('active');
        sound.playUIClick();
        this.handlers.onThemeSelect(t.id);
      });

      btn.addEventListener('mouseenter', () => sound.playUIHover());
      listEl.appendChild(btn);
    });
  }

  bindButtons() {
    // Track Mode Toggle Button
    const btnTrack = document.getElementById('btn-track-mode');
    if (btnTrack) {
      btnTrack.addEventListener('click', () => {
        this.state.trackMode = !this.state.trackMode;
        this.setTrackModeActive(this.state.trackMode);
        sound.playUIClick();
        if (this.handlers.onToggleTrackMode) {
          this.handlers.onToggleTrackMode(this.state.trackMode);
        }
      });
    }

    // Interactive Throttle Pedal
    const btnThrottle = document.getElementById('btn-pedal-throttle');
    if (btnThrottle) {
      const pressThrottle = (e) => {
        e.preventDefault();
        btnThrottle.classList.add('depressed');
        if (this.handlers.onPedalThrottle) this.handlers.onPedalThrottle(true);
      };
      const releaseThrottle = (e) => {
        e.preventDefault();
        btnThrottle.classList.remove('depressed');
        if (this.handlers.onPedalThrottle) this.handlers.onPedalThrottle(false);
      };
      btnThrottle.addEventListener('pointerdown', pressThrottle);
      btnThrottle.addEventListener('pointerup', releaseThrottle);
      btnThrottle.addEventListener('pointerleave', releaseThrottle);
      btnThrottle.addEventListener('pointercancel', releaseThrottle);
    }

    // Interactive Brake Pedal
    const btnBrake = document.getElementById('btn-pedal-brake');
    if (btnBrake) {
      const pressBrake = (e) => {
        e.preventDefault();
        btnBrake.classList.add('depressed');
        if (this.handlers.onPedalBrake) this.handlers.onPedalBrake(true);
      };
      const releaseBrake = (e) => {
        e.preventDefault();
        btnBrake.classList.remove('depressed');
        if (this.handlers.onPedalBrake) this.handlers.onPedalBrake(false);
      };
      btnBrake.addEventListener('pointerdown', pressBrake);
      btnBrake.addEventListener('pointerup', releaseBrake);
      btnBrake.addEventListener('pointerleave', releaseBrake);
      btnBrake.addEventListener('pointercancel', releaseBrake);
    }

    // Exploded View Button
    const btnExploded = document.getElementById('btn-exploded');
    if (btnExploded) {
      btnExploded.addEventListener('click', () => {
        this.state.exploded = !this.state.exploded;
        btnExploded.classList.toggle('active', this.state.exploded);
        btnExploded.querySelector('.btn-label').textContent = this.state.exploded ? 'Reassemble' : 'Explode Aero';
        sound.playExplodeServo(this.state.exploded);
        this.handlers.onToggleExploded(this.state.exploded);
      });
    }

    // Wind Tunnel Button
    const btnWind = document.getElementById('btn-wind-tunnel');
    if (btnWind) {
      btnWind.addEventListener('click', () => {
        this.state.windTunnel = !this.state.windTunnel;
        btnWind.classList.toggle('active', this.state.windTunnel);
        sound.playUIClick();
        this.handlers.onToggleWindTunnel(this.state.windTunnel);
      });
    }

    // Cockpit Camera Button
    const btnCockpit = document.getElementById('btn-cockpit');
    if (btnCockpit) {
      btnCockpit.addEventListener('click', () => {
        this.state.cockpit = !this.state.cockpit;
        btnCockpit.classList.toggle('active', this.state.cockpit);
        btnCockpit.querySelector('.btn-label').textContent = this.state.cockpit ? 'Exit Cockpit' : 'Cockpit POV';
        sound.playUIClick();
        this.handlers.onToggleCockpit(this.state.cockpit);
      });
    }

    // DRS Toggle Button
    const btnDRS = document.getElementById('btn-drs');
    if (btnDRS) {
      btnDRS.addEventListener('click', () => {
        this.state.drs = !this.state.drs;
        btnDRS.classList.toggle('active', this.state.drs);
        sound.playDrsClick(this.state.drs);
        this.handlers.onToggleDRS(this.state.drs);
        this.updateDRSTelemetry(this.state.drs);
      });
    }

    // Throttle Rev Button
    const btnRev = document.getElementById('btn-rev');
    if (btnRev) {
      btnRev.addEventListener('click', () => {
        sound.playEngineRev();
        this.triggerRevAnimation();
        this.handlers.onRevEngine();
      });
    }

    // Turntable Toggle
    const btnTurntable = document.getElementById('btn-turntable');
    if (btnTurntable) {
      btnTurntable.addEventListener('click', () => {
        this.state.autoRotate = !this.state.autoRotate;
        btnTurntable.classList.toggle('active', this.state.autoRotate);
        sound.playUIClick();
        this.handlers.onToggleAutoRotate(this.state.autoRotate);
      });
    }

    // Mute Audio Toggle
    const btnSound = document.getElementById('btn-sound');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        const isMuted = sound.toggleMute();
        this.state.muted = isMuted;
        btnSound.classList.toggle('muted', isMuted);
        btnSound.title = isMuted ? 'Unmute Audio' : 'Mute Audio';
      });
    }

    // Close Modal Dossier
    const btnCloseModal = document.getElementById('btn-close-dossier');
    const dossierBackdrop = document.getElementById('dossier-modal');
    if (btnCloseModal && dossierBackdrop) {
      btnCloseModal.addEventListener('click', () => {
        sound.playUIClick();
        dossierBackdrop.classList.remove('open');
      });
      dossierBackdrop.addEventListener('click', (e) => {
        if (e.target === dossierBackdrop) {
          dossierBackdrop.classList.remove('open');
        }
      });
    }
  }

  setTrackModeActive(active) {
    this.state.trackMode = active;
    const btnTrack = document.getElementById('btn-track-mode');
    const banner = document.getElementById('track-telemetry-banner');
    const pedals = document.getElementById('pedals-control-box');

    if (btnTrack) {
      btnTrack.classList.toggle('active', active);
      const label = btnTrack.querySelector('.btn-label');
      if (label) label.textContent = active ? 'Exit Track' : 'Track Mode';
    }
    if (banner) {
      banner.classList.toggle('hidden', !active);
    }
    if (pedals) {
      pedals.classList.toggle('hidden', !active);
    }
  }

  updateLiveTelemetry({ speed, rpm, gear, drs, gForce, throttle, brake, lapTime, delta }) {
    if (!this.state.trackMode) return;

    const speedEl = document.getElementById('hud-speed');
    const rpmEl = document.getElementById('hud-rpm');
    const gearEl = document.getElementById('hud-gear');
    const gforceEl = document.getElementById('hud-gforce');
    const gforceBar = document.getElementById('hud-gforce-bar');
    const throttleBar = document.getElementById('throttle-meter-bar');
    const brakeBar = document.getElementById('brake-meter-bar');
    const lapTimerEl = document.getElementById('hud-lap-timer');
    const deltaEl = document.getElementById('hud-delta');
    const btnThrottle = document.getElementById('btn-pedal-throttle');
    const btnBrake = document.getElementById('btn-pedal-brake');

    if (speedEl) speedEl.textContent = Math.round(speed);
    if (rpmEl) rpmEl.textContent = Math.round(rpm).toLocaleString();
    if (gearEl) gearEl.textContent = gear;

    if (gforceEl) {
      const prefix = gForce >= 0 ? '+' : '';
      gforceEl.innerHTML = `${prefix}${gForce.toFixed(1)} G <span style="font-size:10px; color:#94a3b8;">LONGITUDINAL</span>`;
    }
    if (gforceBar) {
      const gPct = Math.min(100, Math.abs(gForce) * 20);
      gforceBar.style.width = `${gPct}%`;
      gforceBar.style.background = gForce < 0 ? '#ef4444' : '#10b981';
    }

    if (throttleBar) throttleBar.style.width = `${Math.round(throttle * 100)}%`;
    if (brakeBar) brakeBar.style.width = `${Math.round(brake * 100)}%`;
    if (btnThrottle) btnThrottle.classList.toggle('depressed', throttle > 0.1);
    if (btnBrake) btnBrake.classList.toggle('depressed', brake > 0.1);

    if (lapTimerEl && lapTime) lapTimerEl.textContent = lapTime;
    if (deltaEl && delta) deltaEl.textContent = delta;
  }

  showDossier(hotspot) {
    const modal = document.getElementById('dossier-modal');
    if (!modal) return;

    sound.playUIClick();

    document.getElementById('dossier-title').textContent = hotspot.title;
    document.getElementById('dossier-subtitle').textContent = hotspot.subtitle;
    document.getElementById('dossier-desc').textContent = hotspot.desc;

    const statsContainer = document.getElementById('dossier-stats');
    if (statsContainer) {
      statsContainer.innerHTML = hotspot.stats
        .map(
          (s) => `
        <div class="stat-pill">
          <span class="stat-label">${s.label}</span>
          <span class="stat-val">${s.val}</span>
        </div>
      `
        )
        .join('');
    }

    modal.classList.add('open');
  }

  triggerRevAnimation() {
    const speedEl = document.getElementById('hud-speed');
    const rpmEl = document.getElementById('hud-rpm');
    const gearEl = document.getElementById('hud-gear');

    let count = 0;
    const interval = setInterval(() => {
      count++;
      const boostSpeed = 318 + Math.floor(Math.sin(count * 0.4) * 28 + count * 2);
      const boostRPM = 12000 + Math.floor(Math.random() * 2800);
      if (speedEl) speedEl.textContent = boostSpeed;
      if (rpmEl) rpmEl.textContent = boostRPM.toLocaleString();
      if (gearEl && count > 12) gearEl.textContent = '8';

      if (count > 24) {
        clearInterval(interval);
        if (speedEl) speedEl.textContent = '318';
        if (rpmEl) rpmEl.textContent = '12,400';
        if (gearEl) gearEl.textContent = '7';
      }
    }, 90);
  }

  updateDRSTelemetry(isOpen) {
    const drsStatusEl = document.getElementById('hud-drs-status');
    const downforceEl = document.getElementById('hud-downforce');
    const speedEl = document.getElementById('hud-speed');

    if (drsStatusEl) {
      drsStatusEl.textContent = isOpen ? 'DRS OPEN (+20 KM/H)' : 'DRS ARMED';
      drsStatusEl.style.color = isOpen ? 'var(--color-primary)' : '#8a99a8';
    }

    if (downforceEl) {
      downforceEl.textContent = isOpen ? '2,150 kg (-24%)' : '2,850 kg';
    }

    if (speedEl) {
      speedEl.textContent = isOpen ? '338' : '318';
    }
  }

  startTelemetryTick() {
    setInterval(() => {
      // In track mode, live drive physics drives telemetry!
      if (this.state.trackMode) return;

      // Gentle realistic sensor telemetry oscillation
      const rpmBase = this.state.drs ? 13100 : 12400;
      const rpmJitter = Math.floor(rpmBase + (Math.random() - 0.5) * 120);
      const rpmEl = document.getElementById('hud-rpm');
      if (rpmEl && !rpmEl.classList.contains('revving')) {
        rpmEl.textContent = rpmJitter.toLocaleString();
      }

      // Battery deploy gauge
      this.state.battery = Math.max(78, Math.min(96, this.state.battery + (Math.random() - 0.48) * 0.8));
      const battBar = document.getElementById('hud-batt-bar');
      const battVal = document.getElementById('hud-batt-val');
      if (battBar) battBar.style.width = `${this.state.battery}%`;
      if (battVal) battVal.textContent = `${Math.round(this.state.battery)}%`;
    }, 800);
  }
}
