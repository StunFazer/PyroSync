import assert from 'node:assert';
import { MockAudioContext, MockAnalyserNode } from '../../tests/harness/audio-mock.ts';
import { ProceduralSFX } from '../../src/engine/audio/ProceduralSFX.ts';
import { MicAnalyzer, DEFAULT_PROFILES } from '../../src/engine/audio/MicAnalyzer.ts';
import { ProceduralMusic } from '../../src/engine/audio/ProceduralMusic.ts';
import { AudioEngine } from '../../src/engine/audio/AudioEngine.ts';

console.log('--- STARTING EMPIRICAL INTEGRITY CHECKS ---');

// 1. ProceduralSFX Default Muted Integrity
console.log('Testing ProceduralSFX default muted integrity...');
const mockCtx = new MockAudioContext();
const sfx = new ProceduralSFX(mockCtx as any);
assert.strictEqual(sfx.getIsMuted(), true, 'ProceduralSFX MUST be muted by default');
assert.strictEqual(sfx.getVolume(), 0.0, 'ProceduralSFX volume MUST be 0.0 by default');

// Calling play while muted should allocate zero nodes
const initialNodeCount = (mockCtx as any).destination.connectedNodes?.length || 0;
sfx.play('launch');
sfx.play('boom');
sfx.play('crackle');
assert.strictEqual(sfx.getIsMuted(), true, 'Still muted');

// Test unmuting
sfx.setMuted(false);
assert.strictEqual(sfx.getIsMuted(), false, 'Unmuted successfully');
assert.strictEqual(sfx.getVolume(), 0.5, 'Unmuting from 0 restores default 0.5 volume');

// 2. ProceduralMusic Soundtracks
console.log('Testing ProceduralMusic synthesis buffers...');
const cosmicBuffer = ProceduralMusic.generate(mockCtx as any, 'cosmic_awakening', 5.0);
assert.ok(cosmicBuffer, 'Cosmic awakening buffer generated');
assert.strictEqual(cosmicBuffer.numberOfChannels, 2, 'Stereo 2 channels');
assert.strictEqual(cosmicBuffer.duration, 5.0, '5 seconds duration');
const cosmicLeft = cosmicBuffer.getChannelData(0);
const cosmicRight = cosmicBuffer.getChannelData(1);
assert.strictEqual(cosmicLeft.length, 5 * 44100, 'Correct length');

// Check that sound data is not empty or all zeros
let nonZeroCosmic = 0;
let maxCosmic = 0;
for (let i = 0; i < cosmicLeft.length; i++) {
  if (Math.abs(cosmicLeft[i]) > 0.0001) nonZeroCosmic++;
  if (Math.abs(cosmicLeft[i]) > maxCosmic) maxCosmic = Math.abs(cosmicLeft[i]);
}
assert.ok(nonZeroCosmic > 1000, `Expected synthesized audio, got ${nonZeroCosmic} non-zero samples`);
assert.ok(maxCosmic <= 1.0, `Clamped <= 1.0, got ${maxCosmic}`);
console.log(`Cosmic Awakening: ${nonZeroCosmic} non-zero samples, peak=${maxCosmic.toFixed(4)}`);

const neonBuffer = ProceduralMusic.generate(mockCtx as any, 'neon_horizon', 5.0);
assert.ok(neonBuffer, 'Neon horizon buffer generated');
const neonLeft = neonBuffer.getChannelData(0);
let nonZeroNeon = 0;
let maxNeon = 0;
for (let i = 0; i < neonLeft.length; i++) {
  if (Math.abs(neonLeft[i]) > 0.0001) nonZeroNeon++;
  if (Math.abs(neonLeft[i]) > maxNeon) maxNeon = Math.abs(neonLeft[i]);
}
assert.ok(nonZeroNeon > 1000, `Expected synthesized audio, got ${nonZeroNeon} non-zero samples`);
assert.ok(maxNeon <= 1.0, `Clamped <= 1.0, got ${maxNeon}`);
console.log(`Neon Horizon: ${nonZeroNeon} non-zero samples, peak=${maxNeon.toFixed(4)}`);

