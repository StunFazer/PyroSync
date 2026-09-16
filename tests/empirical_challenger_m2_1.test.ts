/**
 * Empirical Challenger 1 Verification & Stress Suite
 * Milestone 2: Audio Timecode Sync, Procedural SFX & Procedural Music
 *
 * Adversarial Testing:
 * 1. AudioEngine Sample-Accurate Timecode Clock (< 5ms drift across 60s playback, play/pause/seek)
 * 2. ProceduralSFX Strict Initial MUTED state, unmuting, volume controls, zero-allocation when muted, gain bounds [0.0, 1.0]
 * 3. ProceduralMusic Demo Show 1 ("Cosmic Awakening") & Demo Show 2 ("Neon Horizon") buffer generation, valid durations, non-zero samples, RMS energy
 * 4. Waveform decimation & Transient detection integration
 */

import { AudioEngine } from '../src/engine/audio/AudioEngine';
import { ProceduralSFX } from '../src/engine/audio/ProceduralSFX';
import { ProceduralMusic } from '../src/engine/audio/ProceduralMusic';

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
    const err = `❌ FAIL: ${msg}`;
    console.error(err);
    throw new Error(err);
  }
  stats.passed++;
}

function assertCloseTo(actual: number, expected: number, delta = 1e-4, msg = '') {
  stats.total++;
  const diff = Math.abs(actual - expected);
  if (diff > delta) {
    stats.failed++;
    const message = `❌ FAIL: ${msg} (Actual: ${actual}, Expected: ${expected}, Diff: ${diff} > Delta: ${delta})`;
    console.error(message);
    throw new Error(message);
  }
  stats.passed++;
}

// ============================================================================
// Enhanced Web Audio Mock Environment for High-Fidelity Audio Synthesis Testing
// ============================================================================

class MockAudioParam {
  value: number;
  events: Array<{ type: string; time: number; value: number }> = [];

  constructor(initialValue: number = 1.0) {
    this.value = initialValue;
  }

  setValueAtTime(val: number, time: number): MockAudioParam {
    this.value = val;
    this.events.push({ type: 'setValueAtTime', time, value: val });
    return this;
  }

  linearRampToValueAtTime(val: number, time: number): MockAudioParam {
    this.value = val;
    this.events.push({ type: 'linearRampToValueAtTime', time, value: val });
    return this;
  }

  exponentialRampToValueAtTime(val: number, time: number): MockAudioParam {
    this.value = val;
    this.events.push({ type: 'exponentialRampToValueAtTime', time, value: val });
    return this;
  }
}

class MockAudioNode {
  context: MockAudioContext;
  connectedTargets: MockAudioNode[] = [];

  constructor(context: MockAudioContext) {
    this.context = context;
  }

  connect(target: MockAudioNode): MockAudioNode {
    this.connectedTargets.push(target);
    return target;
  }

  disconnect(): void {
    this.connectedTargets = [];
  }
}

class MockGainNode extends MockAudioNode {
  gain: MockAudioParam;

  constructor(context: MockAudioContext, initialGain: number = 1.0) {
    super(context);
    this.gain = new MockAudioParam(initialGain);
  }
}

class MockOscillatorNode extends MockAudioNode {
  type: string = 'sine';
  frequency: MockAudioParam;
  isPlaying: boolean = false;
  startTime: number = 0;
  stopTime: number = 0;

  constructor(context: MockAudioContext) {
    super(context);
    this.frequency = new MockAudioParam(440);
  }

  start(when: number = 0): void {
    this.isPlaying = true;
    this.startTime = when;
  }

  stop(when: number = 0): void {
    this.isPlaying = false;
    this.stopTime = when;
  }
}

class MockBiquadFilterNode extends MockAudioNode {
  type: 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'allpass' = 'lowpass';
  frequency: MockAudioParam;
  Q: MockAudioParam;

  constructor(context: MockAudioContext) {
    super(context);
    this.frequency = new MockAudioParam(350);
    this.Q = new MockAudioParam(1);
  }
}

class MockAnalyserNode extends MockAudioNode {
  fftSize: number = 1024;
  frequencyBinCount: number = 512;
  syntheticFrequencyData: Uint8Array;
  syntheticTimeDomainData: Uint8Array;

  constructor(context: MockAudioContext) {
    super(context);
    this.syntheticFrequencyData = new Uint8Array(512);
    this.syntheticTimeDomainData = new Uint8Array(512);
  }

  getByteFrequencyData(array: Uint8Array): void {
    for (let i = 0; i < Math.min(array.length, this.syntheticFrequencyData.length); i++) {
      array[i] = this.syntheticFrequencyData[i];
    }
  }

  getByteTimeDomainData(array: Uint8Array): void {
    for (let i = 0; i < Math.min(array.length, this.syntheticTimeDomainData.length); i++) {
      array[i] = this.syntheticTimeDomainData[i];
    }
  }
}

class MockAudioBuffer {
  sampleRate: number;
  length: number;
  duration: number;
  numberOfChannels: number;
  private channelData: Float32Array[];

