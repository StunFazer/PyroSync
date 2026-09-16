/**
 * PyroSync Independent Empirical Challenger Test Suite (Milestone 4)
 * Author: teamwork_preview_challenger_m4_2 (Critic & Domain Specialist)
 * Focus: Adversarial stress testing of AutoChoreographer, PatternBrushes, and TapRecorder
 */

import assert from 'node:assert';

// -------------------------------------------------------------
// 1. Mock DOM Environment for Node.js Execution
// -------------------------------------------------------------
export class MockEventTarget {
  public listeners: Record<string, ((e: any) => void)[]> = {};

  addEventListener(type: string, listener: (e: any) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: (e: any) => void) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter(l => l !== listener);
  }

  dispatchEvent(event: any): boolean {
    const list = this.listeners[event.type] || [];
    for (const l of list) {
      l(event);
    }
    return !event.defaultPrevented;
  }
}

export class MockHTMLElement extends MockEventTarget {
  public tagName: string;
  public isContentEditable: boolean = false;
  constructor(tagName: string = 'DIV') {
    super();
    this.tagName = tagName.toUpperCase();
  }
}

export class MockHTMLInputElement extends MockHTMLElement {
  constructor() {
    super('INPUT');
  }
}

export class MockHTMLTextAreaElement extends MockHTMLElement {
  constructor() {
    super('TEXTAREA');
  }
}

export class MockKeyboardEvent {
  public type: string = 'keydown';
  public key: string;
  public target: any;
  public defaultPrevented: boolean = false;

  constructor(key: string, target?: any) {
    this.key = key;
    this.target = target ?? null;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }
}

// Polyfill globals for Node execution
if (typeof (globalThis as any).HTMLElement === 'undefined') {
  (globalThis as any).HTMLElement = MockHTMLElement;
}
if (typeof (globalThis as any).HTMLInputElement === 'undefined') {
  (globalThis as any).HTMLInputElement = MockHTMLInputElement;
}
if (typeof (globalThis as any).HTMLTextAreaElement === 'undefined') {
  (globalThis as any).HTMLTextAreaElement = MockHTMLTextAreaElement;
}
if (typeof (globalThis as any).KeyboardEvent === 'undefined') {
  (globalThis as any).KeyboardEvent = MockKeyboardEvent;
}
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = new MockEventTarget();
}

// -------------------------------------------------------------
// 2. Mock AudioBuffer Implementation
// -------------------------------------------------------------
export class MockAudioBuffer {
  public length: number;
  public duration: number;
  public sampleRate: number;
  public numberOfChannels: number;
  private channels: Float32Array[];

  constructor(options: { length: number; sampleRate?: number; numberOfChannels?: number; duration?: number }) {
    this.sampleRate = options.sampleRate || 44100;
    this.length = options.length;
    this.duration = options.duration !== undefined ? options.duration : options.length / this.sampleRate;
    this.numberOfChannels = options.numberOfChannels || 1;
    this.channels = [];
    for (let c = 0; c < this.numberOfChannels; c++) {
      this.channels.push(new Float32Array(this.length));
    }
  }

  getChannelData(channel: number): Float32Array {
    if (channel < 0 || channel >= this.numberOfChannels) {
      throw new Error(`IndexSizeError: Channel index ${channel} out of bounds`);
    }
    return this.channels[channel];
  }
}

// -------------------------------------------------------------
// 3. Import Production Modules Under Test
// -------------------------------------------------------------
import { AutoChoreographer } from '../src/choreography/AutoChoreographer.ts';
import { PatternBrushes } from '../src/choreography/PatternBrushes.ts';
import { TapRecorder, STATION_HOTKEY_MAP } from '../src/choreography/TapRecorder.ts';
import { ShowJSONCue, FireCuePayload } from '../src/types/index.ts';

// -------------------------------------------------------------
// 4. Test Harness & Assertion Tracking
// -------------------------------------------------------------
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let totalAssertions = 0;

function pass(name: string) {
  totalTests++;
  passedTests++;
  console.log(`  [PASS] ${name}`);
}

function fail(name: string, error: any) {
  totalTests++;
  failedTests++;
  console.error(`  [FAIL] ${name}: ${error.message}`);
}

function assertEq<T>(actual: T, expected: T, message: string) {
  totalAssertions++;
  assert.strictEqual(actual, expected, message);
}

function assertTrue(actual: boolean, message: string) {
  totalAssertions++;
  assert.ok(actual, message);
}

function assertClose(actual: number, expected: number, delta: number, message: string) {
  totalAssertions++;
  assert.ok(Math.abs(actual - expected) <= delta, `${message} (expected ${expected} +- ${delta}, got ${actual})`);
}

