/**
 * Test Utilities and Assertion Library for PyroSync E2E Suite
 * Provides deterministic assertions, float tolerances, and test recording
 */

export interface TestResult {
  tier: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  assertions: number;
}

export class AssertionTracker {
  private assertionsCount = 0;

  count(): number {
    return this.assertionsCount;
  }

  reset(): void {
    this.assertionsCount = 0;
  }

  assert(condition: boolean, message: string): void {
    this.assertionsCount++;
    if (!condition) {
      throw new Error(`Assertion Failed: ${message}`);
    }
  }

  assertEquals<T>(actual: T, expected: T, message: string): void {
    this.assertionsCount++;
    if (actual !== expected) {
      throw new Error(`Assertion Failed: ${message} (Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)})`);
    }
  }

  assertNotEquals<T>(actual: T, expected: T, message: string): void {
    this.assertionsCount++;
    if (actual === expected) {
      throw new Error(`Assertion Failed: ${message} (Expected not to equal: ${JSON.stringify(expected)})`);
    }
  }

  assertCloseTo(actual: number, expected: number, delta: number = 0.001, message: string = ''): void {
    this.assertionsCount++;
    if (Math.abs(actual - expected) > delta) {
      throw new Error(`Assertion Failed: ${message} (Expected ${actual} to be close to ${expected} within delta ${delta})`);
    }
  }

  assertInRange(val: number, min: number, max: number, message: string = ''): void {
    this.assertionsCount++;
    if (val < min || val > max) {
      throw new Error(`Assertion Failed: ${message} (Value ${val} not in range [${min}, ${max}])`);
    }
  }

  assertDeepEquals<T>(actual: T, expected: T, message: string): void {
    this.assertionsCount++;
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
      throw new Error(`Assertion Failed: ${message}\nExpected: ${expectedStr}\nActual:   ${actualStr}`);
    }
  }

  assertThrows(fn: () => void, message: string = 'Expected function to throw'): void {
    this.assertionsCount++;
    let threw = false;
    try {
      fn();
    } catch {
      threw = true;
    }
    if (!threw) {
      throw new Error(`Assertion Failed: ${message} (Function did not throw)`);
    }
  }

  async assertRejects(promiseFn: () => Promise<unknown>, message: string = 'Expected promise to reject'): Promise<void> {
    this.assertionsCount++;
    let rejected = false;
    try {
      await promiseFn();
    } catch {
      rejected = true;
    }
    if (!rejected) {
      throw new Error(`Assertion Failed: ${message} (Promise did not reject)`);
    }
  }
}

export const tracker = new AssertionTracker();

/**
 * Calculates standard Rec. 601 / 709 relative luminance
 * L = 0.299*R + 0.587*G + 0.114*B
 */
export function calculateLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Simulates shader black cutoff clamp:
 * If luminance < cutoff, returns pure black [0, 0, 0, 1]
 * Otherwise maps linearly above cutoff and scales by gain
 */
export function simulateProjectorShader(
  r: number,
  g: number,
  b: number,
  a: number,
  blackCutoff: number,
  gain: number,
  aspectScissor?: { x: number; y: number; width: number; height: number },
  pixelPos?: { x: number; y: number }
): [number, number, number, number] {
  // Scissor check
  if (aspectScissor && pixelPos) {
    if (
      pixelPos.x < aspectScissor.x ||
      pixelPos.x > aspectScissor.x + aspectScissor.width ||
      pixelPos.y < aspectScissor.y ||
      pixelPos.y > aspectScissor.y + aspectScissor.height
    ) {
      return [0.0, 0.0, 0.0, 1.0];
    }
  }

  const luma = calculateLuminance(r, g, b);
  if (luma < blackCutoff) {
    return [0.0, 0.0, 0.0, 1.0];
  }

  const clampedR = Math.max(0.0, (r - blackCutoff) / (1.0 - blackCutoff));
  const clampedG = Math.max(0.0, (g - blackCutoff) / (1.0 - blackCutoff));
  const clampedB = Math.max(0.0, (b - blackCutoff) / (1.0 - blackCutoff));

  return [
    Math.min(1.0, clampedR * gain),
    Math.min(1.0, clampedG * gain),
    Math.min(1.0, clampedB * gain),
    a,
  ];
}
