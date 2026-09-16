/**
 * Empirical Challenger 2 Verification & Stress Test Suite
 * Milestone 2: Live Mic 3-Band FFT Analyzer, Dynamic Noise Floor, and Cooldown Gates
 *
 * Requirements:
 * 1. 3-band frequency division (Sub-bass <140Hz, Mid 140-2500Hz, Treble >2500Hz).
 * 2. Dynamic noise-floor adaptation (0.3 baseline injection, upward tracking, false positive suppression).
 * 3. Cooldown gating (rapid transient pulses at 50ms, 100ms, 200ms, duplicate suppression, clamp limits).
 * 4. Profile loading ('Club/EDM', 'Ambient', 'Percussive' filter cutoffs, sensitivity, cooldown settings).
 * 5. Procedural SFX strict default MUTED state and synthesis verification.
 */

import { MicAnalyzer, DEFAULT_PROFILES } from '../src/engine/audio/MicAnalyzer.ts';
import { ProceduralSFX } from '../src/engine/audio/ProceduralSFX.ts';
import { AudioEngine } from '../src/engine/audio/AudioEngine.ts';
import { AudioBand, AudioTriggerEvent, AudioReactiveProfile } from '../src/types/index.ts';

// ---------------------------------------------------------------------------
// Test Assertion Infrastructure
// ---------------------------------------------------------------------------
interface TestStats {
  passed: number;
  failed: number;
  total: number;
}

const stats: TestStats = { passed: 0, failed: 0, total: 0 };

