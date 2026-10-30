// Web Audio API Procedural Sound Engine for Abbey of St. Blenderius
// Synthesizes atmospheric medieval crypt drones, blender turbine whirs,
// stone grinding, ratchet clicks, alchemical bells, and ceremonial stamps.

class AbbeyAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Ambient Drone
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.droneGain = null;
    this.droneFilter = null;

    // Blender Synth
    this.blenderOsc = null;
    this.blenderGain = null;
    this.blenderFilter = null;
    this.blenderNoise = null;
    this.isBlenderPlaying = false;

    // Analyser for visualizer
    this.analyser = null;
    this.dataArray = null;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.isInitialized = true;
      this.startAmbientDrone();
    } catch (e) {
      console.warn("Web Audio not supported or failed to initialize", e);
    }
  }

  ensureRunning() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.ensureRunning();
    if (!this.masterGain) return false;
    this.isMuted = !this.isMuted;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.4, now, 0.05);
    return this.isMuted;
  }

  startAmbientDrone() {
    if (!this.ctx || this.droneGain) return;

    const now = this.ctx.currentTime;
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.01, now);
    this.droneGain.gain.exponentialRampToValueAtTime(0.12, now + 3);

    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = "lowpass";
    this.droneFilter.frequency.setValueAtTime(220, now);

    // Osc 1: Deep 55Hz (A1) Root
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = "sine";
    this.droneOsc1.frequency.setValueAtTime(55, now);

    // Osc 2: 110Hz (A2) with slight slow vibrato
    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = "triangle";
    this.droneOsc2.frequency.setValueAtTime(110.5, now);

    // Sub LFO for gentle abbey breathing
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.15, now);
    lfoGain.gain.setValueAtTime(60, now);
    lfo.connect(lfoGain);
    lfoGain.connect(this.droneFilter.frequency);
    lfo.start();

    this.droneOsc1.connect(this.droneFilter);
    this.droneOsc2.connect(this.droneFilter);
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);

    this.droneOsc1.start();
    this.droneOsc2.start();
  }

  // Chapter 2: Blender Ramp Up Synth
  setBlenderRpm(ratio) {
    this.ensureRunning();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (ratio > 0.02 && !this.isBlenderPlaying) {
      this.isBlenderPlaying = true;

      this.blenderGain = this.ctx.createGain();
      this.blenderGain.gain.setValueAtTime(0.001, now);
      this.blenderGain.gain.exponentialRampToValueAtTime(0.25, now + 0.1);

      this.blenderOsc = this.ctx.createOscillator();
      this.blenderOsc.type = "sawtooth";
      this.blenderOsc.frequency.setValueAtTime(90, now);

      this.blenderFilter = this.ctx.createBiquadFilter();
      this.blenderFilter.type = "bandpass";
      this.blenderFilter.Q.setValueAtTime(4.0, now);
      this.blenderFilter.frequency.setValueAtTime(250, now);

      this.blenderOsc.connect(this.blenderFilter);
      this.blenderFilter.connect(this.blenderGain);
      this.blenderGain.connect(this.masterGain);
      this.blenderOsc.start();
    }

    if (this.isBlenderPlaying) {
      const targetFreq = 100 + ratio * 850;
      const targetFilter = 250 + ratio * 2200;
      this.blenderOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
      this.blenderFilter.frequency.setTargetAtTime(targetFilter, now, 0.05);

      if (ratio <= 0.01) {
        this.stopBlender();
      }
    }
  }

  stopBlender() {
    if (!this.isBlenderPlaying || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.blenderGain) {
      this.blenderGain.gain.cancelScheduledValues(now);
      this.blenderGain.gain.setTargetAtTime(0.0001, now, 0.2);
    }
    setTimeout(() => {
      try {
        if (this.blenderOsc) {
          this.blenderOsc.stop();
          this.blenderOsc.disconnect();
          this.blenderOsc = null;
        }
      } catch (e) {}
      this.isBlenderPlaying = false;
    }, 250);
  }

  // Fruit Squish sound for stone mortar
  playSquish() {
    this.ensureRunning();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  // Turntable scratch / stone friction sound
  playScratch(speed = 1) {
    this.ensureRunning();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Buffer noise
    const bufferSize = this.ctx.sampleRate * 0.06;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800 * speed, now);
    filter.Q.setValueAtTime(2.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  // Mechanical ratchet / UI click
  playClick(pitch = 1) {
    this.ensureRunning();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(650 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Medieval Church Bell / Alchemical chime
  playBell(freq = 440) {
    this.ensureRunning();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    mod.type = "sine";
    mod.frequency.setValueAtTime(freq * 2.76, now); // inharmonic bell ratio
    modGain.gain.setValueAtTime(300, now);
    modGain.gain.exponentialRampToValueAtTime(1, now + 1.2);

    mod.connect(modGain);
    modGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    osc.connect(gain);
    gain.connect(this.masterGain);

    mod.start(now);
    osc.start(now);
    mod.stop(now + 1.8);
    osc.stop(now + 1.8);
  }

  // Heavy Mallet / Blacksmith Anvil Strike
  playMallet() {
    this.ensureRunning();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Sub Boom
    const boom = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boom.type = "sine";
    boom.frequency.setValueAtTime(95, now);
    boom.frequency.exponentialRampToValueAtTime(32, now + 0.35);

    boomGain.gain.setValueAtTime(0.45, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    boom.connect(boomGain);
    boomGain.connect(this.masterGain);
    boom.start(now);
    boom.stop(now + 0.42);

    // Anvil Ping
    this.playBell(587.33); // D5
  }

  // Inquisitorial Wax Stamp Slam
  playStamp() {
    this.ensureRunning();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.16);

    this.playClick(0.6);
  }

  // Grand Master Investiture Fanfare Chord
  playInvestitureFanfare() {
    const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playBell(freq);
      }, idx * 160);
    });
  }

  // Returns array of 8 equalizer values (0.0 to 1.0)
  getVisualizerLevels() {
    if (!this.analyser || !this.dataArray || this.isMuted) {
      return [0.05, 0.08, 0.04, 0.06, 0.03, 0.07, 0.04, 0.05];
    }
    this.analyser.getByteFrequencyData(this.dataArray);
    const levels = [];
    const step = Math.floor(this.dataArray.length / 8);
    for (let i = 0; i < 8; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += this.dataArray[i * step + j] || 0;
      }
      levels.push(Math.min(1.0, (sum / step / 255) * 1.5 + 0.05));
    }
    return levels;
  }
}

export const abbeyAudio = new AbbeyAudioEngine();