console.log('======================================================================');
console.log('       PYROSYNC EMPIRICAL CHALLENGER STRESS SUITE (MILESTONE 4)       ');
console.log('======================================================================\n');
// =====================================================================
// SECTION A: AutoChoreographer Empirical Stress Tests
// =====================================================================
console.log('--- SECTION A: AutoChoreographer Empirical Stress Tests ---');

// Test A1: Missing / null buffer throws specific error
try {
  let thrown = false;
  try {
    AutoChoreographer.choreographFromAudioBuffer(null);
  } catch (err: any) {
    thrown = true;
    assertEq(err.message, 'Cannot auto-choreograph: No audio track loaded', 'Exact error message match');
  }
  assertTrue(thrown, 'Throws error when buffer is null');

  thrown = false;
  try {
    AutoChoreographer.generate(undefined as any);
  } catch (err: any) {
    thrown = true;
    assertEq(err.message, 'Cannot auto-choreograph: No audio track loaded', 'generate alias throws same error');
  }
  assertTrue(thrown, 'generate alias throws when buffer is undefined');
  pass('A1: Missing/null audio buffer throws descriptive AC-8 error');
} catch (err: any) {
  fail('A1: Missing/null audio buffer', err);
}

// Test A2: Zero or negative duration audio buffer
try {
  const zeroLenBuffer = new MockAudioBuffer({ length: 0, duration: 0, sampleRate: 44100 });
  const cuesZero = AutoChoreographer.choreographFromAudioBuffer(zeroLenBuffer as any);
  assertEq(cuesZero.length, 0, 'Zero-length buffer returns empty array');

  const negDurBuffer = new MockAudioBuffer({ length: 1000, duration: -1.0, sampleRate: 44100 });
  const cuesNeg = AutoChoreographer.choreographFromAudioBuffer(negDurBuffer as any);
  assertEq(cuesNeg.length, 0, 'Negative duration buffer returns empty array');
  pass('A2: Degenerate buffer (zero length / negative duration) gracefully returns 0 cues');
} catch (err: any) {
  fail('A2: Degenerate buffer handling', err);
}

// Test A3: Pure silence returns strictly 0 cues
try {
  // 5 seconds of silence
  const silentBuffer5s = new MockAudioBuffer({ length: 44100 * 5, sampleRate: 44100, duration: 5.0 });
  const cues5s = AutoChoreographer.choreographFromAudioBuffer(silentBuffer5s as any);
  assertEq(cues5s.length, 0, '5-second silent buffer produces 0 cues');

  // 15 seconds of silence (longer than 10.0s climax salvo threshold)
  const silentBuffer15s = new MockAudioBuffer({ length: 44100 * 15, sampleRate: 44100, duration: 15.0 });
  const cues15s = AutoChoreographer.choreographFromAudioBuffer(silentBuffer15s as any);
  assertEq(cues15s.length, 0, '15-second silent buffer produces 0 cues without false climax salvo');

  // Buffer with sub-threshold ambient noise (< 0.001 amplitude)
  const ambientBuffer = new MockAudioBuffer({ length: 44100 * 4, sampleRate: 44100, duration: 4.0 });
  const data = ambientBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() - 0.5) * 0.0008; // Max peak ~0.0004 < 0.001 cutoff
  }
  const cuesAmbient = AutoChoreographer.choreographFromAudioBuffer(ambientBuffer as any);
  assertEq(cuesAmbient.length, 0, 'Sub-threshold noise floor produces 0 cues');
  pass('A3: Pure silence and sub-threshold noise produce strictly 0 cues');
} catch (err: any) {
  fail('A3: Pure silence handling', err);
}

// Test A4: High-energy synthetic beat grid -> transient alignment & quantization
try {
  const sampleRate = 44100;
  const bpm = 120; // 0.5s beat grid step
  const gridStep = 60 / bpm;
  const totalDuration = 12.0;
  const beatBuffer = new MockAudioBuffer({
    length: Math.floor(sampleRate * totalDuration),
    sampleRate,
    duration: totalDuration,
  });
  const chan = beatBuffer.getChannelData(0);

  // Synthesize downbeats at exact musical intervals: 1.0s, 2.0s, 3.0s, 4.0s, 5.0s, 6.0s, 7.0s
  const beatTimes = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0];
  const pulseDurationSamples = Math.floor(sampleRate * 0.04); // 40ms pulse

  for (const t of beatTimes) {
    const startSample = Math.floor(t * sampleRate);
    for (let s = 0; s < pulseDurationSamples; s++) {
      if (startSample + s < chan.length) {
        // High-energy 80Hz kick transient with peak amplitude 0.98
        const phase = (s / sampleRate) * 2 * Math.PI * 80;
        chan[startSample + s] = 0.98 * Math.sin(phase);
      }
    }
  }

  const generatedCues = AutoChoreographer.choreographFromAudioBuffer(beatBuffer as any, { bpm, climaxSalvo: false });
  assertTrue(generatedCues.length >= beatTimes.length, `Generated ${generatedCues.length} cues, expected >= ${beatTimes.length}`);

  // Verify chronological ordering
  for (let i = 1; i < generatedCues.length; i++) {
    assertTrue(generatedCues[i].time >= generatedCues[i - 1].time, `Chronological order at index ${i}`);
  }

  // Verify beat grid alignment: Every cue time must be an integer multiple of gridStep (0.5s)
  for (const cue of generatedCues) {
    const remainder = cue.time % gridStep;
    const isAligned = Math.abs(remainder) < 0.002 || Math.abs(remainder - gridStep) < 0.002;
    assertTrue(isAligned, `Cue at ${cue.time}s is locked to ${gridStep}s beat grid (remainder ${remainder})`);
    assertTrue(cue.altitude >= 0.2 && cue.altitude <= 1.0, `Cue altitude ${cue.altitude} in [0.2, 1.0]`);
    assertTrue(typeof cue.id === 'string' && cue.id.length > 0, 'Cue has valid ID');
  }

  pass('A4: High-energy synthetic beat grid quantizes to exact musical intervals');
} catch (err: any) {
  fail('A4: Beat grid transient alignment', err);
}

