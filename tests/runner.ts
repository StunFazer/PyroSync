#!/usr/bin/env node
/**
 * PyroSync E2E Comprehensive Test Suite Runner
 * Executes Tiers 1-4 with formatted output, assertion tracking, and exit codes.
 *
 * Usage:
 *   node tests/runner.ts
 */

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

interface SuiteResult {
  tier: string;
  module: string;
  passed: number;
  failed: number;
  assertions: number;
  durationMs: number;
}

async function runAllSuites() {
  console.log('\n======================================================================');
  console.log('         PYROSYNC E2E OPAQUE-BOX TEST SUITE EXECUTION (TIERS 1-4)    ');
  console.log('======================================================================\n');

  const startTime = performance.now();
  const results: SuiteResult[] = [];

  const suites: Array<{ tier: string; module: string; fn: () => { passed: number; failed: number; assertions: number } }> = [
    { tier: 'Tier 1: Features', module: '12+ Shell Archetypes (Peony..Finale)', fn: runArchetypeTests },
    { tier: 'Tier 1: Features', module: 'Projector Calibration Engine', fn: runCalibrationTests },
    { tier: 'Tier 1: Features', module: 'Audio Engine & Pyromusical Sync', fn: runAudioSyncTests },
    { tier: 'Tier 1: Features', module: 'Timeline Studio & 6 Spatial Tracks', fn: runTimelineTrackTests },
    { tier: 'Tier 1: Features', module: 'Macro Brushes & Auto-Choreographer', fn: runMacroBrushTests },
    { tier: 'Tier 1: Features', module: 'Hotkeys & Safety Interlocks (F/Esc/1-9)', fn: runHotkeyTests },
    { tier: 'Tier 1: Features', module: 'Show JSON Export & Import Pipeline', fn: runExportImportTests },
    { tier: 'Tier 2: Boundaries', module: 'Boundary Limits & Stress (Saturation, Clamps)', fn: runBoundaryCornerTests },
    { tier: 'Tier 3: Combinations', module: 'Cross-Feature Pairwise Interactions', fn: runCrossFeatureTests },
    { tier: 'Tier 4: Scenarios', module: 'Real-World E2E Scenarios (5 Full Shows)', fn: runRealWorldScenarioTests },
  ];

  for (const s of suites) {
    const sStart = performance.now();
    try {
      const res = s.fn();
      const dur = performance.now() - sStart;
      results.push({
        tier: s.tier,
        module: s.module,
        passed: res.passed,
        failed: res.failed,
        assertions: res.assertions,
        durationMs: Math.round(dur),
      });
    } catch (err: any) {
      const dur = performance.now() - sStart;
      results.push({
        tier: s.tier,
        module: s.module,
        passed: 0,
        failed: 1,
        assertions: 0,
        durationMs: Math.round(dur),
      });
      console.error(`Suite Error [${s.module}]:`, err);
    }
  }

  const totalDuration = (performance.now() - startTime).toFixed(1);

  // Print Summary Table
  console.log('---------------------------------------------------------------------------------------------------------');
  console.log('| Tier                 | Module                                       | Passed | Failed | Assertions | Time   |');
  console.log('---------------------------------------------------------------------------------------------------------');

  let totalPassed = 0;
  let totalFailed = 0;
  let totalAssertions = 0;

  for (const r of results) {
    totalPassed += r.passed;
    totalFailed += r.failed;
    totalAssertions += r.assertions;
    const tierPadded = r.tier.padEnd(20);
    const modPadded = r.module.padEnd(44);
    const passPadded = String(r.passed).padStart(6);
    const failPadded = String(r.failed).padStart(6);
    const assertPadded = String(r.assertions).padStart(10);
    const timePadded = `${r.durationMs}ms`.padStart(6);
    console.log(`| ${tierPadded} | ${modPadded} | ${passPadded} | ${failPadded} | ${assertPadded} | ${timePadded} |`);
  }

  console.log('---------------------------------------------------------------------------------------------------------');
  console.log(`| TOTALS               | 10 Test Modules                              | ${String(totalPassed).padStart(6)} | ${String(totalFailed).padStart(6)} | ${String(totalAssertions).padStart(10)} | ${(totalDuration + 'ms').padStart(6)} |`);
  console.log('---------------------------------------------------------------------------------------------------------\n');

  if (totalFailed === 0) {
    console.log(`SUCCESS: All ${totalPassed} test cases passed across all 4 tiers (${totalAssertions} assertions verified in ${totalDuration}ms).\n`);
    process.exit(0);
  } else {
    console.error(`FAILURE: ${totalFailed} test cases failed out of ${totalPassed + totalFailed}.\n`);
    process.exit(1);
  }
}

runAllSuites();
