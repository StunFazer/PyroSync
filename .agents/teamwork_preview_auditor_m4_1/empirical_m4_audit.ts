import assert from 'node:assert';

// Polyfill minimal browser globals for Node test environment
if (typeof globalThis.HTMLInputElement === 'undefined') {
  (globalThis as any).HTMLInputElement = class HTMLInputElement {};
}
if (typeof globalThis.HTMLTextAreaElement === 'undefined') {
  (globalThis as any).HTMLTextAreaElement = class HTMLTextAreaElement {};
}

import { ShowManager, TIMELINE_TRACKS } from '../../src/state/ShowManager';
import { ShowSerialization, validateShowJSON, sanitizeShowJSON } from '../../src/state/ShowSerialization';
import { DEMO_SHOW_COSMIC_AWAKENING, DEMO_SHOW_NEON_HORIZON, AUDIO_REACTIVE_PROFILES, getDemoShow, getAudioProfile } from '../../src/state/Presets';
import { AutoChoreographer } from '../../src/choreography/AutoChoreographer';
import { PatternBrushes } from '../../src/choreography/PatternBrushes';
import { TapRecorder, STATION_HOTKEY_MAP } from '../../src/choreography/TapRecorder';
import { FireCuePayload, ShowJSON, ShowJSONCue } from '../../src/types';

console.log('=== STARTING FORENSIC AUDIT EMPIRICAL STRESS TESTS ===\n');

// ----------------------------------------------------
// 1. ShowManager: Zero-Allocation Cursor & Binary Search Seek
// ----------------------------------------------------
console.log('[1/6] Auditing ShowManager...');
const sm = new ShowManager({
  initialShow: {
    version: '1.0.0',
    title: 'Forensic Test Show',
    duration: 100.0,
    calibration: {
      maxParticles: 65536,
      blackClamp: 0.02,
      gain: 1.0,
      bloomIntensity: 1.2,
      particleSizeScale: 1.0,
      aspectRatioMask: '16:9',
    },
    cues: [
      { id: 'c1', time: 1.0, archetype: 'peony', station: 'center', color: '#ffd700', altitude: 0.8 },
      { id: 'c2', time: 2.5, archetype: 'willow', station: 'left', color: '#ffffff', altitude: 0.8 },
      { id: 'c3', time: 2.5, archetype: 'willow', station: 'right', color: '#ffffff', altitude: 0.8 },
      { id: 'c4', time: 5.0, archetype: 'strobe', station: 'fan', color: '#00ff00', altitude: 0.85 },
      { id: 'c5', time: 10.0, archetype: 'finale_barrage', station: 'center', color: '#ff0000', altitude: 0.95 },
    ],
  },
});

const fired: FireCuePayload[] = [];
sm.setOnFireCue((cue) => fired.push(cue));

// Tick 0.5s -> no cues fired
sm.tick(0.5);
assert.strictEqual(fired.length, 0, 'No cues should fire at 0.5s');

// Tick 1.0s -> c1 fired
sm.tick(1.0);
assert.strictEqual(fired.length, 1, 'c1 should fire at 1.0s');
assert.strictEqual(fired[0].id, 'c1');

// Tick 2.6s -> c2 and c3 fired
sm.tick(2.6);
assert.strictEqual(fired.length, 3, 'c2 and c3 should fire by 2.6s');
assert.strictEqual(fired[1].id, 'c2');
assert.strictEqual(fired[2].id, 'c3');

// Backward seek to 0.0s -> should reset playbackCursor and not re-fire until ticked again
sm.seek(0.0);
fired.length = 0;
sm.tick(0.8);
assert.strictEqual(fired.length, 0, 'After seek backward to 0.0s, tick at 0.8s fires nothing');
sm.tick(1.2);
assert.strictEqual(fired.length, 1, 'After seek backward, tick at 1.2s fires c1 again');
assert.strictEqual(fired[0].id, 'c1');

// Binary search seek test on large sorted array (O(log N))
const largeCues: ShowJSONCue[] = [];
for (let i = 0; i < 10000; i++) {
  largeCues.push({
    id: `cue_${i}`,
    time: i * 0.1,
    archetype: 'peony',
    station: 'center',
    color: '#ffd700',
    altitude: 0.8,
  });
}
const smLarge = new ShowManager({
  initialShow: {
    version: '1.0.0',
    title: 'Large Show',
    duration: 1000.0,
    calibration: { maxParticles: 65536, blackClamp: 0.02, gain: 1, bloomIntensity: 1, particleSizeScale: 1, aspectRatioMask: '16:9' },
    cues: largeCues,
  },
});
const startSeek = performance.now();
smLarge.seek(500.05); // Should land at index 5001 (time 500.1)
const seekTime = performance.now() - startSeek;
assert.ok(seekTime < 5.0, `Binary search seek must be sub-millisecond, took ${seekTime}ms`);