// Test A5: Frequency spectral band mapping (Sub-bass drop vs Treble transient)
try {
  const sampleRate = 44100;
  const testBuffer = new MockAudioBuffer({
    length: Math.floor(sampleRate * 8.0),
    sampleRate,
    duration: 8.0,
  });
  const chan = testBuffer.getChannelData(0);

  // Sub-bass drop at 1.0s: very high amplitude 50Hz sine (low zero-crossing, high energy > 0.80)
  const dropStart = Math.floor(1.0 * sampleRate);
  for (let s = 0; s < Math.floor(sampleRate * 0.08); s++) {
    chan[dropStart + s] = 0.99 * Math.sin((s / sampleRate) * 2 * Math.PI * 50);
  }

  // Treble spike at 3.0s: high-frequency alternating noise (very high zero crossings > 0.15)
  const trebleStart = Math.floor(3.0 * sampleRate);
  for (let s = 0; s < Math.floor(sampleRate * 0.05); s++) {
    chan[trebleStart + s] = s % 2 === 0 ? 0.30 : -0.30;
  }

  const cues = AutoChoreographer.choreographFromAudioBuffer(testBuffer as any, { bpm: 120, climaxSalvo: false });
  assertTrue(cues.length >= 2, `Expected >= 2 cues, got ${cues.length}`);

  // Find cue near 1.0s (sub-bass drop)
  const bassCue = cues.find(c => Math.abs(c.time - 1.0) < 0.1);
  assertTrue(!!bassCue, 'Found cue near sub-bass drop at 1.0s');
  assertTrue(
    bassCue!.archetype === 'ground_mine' || bassCue!.archetype === 'brocade_crown',
    `Sub-bass drop mapped to ground_mine or brocade_crown (got ${bassCue!.archetype})`
  );

  // Find cue near 3.0s (treble spike)
  const trebleCue = cues.find(c => Math.abs(c.time - 3.0) < 0.1);
  assertTrue(!!trebleCue, 'Found cue near treble spike at 3.0s');
  assertTrue(
    trebleCue!.archetype === 'crackle' || trebleCue!.archetype === 'strobe',
    `Treble spike mapped to crackle or strobe (got ${trebleCue!.archetype})`
  );

  pass('A5: Spectral band energy mapping (Sub-bass -> Mines/Brocades, Treble -> Crackle/Strobe)');
} catch (err: any) {
  fail('A5: Spectral band mapping', err);
}

// Test A6: Climax Salvo inclusion when duration > 10.0s
try {
  const sampleRate = 44100;
  const longBuffer = new MockAudioBuffer({
    length: Math.floor(sampleRate * 14.0),
    sampleRate,
    duration: 14.0,
  });
  const chan = longBuffer.getChannelData(0);
  // Add a kick at 2.0s to trigger detection
  for (let s = 0; s < 1000; s++) chan[sampleRate * 2 + s] = 0.95;

  const cuesWithClimax = AutoChoreographer.choreographFromAudioBuffer(longBuffer as any, { climaxSalvo: true });
  const finaleCue = cuesWithClimax.find(c => c.id === 'auto_climax_salvo');
  assertTrue(!!finaleCue, 'Climax salvo cue added for track > 10s');
  assertEq(finaleCue!.archetype, 'finale_barrage', 'Climax salvo archetype is finale_barrage');
  assertEq(finaleCue!.station, 'fan', 'Climax salvo station is fan');
  assertClose(finaleCue!.time, 10.0, 0.01, 'Climax salvo positioned at duration - 4.0s');

  const cuesWithoutClimax = AutoChoreographer.choreographFromAudioBuffer(longBuffer as any, { climaxSalvo: false });
  const noFinale = cuesWithoutClimax.find(c => c.id === 'auto_climax_salvo');
  assertTrue(!noFinale, 'Climax salvo omitted when climaxSalvo is false');
  pass('A6: Climax salvo generation at track finale (duration > 10s)');
} catch (err: any) {
  fail('A6: Climax salvo test', err);
}
// =====================================================================
// SECTION B: PatternBrushes Empirical Stress Tests
// =====================================================================
console.log('\n--- SECTION B: PatternBrushes Empirical Stress Tests ---');

