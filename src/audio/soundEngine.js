// Procedural Web Audio Engine for F1 3D Experience (Zero external file dependencies)
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Continuous track engine sound nodes
    this.engineOsc = null;
    this.engineSubOsc = null;
    this.turboOsc = null;
    this.engineGain = null;
    this.turboGain = null;
    this.engineFilter = null;
    this.isContinuousEngineRunning = false;
  }

  initContinuousEngine() {
    if (!this.ctx || this.isContinuousEngineRunning) return;

    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineSubOsc = this.ctx.createOscillator();
      this.turboOsc = this.ctx.createOscillator();

      this.engineOsc.type = 'sawtooth';
      this.engineSubOsc.type = 'triangle';
      this.turboOsc.type = 'sine';

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 1800;

      this.engineGain = this.ctx.createGain();
      this.turboGain = this.ctx.createGain();

      this.engineGain.gain.value = 0;
      this.turboGain.gain.value = 0;

      this.engineOsc.connect(this.engineFilter);
      this.engineSubOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.turboOsc.connect(this.turboGain);
      this.turboGain.connect(this.ctx.destination);

      const now = this.ctx.currentTime;
      this.engineOsc.start(now);
      this.engineSubOsc.start(now);
      this.turboOsc.start(now);

      this.isContinuousEngineRunning = true;
    } catch (e) {
      console.warn('Error starting continuous engine audio:', e);
    }
  }

  updateEngineSound(rpm, throttle, isTrackMode = false) {
    if (this.isMuted || !isTrackMode) {
      if (this.engineGain && this.ctx) {
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
      if (this.turboGain && this.ctx) {
        this.turboGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
      return;
    }

    this.resume();
    if (!this.isContinuousEngineRunning) {
      this.initContinuousEngine();
    }
    if (!this.ctx || !this.engineOsc) return;

    const now = this.ctx.currentTime;
    // Map RPM (4000 - 15000) to fundamental frequency (120Hz - 460Hz)
    const baseFreq = 110 + (rpm / 15000) * 350;
    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);

    // Turbo whistle frequency (1200Hz - 5800Hz)
    const turboFreq = 1000 + (rpm / 15000) * 4500;
    this.turboOsc.frequency.setTargetAtTime(turboFreq, now, 0.05);

    // Volume scaled by throttle & RPM
    const targetVol = 0.03 + (throttle ? 0.12 : 0.04) * (rpm / 15000);
    this.engineGain.gain.setTargetAtTime(targetVol, now, 0.06);

    const turboVol = throttle ? (rpm / 15000) * 0.03 : 0.005;
    this.turboGain.gain.setTargetAtTime(turboVol, now, 0.08);

    // Filter opening under throttle
    const cutoff = 1200 + (rpm / 15000) * 4000;
    this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.05);
  }

  stopContinuousEngine() {
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    if (this.turboGain && this.ctx) {
      this.turboGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  resume() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  playUIClick() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.04);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  playUIHover() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.03);

    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  playDrsClick(isOpen) {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Pneumatic click
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(isOpen ? 500 : 350, now);
    osc.frequency.exponentialRampToValueAtTime(isOpen ? 220 : 180, now + 0.06);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);

    // Wind burst
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isOpen ? 1200 : 800, now);
    filter.Q.value = 3;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.12);
  }

  playExplodeServo(isExploded) {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    const startFreq = isExploded ? 200 : 450;
    const endFreq = isExploded ? 500 : 180;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.45);

    // Low pass filter to make it sound like an electric precision servo
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  playEngineRev() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 2.4;

    // V6 Turbo Hybrid simulation: fundamental + harmonic + turbo spool whistle
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const turbo = this.ctx.createOscillator();

    const gainMaster = this.ctx.createGain();
    const turboGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';
    turbo.type = 'sine';

    // Idle ~4000 rpm (approx 130 Hz fundamental) -> Peak 14500 rpm (approx 480 Hz)
    osc1.frequency.setValueAtTime(140, now);
    osc1.frequency.linearRampToValueAtTime(260, now + 0.4);
    osc1.frequency.exponentialRampToValueAtTime(460, now + 1.1);
    osc1.frequency.linearRampToValueAtTime(490, now + 1.3);
    osc1.frequency.exponentialRampToValueAtTime(160, now + duration);

    osc2.frequency.setValueAtTime(140 * 1.5, now);
    osc2.frequency.linearRampToValueAtTime(260 * 1.5, now + 0.4);
    osc2.frequency.exponentialRampToValueAtTime(460 * 1.5, now + 1.1);
    osc2.frequency.linearRampToValueAtTime(490 * 1.5, now + 1.3);
    osc2.frequency.exponentialRampToValueAtTime(160 * 1.5, now + duration);

    // High pitch turbo spool whistle
    turbo.frequency.setValueAtTime(1800, now);
    turbo.frequency.exponentialRampToValueAtTime(6200, now + 1.2);
    turbo.frequency.exponentialRampToValueAtTime(1200, now + duration);

    // Wave shaper for exhaust throat distortion
    const distortion = this.ctx.createWaveShaper();
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    const k = 40;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    distortion.curve = curve;
    distortion.oversample = '4x';

    // Dynamic lowpass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(5500, now + 1.1);
    filter.frequency.exponentialRampToValueAtTime(1000, now + duration);

    gainMaster.gain.setValueAtTime(0.01, now);
    gainMaster.gain.linearRampToValueAtTime(0.18, now + 0.3);
    gainMaster.gain.linearRampToValueAtTime(0.22, now + 1.1);
    gainMaster.gain.exponentialRampToValueAtTime(0.001, now + duration);

    turboGain.gain.setValueAtTime(0.005, now);
    turboGain.gain.linearRampToValueAtTime(0.05, now + 1.1);
    turboGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(distortion);
    osc2.connect(distortion);
    distortion.connect(filter);
    filter.connect(gainMaster);
    gainMaster.connect(this.ctx.destination);

    turbo.connect(turboGain);
    turboGain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    turbo.start(now);

    osc1.stop(now + duration);
    osc2.stop(now + duration);
    turbo.stop(now + duration);
  }
}

export const sound = new SoundEngine();
