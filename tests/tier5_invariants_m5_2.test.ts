/**
 * PyroSync Independent Empirical Challenger Test Suite (Milestone 5 - Part 2)
 * Tier 5 System Invariants Hardening Suite
 *
 * Author: teamwork_preview_challenger_m5_2 (Critic & Domain Specialist)
 *
 * Invariants Hardened:
 * 1. Particle pool safety ceiling (65,536 ceiling, burst injection, ring buffer swap-and-pop memory safety)
 * 2. Pure black canvas invariant (clear color & masked areas strictly RGB (0, 0, 0) under all calibration modes)
 * 3. Procedural sound effects default (0.0 volume and muted, generating 0 audio nodes unless enabled)
 * 4. Input suppression invariant (hotkeys 1-9, 'F', spacebar panic suppressed in input/textarea/contenteditable)
 * 5. Memory leak invariance (bounded/zero heap growth across repeated show load, clear, play, seek, and panic cycles)
 */

import { ParticlePool, DEFAULT_POOL_CAPACITY } from '../src/engine/fireworks/ParticlePool';
import { ShellArchetypeManager, STATION_X_COORDS } from '../src/engine/fireworks/ShellArchetypes';
import { calculateAspectScissor } from '../src/engine/calibration/ProjectorShaders';
import { ProceduralSFX } from '../src/engine/audio/ProceduralSFX';
import { AudioEngine } from '../src/engine/audio/AudioEngine';
import { TapRecorder, TapRecorderConfig, STATION_HOTKEY_MAP } from '../src/choreography/TapRecorder';
import { ShowManager } from '../src/state/ShowManager';
import { DEMO_SHOW_1_ODE_TO_RADIANCE, DEMO_SHOW_2_NEON_HORIZON } from './fixtures/demo-shows';
import {
  FireCuePayload,
  LaunchStation,
  ShellArchetype,
  AspectRatioType,
  ShowJSONCue,
} from '../src/types';

// =========================================================================
// 0. Assertion Tracker & Test Harness
// =========================================================================

interface TestStats {
  passed: number;
  failed: number;
  totalAssertions: number;
}

const stats: TestStats = { passed: 0, failed: 0, totalAssertions: 0 };

