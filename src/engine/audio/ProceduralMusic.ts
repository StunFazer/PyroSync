/**
 * In-Memory Procedural Music Synthesizer
 * Zero-dependency pyromusical soundtrack generator for PyroSync demo shows.
 *
 * Synthesizes complete multi-track stereo soundtracks directly into an AudioBuffer:
 * - Demo Show 1: "Cosmic Awakening" / "Ode to Radiance" (Cinematic Orchestral / Hybrid, 90s)
 * - Demo Show 2: "Neon Horizon" (128 BPM Synthwave / Cyberpunk, 75s)
 *
 * Runs entirely in-memory with pure typed array math without external audio downloads.
 */

export type ProceduralMusicPreset = 'cosmic_awakening' | 'neon_horizon';

export class ProceduralMusic {
  /**
   * Generates a procedural show soundtrack matching the preset name.
   */
  public static generate(
    ctx: AudioContext,
    preset: ProceduralMusicPreset,
    customDuration?: number
  ): AudioBuffer {
    if (preset === 'neon_horizon') {
      return this.generateNeonHorizon(ctx, customDuration || 75.0);
    } else {
      return this.generateCosmicAwakening(ctx, customDuration || 90.0);
    }
  }

  /**
   * Demo Show 1: "Cosmic Awakening" (Cinematic Orchestral / Electronic Hybrid)
   * 90-second duration, 96 BPM.
   * Arc:
   *  0:00 - 0:25: Ambient Introduction (warm drone, ethereal shimmer pads)
   *  0:25 - 0:50: Build-up (cinematic taiko downbeats, string arpeggios)
   *  0:50 - 1:15: Apex Climax (full orchestral chords, driving bass, brass swells)
   *  1:15 - 1:30: Grand Finale (epic crescendo salvo, thundering percussion, soft resolution)
   */
  public static generateCosmicAwakening(ctx: AudioContext, durationSec: number = 90.0): AudioBuffer {
    const sampleRate = ctx.sampleRate || 44100;
    const totalSamples = Math.floor(sampleRate * durationSec);
    const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const bpm = 96;
    const beatInterval = 60 / bpm; // ~0.625s
    const samplesPerBeat = Math.floor(sampleRate * beatInterval);

    // Harmonic chord progression: Cm -> Ab -> Eb -> Bb (frequencies in Hz)
    const chordRoots = [
      [130.81, 155.56, 196.00, 261.63], // C minor (C3, Eb3, G3, C4)
      [103.83, 130.81, 155.56, 207.65], // Ab major (Ab2, C3, Eb3, Ab3)
      [155.56, 196.00, 233.08, 311.13], // Eb major (Eb3, G3, Bb3, Eb4)
      [116.54, 146.83, 174.61, 233.08], // Bb major (Bb2, D3, F3, Bb3)
    ];

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const beatNum = Math.floor(i / samplesPerBeat);
      const beatFraction = (i % samplesPerBeat) / samplesPerBeat;
      const timeInBeat = beatFraction * beatInterval;

      // Section progression
      const isIntro = t < 25.0;
      const isBuild = t >= 25.0 && t < 50.0;
      const isApex = t >= 50.0 && t < 75.0;
      const isFinale = t >= 75.0;

      // Master section gain envelope
      let masterGain = 0.55;
      if (isIntro) {
        masterGain = 0.35 * Math.min(1.0, t / 4.0); // 4s gentle fade in
      } else if (isBuild) {
        masterGain = 0.45 + 0.15 * ((t - 25.0) / 25.0);
      } else if (isApex) {
        masterGain = 0.70;
      } else if (isFinale) {
        masterGain = t < 86.0 ? 0.85 : 0.85 * (1.0 - (t - 86.0) / 4.0); // Outro fade
      }

      // Chord index (changes every 4 beats / 1 bar)
      const chordIndex = Math.floor(beatNum / 4) % chordRoots.length;
      const currentChord = chordRoots[chordIndex];

      let monoSample = 0.0;

      // 1. Cinematic Sub-Bass / Drone (continuous with subtle detune)
      const subFreq = currentChord[0] * 0.5; // Sub-octave
      const sub = Math.sin(2 * Math.PI * subFreq * t) * 0.25;
      monoSample += sub;

      // 2. Warm Orchestral Pad / String Chords
      let pad = 0.0;
      for (let c = 0; c < currentChord.length; c++) {
        const freq = currentChord[c];
        // Rich dual-oscillator chorus
        const osc1 = Math.sin(2 * Math.PI * freq * t);
        const osc2 = Math.sin(2 * Math.PI * (freq * 1.003) * t);
        pad += (osc1 + osc2) * 0.05;
      }
      monoSample += pad;

      // 3. Arpeggiated Melody in Build & Apex
      if (isBuild || isApex || isFinale) {
        const arpStep = Math.floor((t / (beatInterval / 2)) % 4);
        const arpFreq = currentChord[arpStep] * 2.0; // Octave up
        const arpEnvelope = Math.exp(-((t % (beatInterval / 2)) * 6.0));
        const arpOsc = (Math.sin(2 * Math.PI * arpFreq * t) + 0.3 * Math.sin(4 * Math.PI * arpFreq * t)) * arpEnvelope;
        monoSample += arpOsc * (isApex ? 0.18 : 0.12);
      }

      // 4. Cinematic Downbeat Taiko / Kick Drum (on beat 0 of every bar, plus beat 2 in Apex)
      const isKickBeat = (isBuild && beatNum % 4 === 0) || (isApex && (beatNum % 2 === 0)) || (isFinale && (beatNum % 2 === 0));
      if (isKickBeat && timeInBeat < 0.3) {
        const kickPitch = 90 * Math.exp(-timeInBeat * 16);
        const kickOsc = Math.sin(2 * Math.PI * kickPitch * timeInBeat);
        const kickEnv = Math.exp(-timeInBeat * 12);
        monoSample += kickOsc * kickEnv * (isFinale ? 0.45 : 0.35);
      }

      // 5. Shimmer High-Frequency Noise / Cymbal Wash on transitions
      if ((isBuild && beatNum % 8 === 0 && timeInBeat < 0.5) || (isApex && beatNum % 4 === 0 && timeInBeat < 0.4)) {
        const noise = (Math.random() * 2 - 1) * Math.exp(-timeInBeat * 8);
        monoSample += noise * 0.08;
      }

      // Final Master Scaler with soft limiter
      const val = Math.tanh(monoSample * masterGain);

      // Gentle stereo widening (panning pad / arp slightly)
      const stereoOffset = 0.03 * Math.sin(2 * Math.PI * 0.2 * t);
      left[i] = Math.max(-1.0, Math.min(1.0, val * (1.0 + stereoOffset)));
      right[i] = Math.max(-1.0, Math.min(1.0, val * (1.0 - stereoOffset)));
    }

