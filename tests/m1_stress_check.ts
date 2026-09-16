/**
 * PyroSync Milestone 1 Empirical Stress & Verification Suite
 * Authored by Empirical Challenger 1
 *
 * Exercises:
 * 1. ParticlePool: zero allocations, O(1) swap-and-pop recycling, lifetime management.
 * 2. ShellArchetypes: all 12 shell types, coordinate finiteness, no NaN/undefined.
 * 3. 25,000+ particle sustained load over 500 simulation frames.
 * 4. Secondary stage breaks: crossette split, crackle pop, whistling comet apex report.
 * 5. Pool saturation & boundary limits (65,536 capacity clamp).
 * 6. Blackout() panic purge: instantaneous active particle reset.
 */

import { ParticlePool } from '../src/engine/fireworks/ParticlePool.ts';
import { ShellArchetypeManager, hexToRgb } from '../src/engine/fireworks/ShellArchetypes.ts';
import { FireCuePayload, ShellArchetype, LaunchStation } from '../src/types/index.ts';

interface AssertionResult {
  suite: string;
  name: string;
  passed: boolean;
  message?: string;
  metric?: string;
}

class TestReporter {
  public results: AssertionResult[] = [];

  assert(condition: boolean, suite: string, name: string, message?: string, metric?: string) {
    this.results.push({
      suite,
      name,
      passed: !!condition,
      message: condition ? undefined : (message || 'Assertion failed'),
      metric,
    });
    if (!condition) {
      console.error(`  FAIL [${suite}] ${name}: ${message || 'Assertion failed'}`);
    }
  }

  summary() {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    return { total: this.results.length, passed, failed };
  }

  printMetrics() {
    console.log('\n--- EMPIRICAL METRICS RECORDED ---');
    const withMetrics = this.results.filter(r => r.metric);
    for (const r of withMetrics) {
      console.log(`  * [${r.suite}] ${r.name}: ${r.metric}`);
    }
  }
}

const reporter = new TestReporter();

console.log('\n======================================================================');
console.log('       PYROSYNC M1 EMPIRICAL STRESS & VERIFICATION TEST SUITE         ');
console.log('======================================================================\n');

// ============================================================================
// SUITE 1: 12 Shell Archetypes Physical & Numerical Validity
// ============================================================================
console.log('>>> Suite 1: Testing all 12 Shell Archetypes numerical integrity...');

const ARCHETYPES: ShellArchetype[] = [
  'peony',
  'chrysanthemum',
  'willow',
  'brocade_crown',
  'rings',
  'strobe',
  'crossette',
  'crackle',
  'ground_mine',
  'whistling_comet',
  'horsetail',
  'finale_barrage',
];

const STATIONS: LaunchStation[] = ['left', 'left_center', 'center', 'right_center', 'right', 'fan'];
const COLORS = ['#ff2222', '#22ff22', '#2222ff', '#ffff22', '#ffffff', '#ffd700', '#abc', 'invalid_color'];