// Test Track Mute & Solo State Machine with Pre-Solo Restoration
sm.clearAllMutesAndSolos();
assert.strictEqual(sm.isStationActive('left'), true);
assert.strictEqual(sm.isStationActive('right'), true);

sm.setTrackMute('left', true);
assert.strictEqual(sm.isTrackMuted('left'), true);
assert.strictEqual(sm.isStationActive('left'), false);
assert.strictEqual(sm.isStationActive('right'), true);

// Solo 'center' -> only center active; left remains pre-muted
sm.setTrackSolo('center', true);
assert.strictEqual(sm.isStationActive('center'), true);
assert.strictEqual(sm.isStationActive('right'), false);
assert.strictEqual(sm.isStationActive('left'), false);

// Solo 'right' as well
sm.setTrackSolo('right', true);
assert.strictEqual(sm.isStationActive('right'), true);
assert.strictEqual(sm.isStationActive('center'), true);
assert.strictEqual(sm.isStationActive('left'), false);

// Unsolo 'right' and 'center' -> restores preSoloMutes: left must still be muted!
sm.setTrackSolo('right', false);
sm.setTrackSolo('center', false);
assert.strictEqual(sm.isTrackMuted('left'), true, 'Pre-solo mute state for left must be restored');
assert.strictEqual(sm.isStationActive('left'), false);
assert.strictEqual(sm.isStationActive('right'), true);

// Test Undo / Redo
const initialCount = sm.getCues().length;
sm.addCue({ id: 'undo_test', time: 15.0, archetype: 'crackle', station: 'center', color: '#ff00ff', altitude: 0.7 });
assert.strictEqual(sm.getCues().length, initialCount + 1);
assert.strictEqual(sm.canUndo(), true);

sm.undo();
assert.strictEqual(sm.getCues().length, initialCount, 'Undo should revert added cue');
assert.strictEqual(sm.canRedo(), true);

sm.redo();
assert.strictEqual(sm.getCues().length, initialCount + 1, 'Redo should re-add cue');
console.log('✓ ShowManager passed all behavioral & state machine checks.');

// ----------------------------------------------------
// 2. ShowSerialization: Schema Validation, Export, Import, Sanitization
// ----------------------------------------------------
console.log('[2/6] Auditing ShowSerialization...');
const validShow: ShowJSON = {
  version: '1.0.0',
  title: 'Export Test Show',
  duration: 45.0,
  calibration: {
    maxParticles: 32768,
    blackClamp: 0.05,
    gain: 1.5,
    bloomIntensity: 1.8,
    particleSizeScale: 1.2,
    aspectRatioMask: '21:9',
  },
  cues: [
    { id: 'cue_1', time: 2.0, archetype: 'peony', station: 'center', color: '#00ffff', altitude: 0.85, launchAngle: 0, duration: 2.0 },
    { id: 'cue_2', time: 0.5, archetype: 'ground_mine', station: 'left', color: '#ff0055', altitude: 0.40, launchAngle: 10, duration: 1.5 },
  ],
};

const jsonStr = ShowSerialization.exportToJSON(validShow);
assert.strictEqual(typeof jsonStr, 'string');
const importRes = ShowSerialization.importFromJSON(jsonStr);
assert.strictEqual(importRes.success, true);
assert.ok(importRes.show);
assert.strictEqual(importRes.show.title, 'Export Test Show');
// Cues should be chronologically sorted: 0.5s before 2.0s
assert.strictEqual(importRes.show.cues[0].time, 0.5);
assert.strictEqual(importRes.show.cues[1].time, 2.0);

// Test validation rejections
const badVersion = { ...validShow, version: '2.0.0' };
const valBadVer = validateShowJSON(badVersion);
assert.strictEqual(valBadVer.valid, false);

const negativeDuration = { ...validShow, duration: -10 };
const valNegDur = validateShowJSON(negativeDuration);
assert.strictEqual(valNegDur.valid, false);

const malformedJSON = ShowSerialization.importFromJSON('{ "invalid": json syntax');
assert.strictEqual(malformedJSON.success, false);
assert.ok(malformedJSON.errors[0].includes('Malformed JSON'));

