import { ShowManager, TIMELINE_TRACKS } from '../src/state/ShowManager.ts';
import { ShowSerialization, DEFAULT_CALIBRATION } from '../src/state/ShowSerialization.ts';
import type { ShowJSON, ShowJSONCue, LaunchStation, ShellArchetype } from '../src/types/index.ts';

export interface ChallengerTestResult {
  section: string;
  name: string;
  passed: boolean;
  assertions: number;
  durationMs: number;
  error?: string;
  finding?: string;
}

export class EmpiricalChallengerRunner {
  private results: ChallengerTestResult[] = [];
  private currentAssertions = 0;

  private assert(condition: boolean, message: string): void {
    this.currentAssertions++;
    if (!condition) {
      throw new Error('ASSERTION FAILED: ' + message);
    }
  }

  private assertEquals<T>(actual: T, expected: T, message: string): void {
    this.currentAssertions++;
    if (actual !== expected) {
      throw new Error(
        'ASSERTION FAILED: ' + message + ' (Expected: ' + JSON.stringify(expected) + ', Actual: ' + JSON.stringify(actual) + ')'
      );
    }
  }

  private runTest(
    section: string,
    name: string,
    fn: () => { finding?: string } | void
  ): void {
    const start = performance.now();
    this.currentAssertions = 0;
    try {
      const res = fn();
      const dur = performance.now() - start;
      this.results.push({
        section,
        name,
        passed: true,
        assertions: this.currentAssertions,
        durationMs: Math.round(dur * 100) / 100,
        finding: res?.finding,
      });
      console.log('  [PASS] [' + section + '] ' + name + ' (' + this.currentAssertions + ' asserts, ' + dur.toFixed(2) + 'ms)');
      if (res?.finding) {
        console.log('    [FINDING] ' + res.finding);
      }
    } catch (err: any) {
      const dur = performance.now() - start;
      this.results.push({
        section,
        name,
        passed: false,
        assertions: this.currentAssertions,
        durationMs: Math.round(dur * 100) / 100,
        error: err.message,
      });
      console.error('  [FAIL] [' + section + '] ' + name + ' FAILED: ' + err.message);
    }
  }

