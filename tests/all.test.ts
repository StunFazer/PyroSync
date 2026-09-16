/**
 * Native Node Test Runner Integration (node:test / vitest)
 * Enables: node --test tests/all.test.ts
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { runArchetypeTests } from './tier1-features/archetypes.test.ts';
import { runCalibrationTests } from './tier1-features/calibration.test.ts';
import { runAudioSyncTests } from './tier1-features/audio-sync.test.ts';
import { runTimelineTrackTests } from './tier1-features/timeline-tracks.test.ts';
import { runMacroBrushTests } from './tier1-features/macro-brushes.test.ts';
import { runHotkeyTests } from './tier1-features/hotkeys.test.ts';
import { runExportImportTests } from './tier1-features/export-import.test.ts';
import { runBoundaryCornerTests } from './tier2-boundaries/boundary-corner.test.ts';
import { runCrossFeatureTests } from './tier3-combinations/cross-feature.test.ts';
import { runRealWorldScenarioTests } from './tier4-scenarios/real-world-scenarios.test.ts';

describe('PyroSync 4-Tier E2E Test Suite', () => {
  describe('Tier 1: Feature Coverage', () => {
    test('12+ Shell Archetypes', () => {
      const res = runArchetypeTests();
      assert.strictEqual(res.failed, 0, `${res.failed} archetype tests failed`);
      assert.ok(res.passed >= 60, `Expected >= 60 tests, got ${res.passed}`);
    });

    test('Projector Calibration Engine', () => {
      const res = runCalibrationTests();
      assert.strictEqual(res.failed, 0, `${res.failed} calibration tests failed`);
      assert.ok(res.passed >= 25, `Expected >= 25 tests, got ${res.passed}`);
    });

    test('Audio Engine & Pyromusical Sync', () => {
      const res = runAudioSyncTests();
      assert.strictEqual(res.failed, 0, `${res.failed} audio-sync tests failed`);
      assert.ok(res.passed >= 30, `Expected >= 30 tests, got ${res.passed}`);
    });

    test('Timeline Studio & 6 Spatial Tracks', () => {
      const res = runTimelineTrackTests();
      assert.strictEqual(res.failed, 0, `${res.failed} timeline-tracks tests failed`);
      assert.ok(res.passed >= 20, `Expected >= 20 tests, got ${res.passed}`);
    });

    test('Macro Brushes & Auto-Choreographer', () => {
      const res = runMacroBrushTests();
      assert.strictEqual(res.failed, 0, `${res.failed} macro-brushes tests failed`);
      assert.ok(res.passed >= 15, `Expected >= 15 tests, got ${res.passed}`);
    });

    test('Hotkeys & Safety Interlocks (F, Esc, Space, 1-9)', () => {
      const res = runHotkeyTests();
      assert.strictEqual(res.failed, 0, `${res.failed} hotkey tests failed`);
      assert.ok(res.passed >= 20, `Expected >= 20 tests, got ${res.passed}`);
    });

    test('Show JSON Export & Import Pipeline', () => {
      const res = runExportImportTests();
      assert.strictEqual(res.failed, 0, `${res.failed} export-import tests failed`);
      assert.ok(res.passed >= 25, `Expected >= 25 tests, got ${res.passed}`);
    });
  });

  describe('Tier 2: Boundary & Corner Cases', () => {
    test('Boundary Limits & Stress (Saturation, Clamps, Empty Timeline, Corrupted JSON, Spam)', () => {
      const res = runBoundaryCornerTests();
      assert.strictEqual(res.failed, 0, `${res.failed} boundary-corner tests failed`);
      assert.ok(res.passed >= 40, `Expected >= 40 tests, got ${res.passed}`);
    });
  });

  describe('Tier 3: Cross-Feature Combinations', () => {
    test('Pairwise Cross-Feature Interactions', () => {
      const res = runCrossFeatureTests();
      assert.strictEqual(res.failed, 0, `${res.failed} cross-feature tests failed`);
      assert.ok(res.passed >= 15, `Expected >= 15 tests, got ${res.passed}`);
    });
  });

  describe('Tier 4: Real-World Application Scenarios', () => {
    test('5 Realistic End-to-End Shows and Production Workflows', () => {
      const res = runRealWorldScenarioTests();
      assert.strictEqual(res.failed, 0, `${res.failed} real-world scenario tests failed`);
      assert.strictEqual(res.passed, 5, `Expected 5 real-world scenarios, got ${res.passed}`);
    });
  });
});