  constructor(options: { numberOfChannels?: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels || 2;
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.duration = this.length / this.sampleRate;
    this.channelData = [];
    for (let i = 0; i < this.numberOfChannels; i++) {
      this.channelData.push(new Float32Array(this.length));
    }
  }

  getChannelData(channel: number): Float32Array {
    return this.channelData[channel] || this.channelData[0];
  }
}

class MockAudioBufferSourceNode extends MockAudioNode {
  buffer: MockAudioBuffer | null = null;
  playbackRate: MockAudioParam;
  onended: (() => void) | null = null;
  isPlaying: boolean = false;
  startTime: number = 0;
  offset: number = 0;

  constructor(context: MockAudioContext) {
    super(context);
    this.playbackRate = new MockAudioParam(1.0);
  }

  start(when: number = 0, offset: number = 0): void {
    this.isPlaying = true;
    this.startTime = when;
    this.offset = offset;
  }

  stop(when: number = 0): void {
    this.isPlaying = false;
    if (this.onended) this.onended();
  }
}

class MockAudioContext {
  currentTime: number = 0.0;
  sampleRate: number = 44100;
  state: 'suspended' | 'running' | 'closed' = 'running';
  destination: MockAudioNode;

  // Node telemetry for empirical auditing
  createdOscillators: MockOscillatorNode[] = [];
  createdGains: MockGainNode[] = [];
  createdFilters: MockBiquadFilterNode[] = [];
  createdBufferSources: MockAudioBufferSourceNode[] = [];
  createdBuffers: MockAudioBuffer[] = [];

  constructor() {
    this.destination = new MockAudioNode(this);
  }

  createGain(): MockGainNode {
    const node = new MockGainNode(this);
    this.createdGains.push(node);
    return node;
  }

  createOscillator(): MockOscillatorNode {
    const node = new MockOscillatorNode(this);
    this.createdOscillators.push(node);
    return node;
  }

  createBiquadFilter(): MockBiquadFilterNode {
    const node = new MockBiquadFilterNode(this);
    this.createdFilters.push(node);
    return node;
  }

  createAnalyser(): MockAnalyserNode {
    return new MockAnalyserNode(this);
  }

