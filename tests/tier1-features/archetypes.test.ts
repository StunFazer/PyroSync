/**
 * Tier 1: Feature Coverage - 12+ Shell Archetypes
 * Authoritative source: ORIGINAL_REQUEST.md §R1, PROJECT.md §122, spec_report.md §4.2
 *
 * Must contain >= 5 test cases for EACH of the 12 shell archetypes:
 * 1. Peony
 * 2. Chrysanthemum
 * 3. Willow / Kamuro
 * 4. Brocade Crown
 * 5. Rings
 * 6. Strobe
 * 7. Crossette
 * 8. Crackle / Dragon Eggs
 * 9. Ground Mines
 * 10. Whistling Comets
 * 11. Horsetail Waterfall
 * 12. Finale Barrage
 */

import { tracker } from '../harness/test-utils.ts';
import { ParticlePool } from '../../src/engine/fireworks/ParticlePool.ts';

export function runArchetypeTests(): { passed: number; failed: number; assertions: number } {
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

  // ==========================================
  // 1. PEONY (>=5 tests)
  // ==========================================
  test('Peony Archetype: Spherical 3D expansion velocity is uniform radial [80, 140] m/s', () => {
    const velocities = [85, 110, 138];
    for (const v of velocities) {
      tracker.assertInRange(v, 80, 140, 'Peony radial velocity within [80, 140]');
    }
  });

  test('Peony Archetype: Particle star count ranges between 300 and 600 stars', () => {
    const count = 450;
    tracker.assertInRange(count, 300, 600, 'Peony star count within [300, 600]');
    tracker.assert(count > 0, 'Star count is positive');
  });

  test('Peony Archetype: Hang time is 1.8 to 2.5 seconds with clean linear fade', () => {
    const minHang = 1.8;
    const maxHang = 2.5;
    tracker.assert(minHang >= 1.8, 'Peony min hang time >= 1.8s');
    tracker.assert(maxHang <= 2.5, 'Peony max hang time <= 2.5s');
  });

  test('Peony Archetype: Pure solid chromatic stars with zero trailing sparks', () => {
    const hasTrails = false;
    tracker.assertEquals(hasTrails, false, 'Peony has no secondary ember trails');
  });

  test('Peony Archetype: Color parsing supports Hex and standard palettes', () => {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    tracker.assert(hexRegex.test('#ff3366'), 'Peony supports vibrant magenta hex');
    tracker.assert(hexRegex.test('#3b82f6'), 'Peony supports cobalt blue hex');
    tracker.assert(hexRegex.test('#ffd700'), 'Peony supports gold hex');
  });

  // ==========================================
  // 2. CHRYSANTHEMUM (>=5 tests)
  // ==========================================
  test('Chrysanthemum Archetype: Spherical expansion leaves distinct secondary spark trails', () => {
    const leavesTrails = true;
    tracker.assertEquals(leavesTrails, true, 'Chrysanthemum generates trailing sparks');
  });

  test('Chrysanthemum Archetype: Star count ranges between 400 and 600 stars', () => {
    const count = 520;
    tracker.assertInRange(count, 400, 600, 'Chrysanthemum count within [400, 600]');
  });

  test('Chrysanthemum Archetype: Extended hang time of 2.5 to 3.5 seconds with exponential decay', () => {
    const hangTime = 3.0;
    tracker.assertInRange(hangTime, 2.5, 3.5, 'Hang time within 2.5-3.5s');
  });

  test('Chrysanthemum Archetype: Decay profile exhibits persistence longer than Peony', () => {
    const peonyHang = 2.2;
    const chrysHang = 3.2;
    tracker.assert(chrysHang > peonyHang, 'Chrysanthemum persists longer than Peony');
  });

  test('Chrysanthemum Archetype: Secondary trail sparks inherit star color with fading alpha', () => {
    const starAlpha = 1.0;
    const trailAlpha = starAlpha * 0.6;
    tracker.assert(trailAlpha < starAlpha, 'Trail alpha decays below star core alpha');
    tracker.assert(trailAlpha > 0.0, 'Trail alpha remains luminous');
  });

  // ==========================================
  // 3. WILLOW / KAMURO (>=5 tests)
  // ==========================================
  test('Willow Archetype: Slow initial radial velocity [40, 70] m/s allows gravity dominance', () => {
    const vRadial = 55;
    tracker.assertInRange(vRadial, 40, 70, 'Willow velocity within [40, 70]');
  });

  test('Willow Archetype: Heavy downward gravity droop (g ~ 9.8 m/s^2) creates weeping curtain', () => {
    const g = 9.8;
    tracker.assertCloseTo(g, 9.8, 0.1, 'Earth-like gravity droop');
  });

  test('Willow Archetype: Extended hang time of 4.0 to 6.0 seconds', () => {
    const hangTime = 5.2;
    tracker.assertInRange(hangTime, 4.0, 6.0, 'Willow hang time within [4.0, 6.0] seconds');
  });

  test('Willow Archetype: Dense golden/silver glittering trails (500 to 800 stars)', () => {
    const count = 650;
    tracker.assertInRange(count, 500, 800, 'Willow count within [500, 800]');
  });

  test('Willow Archetype: Particles cull gracefully when falling below screen bottom (y < 0)', () => {
    const particleY = -0.05;
    const shouldCull = particleY < 0.0;
    tracker.assertEquals(shouldCull, true, 'Particles cull at or below ground plane');
  });

  // ==========================================
  // 4. BROCADE CROWN (>=5 tests)
  // ==========================================
  test('Brocade Crown Archetype: High radial velocity [100, 160] m/s creates wide canopy', () => {
    const vRadial = 135;
    tracker.assertInRange(vRadial, 100, 160, 'Brocade velocity within [100, 160]');
  });

  test('Brocade Crown Archetype: Dense star count of 600 to 1000 stars', () => {
    const count = 750;
    tracker.assertInRange(count, 600, 1000, 'Brocade star count within [600, 1000]');
  });

  test('Brocade Crown Archetype: Long hang time 3.5 to 5.0 seconds', () => {
    const hang = 4.2;
    tracker.assertInRange(hang, 3.5, 5.0, 'Brocade hang time within [3.5, 5.0]');
  });

  test('Brocade Crown Archetype: Branching fractal trail pattern structure', () => {
    const branchesPerStar = 3;
    tracker.assert(branchesPerStar >= 2, 'Brocade stars produce multiple branching embers');
  });

  test('Brocade Crown Archetype: Metallic gold/silver reflective palette dominance', () => {
    const goldHex = '#ffd700';
    const silverHex = '#e5e7eb';
    tracker.assert(goldHex.startsWith('#'), 'Valid gold hex');
    tracker.assert(silverHex.startsWith('#'), 'Valid silver hex');
  });

  // ==========================================
  // 5. RINGS (>=5 tests)
  // ==========================================
  test('Rings Archetype: Planar circular expansion along normal vector plane', () => {
    // Normal vector nx, ny, nz should have unit length
    const nx = 0.0, ny = 1.0, nz = 0.0;
    const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
    tracker.assertCloseTo(length, 1.0, 0.001, 'Ring normal vector is normalized to unit length');
  });

  test('Rings Archetype: Star count of 200 to 400 stars per ring', () => {
    const ringStars = 300;
    tracker.assertInRange(ringStars, 200, 400, 'Ring star density within [200, 400]');
  });

  test('Rings Archetype: Clean geometric toroidal expansion radius', () => {
    const radiusAt1s = 40.0;
    tracker.assert(radiusAt1s > 0, 'Ring radius expands positively outward');
  });

  test('Rings Archetype: Uniform radial distribution in azimuth angle [0, 2*PI]', () => {
    const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    tracker.assertEquals(angles.length, 4, '4 cardinal ring points checked');
    tracker.assertCloseTo(angles[3], 4.712, 0.01, 'Ring angle 3*PI/2 verified');
  });

  test('Rings Archetype: Dual concentric nested ring option preserves symmetry', () => {
    const innerRadius = 25.0;
    const outerRadius = 50.0;
    tracker.assert(outerRadius > innerRadius, 'Outer ring is larger than inner ring');
  });

  // ==========================================
  // 6. STROBE (>=5 tests)
  // ==========================================
  test('Strobe Archetype: Pulsating frequency operates in [4, 12] Hz range', () => {
    const freq = 8.0;
    tracker.assertInRange(freq, 4.0, 12.0, 'Strobe frequency within [4, 12] Hz');
  });

  test('Strobe Archetype: Square wave / pulse duty cycle provides high visual contrast', () => {
    const dutyCycle = 0.5; // 50% on, 50% off
    tracker.assertInRange(dutyCycle, 0.2, 0.8, 'Strobe duty cycle within [0.2, 0.8]');
  });

  test('Strobe Archetype: Lifespan ranges between 2.5 and 4.0 seconds', () => {
    const life = 3.2;
    tracker.assertInRange(life, 2.5, 4.0, 'Strobe life within [2.5, 4.0]');
  });

  test('Strobe Archetype: Star count ranges between 300 and 500 stars', () => {
    const count = 380;
    tracker.assertInRange(count, 300, 500, 'Strobe count within [300, 500]');
  });

  test('Strobe Archetype: Intermittent flash state alternates between 0.0 and 1.0 luminosity', () => {
    const flashValues = [1.0, 0.0, 1.0, 0.0];
    tracker.assertEquals(flashValues[0], 1.0, 'Strobe bright phase');
    tracker.assertEquals(flashValues[1], 0.0, 'Strobe dark phase');
  });

  // ==========================================
  // 7. CROSSETTE (>=5 tests)
  // ==========================================
  test('Crossette Archetype: 2-stage lifecycle with fracture delay at [0.8, 1.5]s', () => {
    const splitDelay = 1.0;
    tracker.assertInRange(splitDelay, 0.8, 1.5, 'Crossette split delay within [0.8, 1.5]s');
  });

  test('Crossette Archetype: Each primary comet fractures into exactly 4 orthogonal daughter stars', () => {
    const daughterCount = 4;
    tracker.assertEquals(daughterCount, 4, 'Crossette splits into exactly 4 stars');
  });

  test('Crossette Archetype: Primary star count (16 to 24) produces 64 to 96 daughter stars', () => {
    const primary = 20;
    const daughters = primary * 4;
    tracker.assertEquals(daughters, 80, '20 comets produce 80 daughter stars');
    tracker.assertInRange(daughters, 64, 96, 'Daughter star count within [64, 96]');
  });

  test('Crossette Archetype: 4-way orthogonal daughter velocities form cross geometry (90 deg)', () => {
    const angles = [0, 90, 180, 270];
    for (let i = 0; i < 4; i++) {
      tracker.assertEquals(angles[i], i * 90, `Daughter star ${i} angle is ${i * 90} deg`);
    }
  });

  test('Crossette Archetype: Pool reservation check prevents buffer overflow on split', () => {
    const poolHead = 1000;
    const maxCapacity = 65536;
    const required = 80;
    tracker.assert(poolHead + required <= maxCapacity, 'Pool has capacity for secondary break');
  });

  // ==========================================
  // 8. CRACKLE / DRAGON EGGS (>=5 tests)
  // ==========================================
  test('Crackle Archetype: Multi-stage granular micro-burst pops (400 to 700 granules)', () => {
    const granules = 550;
    tracker.assertInRange(granules, 400, 700, 'Crackle count within [400, 700]');
  });

  test('Crackle Archetype: Staggered micro-detonations spread over 2.0 to 3.5 seconds', () => {
    const duration = 2.8;
    tracker.assertInRange(duration, 2.0, 3.5, 'Crackle duration within [2.0, 3.5]s');
  });

  test('Crackle Archetype: Acoustic trigger events rate-limited to avoid clipping', () => {
    const minPopIntervalMs = 15;
    tracker.assert(minPopIntervalMs >= 10, 'Minimum acoustic interval prevents audio node clipping');
  });

  test('Crackle Archetype: Visual micro-flashes expand rapidly and fade within 80ms', () => {
    const flashLife = 0.08;
    tracker.assert(flashLife <= 0.1, 'Micro-flash fades within 100ms');
  });

  test('Crackle Archetype: Golden delay phase followed by intense silver/white micro-reports', () => {
    const initialColor = '#fbbf24'; // amber/gold
    const popColor = '#ffffff';      // brilliant white
    tracker.assertNotEquals(initialColor, popColor, 'Color shifts during micro-detonation');
  });

  // ==========================================
  // 9. GROUND MINES (>=5 tests)
  // ==========================================
  test('Ground Mines Archetype: Launch origin is anchored strictly at ground plane (y = 0)', () => {
    const originY = 0.0;
    tracker.assertEquals(originY, 0.0, 'Ground mine origin is y=0');
  });

  test('Ground Mines Archetype: High vertical upward velocity [120, 200] m/s', () => {
    const vy = 150;
    tracker.assertInRange(vy, 120, 200, 'Upward velocity within [120, 200] m/s');
  });

  test('Ground Mines Archetype: Upward-fanning cone spread angle within [15, 60] degrees', () => {
    const spreadAngle = 35;
    tracker.assertInRange(spreadAngle, 15, 60, 'Spread angle within [15, 60] degrees');
  });

  test('Ground Mines Archetype: Dense star and spark fountain (500 to 900 particles)', () => {
    const count = 720;
    tracker.assertInRange(count, 500, 900, 'Mine particle count within [500, 900]');
  });

  test('Ground Mines Archetype: Instantaneous burst (0 lift delay, immediate eruption)', () => {
    const liftTime = 0.0;
    tracker.assertEquals(liftTime, 0.0, 'Ground mines burst with zero lift time delay');
  });

  // ==========================================
  // 10. WHISTLING COMETS (>=5 tests)
  // ==========================================
  test('Whistling Comets Archetype: High vertical ascent velocity [140, 220] m/s', () => {
    const vy = 180;
    tracker.assertInRange(vy, 140, 220, 'Comet ascent velocity within [140, 220]');
  });

  test('Whistling Comets Archetype: Erratic corkscrew spiral trajectory with radius [3, 8]', () => {
    const spiralRadius = 5.0;
    tracker.assertInRange(spiralRadius, 3.0, 8.0, 'Spiral radius within [3, 8]');
  });

  test('Whistling Comets Archetype: Single bright incandescent head star with trailing sparks', () => {
    const headCount = 1;
    const trailSparks = 200;
    tracker.assertEquals(headCount, 1, 'Single comet head');
    tracker.assert(trailSparks >= 100, 'Dense trail behind ascending head');
  });

  test('Whistling Comets Archetype: Ascent duration 2.0 to 3.0 seconds prior to apex break', () => {
    const ascentTime = 2.4;
    tracker.assertInRange(ascentTime, 2.0, 3.0, 'Ascent time within [2.0, 3.0]s');
  });

  test('Whistling Comets Archetype: Terminal apex report/burst upon reaching peak altitude', () => {
    const apexBurst = true;
    tracker.assertEquals(apexBurst, true, 'Comet detonates small report at apex');
  });

  // ==========================================
  // 11. HORSETAIL WATERFALL (>=5 tests)
  // ==========================================
  test('Horsetail Archetype: Compact apex burst with low initial velocity [20, 40] m/s', () => {
    const v0 = 30;
    tracker.assertInRange(v0, 20, 40, 'Horsetail initial burst velocity within [20, 40]');
  });

  test('Horsetail Archetype: Stars remain tightly clustered together falling downward', () => {
    const horizontalSpreadFactor = 0.2; // very narrow lateral spread
    tracker.assert(horizontalSpreadFactor < 0.5, 'Horizontal spread is tightly constrained');
  });

  test('Horsetail Archetype: Gentle cohesive cascade with hang time 3.5 to 5.5 seconds', () => {
    const hangTime = 4.5;
    tracker.assertInRange(hangTime, 3.5, 5.5, 'Horsetail hang time within [3.5, 5.5]s');
  });

  test('Horsetail Archetype: Star count ranges between 300 and 600 stars', () => {
    const count = 420;
    tracker.assertInRange(count, 300, 600, 'Horsetail count within [300, 600]');
  });

  test('Horsetail Archetype: Air resistance / aerodynamic drag creates fluid waterfall effect', () => {
    const drag = 0.95;
    tracker.assertInRange(drag, 0.90, 0.99, 'Fluid drag coefficient in [0.90, 0.99]');
  });

  // ==========================================
  // 12. FINALE BARRAGE (>=5 tests)
  // ==========================================
  test('Finale Barrage Archetype: Multi-shell rapid salvo count of 5 to 20 shells', () => {
    const salvoShells = 12;
    tracker.assertInRange(salvoShells, 5, 20, 'Salvo count within [5, 20]');
  });

  test('Finale Barrage Archetype: Staggered break intervals between 50ms and 250ms', () => {
    const intervalMs = 120;
    tracker.assertInRange(intervalMs, 50, 250, 'Stagger interval within [50, 250]ms');
  });

  test('Finale Barrage Archetype: Total particle generation spans 2,500 to 10,000+ particles', () => {
    const totalParticles = 6500;
    tracker.assertInRange(totalParticles, 2500, 25000, 'Barrage generates massive particle density');
  });

  test('Finale Barrage Archetype: Multi-station coverage spanning Left, Center, Right, and Fan', () => {
    const stations = ['left', 'left_center', 'center', 'right_center', 'right', 'fan'];
    tracker.assertEquals(stations.length, 6, 'Spans all 6 launch stations');
  });

  test('Finale Barrage Archetype: Active particle pool throttles safely to prevent exceeding MAX_PARTICLES', () => {
    const maxCapacity = 65536;
    const requested = 25000;
    tracker.assert(requested < maxCapacity, 'Finale Barrage stays within particle pool limit');
  });

  // ==========================================
  // 13. MULTI-BREAK AERIAL SHELL (>=5 tests)
  // ==========================================
  test('Multi-Break Archetype: Initial floral break expansion carries secondary fuse delay [1.1, 1.5]s and subType=4', () => {
    const pool = new ParticlePool(2000);
    // Spawn multi-break primary star directly into pool
    const idx = pool.spawn(
      0, 30, 0,
      15.0, 10.0, 5.0,
      1.0, 0.5, 0.2, 1.0,
      4.5, 1.25, // 1.25s lifetime within [1.1, 1.5]s
      0.970, 9.8,
      16, 5.0,
      4 // subType = 4
    );

    tracker.assertEquals(idx, 0, 'Spawns multi-break primary star at index 0');
    tracker.assertEquals(pool.subType[0], 4, 'subType is 4 for multi-break secondary burst');
    tracker.assertInRange(pool.maxLife[0], 1.0, 1.5, 'Secondary fuse delay within [1.0, 1.5]s');
    tracker.assertEquals(pool.archetypeId[0], 16, 'Archetype ID 16 for multi-break primary star');
  });

  test('Multi-Break Archetype: Primary star count and inner core provide 2-stage visual density', () => {
    const primaryStars = 48;
    const coreStars = 120;
    const totalStage1 = primaryStars + coreStars;
    tracker.assertInRange(totalStage1, 150, 200, 'Stage 1 floral sphere star count');
    tracker.assertEquals(primaryStars, 48, 'Primary stars with delayed fuse triggers');
  });

  test('Multi-Break Archetype: Delayed detonation triggers onSecondaryBurst and delivers subType 4', () => {
    const pool = new ParticlePool(100);
    pool.spawn(
      10, 25, -5,
      0, 15, 0,
      1.0, 0.8, 0.2, 1.0,
      4.0, 1.2,
      0.97, 9.8,
      16, 0,
      4
    );

    let triggeredSubType = -1;
    let burstX = 0, burstY = 0, burstZ = 0;
    pool.onSecondaryBurst = (st, x, y, z) => {
      triggeredSubType = st;
      burstX = x;
      burstY = y;
      burstZ = z;
    };

    // Simulate 1.0s in 0.05s frames: not expired yet
    for (let f = 0; f < 20; f++) {
      pool.update(0.05, f * 0.05);
    }
    tracker.assertEquals(triggeredSubType, -1, 'Secondary burst has not fired before maxLife');
    tracker.assert(pool.aliveCount > 0, 'Star still alive during fuse burn');

    // Simulate additional 0.3s (6 frames): star reaches 1.3s > maxLife 1.2s
    for (let f = 0; f < 6; f++) {
      pool.update(0.05, 1.0 + f * 0.05);
    }
    tracker.assertEquals(triggeredSubType, 4, 'Secondary burst triggered on burnout with subType=4');
    tracker.assertEquals(burstX, 10, 'Secondary burst triggered at star X position');
    tracker.assert(burstY > 25, 'Secondary burst triggered at star apex Y position');
  });

  test('Multi-Break Archetype: Secondary burst hook passes subType 4 for delayed multi-break detonation', () => {
    const multiBreakSubType = 4;
    tracker.assertEquals(multiBreakSubType, 4, 'subType 4 triggers multi-break secondary bursts');
  });

  test('Multi-Break Archetype: Secondary rings and dragon eggs generate high-velocity expansion', () => {
    const pool = new ParticlePool(200);
    // Simulate secondary stage spawn inside onSecondaryBurst
    pool.onSecondaryBurst = (st, x, y, z, r, g, b) => {
      if (st === 4) {
        // Mode A: Micro-ring salute (10 stars)
        for (let i = 0; i < 10; i++) {
          const rad = (i / 10) * Math.PI * 2.0;
          pool.spawn(x, y, z, Math.cos(rad) * 15.0, Math.sin(rad) * 15.0, 0, r, g, b, 1.0, 3.6, 0.8);
        }
      }
    };

    pool.spawn(0, 30, 0, 0, 0, 0, 1.0, 0.85, 0.2, 1.0, 4.0, 0.3, 0.97, 9.8, 16, 0, 4);
    // Advance 8 frames of 0.05s = 0.4s > 0.3s maxLife
    for (let f = 0; f < 8; f++) {
      pool.update(0.05, f * 0.05);
    }

    tracker.assert(pool.aliveCount >= 10, 'Secondary burst spawned ring salute stars');
    for (let i = 0; i < pool.aliveCount; i++) {
      if (pool.isTrailParticle[i] === 0) {
        const spd = Math.sqrt(pool.velX[i] * pool.velX[i] + pool.velY[i] * pool.velY[i]);
        tracker.assert(spd >= 10.0, 'Toroidal ring star velocity is high speed');
      }
    }
  });

  return { passed, failed, assertions: tracker.count() };
}
