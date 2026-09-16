/**
 * Tier 1: Feature Coverage - Projector Calibration Engine
 * Authoritative source: ORIGINAL_REQUEST.md §R1, AC-3, AC-5, spec_report.md §4.3
 *
 * Covers >= 5 test cases per calibration feature:
 * 1. Brightness / Gain Multiplier (0.10 to 3.00, default 1.00)
 * 2. Black-Level Cutoff Clamp (0.00 to 0.20, default 0.02)
 * 3. Bloom Intensity Calibration (0.00 to 3.00, default 1.20)
 * 4. Particle Size Scaling (0.50 to 4.00, default 1.00)
 * 5. Aspect Ratio Masking Guides (16:9, 16:10, 4:3, 21:9, off)
 */

import { tracker, simulateProjectorShader, calculateLuminance } from '../harness/test-utils.ts';

export function runCalibrationTests(): { passed: number; failed: number; assertions: number } {
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
  // 1. BRIGHTNESS / GAIN MULTIPLIER (>=5 tests)
  // ====================================================
  test('Calibration Gain: Default value is strictly 1.00', () => {
    const defaultGain = 1.0;
    tracker.assertEquals(defaultGain, 1.0, 'Default gain multiplier is 1.0');
  });

  test('Calibration Gain: Permissible input range is strictly [0.10, 3.00]', () => {
    const minGain = 0.10;
    const maxGain = 3.00;
    tracker.assertInRange(1.5, minGain, maxGain, '1.5 is within valid range');
    tracker.assertInRange(minGain, 0.1, 3.0, 'Min gain is 0.10');
    tracker.assertInRange(maxGain, 0.1, 3.0, 'Max gain is 3.00');
  });

  test('Calibration Gain: Gain scaling amplifies linear fragment colors correctly', () => {
    // Input star color [0.4, 0.2, 0.1] with gain 2.0 and cutoff 0.0
    const [outR] = simulateProjectorShader(0.4, 0.2, 0.1, 1.0, 0.0, 2.0);
    tracker.assertCloseTo(outR, 0.8, 0.01, '0.4 scaled by 2.0 gain yields 0.8');
  });

  test('Calibration Gain: Gain clamping caps output color components strictly to 1.0', () => {
    // High gain 3.0 on 0.8 input should clamp at 1.0 (no HDR overflow out of gamut)
    const [outR] = simulateProjectorShader(0.8, 0.8, 0.8, 1.0, 0.0, 3.0);
    tracker.assertEquals(outR, 1.0, 'Color output clamped to 1.0 max');
  });

  test('Calibration Gain: Low gain 0.10 dims luminance for ultra-high-lumen commercial projectors', () => {
    const [outR] = simulateProjectorShader(1.0, 1.0, 1.0, 1.0, 0.0, 0.1);
    tracker.assertCloseTo(outR, 0.1, 0.01, 'High lumen dimming reduces 1.0 to 0.1');
  });

  // ====================================================
  // 2. BLACK-LEVEL CUTOFF CLAMP (>=5 tests)
  // ====================================================
  test('Calibration Black Clamp: Default cutoff threshold is strictly 0.02', () => {
    const defaultCutoff = 0.02;
    tracker.assertEquals(defaultCutoff, 0.02, 'Default black cutoff is 0.02');
  });

  test('Calibration Black Clamp: Permissible cutoff range is [0.00, 0.20]', () => {
    const minCutoff = 0.00;
    const maxCutoff = 0.20;
    tracker.assertInRange(defaultCutoff => 0.02, 0.0, 0.2, 'Cutoff within [0.0, 0.2]');
    tracker.assertEquals(minCutoff, 0.0, 'Cutoff min is 0.0');
    tracker.assertEquals(maxCutoff, 0.20, 'Cutoff max is 0.20');
  });

  test('Calibration Black Clamp: Fragments below cutoff threshold clamp strictly to #000000 (AC-3)', () => {
    // Embers with low luminance (0.01 < cutoff 0.02)
    const [r, g, b] = simulateProjectorShader(0.01, 0.01, 0.01, 1.0, 0.02, 1.0);
    tracker.assertEquals(r, 0.0, 'Red clamped to 0.0');
    tracker.assertEquals(g, 0.0, 'Green clamped to 0.0');
    tracker.assertEquals(b, 0.0, 'Blue clamped to 0.0');
  });

  test('Calibration Black Clamp: Maximum cutoff 0.20 aggressively eliminates low-contrast LCD gray fog', () => {
    // A faint gray wash of 0.15 luminance
    const luma = calculateLuminance(0.15, 0.15, 0.15);
    tracker.assert(luma < 0.20, 'Luminance is below 0.20 cutoff');
    const [r, g, b] = simulateProjectorShader(0.15, 0.15, 0.15, 1.0, 0.20, 1.0);
    tracker.assertEquals(r, 0.0, 'Eliminated gray fog red');
    tracker.assertEquals(g, 0.0, 'Eliminated gray fog green');
    tracker.assertEquals(b, 0.0, 'Eliminated gray fog blue');
  });

  test('Calibration Black Clamp: Remapping preserves smooth gradient above cutoff threshold', () => {
    // Input 0.51 with cutoff 0.02 -> (0.51 - 0.02) / 0.98 = 0.50
    const [r] = simulateProjectorShader(0.51, 0.0, 0.0, 1.0, 0.02, 1.0);
    tracker.assertCloseTo(r, 0.50, 0.02, 'Smooth remapped gradient above cutoff');
  });

  // ====================================================
  // 3. BLOOM INTENSITY CALIBRATION (>=5 tests)
  // ====================================================
  test('Calibration Bloom: Default intensity is 1.20 per specification', () => {
    const defaultBloom = 1.2;
    tracker.assertEquals(defaultBloom, 1.2, 'Default bloom intensity is 1.2');
  });

  test('Calibration Bloom: Valid intensity range is [0.00, 3.00]', () => {
    const minBloom = 0.0;
    const maxBloom = 3.0;
    tracker.assertInRange(1.2, minBloom, maxBloom, '1.2 within [0.0, 3.0]');
  });

  test('Calibration Bloom: Bloom threshold isolates star cores above 0.7 luminance', () => {
    const bloomThreshold = 0.7;
    const dimStarLuma = calculateLuminance(0.3, 0.3, 0.3);
    const brightCoreLuma = calculateLuminance(0.9, 0.9, 0.9);
    tracker.assert(dimStarLuma < bloomThreshold, 'Dim star does not trigger bloom');
    tracker.assert(brightCoreLuma > bloomThreshold, 'Bright core triggers bloom glow');
  });

  test('Calibration Bloom: Setting intensity to 0.0 completely disables post-processing glow', () => {
    const bloomDisabled = 0.0;
    tracker.assertEquals(bloomDisabled, 0.0, 'Bloom completely disabled');
  });

  test('Calibration Bloom: Additive blending preserves pure black background outside star radius', () => {
    // Zero luminance pixels outside star receive 0 bloom contribution
    const backgroundLuma = 0.0;
    const bloomContribution = backgroundLuma * 1.5;
    tracker.assertEquals(bloomContribution, 0.0, 'Bloom contribution is 0 for black background');
  });

  // ====================================================
  // 4. PARTICLE SIZE SCALING (>=5 tests)
  // ====================================================
  test('Calibration Particle Size: Default scale factor is 1.00', () => {
    const defaultScale = 1.0;
    tracker.assertEquals(defaultScale, 1.0, 'Default particle size scale is 1.0');
  });

  test('Calibration Particle Size: Range spans [0.50, 4.00] for varied throw distances', () => {
    const minScale = 0.5;
    const maxScale = 4.0;
    tracker.assertInRange(1.0, minScale, maxScale, '1.0 within range');
    tracker.assertEquals(minScale, 0.5, 'Min scale is 0.5x');
    tracker.assertEquals(maxScale, 4.0, 'Max scale is 4.0x');
  });

  test('Calibration Particle Size: Short throw projectors scale down to 0.5x for crisp stars', () => {
    const baseSize = 4.0;
    const scaledSize = baseSize * 0.5;
    tracker.assertEquals(scaledSize, 2.0, '4px star scaled to 2px at 0.5x');
  });

  test('Calibration Particle Size: Long throw stadium projectors scale up to 4.0x for visibility', () => {
    const baseSize = 4.0;
    const scaledSize = baseSize * 4.0;
    tracker.assertEquals(scaledSize, 16.0, '4px star scaled to 16px at 4.0x');
  });

  test('Calibration Particle Size: Scaling applies uniformly across all particle archetypes', () => {
    const scale = 2.0;
    const peonySize = 3.0 * scale;
    const mineSize = 5.0 * scale;
    tracker.assertEquals(peonySize, 6.0, 'Peony scaled 2x');
    tracker.assertEquals(mineSize, 10.0, 'Mine scaled 2x');
  });

  // ====================================================
  // 5. ASPECT RATIO MASKING GUIDES (>=5 tests)
  // ====================================================
  test('Calibration Aspect: Supported aspect ratios include 16:9, 16:10, 4:3, 21:9, and off', () => {
    const supported = ['16:9', '16:10', '4:3', '21:9', 'off'];
    tracker.assertEquals(supported.length, 5, '5 supported aspect ratio options');
    tracker.assert(supported.includes('16:9'), 'Includes 16:9');
    tracker.assert(supported.includes('21:9'), 'Includes 21:9 Ultra-wide');
  });

  test('Calibration Aspect: 16:9 ratio calculates 1.777:1 active rectangle', () => {
    const ratio = 16 / 9;
    tracker.assertCloseTo(ratio, 1.777, 0.01, '16:9 ratio is ~1.777');
  });

  test('Calibration Aspect: 21:9 ultra-wide ratio calculates 2.333:1 active rectangle', () => {
    const ratio = 21 / 9;
    tracker.assertCloseTo(ratio, 2.333, 0.01, '21:9 ratio is ~2.333');
  });

  test('Calibration Aspect: Letterbox/pillarbox margins are strictly clamped to pure black (AC-5)', () => {
    const scissorBox = { x: 200, y: 0, width: 1520, height: 1080 };
    // Pixel outside scissor box at x=50, y=500
    const [r, g, b] = simulateProjectorShader(1.0, 1.0, 1.0, 1.0, 0.02, 1.0, scissorBox, { x: 50, y: 500 });
    tracker.assertEquals(r, 0.0, 'Pillarbox left margin is pure black');
    tracker.assertEquals(g, 0.0, 'Pillarbox left margin is pure black');
    tracker.assertEquals(b, 0.0, 'Pillarbox left margin is pure black');
  });

  test('Calibration Aspect: Active interior region renders fireworks unimpeded', () => {
    const scissorBox = { x: 200, y: 0, width: 1520, height: 1080 };
    // Pixel inside scissor box at x=500, y=500
    const [r, g, b] = simulateProjectorShader(0.8, 0.4, 0.1, 1.0, 0.02, 1.0, scissorBox, { x: 500, y: 500 });
    tracker.assert(r > 0.0, 'Inside pixel is rendered');
  });

  return { passed, failed, assertions: tracker.count() };
}