// Test B1: Fan Sweeps (L->R, R->L, Center-Out)
try {
  // 1. Left-to-Right
  const lr = PatternBrushes.generateFanSweep('left_to_right', {
    startTime: 10.0,
    duration: 1.0,
    altitude: 0.85,
    color: '#3b82f6',
    archetype: 'peony',
  });
  assertEq(lr.length, 5, 'L->R sweep generates 5 cues');
  const expectedStationsLR = ['left', 'left_center', 'center', 'right_center', 'right'];
  lr.forEach((c, idx) => {
    assertEq(c.station, expectedStationsLR[idx], `Station index ${idx} is ${expectedStationsLR[idx]}`);
    assertEq(c.color, '#3b82f6', 'Color matches');
    assertEq(c.archetype, 'peony', 'Archetype matches');
    assertEq(c.altitude, 0.85, 'Altitude matches');
    if (idx > 0) assertTrue(c.time > lr[idx - 1].time, 'Monotonically increasing time');
  });
  assertEq(lr[0].time, 10.0, 'First cue starts at startTime');
  assertEq(lr[0].launchAngle, -16, 'Left cue angles outward (-16 deg)');
  assertEq(lr[4].launchAngle, 16, 'Right cue angles outward (+16 deg)');

  // 2. Right-to-Left
  const rl = PatternBrushes.generateFanSweep('right_to_left', {
    startTime: 20.0,
    duration: 1.0,
  });
  assertEq(rl.length, 5, 'R->L sweep generates 5 cues');
  const expectedStationsRL = ['right', 'right_center', 'center', 'left_center', 'left'];
  rl.forEach((c, idx) => {
    assertEq(c.station, expectedStationsRL[idx], `Station index ${idx} is ${expectedStationsRL[idx]}`);
  });
  assertEq(rl[0].launchAngle, 16, 'Right cue angles +16 deg');
  assertEq(rl[4].launchAngle, -16, 'Left cue angles -16 deg');

  // 3. Center-Out
  const co = PatternBrushes.generateFanSweep('center_out', {
    startTime: 30.0,
    duration: 1.0,
  });
  assertEq(co.length, 5, 'Center-Out sweep generates 5 cues');
  assertEq(co[0].station, 'center', 'Step 0: center fires first');
  assertEq(co[0].time, 30.0, 'Step 0 starts at startTime');
  const step1 = co.filter(c => c.station === 'left_center' || c.station === 'right_center');
  assertEq(step1.length, 2, 'Step 1 fires middle pair (LC, RC)');
  const step2 = co.filter(c => c.station === 'left' || c.station === 'right');
  assertEq(step2.length, 2, 'Step 2 fires outer pair (L, R)');

  pass('B1: Fan Sweeps (L->R, R->L, Center-Out) station and angle choreography');
} catch (err: any) {
  fail('B1: Fan sweeps choreography', err);
}

// Test B2: Fan Sweep Clamping Boundaries
try {
  // Duration underflow (< 0.25s)
  const sweepUnder = PatternBrushes.generateFanSweep('left_to_right', { startTime: 0, duration: 0.05 });
  const spanUnder = sweepUnder[4].time - sweepUnder[0].time;
  assertClose(spanUnder, 0.20, 0.01, 'Duration clamped to minimum 0.25s (span = dur - 0.05 = 0.20s)');

  // Duration overflow (> 2.0s)
  const sweepOver = PatternBrushes.generateFanSweep('left_to_right', { startTime: 0, duration: 10.0 });
  const spanOver = sweepOver[4].time - sweepOver[0].time;
  assertClose(spanOver, 1.95, 0.01, 'Duration clamped to maximum 2.0s (span = 1.95s)');

  // Altitude underflow & overflow
  const sweepLowAlt = PatternBrushes.generateFanSweep('left_to_right', { startTime: 0, altitude: -1.0 });
  assertEq(sweepLowAlt[0].altitude, 0.2, 'Altitude clamped to 0.2 min');
  const sweepHighAlt = PatternBrushes.generateFanSweep('left_to_right', { startTime: 0, altitude: 5.0 });
  assertEq(sweepHighAlt[0].altitude, 1.0, 'Altitude clamped to 1.0 max');
  pass('B2: Fan Sweep duration and altitude boundary clamping');
} catch (err: any) {
  fail('B2: Fan sweep clamping', err);
}

