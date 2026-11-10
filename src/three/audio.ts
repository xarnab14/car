/**
 * Procedural Web Audio API sound synthesizer for vehicle simulation.
 * Zero external audio files or network dependencies.
 */

export class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private masterGain: GainNode | null = null;

  // Engine sound nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  // Tire skid nodes
  private skidNoiseNode: AudioBufferSourceNode | null = null;
  private skidFilter: BiquadFilterNode | null = null;
  private skidGain: GainNode | null = null;

  // Wind nodes
  private windNoiseNode: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;

  // State
  private initialized = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupEngine();
      this.setupSkid();
      this.setupWind();

      this.initialized = true;
    } catch {
      // Audio not supported or blocked
    }
  }

  private setupEngine() {
    if (!this.ctx || !this.masterGain) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    // Dual oscillator for rich mechanical rumble
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  private setupSkid() {
    if (!this.ctx || !this.masterGain) return;

    // Generate white noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.skidNoiseNode = this.ctx.createBufferSource();
    this.skidNoiseNode.buffer = noiseBuffer;
    this.skidNoiseNode.loop = true;

    this.skidFilter = this.ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.setValueAtTime(900, this.ctx.currentTime);
    this.skidFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.skidNoiseNode.connect(this.skidFilter);
    this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.masterGain);

    this.skidNoiseNode.start();
  }

  private setupWind() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.windNoiseNode = this.ctx.createBufferSource();
    this.windNoiseNode.buffer = noiseBuffer;
    this.windNoiseNode.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(200, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.02, this.ctx.currentTime);

    this.windNoiseNode.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    this.windNoiseNode.start();
  }

  // Update sound in RAF loop
  update(speedNormalized: number, isAccelerating: boolean, driftIntensity: number, isBoosting: boolean) {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;

    // Engine sound modulation
    if (this.engineOsc1 && this.engineOsc2 && this.engineFilter && this.engineGain) {
      const baseFreq = 40 + speedNormalized * 140 + (isBoosting ? 50 : 0);
      const throttleBoost = isAccelerating ? 25 : 0;
      this.engineOsc1.frequency.setTargetAtTime(baseFreq + throttleBoost, now, 0.08);
      this.engineOsc2.frequency.setTargetAtTime((baseFreq + throttleBoost) * 1.5, now, 0.08);

      const filterFreq = 220 + speedNormalized * 900 + (isAccelerating ? 400 : 0);
      this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);

      const engineVol = 0.05 + speedNormalized * 0.12 + (isAccelerating ? 0.05 : 0);
      this.engineGain.gain.setTargetAtTime(engineVol, now, 0.08);
    }

    // Tire skid sound
    if (this.skidGain && this.skidFilter) {
      const targetSkidVol = Math.min(0.22, driftIntensity * 0.25);
      this.skidGain.gain.setTargetAtTime(targetSkidVol, now, 0.05);
      this.skidFilter.frequency.setTargetAtTime(800 + driftIntensity * 400, now, 0.05);
    }

    // Wind sound
    if (this.windGain && this.windFilter) {
      const windVol = 0.02 + speedNormalized * 0.15;
      this.windGain.gain.setTargetAtTime(windVol, now, 0.1);
      this.windFilter.frequency.setTargetAtTime(150 + speedNormalized * 600, now, 0.1);
    }
  }

  // Honk horn (dual tone harmony 440Hz + 554Hz)
  playHonk() {
    if (!this.initialized) this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const hornGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(435, now);
    osc2.frequency.setValueAtTime(545, now);

    hornGain.gain.setValueAtTime(0.18, now);
    hornGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(hornGain);
    osc2.connect(hornGain);
    hornGain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.36);
    osc2.stop(now + 0.36);
  }

  // Jump suspension / boost sound
  playJump() {
    if (!this.initialized) this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.21);
  }

  // Landing impact thud
  playImpact() {
    if (!this.initialized) this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }
}

export const audioManager = new AudioManager();
