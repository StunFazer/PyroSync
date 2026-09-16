import { ProceduralSFXType } from '../../types';

/**
 * Procedural Web Audio Sound FX Engine
 * Generates pyrotechnic sound effects (launch thump, aerial report boom, crackle)
 * dynamically via the Web Audio API without external audio asset files.
 *
 * MANDATORY REQUIREMENT:
 * Initial state is STRICTLY MUTED (isMuted: true, volume: 0.0) per specification.
 * When muted, zero audio nodes are allocated or scheduled.
 */
export class ProceduralSFX {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private isMuted: boolean = true;
  private volume: number = 0.0;
  private activeVoices: Array<{ stop: () => void; gain: GainNode }> = [];

  constructor(context?: AudioContext | null) {
    this.isMuted = true;
    this.volume = 0.0;
    if (context) {
      this.initContext(context);
    }
  }

  public initContext(context: AudioContext): void {
    this.ctx = context;
    try {
      this.masterGain = context.createGain();
      this.masterGain.gain.setValueAtTime(0.0, context.currentTime);
      this.masterGain.connect(context.destination);
    } catch {
      // In non-audio environments or tests
    }
  }

  public getMasterGain(): GainNode | null {
    return this.masterGain;
  }

  private ensureContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.initContext(new AudioContextClass());
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext, durationSec: number = 2.0): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.duration >= durationSec) {
      return this.noiseBuffer;
    }
    const sampleRate = ctx.sampleRate || 44100;
    const length = Math.floor(sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    // Unmuting when volume is 0.0 restores comfortable default volume (e.g. 0.5)
    if (!muted && this.volume === 0.0) {
      this.volume = 0.5;
    }
    this.syncMasterGain();
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0.0, Math.min(1.0, vol));
    if (this.volume > 0.0 && this.isMuted) {
      this.isMuted = false;
    }
    this.syncMasterGain();
  }

  private syncMasterGain(): void {
    if (!this.masterGain || !this.ctx) return;
    const targetGain = this.isMuted ? 0.0 : this.volume;
    try {
      this.masterGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
    } catch {
      this.masterGain.gain.value = targetGain;
    }
  }

  /**
   * Main synthesis trigger.
   * STRICT INTEGRITY: If muted or volume is 0.0, returns immediately
   * without creating or connecting ANY audio nodes or buffers.
   */
  public play(type: ProceduralSFXType, volumeScale: number = 1.0): void {
    if (this.isMuted || this.volume <= 0.0) {
      return; // Early return to guarantee zero audio nodes when muted
    }

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const effectiveVolume = Math.max(0.0, Math.min(1.0, this.volume * volumeScale));
    if (effectiveVolume <= 0.001) return;

    try {
      switch (type) {
        case 'launch':
          this.synthesizeLaunchThump(ctx, effectiveVolume);
          break;
        case 'boom':
          this.synthesizeAerialBoom(ctx, effectiveVolume);
          break;
        case 'crackle':
          this.synthesizeCrackle(ctx, effectiveVolume);
          break;
      }
    } catch (e) {
      // Audio synthesis error handled gracefully
    }
  }

  /**
   * 1. Launch Thump (Mortar Muzzle Concussion)
   * Sine oscillator pitch-dropped 130Hz -> 35Hz in 70ms + transient bandpass noise.
   */
  private synthesizeLaunchThump(ctx: AudioContext, vol: number): void {
    const t0 = ctx.currentTime;
    const dest = this.masterGain!;

    // 1. Pitch-dropped sine body
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, t0);
    osc.frequency.exponentialRampToValueAtTime(35, t0 + 0.07);

    oscGain.gain.setValueAtTime(0.85 * vol, t0);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);

    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(t0);
    osc.stop(t0 + 0.12);

    // 2. Muzzle gas noise burst
    const noiseBuffer = this.getNoiseBuffer(ctx, 0.1);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(180, t0);
    filter.Q.setValueAtTime(3.0, t0);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6 * vol, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(dest);
    noiseSource.start(t0);
    noiseSource.stop(t0 + 0.08);

    this.registerVoice(oscGain, () => {
      try { osc.stop(); } catch {}
    });
  }

  /**
   * 2. Aerial Report Boom (High-Altitude Concussive Detonation)
   * Sub-bass sine (85Hz -> 24Hz) + lowpass filtered rumble tail (decay ~1.2s).
   */
  private synthesizeAerialBoom(ctx: AudioContext, vol: number): void {
    const t0 = ctx.currentTime;
    const dest = this.masterGain!;

    // 1. Sub-bass concussion sine
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(85, t0);
    subOsc.frequency.exponentialRampToValueAtTime(24, t0 + 0.25);

    subGain.gain.setValueAtTime(1.0 * vol, t0);
    subGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);

    subOsc.connect(subGain);
    subGain.connect(dest);
    subOsc.start(t0);
    subOsc.stop(t0 + 0.6);

    // 2. Diffuse lowpass rumble tail
    const noiseBuffer = this.getNoiseBuffer(ctx, 1.4);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t0);
    filter.frequency.exponentialRampToValueAtTime(120, t0 + 1.2);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.85 * vol, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.3);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(dest);
    noiseSource.start(t0);
    noiseSource.stop(t0 + 1.3);

    this.registerVoice(subGain, () => {
      try { subOsc.stop(); } catch {}
    });
  }

  /**
   * 3. Crackle / Dragon Eggs (Granular Micro-Clicks)
   * 12-25 Poisson-distributed micro-bursts of highpass noise.
   */
  private synthesizeCrackle(ctx: AudioContext, vol: number): void {
    const t0 = ctx.currentTime;
    const dest = this.masterGain!;
    const count = 12 + Math.floor(Math.random() * 12); // 12 to 24 micro-clicks
    const noiseBuffer = this.getNoiseBuffer(ctx, 0.5);

    for (let i = 0; i < count; i++) {
      const clickTime = t0 + Math.random() * 0.40;
      const duration = 0.005 + Math.random() * 0.010; // 5ms - 15ms

      const clickSource = ctx.createBufferSource();
      clickSource.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2500 + Math.random() * 1500, clickTime);

      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(0.4 * vol, clickTime);
      clickGain.gain.exponentialRampToValueAtTime(0.001, clickTime + duration);

      clickSource.connect(filter);
      filter.connect(clickGain);
      clickGain.connect(dest);

      clickSource.start(clickTime);
      clickSource.stop(clickTime + duration);

      this.registerVoice(clickGain, () => {
        try { clickSource.stop(); } catch {}
      });
    }
  }

  private registerVoice(gain: GainNode, stopFn: () => void): void {
    const voice = { gain, stop: stopFn };
    this.activeVoices.push(voice);
    setTimeout(() => {
      const idx = this.activeVoices.indexOf(voice);
      if (idx !== -1) {
        this.activeVoices.splice(idx, 1);
      }
    }, 1500);
  }

  /**
   * Panic / Blackout: Instantly silence all voices and reset gain to 0.
   */
  public stopAll(): void {
    if (this.ctx && this.masterGain) {
      try {
        this.masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      } catch {
        this.masterGain.gain.value = 0.0;
      }
    }
    for (const v of this.activeVoices) {
      try {
        v.stop();
        v.gain.gain.setValueAtTime(0.0, this.ctx ? this.ctx.currentTime : 0);
      } catch {}
    }
    this.activeVoices = [];
    // Restore master gain value after blackout
    if (!this.isMuted && this.volume > 0.0 && this.ctx) {
      setTimeout(() => this.syncMasterGain(), 50);
    }
  }
}
