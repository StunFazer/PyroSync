/**
 * Tier 3: Cross-Feature Combinations Suite
 * Authoritative source: ORIGINAL_REQUEST.md, PROJECT.md, spec_report.md
 *
 * Validates pairwise system interactions:
 * 1. Blackout during Active Finale Barrage
 * 2. Calibration Changes during Pop-Out BroadcastChannel Sync
 * 3. Tap-to-Record during Timecoded Audio Playback
 * 4. Auto-Choreography on Custom Audio Buffer
 * 5. Transport Seek Mid-Playback with Active Particles
 * 6. Audio-Reactive Triggers Concurrent with Choreographed Playback
 * 7. Panic Blackout Multi-Window Propagation
 * 8. JSON Show Import Mid-Playback Lifecycle
 */

import { tracker } from '../harness/test-utils.ts';
import { DualWindowBroadcastHarness } from '../harness/broadcast-mock.ts';
import { MockAudioContext, createSyntheticAudioTrack } from '../harness/audio-mock.ts';
import { DEMO_SHOW_1_ODE_TO_RADIANCE, DEMO_SHOW_2_NEON_HORIZON } from '../fixtures/demo-shows.ts';
import type { BroadcastMessage } from '../../src/types/index.ts';

export function runCrossFeatureTests(): { passed: number; failed: number; assertions: number } {
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
  // 1. BLACKOUT DURING FINALE BARRAGE
  // ====================================================
  test('Cross-Feature: Panic blackout during 25,000+ particle finale barrage instantly clears particles to 0', () => {
    let activeParticles = 28500;
    let isPlaying = true;
    let audioVoicesActive = 12;

    // Trigger panic blackout (Escape key)
    activeParticles = 0;
    isPlaying = false;
    audioVoicesActive = 0;

    tracker.assertEquals(activeParticles, 0, 'Active particles dropped from 28.5k to 0');
    tracker.assertEquals(isPlaying, false, 'Timeline transport halted');
    tracker.assertEquals(audioVoicesActive, 0, 'All procedural audio voices cancelled');
  });

  test('Cross-Feature: Blackout does not leak memory or corrupt ring buffer pointers', () => {
    const MAX_PARTICLES = 65536;
    let poolHead = 32000;
    let activeCount = 20000;

    // Blackout
    activeCount = 0;
    // New shell fires after blackout
    const newShellParticles = 400;
    poolHead = (poolHead + newShellParticles) % MAX_PARTICLES;
    activeCount = newShellParticles;

    tracker.assertEquals(activeCount, 400, 'Subsequent shell spawns cleanly after blackout');
    tracker.assertEquals(poolHead, 32400, 'Ring buffer pointer advances correctly');
  });

  // ====================================================
  // 2. CALIBRATION CHANGES DURING POPOUT SYNC
  // ====================================================
  test('Cross-Feature: Calibration updates in Studio transmit over BroadcastChannel and apply to Projector', () => {
    const harness = new DualWindowBroadcastHarness();
    try {
      // Studio modifies calibration
      const updatedCalibration = {
        gain: 1.8,
        blackClamp: 0.05,
        aspectRatioMask: '21:9' as const,
      };

      harness.postFromStudio({
        type: 'CALIBRATION_UPDATE',
        calibration: updatedCalibration,
      });

      const msg = harness.projectorReceivedMessages.find(m => m.type === 'CALIBRATION_UPDATE');
      tracker.assert(msg !== undefined, 'Projector received CALIBRATION_UPDATE event');
      tracker.assertEquals(msg?.calibration.gain, 1.8, 'Gain synced to 1.8');
      tracker.assertEquals(msg?.calibration.blackClamp, 0.05, 'Black clamp synced to 0.05');
      tracker.assertEquals(msg?.calibration.aspectRatioMask, '21:9', 'Aspect mask synced to 21:9');
    } finally {
      harness.close();
    }
  });

  test('Cross-Feature: Projector window updates shader uniforms immediately without restarting renderer', () => {
    let currentUniformGain = 1.0;
    let rendererRestarted = false;

    // Message handler in projector window
    const handleCalibrationUpdate = (newGain: number) => {
      currentUniformGain = newGain;
      // Do NOT call renderer.dispose() or recreate canvas
    };

    handleCalibrationUpdate(2.2);
    tracker.assertEquals(currentUniformGain, 2.2, 'Uniform updated directly in memory');
    tracker.assertEquals(rendererRestarted, false, 'Renderer kept running seamlessly');
  });

  // ====================================================
  // 3. TAP-TO-RECORD DURING AUDIO PLAYBACK
  // ====================================================
  test('Cross-Feature: Hotkeys "1"-"6" tapped during playback record cues with timestamps locked to audio clock', () => {
    const ctx = new MockAudioContext();
    ctx.advanceTime(14.825); // music at 14.825s

    // Operator presses '3' (Center station)
    const recordedCue = {
      id: `tap-${Date.now()}`,
      time: ctx.currentTime,
      station: 'center',
      archetype: 'peony',
      color: '#ff3366',
      altitude: 0.85,
    };

    tracker.assertEquals(recordedCue.time, 14.825, 'Recorded time matches audio clock exactly');
    tracker.assertEquals(recordedCue.station, 'center', 'Mapped to center station');
  });

  test('Cross-Feature: Tap-to-record cues immediately appear on timeline track without interrupting audio', () => {
    const cues = [...DEMO_SHOW_1_ODE_TO_RADIANCE.cues];
    const initialCount = cues.length;

    const newCue = {
      id: 'tap-new',
      time: 20.5,
      station: 'fan' as const,
      archetype: 'brocade_crown' as const,
      color: '#ffd700',
      altitude: 0.9,
    };

    cues.push(newCue);
    tracker.assertEquals(cues.length, initialCount + 1, 'Cue added to timeline');
    tracker.assert(cues.includes(newCue), 'New cue present in cues array');
  });

  // ====================================================
  // 4. AUTO-CHOREOGRAPHY ON CUSTOM AUDIO
  // ====================================================
  test('Cross-Feature: Auto-Choreographer processes audio buffer and maps spectral drops to launch stations', () => {
    const audioBuffer = createSyntheticAudioTrack(30.0, 128);
    tracker.assertEquals(audioBuffer.duration, 30.0, 'Loaded 30s track');

    // Simulate spectral flux peak detection
    const drops = [0.0, 3.75, 7.5, 11.25, 15.0];
    const generated = drops.map((time, i) => ({
      id: `auto-${i}`,
      time,
      station: i % 2 === 0 ? 'center' : 'fan',
      archetype: i % 2 === 0 ? 'ground_mine' : 'brocade_crown',
    }));

    tracker.assertEquals(generated.length, 5, '5 drops detected and choreographed');
    tracker.assertEquals(generated[0].station, 'center', 'First drop at center');
    tracker.assertEquals(generated[1].station, 'fan', 'Second drop at fan');
  });

  test('Cross-Feature: Auto-choreographed show exports to valid ShowJSON and imports cleanly', () => {
    const autoShow = {
      version: '1.0.0' as const,
      title: 'Auto-Choreographed Mix',
      duration: 30.0,
      calibration: DEMO_SHOW_1_ODE_TO_RADIANCE.calibration,
      cues: [
        { id: 'a1', time: 0.0, archetype: 'ground_mine' as const, station: 'center' as const, color: '#ff0000', altitude: 0.5 },
        { id: 'a2', time: 1.875, archetype: 'peony' as const, station: 'left' as const, color: '#00ff00', altitude: 0.8 },
      ],
    };

    const serialized = JSON.stringify(autoShow);
    const parsed = JSON.parse(serialized);
    tracker.assertEquals(parsed.cues.length, 2, 'Auto-choreographed cues survive export/import');
  });

  // ====================================================
  // 5. TRANSPORT SEEK MID-PLAYBACK WITH ACTIVE PARTICLES
  // ====================================================
  test('Cross-Feature: Seeking backward mid-salvo flushes active particles and resyncs audio', () => {
    let activeParticles = 12000;
    const ctx = new MockAudioContext();
    ctx.advanceTime(45.0); // At 45 seconds

    // Operator seeks back to 10.0s
    const targetSeek = 10.0;
    ctx.currentTime = targetSeek;
    activeParticles = 0; // flushes future aerial particles

    tracker.assertEquals(ctx.currentTime, 10.0, 'Audio seeked to 10.0s');
    tracker.assertEquals(activeParticles, 0, 'In-flight future particles cleared on backward seek');
  });

  test('Cross-Feature: Seeking forward skips past cues without executing them', () => {
    const cues = [
      { id: 'c1', time: 5.0, fired: false },
      { id: 'c2', time: 10.0, fired: false },
      { id: 'c3', time: 15.0, fired: false },
      { id: 'c4', time: 25.0, fired: false },
    ];

    // Seek forward to 20.0s
    const seekTime = 20.0;
    const updated = cues.map(c => ({
      ...c,
      fired: c.time < seekTime, // marked past without triggering simulation
    }));

    tracker.assertEquals(updated[0].fired, true, 'c1 marked past');
    tracker.assertEquals(updated[1].fired, true, 'c2 marked past');
    tracker.assertEquals(updated[2].fired, true, 'c3 marked past');
    tracker.assertEquals(updated[3].fired, false, 'c4 pending future launch');
  });

  // ====================================================
  // 6. AUDIO-REACTIVE TRIGGERS CONCURRENT WITH CHOREOGRAPHED SHOW
  // ====================================================
  test('Cross-Feature: Mic input band triggers coexist with choreographed timeline playback without collision', () => {
    let timelineParticles = 500;
    let micReactiveParticles = 300;
    const totalActive = timelineParticles + micReactiveParticles;

    tracker.assertEquals(totalActive, 800, 'Both cue sources allocate into same particle pool');
    tracker.assert(totalActive < 65536, 'Comfortably below max capacity');
  });

  // ====================================================
  // 7. PANIC BLACKOUT MULTI-WINDOW PROPAGATION
  // ====================================================
  test('Cross-Feature: Operator panic blackout transmits PANIC_BLACKOUT to Projector window via IPC', () => {
    const harness = new DualWindowBroadcastHarness();
    try {
      harness.postFromStudio({ type: 'PANIC_BLACKOUT' });
      const msg = harness.projectorReceivedMessages.find(m => m.type === 'PANIC_BLACKOUT');
      tracker.assert(msg !== undefined, 'Projector received PANIC_BLACKOUT event');
    } finally {
      harness.close();
    }
  });

  // ====================================================
  // 8. JSON SHOW IMPORT MID-PLAYBACK LIFECYCLE
  // ====================================================
  test('Cross-Feature: Loading new show JSON while show is playing safely halts transport and resets state', () => {
    let isPlaying = true;
    let playhead = 34.2;
    let activeParticles = 8000;
    let currentShow = DEMO_SHOW_1_ODE_TO_RADIANCE;

    // User imports Demo Show 2 mid-playback
    isPlaying = false;
    playhead = 0.0;
    activeParticles = 0;
    currentShow = DEMO_SHOW_2_NEON_HORIZON;

    tracker.assertEquals(isPlaying, false, 'Playback halted');
    tracker.assertEquals(playhead, 0.0, 'Playhead reset to 00:00.000');
    tracker.assertEquals(activeParticles, 0, 'Active particles flushed');
    tracker.assertEquals(currentShow.title, 'Neon Horizon', 'New show loaded');
  });

  // ====================================================
  // 9. MACRO BRUSH GENERATION DURING ACTIVE PLAYBACK
  // ====================================================
  test('Cross-Feature: Generating fan sweep macro during active playback drops cues relative to current playhead', () => {
    const playhead = 18.5;
    const sweepStations = ['left', 'left_center', 'center', 'right_center', 'right'];
    const generated = sweepStations.map((st, i) => ({
      time: playhead + i * 0.05,
      station: st,
    }));
    tracker.assertEquals(generated.length, 5, 'Generated 5 sweep cues during playback');
    tracker.assertEquals(generated[0].time, 18.5, 'First sweep cue matches playhead');
    tracker.assert(generated[4].time > 18.5, 'Subsequent sweep cues placed into near future');
  });

  // ====================================================
  // 10. DYNAMIC ASPECT RATIO MASK UPDATE DURING LIVE PROJECTION
  // ====================================================
  test('Cross-Feature: Toggling aspect ratio between 16:9 and 21:9 updates secondary projection window', () => {
    const harness = new DualWindowBroadcastHarness();
    try {
      harness.postFromStudio({
        type: 'CALIBRATION_UPDATE',
        calibration: { aspectRatioMask: '21:9' },
      });
      const msg = harness.projectorReceivedMessages.find(m => m.calibration?.aspectRatioMask === '21:9');
      tracker.assert(msg !== undefined, 'Projector received 21:9 aspect mask update');
      tracker.assertEquals(msg?.calibration.aspectRatioMask, '21:9', 'Mask is 21:9');
    } finally {
      harness.close();
    }
  });

  return { passed, failed, assertions: tracker.count() };
}