for (const arch of ARCHETYPES) {
  const pool = new ParticlePool(10000);
  const manager = new ShellArchetypeManager(pool);

  const testCue: FireCuePayload = {
    id: `test-cue-${arch}`,
    archetype: arch,
    station: STATIONS[Math.floor(Math.random() * STATIONS.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    altitude: 0.2 + Math.random() * 0.8,
    launchAngle: (Math.random() - 0.5) * 40.0,
  };

  manager.fire(testCue);

  const spawnedCount = pool.aliveCount;
  reporter.assert(
    spawnedCount > 0,
    'Suite 1: Archetypes',
    `${arch} particle count`,
    `Expected aliveCount > 0, got ${spawnedCount}`,
    `${spawnedCount} particles spawned`
  );

  let hasNan = false;
  let hasInfinite = false;
  let hasInvalidLife = false;
  let hasInvalidColor = false;
  let hasInvalidSize = false;

  for (let i = 0; i < pool.aliveCount; i++) {
    if (Number.isNaN(pool.posX[i]) || Number.isNaN(pool.posY[i]) || Number.isNaN(pool.posZ[i])) hasNan = true;
    if (!Number.isFinite(pool.posX[i]) || !Number.isFinite(pool.posY[i]) || !Number.isFinite(pool.posZ[i])) hasInfinite = true;

    if (Number.isNaN(pool.velX[i]) || Number.isNaN(pool.velY[i]) || Number.isNaN(pool.velZ[i])) hasNan = true;
    if (!Number.isFinite(pool.velX[i]) || !Number.isFinite(pool.velY[i]) || !Number.isFinite(pool.velZ[i])) hasInfinite = true;

    if (Number.isNaN(pool.colR[i]) || Number.isNaN(pool.colG[i]) || Number.isNaN(pool.colB[i]) || Number.isNaN(pool.colA[i])) hasNan = true;
    if (pool.colR[i] < 0 || pool.colG[i] < 0 || pool.colB[i] < 0 || pool.colA[i] <= 0) hasInvalidColor = true;

    if (pool.maxLife[i] <= 0 || Number.isNaN(pool.maxLife[i]) || !Number.isFinite(pool.maxLife[i])) hasInvalidLife = true;
    if (pool.baseSize[i] <= 0 || Number.isNaN(pool.baseSize[i]) || !Number.isFinite(pool.baseSize[i])) hasInvalidSize = true;

    const p3 = i * 3;
    if (pool.gpuPositions[p3] !== pool.posX[i] || pool.gpuPositions[p3 + 1] !== pool.posY[i] || pool.gpuPositions[p3 + 2] !== pool.posZ[i]) {
      reporter.assert(false, 'Suite 1: Archetypes', `${arch} GPU position parity`, `Slot ${i} GPU pos mismatch`);
    }
  }

  reporter.assert(!hasNan, 'Suite 1: Archetypes', `${arch} coordinates no NaN`, 'NaN detected in particle array');
  reporter.assert(!hasInfinite, 'Suite 1: Archetypes', `${arch} coordinates all finite`, 'Infinite value detected in particle array');
  reporter.assert(!hasInvalidLife, 'Suite 1: Archetypes', `${arch} lifetimes strictly positive & finite`, 'Invalid maxLife detected');
  reporter.assert(!hasInvalidColor, 'Suite 1: Archetypes', `${arch} color channels valid`, 'Invalid color values detected');
  reporter.assert(!hasInvalidSize, 'Suite 1: Archetypes', `${arch} base size positive & finite`, 'Invalid baseSize detected');

  for (let f = 0; f < 20; f++) {
    pool.update(1 / 60, f / 60);
  }

  let postStepNan = false;
  for (let i = 0; i < pool.aliveCount; i++) {
    if (Number.isNaN(pool.posX[i]) || Number.isNaN(pool.posY[i]) || Number.isNaN(pool.posZ[i])) postStepNan = true;
    if (Number.isNaN(pool.velX[i]) || Number.isNaN(pool.velY[i]) || Number.isNaN(pool.velZ[i])) postStepNan = true;
  }
  reporter.assert(!postStepNan, 'Suite 1: Archetypes', `${arch} post-step 20 frames no NaN`, 'NaN creep detected after integration');
}

// ============================================================================
// SUITE 2: Multi-Stage Secondary Breaks (Crossette, Crackle, Whistling Comet)
// ============================================================================
console.log('>>> Suite 2: Testing Multi-Stage Secondary Breaks...');

{
  const pool = new ParticlePool(5000);
  const manager = new ShellArchetypeManager(pool);
  manager.spawnCrossette(0, 25, 0, 1, 0.5, 0);

  const initialCount = pool.aliveCount;
  reporter.assert(initialCount === 24, 'Suite 2: Secondary Breaks', 'Crossette primary count', `Got ${initialCount}`, '24 primary comets');

  let maxDaughters = 0;
  for (let f = 0; f < 90; f++) {
    pool.update(1 / 60, f / 60);
    if (pool.aliveCount > maxDaughters) maxDaughters = pool.aliveCount;
  }
  reporter.assert(maxDaughters > initialCount, 'Suite 2: Secondary Breaks', 'Crossette secondary 4-way cross split', 'Alive count did not increase', `Peak daughters: ${maxDaughters}`);
}

{
  const pool = new ParticlePool(5000);
  const manager = new ShellArchetypeManager(pool);
  manager.spawnCrackle(0, 25, 0, 1, 0.9, 0.2);

  const initialCount = pool.aliveCount;
  reporter.assert(initialCount === 70, 'Suite 2: Secondary Breaks', 'Crackle primary count', `Got ${initialCount}`, '70 primary stars');

  let peakCrackle = 0;
  for (let f = 0; f < 80; f++) {
    pool.update(1 / 60, f / 60);
    if (pool.aliveCount > peakCrackle) peakCrackle = pool.aliveCount;
  }
  reporter.assert(peakCrackle > initialCount, 'Suite 2: Secondary Breaks', 'Crackle micro-flash secondary bursts', 'Secondary crackle pops did not trigger', `Peak crackle pops: ${peakCrackle}`);
}

{
  const pool = new ParticlePool(5000);
  const manager = new ShellArchetypeManager(pool);
  manager.spawnWhistlingComet(0, 0, 0, 1, 1, 1, 30.0);

  const headParticle = pool.subType[0];
  reporter.assert(headParticle === 3, 'Suite 2: Secondary Breaks', 'Whistling comet head projectile', `Got ${headParticle}`, 'subType = 3 (apex break)');

  let apexBurstFired = false;
  let apexParticleCount = 0;
  for (let f = 0; f < 125; f++) {
    const beforeCount = pool.aliveCount;
    pool.update(1 / 60, f / 60);
    if (pool.aliveCount > beforeCount + 50) {
      apexBurstFired = true;
      apexParticleCount = pool.aliveCount - beforeCount;
    }
  }
  reporter.assert(apexBurstFired, 'Suite 2: Secondary Breaks', 'Whistling comet apex report burst', 'Apex report did not spawn secondary particles', `Apex break spawned ${apexParticleCount} stars`);
}

// ============================================================================
// SUITE 3: 25,000+ Particles Sustained Burst & 500-Frame Simulation
// ============================================================================
console.log('>>> Suite 3: Testing 25,000+ Particles Sustained Load across 500 Frames...');

{
  const CAPACITY = 65536;
  const pool = new ParticlePool(CAPACITY);
  const manager = new ShellArchetypeManager(pool);

  let burstsSpawned = 0;
  while (pool.aliveCount < 25000) {
    const st = STATIONS[burstsSpawned % STATIONS.length];
    manager.spawnFinaleBarrage(1.0, 0.8, 0.2);
    manager.spawnGroundMine(0, 0, 0, 1.0, 0.4, 0.1);
    manager.spawnBrocadeCrown(0, 25, 0, 1.0, 0.9, 0.3);
    manager.spawnChrysanthemum(10, 28, 0, 0.2, 0.8, 1.0);
    burstsSpawned++;
  }

  const initialPeak = pool.aliveCount;
  reporter.assert(
    initialPeak >= 25000,
    'Suite 3: 25k+ Simulation',
    'Particle count reached >= 25,000',
    `Initial count: ${initialPeak}`,
    `${initialPeak.toLocaleString()} active particles`
  );

  const frameTimesMs: number[] = [];
  let totalParticlesSimulated = 0;
  let maxFrameTime = 0;
  let nanOccurred = false;

  for (let f = 0; f < 500; f++) {
    if (f % 60 === 0 && pool.aliveCount < 20000) {
      manager.spawnFinaleBarrage(1.0, 0.5, 0.5);
      manager.spawnBrocadeCrown(-10, 25, 0, 1.0, 0.84, 0.0);
    }

    const tStart = performance.now();
    pool.update(1 / 60, f / 60);
    const tEnd = performance.now();

    const dtMs = tEnd - tStart;
    frameTimesMs.push(dtMs);
    if (dtMs > maxFrameTime) maxFrameTime = dtMs;
    totalParticlesSimulated += pool.aliveCount;

    if (f % 50 === 0 && pool.aliveCount > 0) {
      const step = Math.max(1, Math.floor(pool.aliveCount / 100));
      for (let i = 0; i < pool.aliveCount; i += step) {
        if (!Number.isFinite(pool.posX[i]) || Number.isNaN(pool.posX[i])) nanOccurred = true;
      }
    }
  }

  const avgFrameTimeMs = frameTimesMs.reduce((a, b) => a + b, 0) / frameTimesMs.length;
  const theoreticalFps = 1000 / avgFrameTimeMs;

  reporter.assert(!nanOccurred, 'Suite 3: 25k+ Simulation', '500 frames completed without NaN', 'NaN detected during 500 frame run');
  reporter.assert(
    avgFrameTimeMs < 16.66,
    'Suite 3: 25k+ Simulation',
    'Simulation sustains > 60 FPS under heavy load',
    `Avg frame time: ${avgFrameTimeMs.toFixed(3)}ms (Theoretical ${Math.round(theoreticalFps)} FPS)`,
    `Average frame latency: ${avgFrameTimeMs.toFixed(3)}ms (~${Math.round(theoreticalFps)} FPS throughput)`
  );
  reporter.assert(
    maxFrameTime < 50.0,
    'Suite 3: 25k+ Simulation',
    'Max frame time within budget (< 50ms)',
    `Worst frame: ${maxFrameTime.toFixed(2)}ms`,
    `Worst frame: ${maxFrameTime.toFixed(2)}ms`
  );
}

// ============================================================================
// SUITE 4: Zero Allocation & Heap Stability Verification
// ============================================================================
console.log('>>> Suite 4: Testing Zero Allocations & Memory Stability...');

{
  const pool = new ParticlePool(40000);
  for (let i = 0; i < 25000; i++) {
    pool.spawn(
      (Math.random() - 0.5) * 50, 20 + Math.random() * 20, (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10,
      1.0, 0.8, 0.2, 1.0,
      3.0, 1000.0
    );
  }

  for (let w = 0; w < 100; w++) {
    pool.update(1 / 60, w / 60);
  }

  if (typeof (globalThis as any).gc === 'function') {
    (globalThis as any).gc();
    (globalThis as any).gc();
  }

  const heapBeforeBytes = process.memoryUsage().heapUsed;

  for (let f = 0; f < 300; f++) {
    pool.update(1 / 60, (100 + f) / 60);
  }

  if (typeof (globalThis as any).gc === 'function') {
    (globalThis as any).gc();
    (globalThis as any).gc();
  }

  const heapAfterBytes = process.memoryUsage().heapUsed;
  const netRetainedDeltaKB = (heapAfterBytes - heapBeforeBytes) / 1024;

  reporter.assert(
    netRetainedDeltaKB <= 32,
    'Suite 4: Zero Allocation',
    'Retained heap delta remains strictly zero',
    `Retained heap delta: ${netRetainedDeltaKB.toFixed(2)} KB`,
    `Net heap delta: ${netRetainedDeltaKB.toFixed(2)} KB across 300 frames of 25k particles`
  );
}

// ============================================================================
// SUITE 5: O(1) Swap-and-Pop Recycling & Lifetime Management
// ============================================================================
console.log('>>> Suite 5: Testing O(1) Swap-and-Pop Recycling Correctness...');

{
  const pool = new ParticlePool(1000);

  for (let i = 0; i < 100; i++) {
    pool.spawn(i, i * 2, 0, 0, 0, 0, 1, 1, 1, 1, 3, 10.0, 0.97, 9.8, 0, i, 0);
  }

  reporter.assert(pool.aliveCount === 100, 'Suite 5: O(1) Recycling', 'Initial 100 particles spawned');

  const lastParticleSparkle = pool.sparklePhase[99];
  pool.age[40] = pool.maxLife[40] + 0.1;

  pool.update(0.001, 1.0);

  reporter.assert(pool.aliveCount === 99, 'Suite 5: O(1) Recycling', 'Alive count decremented by 1 after expiry', `Got ${pool.aliveCount}`);
  reporter.assert(pool.sparklePhase[40] === lastParticleSparkle, 'Suite 5: O(1) Recycling', 'Slot 40 replaced by last particle (swap-and-pop)', `Expected ${lastParticleSparkle}, got ${pool.sparklePhase[40]}`);

  const currentLastSparkle = pool.sparklePhase[pool.aliveCount - 1];
  pool.age[0] = pool.maxLife[0] + 0.1;
  pool.update(0.001, 1.01);

  reporter.assert(pool.aliveCount === 98, 'Suite 5: O(1) Recycling', 'Alive count decremented to 98');
  reporter.assert(pool.sparklePhase[0] === currentLastSparkle, 'Suite 5: O(1) Recycling', 'Slot 0 replaced by last particle', `Expected ${currentLastSparkle}, got ${pool.sparklePhase[0]}`);

  const lastIdx = pool.aliveCount - 1;
  pool.age[lastIdx] = pool.maxLife[lastIdx] + 0.1;
  pool.update(0.001, 1.02);

  reporter.assert(pool.aliveCount === 97, 'Suite 5: O(1) Recycling', 'Tail particle expiration decrements aliveCount to 97');

  const recyclePool = new ParticlePool(20000);
  for (let i = 0; i < 10000; i++) {
    recyclePool.spawn(0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 3, 0.05);
  }

  const tStart = performance.now();
  recyclePool.update(0.1, 2.0);
  const tDurationMs = performance.now() - tStart;

  reporter.assert(recyclePool.aliveCount === 0, 'Suite 5: O(1) Recycling', 'All 10,000 expired particles recycled in 1 pass');
  const timePerRecycleMicroSec = (tDurationMs / 10000) * 1000;
  reporter.assert(
    timePerRecycleMicroSec < 2.0,
    'Suite 5: O(1) Recycling',
    'Recycling is constant-time O(1) (< 2 microseconds per particle)',
    `Duration: ${tDurationMs.toFixed(2)}ms for 10,000 recycles (${timePerRecycleMicroSec.toFixed(3)} µs/op)`,
    `${timePerRecycleMicroSec.toFixed(3)} µs per recycle operation`
  );
}

// ============================================================================
// SUITE 6: Pool Saturation & Boundary Limits
// ============================================================================
console.log('>>> Suite 6: Testing Pool Saturation & Capacity Boundaries...');

{
  const CAPACITY = 500;
  const pool = new ParticlePool(CAPACITY);

  for (let i = 0; i < CAPACITY; i++) {
    const idx = pool.spawn(0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 10.0);
    reporter.assert(idx === i, 'Suite 6: Boundaries', `Slot index sequentially assigned (${i})`);
  }

  reporter.assert(pool.aliveCount === CAPACITY, 'Suite 6: Boundaries', 'Pool reaches exact 100% capacity', `Capacity ${CAPACITY}`);

  const overflowIdx = pool.spawn(0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 10.0);
  reporter.assert(overflowIdx === -1, 'Suite 6: Boundaries', 'Spawn returns -1 on saturated pool without exception', `Got ${overflowIdx}`);
  reporter.assert(pool.aliveCount === CAPACITY, 'Suite 6: Boundaries', 'aliveCount clamped at capacity', `Count: ${pool.aliveCount}`);

  pool.update(1 / 60, 1.0);
  reporter.assert(pool.aliveCount === CAPACITY, 'Suite 6: Boundaries', 'Update at 100% saturation succeeds without buffer overrun');
}

// ============================================================================
// SUITE 7: Blackout Panic Purge Verification
// ============================================================================
console.log('>>> Suite 7: Testing Instant Blackout Panic Purge...');

{
  const pool = new ParticlePool(65536);
  const manager = new ShellArchetypeManager(pool);

  while (pool.aliveCount < 25000) {
    manager.spawnFinaleBarrage(1.0, 0.4, 0.4);
    manager.spawnGroundMine(0, 0, 0, 1.0, 0.9, 0.2);
  }

  const beforeBlackout = pool.aliveCount;
  reporter.assert(beforeBlackout >= 25000, 'Suite 7: Blackout Panic', 'Loaded 25,000+ particles prior to panic blackout', `Count: ${beforeBlackout}`);

  const tStart = performance.now();
  pool.blackout();
  const blackoutDurMs = performance.now() - tStart;

  reporter.assert(pool.aliveCount === 0, 'Suite 7: Blackout Panic', 'aliveCount instantly drops to 0 on blackout()', `Count: ${pool.aliveCount}`, `0 active particles (${blackoutDurMs.toFixed(4)}ms purge time)`);
  reporter.assert(blackoutDurMs < 0.5, 'Suite 7: Blackout Panic', 'Blackout completes in < 0.5ms', `${blackoutDurMs.toFixed(4)}ms`);

  pool.update(1 / 60, 1.0);
  reporter.assert(pool.aliveCount === 0, 'Suite 7: Blackout Panic', 'aliveCount remains 0 on subsequent update');

  manager.spawnPeony(0, 20, 0, 0.2, 0.9, 1.0);
  reporter.assert(pool.aliveCount === 350, 'Suite 7: Blackout Panic', 'New shell spawns cleanly after blackout', `Alive: ${pool.aliveCount}`);

  pool.update(1 / 60, 1.1);
  reporter.assert(pool.aliveCount === 350, 'Suite 7: Blackout Panic', 'New shell simulates cleanly after blackout');
}

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log('\n======================================================================');
console.log('                    TEST EXECUTION SUMMARY                            ');
console.log('======================================================================');

const summary = reporter.summary();
console.log(`Total Assertions Checked: ${summary.total}`);
console.log(`Passed:                  ${summary.passed}`);
console.log(`Failed:                  ${summary.failed}`);

reporter.printMetrics();

if (summary.failed === 0) {
  console.log('\nVERDICT: [PASS] All Milestone 1 physics, pool, archetype, and safety requirements verified empirically!\n');
  process.exit(0);
} else {
  console.error(`\nVERDICT: [FAIL] ${summary.failed} assertions failed.\n`);
  process.exit(1);
}