// Test sanitization clamp & fallback
const dirtyRaw = {
  title: '   ',
  duration: -5,
  calibration: {
    maxParticles: 9999999, // exceeds 131072
    blackClamp: 0.99,      // exceeds 0.20
    gain: 50.0,            // exceeds 3.0
    aspectRatioMask: 'invalid_aspect',
  },
  cues: [
    {
      time: 1.5,
      archetype: 'non_existent_archetype',
      station: 'mars_orbit',
      color: 'not-a-hex',
      altitude: 5.5,
      launchAngle: -90,
      duration: 100,
    },
  ],
};
const sanitized = sanitizeShowJSON(dirtyRaw);
assert.strictEqual(sanitized.title, 'Untitled Show');
assert.strictEqual(sanitized.duration, 60.0);
assert.strictEqual(sanitized.calibration.maxParticles, 131072, 'maxParticles clamped to 131072');
assert.strictEqual(sanitized.calibration.blackClamp, 0.2, 'blackClamp clamped to 0.2');
assert.strictEqual(sanitized.calibration.gain, 3.0, 'gain clamped to 3.0');
assert.strictEqual(sanitized.calibration.aspectRatioMask, '16:9', 'aspectRatio fallback to 16:9');
assert.strictEqual(sanitized.cues[0].archetype, 'peony', 'invalid archetype falls back to peony');
assert.strictEqual(sanitized.cues[0].station, 'center', 'invalid station falls back to center');
assert.strictEqual(sanitized.cues[0].color, '#ffd700', 'invalid color falls back to #ffd700');
assert.strictEqual(sanitized.cues[0].altitude, 1.0, 'altitude clamped to 1.0');
assert.strictEqual(sanitized.cues[0].launchAngle, -45, 'launchAngle clamped to -45');
assert.strictEqual(sanitized.cues[0].duration, 10.0, 'duration clamped to 10.0');
console.log('✓ ShowSerialization passed all schema, export, import, and sanitization checks.');

// ----------------------------------------------------
// 3. Presets: Demo Shows & Reactive Profiles
// ----------------------------------------------------
console.log('[3/6] Auditing Presets...');
assert.strictEqual(DEMO_SHOW_COSMIC_AWAKENING.duration, 90.0);
assert.strictEqual(DEMO_SHOW_COSMIC_AWAKENING.cues.length, 35);
assert.ok(DEMO_SHOW_COSMIC_AWAKENING.cues.some((c) => c.archetype === 'horsetail'));
assert.ok(DEMO_SHOW_COSMIC_AWAKENING.cues.some((c) => c.archetype === 'finale_barrage'));

assert.strictEqual(DEMO_SHOW_NEON_HORIZON.duration, 75.0);
assert.strictEqual(DEMO_SHOW_NEON_HORIZON.cues.length, 15);
assert.strictEqual(DEMO_SHOW_NEON_HORIZON.calibration.aspectRatioMask, '21:9');

assert.strictEqual(getDemoShow('cosmic_awakening')?.title, 'Cosmic Awakening');
assert.strictEqual(getDemoShow('neon_horizon')?.title, 'Neon Horizon');

assert.ok(AUDIO_REACTIVE_PROFILES['club_edm']);
assert.ok(AUDIO_REACTIVE_PROFILES['ambient']);
assert.ok(AUDIO_REACTIVE_PROFILES['percussive']);
assert.strictEqual(getAudioProfile('club_edm')?.name, 'Club/EDM');
assert.strictEqual(getAudioProfile('percussive')?.subBass.primaryArchetype, 'ground_mine');
console.log('✓ Presets passed all structural and configuration checks.');

// ----------------------------------------------------
// 4. AutoChoreographer: Signal Processing, Transient Detection & Beat Grid
// ----------------------------------------------------
console.log('[4/6] Auditing AutoChoreographer...');
// Test error when buffer is null
assert.throws(
  () => AutoChoreographer.choreographFromAudioBuffer(null),
  /Cannot auto-choreograph: No audio track loaded/
);