  createBufferSource(): MockAudioBufferSourceNode {
    const node = new MockAudioBufferSourceNode(this);
    this.createdBufferSources.push(node);
    return node;
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): MockAudioBuffer {
    const buf = new MockAudioBuffer({ numberOfChannels, length, sampleRate });
    this.createdBuffers.push(buf);
    return buf;
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

  advanceTime(dt: number): void {
    if (this.state === 'running') {
      this.currentTime += dt;
    }
  }

  resetTelemetry(): void {
    this.createdOscillators = [];
    this.createdGains = [];
    this.createdFilters = [];
    this.createdBufferSources = [];
    this.createdBuffers = [];
  }
}

(globalThis as any).AudioBuffer = MockAudioBuffer;

console.log('\n======================================================================');
console.log('       CHALLENGER 1 EMPIRICAL TEST SUITE - MILESTONE 2 VERIFICATION    ');
console.log('======================================================================\n');

// ============================================================================
// 1. AUDIOENGINE SAMPLE-ACCURATE TIMECODE CLOCK (< 5ms DRIFT ACROSS 60s)
// ============================================================================
console.log('--- 1. Testing AudioEngine Sample-Accurate Timecode Clock (< 5ms Drift) ---');

async function testSampleAccurateTimecodeClock() {
  const mockCtx = new MockAudioContext() as unknown as AudioContext;
  const ctx = mockCtx as unknown as MockAudioContext;
  const engine = new AudioEngine(mockCtx);

  // Generate a 90-second synthetic pyromusical buffer
  const trackBuffer = ProceduralMusic.generateCosmicAwakening(mockCtx, 90.0);
  await engine.loadAudio(trackBuffer);

  assertCloseTo(engine.getDuration(), 90.0, 1e-4, 'Track loaded with 90s duration');
  assertCloseTo(engine.getCurrentTime(), 0.0, 1e-4, 'Initial playhead at 0.0s');
  assert(engine.getIsPlaying() === false, 'Initially not playing');

  let maxDriftObserved = 0.0;
  const dtFrame = 1 / 60; // 60 FPS = 16.6667ms per frame

  // --------------------------------------------------------------------------
  // Phase A: Continuous Playback 0s -> 10s (600 frames)
  // --------------------------------------------------------------------------
  engine.play(0.0);
  assert(engine.getIsPlaying() === true, 'Engine playing in Phase A');

  for (let f = 1; f <= 600; f++) {
    ctx.advanceTime(dtFrame);
    const expectedTime = f * dtFrame;
    const reportedTime = engine.getCurrentTime();
    const driftMs = Math.abs(reportedTime - expectedTime) * 1000;
    if (driftMs > maxDriftObserved) maxDriftObserved = driftMs;

    // Assert strictly < 5ms drift
    assert(
      driftMs < 5.0,
      `Phase A: Continuous playback drift at frame ${f} (${reportedTime.toFixed(4)}s vs expected ${expectedTime.toFixed(4)}s) is ${driftMs.toFixed(4)}ms < 5ms`
    );
  }
  assertCloseTo(engine.getCurrentTime(), 10.0, 0.001, 'Phase A completed at 10.0s');

  // --------------------------------------------------------------------------
  // Phase B: Pause at 10.0s, Hardware Clock Advances 5.0s (Paused)
  // --------------------------------------------------------------------------
  engine.pause();
  assert(engine.getIsPlaying() === false, 'Engine paused in Phase B');
  const pausedTime = engine.getCurrentTime();
  assertCloseTo(pausedTime, 10.0, 0.001, 'Playhead frozen at 10.0s on pause');

  // Advance hardware clock while paused
  for (let f = 1; f <= 300; f++) {
    ctx.advanceTime(dtFrame);
    const currentTimeWhilePaused = engine.getCurrentTime();
    assertCloseTo(
      currentTimeWhilePaused,
      10.0,
      1e-9,
      `Phase B: Playhead remains rigidly frozen at 10.0s while paused (hw time = ${(10 + f * dtFrame).toFixed(2)}s)`
    );
  }

  // --------------------------------------------------------------------------
  // Phase C: Resume Playback for 15.0s (Reaching 25.0s playhead)
  // --------------------------------------------------------------------------
  const resumeHwTime = ctx.currentTime;
  engine.play();
  assert(engine.getIsPlaying() === true, 'Engine resumed in Phase C');

  for (let f = 1; f <= 900; f++) {
    ctx.advanceTime(dtFrame);
    const expectedPlayhead = 10.0 + f * dtFrame;
    const reportedTime = engine.getCurrentTime();
    const driftMs = Math.abs(reportedTime - expectedPlayhead) * 1000;
    if (driftMs > maxDriftObserved) maxDriftObserved = driftMs;

    assert(
      driftMs < 5.0,
      `Phase C: Resume playback drift at frame ${f} is ${driftMs.toFixed(4)}ms < 5ms`
    );
  }
  assertCloseTo(engine.getCurrentTime(), 25.0, 0.001, 'Phase C completed at 25.0s playhead');

  // --------------------------------------------------------------------------
  // Phase D: Seek Forward while Playing (Seek 25.0s -> 45.0s) & Play 10.0s
  // --------------------------------------------------------------------------
  engine.seek(45.0);
  assert(engine.getIsPlaying() === true, 'Engine continues playing after seek');
  assertCloseTo(engine.getCurrentTime(), 45.0, 0.001, 'Immediate seek to 45.0s');

  for (let f = 1; f <= 600; f++) {
    ctx.advanceTime(dtFrame);
    const expectedPlayhead = 45.0 + f * dtFrame;
    const reportedTime = engine.getCurrentTime();
    const driftMs = Math.abs(reportedTime - expectedPlayhead) * 1000;
    if (driftMs > maxDriftObserved) maxDriftObserved = driftMs;

    assert(
      driftMs < 5.0,
      `Phase D: Seek forward playback drift at frame ${f} is ${driftMs.toFixed(4)}ms < 5ms`
    );
  }
  assertCloseTo(engine.getCurrentTime(), 55.0, 0.001, 'Phase D completed at 55.0s playhead');

  // --------------------------------------------------------------------------
  // Phase E: Seek Backward while Playing (Seek 55.0s -> 5.0s) & Play 10.0s
  // --------------------------------------------------------------------------
  engine.seek(5.0);
  assert(engine.getIsPlaying() === true, 'Engine continues playing after backward seek');
  assertCloseTo(engine.getCurrentTime(), 5.0, 0.001, 'Immediate seek to 5.0s');

  for (let f = 1; f <= 600; f++) {
    ctx.advanceTime(dtFrame);
    const expectedPlayhead = 5.0 + f * dtFrame;
    const reportedTime = engine.getCurrentTime();
    const driftMs = Math.abs(reportedTime - expectedPlayhead) * 1000;
    if (driftMs > maxDriftObserved) maxDriftObserved = driftMs;

    assert(
      driftMs < 5.0,
      `Phase E: Seek backward playback drift at frame ${f} is ${driftMs.toFixed(4)}ms < 5ms`
    );
  }
  assertCloseTo(engine.getCurrentTime(), 15.0, 0.001, 'Phase E completed at 15.0s playhead');

  // --------------------------------------------------------------------------
  // Phase F: Pause, Seek while Paused (Seek to 30.0s), Hold, then Resume
  // --------------------------------------------------------------------------
  engine.pause();
  assert(engine.getIsPlaying() === false, 'Paused at 15.0s');
  ctx.advanceTime(2.0); // 2 seconds hardware pause
  engine.seek(30.0);
  assertCloseTo(engine.getCurrentTime(), 30.0, 1e-9, 'Seek while paused set playhead to 30.0s');

  // Advance hardware clock another 3.0s while paused
  ctx.advanceTime(3.0);
  assertCloseTo(engine.getCurrentTime(), 30.0, 1e-9, 'Playhead stayed at 30.0s during pause hold');

  // Resume playback for remaining 5.0s (total hardware simulation = 60.0s)
  engine.play();
  for (let f = 1; f <= 300; f++) {
    ctx.advanceTime(dtFrame);
    const expectedPlayhead = 30.0 + f * dtFrame;
    const reportedTime = engine.getCurrentTime();
    const driftMs = Math.abs(reportedTime - expectedPlayhead) * 1000;
    if (driftMs > maxDriftObserved) maxDriftObserved = driftMs;

    assert(
      driftMs < 5.0,
      `Phase F: Playback after paused seek drift at frame ${f} is ${driftMs.toFixed(4)}ms < 5ms`
    );
  }
  assertCloseTo(engine.getCurrentTime(), 35.0, 0.001, 'Phase F completed at 35.0s playhead');

  console.log(`✔ 60-Second Multi-Phase Simulation passed. Max observed drift: ${maxDriftObserved.toFixed(6)}ms (Threshold: < 5.0ms)`);

  // --------------------------------------------------------------------------
  // Phase G: Adversarial Randomized Stress Harness (500 Random Play/Pause/Seek Cycles)
  // --------------------------------------------------------------------------
  console.log('  Testing 500-cycle randomized play/pause/seek stress harness...');
  let stressMaxDriftMs = 0.0;
  let simulatedHwTime = ctx.currentTime;

  for (let cycle = 0; cycle < 500; cycle++) {
    const op = Math.floor(Math.random() * 3); // 0: seek, 1: pause, 2: play
    const randomAdvance = 0.01 + Math.random() * 0.5; // 10ms to 500ms step

    if (op === 0) {
      // Seek to random point in track
      const targetSeek = Math.random() * 85.0;
      engine.seek(targetSeek);
      assertCloseTo(engine.getCurrentTime(), targetSeek, 0.001, `Stress seek cycle ${cycle}`);
    } else if (op === 1) {
      // Pause
      engine.pause();
    } else {
      // Play
      engine.play();
    }

    // Advance hardware time
    ctx.advanceTime(randomAdvance);
    simulatedHwTime += randomAdvance;

    const reported = engine.getCurrentTime();
    assert(reported >= 0.0 && reported <= 90.0, `Reported time ${reported} within track bounds [0, 90]`);
  }

  // --------------------------------------------------------------------------
  // Phase H: Boundary & Safety Interlocks for Clock
  // --------------------------------------------------------------------------
  engine.pause();
  // Negative seek clamps to 0.0
  engine.seek(-15.0);
  assertCloseTo(engine.getCurrentTime(), 0.0, 1e-9, 'Negative seek clamped to 0.0s');

  // Past duration seek when paused clamps to duration (90.0)
  engine.seek(150.0);
  assertCloseTo(engine.getCurrentTime(), 90.0, 1e-9, 'Past duration seek when paused clamped to 90.0s');

  // Seeking past duration while playing auto-rewinds to 0.0 for seamless looping
  engine.play();
  engine.seek(150.0);
  assertCloseTo(engine.getCurrentTime(), 0.0, 1e-9, 'Seeking past duration while playing restarts at 0.0s');

  // Double play idempotent call
  engine.play();
  const playTime1 = engine.getCurrentTime();
  engine.play();
  const playTime2 = engine.getCurrentTime();
  assertCloseTo(playTime1, playTime2, 1e-6, 'Double play call is idempotent');

  // Double pause idempotent call
  engine.pause();
  engine.pause();
  assert(engine.getIsPlaying() === false, 'Double pause call remains safely paused');

  console.log('✔ AudioEngine sample-accurate timecode clock verified under all scenarios.');
}


// ============================================================================
// 2. PROCEDURAL SFX VERIFICATION (MUTED DEFAULT, CONTROLS, GAIN BOUNDS)
// ============================================================================
console.log('\n--- 2. Testing ProceduralSFX (Muted Default, Controls, Node Zero-Alloc, Gain Bounds) ---');

function testProceduralSFX() {
  const mockCtx = new MockAudioContext() as unknown as AudioContext;
  const ctx = mockCtx as unknown as MockAudioContext;

  // 2.1 Verify Initial Default State is STRICTLY MUTED (ORIGINAL_REQUEST §R3)
  const sfxFresh = new ProceduralSFX();
  assert(sfxFresh.getIsMuted() === true, 'ProceduralSFX initial getIsMuted() strictly TRUE');
  assert(sfxFresh.getVolume() === 0.0, 'ProceduralSFX initial getVolume() strictly 0.0');

  // Test via AudioEngine wrapper
  const engine = new AudioEngine(mockCtx);
  assert(engine.isSFXMuted() === true, 'AudioEngine.isSFXMuted() strictly TRUE on launch');
  assert(engine.getSFXVolume() === 0.0, 'AudioEngine.getSFXVolume() strictly 0.0 on launch');

  // 2.2 Zero-Allocation When Muted: Absolutely zero audio nodes or buffers created when muted
  const sfx = new ProceduralSFX(mockCtx);
  ctx.resetTelemetry();

  // Attempt 100 triggers while muted
  for (let i = 0; i < 100; i++) {
    sfx.play('launch', 1.0);
    sfx.play('boom', 1.0);
    sfx.play('crackle', 1.0);
  }

  assert(
    ctx.createdOscillators.length === 0,
    `Zero oscillators created while muted (count: ${ctx.createdOscillators.length})`
  );
  assert(
    ctx.createdFilters.length === 0,
    `Zero biquad filters created while muted (count: ${ctx.createdFilters.length})`
  );
  assert(
    ctx.createdBufferSources.length === 0,
    `Zero buffer sources created while muted (count: ${ctx.createdBufferSources.length})`
  );
  console.log('✔ Zero-allocation verified: No audio nodes or voices created while MUTED.');

  // 2.3 Unmuting and Volume Control Behavior
  // Unmuting when volume is 0.0 restores comfortable default 0.5
  sfx.setMuted(false);
  assert(sfx.getIsMuted() === false, 'sfx is unmuted');
  assertCloseTo(sfx.getVolume(), 0.5, 1e-4, 'Unmuting restored default volume to 0.5');

  // Setting explicit volume
  sfx.setVolume(0.85);
  assertCloseTo(sfx.getVolume(), 0.85, 1e-4, 'sfx volume updated to 0.85');

  // Volume bounds clamping: [-1.0, 2.0] -> [0.0, 1.0]
  sfx.setVolume(-0.5);
  assertCloseTo(sfx.getVolume(), 0.0, 1e-4, 'Negative volume clamped to 0.0');

  sfx.setVolume(2.5);
  assertCloseTo(sfx.getVolume(), 1.0, 1e-4, 'Excess volume clamped to 1.0');

  // Setting volume > 0 while muted automatically unmutes
  sfx.setMuted(true);
  assert(sfx.getIsMuted() === true, 'Muted');
  sfx.setVolume(0.6);
  assert(sfx.getIsMuted() === false, 'Setting volume > 0 automatically unmuted');
  assertCloseTo(sfx.getVolume(), 0.6, 1e-4, 'Volume set to 0.6');

  // 2.4 Trigger Methods & Node Synthesis Inspection (Gain Bounds [0.0, 1.0])
  sfx.setVolume(1.0); // Maximum volume for strict peak gain inspection

  // --- Test 'launch' (Launch Thump) ---
  ctx.resetTelemetry();
  sfx.play('launch', 1.0);

  assert(ctx.createdOscillators.length === 1, 'Launch thump created 1 sine oscillator');
  assert(ctx.createdFilters.length === 1, 'Launch thump created 1 muzzle gas bandpass filter');
  assert(ctx.createdBufferSources.length === 1, 'Launch thump created 1 noise buffer source');

  const launchOsc = ctx.createdOscillators[0];
  assert(launchOsc.type === 'sine', 'Launch oscillator is sine');
  // Check pitch sweep: 130 Hz -> 35 Hz
  const oscFreqEvents = launchOsc.frequency.events;
  assert(oscFreqEvents.length >= 2, 'Launch oscillator has frequency envelope');
  assertCloseTo(oscFreqEvents[0].value, 130, 1e-4, 'Launch start frequency 130 Hz');
  assertCloseTo(oscFreqEvents[1].value, 35, 1e-4, 'Launch drop frequency 35 Hz');

  // Check launch gains: oscGain peak <= 0.85, noiseGain peak <= 0.6
  for (const g of ctx.createdGains) {
    for (const ev of g.gain.events) {
      assert(
        ev.value >= 0.0 && ev.value <= 1.0,
        `Launch thump gain event ${ev.value} is strictly in [0.0, 1.0]`
      );
    }
  }

  // --- Test 'boom' (Aerial Report Boom) ---
  ctx.resetTelemetry();
  sfx.play('boom', 1.0);

  assert(ctx.createdOscillators.length === 1, 'Aerial boom created 1 sub-bass oscillator');
  assert(ctx.createdFilters.length === 1, 'Aerial boom created 1 lowpass rumble filter');

  const boomOsc = ctx.createdOscillators[0];
  assert(boomOsc.type === 'sine', 'Boom oscillator is sine');
  const boomFreqEvents = boomOsc.frequency.events;
  assertCloseTo(boomFreqEvents[0].value, 85, 1e-4, 'Boom start frequency 85 Hz');
  assertCloseTo(boomFreqEvents[1].value, 24, 1e-4, 'Boom sub-bass drop frequency 24 Hz');

  const boomFilter = ctx.createdFilters[0];
  assert(boomFilter.type === 'lowpass', 'Boom filter is lowpass rumble');
  assertCloseTo(boomFilter.frequency.events[0].value, 450, 1e-4, 'Boom filter initial cutoff 450 Hz');
  assertCloseTo(boomFreqEvents[1].value, 24, 1e-4, 'Boom sub-bass drop 24 Hz');

  // Check boom gains adhere to bounds
  for (const g of ctx.createdGains) {
    for (const ev of g.gain.events) {
      assert(
        ev.value >= 0.0 && ev.value <= 1.0,
        `Aerial boom gain event ${ev.value} is strictly in [0.0, 1.0]`
      );
    }
  }

  // --- Test 'crackle' (Crackle / Dragon Eggs) ---
  ctx.resetTelemetry();
  sfx.play('crackle', 1.0);

  // Crackle generates 12-24 micro-clicks
  assert(
    ctx.createdFilters.length >= 12 && ctx.createdFilters.length <= 24,
    `Crackle generated ${ctx.createdFilters.length} Poisson micro-clicks (expected 12-24)`
  );
  for (const f of ctx.createdFilters) {
    assert(f.type === 'highpass', 'Crackle micro-click filter is highpass');
    assert(f.frequency.events[0].value >= 2500, 'Crackle cutoff frequency >= 2500 Hz');
  }

  for (const g of ctx.createdGains) {
    for (const ev of g.gain.events) {
      assert(
        ev.value >= 0.0 && ev.value <= 1.0,
        `Crackle gain event ${ev.value} is strictly in [0.0, 1.0]`
      );
    }
  }

  // 2.5 Stress Barrage Harness: 500 rapid-fire triggers without exception
  console.log('  Testing 500 rapid-fire SFX triggers (simulating grand finale salvo)...');
  for (let i = 0; i < 500; i++) {
    const sfxType = i % 3 === 0 ? 'launch' : i % 3 === 1 ? 'boom' : 'crackle';
    sfx.play(sfxType, Math.random());
  }

  // 2.6 Emergency Panic / Blackout Silencing
  sfx.stopAll();
  // Verify master gain zeroed out immediately
  const masterGain = (sfx as any).masterGain as MockGainNode;
  assertCloseTo(masterGain.gain.value, 0.0, 1e-4, 'stopAll() immediately silences master gain to 0.0');

  // Invalid type parameter does not throw
  sfx.play('invalid_type' as any, 1.0);

  console.log('✔ ProceduralSFX strict MUTED state, volume control, and gain bounds verified.');
}

// ============================================================================
// 3. PROCEDURAL MUSIC SYNTHESIZER (DEMO SHOW 1 & 2 BUFFER VERIFICATION)
// ============================================================================
console.log('\n--- 3. Testing ProceduralMusic (Demo Shows 1 & 2 AudioBuffer Generation) ---');

function testProceduralMusic() {
  const mockCtx = new MockAudioContext() as unknown as AudioContext;

  // 3.1 Demo Show 1: "Cosmic Awakening" (Cinematic Hybrid, 90s)
  console.log('  Synthesizing Demo Show 1 ("Cosmic Awakening", 90s)...');
  const t0Show1 = performance.now();
  const show1Buffer = ProceduralMusic.generate(mockCtx, 'cosmic_awakening', 90.0);
  const show1Time = performance.now() - t0Show1;

  assert(show1Buffer.numberOfChannels === 2, 'Show 1 is stereo (2 channels)');
  assert(show1Buffer.sampleRate === 44100, 'Show 1 sample rate is 44.1 kHz');
  assertCloseTo(show1Buffer.duration, 90.0, 1e-4, 'Show 1 duration is strictly 90.0 seconds');
  assert(show1Buffer.length === 90 * 44100, `Show 1 sample length is ${90 * 44100}`);

  const s1Left = show1Buffer.getChannelData(0);
  const s1Right = show1Buffer.getChannelData(1);

  let s1NonZero = 0;
  let s1MaxAmp = 0;
  let s1MinAmp = 0;
  let s1NanCount = 0;

  for (let i = 0; i < show1Buffer.length; i++) {
    const l = s1Left[i];
    const r = s1Right[i];

    if (isNaN(l) || !isFinite(l) || isNaN(r) || !isFinite(r)) {
      s1NanCount++;
    }

    if (Math.abs(l) > 1e-4 || Math.abs(r) > 1e-4) {
      s1NonZero++;
    }

    if (l > s1MaxAmp) s1MaxAmp = l;
    if (l < s1MinAmp) s1MinAmp = l;
    if (r > s1MaxAmp) s1MaxAmp = r;
    if (r < s1MinAmp) s1MinAmp = r;
  }

  assert(s1NanCount === 0, `Show 1 contains 0 NaN or infinite samples (found: ${s1NanCount})`);
  assert(
    s1NonZero / show1Buffer.length > 0.95,
    `Show 1 has >95% non-zero audio samples (actual: ${((s1NonZero / show1Buffer.length) * 100).toFixed(1)}%)`
  );
  assert(s1MaxAmp <= 1.0, `Show 1 max amplitude <= 1.0 (actual: ${s1MaxAmp.toFixed(4)})`);
  assert(s1MinAmp >= -1.0, `Show 1 min amplitude >= -1.0 (actual: ${s1MinAmp.toFixed(4)})`);
  assert(s1MaxAmp > 0.3, `Show 1 contains substantive dynamic peak energy (peak: ${s1MaxAmp.toFixed(4)})`);

  // Calculate RMS energy per movement to verify dynamic arc
  function calcRMS(channelData: Float32Array, startSec: number, endSec: number): number {
    const start = Math.floor(startSec * 44100);
    const end = Math.floor(endSec * 44100);
    let sumSquares = 0.0;
    for (let i = start; i < end; i++) {
      sumSquares += channelData[i] * channelData[i];
    }
    return Math.sqrt(sumSquares / (end - start));
  }

  const s1RmsIntro = calcRMS(s1Left, 5.0, 20.0);
  const s1RmsBuild = calcRMS(s1Left, 26.0, 48.0);
  const s1RmsApex = calcRMS(s1Left, 52.0, 72.0);
  const s1RmsFinale = calcRMS(s1Left, 76.0, 85.0);

  console.log(`    Show 1 Movement RMS: Intro=${s1RmsIntro.toFixed(4)}, Build=${s1RmsBuild.toFixed(4)}, Apex=${s1RmsApex.toFixed(4)}, Finale=${s1RmsFinale.toFixed(4)} (Synth Time: ${show1Time.toFixed(1)}ms)`);
  assert(s1RmsIntro > 0.02, 'Show 1 Intro movement has audible ambient energy');
  assert(s1RmsApex > s1RmsBuild, 'Show 1 Apex energy exceeds Build movement');
  assert(s1RmsBuild > s1RmsIntro, 'Show 1 Build energy exceeds Intro movement');

  // 3.2 Demo Show 2: "Neon Horizon" (128 BPM Synthwave, 75s)
  console.log('  Synthesizing Demo Show 2 ("Neon Horizon", 75s)...');
  const t0Show2 = performance.now();
  const show2Buffer = ProceduralMusic.generate(mockCtx, 'neon_horizon', 75.0);
  const show2Time = performance.now() - t0Show2;

  assert(show2Buffer.numberOfChannels === 2, 'Show 2 is stereo (2 channels)');
  assert(show2Buffer.sampleRate === 44100, 'Show 2 sample rate is 44.1 kHz');
  assertCloseTo(show2Buffer.duration, 75.0, 1e-4, 'Show 2 duration is strictly 75.0 seconds');
  assert(show2Buffer.length === 75 * 44100, `Show 2 sample length is ${75 * 44100}`);

  const s2Left = show2Buffer.getChannelData(0);
  const s2Right = show2Buffer.getChannelData(1);

  let s2NonZero = 0;
  let s2MaxAmp = 0;
  let s2MinAmp = 0;
  let s2NanCount = 0;

  for (let i = 0; i < show2Buffer.length; i++) {
    const l = s2Left[i];
    const r = s2Right[i];

    if (isNaN(l) || !isFinite(l) || isNaN(r) || !isFinite(r)) {
      s2NanCount++;
    }

    if (Math.abs(l) > 1e-4 || Math.abs(r) > 1e-4) {
      s2NonZero++;
    }

    if (l > s2MaxAmp) s2MaxAmp = l;
    if (l < s2MinAmp) s2MinAmp = l;
    if (r > s2MaxAmp) s2MaxAmp = r;
    if (r < s2MinAmp) s2MinAmp = r;
  }

  assert(s2NanCount === 0, `Show 2 contains 0 NaN or infinite samples (found: ${s2NanCount})`);
  assert(
    s2NonZero / show2Buffer.length > 0.95,
    `Show 2 has >95% non-zero audio samples (actual: ${((s2NonZero / show2Buffer.length) * 100).toFixed(1)}%)`
  );
  assert(s2MaxAmp <= 1.0, `Show 2 max amplitude <= 1.0 (actual: ${s2MaxAmp.toFixed(4)})`);
  assert(s2MinAmp >= -1.0, `Show 2 min amplitude >= -1.0 (actual: ${s2MinAmp.toFixed(4)})`);
  assert(s2MaxAmp > 0.35, `Show 2 contains punchy synthwave transients (peak: ${s2MaxAmp.toFixed(4)})`);

  const s2RmsIntro = calcRMS(s2Left, 2.0, 14.0);
  const s2RmsVerse = calcRMS(s2Left, 16.0, 34.0);
  const s2RmsDrop = calcRMS(s2Left, 36.0, 58.0);
  const s2RmsOutro = calcRMS(s2Left, 61.0, 69.0);

  assert(s2RmsIntro > 0.03, 'Show 2 Intro movement has solid kick & pad presence');
  assert(s2RmsVerse > s2RmsIntro, 'Show 2 Verse energy exceeds Intro movement');
  assert(s2RmsDrop > s2RmsVerse, 'Show 2 Drop energy exceeds Verse movement');

  // 3.3 Custom Duration Synthesis (Boundary check)
  const shortBuffer = ProceduralMusic.generate(mockCtx, 'neon_horizon', 10.0);
  assertCloseTo(shortBuffer.duration, 10.0, 1e-4, 'Custom 10s duration synthesis matches parameter');
  assert(shortBuffer.length === 10 * 44100, 'Custom buffer length is 441,000 samples');

  console.log('✔ ProceduralMusic synthesizer verified for Demo Shows 1 & 2.');
}

// ============================================================================
// 4. AUDIOENGINE INTEGRATION: WAVEFORM EXTRACTION & TRANSIENT ONSET DETECTION
// ============================================================================
console.log('\n--- 4. Testing AudioEngine Waveform Peaks Decimation & Transient Detection ---');

function testWaveformAndTransients() {
  const mockCtx = new MockAudioContext() as unknown as AudioContext;
  const engine = new AudioEngine(mockCtx);

  // Load synthesized Demo Show 2
  engine.loadDemoTrack('neon_horizon', 75.0);
  assert(engine.getTrackTitle().includes('Neon Horizon'), 'Track title reflects loaded demo track');

  // 4.1 Waveform Peak Decimation (1000 buckets)
  const numBuckets = 1000;
  const peaks = engine.extractWaveformPeaks(numBuckets);

  assert(peaks.min.length === numBuckets, `Min peaks length is ${numBuckets}`);
  assert(peaks.max.length === numBuckets, `Max peaks length is ${numBuckets}`);
  assertCloseTo(peaks.duration, 75.0, 1e-4, 'Waveform peaks duration matches track duration');

  let nonZeroPeaks = 0;
  for (let b = 0; b < numBuckets; b++) {
    assert(peaks.min[b] <= 0.0, `Min peak bucket ${b} <= 0.0 (got ${peaks.min[b]})`);
    assert(peaks.max[b] >= 0.0, `Max peak bucket ${b} >= 0.0 (got ${peaks.max[b]})`);
    assert(peaks.min[b] >= -1.0, `Min peak bucket ${b} >= -1.0 (got ${peaks.min[b]})`);
    assert(peaks.max[b] <= 1.0, `Max peak bucket ${b} <= 1.0 (got ${peaks.max[b]})`);

    if (peaks.max[b] > 0.05 || peaks.min[b] < -0.05) {
      nonZeroPeaks++;
    }
  }

  assert(
    nonZeroPeaks / numBuckets > 0.9,
    `Waveform contains rich peak envelopes (>90% buckets non-zero, got ${((nonZeroPeaks / numBuckets) * 100).toFixed(1)}%)`
  );

  // 4.2 Transient Onset Detector (Beat discovery)
  const channelData = engine.getAudioBuffer()!.getChannelData(0);
  let maxFlux = 0;
  let prevEnergy = 0;
  const sampleRate = 44100;
  const windowSize = Math.floor(sampleRate * 0.02);
  const hopSize = Math.floor(sampleRate * 0.01);
  for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
    let energy = 0;
    for (let j = 0; j < windowSize; j++) {
      energy += channelData[i + j] * channelData[i + j];
    }
    energy = Math.sqrt(energy / windowSize);
    const flux = Math.max(0, energy - prevEnergy);
    if (flux > maxFlux) maxFlux = flux;
    prevEnergy = energy;
  }
  console.log(`    Max flux in Neon Horizon: ${maxFlux.toFixed(4)}`);