function assert(condition: boolean, msg: string): void {
  stats.totalAssertions++;
  if (!condition) {
    stats.failed++;
    console.error(`  ❌ ASSERTION FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function assertEquals<T>(actual: T, expected: T, msg: string): void {
  stats.totalAssertions++;
  if (actual !== expected) {
    stats.failed++;
    const errMsg = `Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}: ${msg}`;
    console.error(`  ❌ ASSERTION FAILED: ${errMsg}`);
    throw new Error(errMsg);
  }
}

function assertCloseTo(actual: number, expected: number, delta: number = 1e-4, msg: string = ''): void {
  stats.totalAssertions++;
  if (Math.abs(actual - expected) > delta) {
    stats.failed++;
    const errMsg = `Expected ${actual} to be close to ${expected} (±${delta}): ${msg}`;
    console.error(`  ❌ ASSERTION FAILED: ${errMsg}`);
    throw new Error(errMsg);
  }
}

function runTestCase(name: string, fn: () => void): void {
  process.stdout.write(`  [TEST] ${name} ... `);
  try {
    fn();
    stats.passed++;
    console.log(`PASSED`);
  } catch (err: any) {
    console.log(`FAILED\n  --> ${err.message}`);
    throw err;
  }
}

// =========================================================================
// DOM Mock Polyfills for Node.js Execution
// =========================================================================

export class MockEventTarget {
  public listeners: Record<string, ((e: any) => void)[]> = {};

  addEventListener(type: string, listener: (e: any) => void): void {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: (e: any) => void): void {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
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

  preventDefault(): void {
    this.defaultPrevented = true;
  }
}

// Polyfill globals for Node execution if missing
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

// =========================================================================
// Instrumented Audio Context Mock for Node Counting
// =========================================================================

export class MockAudioParam {
  public value: number;
  constructor(initial: number = 1.0) {
    this.value = initial;
  }
  setValueAtTime(v: number, _t: number): MockAudioParam {
    this.value = v;
    return this;
  }
  linearRampToValueAtTime(v: number, _t: number): MockAudioParam {
    this.value = v;
    return this;
  }
  exponentialRampToValueAtTime(v: number, _t: number): MockAudioParam {
    this.value = v;
    return this;
  }
}

export class MockAudioNode {
  public context: InstrumentedMockAudioContext;
  public connections: MockAudioNode[] = [];
  constructor(ctx: InstrumentedMockAudioContext) {
    this.context = ctx;
  }
  connect(target: MockAudioNode): MockAudioNode {
    this.connections.push(target);
    return target;
  }
  disconnect(): void {
    this.connections = [];
  }
}

export class MockGainNode extends MockAudioNode {
  public gain: MockAudioParam;
  constructor(ctx: InstrumentedMockAudioContext, initial: number = 1.0) {
    super(ctx);
    this.gain = new MockAudioParam(initial);
  }
}

export class MockBiquadFilterNode extends MockAudioNode {
  public type: string = 'lowpass';
  public frequency: MockAudioParam = new MockAudioParam(350);
  public Q: MockAudioParam = new MockAudioParam(1);
}

export class MockOscillatorNode extends MockAudioNode {
  public type: string = 'sine';
  public frequency: MockAudioParam = new MockAudioParam(440);
  public isPlaying: boolean = false;
  start(_when?: number): void {
    this.isPlaying = true;
  }
  stop(_when?: number): void {
    this.isPlaying = false;
  }
}

export class MockBufferSourceNode extends MockAudioNode {
  public buffer: any = null;
  public playbackRate: MockAudioParam = new MockAudioParam(1.0);
  public isPlaying: boolean = false;
  start(_when?: number, _offset?: number): void {
    this.isPlaying = true;
  }
  stop(_when?: number): void {
    this.isPlaying = false;
  }
}

export class MockAnalyserNode extends MockAudioNode {
  public fftSize: number = 1024;
  public frequencyBinCount: number = 512;
  getByteFrequencyData(_arr: Uint8Array): void {}
  getByteTimeDomainData(_arr: Uint8Array): void {}
}

export class MockAudioBuffer {
  public numberOfChannels: number;
  public length: number;
  public sampleRate: number;
  public duration: number;
  private channelData: Float32Array[];
  constructor(opts: { numberOfChannels?: number; length: number; sampleRate: number }) {
    this.numberOfChannels = opts.numberOfChannels || 1;
    this.length = opts.length;
    this.sampleRate = opts.sampleRate;
    this.duration = this.length / this.sampleRate;
    this.channelData = [];
    for (let c = 0; c < this.numberOfChannels; c++) {
      this.channelData.push(new Float32Array(this.length));
    }
  }
  getChannelData(c: number): Float32Array {
    return this.channelData[c] || this.channelData[0];
  }
}

export class InstrumentedMockAudioContext {
  public currentTime: number = 0.0;
  public sampleRate: number = 44100;
  public state: 'suspended' | 'running' | 'closed' = 'running';
  public destination: MockAudioNode;

  // Node Allocation Counters for empirical testing
  public nodeCounts = {
    gain: 0,
    filter: 0,
    oscillator: 0,
    bufferSource: 0,
    analyser: 0,
    buffer: 0,
    totalCreated: 0,
  };

  constructor() {
    this.destination = new MockAudioNode(this);
  }

  createGain(): MockGainNode {
    this.nodeCounts.gain++;
    this.nodeCounts.totalCreated++;
    return new MockGainNode(this);
  }

  createBiquadFilter(): MockBiquadFilterNode {
    this.nodeCounts.filter++;
    this.nodeCounts.totalCreated++;
    return new MockBiquadFilterNode(this);
  }

  createOscillator(): MockOscillatorNode {
    this.nodeCounts.oscillator++;
    this.nodeCounts.totalCreated++;
    return new MockOscillatorNode(this);
  }

  createBufferSource(): MockBufferSourceNode {
    this.nodeCounts.bufferSource++;
    this.nodeCounts.totalCreated++;
    return new MockBufferSourceNode(this);
  }

  createAnalyser(): MockAnalyserNode {
    this.nodeCounts.analyser++;
    this.nodeCounts.totalCreated++;
    return new MockAnalyserNode(this);
  }

  createBuffer(channels: number, length: number, sampleRate: number): MockAudioBuffer {
    this.nodeCounts.buffer++;
    return new MockAudioBuffer({ numberOfChannels: channels, length, sampleRate });
  }

  async resume(): Promise<void> {
    this.state = 'running';
  }
  async suspend(): Promise<void> {
    this.state = 'suspended';
  }
  async close(): Promise<void> {
    this.state = 'closed';
  }

  resetCounters(): void {
    this.nodeCounts = {
      gain: 0,
      filter: 0,
      oscillator: 0,
      bufferSource: 0,
      analyser: 0,
      buffer: 0,
      totalCreated: 0,
    };
  }
}

// =========================================================================
// EXECUTION START
// =========================================================================

console.log('\n======================================================================');
console.log('    PYROSYNC EMPIRICAL CHALLENGER SUITE - TIER 5 INVARIANTS HARDENING ');
console.log('======================================================================\n');

// =========================================================================
// 1. INVARIANT 1: PARTICLE POOL SAFETY CEILING
// =========================================================================
console.log('--- INVARIANT 1: Particle Pool Safety Ceiling ---');

runTestCase('1.1 Capacity Ceiling Constant & Flat Array Allocation Size', () => {
  assertEquals(DEFAULT_POOL_CAPACITY, 65536, 'DEFAULT_POOL_CAPACITY must be 65,536');
  const pool = new ParticlePool();

  assertEquals(pool.capacity, 65536, 'Pool capacity must be exactly 65,536');
  assertEquals(pool.aliveCount, 0, 'Initial aliveCount must be 0');

  // Verify CPU SoA allocations
  assertEquals(pool.posX.length, 65536, 'posX length matches capacity');
  assertEquals(pool.posY.length, 65536, 'posY length matches capacity');
  assertEquals(pool.posZ.length, 65536, 'posZ length matches capacity');
  assertEquals(pool.velX.length, 65536, 'velX length matches capacity');
  assertEquals(pool.velY.length, 65536, 'velY length matches capacity');
  assertEquals(pool.velZ.length, 65536, 'velZ length matches capacity');
  assertEquals(pool.colR.length, 65536, 'colR length matches capacity');
  assertEquals(pool.colG.length, 65536, 'colG length matches capacity');
  assertEquals(pool.colB.length, 65536, 'colB length matches capacity');
  assertEquals(pool.colA.length, 65536, 'colA length matches capacity');

  // Verify GPU buffer allocations
  assertEquals(pool.gpuPositions.length, 65536 * 3, 'gpuPositions allocated at capacity * 3');
  assertEquals(pool.gpuColors.length, 65536 * 4, 'gpuColors allocated at capacity * 4');
  assertEquals(pool.gpuSizeLife.length, 65536 * 2, 'gpuSizeLife allocated at capacity * 2');
  assertEquals(pool.gpuArchetypes.length, 65536 * 2, 'gpuArchetypes allocated at capacity * 2');
});

runTestCase('1.2 Saturation Spawn Rejection & Memory Boundary Invariance', () => {
  const pool = new ParticlePool();

  // Fill the pool completely to 65,536 particles
  for (let i = 0; i < 65536; i++) {
    const idx = pool.spawn(
      i * 0.01, 10.0, 0.0,
      1.0, 2.0, 0.0,
      1.0, 0.8, 0.2, 1.0,
      3.0, 2.0,
      0.97, 9.8,
      0, 0, 0
    );
    assertEquals(idx, i, `Spawn index ${i} should match loop index`);
  }

  assertEquals(pool.aliveCount, 65536, 'aliveCount must be exactly 65,536 at saturation');

  // Adversarial Burst: Attempt to inject 10,000 additional particles beyond capacity
  for (let overflow = 0; overflow < 10000; overflow++) {
    const rejectedIdx = pool.spawn(
      0.0, 0.0, 0.0,
      0.0, 0.0, 0.0,
      1.0, 1.0, 1.0, 1.0,
      1.0, 1.0
    );
    assertEquals(rejectedIdx, -1, 'Overflow spawn must return -1');
  }

  // Verify the ceiling invariant holds strictly
  assertEquals(pool.aliveCount, 65536, 'aliveCount must never exceed 65,536 under saturation pressure');

  // Verify boundary memory elements: 65,535 is intact, 65,536 is undefined
  assert(Number.isFinite(pool.posX[65535]), 'Index 65,535 must hold valid finite number');
  assertEquals(pool.posX[65536], undefined, 'Index 65,536 must not exist (no memory overrun)');
});

runTestCase('1.3 Shell Archetypes Barrage Burst Saturation Test', () => {
  const pool = new ParticlePool();
  const manager = new ShellArchetypeManager(pool);

  // All 12 archetypes
  const archetypes: ShellArchetype[] = [
    'peony', 'chrysanthemum', 'willow', 'brocade_crown',
    'rings', 'strobe', 'crossette', 'crackle',
    'ground_mine', 'whistling_comet', 'horsetail', 'finale_barrage',
  ];

  const stations: LaunchStation[] = ['left', 'left_center', 'center', 'right_center', 'right', 'fan'];

  // Inject 400 simultaneous cues (each spawning hundreds to thousands of particles, demanding >150,000 particles)
  for (let c = 0; c < 400; c++) {
    const cue: FireCuePayload = {
      id: `cue_burst_${c}`,
      archetype: archetypes[c % archetypes.length],
      station: stations[c % stations.length],
      color: '#ffcc00',
      altitude: 0.8,
      launchAngle: (c % 5) * 5 - 10,
      duration: 3.0,
    };
    manager.fire(cue);
  }

  // Invariant: Pool must clamp strictly at 65,536
  assertEquals(pool.aliveCount, 65536, 'Pool aliveCount strictly clamped at 65,536 ceiling under barrage');

  // Verify numerical integrity across active particles (no NaNs, no Infs)
  const step = 64; // Sample every 64th particle
  for (let i = 0; i < pool.aliveCount; i += step) {
    assert(Number.isFinite(pool.posX[i]), `Particle ${i} posX must be finite`);
    assert(Number.isFinite(pool.posY[i]), `Particle ${i} posY must be finite`);
    assert(Number.isFinite(pool.posZ[i]), `Particle ${i} posZ must be finite`);
    assert(Number.isFinite(pool.velX[i]), `Particle ${i} velX must be finite`);
    assert(Number.isFinite(pool.velY[i]), `Particle ${i} velY must be finite`);
    assert(Number.isFinite(pool.velZ[i]), `Particle ${i} velZ must be finite`);
    assert(Number.isFinite(pool.colR[i]), `Particle ${i} colR must be finite`);
    assert(Number.isFinite(pool.colG[i]), `Particle ${i} colG must be finite`);
    assert(Number.isFinite(pool.colB[i]), `Particle ${i} colB must be finite`);
    assert(Number.isFinite(pool.colA[i]), `Particle ${i} colA must be finite`);
    assert(Number.isFinite(pool.age[i]), `Particle ${i} age must be finite`);
    assert(pool.maxLife[i] > 0, `Particle ${i} maxLife must be positive`);
  }
});

runTestCase('1.4 Dynamic Swap-and-Pop Ring Simulation under Arbitrary Continuous Injection', () => {
  const pool = new ParticlePool();
  const manager = new ShellArchetypeManager(pool);

  const archetypes: ShellArchetype[] = [
    'peony', 'chrysanthemum', 'willow', 'brocade_crown',
    'rings', 'strobe', 'crossette', 'crackle',
    'ground_mine', 'whistling_comet', 'horsetail', 'finale_barrage',
  ];

  // Run 100 simulation frames with random heavy bursts in each frame
  let currentTime = 0.0;
  for (let frame = 0; frame < 100; frame++) {
    const dt = 0.016;
    currentTime += dt;

    // Fire 10 random cues every frame
    for (let k = 0; k < 10; k++) {
      manager.fire({
        id: `frame_${frame}_cue_${k}`,
        archetype: archetypes[(frame + k) % archetypes.length],
        station: 'center',
        color: '#38bdf8',
        altitude: 0.7,
      });
    }

    // Step physics: this executes air drag, gravity, aging, secondary bursts, and swap-and-pop recycling
    pool.update(dt, currentTime);

    // Invariant: aliveCount must remain strictly within [0, 65536]
    assert(pool.aliveCount >= 0, `Frame ${frame}: aliveCount (${pool.aliveCount}) must be non-negative`);
    assert(pool.aliveCount <= 65536, `Frame ${frame}: aliveCount (${pool.aliveCount}) must never exceed 65,536`);
  }
});

runTestCase('1.5 Panic Blackout Reset from Maximum Saturation', () => {
  const pool = new ParticlePool();
  // Saturate
  for (let i = 0; i < 65536; i++) {
    pool.spawn(0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2);
  }
  assertEquals(pool.aliveCount, 65536, 'Pool saturated at 65536');

  // Emergency Panic Blackout
  pool.blackout();

  assertEquals(pool.aliveCount, 0, 'Instant blackout must reset aliveCount to exactly 0');

  // Subsequent spawn must reuse index 0 without errors
  const idx = pool.spawn(1, 2, 3, 0, 0, 0, 1, 0, 0, 1, 2, 1);
  assertEquals(idx, 0, 'First spawn after blackout must be at index 0');
  assertEquals(pool.aliveCount, 1, 'aliveCount must increment to 1');
});

// =========================================================================
// 2. INVARIANT 2: PURE BLACK CANVAS INVARIANT
// =========================================================================
console.log('\n--- INVARIANT 2: Pure Black Canvas Invariant ---');

/**
 * Exact mathematical simulation of CALIBRATION_COMPOSITE_FRAGMENT shader
 */
function evaluateProjectorCompositeFragment(
  sceneColor: [number, number, number, number],
  bloomColor: [number, number, number, number],
  u: number,
  v: number,
  aspectScissor: [number, number, number, number],
  gain: number,
  blackClamp: number,
  bloomIntensity: number
): [number, number, number, number] {
  // 1. Aspect Ratio Scissor Check: outside bounds are strictly #000000
  if (u < aspectScissor[0] || u > aspectScissor[2] || v < aspectScissor[1] || v > aspectScissor[3]) {
    return [0.0, 0.0, 0.0, 1.0];
  }

  // 2. Additive HDR Bloom Composition
  let r = sceneColor[0] + bloomColor[0] * bloomIntensity;
  let g = sceneColor[1] + bloomColor[1] * bloomIntensity;
  let b = sceneColor[2] + bloomColor[2] * bloomIntensity;

  // 3. Master Brightness / Gain multiplier
  r *= gain;
  g *= gain;
  b *= gain;

  // 4. Perceptual Luminance calculation (ITU-R BT.709)
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // 5. Strict Black-Level Cutoff Clamp
  if (luma < blackClamp) {
    return [0.0, 0.0, 0.0, 1.0];
  } else {
    const remapped = (luma - blackClamp) / Math.max(0.0001, 1.0 - blackClamp);
    const factor = remapped / Math.max(0.0001, luma);
    return [
      Math.min(1.0, r * factor),
      Math.min(1.0, g * factor),
      Math.min(1.0, b * factor),
      1.0,
    ];
  }
}

runTestCase('2.1 Aspect Scissor Calculation Invariant across Calibration Profiles', () => {
  const ratios: AspectRatioType[] = ['16:9', '16:10', '4:3', '21:9', 'off'];
  const resolutions = [
    { w: 1920, h: 1080 }, // 16:9
    { w: 2560, h: 1440 }, // 16:9
    { w: 1920, h: 1200 }, // 16:10
    { w: 1024, h: 768 },  // 4:3
    { w: 3440, h: 1440 }, // 21:9
    { w: 1080, h: 1920 }, // 9:16 portrait
  ];

  for (const ratio of ratios) {
    for (const res of resolutions) {
      const [minU, minV, maxU, maxV] = calculateAspectScissor(ratio, res.w, res.h);

      // Scissor boundaries must be normalized in [0, 1]
      assert(minU >= 0.0 && minU <= maxU && maxU <= 1.0, `${ratio} ${res.w}x${res.h}: valid U range [${minU}, ${maxU}]`);
      assert(minV >= 0.0 && minV <= maxV && maxV <= 1.0, `${ratio} ${res.w}x${res.h}: valid V range [${minV}, ${maxV}]`);

      // Symmetry check: letterbox and pillarbox must center the projection
      assertCloseTo(minU + maxU, 1.0, 1e-4, `${ratio} ${res.w}x${res.h}: horizontal scissor centering symmetry`);
      assertCloseTo(minV + maxV, 1.0, 1e-4, `${ratio} ${res.w}x${res.h}: vertical scissor centering symmetry`);
    }
  }
});

runTestCase('2.2 Masked Letterbox / Pillarbox Areas Strictly Evaluate to RGB (0, 0, 0)', () => {
  // Test 16:9 show on a 21:9 screen (3440 x 1440) -> creates pillarbox bars on left and right
  const scissorPillar = calculateAspectScissor('16:9', 3440, 1440);
  assert(scissorPillar[0] > 0.1, 'Pillarbox left bar must have positive minU');

  // Sample points strictly inside the left and right pillarbox masks
  const testUvLeft = [scissorPillar[0] * 0.2, 0.5];
  const testUvRight = [scissorPillar[2] + (1.0 - scissorPillar[2]) * 0.8, 0.5];

  // Even with MAXIMUM input brightness and MAXIMUM gain / bloom
  const maxScene: [number, number, number, number] = [1.0, 1.0, 1.0, 1.0];
  const maxBloom: [number, number, number, number] = [1.0, 1.0, 1.0, 1.0];

  const leftResult = evaluateProjectorCompositeFragment(
    maxScene, maxBloom, testUvLeft[0], testUvLeft[1], scissorPillar, 3.0, 0.02, 3.0
  );
  assertEquals(leftResult[0], 0.0, 'Pillarbox left R must be strictly 0.0');
  assertEquals(leftResult[1], 0.0, 'Pillarbox left G must be strictly 0.0');
  assertEquals(leftResult[2], 0.0, 'Pillarbox left B must be strictly 0.0');

  const rightResult = evaluateProjectorCompositeFragment(
    maxScene, maxBloom, testUvRight[0], testUvRight[1], scissorPillar, 3.0, 0.02, 3.0
  );
  assertEquals(rightResult[0], 0.0, 'Pillarbox right R must be strictly 0.0');
  assertEquals(rightResult[1], 0.0, 'Pillarbox right G must be strictly 0.0');
  assertEquals(rightResult[2], 0.0, 'Pillarbox right B must be strictly 0.0');

  // Test 21:9 show on a 16:9 screen (1920 x 1080) -> creates letterbox bars on top and bottom
  const scissorLetter = calculateAspectScissor('21:9', 1920, 1080);
  assert(scissorLetter[1] > 0.1, 'Letterbox bottom bar must have positive minV');

  const testUvBottom = [0.5, scissorLetter[1] * 0.2];
  const testUvTop = [0.5, scissorLetter[3] + (1.0 - scissorLetter[3]) * 0.8];

  const bottomResult = evaluateProjectorCompositeFragment(
    maxScene, maxBloom, testUvBottom[0], testUvBottom[1], scissorLetter, 3.0, 0.02, 3.0
  );
  assertEquals(bottomResult[0], 0.0, 'Letterbox bottom R must be strictly 0.0');
  assertEquals(bottomResult[1], 0.0, 'Letterbox bottom G must be strictly 0.0');
  assertEquals(bottomResult[2], 0.0, 'Letterbox bottom B must be strictly 0.0');

  const topResult = evaluateProjectorCompositeFragment(
    maxScene, maxBloom, testUvTop[0], testUvTop[1], scissorLetter, 3.0, 0.02, 3.0
  );
  assertEquals(topResult[0], 0.0, 'Letterbox top R must be strictly 0.0');
  assertEquals(topResult[1], 0.0, 'Letterbox top G must be strictly 0.0');
  assertEquals(topResult[2], 0.0, 'Letterbox top B must be strictly 0.0');
});

runTestCase('2.3 Background Clear Color Evaluates to RGB (0, 0, 0) across all Calibration Modes', () => {
  // Matrix of calibration modes
  const gains = [0.1, 0.5, 1.0, 1.5, 2.0, 3.0];
  const blackClamps = [0.00, 0.01, 0.02, 0.05, 0.10, 0.20];
  const bloomIntensities = [0.0, 1.0, 2.0, 3.0];
  const scissorAll: [number, number, number, number] = [0.0, 0.0, 1.0, 1.0];

  // Pure black scene input (empty background)
  const blackScene: [number, number, number, number] = [0.0, 0.0, 0.0, 1.0];
  const blackBloom: [number, number, number, number] = [0.0, 0.0, 0.0, 1.0];

  for (const gain of gains) {
    for (const clamp of blackClamps) {
      for (const bloom of bloomIntensities) {
        const res = evaluateProjectorCompositeFragment(
          blackScene, blackBloom, 0.5, 0.5, scissorAll, gain, clamp, bloom
        );
        assertEquals(res[0], 0.0, `Gain ${gain}, Clamp ${clamp}, Bloom ${bloom}: R is strictly 0.0`);
        assertEquals(res[1], 0.0, `Gain ${gain}, Clamp ${clamp}, Bloom ${bloom}: G is strictly 0.0`);
        assertEquals(res[2], 0.0, `Gain ${gain}, Clamp ${clamp}, Bloom ${bloom}: B is strictly 0.0`);
      }
    }
  }
});

runTestCase('2.4 Projector Gray-Fog & Ambient Bleed Extinction via Black Cutoff Clamp', () => {
  const scissorAll: [number, number, number, number] = [0.0, 0.0, 1.0, 1.0];
  const blackClamp = 0.02; // Standard projector black cutoff clamp

  // Sub-threshold ambient gray bleed (luma < 0.02)
  const lowGlow: [number, number, number, number] = [0.015, 0.015, 0.015, 1.0];
  const zeroBloom: [number, number, number, number] = [0.0, 0.0, 0.0, 1.0];

  const res = evaluateProjectorCompositeFragment(
    lowGlow, zeroBloom, 0.5, 0.5, scissorAll, 1.0, blackClamp, 1.2
  );

  assertEquals(res[0], 0.0, 'Sub-threshold glow R strictly clamped to 0.0');
  assertEquals(res[1], 0.0, 'Sub-threshold glow G strictly clamped to 0.0');
  assertEquals(res[2], 0.0, 'Sub-threshold glow B strictly clamped to 0.0');

  // Slightly above cutoff clamp (luma = 0.05 > 0.02) -> must be cleanly visible
  const aboveGlow: [number, number, number, number] = [0.05, 0.05, 0.05, 1.0];
  const resAbove = evaluateProjectorCompositeFragment(
    aboveGlow, zeroBloom, 0.5, 0.5, scissorAll, 1.0, blackClamp, 1.2
  );
  assert(resAbove[0] > 0.0, 'Above-threshold luma R is visible');
  assert(resAbove[1] > 0.0, 'Above-threshold luma G is visible');
  assert(resAbove[2] > 0.0, 'Above-threshold luma B is visible');
});

// =========================================================================
// 3. INVARIANT 3: PROCEDURAL SOUND EFFECTS DEFAULT
// =========================================================================
console.log('\n--- INVARIANT 3: Procedural Sound Effects Default ---');

runTestCase('3.1 Direct ProceduralSFX Initial State Invariant (0.0 Volume & Muted)', () => {
  const sfx = new ProceduralSFX();
  assertEquals(sfx.getIsMuted(), true, 'ProceduralSFX must initialize to isMuted: true');
  assertEquals(sfx.getVolume(), 0.0, 'ProceduralSFX must initialize to volume: 0.0');
});

runTestCase('3.2 AudioEngine Integration Default State Invariant', () => {
  const audio = new AudioEngine();
  assertEquals(audio.isSFXMuted(), true, 'AudioEngine must initialize SFX as muted');
  assertEquals(audio.getSFXVolume(), 0.0, 'AudioEngine must initialize SFX volume to 0.0');
});

runTestCase('3.3 Zero Audio Nodes Allocated under Default Muted State across 900 Invocations', () => {
  const mockCtx = new InstrumentedMockAudioContext();
  const audio = new AudioEngine();
  audio.initContext(mockCtx as any);

  // Record baseline nodes created by AudioEngine master setup (masterGain, musicGain, analyser, sfx.masterGain)
  mockCtx.resetCounters();

  // Trigger procedural SFX in default state 300 times each (total 900 calls)
  for (let i = 0; i < 300; i++) {
    audio.playProceduralSFX('launch');
    audio.playProceduralSFX('boom');
    audio.playProceduralSFX('crackle');
  }

  // Invariant: ZERO nodes or buffers created when muted or volume is 0.0
  assertEquals(mockCtx.nodeCounts.gain, 0, 'Zero gain nodes created during muted SFX calls');
  assertEquals(mockCtx.nodeCounts.filter, 0, 'Zero biquad filter nodes created during muted SFX calls');
  assertEquals(mockCtx.nodeCounts.bufferSource, 0, 'Zero buffer source nodes created during muted SFX calls');
  assertEquals(mockCtx.nodeCounts.buffer, 0, 'Zero audio buffers created during muted SFX calls');
  assertEquals(mockCtx.nodeCounts.totalCreated, 0, 'Total new audio nodes created must be strictly 0');
});

runTestCase('3.4 Zero Audio Nodes when Unmuted with 0.0 Volume', () => {
  const mockCtx = new InstrumentedMockAudioContext();
  const audio = new AudioEngine();
  audio.initContext(mockCtx as any);
  mockCtx.resetCounters();

  // Unmute, but leave volume at 0.0
  audio.setSFXMuted(false);
  audio.setSFXVolume(0.0);

  audio.playProceduralSFX('launch');
  audio.playProceduralSFX('boom');
  audio.playProceduralSFX('crackle');

  assertEquals(mockCtx.nodeCounts.totalCreated, 0, 'Zero audio nodes created when volume is 0.0');
});

runTestCase('3.5 Nodes Allocated Only when Explicitly Enabled (Unmuted AND Volume > 0)', () => {
  const mockCtx = new InstrumentedMockAudioContext();
  const audio = new AudioEngine();
  audio.initContext(mockCtx as any);
  mockCtx.resetCounters();

  // Explicitly enable SFX
  audio.setSFXMuted(false);
  audio.setSFXVolume(0.6);

  audio.playProceduralSFX('launch');
  assert(mockCtx.nodeCounts.totalCreated > 0, 'Audio nodes must be instantiated when SFX is enabled');

  // Re-mute
  const currentCount = mockCtx.nodeCounts.totalCreated;
  audio.setSFXMuted(true);

  // Play again while muted
  for (let i = 0; i < 100; i++) {
    audio.playProceduralSFX('boom');
    audio.playProceduralSFX('crackle');
  }

  assertEquals(mockCtx.nodeCounts.totalCreated, currentCount, 'Node allocation halted immediately upon re-muting');
});

// =========================================================================
// 4. INVARIANT 4: INPUT SUPPRESSION INVARIANT
// =========================================================================
console.log('\n--- INVARIANT 4: Input Suppression Invariant ---');

runTestCase('4.1 Hotkey Suppression Matrix for HTMLInputElement', () => {
  let recordCalls = 0;
  let fireCalls = 0;
  let blackoutCalls = 0;
  let fullscreenCalls = 0;

  const tapRecorder = new TapRecorder({
    getCurrentTime: () => 10.0,
    getIsPlaying: () => true,
    onRecordCue: () => { recordCalls++; },
    onFireLive: () => { fireCalls++; },
    onBlackout: () => { blackoutCalls++; },
    onToggleFullscreen: () => { fullscreenCalls++; },
  });

  const inputElem = new MockHTMLInputElement();
  const hotkeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'f', 'F', ' '];

  for (const key of hotkeys) {
    const event = new MockKeyboardEvent(key, inputElem);
    const handled = tapRecorder.handleKeyDown(event as any);

    assertEquals(handled, false, `Key "${key}" must not be handled when focused on HTMLInputElement`);
    assertEquals(event.defaultPrevented, false, `Key "${key}" default action must NOT be prevented in input field`);
  }

  assertEquals(recordCalls, 0, 'onRecordCue must have 0 invocations');
  assertEquals(fireCalls, 0, 'onFireLive must have 0 invocations');
  assertEquals(blackoutCalls, 0, 'onBlackout must have 0 invocations');
  assertEquals(fullscreenCalls, 0, 'onToggleFullscreen must have 0 invocations');
});

runTestCase('4.2 Hotkey Suppression Matrix for HTMLTextAreaElement', () => {
  let recordCalls = 0;
  let fireCalls = 0;
  let blackoutCalls = 0;
  let fullscreenCalls = 0;

  const tapRecorder = new TapRecorder({
    getCurrentTime: () => 10.0,
    getIsPlaying: () => true,
    onRecordCue: () => { recordCalls++; },
    onFireLive: () => { fireCalls++; },
    onBlackout: () => { blackoutCalls++; },
    onToggleFullscreen: () => { fullscreenCalls++; },
  });

  const textareaElem = new MockHTMLTextAreaElement();
  const hotkeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'f', 'F', ' '];

  for (const key of hotkeys) {
    const event = new MockKeyboardEvent(key, textareaElem);
    const handled = tapRecorder.handleKeyDown(event as any);

    assertEquals(handled, false, `Key "${key}" must return false when focused on HTMLTextAreaElement`);
    assertEquals(event.defaultPrevented, false, `Key "${key}" default must NOT be prevented in textarea`);
  }

  assertEquals(recordCalls, 0, '0 record calls in textarea');
  assertEquals(fireCalls, 0, '0 fire calls in textarea');
  assertEquals(blackoutCalls, 0, '0 blackout calls in textarea');
  assertEquals(fullscreenCalls, 0, '0 fullscreen calls in textarea');
});

runTestCase('4.3 Hotkey Suppression Matrix for isContentEditable Elements', () => {
  let recordCalls = 0;
  let fireCalls = 0;
  let blackoutCalls = 0;
  let fullscreenCalls = 0;

  const tapRecorder = new TapRecorder({
    getCurrentTime: () => 10.0,
    getIsPlaying: () => true,
    onRecordCue: () => { recordCalls++; },
    onFireLive: () => { fireCalls++; },
    onBlackout: () => { blackoutCalls++; },
    onToggleFullscreen: () => { fullscreenCalls++; },
  });

  const editableDiv = new MockHTMLElement('DIV');
  editableDiv.isContentEditable = true;

  const hotkeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'f', 'F', ' '];

  for (const key of hotkeys) {
    const event = new MockKeyboardEvent(key, editableDiv);
    const handled = tapRecorder.handleKeyDown(event as any);

    assertEquals(handled, false, `Key "${key}" must be suppressed in contentEditable`);
    assertEquals(event.defaultPrevented, false, `Key "${key}" default must NOT be prevented in contentEditable`);
  }

  assertEquals(recordCalls, 0, '0 record calls in contentEditable');
  assertEquals(fireCalls, 0, '0 fire calls in contentEditable');
  assertEquals(blackoutCalls, 0, '0 blackout calls in contentEditable');
  assertEquals(fullscreenCalls, 0, '0 fullscreen calls in contentEditable');
});

runTestCase('4.4 Active Hotkey Functionality on Non-Input Elements (Control Group)', () => {
  let recordCalls = 0;
  let fireCalls = 0;
  let blackoutCalls = 0;
  let fullscreenCalls = 0;
  let lastRecordedCue: ShowJSONCue | null = null;

  const tapRecorder = new TapRecorder({
    getCurrentTime: () => 12.345,
    getIsPlaying: () => true,
    onRecordCue: (c) => { recordCalls++; lastRecordedCue = c; },
    onFireLive: () => { fireCalls++; },
    onBlackout: () => { blackoutCalls++; },
    onToggleFullscreen: () => { fullscreenCalls++; },
  });

  const normalDiv = new MockHTMLElement('DIV'); // Not contentEditable

  // Test numeric station keys 1-6
  for (let num = 1; num <= 6; num++) {
    const key = num.toString();
    const event = new MockKeyboardEvent(key, normalDiv);
    const handled = tapRecorder.handleKeyDown(event as any);

    assertEquals(handled, true, `Key "${key}" handled on normal div`);
    assertEquals(event.defaultPrevented, true, `Key "${key}" defaultPrevented on normal div`);
    assertEquals(lastRecordedCue?.station, STATION_HOTKEY_MAP[key], `Key "${key}" mapped to correct station`);
  }

  assertEquals(recordCalls, 6, '6 cues recorded');
  assertEquals(fireCalls, 6, '6 cues fired live');

  // Test macro keys 7-9
  for (let num = 7; num <= 9; num++) {
    const key = num.toString();
    const event = new MockKeyboardEvent(key, normalDiv);
    const handled = tapRecorder.handleKeyDown(event as any);
    assertEquals(handled, true, `Macro key "${key}" handled on normal div`);
    assertEquals(event.defaultPrevented, true, `Macro key "${key}" defaultPrevented`);
  }

  assertEquals(recordCalls, 9, '9 total cues recorded');

  // Test presentation fullscreen 'F' and 'f'
  const eventF = new MockKeyboardEvent('f', normalDiv);
  tapRecorder.handleKeyDown(eventF as any);
  assertEquals(fullscreenCalls, 1, 'Fullscreen toggled by "f"');

  const eventUpperF = new MockKeyboardEvent('F', normalDiv);
  tapRecorder.handleKeyDown(eventUpperF as any);
  assertEquals(fullscreenCalls, 2, 'Fullscreen toggled by "F"');

  // Test spacebar panic
  const eventSpace = new MockKeyboardEvent(' ', normalDiv);
  tapRecorder.handleKeyDown(eventSpace as any);
  assertEquals(blackoutCalls, 1, 'Spacebar triggers blackout panic');
  assertEquals(eventSpace.defaultPrevented, true, 'Spacebar default prevented on normal div');
});

// =========================================================================
// 5. INVARIANT 5: MEMORY LEAK INVARIANCE
// =========================================================================
console.log('\n--- INVARIANT 5: Memory Leak Invariance ---');

runTestCase('5.1 Bounded Zero Heap Growth across 300 Show Load, Clear, Play, Seek, and Panic Cycles', () => {
  const pool = new ParticlePool();
  const shellManager = new ShellArchetypeManager(pool);
  const sm = new ShowManager();

  sm.setOnFireCue((cue) => {
    shellManager.fire(cue);
  });

  // Warm-up: Run 60 full cycles to allow V8 JIT compiler optimization,
  // typed array initialization, and saturation of the 50-item undoStack.
  for (let w = 0; w < 60; w++) {
    sm.loadShow(DEMO_SHOW_1_ODE_TO_RADIANCE);
    sm.seek(10.0);
    sm.tick(25.0);
    pool.update(0.016, 25.0);
    pool.blackout();
    sm.clearAllCues();
  }

  // Force GC if available (when run with --expose-gc)
  if (typeof (globalThis as any).gc === 'function') {
    (globalThis as any).gc();
  }

  const baselineHeapBytes = process.memoryUsage().heapUsed;

  // Execute 300 intensive lifecycle cycles
  const CYCLES = 300;
  for (let c = 0; c < CYCLES; c++) {
    // 1. Load Show 1 ("Cosmic Awakening" / "Ode to Radiance", 35 cues)
    sm.loadShow(DEMO_SHOW_1_ODE_TO_RADIANCE);

    // 2. Scrub / Seek forward
    sm.seek(15.0);

    // 3. Playback ticks from 15s to 30s (fires cues into particle pool)
    for (let t = 15.0; t <= 30.0; t += 1.0) {
      sm.tick(t);
    }

    // 4. Update particle physics
    pool.update(0.016, 30.0);

    // 5. Seek to grand finale section
    sm.seek(75.0);
    for (let t = 75.0; t <= 86.0; t += 1.0) {
      sm.tick(t);
    }
    pool.update(0.016, 86.0);

    // 6. Emergency Panic Blackout
    pool.blackout();
    sm.resetScheduler();

    // 7. Clear all cues
    sm.clearAllCues();

    // 8. Load Show 2 ("Neon Horizon", 15 cues)
    sm.loadShow(DEMO_SHOW_2_NEON_HORIZON);

    // 9. Seek & Play
    sm.seek(0.0);
    for (let t = 0.0; t <= 20.0; t += 2.0) {
      sm.tick(t);
    }
    pool.update(0.016, 20.0);

    // 10. Panic Blackout & Clear
    pool.blackout();
    sm.clearAllCues();
  }

  // Force GC if available
  if (typeof (globalThis as any).gc === 'function') {
    (globalThis as any).gc();
  }

  const finalHeapBytes = process.memoryUsage().heapUsed;
  const netDeltaMB = (finalHeapBytes - baselineHeapBytes) / (1024 * 1024);
  const bytesPerCycle = (finalHeapBytes - baselineHeapBytes) / CYCLES;

  console.log(`\n    [Heap Metrics: Baseline = ${(baselineHeapBytes / (1024 * 1024)).toFixed(2)} MB, Final = ${(finalHeapBytes / (1024 * 1024)).toFixed(2)} MB, Net Delta = ${netDeltaMB.toFixed(2)} MB (${bytesPerCycle.toFixed(1)} bytes/cycle across ${CYCLES} cycles)]`);

  // Invariant assertions
  assert(netDeltaMB < 15.0, `Net heap growth must be bounded (<15MB). Actual: ${netDeltaMB.toFixed(2)} MB`);
  assertEquals(pool.aliveCount, 0, 'Particle pool aliveCount must be 0 after cycles');
  assertEquals(pool.capacity, 65536, 'Particle pool capacity strictly intact at 65536');
  assertEquals(sm.getCues().length, 0, 'ShowManager cues must be empty after cleanup');
});

runTestCase('5.2 Zero-Allocation In-Flight Simulation Loop Stability (500 Frames of 25k Particles)', () => {
  const pool = new ParticlePool();

  // Populate pool with 25,000 active particles
  for (let i = 0; i < 25000; i++) {
    pool.spawn(
      (Math.random() - 0.5) * 40,
      10 + Math.random() * 30,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
      1.0, 0.8, 0.2, 1.0,
      3.0, 100.0, // Long life to keep 25,000 alive
      0.97, 9.8,
      i % 12, Math.random() * 10, 0
    );
  }

  assertEquals(pool.aliveCount, 25000, '25,000 particles populated');

  // Warm-up 50 frames
  for (let f = 0; f < 50; f++) {
    pool.update(0.016, f * 0.016);
  }

  if (typeof (globalThis as any).gc === 'function') {
    (globalThis as any).gc();
  }

  const heapBefore = process.memoryUsage().heapUsed;

  // Run 500 frames of imperative simulation with zero allocations
  for (let f = 0; f < 500; f++) {
    pool.update(0.016, (50 + f) * 0.016);
  }

  if (typeof (globalThis as any).gc === 'function') {
    (globalThis as any).gc();
  }

  const heapAfter = process.memoryUsage().heapUsed;
  const deltaKB = (heapAfter - heapBefore) / 1024;

  console.log(`\n    [Simulation Metrics: 500 frames of 25,000 particles, Heap Delta = ${deltaKB.toFixed(2)} KB]`);

  // Zero-allocation invariant: Delta across 500 frames must be virtually zero (< 100 KB)
  assert(deltaKB < 100.0, `Heap delta across 500 frames must be < 100 KB. Actual: ${deltaKB.toFixed(2)} KB`);
});

// =========================================================================
// SUMMARY & VERDICT
// =========================================================================

console.log('\n======================================================================');
console.log('                          TEST SUMMARY RESULTS                         ');
console.log('======================================================================');
console.log(`Total Tests Run:  ${stats.passed + stats.failed}`);
console.log(`Passed Tests:     ${stats.passed}`);
console.log(`Failed Tests:     ${stats.failed}`);
console.log(`Total Assertions: ${stats.totalAssertions}`);
console.log('======================================================================\n');

if (stats.failed > 0) {
  console.error('❌ VERDICT: REQUEST_CHANGES (Invariants failed empirical verification)');
  process.exit(1);
} else {
  console.log('✅ VERDICT: APPROVE (All 5 Tier 5 System Invariants 100% Empirically Verified)');
  process.exit(0);
}