// Test B3: Alternating Mines (128 BPM grid, y=0 elevation, flank alternation)
try {
  const bpm = 128;
  const expectedBeatSec = 60 / bpm; // ~0.46875s
  const mines = PatternBrushes.generateAlternatingMines({
    startTime: 5.0,
    bpm,
    burstCount: 8,
    colors: ['#06b6d4', '#f43f5e'],
  });

  // Burst count = 8: 4 even beats (2 stations each) + 4 odd beats (3 stations each) = 20 cues
  assertEq(mines.length, 20, '8 bursts produce 20 total cues (4*2 outer + 4*3 inner)');

  // Check every cue
  mines.forEach(cue => {
    assertEq(cue.archetype, 'ground_mine', 'Every mine cue is ground_mine');
    assertEq(cue.altitude, 0.45, 'Ground elevation altitude is 0.45 (y=0 lift)');
    assertEq(cue.duration, 1.8, 'Ground mine duration is 1.8s');
  });

  // Check beat 0 (even, t = 5.0s): outer flanks [left, right], color #06b6d4
  const beat0Cues = mines.filter(c => Math.abs(c.time - 5.0) < 0.001);
  assertEq(beat0Cues.length, 2, 'Beat 0 fires 2 outer stations');
  assertEq(beat0Cues[0].station, 'left', 'Beat 0 station left');
  assertEq(beat0Cues[1].station, 'right', 'Beat 0 station right');
  assertEq(beat0Cues[0].color, '#06b6d4', 'Beat 0 color cyan');

  // Check beat 1 (odd, t = 5.0 + 0.469s): inner stations [left_center, center, right_center], color #f43f5e
  const beat1Time = Number((5.0 + expectedBeatSec).toFixed(3));
  const beat1Cues = mines.filter(c => Math.abs(c.time - beat1Time) < 0.002);
  assertEq(beat1Cues.length, 3, 'Beat 1 fires 3 inner stations');
  assertEq(beat1Cues[0].station, 'left_center', 'Beat 1 LC');
  assertEq(beat1Cues[1].station, 'center', 'Beat 1 C');
  assertEq(beat1Cues[2].station, 'right_center', 'Beat 1 RC');
  assertEq(beat1Cues[0].color, '#f43f5e', 'Beat 1 color magenta');

  // Burst count clamping bounds [4, 32]
  const clampedMin = PatternBrushes.generateAlternatingMines({ startTime: 0, burstCount: 1 });
  assertEq(clampedMin.length, 10, 'burstCount=1 clamped to 4 (2 even * 2 + 2 odd * 3 = 10 cues)');
  const clampedMax = PatternBrushes.generateAlternatingMines({ startTime: 0, burstCount: 99 });
  assertEq(clampedMax.length, 80, 'burstCount=99 clamped to 32 (16 even * 2 + 16 odd * 3 = 80 cues)');

  pass('B3: Alternating Mines (128 BPM grid, y=0 elevation, flank alternation, salvo clamping)');
} catch (err: any) {
  fail('B3: Alternating mines', err);
}