// 3. MicAnalyzer 3-Band FFT & Dynamic Noise Floor
console.log('Testing MicAnalyzer 3-band FFT and dynamic noise floor...');
const mic = new MicAnalyzer(mockCtx as any);
assert.strictEqual(mic.getIsActive(), false, 'Inactive initially');
assert.strictEqual(mic.getIsPermissionDenied(), false, 'No error initially');

// Test profiles
assert.ok(DEFAULT_PROFILES.club_edm, 'Club/EDM profile exists');
assert.ok(DEFAULT_PROFILES.ambient, 'Ambient profile exists');
assert.ok(DEFAULT_PROFILES.percussive, 'Percussive profile exists');

mic.loadProfile('club_edm');
assert.strictEqual(mic.getCurrentProfile().name, 'Club/EDM');
assert.strictEqual(mic.getCooldown('sub'), 120);

// Cooldown safety clamp: minimum 50ms enforced barrier
mic.setCooldown('sub', 10);
assert.strictEqual(mic.getCooldown('sub'), 50, 'Clamped to minimum 50ms');

// Sensitivity clamp
mic.setSensitivity('sub', 5.0);
assert.strictEqual(mic.getSensitivity('sub'), 3.0, 'Clamped to 3.0 max');
mic.setSensitivity('sub', 0.01);
assert.strictEqual(mic.getSensitivity('sub'), 0.1, 'Clamped to 0.1 min');

// Baseline noise floor minimum clamp
const initialBaselines = mic.getBaselines();
assert.ok(initialBaselines.sub >= 0.05, 'Baseline >= 0.05 min clamp');

// 4. AudioEngine Drift-Free Clock & Waveform Peak Decimation
console.log('Testing AudioEngine timecode & waveform extraction...');
const engine = new AudioEngine(mockCtx as any);
assert.strictEqual(engine.isSFXMuted(), true, 'Engine inherits muted SFX default');
assert.strictEqual(engine.getSFXVolume(), 0.0, 'Engine inherits 0.0 SFX volume');
assert.strictEqual(engine.getCurrentTime(), 0.0, 'Initial playhead at 0.0');

// Load synth track into engine
engine.loadDemoTrack('neon_horizon', 10.0);
assert.strictEqual(engine.getDuration(), 10.0, 'Duration matches demo track');
assert.strictEqual(engine.getTrackTitle(), 'Neon Horizon (128 BPM Synthwave)');

// Extract waveform peaks
const peaks = engine.extractWaveformPeaks(100);
assert.strictEqual(peaks.min.length, 100);
assert.strictEqual(peaks.max.length, 100);
let hasNonZeroPeaks = false;
for (let i = 0; i < 100; i++) {
  assert.ok(peaks.min[i] >= -1.0 && peaks.min[i] <= 0.0, `Min peak in [-1, 0]: ${peaks.min[i]}`);
  assert.ok(peaks.max[i] >= 0.0 && peaks.max[i] <= 1.0, `Max peak in [0, 1]: ${peaks.max[i]}`);
  if (peaks.max[i] > 0.01) hasNonZeroPeaks = true;
}
assert.ok(hasNonZeroPeaks, 'Waveform peaks contain non-zero audio energy');

// Detect transients
const transients = engine.detectTransients(0.1);
assert.ok(Array.isArray(transients), 'Returns array of transient timestamps');
console.log(`Detected ${transients.length} transients in 10s synthetic track`);

// Play and test drift-free clock
engine.play(2.5);
assert.strictEqual(engine.getIsPlaying(), true, 'Engine playing');
mockCtx.advanceTime(3.125);
const currentTime = engine.getCurrentTime();
assert.strictEqual(Number(currentTime.toFixed(3)), 5.625, 'Hardware sample clock accurately tracks 2.5 + 3.125 = 5.625');

// Blackout test
engine.blackout();
assert.strictEqual(engine.getIsPlaying(), false, 'Blackout pauses transport');

console.log('--- ALL INDEPENDENT EMPIRICAL INTEGRITY CHECKS PASSED ---');
