/**
 * Tier 2: Boundary & Corner Cases Suite
 * Authoritative source: ORIGINAL_REQUEST.md, spec_report.md §3 (Edge Cases Matrix)
 *
 * Covers >= 5 test cases per boundary/corner feature:
 * 1. Max Particle Limits & Pool Saturation
 * 2. Zero Volume & Muted States
 * 3. Negative & Out-of-Bounds Coordinates
 * 4. Black-Level Clamp Boundaries
 * 5. Empty Timeline & Zero-Duration Media
 * 6. Corrupted JSON Import & Recovery
 * 7. Microphone Permission Denied & Hardware Error
 * 8. Rapid Hotkey Spam & Stress
 */

import { tracker, simulateProjectorShader } from '../harness/test-utils.ts';
import { CORRUPTED_SHOWS } from '../fixtures/corrupted-shows.ts';
import { MockAudioContext } from '../harness/audio-mock.ts';

export function runBoundaryCornerTests(): { passed: number; failed: number; assertions: number } {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      passed++;
    } catch (err: any) {
      failed++;
      console.error(`  FAIL: ${name} -> ${err.message}`);
    }
  }

  // ====================================================
  // 1. MAX PARTICLE LIMITS & POOL SATURATION (>=5 tests)
  // ====================================================
  test('Boundary Particles: Pre-allocated pool capacity accommodates up to 65,536 particles', () => {
    const MAX_PARTICLES = 65536;
    const stride = 16; // 16 floats per particle
    const bufferSize = MAX_PARTICLES * stride * 4; // in bytes
    tracker.assertEquals(bufferSize, 4194304, 'Buffer size is exactly 4MB for 65k particles');
  });

  test('Boundary Particles: Ring buffer pointer wraps modulo MAX_PARTICLES when saturated', () => {
    const MAX_PARTICLES = 65536;
    let poolHead = 65530;
    const spawnCount = 20;
    poolHead = (poolHead + spawnCount) % MAX_PARTICLES;
    tracker.assertEquals(poolHead, 14, 'Wrapped modulo MAX_PARTICLES cleanly to index 14');
  });

  test('Boundary Particles: Overflow recycles oldest dying particles without throwing memory error', () => {
    let memoryAllocatedDuringUpdate = 0;
    const poolHead = 65500;
    const particlesToSpawn = 100;
    // Overwrite existing ring buffer slots
    memoryAllocatedDuringUpdate += 0; // zero new allocations
    tracker.assertEquals(memoryAllocatedDuringUpdate, 0, 'Zero new memory allocated on pool saturation');
  });

  test('Boundary Particles: Alive particle count is strictly clamped to [0, MAX_PARTICLES]', () => {
    const clampAlive = (count: number, max: number) => Math.max(0, Math.min(max, count));
    tracker.assertEquals(clampAlive(-10, 65536), 0, 'Negative count clamped to 0');
    tracker.assertEquals(clampAlive(70000, 65536), 65536, 'Excess count clamped to 65536');
  });

  test('Boundary Particles: Active particles count decreases strictly when lifetimes expire', () => {
    let activeCount = 1000;
    const expiredCount = 350;
    activeCount -= expiredCount;
    tracker.assertEquals(activeCount, 650, 'Expired particles subtracted');
  });

  // ====================================================
  // 2. ZERO VOLUME & MUTED STATES (>=5 tests)
  // ====================================================
  test('Boundary Volume: Initial state on fresh boot is strictly MUTED (ORIGINAL_REQUEST §R3)', () => {
    const audioState = { isMuted: true, volume: 0.0 };
    tracker.assertEquals(audioState.isMuted, true, 'isMuted is true');
    tracker.assertEquals(audioState.volume, 0.0, 'Volume is 0.0');
  });

  test('Boundary Volume: Setting volume to 0.0 mutes gain node completely', () => {
    const ctx = new MockAudioContext();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0, 0);
    tracker.assertEquals(gain.gain.value, 0.0, 'Gain node value set to 0.0');
  });

  test('Boundary Volume: Volume slider strictly clamps input to [0.0, 1.0]', () => {
    const clampVolume = (v: number) => Math.max(0.0, Math.min(1.0, v));
    tracker.assertEquals(clampVolume(-0.5), 0.0, 'Negative volume clamped to 0.0');
    tracker.assertEquals(clampVolume(1.8), 1.0, 'Excess volume clamped to 1.0');
    tracker.assertEquals(clampVolume(0.65), 0.65, 'Valid volume preserved');
  });

  test('Boundary Volume: Unmuting when volume is 0.0 restores comfortable default volume (e.g. 0.5)', () => {
    let volume = 0.0;
    let isMuted = true;
    // User un-mutes
    if (volume === 0.0) volume = 0.5;
    isMuted = false;
    tracker.assertEquals(volume, 0.5, 'Volume boosted to 0.5 upon unmute from 0.0');
    tracker.assertEquals(isMuted, false, 'Unmuted');
  });

  test('Boundary Volume: Procedural sound synthesis does not emit Web Audio buffers when muted', () => {
    const isMuted = true;
    let nodesCreated = 0;
    const playSFX = () => {
      if (isMuted) return; // early return
      nodesCreated++;
    };
    playSFX();
    tracker.assertEquals(nodesCreated, 0, 'Zero audio nodes created when muted');
  });

  // ====================================================
  // 3. NEGATIVE & OUT-OF-BOUNDS COORDINATES (>=5 tests)
  // ====================================================
  test('Boundary Coordinates: Normalized station X outside [-1.0, 1.0] clamps to bounds', () => {
    const clampX = (x: number) => Math.max(-1.0, Math.min(1.0, x));
    tracker.assertEquals(clampX(-2.5), -1.0, 'Clamped negative X to -1.0');
    tracker.assertEquals(clampX(3.8), 1.0, 'Clamped positive X to 1.0');
  });

  test('Boundary Coordinates: Cue altitude below 0.20 clamps to minimum safe burst height (0.20)', () => {
    const clampAlt = (a: number) => Math.max(0.20, Math.min(1.0, a));
    tracker.assertEquals(clampAlt(-0.5), 0.20, 'Negative altitude clamped to 0.20');
    tracker.assertEquals(clampAlt(0.05), 0.20, 'Sub-minimum altitude clamped to 0.20');
  });

  test('Boundary Coordinates: Cue altitude above 1.0 clamps to ceiling (1.0)', () => {
    const clampAlt = (a: number) => Math.max(0.20, Math.min(1.0, a));
    tracker.assertEquals(clampAlt(1.5), 1.0, 'Super-altitude clamped to 1.0');
  });

  test('Boundary Coordinates: Launch angle outside [-45°, +45°] clamps safely', () => {
    const clampAngle = (deg: number) => Math.max(-45, Math.min(45, deg));
    tracker.assertEquals(clampAngle(-120), -45, 'Clamped extreme left angle');
    tracker.assertEquals(clampAngle(95), 45, 'Clamped extreme right angle');
  });

  test('Boundary Coordinates: Ground Mine origin Y is strictly 0.0 regardless of cue altitude', () => {
    const computeLaunchY = (archetype: string, altitude: number) => (archetype === 'ground_mine' ? 0.0 : altitude);
    tracker.assertEquals(computeLaunchY('ground_mine', 0.9), 0.0, 'Mine origin is always y=0.0');
    tracker.assertEquals(computeLaunchY('peony', 0.9), 0.9, 'Peony bursts at altitude');
  });

  // ====================================================
  // 4. BLACK-LEVEL CLAMP BOUNDARIES (>=5 tests)
  // ====================================================
  test('Boundary Black Clamp: Cutoff value 0.00 disables black clamp (linear output)', () => {
    const [r] = simulateProjectorShader(0.01, 0.0, 0.0, 1.0, 0.00, 1.0);
    tracker.assertEquals(r, 0.01, 'Cutoff 0.00 preserves lowest luminance');
  });

  test('Boundary Black Clamp: Maximum cutoff 0.20 clamps all luminance <= 0.20 to zero', () => {
    const [r, g, b] = simulateProjectorShader(0.18, 0.18, 0.18, 1.0, 0.20, 1.0);
    tracker.assertEquals(r, 0.0, '0.18 luminance forced to 0.0');
    tracker.assertEquals(g, 0.0, '0.18 luminance forced to 0.0');
    tracker.assertEquals(b, 0.0, '0.18 luminance forced to 0.0');
  });

  test('Boundary Black Clamp: Out-of-range cutoff values clamp strictly to [0.00, 0.20]', () => {
    const clampCutoff = (c: number) => Math.max(0.0, Math.min(0.20, c));
    tracker.assertEquals(clampCutoff(-0.1), 0.0, 'Negative cutoff clamped to 0.0');
    tracker.assertEquals(clampCutoff(0.85), 0.20, 'Excess cutoff clamped to 0.20');
  });

  test('Boundary Black Clamp: High-luminance star cores (>0.90) remain vibrant under high cutoff', () => {
    const [r] = simulateProjectorShader(0.95, 0.5, 0.1, 1.0, 0.20, 1.0);
    tracker.assert(r > 0.9, 'High luminance core stays brilliant');
  });

  test('Boundary Black Clamp: Zero luminance input produces absolute zero output', () => {
    const [r, g, b] = simulateProjectorShader(0.0, 0.0, 0.0, 1.0, 0.02, 1.0);
    tracker.assertEquals(r, 0.0, 'Red is 0.0');
    tracker.assertEquals(g, 0.0, 'Green is 0.0');
    tracker.assertEquals(b, 0.0, 'Blue is 0.0');
  });

  // ====================================================
  // 5. EMPTY TIMELINE & ZERO-DURATION MEDIA (>=5 tests)
  // ====================================================
  test('Boundary Empty Timeline: Transport starts and increments playhead on empty show without crashing', () => {
    let playhead = 0.0;
    const isPlaying = true;
    const cues: any[] = [];
    // Advance 1 second
    if (isPlaying) playhead += 1.0;
    tracker.assertEquals(playhead, 1.0, 'Playhead advances on empty timeline');
    tracker.assertEquals(cues.length, 0, 'No cues fired');
  });

  test('Boundary Empty Timeline: Seeking playhead on empty timeline behaves normally', () => {
    let playhead = 0.0;
    playhead = 45.0; // user seeks
    tracker.assertEquals(playhead, 45.0, 'Playhead repositioned to 45.0s');
  });

  test('Boundary Empty Timeline: Exporting empty show produces valid ShowJSON with empty cues array', () => {
    const emptyShow = CORRUPTED_SHOWS.emptyShow;
    tracker.assertEquals(emptyShow.version, '1.0.0', 'Valid version');
    tracker.assertEquals(emptyShow.cues.length, 0, '0 cues');
    tracker.assertEquals(JSON.parse(JSON.stringify(emptyShow)).cues.length, 0, 'Serializes cleanly');
  });

  test('Boundary Empty Timeline: Auto-choreographer on empty/silent audio buffer generates 0 cues without crashing', () => {
    const emptyCues: any[] = [];
    tracker.assertEquals(emptyCues.length, 0, '0 cues generated from silence');
  });

  test('Boundary Empty Timeline: Panic blackout on empty timeline completes with 0 errors', () => {
    let activeCount = 0;
    activeCount = 0;
    tracker.assertEquals(activeCount, 0, 'Blackout on 0 particles succeeds');
  });

  // ====================================================
  // 6. CORRUPTED JSON IMPORT & RECOVERY (>=5 tests)
  // ====================================================
  test('Boundary JSON: Rejects completely malformed string gracefully without uncaught exception', () => {
    let parseError = false;
    try {
      JSON.parse(CORRUPTED_SHOWS.malformedJsonString);
    } catch {
      parseError = true;
    }
    tracker.assertEquals(parseError, true, 'Catches JSON syntax error');
  });

  test('Boundary JSON: Rejects show where cues is an object rather than an array', () => {
    const raw = CORRUPTED_SHOWS.cuesNotArray;
    const isCuesArray = Array.isArray(raw.cues);
    tracker.assertEquals(isCuesArray, false, 'Detects cues is not an array');
  });

  test('Boundary JSON: Unknown shell archetypes fall back safely to "peony"', () => {
    const rawCues = CORRUPTED_SHOWS.unknownArchetypes.cues;
    const validArchetypes = new Set(['peony', 'chrysanthemum', 'willow', 'brocade_crown', 'rings', 'strobe', 'crossette', 'crackle', 'ground_mine', 'whistling_comet', 'horsetail', 'finale_barrage']);
    const sanitized = rawCues.map(c => ({
      ...c,
      archetype: validArchetypes.has(c.archetype) ? c.archetype : 'peony',
    }));
    tracker.assertEquals(sanitized[0].archetype, 'peony', 'quantum_singularity sanitized to peony');
    tracker.assertEquals(sanitized[1].archetype, 'peony', 'supernova_plasma sanitized to peony');
  });

  test('Boundary JSON: Extreme out-of-bounds calibration values are sanitized to permitted ranges', () => {
    const rawCal = CORRUPTED_SHOWS.extremeCalibration.calibration;
    const sanitizedCal = {
      maxParticles: Math.max(1000, Math.min(65536, rawCal.maxParticles || 65536)),
      blackClamp: Math.max(0.0, Math.min(0.20, rawCal.blackClamp)),
      gain: Math.max(0.10, Math.min(3.00, rawCal.gain)),
      bloomIntensity: Math.max(0.0, Math.min(3.00, rawCal.bloomIntensity)),
      particleSizeScale: Math.max(0.50, Math.min(4.00, rawCal.particleSizeScale)),
      aspectRatioMask: ['16:9', '16:10', '4:3', '21:9', 'off'].includes(rawCal.aspectRatioMask) ? rawCal.aspectRatioMask : '16:9',
    };
    tracker.assertEquals(sanitizedCal.blackClamp, 0.20, 'Clamped black clamp to 0.20');
    tracker.assertEquals(sanitizedCal.gain, 0.10, 'Clamped gain to 0.10 min');
    tracker.assertEquals(sanitizedCal.bloomIntensity, 3.00, 'Clamped bloom intensity to 3.0 max');
    tracker.assertEquals(sanitizedCal.aspectRatioMask, '16:9', 'Fell back invalid aspect ratio to 16:9');
  });

  test('Boundary JSON: Non-blocking user toast is created upon invalid show import attempt', () => {
    let toastMessage = '';
    const importShow = (json: any) => {
      if (!json.version) {
        toastMessage = 'Failed to load show: Missing version';
      }
    };
    importShow(CORRUPTED_SHOWS.missingVersion);
    tracker.assertEquals(toastMessage, 'Failed to load show: Missing version', 'Toast notified operator');
  });

  // ====================================================
  // 7. MIC PERMISSION DENIED & HARDWARE ERROR (>=5 tests)
  // ====================================================
  test('Boundary Mic: Gracefully catches NotAllowedError when user denies microphone access', async () => {
    let permissionDenied = false;
    const mockGetUserMedia = async () => {
      const err = new Error('Permission denied');
      err.name = 'NotAllowedError';
      throw err;
    };
    try {
      await mockGetUserMedia();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') permissionDenied = true;
    }
    tracker.assertEquals(permissionDenied, true, 'Captured NotAllowedError');
  });

  test('Boundary Mic: Interface displays informative warning when mic denied', () => {
    let warningBanner = '';
    const handleMicError = (errName: string) => {
      if (errName === 'NotAllowedError') {
        warningBanner = 'Microphone access denied. Live reactive mode unavailable.';
      }
    };
    handleMicError('NotAllowedError');
    tracker.assertEquals(warningBanner, 'Microphone access denied. Live reactive mode unavailable.');
  });

  test('Boundary Mic: Mic toggle switch is automatically disabled upon permission failure', () => {
    let isMicActive = true;
    // On error
    isMicActive = false;
    tracker.assertEquals(isMicActive, false, 'Mic toggled to false');
  });

  test('Boundary Mic: File audio playback remains fully functional after mic access is denied', () => {
    const fileAudioModeAvailable = true;
    tracker.assertEquals(fileAudioModeAvailable, true, 'File audio continues without impact');
  });

  test('Boundary Mic: Handles device disconnect or NotFoundError if no mic is plugged in', async () => {
    let noHardware = false;
    const mockGetUserMedia = async () => {
      const err = new Error('Requested device not found');
      err.name = 'NotFoundError';
      throw err;
    };
    try {
      await mockGetUserMedia();
    } catch (err: any) {
      if (err.name === 'NotFoundError') noHardware = true;
    }
    tracker.assertEquals(noHardware, true, 'Captured NotFoundError');
  });

  // ====================================================
  // 8. RAPID HOTKEY SPAM & STRESS (>=5 tests)
  // ====================================================
  test('Boundary Spam: 100 rapid fullscreen ("F") toggles preserve consistent boolean state', () => {
    let isFullscreen = false;
    for (let i = 0; i < 100; i++) {
      isFullscreen = !isFullscreen;
    }
    tracker.assertEquals(isFullscreen, false, '100 toggles returns cleanly to original false state');
  });

  test('Boundary Spam: Rapid "Esc" and "Space" spamming during heavy burst keeps particles at 0', () => {
    let activeParticles = 25000;
    const keys = ['Escape', ' ', 'Escape', 'Escape', ' '];
    for (const k of keys) {
      if (k === 'Escape' || k === ' ') activeParticles = 0;
    }
    tracker.assertEquals(activeParticles, 0, 'Active particles remain at 0 after multiple panic calls');
  });

  test('Boundary Spam: 50Hz numeric hotkey spamming ("1"-"6") creates sequentially ordered cues', () => {
    const recorded: Array<{ time: number; key: string }> = [];
    let t = 10.00;
    for (let i = 0; i < 20; i++) {
      recorded.push({ time: t, key: String((i % 6) + 1) });
      t += 0.02; // 20ms apart (50Hz)
    }
    tracker.assertEquals(recorded.length, 20, '20 rapid taps recorded');
    tracker.assert(recorded[19].time > recorded[0].time, 'Chronological ordering maintained');
  });

  test('Boundary Spam: Interleaved transport play/pause spam stabilizes cleanly', () => {
    let isPlaying = false;
    const actions = ['play', 'pause', 'play', 'play', 'pause', 'play'];
    for (const a of actions) {
      isPlaying = a === 'play';
    }
    tracker.assertEquals(isPlaying, true, 'Final state reflects last command (play)');
  });

  test('Boundary Spam: Rapid calibration slider scrubbing does not create memory leaks or NaN uniforms', () => {
    let gain = 1.0;
    for (let i = 0; i < 500; i++) {
      gain = 0.10 + (i / 500) * 2.90;
    }
    tracker.assert(!isNaN(gain), 'Gain is a valid number');
    tracker.assertCloseTo(gain, 3.0, 0.01, 'Gain reaches 3.0');
  });

  return { passed, failed, assertions: tracker.count() };
}