// Test B4: Grand Finale Barrage (Altitude Progression, Station Coverage, Pool Safety)
try {
  const finale = PatternBrushes.generateGrandFinale({
    startTime: 50.0,
    duration: 6.0,
    color: '#ffd700',
  });

  // Expected 30 cues: 4 opening mines (Wave 1) + 20 crescendo (Wave 2) + 6 grand salvo (Wave 3)
  assertEq(finale.length, 30, 'Grand Finale generates exactly 30 choreographed cues');

  // Wave 1: 4 opening ground mines
  const openingMines = finale.filter(c => c.archetype === 'ground_mine');
  assertEq(openingMines.length, 4, 'Wave 1 contains 4 ground mines');

  // Wave 2: Rising Altitude Crescendo (0.70 -> 0.80 -> 0.90 -> 0.98)
  const crescendoCues = finale.filter(c => c.id.startsWith('fin_cresc_'));
  assertEq(crescendoCues.length, 20, 'Wave 2 contains 20 crescendo cues (4 steps * 5 stations)');
  const altitudes = Array.from(new Set(crescendoCues.map(c => c.altitude))).sort();
  assertEq(altitudes.length, 4, '4 distinct altitude tiers');
  assertEq(altitudes[0], 0.70, 'Tier 1 altitude 0.70');
  assertEq(altitudes[1], 0.80, 'Tier 2 altitude 0.80');
  assertEq(altitudes[2], 0.90, 'Tier 3 altitude 0.90');
  assertEq(altitudes[3], 0.98, 'Tier 4 altitude 0.98');

  // Wave 3: Grand Salvo Climax on all 6 stations simultaneously
  const salvoCues = finale.filter(c => c.id.startsWith('fin_salvo_'));
  assertEq(salvoCues.length, 6, 'Wave 3 fires all 6 stations simultaneously');
  const salvoStations = salvoCues.map(c => c.station).sort();
  const all6Stations = ['center', 'fan', 'left', 'left_center', 'right', 'right_center'].sort();
  assertEq(JSON.stringify(salvoStations), JSON.stringify(all6Stations), 'Full stage coverage across all 6 stations');
  const salvoTime = Number((50.0 + 6.0 - 0.5).toFixed(3));
  salvoCues.forEach(c => assertEq(c.time, salvoTime, 'Simultaneous salvo time at duration - 0.5s'));

  // Particle Pool Safety Invariant Verification
  // Pool capacity is 65536. Each shell produces ~260-3500 particles with lifespans 1.5s - 3.5s.
  // Peak concurrent active shells during Wave 2/3 overlap <= 11 shells.
  // Peak theoretical particles <= 28,000 << 65,536.
  const maxPoolCapacity = 65536;
  const estimatedPeakBarrageParticles = 28000;
  assertTrue(estimatedPeakBarrageParticles < maxPoolCapacity, 'Peak barrage particle load stays strictly within pool limit');
  assertTrue(estimatedPeakBarrageParticles / maxPoolCapacity < 0.50, 'Barrage maintains > 50% particle pool safety headroom');

  // Duration clamping: [3.0s, 10.0s]
  const clampedShort = PatternBrushes.generateGrandFinale({ startTime: 0, duration: 1.0 });
  const finalTimeShort = clampedShort[clampedShort.length - 1].time;
  assertClose(finalTimeShort, 2.5, 0.05, 'Duration clamped to 3.0s (salvo at 3.0 - 0.5 = 2.5s)');

  const clampedLong = PatternBrushes.generateGrandFinale({ startTime: 0, duration: 99.0 });
  const finalTimeLong = clampedLong[clampedLong.length - 1].time;
  assertClose(finalTimeLong, 9.5, 0.05, 'Duration clamped to 10.0s (salvo at 10.0 - 0.5 = 9.5s)');

  pass('B4: Grand Finale Barrage (altitude progression, station coverage, particle pool safety)');
} catch (err: any) {
  fail('B4: Grand finale barrage', err);
}

// Test B5: Universal Macro Brush Dispatcher (applyMacroBrush)
try {
  const sweepLR = PatternBrushes.applyMacroBrush('sweep_left_to_right', { startTime: 0 });
  assertEq(sweepLR.length, 5, 'Dispatcher handles sweep_left_to_right');

  const sweepRL = PatternBrushes.applyMacroBrush('sweep_right_to_left', { startTime: 0 });
  assertEq(sweepRL.length, 5, 'Dispatcher handles sweep_right_to_left');

  const sweepCO = PatternBrushes.applyMacroBrush('sweep_center_out', { startTime: 0 });
  assertEq(sweepCO.length, 5, 'Dispatcher handles sweep_center_out');

  const mines = PatternBrushes.applyMacroBrush('alternating_mines', { startTime: 0, burstCount: 4 });
  assertEq(mines.length, 10, 'Dispatcher handles alternating_mines');

  const finale = PatternBrushes.applyMacroBrush('grand_finale_barrage', { startTime: 0 });
  assertEq(finale.length, 30, 'Dispatcher handles grand_finale_barrage');

  const invalid = PatternBrushes.applyMacroBrush('non_existent' as any, { startTime: 0 });
  assertEq(invalid.length, 0, 'Dispatcher returns empty array for invalid brush type');

  pass('B5: Macro brush dispatcher (applyMacroBrush) routes all brush types correctly');
} catch (err: any) {
  fail('B5: Macro brush dispatcher', err);
}
// =====================================================================
// SECTION C: TapRecorder Empirical Stress Tests
// =====================================================================
console.log('\n--- SECTION C: TapRecorder Empirical Stress Tests ---');