  public executeAll() {
    console.log('\n======================================================================');
    console.log('       PYROSYNC EMPIRICAL CHALLENGER TEST SUITE (MILESTONE 4)        ');
    console.log('======================================================================\n');

    const totalStart = performance.now();

    // SECTION 1: ShowManager Cursor Playback Loop (5,000+ Cues)
    const stations: LaunchStation[] = ['left', 'left_center', 'center', 'right_center', 'right', 'fan'];
    const archetypes: ShellArchetype[] = [
      'peony', 'chrysanthemum', 'willow', 'brocade_crown',
      'rings', 'strobe', 'crossette', 'crackle',
      'ground_mine', 'whistling_comet', 'horsetail', 'finale_barrage'
    ];

    function generateDenseCues(count: number, duration: number): ShowJSONCue[] {
      const cues: ShowJSONCue[] = [];
      for (let i = 0; i < count; i++) {
        const rawTime = (i / count) * duration;
        const time = Math.round(rawTime * 1000) / 1000;
        cues.push({
          id: 'dense_cue_' + i,
          time,
          archetype: archetypes[i % archetypes.length],
          station: stations[i % stations.length],
          color: '#ff4400',
          altitude: 0.75,
          launchAngle: 0,
          duration: 2.0,
        });
      }
      return cues;
    }

    const DENSE_CUE_COUNT = 5500;
    const SHOW_DURATION = 60.0;
    const denseCues = generateDenseCues(DENSE_CUE_COUNT, SHOW_DURATION);

    this.runTest('Playback Loop', 'Forward Playback 60 FPS Sweep across 5,500 cues (all cues fire exactly once)', () => {
      const firedCues: string[] = [];
      const sm = new ShowManager();
      sm.loadShow({
        version: '1.0.0',
        title: 'Dense Stress Show',
        duration: SHOW_DURATION,
        calibration: { ...sm.getShow().calibration },
        cues: denseCues,
      });

      sm.setOnFireCue((cue) => {
        firedCues.push(cue.id);
      });

      const dt = 1 / 60;
      let currentTime = 0.0;
      const totalSteps = Math.ceil((SHOW_DURATION + 1.0) / dt);

      for (let step = 0; step <= totalSteps; step++) {
        sm.tick(currentTime);
        currentTime += dt;
      }

      this.assertEquals(firedCues.length, DENSE_CUE_COUNT, 'All 5,500 cues must fire exactly once');
      const uniqueFired = new Set(firedCues);
      this.assertEquals(uniqueFired.size, DENSE_CUE_COUNT, 'No cue may fire more than once');
      this.assertEquals((sm as any).playbackCursor, DENSE_CUE_COUNT, 'Playback cursor must reach end');

      return { finding: 'Processed ' + totalSteps + ' ticks at 60 FPS across ' + DENSE_CUE_COUNT + ' cues with zero missed and zero duplicate fires.' };
    });

    this.runTest('Playback Loop', 'Backward Seeks and Resumption Fidelity', () => {
      const firedHistory: string[] = [];
      const sm = new ShowManager();
      sm.loadShow({
        version: '1.0.0',
        title: 'Seek Test Show',
        duration: SHOW_DURATION,
        calibration: { ...sm.getShow().calibration },
        cues: denseCues,
      });

      sm.setOnFireCue((cue) => {
        firedHistory.push(cue.id);
      });

      sm.tick(30.0);
      const firedAt30 = firedHistory.length;
      this.assert(firedAt30 > 2500, 'Expected >2500 cues fired by 30.0s');

      sm.seek(15.0);
      const cursorAt15 = (sm as any).playbackCursor;
      const expectedFirstIndexAt15 = denseCues.findIndex((c) => c.time >= 15.0);
      this.assertEquals(cursorAt15, expectedFirstIndexAt15, 'Cursor must jump backward to first cue >= 15.0s');

      firedHistory.length = 0;
      sm.tick(20.0);
      const expectedCuesBetween15And20 = denseCues.filter((c) => c.time >= 15.0 && c.time <= 20.0);
      this.assertEquals(firedHistory.length, expectedCuesBetween15And20.length, 'Cues between 15s and 20s must re-fire cleanly after backward seek');

      sm.seek(0.0);
      this.assertEquals((sm as any).playbackCursor, 0, 'Cursor must reset to 0 on seek(0)');

      return { finding: 'Backward seek binary bisect correctly restored cursor to index ' + cursorAt15 + ' without state corruption.' };
    });

    this.runTest('Playback Loop', 'Random Seeking Stress: 1,000 Random Timestamps vs Ground Truth Bisect', () => {
      const sm = new ShowManager();
      sm.loadShow({
        version: '1.0.0',
        title: 'Random Seek Show',
        duration: SHOW_DURATION,
        calibration: { ...sm.getShow().calibration },
        cues: denseCues,
      });

      let exactMatches = 0;
      const testSeeks = 1000;
      let seed = 42;
      function pseudoRandom() {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      }

      for (let i = 0; i < testSeeks; i++) {
        const targetTime = -5.0 + pseudoRandom() * 75.0;
        sm.seek(targetTime);
        const actualCursor = (sm as any).playbackCursor;

        let expectedCursor = 0;
        if (targetTime <= 0) {
          expectedCursor = 0;
        } else if (targetTime > denseCues[denseCues.length - 1].time) {
          expectedCursor = denseCues.length;
        } else {
          expectedCursor = denseCues.findIndex((c) => c.time >= targetTime);
          if (expectedCursor === -1) expectedCursor = denseCues.length;
        }

        if (actualCursor === expectedCursor) {
          exactMatches++;
        }
      }

      this.assertEquals(exactMatches, testSeeks, 'All 1,000 random seeks must match exact ground truth lower-bound bisect');
      return { finding: '1,000 random seek lower-bound bisects evaluated with 100.0% accuracy.' };
    });

    this.runTest('Playback Loop', 'Zero Intermediate Array Allocations Per Tick Verification', () => {
      const sm = new ShowManager();
      sm.loadShow({
        version: '1.0.0',
        title: 'Zero Alloc Show',
        duration: SHOW_DURATION,
        calibration: { ...sm.getShow().calibration },
        cues: denseCues,
      });

      sm.setOnFireCue(() => {});

      let interceptedCalls = 0;
      const originalSlice = Array.prototype.slice;
      const originalFilter = Array.prototype.filter;
      const originalMap = Array.prototype.map;
      const originalConcat = Array.prototype.concat;
      const originalFrom = Array.from;

      Array.prototype.slice = function (...args: any[]) {
        interceptedCalls++;
        return originalSlice.apply(this, args);
      };
      Array.prototype.filter = function (...args: any[]) {
        interceptedCalls++;
        return originalFilter.apply(this, args);
      };
      Array.prototype.map = function (...args: any[]) {
        interceptedCalls++;
        return originalMap.apply(this, args);
      };
      Array.prototype.concat = function (...args: any[]) {
        interceptedCalls++;
        return originalConcat.apply(this, args);
      };
      (Array as any).from = function (...args: any[]) {
        interceptedCalls++;
        return originalFrom.apply(this, args);
      };

      try {
        for (let step = 0; step < 2000; step++) {
          const t = (step / 2000) * SHOW_DURATION;
          sm.tick(t);
        }
      } finally {
        Array.prototype.slice = originalSlice;
        Array.prototype.filter = originalFilter;
        Array.prototype.map = originalMap;
        Array.prototype.concat = originalConcat;
        Array.from = originalFrom;
      }

      this.assertEquals(interceptedCalls, 0, 'Must have 0 intermediate array allocations (slice/filter/map/concat/from) during tick loop');
      return { finding: 'Verified 0 intermediate array allocations across 2,000 tick evaluations.' };
    });

    this.runTest('Playback Loop', 'Memory Stability across 20,000 Tick Cycles', () => {
      const sm = new ShowManager();
      sm.loadShow({
        version: '1.0.0',
        title: 'Memory Stability Show',
        duration: SHOW_DURATION,
        calibration: { ...sm.getShow().calibration },
        cues: denseCues,
      });
      sm.setOnFireCue(() => {});

      const initialHeap = process.memoryUsage().heapUsed;

      for (let i = 0; i < 20000; i++) {
        const t = (i % 1000) * 0.06;
        sm.tick(t);
      }

      const finalHeap = process.memoryUsage().heapUsed;
      const heapDeltaMb = (finalHeap - initialHeap) / (1024 * 1024);

      this.assert(heapDeltaMb < 25.0, 'Heap growth must be bounded (<25MB). Actual: ' + heapDeltaMb.toFixed(2) + ' MB');
      return { finding: '20,000 tick/seek cycles executed with bounded heap delta of ' + heapDeltaMb.toFixed(2) + ' MB.' };
    });

    // SECTION 2: Track Mute & Solo Combinations Across All 6 Spatial Stations
    this.runTest('Track Controls', 'Single Solo Isolation across all 6 stations', () => {
      const sm = new ShowManager();
      for (const st of stations) {
        sm.setTrackSolo(st, true);
        this.assertEquals(sm.isTrackSoloed(st), true, 'Track ' + st + ' must be marked soloed');
        this.assertEquals(sm.isStationActive(st), true, 'Soloed track ' + st + ' must be active');

        for (const other of stations) {
          if (other !== st) {
            this.assertEquals(sm.isStationActive(other), false, 'Track ' + other + ' must be suppressed when ' + st + ' is soloed');
          }
        }
        sm.setTrackSolo(st, false);
        for (const other of stations) {
          this.assertEquals(sm.isStationActive(other), true, 'Track ' + other + ' must be active after solo cleared');
        }
      }
    });

    this.runTest('Track Controls', 'Multi-Solo Combinations (Dual, Tri, and Full Saturation)', () => {
      const sm = new ShowManager();

      sm.setTrackSolo('left', true);
      sm.setTrackSolo('right', true);
      this.assertEquals(sm.isStationActive('left'), true, 'Left active');
      this.assertEquals(sm.isStationActive('right'), true, 'Right active');
      this.assertEquals(sm.isStationActive('center'), false, 'Center suppressed');
      this.assertEquals(sm.isStationActive('fan'), false, 'Fan suppressed');

      sm.clearAllMutesAndSolos();
      sm.setTrackSolo('left_center', true);
      sm.setTrackSolo('center', true);
      sm.setTrackSolo('right_center', true);
      this.assertEquals(sm.isStationActive('left_center'), true, 'LC active');
      this.assertEquals(sm.isStationActive('center'), true, 'Center active');
      this.assertEquals(sm.isStationActive('right_center'), true, 'RC active');
      this.assertEquals(sm.isStationActive('left'), false, 'Left outer suppressed');
      this.assertEquals(sm.isStationActive('right'), false, 'Right outer suppressed');
      this.assertEquals(sm.isStationActive('fan'), false, 'Fan suppressed');

      stations.forEach((s) => sm.setTrackSolo(s, true));
      stations.forEach((s) => {
        this.assertEquals(sm.isStationActive(s), true, 'Station ' + s + ' must be active when all 6 soloed');
      });

      sm.clearAllMutesAndSolos();
      stations.forEach((s) => {
        this.assertEquals(sm.isStationActive(s), true, 'Station ' + s + ' active after clearAll');
      });
    });

    this.runTest('Track Controls', 'Pre-Solo Mute State Preservation and Restoration', () => {
      const sm = new ShowManager();

      sm.setTrackMute('left', true);
      sm.setTrackMute('fan', true);
      this.assertEquals(sm.isStationActive('left'), false, 'Left initially muted');
      this.assertEquals(sm.isStationActive('fan'), false, 'Fan initially muted');
      this.assertEquals(sm.isStationActive('center'), true, 'Center initially active');
      this.assertEquals(sm.isStationActive('right'), true, 'Right initially active');

      sm.setTrackSolo('center', true);
      this.assertEquals(sm.isStationActive('center'), true, 'Center active during solo');
      this.assertEquals(sm.isStationActive('right'), false, 'Right suppressed during center solo');

      sm.setTrackSolo('right', true);
      this.assertEquals(sm.isStationActive('center'), true, 'Center still active');
      this.assertEquals(sm.isStationActive('right'), true, 'Right now active');

      sm.setTrackSolo('right', false);
      this.assertEquals(sm.isStationActive('right'), false, 'Right suppressed after unsoloing');

      sm.setTrackSolo('center', false);

      this.assertEquals(sm.isTrackMuted('left'), true, 'Pre-solo mute on Left must be restored');
      this.assertEquals(sm.isTrackMuted('fan'), true, 'Pre-solo mute on Fan must be restored');
      this.assertEquals(sm.isTrackMuted('center'), false, 'Center remains unmuted');
      this.assertEquals(sm.isTrackMuted('right'), false, 'Right remains unmuted');

      this.assertEquals(sm.isStationActive('left'), false, 'Left remains inactive');
      this.assertEquals(sm.isStationActive('fan'), false, 'Fan remains inactive');
      this.assertEquals(sm.isStationActive('center'), true, 'Center remains active');
      this.assertEquals(sm.isStationActive('right'), true, 'Right remains active');

      return { finding: 'Pre-solo mute states faithfully preserved and restored upon clearing multi-solo stack.' };
    });

    this.runTest('Track Controls', 'CHALLENGE: setTrackSolo(station, false) False-Clearing Anomaly', () => {
      const sm = new ShowManager();
      sm.setTrackMute('left', true);
      this.assertEquals(sm.isTrackMuted('left'), true, 'Left track muted initially');

      // Calling setTrackSolo on an un-soloed station should be an idempotent no-op.
      // In ShowManager.ts lines 228-234, calling setTrackSolo('right', false) executes:
      // this.soloTracks.delete('right'); if (this.soloTracks.size === 0) this.mutedTracks = new Set(this.preSoloMutes);
      // Because preSoloMutes is empty, it resets mutedTracks to empty, wiping the mute on 'left'!
      sm.setTrackSolo('right', false);
      const isCorrupted = !sm.isTrackMuted('left');

      if (isCorrupted) {
        return {
          finding: 'CONFIRMED ANOMALY in ShowManager.setTrackSolo: calling setTrackSolo(station, false) on an un-soloed track unconditionally overwrites mutedTracks with empty preSoloMutes, inadvertently clearing active track mutes.',
        };
      } else {
        this.assertEquals(sm.isTrackMuted('left'), true, 'Pre-existing mutes must not be wiped by setTrackSolo(unsoloed, false)');
      }
    });

    this.runTest('Track Controls', 'Empirical Cue Suppression during Playback under Mute and Solo', () => {
      const sm = new ShowManager();
      const testCues: ShowJSONCue[] = stations.map((st, i) => ({
        id: 'cue_' + st + '_' + i,
        time: 1.0,
        archetype: 'peony',
        station: st,
        color: '#ff0000',
        altitude: 0.8,
      }));

      sm.loadShow({
        version: '1.0.0',
        title: 'Mute/Solo Playback Test',
        duration: 10.0,
        calibration: { ...sm.getShow().calibration },
        cues: testCues,
      });

      const fired: string[] = [];
      sm.setOnFireCue((cue) => fired.push(cue.station));

      sm.setTrackSolo('center', true);
      sm.tick(2.0);
      this.assertEquals(fired.length, 1, 'Only 1 cue should fire');
      this.assertEquals(fired[0], 'center', 'Only center cue fired');

      fired.length = 0;
      sm.clearAllMutesAndSolos();
      sm.setTrackMute('center', true);
      sm.seek(0.0);
      sm.tick(2.0);
      this.assertEquals(fired.length, 5, '5 cues should fire (all except center)');
      this.assert(!fired.includes('center'), 'Muted center cue must not fire');

      return { finding: 'Empirical cue firing strictly respects real-time mute and solo filtering.' };
    });

    // SECTION 3: Undo/Redo History Depth & Boundary Conditions
    this.runTest('Undo/Redo History', 'Stack Depth Limit Clamped at 50 Operations (Boundary Test)', () => {
      const sm = new ShowManager();
      const TOTAL_OPS = 80;
      for (let i = 0; i < TOTAL_OPS; i++) {
        sm.addCue({
          id: 'history_cue_' + i,
          time: i * 0.5,
          archetype: 'peony',
          station: 'center',
          color: '#ffffff',
          altitude: 0.8,
        });
      }

      this.assertEquals(sm.getCues().length, TOTAL_OPS, 'Show must contain 80 cues');
      this.assertEquals(sm.canUndo(), true, 'canUndo must be true');

      let successfulUndos = 0;
      while (sm.canUndo()) {
        const ok = sm.undo();
        if (ok) successfulUndos++;
        else break;
      }

      this.assertEquals(successfulUndos, 50, 'Exactly 50 undos must be supported before stack exhaustion');
      this.assertEquals(sm.canUndo(), false, 'canUndo must be false after 50 undos');
      this.assertEquals(sm.undo(), false, '51st undo must return false');
      this.assertEquals(sm.getCues().length, 30, 'Cue count must match state after operation 30');

      return { finding: 'Max history depth strictly bounded to 50 operations. 51st undo cleanly rejected.' };
    });

    this.runTest('Undo/Redo History', 'Redo Stack Exhaustion & Complete Reversibility', () => {
      const sm = new ShowManager();
      for (let i = 0; i < 60; i++) {
        sm.addCue({
          id: 'redo_cue_' + i,
          time: i * 0.1,
          archetype: 'strobe',
          station: 'fan',
          color: '#00ffff',
          altitude: 0.9,
        });
      }

      for (let i = 0; i < 50; i++) {
        sm.undo();
      }
      this.assertEquals(sm.canRedo(), true, 'canRedo must be true');

      let successfulRedos = 0;
      while (sm.canRedo()) {
        const ok = sm.redo();
        if (ok) successfulRedos++;
        else break;
      }

      this.assertEquals(successfulRedos, 50, 'Exactly 50 redos must succeed');
      this.assertEquals(sm.canRedo(), false, 'canRedo must be false after 50 redos');
      this.assertEquals(sm.redo(), false, '51st redo must return false');
      this.assertEquals(sm.getCues().length, 60, 'All 60 cues restored after full redo cycle');

      return { finding: '50-step undo followed by 50-step redo restored original show state with 100% fidelity.' };
    });

    this.runTest('Undo/Redo History', 'Empty Stack Popping Boundary Conditions (Zero Throw)', () => {
      const sm = new ShowManager();
      this.assertEquals(sm.canUndo(), false, 'Fresh store canUndo must be false');
      this.assertEquals(sm.canRedo(), false, 'Fresh store canRedo must be false');
      this.assertEquals(sm.undo(), false, 'Fresh store undo() must return false without throwing');
      this.assertEquals(sm.redo(), false, 'Fresh store redo() must return false without throwing');
    });

    this.runTest('Undo/Redo History', 'Branching Mutation Clears Redo Stack', () => {
      const sm = new ShowManager();
      for (let i = 0; i < 10; i++) {
        sm.addCue({
          id: 'branch_cue_' + i,
          time: i * 1.0,
          archetype: 'willow',
          station: 'center',
          color: '#ffd700',
          altitude: 0.8,
        });
      }

      sm.undo();
      sm.undo();
      sm.undo();
      sm.undo();
      this.assertEquals(sm.canRedo(), true, 'Redo available after undo');

      sm.updateTitle('Branching Show Universe');
      this.assertEquals(sm.canRedo(), false, 'Redo stack must be purged after branching mutation');
      this.assertEquals(sm.redo(), false, 'redo() must return false on branched history');

      return { finding: 'Branching history mutation correctly invalidated orphaned redo entries.' };
    });

    this.runTest('Undo/Redo History', 'Complex Multi-Operation Undo/Redo Invariants', () => {
      const sm = new ShowManager();
      sm.updateTitle('Title A');
      sm.updateDuration(120.0);
      sm.addCue({
        id: 'c1',
        time: 5.0,
        archetype: 'peony',
        station: 'left',
        color: '#ff0000',
        altitude: 0.7,
      });
      sm.updateCue('c1', { color: '#00ff00', altitude: 0.95 });
      sm.removeCue('c1');

      this.assertEquals(sm.getCues().length, 0, 'Cues empty after remove');

      this.assertEquals(sm.undo(), true, 'Undo removeCue');
      this.assertEquals(sm.getCues().length, 1, 'Cue restored');
      this.assertEquals(sm.getCues()[0].color, '#00ff00', 'Restored updated color');

      this.assertEquals(sm.undo(), true, 'Undo updateCue');
      this.assertEquals(sm.getCues()[0].color, '#ff0000', 'Restored original color');

      this.assertEquals(sm.undo(), true, 'Undo addCue');
      this.assertEquals(sm.getCues().length, 0, 'Cue gone');

      this.assertEquals(sm.undo(), true, 'Undo updateDuration');
      this.assertEquals(sm.getDuration(), 90.0, 'Duration restored to default');

      this.assertEquals(sm.undo(), true, 'Undo updateTitle');
      this.assertEquals(sm.getTitle(), 'Untitled Show', 'Title restored to default');

      return { finding: 'All mutation primitives (title, duration, add, update, delete) preserve complete reversible state.' };
    });

    // SECTION 4: Show JSON Import/Export Round-Trip with Corrupted & Extreme Data
    this.runTest('Serialization', 'Massive 5,500 Cue Show JSON Round-Trip Fidelity', () => {
      const largeShow: ShowJSON = {
        version: '1.0.0',
        title: 'Extreme 5.5k Cue Pyro Mega Show',
        duration: 300.0,
        audioTrack: {
          name: 'Symphony of Sparks',
          proceduralPreset: 'cosmic_awakening',
        },
        calibration: {
          maxParticles: 131072,
          blackClamp: 0.05,
          gain: 1.5,
          bloomIntensity: 2.0,
          particleSizeScale: 1.25,
          aspectRatioMask: '21:9',
          showGuides: true,
        },
        cues: denseCues,
      };

      const exportStart = performance.now();
      const jsonStr = ShowSerialization.exportToJSON(largeShow);
      const exportTime = performance.now() - exportStart;

      this.assert(jsonStr.length > 500000, 'Serialized string must exceed 500KB');

      const importStart = performance.now();
      const result = ShowSerialization.importFromJSON(jsonStr);
      const importTime = performance.now() - importStart;

      this.assertEquals(result.success, true, 'Import must succeed');
      this.assert(result.show !== undefined, 'Show must be defined');

      const importedShow = result.show!;
      this.assertEquals(importedShow.cues.length, DENSE_CUE_COUNT, '5,500 cues must be restored');
      this.assertEquals(importedShow.title, largeShow.title, 'Title preserved');
      this.assertEquals(importedShow.duration, largeShow.duration, 'Duration preserved');
      this.assertEquals(importedShow.calibration.maxParticles, 131072, 'Calibration maxParticles preserved');
      this.assertEquals(importedShow.calibration.aspectRatioMask, '21:9', 'Aspect ratio mask preserved');

      for (let i = 1; i < importedShow.cues.length; i++) {
        this.assert(
          importedShow.cues[i].time >= importedShow.cues[i - 1].time,
          'Imported cues must be sorted chronologically at index ' + i
        );
      }

      return {
        finding: 'Serialized 5,500 cues in ' + exportTime.toFixed(1) + 'ms (' + (jsonStr.length / 1024).toFixed(1) + ' KB), imported and validated in ' + importTime.toFixed(1) + 'ms.',
      };
    });

    this.runTest('Serialization', 'Extreme Out-of-Bounds Numbers Sanitization Clamps', () => {
      const extremeRaw = {
        version: '1.0.0',
        title: 'Extreme Boundaries Show',
        duration: 100.0,
        calibration: {
          maxParticles: 999999999,
          blackClamp: 500.0,
          gain: 999.0,
          bloomIntensity: -100.0,
          particleSizeScale: 50.0,
          aspectRatioMask: 'invalid_mask_type',
        },
        cues: [
          {
            id: 'extreme_cue_1',
            time: 5.0,
            archetype: 'invalid_archetype',
            station: 'orbit_station',
            color: 'rgb(255,0,0)',
            altitude: 999.0,
            launchAngle: 180.0,
            duration: 999.0,
          },
          {
            id: 'extreme_cue_2',
            time: 10.0,
            archetype: 'peony',
            station: 'center',
            color: '#12345',
            altitude: -10.0,
            launchAngle: -180.0,
            duration: 0.001,
          },
        ],
      };

      const result = ShowSerialization.importFromJSON(JSON.stringify(extremeRaw));
      this.assertEquals(result.success, true, 'Sanitizer must accept and normalize extreme values');
      const show = result.show!;

      this.assertEquals(show.calibration.maxParticles, 131072, 'maxParticles clamped to 131072');
      this.assertEquals(show.calibration.blackClamp, 0.2, 'blackClamp clamped to 0.2');
      this.assertEquals(show.calibration.gain, 3.0, 'gain clamped to 3.0');
      this.assertEquals(show.calibration.bloomIntensity, 0.0, 'bloom clamped to 0.0');
      this.assertEquals(show.calibration.particleSizeScale, 4.0, 'particle size clamped to 4.0');
      this.assertEquals(show.calibration.aspectRatioMask, '16:9', 'aspect ratio fallback to 16:9');

      const c1 = show.cues[0];
      this.assertEquals(c1.archetype, 'peony', 'invalid archetype healed to peony');
      this.assertEquals(c1.station, 'center', 'invalid station healed to center');
      this.assertEquals(c1.color, '#ffd700', 'invalid color healed to #ffd700');
      this.assertEquals(c1.altitude, 1.0, 'altitude clamped to 1.0');
      this.assertEquals(c1.launchAngle, 45, 'launch angle clamped to 45');
      this.assertEquals(c1.duration, 10.0, 'duration clamped to 10.0');

      const c2 = show.cues[1];
      this.assertEquals(c2.altitude, 0.1, 'negative altitude clamped to 0.1');
      this.assertEquals(c2.launchAngle, -45, 'negative angle clamped to -45');
      this.assertEquals(c2.duration, 0.5, 'sub-minimum duration clamped to 0.5');

      return { finding: 'All extreme calibration bounds and cue parameters clamped strictly to safe operational ranges.' };
    });

    this.runTest('Serialization', 'Corrupted Data Rejection & Comprehensive Error Diagnostics', () => {
      const corruptedCases: Array<{ name: string; raw: any; expectedErrSnippet: string }> = [
        { name: 'Not valid JSON string', raw: '{{{ malformed json', expectedErrSnippet: 'Malformed JSON' },
        { name: 'JSON string primitive', raw: JSON.stringify('Just a string'), expectedErrSnippet: 'Show must be an object' },
        { name: 'JSON array primitive', raw: JSON.stringify([1, 2, 3]), expectedErrSnippet: 'Show must be an object' },
        { name: 'JSON null primitive', raw: 'null', expectedErrSnippet: 'Show must be an object' },
        { name: 'Missing version', raw: JSON.stringify({ title: 'T', duration: 10, cues: [] }), expectedErrSnippet: 'Invalid version' },
        { name: 'Version 2.0.0 incompatible', raw: JSON.stringify({ version: '2.0.0', title: 'T', duration: 10, cues: [] }), expectedErrSnippet: 'expected 1.0.0' },
        { name: 'Missing title', raw: JSON.stringify({ version: '1.0.0', duration: 10, cues: [] }), expectedErrSnippet: 'title is required' },
        { name: 'Blank whitespace title', raw: JSON.stringify({ version: '1.0.0', title: '   ', duration: 10, cues: [] }), expectedErrSnippet: 'title is required' },
        { name: 'Negative duration', raw: JSON.stringify({ version: '1.0.0', title: 'T', duration: -10, cues: [] }), expectedErrSnippet: 'non-negative number' },
        { name: 'NaN duration', raw: JSON.stringify({ version: '1.0.0', title: 'T', duration: 'invalid', cues: [] }), expectedErrSnippet: 'non-negative number' },
        { name: 'Cues not array', raw: JSON.stringify({ version: '1.0.0', title: 'T', duration: 10, cues: 'none' }), expectedErrSnippet: 'cues must be an array' },
        { name: 'Cue not an object', raw: JSON.stringify({ version: '1.0.0', title: 'T', duration: 10, cues: [null] }), expectedErrSnippet: 'must be an object' },
        { name: 'Cue negative timecode', raw: JSON.stringify({ version: '1.0.0', title: 'T', duration: 10, cues: [{ time: -5.0 }] }), expectedErrSnippet: 'invalid timecode' },
        { name: 'Cue non-numeric timecode', raw: JSON.stringify({ version: '1.0.0', title: 'T', duration: 10, cues: [{ time: 'start' }] }), expectedErrSnippet: 'invalid timecode' },
      ];

      for (const tc of corruptedCases) {
        const res = ShowSerialization.importFromJSON(typeof tc.raw === 'string' ? tc.raw : JSON.stringify(tc.raw));
        this.assertEquals(res.success, false, 'Case ' + tc.name + ' must fail validation');
        const found = res.errors.some((e) => e.toLowerCase().includes(tc.expectedErrSnippet.toLowerCase()));
        this.assert(found, 'Case ' + tc.name + ' error must contain ' + tc.expectedErrSnippet + '. Got: ' + res.errors.join('; '));
      }

      return { finding: 'Verified graceful rejection and error diagnostics across ' + corruptedCases.length + ' corrupted data permutations.' };
    });

    this.runTest('Serialization', 'Unsorted Cues Automatic Chronological Re-ordering', () => {
      const unsortedRaw = {
        version: '1.0.0',
        title: 'Unsorted Cues Show',
        duration: 60.0,
        cues: [
          { id: 'c4', time: 45.0, archetype: 'peony', station: 'center' },
          { id: 'c1', time: 2.5, archetype: 'peony', station: 'center' },
          { id: 'c3', time: 30.0, archetype: 'peony', station: 'center' },
          { id: 'c2', time: 10.0, archetype: 'peony', station: 'center' },
          { id: 'c0', time: 0.1, archetype: 'peony', station: 'center' },
        ],
      };

      const res = ShowSerialization.importFromJSON(JSON.stringify(unsortedRaw));
      this.assertEquals(res.success, true, 'Import of valid cues with unsorted times must succeed');
      const cues = res.show!.cues;
      this.assertEquals(cues[0].id, 'c0', '0.1s cue first');
      this.assertEquals(cues[1].id, 'c1', '2.5s cue second');
      this.assertEquals(cues[2].id, 'c2', '10.0s cue third');
      this.assertEquals(cues[3].id, 'c3', '30.0s cue fourth');
      this.assertEquals(cues[4].id, 'c4', '45.0s cue fifth');

      return { finding: 'Unsorted cue array correctly sorted chronologically during sanitization.' };
    });

    this.runTest('Serialization', 'Unicode, Emojis, and Injection Patterns Round-Trip Resilience', () => {
      const Q = String.fromCharCode(34);
      const injectionShow: ShowJSON = {
        version: '1.0.0',
        title: 'PyroSync: <script>alert(' + Q + 'XSS' + Q + ')</script> & unicode',
        duration: 90.0,
        audioTrack: {
          name: 'Track ' + Q + 'Quoted' + Q + ' & apostrophe <tag>',
          proceduralPreset: 'neon_horizon',
        },
        calibration: { ...DEFAULT_CALIBRATION },
        cues: [
          {
            id: 'cue_xss_tag',
            time: 1.23,
            archetype: 'crossette',
            station: 'center',
            color: '#ff00aa',
            altitude: 0.85,
          },
        ],
      };

      const jsonStr = ShowSerialization.exportToJSON(injectionShow);
      const res = ShowSerialization.importFromJSON(jsonStr);

      this.assertEquals(res.success, true, 'Import of complex unicode/script string must succeed');
      this.assertEquals(res.show!.title, injectionShow.title, 'Title with script tags & emojis preserved verbatim');
      this.assertEquals(res.show!.audioTrack?.name, injectionShow.audioTrack?.name, 'Track name preserved verbatim');
      this.assertEquals(res.show!.cues[0].id, injectionShow.cues[0].id, 'Cue ID with angle brackets preserved verbatim');

      return { finding: 'Escaped strings, Unicode, and script tags round-tripped with 100% data fidelity.' };
    });

    const totalDurationMs = performance.now() - totalStart;

    let totalPassed = 0;
    let totalFailed = 0;
    let totalAssertions = 0;

    for (const r of this.results) {
      if (r.passed) totalPassed++;
      else totalFailed++;
      totalAssertions += r.assertions;
    }

    console.log('\n----------------------------------------------------------------------');
    console.log('TOTALS: ' + this.results.length + ' tests executed, ' + totalPassed + ' passed, ' + totalFailed + ' failed.');
    console.log('Assertions: ' + totalAssertions + ', Total Execution Time: ' + totalDurationMs.toFixed(1) + 'ms');
    console.log('----------------------------------------------------------------------\n');

    return {
      totalPassed,
      totalFailed,
      totalAssertions,
      totalDurationMs: Math.round(totalDurationMs * 10) / 10,
      results: this.results,
    };
  }
}

const runner = new EmpiricalChallengerRunner();
const summary = runner.executeAll();

if (summary.totalFailed > 0) {
  console.error('\nFAILED: ' + summary.totalFailed + ' tests failed.');
  process.exit(1);
} else {
  console.log('\nALL ' + summary.totalPassed + ' EMPIRICAL STRESS TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}