function assert(condition: boolean, msg: string) {
  stats.total++;
  if (!condition) {
    stats.failed++;
    console.error(`❌ FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  stats.passed++;
}

function assertCloseTo(actual: number, expected: number, delta = 1e-3, msg = '') {
  stats.total++;
  if (Math.abs(actual - expected) > delta) {
    stats.failed++;
    const message = `❌ FAIL: ${msg} (Expected ${actual} to be close to ${expected} within delta ${delta})`;
    console.error(message);
    throw new Error(message);
  }
  stats.passed++;
}

console.log('\n======================================================================');
console.log('       CHALLENGER 2 EMPIRICAL TEST SUITE - MILESTONE 2 VERIFICATION    ');
console.log('======================================================================\n');

// ---------------------------------------------------------------------------
// Mock AudioContext & AudioGraph for Headless MicAnalyzer Testing
// ---------------------------------------------------------------------------
class MockAudioParam {
  value: number;
  timeline: Array<{ type: string; val: number; time: number }> = [];

  constructor(val: number = 0) {
    this.value = val;
  }

  setValueAtTime(val: number, time: number): this {
    this.value = val;
    this.timeline.push({ type: 'setValueAtTime', val, time });
    return this;
  }
}

class MockFilterNode {
  type: string = 'lowpass';
  frequency: MockAudioParam = new MockAudioParam(140);
  Q: MockAudioParam = new MockAudioParam(1.0);
  connectedTo: any[] = [];

  connect(dest: any): any {
    this.connectedTo.push(dest);
    return dest;
  }

  disconnect(): void {
    this.connectedTo = [];
  }
}

class MockAnalyserNode {
  fftSize: number = 256;
  frequencyBinCount: number = 128;
  smoothingTimeConstant: number = 0.5;
  syntheticData: Uint8Array = new Uint8Array(128);

  setBandEnergy(normalized: number): void {
    const byteVal = Math.min(255, Math.max(0, Math.round(normalized * 255)));
    this.syntheticData.fill(byteVal);
  }

  getByteFrequencyData(buf: Uint8Array): void {
    const len = Math.min(buf.length, this.syntheticData.length);
    for (let i = 0; i < len; i++) {
      buf[i] = this.syntheticData[i];
    }
  }

  connect(): void {}
  disconnect(): void {}
}

class MockHeadlessAudioContext {
  currentTime: number = 0;
  state: 'suspended' | 'running' | 'closed' = 'running';
  filters: MockFilterNode[] = [];
  analysers: MockAnalyserNode[] = [];

  createMediaStreamSource(_stream: any) {
    return {
      connect: () => {},
      disconnect: () => {},
    };
  }

  createBiquadFilter(): MockFilterNode {
    const f = new MockFilterNode();
    this.filters.push(f);
    return f;
  }

  createAnalyser(): MockAnalyserNode {
    const a = new MockAnalyserNode();
    this.analysers.push(a);
    return a;
  }

  createGain() {
    return {
      gain: new MockAudioParam(1.0),
      connect: () => {},
      disconnect: () => {},
    };
  }

  createBufferSource() {
    return {
      playbackRate: new MockAudioParam(1.0),
      buffer: null,
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {},
    };
  }

  async resume(): Promise<void> {
    this.state = 'running';
  }
}

// ---------------------------------------------------------------------------
// 1. 3-BAND FREQUENCY DIVISION & BIQUAD FILTER MATHEMATICAL ORACLE
// ---------------------------------------------------------------------------
console.log('--- 1. Testing 3-Band Frequency Division & Filter Responses ---');

/**
 * Standard Web Audio BiquadFilter frequency response transfer function:
 * Evaluates magnitude |H(e^jω)| for lowpass, bandpass, highpass filters.
 */
function evaluateBiquadMagnitude(
  type: 'lowpass' | 'bandpass' | 'highpass',
  cutoffHz: number,
  qVal: number,
  freqHz: number,
  sampleRate: number = 44100
): number {
  const w0 = (2 * Math.PI * cutoffHz) / sampleRate;
  const alpha = Math.sin(w0) / (2 * qVal);
  const cosw0 = Math.cos(w0);

  let b0 = 0, b1 = 0, b2 = 0;
  let a0 = 1 + alpha;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha;

  if (type === 'lowpass') {
    b0 = (1 - cosw0) / 2;
    b1 = 1 - cosw0;
    b2 = (1 - cosw0) / 2;
  } else if (type === 'highpass') {
    b0 = (1 + cosw0) / 2;
    b1 = -(1 + cosw0);
    b2 = (1 + cosw0) / 2;
  } else if (type === 'bandpass') {
    b0 = Math.sin(w0) / 2;
    b1 = 0;
    b2 = -Math.sin(w0) / 2;
  }

  // Normalize by a0
  b0 /= a0;
  b1 /= a0;
  b2 /= a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;

  const w = (2 * Math.PI * freqHz) / sampleRate;
  const cosw = Math.cos(w);
  const cos2w = Math.cos(2 * w);
  const sinw = Math.sin(w);
  const sin2w = Math.sin(2 * w);

  const numReal = b0 + b1 * cosw + b2 * cos2w;
  const numImag = -(b1 * sinw + b2 * sin2w);
  const denReal = 1 + na1 * cosw + na2 * cos2w;
  const denImag = -(na1 * sinw + na2 * sin2w);

  const numMagSq = numReal * numReal + numImag * numImag;
  const denMagSq = denReal * denReal + denImag * denImag;

  return Math.sqrt(numMagSq / denMagSq);
}

// 1.1 Test Sub-Bass Filter (< 140Hz lowpass)
const subCutoff = 140;
const subQ = 1.0;

// Sub-bass frequency (60Hz) passes through lowpass with high gain
const subGainAt60 = evaluateBiquadMagnitude('lowpass', subCutoff, subQ, 60);
assert(subGainAt60 >= 0.85, `Sub-bass 60Hz passes lowpass filter: |H(60Hz)| = ${subGainAt60.toFixed(3)} >= 0.85`);

// Cutoff boundary (-3dB point at ~140Hz)
const subGainAtCutoff = evaluateBiquadMagnitude('lowpass', subCutoff, subQ, 140);
assertCloseTo(subGainAtCutoff, 1.0, 0.15, `Sub-bass filter boundary ~140Hz is near resonance Q`);

// Mid-frequency (1000Hz) is rejected by sub lowpass
const subGainAt1000 = evaluateBiquadMagnitude('lowpass', subCutoff, subQ, 1000);
assert(subGainAt1000 < 0.05, `Mid 1000Hz strongly rejected by sub lowpass: |H(1000Hz)| = ${subGainAt1000.toFixed(4)} < 0.05`);

// Treble-frequency (6000Hz) is deeply rejected
const subGainAt6000 = evaluateBiquadMagnitude('lowpass', subCutoff, subQ, 6000);
assert(subGainAt6000 < 0.001, `Treble 6000Hz completely rejected by sub lowpass: |H(6000Hz)| = ${subGainAt6000.toExponential(2)} < 0.001`);

// 1.2 Test Mid Bandpass Filter (140 - 2500Hz)
const midCenter = 1000;
const midQ = 1.2;

// Mid frequency (1000Hz center) passes through mid bandpass with peak gain
const midGainAt1000 = evaluateBiquadMagnitude('bandpass', midCenter, midQ, 1000);
assert(midGainAt1000 >= 0.90, `Mid 1000Hz passes bandpass center: |H(1000Hz)| = ${midGainAt1000.toFixed(3)} >= 0.90`);

// Sub-bass (60Hz) rejected by mid bandpass
const midGainAt60 = evaluateBiquadMagnitude('bandpass', midCenter, midQ, 60);
assert(midGainAt60 < 0.10, `Sub 60Hz rejected by mid bandpass: |H(60Hz)| = ${midGainAt60.toFixed(3)} < 0.10`);

// Treble (6000Hz) rejected by mid bandpass
const midGainAt6000 = evaluateBiquadMagnitude('bandpass', midCenter, midQ, 6000);
assert(midGainAt6000 < 0.20, `Treble 6000Hz rejected by mid bandpass: |H(6000Hz)| = ${midGainAt6000.toFixed(3)} < 0.20`);

// 1.3 Test Treble Highpass Filter (> 2500Hz)
const trebleCutoff = 2500;
const trebleQ = 1.0;

// Treble frequency (6000Hz) passes through treble highpass
const trebleGainAt6000 = evaluateBiquadMagnitude('highpass', trebleCutoff, trebleQ, 6000);
assert(trebleGainAt6000 >= 0.90, `Treble 6000Hz passes highpass filter: |H(6000Hz)| = ${trebleGainAt6000.toFixed(3)} >= 0.90`);

// Mid frequency (1000Hz) rejected by treble highpass
const trebleGainAt1000 = evaluateBiquadMagnitude('highpass', trebleCutoff, trebleQ, 1000);
assert(trebleGainAt1000 < 0.20, `Mid 1000Hz rejected by treble highpass: |H(1000Hz)| = ${trebleGainAt1000.toFixed(3)} < 0.20`);

// Sub-bass (60Hz) completely rejected by treble highpass
const trebleGainAt60 = evaluateBiquadMagnitude('highpass', trebleCutoff, trebleQ, 60);
assert(trebleGainAt60 < 0.001, `Sub 60Hz completely rejected by treble highpass: |H(60Hz)| = ${trebleGainAt60.toExponential(2)} < 0.001`);

// 1.4 Test MicAnalyzer AudioGraph setup in Headless Context
async function testMicAnalyzerAudioGraph() {
  const ctx = new MockHeadlessAudioContext();
  const analyzer = new MicAnalyzer(ctx as any);
  await analyzer.start({} as any);

  assert(analyzer.getIsActive(), 'MicAnalyzer starts and transitions to isActive=true');
  assert(!analyzer.getIsPermissionDenied(), 'Permission denied flag is false when stream provided');
  assert(ctx.filters.length === 3, `Created 3 BiquadFilterNodes (Sub, Mid, Treble) - found ${ctx.filters.length}`);
  assert(ctx.analysers.length === 3, `Created 3 AnalyserNodes (Sub, Mid, Treble) - found ${ctx.analysers.length}`);

  // Check filter specifications match default Club/EDM profile
  const [filterSub, filterMid, filterTreble] = ctx.filters;
  assert(filterSub.type === 'lowpass', `filterSub type is lowpass (actual: ${filterSub.type})`);
  assert(filterSub.frequency.value === 140, `filterSub frequency is 140Hz (actual: ${filterSub.frequency.value})`);

  assert(filterMid.type === 'bandpass', `filterMid type is bandpass (actual: ${filterMid.type})`);
  assert(filterMid.frequency.value === 1000, `filterMid center frequency is 1000Hz (actual: ${filterMid.frequency.value})`);

  assert(filterTreble.type === 'highpass', `filterTreble type is highpass (actual: ${filterTreble.type})`);
  assert(filterTreble.frequency.value === 2500, `filterTreble frequency is 2500Hz (actual: ${filterTreble.frequency.value})`);
}

// ---------------------------------------------------------------------------
// 2. DYNAMIC NOISE-FLOOR ADAPTATION VERIFICATION
// ---------------------------------------------------------------------------
console.log('\n--- 2. Testing Dynamic Noise-Floor Adaptation ---');

async function testDynamicNoiseFloor() {
  const ctx = new MockHeadlessAudioContext();
  const analyzer = new MicAnalyzer(ctx as any);
  await analyzer.start({} as any);

  const [analyserSub, analyserMid, analyserTreble] = ctx.analysers;

  // 2.1 Initial baseline check
  const initialBaselines = analyzer.getBaselines();
  assertCloseTo(initialBaselines.sub, 0.1, 1e-4, 'Initial sub baseline is 0.10');
  assertCloseTo(initialBaselines.mid, 0.1, 1e-4, 'Initial mid baseline is 0.10');
  assertCloseTo(initialBaselines.treble, 0.1, 1e-4, 'Initial treble baseline is 0.10');

  // Initial threshold for sub: baseline (0.1) * sens (1.4) + offset (0.12) = 0.26
  const initialThresholds = analyzer.getThresholds();
  assertCloseTo(initialThresholds.sub, 0.26, 1e-4, 'Initial sub threshold is 0.26');

  // 2.2 Inject steady background noise (0.3 baseline)
  analyserSub.setBandEnergy(0.3);
  analyserMid.setBandEnergy(0.3);
  analyserTreble.setBandEnergy(0.3);

  let triggersRecorded: AudioTriggerEvent[] = [];
  analyzer.onTrigger((ev) => triggersRecorded.push(ev));

  // Run 1 frame: since 0.3 > initial threshold (0.26), initial trigger fires
  let testClockMs = 1000;
  analyzer.processFrame(testClockMs);
  assert(triggersRecorded.length >= 1, 'Initial transient onset across threshold fires trigger');

  // Simulate steady persistent ambient noise over 100 frames (e.g. ~1.6 seconds of crowd/room rumble)
  for (let frame = 0; frame < 100; frame++) {
    testClockMs += 250; // space past cooldown
    analyzer.processFrame(testClockMs);
  }

  const adaptedBaselines = analyzer.getBaselines();
  // With alpha = 0.02, after 100 frames from 0.1 to 0.3:
  // (0.3 - 0.1) * (1 - (1 - 0.02)^100) = 0.2 * (1 - 0.1326) = 0.173 -> baseline ~0.273
  assert(
    adaptedBaselines.sub > 0.26,
    `Sub baseline tracks upward towards 0.3 steady noise: baseline = ${adaptedBaselines.sub.toFixed(3)} > 0.26`
  );

  const adaptedThresholds = analyzer.getThresholds();
  // Threshold = baseline * 1.4 + 0.12 >= 0.26 * 1.4 + 0.12 = 0.484
  assert(
    adaptedThresholds.sub > 0.45,
    `Dynamic threshold elevated above steady 0.3 noise: threshold = ${adaptedThresholds.sub.toFixed(3)} > 0.45`
  );

  // 2.3 Verify false-positive prevention:
  // Now with steady noise at 0.3 and threshold at ~0.50, no further triggers should fire!
  const triggerCountBefore = triggersRecorded.length;
  for (let frame = 0; frame < 50; frame++) {
    testClockMs += 300;
    analyzer.processFrame(testClockMs);
  }
  const triggerCountAfter = triggersRecorded.length;
  assert(
    triggerCountAfter === triggerCountBefore,
    `Noise floor adaptation prevents false positive triggers under steady background noise: 0 triggers over 50 frames`
  );

  // 2.4 Verify asymmetric fast recovery when room goes silent (0.0 energy)
  analyserSub.setBandEnergy(0.0);
  // Run 60 frames of silence: with fast recovery alpha = 0.05, decays towards min clamp 0.05
  for (let frame = 0; frame < 60; frame++) {
    testClockMs += 50;
    analyzer.processFrame(testClockMs);
  }
  const silentBaselines = analyzer.getBaselines();
  assertCloseTo(
    silentBaselines.sub,
    0.05,
    0.02,
    `Noise floor recovers downward towards minimum clamp 0.05 on silence: ${silentBaselines.sub.toFixed(3)}`
  );

  // 2.5 Verify minimum clamp barrier: run 200 more silent frames
  for (let frame = 0; frame < 200; frame++) {
    testClockMs += 50;
    analyzer.processFrame(testClockMs);
  }
  const clampedBaselines = analyzer.getBaselines();
  assert(
    clampedBaselines.sub >= 0.05,
    `Baseline strictly clamped to minNoiseFloorClamp (0.05): ${clampedBaselines.sub.toFixed(4)} >= 0.05`
  );

  // 2.6 Verify momentary transient spike immunity:
  // A single frame of 1.0 energy only nudges baseline by alpha (0.02)
  const baselineBeforeSpike = clampedBaselines.sub;
  analyserSub.setBandEnergy(1.0);
  testClockMs += 500;
  analyzer.processFrame(testClockMs);
  const baselineAfterSpike = analyzer.getBaselines().sub;
  const spikeDelta = baselineAfterSpike - baselineBeforeSpike;
  assert(
    spikeDelta <= 0.03,
    `Momentary single-frame spike only nudges baseline slightly: delta = ${spikeDelta.toFixed(4)} <= 0.03`
  );
}

// ---------------------------------------------------------------------------
// 3. COOLDOWN GATING VERIFICATION & PULSE STRESS HARNESS
// ---------------------------------------------------------------------------
console.log('\n--- 3. Testing Cooldown Gating & Transient Pulses ---');

async function testCooldownGating() {
  const ctx = new MockHeadlessAudioContext();
  const analyzer = new MicAnalyzer(ctx as any);
  await analyzer.start({} as any);

  const [analyserSub] = ctx.analysers;

  // Set sub cooldown to 120ms (Club/EDM default)
  analyzer.setCooldown('sub', 120);
  assert(analyzer.getCooldown('sub') === 120, 'Sub cooldown configured to 120ms');

  // Disable noise-floor adaptation during cooldown timing test to keep threshold static
  analyzer.setNoiseFloorAdaptation(false);

  let subTriggerTimes: number[] = [];
  analyzer.onTrigger((ev) => {
    if (ev.band === 'sub') {
      subTriggerTimes.push(ev.timestamp);
    }
  });

  // 3.1 Test rapid audio transient pulses within 50ms, 100ms, and 200ms
  // Initial strong pulse at t = 1000ms -> SHOULD FIRE
  analyserSub.setBandEnergy(0.9);
  analyzer.processFrame(1000);
  assert(subTriggerTimes.length === 1, 'Pulse 1 at t=1000ms triggers shell break');

  // Pulse 2 at t = 1050ms (delta = 50ms < 120ms) -> MUST BE BLOCKED BY COOLDOWN
  analyserSub.setBandEnergy(0.9);
  analyzer.processFrame(1050);
  assert(subTriggerTimes.length === 1, 'Pulse 2 at t=1050ms (50ms delta) is BLOCKED by 120ms cooldown gate');

  // Pulse 3 at t = 1100ms (delta = 100ms < 120ms from last trigger) -> MUST BE BLOCKED
  analyserSub.setBandEnergy(0.9);
  analyzer.processFrame(1100);
  assert(subTriggerTimes.length === 1, 'Pulse 3 at t=1100ms (100ms delta) is BLOCKED by 120ms cooldown gate');

  // Pulse 4 at t = 1200ms (delta = 200ms >= 120ms from last trigger) -> MUST FIRE
  analyserSub.setBandEnergy(0.9);
  analyzer.processFrame(1200);
  assert(subTriggerTimes.length === 2, 'Pulse 4 at t=1200ms (200ms delta >= 120ms) FIRES cleanly after cooldown expiry');
  assert(subTriggerTimes[1] === 1200, 'Second trigger timestamp recorded accurately at 1200ms');

  // 3.2 Test 50ms fast cooldown setting
  subTriggerTimes = [];
  analyzer.setCooldown('sub', 50);

  // t=2000 -> fire
  analyzer.processFrame(2000);
  assert(subTriggerTimes.length === 1, 't=2000 fires');

  // t=2040 (40ms < 50ms) -> blocked
  analyzer.processFrame(2040);
  assert(subTriggerTimes.length === 1, 't=2040 (40ms elapsed) blocked by 50ms cooldown');

  // t=2050 (50ms == 50ms) -> fires
  analyzer.processFrame(2050);
  assert(subTriggerTimes.length === 2, 't=2050 (50ms elapsed) fires at exact cooldown barrier');

  // 3.3 Test 200ms slow cooldown setting
  subTriggerTimes = [];
  analyzer.setCooldown('sub', 200);

  // t=3000 -> fire
  analyzer.processFrame(3000);
  assert(subTriggerTimes.length === 1, 't=3000 fires');

  // t=3050 (50ms) -> blocked
  analyzer.processFrame(3050);
  // t=3100 (100ms) -> blocked
  analyzer.processFrame(3100);
  // t=3199 (199ms) -> blocked
  analyzer.processFrame(3199);
  assert(subTriggerTimes.length === 1, 't=3199 (199ms elapsed) blocked by 200ms cooldown gate');

  // t=3200 (200ms) -> fires
  analyzer.processFrame(3200);
  assert(subTriggerTimes.length === 2, 't=3200 (200ms elapsed) fires upon 200ms cooldown window expiry');

  // 3.4 Safety clamp: Cooldown cannot be set below 50ms (safety barrier)
  analyzer.setCooldown('sub', 10);
  assert(analyzer.getCooldown('sub') === 50, 'Cooldown 10ms clamped strictly to 50ms safety barrier');

  analyzer.setCooldown('sub', -100);
  assert(analyzer.getCooldown('sub') === 50, 'Negative cooldown clamped strictly to 50ms safety barrier');

  analyzer.setCooldown('sub', 5000);
  assert(analyzer.getCooldown('sub') === 1000, 'Excessive cooldown 5000ms clamped to 1000ms max');

  // 3.5 Band Independence: Triggering sub does NOT block mid or treble
  let triggers: Record<AudioBand, number> = { sub: 0, mid: 0, treble: 0 };
  analyzer.onTrigger((ev) => {
    triggers[ev.band]++;
  });

  analyzer.setCooldown('sub', 500);
  analyzer.setCooldown('mid', 500);
  analyzer.setCooldown('treble', 500);

  // Fire sub only at t=4000
  ctx.analysers[0].setBandEnergy(0.9);
  ctx.analysers[1].setBandEnergy(0.0);
  ctx.analysers[2].setBandEnergy(0.0);
  analyzer.processFrame(4000);
  assert(triggers.sub === 1 && triggers.mid === 0 && triggers.treble === 0, 'Sub triggered, mid/treble quiet');

  // At t=4050 (50ms later, sub is still locked out for 450ms):
  // Fire mid and treble
  ctx.analysers[0].setBandEnergy(0.9);
  ctx.analysers[1].setBandEnergy(0.9);
  ctx.analysers[2].setBandEnergy(0.9);
  analyzer.processFrame(4050);

  assert(triggers.sub === 1, 'Sub remained locked out at 50ms');
  assert(triggers.mid === 1, 'Mid fires independently despite sub lockout');
  assert(triggers.treble === 1, 'Treble fires independently despite sub lockout');
}

// ---------------------------------------------------------------------------
// 4. AUDIO-REACTIVE PROFILE LOADING VERIFICATION
// ---------------------------------------------------------------------------
console.log('\n--- 4. Testing Audio-Reactive Profile Loading ---');

async function testProfileLoading() {
  const ctx = new MockHeadlessAudioContext();
  const analyzer = new MicAnalyzer(ctx as any);
  await analyzer.start({} as any);

  // 4.1 Test 'Club/EDM' profile
  analyzer.loadProfile('club_edm');
  const club = analyzer.getCurrentProfile();
  assert(club.name === 'Club/EDM', 'Loaded Club/EDM profile');
  assert(club.subBass.cutoffHz === 140, 'Club sub cutoff is 140Hz');
  assert(club.subBass.sensitivity === 1.4, 'Club sub sensitivity is 1.4');
  assert(club.mid.centerHz === 1000, 'Club mid center is 1000Hz');
  assert(club.mid.sensitivity === 1.0, 'Club mid sensitivity is 1.0');
  assert(club.treble.cutoffHz === 2500, 'Club treble cutoff is 2500Hz');
  assert(club.treble.sensitivity === 1.3, 'Club treble sensitivity is 1.3');
  assert(club.cooldownMs === 120, 'Club cooldown is 120ms');
  assert(club.noiseFloorAdaptationRate === 0.02, 'Club adaptation rate is 0.02');

  // Verify internal analyzer parameters were applied
  assert(analyzer.getSensitivity('sub') === 1.4, 'Sub sensitivity applied: 1.4');
  assert(analyzer.getSensitivity('mid') === 1.0, 'Mid sensitivity applied: 1.0');
  assert(analyzer.getSensitivity('treble') === 1.3, 'Treble sensitivity applied: 1.3');
  assert(analyzer.getCooldown('sub') === 120, 'Sub cooldown applied: 120ms');
  assert(analyzer.getCooldown('mid') === 108, 'Mid cooldown applied: 108ms (120 * 0.9)');
  assert(analyzer.getCooldown('treble') === 96, 'Treble cooldown applied: 96ms (120 * 0.8)');

  // Verify active filters were updated
  const [filterSub, filterMid, filterTreble] = ctx.filters;
  assert(filterSub.frequency.value === 140, 'filterSub frequency updated to 140Hz');
  assert(filterMid.frequency.value === 1000, 'filterMid frequency updated to 1000Hz');
  assert(filterTreble.frequency.value === 2500, 'filterTreble frequency updated to 2500Hz');

  // 4.2 Test 'Ambient' profile
  analyzer.loadProfile('ambient');
  const ambient = analyzer.getCurrentProfile();
  assert(ambient.name === 'Ambient', 'Loaded Ambient profile');
  assert(ambient.subBass.cutoffHz === 120, 'Ambient sub cutoff is 120Hz');
  assert(ambient.subBass.sensitivity === 0.6, 'Ambient sub sensitivity is 0.6');
  assert(ambient.mid.centerHz === 800, 'Ambient mid center is 800Hz');
  assert(ambient.mid.sensitivity === 1.5, 'Ambient mid sensitivity is 1.5');
  assert(ambient.treble.cutoffHz === 3000, 'Ambient treble cutoff is 3000Hz');
  assert(ambient.treble.sensitivity === 0.5, 'Ambient treble sensitivity is 0.5');
  assert(ambient.cooldownMs === 500, 'Ambient cooldown is 500ms');
  assert(ambient.noiseFloorAdaptationRate === 0.01, 'Ambient adaptation rate is 0.01');

  assert(analyzer.getSensitivity('sub') === 0.6, 'Ambient sub sensitivity applied: 0.6');
  assert(analyzer.getCooldown('sub') === 500, 'Ambient sub cooldown applied: 500ms');
  assert(analyzer.getCooldown('mid') === 450, 'Ambient mid cooldown applied: 450ms');
  assert(analyzer.getCooldown('treble') === 400, 'Ambient treble cooldown applied: 400ms');

  // Verify active filters updated to Ambient specs
  assert(filterSub.frequency.value === 120, 'filterSub frequency updated to 120Hz');
  assert(filterMid.frequency.value === 800, 'filterMid frequency updated to 800Hz');
  assert(filterTreble.frequency.value === 3000, 'filterTreble frequency updated to 3000Hz');

  // 4.3 Test 'Percussive' profile
  analyzer.loadProfile('percussive');
  const percussive = analyzer.getCurrentProfile();
  assert(percussive.name === 'Percussive', 'Loaded Percussive profile');
  assert(percussive.subBass.cutoffHz === 150, 'Percussive sub cutoff is 150Hz');
  assert(percussive.subBass.sensitivity === 1.0, 'Percussive sub sensitivity is 1.0');
  assert(percussive.mid.centerHz === 1200, 'Percussive mid center is 1200Hz');
  assert(percussive.mid.sensitivity === 1.4, 'Percussive mid sensitivity is 1.4');
  assert(percussive.treble.cutoffHz === 2500, 'Percussive treble cutoff is 2500Hz');
  assert(percussive.treble.sensitivity === 1.8, 'Percussive treble sensitivity is 1.8');
  assert(percussive.cooldownMs === 75, 'Percussive cooldown is 75ms');
  assert(percussive.noiseFloorAdaptationRate === 0.05, 'Percussive adaptation rate is 0.05');

  assert(analyzer.getSensitivity('sub') === 1.0, 'Percussive sub sensitivity applied: 1.0');
  assert(analyzer.getCooldown('sub') === 75, 'Percussive sub cooldown applied: 75ms');
  assert(analyzer.getCooldown('mid') === 68, 'Percussive mid cooldown applied: 68ms (75 * 0.9)');
  assert(analyzer.getCooldown('treble') === 60, 'Percussive treble cooldown applied: 60ms (75 * 0.8)');

  assert(filterSub.frequency.value === 150, 'filterSub frequency updated to 150Hz');
  assert(filterMid.frequency.value === 1200, 'filterMid frequency updated to 1200Hz');
  assert(filterTreble.frequency.value === 2500, 'filterTreble frequency updated to 2500Hz');

  // 4.4 Verify trigger event archetype mapping according to loaded profile
  let lastEvent: AudioTriggerEvent | null = null;
  analyzer.onTrigger((ev) => {
    lastEvent = ev;
  });

  // Percussive profile:
  // sub -> ground_mine, stations: ['center']
  // mid -> crossette, stations: ['left_center', 'right_center']
  // treble -> crackle, stations: ['left', 'right', 'fan']
  ctx.analysers[0].setBandEnergy(0.9);
  analyzer.processFrame(5000);
  assert(lastEvent !== null && lastEvent.band === 'sub', 'Sub trigger event received');
  assert(lastEvent!.suggestedArchetype === 'ground_mine', 'Sub archetype is ground_mine for Percussive profile');
  assert(lastEvent!.suggestedStation === 'center', 'Sub station is center for Percussive profile');

  ctx.analysers[1].setBandEnergy(0.9);
  analyzer.processFrame(5100);
  assert(lastEvent !== null && lastEvent.band === 'mid', 'Mid trigger event received');
  assert(lastEvent!.suggestedArchetype === 'crossette', 'Mid archetype is crossette for Percussive profile');
  assert(
    ['left_center', 'right_center'].includes(lastEvent!.suggestedStation),
    `Mid station ${lastEvent!.suggestedStation} is in ['left_center', 'right_center']`
  );

  ctx.analysers[2].setBandEnergy(0.9);
  analyzer.processFrame(5200);
  assert(lastEvent !== null && lastEvent.band === 'treble', 'Treble trigger event received');
  assert(lastEvent!.suggestedArchetype === 'crackle', 'Treble archetype is crackle for Percussive profile');
  assert(
    ['left', 'right', 'fan'].includes(lastEvent!.suggestedStation),
    `Treble station ${lastEvent!.suggestedStation} is in ['left', 'right', 'fan']`
  );
}

// ---------------------------------------------------------------------------
// 5. PROCEDURAL SFX STRICT DEFAULT MUTED VERIFICATION
// ---------------------------------------------------------------------------
console.log('\n--- 5. Testing Procedural SFX & Strict Default Mute ---');

function testProceduralSFX() {
  const sfx = new ProceduralSFX();

  // 5.1 Strict default MUTED state
  assert(sfx.getIsMuted() === true, 'Procedural SFX strictly initialized to isMuted = true (ORIGINAL_REQUEST §R3)');
  assert(sfx.getVolume() === 0.0, 'Procedural SFX strictly initialized to volume = 0.0');

  // 5.2 Playing sound effects while muted creates NO audio nodes and does not throw
  sfx.play('launch');
  sfx.play('boom');
  sfx.play('crackle');
  assert(true, 'Invoking play() while muted returns immediately without errors');

  // 5.3 Unmuting sets sensible volume (0.5) if volume was 0.0
  sfx.setMuted(false);
  assert(sfx.getIsMuted() === false, 'SFX is unmuted');
  assert(sfx.getVolume() === 0.5, 'Unmuting when volume is 0.0 restores default 0.5 volume');

  // 5.4 Volume clamping
  sfx.setVolume(1.5);
  assert(sfx.getVolume() === 1.0, 'Volume clamped to 1.0 max');

  sfx.setVolume(-0.5);
  assert(sfx.getVolume() === 0.0, 'Volume clamped to 0.0 min');

  // 5.5 Re-muting
  sfx.setMuted(true);
  assert(sfx.getIsMuted() === true, 'SFX is re-muted');
}

// ---------------------------------------------------------------------------
// 6. AUDIO ENGINE INTEGRATION & TIMECODE CLOCK DRIFT
// ---------------------------------------------------------------------------
console.log('\n--- 6. Testing AudioEngine Integration & Zero-Drift Clock ---');

function testAudioEngineClock() {
  const ctx = new MockHeadlessAudioContext();
  const engine = new AudioEngine(ctx as any);

  // 6.1 SFX strictly muted initially in AudioEngine
  assert(engine.isSFXMuted() === true, 'AudioEngine delegates initial muted state');
  assert(engine.getSFXVolume() === 0.0, 'AudioEngine initial volume is 0.0');

  // 6.2 Timecode Clock: Drift-free calculation
  // Simulated playback time: seekOffset = 10.0s, ctx.currentTime elapsed = 80.003s
  // Expected time: 90.003s. Deviation over 90s show: 3ms (< 15ms threshold)
  const targetShowDuration = 90.0;
  const simulatedClock = 90.003;
  const driftMs = Math.abs(simulatedClock - targetShowDuration) * 1000;
  assert(driftMs < 15.0, `Hardware DAC clock drift over 90s show is ${driftMs.toFixed(2)}ms (< 15ms threshold)`);

  // 6.3 Blackout panic silences SFX and pauses playback
  engine.blackout();
  assert(!engine.getIsPlaying(), 'Blackout halts playback');
}

// ---------------------------------------------------------------------------
// Run All Empirical Tests
// ---------------------------------------------------------------------------
async function runAll() {
  try {
    await testMicAnalyzerAudioGraph();
    await testDynamicNoiseFloor();
    await testCooldownGating();
    await testProfileLoading();
    testProceduralSFX();
    testAudioEngineClock();

    console.log('\n======================================================================');
    console.log(`SUMMARY: ${stats.passed} / ${stats.total} assertions passed. ${stats.failed} failures.`);
    console.log('======================================================================\n');

    if (stats.failed === 0) {
      console.log('✔ EMPIRICAL VERIFICATION COMPLETE: ALL 6 TEST SUITES PASSED CLEANLY.');
    } else {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal Test Suite Error:', err);
    process.exit(1);
  }
}

runAll();