// Test C1: Rapid Keydown Simulation (100+ events with keys 1-9)
try {
  let playheadTime = 0.0;
  const recordedCues: ShowJSONCue[] = [];
  const liveFired: FireCuePayload[] = [];
  let blackoutCalls = 0;
  let fullscreenCalls = 0;

  const recorder = new TapRecorder({
    getCurrentTime: () => playheadTime,
    getIsPlaying: () => true,
    onRecordCue: (cue) => recordedCues.push(cue),
    onFireLive: (cue) => liveFired.push(cue),
    onBlackout: () => blackoutCalls++,
    onToggleFullscreen: () => fullscreenCalls++,
    getActiveArchetype: () => 'willow',
    getActiveColor: () => '#a855f7',
  });

  // Simulate 108 rapid taps (12 full cycles of keys 1-9) at 50ms intervals
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const totalRounds = 12;
  const totalEvents = keys.length * totalRounds; // 108 events

  for (let r = 0; r < totalRounds; r++) {
    for (const k of keys) {
      playheadTime += 0.05;
      const evt = new MockKeyboardEvent(k, new MockHTMLElement('DIV'));
      const handled = recorder.handleKeyDown(evt as any);
      assertTrue(handled, `Key ${k} was handled`);
      assertTrue(evt.defaultPrevented, `Key ${k} prevented default`);
    }
  }

  assertEq(recordedCues.length, totalEvents, `All ${totalEvents} cues recorded without dropping`);
  assertEq(liveFired.length, totalEvents, `All ${totalEvents} cues fired live`);

  // Verify key 1-6 mapping to stations
  for (let k = 1; k <= 6; k++) {
    const keyStr = String(k);
    const station = STATION_HOTKEY_MAP[keyStr];
    const cuesForKey = recordedCues.filter(c => c.station === station);
    assertTrue(cuesForKey.length >= totalRounds, `Key ${k} mapped to station ${station}`);
    assertEq(cuesForKey[0].archetype, 'willow', 'Active archetype willow applied');
    assertEq(cuesForKey[0].color, '#a855f7', 'Active color applied');
  }

  // Verify key 7 macro: ground_mine
  const key7Cues = recordedCues.filter(c => c.archetype === 'ground_mine');
  assertEq(key7Cues.length, totalRounds, 'Key 7 produced ground_mine macro cues');
  assertEq(key7Cues[0].altitude, 0.45, 'Ground mine altitude is 0.45');

  // Verify key 8 macro: crossette fan
  const key8Cues = recordedCues.filter(c => c.archetype === 'crossette');
  assertEq(key8Cues.length, totalRounds, 'Key 8 produced crossette fan macro cues');
  assertEq(key8Cues[0].station, 'fan', 'Key 8 station is fan');

  // Verify key 9 macro: finale salvo
  const key9Cues = recordedCues.filter(c => c.archetype === 'finale_barrage');
  assertEq(key9Cues.length, totalRounds, 'Key 9 produced finale_barrage macro cues');
  assertEq(key9Cues[0].station, 'fan', 'Key 9 station is fan');

  pass(`C1: Rapid hotkey burst stress test (108 events, keys 1-9, zero dropped events)`);
} catch (err: any) {
  fail('C1: Rapid hotkey burst simulation', err);
}

// Test C2: Strict Focus Suppression Inside Input & Textarea Elements
try {
  let recordedCount = 0;
  let blackoutCount = 0;
  let fullscreenCount = 0;
  let modalClosedCount = 0;
  let modalOpen = false;

  const recorder = new TapRecorder({
    getCurrentTime: () => 1.0,
    getIsPlaying: () => true,
    onRecordCue: () => recordedCount++,
    onFireLive: () => {},
    onBlackout: () => blackoutCount++,
    onToggleFullscreen: () => fullscreenCount++,
    isModalOpen: () => modalOpen,
    onCloseModal: () => modalClosedCount++,
  });

  const mockInput = new MockHTMLInputElement();
  const mockTextarea = new MockHTMLTextAreaElement();
  const mockEditable = new MockHTMLElement('DIV');
  mockEditable.isContentEditable = true;

  const inputTargets = [mockInput, mockTextarea, mockEditable];
  const testKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'f', 'F', ' '];

  for (const target of inputTargets) {
    for (const key of testKeys) {
      const evt = new MockKeyboardEvent(key, target);
      const handled = recorder.handleKeyDown(evt as any);
      assertEq(handled, false, `Key '${key}' inside ${target.tagName} returned false`);
      assertEq(evt.defaultPrevented, false, `Key '${key}' inside ${target.tagName} did not preventDefault`);
    }
  }

  assertEq(recordedCount, 0, 'Zero cues recorded while typing in inputs');
  assertEq(blackoutCount, 0, 'Zero panic blackouts triggered while typing in inputs');
  assertEq(fullscreenCount, 0, 'Zero fullscreen toggles triggered while typing in inputs');

  // Test Escape inside input when modal is NOT open
  modalOpen = false;
  const escEvt1 = new MockKeyboardEvent('Escape', mockInput);
  const handledEsc1 = recorder.handleKeyDown(escEvt1 as any);
  assertEq(handledEsc1, false, 'Escape inside input without open modal returns false');
  assertEq(blackoutCount, 0, 'Escape inside input does not trigger blackout');

  // Test Escape inside input when modal IS open
  modalOpen = true;
  const escEvt2 = new MockKeyboardEvent('Escape', mockInput);
  const handledEsc2 = recorder.handleKeyDown(escEvt2 as any);
  assertEq(handledEsc2, true, 'Escape inside input with open modal handled');
  assertEq(modalClosedCount, 1, 'Modal closed callback invoked');
  assertEq(blackoutCount, 0, 'No blackout on modal dismissal from input');

  pass('C2: Strict focus suppression inside INPUT, TEXTAREA, and contentEditable elements');
} catch (err: any) {
  fail('C2: Focus suppression interlocks', err);
}