    return buffer;
  }

  /**
   * Demo Show 2: "Neon Horizon" (128 BPM Synthwave / Cyberpunk)
   * 75-second duration.
   * Arc:
   *  0:00 - 0:15: Intro (4-on-floor kick, pumping sidechain bass, neon pad)
   *  0:15 - 0:35: Verse (snappy 80s snare on 2 & 4, 16th-note rolling bass, bright arp)
   *  0:35 - 1:00: Main Drop / Climax (power chords, screaming lead synth, open hi-hats)
   *  1:00 - 1:15: Outro (filter sweep decay, final reverberating crash)
   */
  public static generateNeonHorizon(ctx: AudioContext, durationSec: number = 75.0): AudioBuffer {
    const sampleRate = ctx.sampleRate || 44100;
    const totalSamples = Math.floor(sampleRate * durationSec);
    const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const bpm = 128;
    const beatInterval = 60 / bpm; // 0.46875s
    const samplesPerBeat = Math.floor(sampleRate * beatInterval);
    const samplesPer16th = Math.floor(samplesPerBeat / 4);

    // Synthwave Key: D minor (D, F, G, A, C)
    const bassRoots = [73.42, 65.41, 55.00, 65.41]; // D2, C2, A1, C2

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const beatNum = Math.floor(i / samplesPerBeat);
      const beatFraction = (i % samplesPerBeat) / samplesPerBeat;
      const timeInBeat = beatFraction * beatInterval;

      const sixteenthIndex = Math.floor((i % samplesPerBeat) / samplesPer16th);
      const timeIn16th = ((i % samplesPer16th) / samplesPer16th) * (beatInterval / 4);

      // Sections
      const isIntro = t < 15.0;
      const isVerse = t >= 15.0 && t < 35.0;
      const isDrop = t >= 35.0 && t < 60.0;
      const isOutro = t >= 60.0;

      let masterGain = 0.65;
      if (isIntro) {
        masterGain = 0.45 * Math.min(1.0, t / 2.0);
      } else if (isVerse) {
        masterGain = 0.60;
      } else if (isDrop) {
        masterGain = 0.78;
      } else if (isOutro) {
        masterGain = t < 70.0 ? 0.60 : 0.60 * (1.0 - (t - 70.0) / 5.0);
      }

      let monoSample = 0.0;

      // Current bass root note
      const barIndex = Math.floor(beatNum / 4);
      const currentRoot = bassRoots[barIndex % bassRoots.length];

      // 1. Kick Drum (Punchy 4-on-the-floor on every beat)
      if (timeInBeat < 0.22) {
        const kickPitch = 140 * Math.exp(-timeInBeat * 24);
        const kickOsc = Math.sin(2 * Math.PI * kickPitch * timeInBeat);
        const kickEnv = Math.exp(-timeInBeat * 16);
        monoSample += kickOsc * kickEnv * 0.45;
      }

      // 2. Gated 80s Snare (on beats 2 & 4: beatIndex 1 & 3)
      const isSnareBeat = (beatNum % 2 === 1) && (isVerse || isDrop);
      if (isSnareBeat && timeInBeat < 0.20) {
        // Snare body tone + noise crack
        const snareTone = Math.sin(2 * Math.PI * 185 * timeInBeat) * Math.exp(-timeInBeat * 20);
        const snareNoise = (Math.random() * 2 - 1) * Math.exp(-timeInBeat * 18);
        monoSample += (snareTone * 0.3 + snareNoise * 0.4) * 0.35;
      }

      // 3. Open Hi-Hat (on off-beats: timeInBeat around beatInterval/2)
      if (isDrop && Math.abs(timeInBeat - beatInterval / 2) < 0.08) {
        const hatTime = Math.abs(timeInBeat - beatInterval / 2);
        const hatNoise = (Math.random() * 2 - 1) * Math.exp(-hatTime * 40);
        monoSample += hatNoise * 0.12;
      }

      // 4. Rolling 16th-note Synthwave Bass (sawtooth approximation)
      if (!isOutro || t < 68.0) {
        const bassEnv = Math.exp(-timeIn16th * 18);
        // Sidechain compression: duck bass during kick downbeat
        const sidechain = Math.min(1.0, timeInBeat / 0.15);
        // Sawtooth wave: 2 * fract(f*t) - 1
        const sawPhase = (t * currentRoot) % 1.0;
        const saw = (2 * sawPhase - 1) * bassEnv * sidechain;
        monoSample += saw * (isDrop ? 0.28 : 0.22);
      }

      // 5. Cyberpunk Lead Synth Arpeggio (in Drop and Verse)
      if (isVerse || isDrop) {
        const scaleNotes = [currentRoot * 4, currentRoot * 4.75, currentRoot * 6, currentRoot * 8];
        const noteFreq = scaleNotes[sixteenthIndex % scaleNotes.length];
        const leadPhase = (t * noteFreq) % 1.0;
        const leadPulse = (leadPhase < 0.4 ? 1 : -1) * Math.exp(-timeIn16th * 12);
        monoSample += leadPulse * (isDrop ? 0.18 : 0.12);
      }

      // 6. Lush Retro Poly Synth Pad
      const pad1 = Math.sin(2 * Math.PI * currentRoot * 2 * t);
      const pad2 = Math.sin(2 * Math.PI * currentRoot * 3 * t);
      monoSample += (pad1 + pad2) * 0.06;

      const val = Math.tanh(monoSample * masterGain);

      // Stereo spread: slight ping-pong on lead
      const pan = 0.05 * Math.sin(2 * Math.PI * (bpm / 60) * t);
      left[i] = Math.max(-1.0, Math.min(1.0, val * (1.0 - pan)));
      right[i] = Math.max(-1.0, Math.min(1.0, val * (1.0 + pan)));
    }

    return buffer;
  }
}