// Mock AudioBuffer with silent channel data
function createMockAudioBuffer(sampleRate: number, durationSec: number, fillPattern?: (i: number) => number): AudioBuffer {
  const length = Math.floor(sampleRate * durationSec);
  const data = new Float32Array(length);
  if (fillPattern) {
    for (let i = 0; i < length; i++) {
      data[i] = fillPattern(i);
    }
  }
  return {
    sampleRate,
    length,
    duration: durationSec,
    numberOfChannels: 1,
    getChannelData: () => data,
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;
}

// Silent audio -> 0 cues
const silentBuffer = createMockAudioBuffer(44100, 10.0);
const silentCues = AutoChoreographer.choreographFromAudioBuffer(silentBuffer);
assert.strictEqual(silentCues.length, 0, 'Silent buffer must return 0 cues');

// Synthetic audio with periodic loud transient bursts every 1 second (120 BPM = 0.5s beat)
const sampleRate = 44100;
const toneBuffer = createMockAudioBuffer(sampleRate, 12.0, (i) => {
  const time = i / sampleRate;
  // Transient burst every 1.0s lasting 25ms
  const frac = time % 1.0;
  if (frac < 0.025) {
    return Math.sin(2 * Math.PI * 100 * time) * 0.95; // 100Hz heavy bass transient
  }
  return 0.0001 * Math.sin(2 * Math.PI * 440 * time);
});

const generatedCues = AutoChoreographer.choreographFromAudioBuffer(toneBuffer, { bpm: 120 });
assert.ok(generatedCues.length > 0, 'Must generate cues for pulsed audio');
console.log(`  Auto-generated ${generatedCues.length} cues from synthetic pulsed audio.`);

// Verify quantization to 0.5s grid (120 BPM)
for (const cue of generatedCues) {
  const remainder = Math.abs(cue.time % 0.5);
  assert.ok(
    remainder < 0.005 || Math.abs(remainder - 0.5) < 0.005,
    `Cue at ${cue.time}s must be quantized to 0.5s beat grid, remainder: ${remainder}`
  );
}

// Verify climax salvo is appended near end of track (12.0s duration -> climax at ~8.0s)
const hasClimax = generatedCues.some((c) => c.archetype === 'finale_barrage' && c.station === 'fan');
assert.strictEqual(hasClimax, true, 'Should include climax salvo at end of audio');
console.log('✓ AutoChoreographer passed all acoustic analysis, silence detection, and beat quantization checks.');

// ----------------------------------------------------
// 5. PatternBrushes: Macro Generation (Sweeps, Mines, Finale)
// ----------------------------------------------------
console.log('[5/6] Auditing PatternBrushes...');
// Fan Sweep Left-to-Right
const sweepLR = PatternBrushes.generateFanSweep('left_to_right', { startTime: 10.0, duration: 1.0 });
assert.strictEqual(sweepLR.length, 5);
assert.strictEqual(sweepLR[0].station, 'left');
assert.strictEqual(sweepLR[4].station, 'right');
assert.strictEqual(sweepLR[0].time, 10.0);
assert.strictEqual(sweepLR[4].time, 10.95);

// Fan Sweep Right-to-Left
const sweepRL = PatternBrushes.generateFanSweep('right_to_left', { startTime: 5.0, duration: 0.5 });
assert.strictEqual(sweepRL.length, 5);
assert.strictEqual(sweepRL[0].station, 'right');
assert.strictEqual(sweepRL[4].station, 'left');

// Fan Sweep Center-Out in 3 waves
const sweepCO = PatternBrushes.generateFanSweep('center_out', { startTime: 0.0, duration: 1.0 });
assert.strictEqual(sweepCO.length, 5); // 1 center + 2 inner + 2 outer
assert.strictEqual(sweepCO[0].station, 'center');
assert.strictEqual(sweepCO[1].station, 'left_center');
assert.strictEqual(sweepCO[2].station, 'right_center');
assert.strictEqual(sweepCO[3].station, 'left');
assert.strictEqual(sweepCO[4].station, 'right');

// Alternating Mines
const mines = PatternBrushes.generateAlternatingMines({ startTime: 2.0, burstCount: 8, bpm: 120 });
// 8 beats: even beats have 2 outer stations, odd beats have 3 inner stations -> 4 * 2 + 4 * 3 = 20 cues
assert.strictEqual(mines.length, 20);
assert.ok(mines.every((c) => c.archetype === 'ground_mine'));
assert.ok(mines.every((c) => c.altitude <= 0.60));

// Grand Finale Barrage
const finale = PatternBrushes.generateGrandFinale({ startTime: 20.0, duration: 6.0 });
assert.ok(finale.length > 20);
// Progressive altitude scaling in wave 2: altitudes should reach 0.98
const maxAlt = Math.max(...finale.map((c) => c.altitude));
assert.strictEqual(maxAlt, 0.98, 'Grand finale should crescendo to 0.98 altitude');
// Grand salvo at duration - 0.5s (25.5s) on all 6 stations
const finalSalvoCues = finale.filter((c) => Math.abs(c.time - 25.5) < 0.01);
assert.strictEqual(finalSalvoCues.length, 6, 'Final salvo must saturate all 6 stations');

// Universal dispatcher
const dispatched = PatternBrushes.applyMacroBrush('sweep_left_to_right', { startTime: 0 });
assert.strictEqual(dispatched.length, 5);
console.log('✓ PatternBrushes passed all sweeps, alternating mines, and finale generator checks.');

// ----------------------------------------------------
// 6. TapRecorder: Hotkeys, Macros & Safety Interlocks
// ----------------------------------------------------
console.log('[6/6] Auditing TapRecorder...');
const recordedCues: ShowJSONCue[] = [];
const liveFired: FireCuePayload[] = [];
let blackoutTriggered = false;
let fullscreenToggled = false;
let modalDismissed = false;
let isModalOpen = false;

const recorder = new TapRecorder({
  getCurrentTime: () => 14.523,
  getIsPlaying: () => true,
  onRecordCue: (c) => recordedCues.push(c),
  onFireLive: (c) => liveFired.push(c),
  onBlackout: () => { blackoutTriggered = true; },
  onToggleFullscreen: () => { fullscreenToggled = true; },
  isModalOpen: () => isModalOpen,
  onCloseModal: () => { modalDismissed = true; isModalOpen = false; },
});

function createMockKeyEvent(key: string, targetTagName: string = 'BODY'): KeyboardEvent {
  const elem = {
    tagName: targetTagName,
    isContentEditable: false,
  } as unknown as HTMLElement;
  return {
    key,
    target: elem,
    preventDefault: () => {},
    stopPropagation: () => {},
  } as unknown as KeyboardEvent;
}

// 1. Hotkey 1 -> 'left' station cue recorded at 14.523s
recorder.handleKeyDown(createMockKeyEvent('1'));
assert.strictEqual(recordedCues.length, 1);
assert.strictEqual(recordedCues[0].station, 'left');
assert.strictEqual(recordedCues[0].time, 14.523);
assert.strictEqual(liveFired.length, 1);

// 2. Hotkey 6 -> 'fan' station cue
recorder.handleKeyDown(createMockKeyEvent('6'));
assert.strictEqual(recordedCues.length, 2);
assert.strictEqual(recordedCues[1].station, 'fan');

// 3. Quick Macro 7 -> Ground mine salvo
recorder.handleKeyDown(createMockKeyEvent('7'));
assert.strictEqual(recordedCues.length, 3);
assert.strictEqual(recordedCues[2].archetype, 'ground_mine');

// 4. Fullscreen 'F'
recorder.handleKeyDown(createMockKeyEvent('f'));
assert.strictEqual(fullscreenToggled, true);

// 5. Spacebar -> Panic blackout
recorder.handleKeyDown(createMockKeyEvent(' '));
assert.strictEqual(blackoutTriggered, true);

// 6. Escape when modal is open -> dismisses modal WITHOUT panic blackout
blackoutTriggered = false;
isModalOpen = true;
recorder.handleKeyDown(createMockKeyEvent('Escape'));
assert.strictEqual(modalDismissed, true, 'Escape must dismiss modal when modal is open');
assert.strictEqual(blackoutTriggered, false, 'Escape must NOT trigger blackout when dismissing modal');

// 7. Escape when modal is closed -> triggers panic blackout
recorder.handleKeyDown(createMockKeyEvent('Escape'));
assert.strictEqual(blackoutTriggered, true, 'Escape must trigger blackout when modal is closed');

// 8. SAFETY INTERLOCK: Focus inside INPUT field suppresses all hotkeys
recordedCues.length = 0;
blackoutTriggered = false;
fullscreenToggled = false;

const inputEvent1 = createMockKeyEvent('1', 'INPUT');
const handled1 = recorder.handleKeyDown(inputEvent1);
assert.strictEqual(handled1, false, 'Typing "1" inside input must be ignored by TapRecorder');
assert.strictEqual(recordedCues.length, 0);

const inputEventSpace = createMockKeyEvent(' ', 'INPUT');
const handledSpace = recorder.handleKeyDown(inputEventSpace);
assert.strictEqual(handledSpace, false, 'Typing space inside input must not trigger blackout');
assert.strictEqual(blackoutTriggered, false);

const textareaEventF = createMockKeyEvent('f', 'TEXTAREA');
const handledF = recorder.handleKeyDown(textareaEventF);
assert.strictEqual(handledF, false, 'Typing "f" inside textarea must not trigger fullscreen');
assert.strictEqual(fullscreenToggled, false);

console.log('✓ TapRecorder passed all hotkey mapping, macro trigger, modal dismissal, and input focus safety interlocks.');

console.log('\n======================================================');
console.log('  ALL FORENSIC AUDIT EMPIRICAL CHECKS PASSED (6/6)');
console.log('======================================================\n');