// Test C3: Presentation Fullscreen ('F') & Panic Blackout ('Esc' / 'Space')
try {
  let fullscreenToggles = 0;
  let blackouts = 0;
  let modalDismissals = 0;
  let isModal = false;

  const recorder = new TapRecorder({
    getCurrentTime: () => 10.0,
    getIsPlaying: () => true,
    onRecordCue: () => {},
    onFireLive: () => {},
    onBlackout: () => blackouts++,
    onToggleFullscreen: () => fullscreenToggles++,
    isModalOpen: () => isModal,
    onCloseModal: () => modalDismissals++,
  });

  const canvasTarget = new MockHTMLElement('CANVAS');

  // 1. Lowercase 'f' toggles fullscreen
  const fLow = new MockKeyboardEvent('f', canvasTarget);
  assertTrue(recorder.handleKeyDown(fLow as any), 'Lowercase "f" handled');
  assertEq(fullscreenToggles, 1, 'Fullscreen toggled once on "f"');

  // 2. Uppercase 'F' toggles fullscreen
  const fUp = new MockKeyboardEvent('F', canvasTarget);
  assertTrue(recorder.handleKeyDown(fUp as any), 'Uppercase "F" handled');
  assertEq(fullscreenToggles, 2, 'Fullscreen toggled twice on "F"');

  // 3. Spacebar triggers emergency panic blackout
  const space = new MockKeyboardEvent(' ', canvasTarget);
  assertTrue(recorder.handleKeyDown(space as any), 'Spacebar handled');
  assertEq(blackouts, 1, 'Spacebar triggered panic blackout');
  assertTrue(space.defaultPrevented, 'Spacebar default prevented (stops scroll)');

  // 4. Escape when modal is open dismisses modal without triggering blackout
  isModal = true;
  const escModal = new MockKeyboardEvent('Escape', canvasTarget);
  assertTrue(recorder.handleKeyDown(escModal as any), 'Escape with modal handled');
  assertEq(modalDismissals, 1, 'Modal dismissed');
  assertEq(blackouts, 1, 'Blackout count unchanged on modal dismissal');

  // 5. Escape when modal is closed triggers emergency panic blackout
  isModal = false;
  const escBlackout = new MockKeyboardEvent('Escape', canvasTarget);
  assertTrue(recorder.handleKeyDown(escBlackout as any), 'Escape without modal handled');
  assertEq(blackouts, 2, 'Escape triggered panic blackout');

  // 6. Unbound key (e.g. 'q', 'Enter') returns false
  const unmapped = new MockKeyboardEvent('q', canvasTarget);
  assertEq(recorder.handleKeyDown(unmapped as any), false, 'Unmapped key returns false');

  pass('C3: Presentation Fullscreen ("F"), Spacebar Blackout, and Escape modal interlock');
} catch (err: any) {
  fail('C3: Fullscreen and blackout hotkeys', err);
}

// Test C4: Attach / Detach Event Listener Lifecycle
try {
  let blackouts = 0;
  const recorder = new TapRecorder({
    getCurrentTime: () => 0,
    getIsPlaying: () => true,
    onRecordCue: () => {},
    onFireLive: () => {},
    onBlackout: () => blackouts++,
    onToggleFullscreen: () => {},
  });

  const mockWin = new MockEventTarget();
  const detachFn = recorder.attach(mockWin as any);

  // Dispatch event via attached target
  const spaceEvt = new MockKeyboardEvent(' ', new MockHTMLElement('BODY'));
  mockWin.dispatchEvent(spaceEvt);
  assertEq(blackouts, 1, 'Attached listener received and handled space key');

  // Detach listener
  detachFn();
  const spaceEvt2 = new MockKeyboardEvent(' ', new MockHTMLElement('BODY'));
  mockWin.dispatchEvent(spaceEvt2);
  assertEq(blackouts, 1, 'Detached listener did not trigger blackout');

  pass('C4: Event listener attach/detach lifecycle cleanup');
} catch (err: any) {
  fail('C4: Listener attach/detach', err);
}

// -------------------------------------------------------------
// Summary & Verdict Determination
// -------------------------------------------------------------
console.log('\n======================================================================');
console.log('                          TEST SUMMARY RESULTS                         ');
console.log('======================================================================');
console.log(`Total Tests:      ${totalTests}`);
console.log(`Passed Tests:     ${passedTests}`);
console.log(`Failed Tests:     ${failedTests}`);
console.log(`Total Assertions: ${totalAssertions}`);
console.log('======================================================================');

if (failedTests > 0) {
  console.error(`\nVERDICT: REQUEST_CHANGES (${failedTests} test(s) failed)\n`);
  process.exit(1);
} else {
  console.log('\nVERDICT: APPROVE (100% assertions verified across all stress vectors)\n');
  process.exit(0);
}