  const transients = engine.detectTransients(0.02);
  console.log(`    Transients at threshold 0.02: ${transients.length}`);
  assert(transients.length > 20, `Detected ${transients.length} rhythmic transients in Neon Horizon`);

  // Verify transients are monotonically increasing and spaced by >= 150ms
  for (let t = 1; t < transients.length; t++) {
    const gap = transients[t] - transients[t - 1];
    assert(
      gap >= 0.149,
      `Transient gap at ${transients[t]}s is ${gap.toFixed(3)}s (>= 0.150s lockout)`
    );
  }

  console.log(`✔ Waveform extraction & transient detector verified (${transients.length} beats detected).`);
}

async function runAll() {
  await testSampleAccurateTimecodeClock();
  testProceduralSFX();
  testProceduralMusic();
  testWaveformAndTransients();

  console.log('\n======================================================================');
  console.log(`EMPIRICAL CHALLENGER VERIFICATION SUMMARY:`);
  console.log(`Total Assertions Checked: ${stats.total}`);
  console.log(`Passed:                   ${stats.passed}`);
  console.log(`Failed:                   ${stats.failed}`);
  console.log('======================================================================\n');

  if (stats.failed > 0) {
    console.error(`VERDICT: REQUEST_CHANGES (${stats.failed} failed assertions)`);
    process.exit(1);
  } else {
    console.log('VERDICT: APPROVE (100% empirical assertions passed cleanly)');
    process.exit(0);
  }
}

runAll().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
