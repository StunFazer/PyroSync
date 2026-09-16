/**
 * Pure-Black High-Performance Fireworks Engine
 * Zero-Allocation Typed Array Particle Pool (Structure of Arrays)
 * Capacity: 65,536 particles. Sustains 60+ FPS under 25,000+ simultaneous particles.
 */

export const DEFAULT_POOL_CAPACITY = 65536;

export class ParticlePool {
  public readonly capacity: number;
  public aliveCount: number = 0;

  // CPU Simulation State (Structure of Arrays)
  public readonly posX: Float32Array;
  public readonly posY: Float32Array;
  public readonly posZ: Float32Array;
  public readonly velX: Float32Array;
  public readonly velY: Float32Array;
  public readonly velZ: Float32Array;
  public readonly colR: Float32Array;
  public readonly colG: Float32Array;
  public readonly colB: Float32Array;
  public readonly colA: Float32Array;
  public readonly baseSize: Float32Array;
  public readonly age: Float32Array;
  public readonly maxLife: Float32Array;
  public readonly drag: Float32Array;
  public readonly gravity: Float32Array;
  public readonly archetypeId: Float32Array;
  public readonly sparklePhase: Float32Array;
  public readonly subType: Uint8Array; // 0=none, 1=crossette split, 2=crackle pop, 3=whistling comet report, 4=multi_break secondary salute/ring/dragon-egg

  // WebGL GPU-bound BufferAttributes
  public readonly gpuPositions: Float32Array;   // vec3 (x, y, z)
  public readonly gpuColors: Float32Array;      // vec4 (r, g, b, a)
  public readonly gpuSizeLife: Float32Array;    // vec2 (size, normLife)
  public readonly gpuArchetypes: Float32Array;  // vec2 (archetypeId, sparklePhase)

  // Secondary burst callback hook to avoid circular dependency
  public onSecondaryBurst: ((subType: number, x: number, y: number, z: number, r: number, g: number, b: number) => void) | null = null;

  constructor(capacity: number = DEFAULT_POOL_CAPACITY) {
    this.capacity = capacity;

    // Allocate flat TypedArrays once at construction
    this.posX = new Float32Array(capacity);
    this.posY = new Float32Array(capacity);
    this.posZ = new Float32Array(capacity);
    this.velX = new Float32Array(capacity);
    this.velY = new Float32Array(capacity);
    this.velZ = new Float32Array(capacity);
    this.colR = new Float32Array(capacity);
    this.colG = new Float32Array(capacity);
    this.colB = new Float32Array(capacity);
    this.colA = new Float32Array(capacity);
    this.baseSize = new Float32Array(capacity);
    this.age = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.gravity = new Float32Array(capacity);
    this.archetypeId = new Float32Array(capacity);
    this.sparklePhase = new Float32Array(capacity);
    this.subType = new Uint8Array(capacity);
    this.trailTimer = new Float32Array(capacity); // Accumulator for periodic trail spark drops
    this.isTrailParticle = new Uint8Array(capacity); // 1 if particle is an emitted child trail spark

    // Allocate GPU buffer arrays
    this.gpuPositions = new Float32Array(capacity * 3);
    this.gpuColors = new Float32Array(capacity * 4);
    this.gpuSizeLife = new Float32Array(capacity * 2);
    this.gpuArchetypes = new Float32Array(capacity * 2);
  }

  public readonly trailTimer: Float32Array;
  public readonly isTrailParticle: Uint8Array;

  /**
   * Spawns a single particle directly into typed arrays without object allocation.
   * Returns index if spawned, or -1 if pool is full.
   */
  public spawn(
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    r: number, g: number, b: number, a: number,
    size: number, maxLife: number,
    drag: number = 0.97, gravity: number = 9.8,
    archetype: number = 0, sparkle: number = 0,
    subTypeVal: number = 0,
    isTrail: number = 0
  ): number {
    if (this.aliveCount >= this.capacity) {
      return -1; // Pool saturated
    }

    const idx = this.aliveCount;

    this.posX[idx] = x;
    this.posY[idx] = y;
    this.posZ[idx] = z;
    this.velX[idx] = vx;
    this.velY[idx] = vy;
    this.velZ[idx] = vz;
    this.colR[idx] = r;
    this.colG[idx] = g;
    this.colB[idx] = b;
    this.colA[idx] = a;
    this.baseSize[idx] = size;
    this.age[idx] = 0.0;
    this.maxLife[idx] = maxLife;
    this.drag[idx] = drag;
    this.gravity[idx] = gravity;
    this.archetypeId[idx] = archetype;
    this.sparklePhase[idx] = sparkle;
    this.subType[idx] = subTypeVal;
    this.trailTimer[idx] = 0.0;
    this.isTrailParticle[idx] = isTrail;

    // Write initial GPU attributes
    const p3 = idx * 3;
    this.gpuPositions[p3] = x;
    this.gpuPositions[p3 + 1] = y;
    this.gpuPositions[p3 + 2] = z;

    const p4 = idx * 4;
    this.gpuColors[p4] = r;
    this.gpuColors[p4 + 1] = g;
    this.gpuColors[p4 + 2] = b;
    this.gpuColors[p4 + 3] = a;

    const p2 = idx * 2;
    this.gpuSizeLife[p2] = size;
    this.gpuSizeLife[p2 + 1] = 0.0; // normLife = 0

    this.gpuArchetypes[p2] = archetype;
    this.gpuArchetypes[p2 + 1] = sparkle;

    this.aliveCount++;
    return idx;
  }

  /**
   * High-performance 60+ FPS physics update loop.
   * Zero heap allocations during loop. Emits trailing micro-sparks behind moving stars.
   */
  public update(dt: number, currentTimeSec: number): void {
    let i = 0;
    const clampedDt = dt > 0.1 ? 0.1 : dt; // Prevent explosion after large lag spike
    const initialCount = this.aliveCount;

    while (i < this.aliveCount) {
      this.age[i] += clampedDt;

      if (this.age[i] >= this.maxLife[i]) {
        // Handle secondary bursts before recycling
        const st = this.subType[i];
        if (st > 0 && this.onSecondaryBurst) {
          this.onSecondaryBurst(
            st,
            this.posX[i],
            this.posY[i],
            this.posZ[i],
            this.colR[i],
            this.colG[i],
            this.colB[i]
          );
        }

        // Swap and pop: copy state from (aliveCount - 1) to i
        const last = this.aliveCount - 1;
        if (i < last) {
          this.copyParticle(last, i);
        }
        this.aliveCount--;
        // Re-check current slot since it now holds the swapped particle
        continue;
      }

      // Physics integration: air drag and gravity
      const d = Math.pow(this.drag[i], clampedDt * 60);
      this.velX[i] *= d;
      this.velY[i] = (this.velY[i] - this.gravity[i] * clampedDt) * d;
      this.velZ[i] *= d;

      this.posX[i] += this.velX[i] * clampedDt;
      this.posY[i] += this.velY[i] * clampedDt;
      this.posZ[i] += this.velZ[i] * clampedDt;

      const normLife = this.age[i] / this.maxLife[i];

      // Archetype-specific in-flight behaviors & trail emission
      const arch = this.archetypeId[i];
      let currentAlpha = this.colA[i];
      let currentSize = this.baseSize[i];

      // Two-Tier Trail Spark Emitter: parent stars drop glowing embers during flight
      if (this.isTrailParticle[i] === 0 && i < initialCount && this.aliveCount < this.capacity - 100) {
        this.trailTimer[i] += clampedDt;

        // Trail interval and parameters based on archetype
        let trailInterval = 0.0;
        let trailLife = 0.35;
        let trailSize = currentSize * 0.55;
        let trailR = this.colR[i];
        let trailG = this.colG[i];
        let trailB = this.colB[i];

        if (arch === 1) {
          // Chrysanthemum: sparkling golden/silver trail
          trailInterval = 0.050;
          trailLife = 0.40;
          trailR = 1.0; trailG = 0.85; trailB = 0.4;
        } else if (arch === 2 || arch === 12) {
          // Willow / Weeping Willow: dripping golden tendrils
          trailInterval = 0.040;
          trailLife = 0.65;
          trailSize = currentSize * 0.60;
          trailR = 1.0; trailG = 0.82; trailB = 0.25;
        } else if (arch === 3) {
          // Brocade Crown: luminous canopy trail
          trailInterval = 0.045;
          trailLife = 0.48;
          trailR = 1.0; trailG = 0.88; trailB = 0.5;
        } else if (arch === 9) {
          // Whistling Comet: dense smoking trail
          trailInterval = 0.025;
          trailLife = 0.35;
          trailSize = currentSize * 0.7;
          trailR = 1.0; trailG = 0.95; trailB = 0.8;
        } else if (arch === 10 || arch === 13 || arch === 14 || arch === 15 || arch === 16) {
          // Palm Tree fronds, Stars, Rings, Spirals, Multi-break primary: visible spark trail
          trailInterval = 0.045;
          trailLife = 0.32;
        }

        if (trailInterval > 0.0 && this.trailTimer[i] >= trailInterval) {
          this.trailTimer[i] = 0.0;
          // Spawn child trail ember inheriting partial parent momentum with downward drift
          this.spawn(
            this.posX[i] + (Math.random() - 0.5) * 0.2,
            this.posY[i] + (Math.random() - 0.5) * 0.2,
            this.posZ[i] + (Math.random() - 0.5) * 0.2,
            this.velX[i] * 0.2 + (Math.random() - 0.5) * 0.8,
            this.velY[i] * 0.2 - (arch === 2 || arch === 12 ? 2.5 : 0.8), // Weeping willow drops downward
            this.velZ[i] * 0.2 + (Math.random() - 0.5) * 0.8,
            trailR, trailG, trailB, 0.85,
            Math.max(1.5, trailSize),
            trailLife + Math.random() * 0.15,
            0.94, arch === 2 || arch === 12 ? 6.5 : 4.0,
            arch, Math.random() * 10.0,
            0,
            1 // isTrail = 1
          );
        }
      }

      if (this.isTrailParticle[i] === 1) {
        // Child trail particles fade out smoothly
        currentAlpha *= (1.0 - normLife * normLife);
        currentSize *= (1.0 - normLife * 0.5);
      } else if (arch === 1) {
        // Chrysanthemum: sparkling trail decay
        currentAlpha *= (1.0 - normLife * 0.7);
      } else if (arch === 2 || arch === 12) {
        // Willow / Weeping Willow: long hang time, subtle shimmer
        currentAlpha *= (1.0 - normLife * 0.75);
        currentSize *= (1.0 - normLife * 0.25);
      } else if (arch === 3) {
        // Brocade Crown: wide lingering canopy
        currentAlpha *= (1.0 - normLife * 0.75);
      } else if (arch === 5) {
        // Strobe: oscillating blinker
        const freq = 10.0;
        const blink = Math.sin((currentTimeSec + this.sparklePhase[i]) * freq * 6.28318);
        currentAlpha *= blink > 0.0 ? 1.0 : 0.0;
      } else if (arch === 9) {
        // Whistling Comet: corkscrew spiral jitter
        const spiralRadius = 0.4;
        const spiralSpeed = 16.0;
        this.posX[i] += Math.sin(currentTimeSec * spiralSpeed + this.sparklePhase[i]) * spiralRadius * clampedDt * 10;
        this.posZ[i] += Math.cos(currentTimeSec * spiralSpeed + this.sparklePhase[i]) * spiralRadius * clampedDt * 10;
      }

      // Update GPU buffers
      const p3 = i * 3;
      this.gpuPositions[p3] = this.posX[i];
      this.gpuPositions[p3 + 1] = this.posY[i];
      this.gpuPositions[p3 + 2] = this.posZ[i];

      const p4 = i * 4;
      this.gpuColors[p4] = this.colR[i];
      this.gpuColors[p4 + 1] = this.colG[i];
      this.gpuColors[p4 + 2] = this.colB[i];
      this.gpuColors[p4 + 3] = currentAlpha;

      const p2 = i * 2;
      this.gpuSizeLife[p2] = currentSize;
      this.gpuSizeLife[p2 + 1] = normLife;

      this.gpuArchetypes[p2] = this.archetypeId[i];
      this.gpuArchetypes[p2 + 1] = this.sparklePhase[i];

      i++;
    }
  }

  /**
   * Internal swap helper: copies particle state from src to dst.
   */
  private copyParticle(src: number, dst: number): void {
    this.posX[dst] = this.posX[src];
    this.posY[dst] = this.posY[src];
    this.posZ[dst] = this.posZ[src];
    this.velX[dst] = this.velX[src];
    this.velY[dst] = this.velY[src];
    this.velZ[dst] = this.velZ[src];
    this.colR[dst] = this.colR[src];
    this.colG[dst] = this.colG[src];
    this.colB[dst] = this.colB[src];
    this.colA[dst] = this.colA[src];
    this.baseSize[dst] = this.baseSize[src];
    this.age[dst] = this.age[src];
    this.maxLife[dst] = this.maxLife[src];
    this.drag[dst] = this.drag[src];
    this.gravity[dst] = this.gravity[src];
    this.archetypeId[dst] = this.archetypeId[src];
    this.sparklePhase[dst] = this.sparklePhase[src];
    this.subType[dst] = this.subType[src];
    this.trailTimer[dst] = this.trailTimer[src];
    this.isTrailParticle[dst] = this.isTrailParticle[src];

    // Copy GPU buffer values
    const s3 = src * 3;
    const d3 = dst * 3;
    this.gpuPositions[d3] = this.gpuPositions[s3];
    this.gpuPositions[d3 + 1] = this.gpuPositions[s3 + 1];
    this.gpuPositions[d3 + 2] = this.gpuPositions[s3 + 2];

    const s4 = src * 4;
    const d4 = dst * 4;
    this.gpuColors[d4] = this.gpuColors[s4];
    this.gpuColors[d4 + 1] = this.gpuColors[s4 + 1];
    this.gpuColors[d4 + 2] = this.gpuColors[s4 + 2];
    this.gpuColors[d4 + 3] = this.gpuColors[s4 + 3];

    const s2 = src * 2;
    const d2 = dst * 2;
    this.gpuSizeLife[d2] = this.gpuSizeLife[s2];
    this.gpuSizeLife[d2 + 1] = this.gpuSizeLife[s2 + 1];

    this.gpuArchetypes[d2] = this.gpuArchetypes[s2];
    this.gpuArchetypes[d2 + 1] = this.gpuArchetypes[s2 + 1];
  }

  /**
   * Instant Blackout / Panic Control:
   * Instantly clears all active particles without memory reallocations.
   */
  public blackout(): void {
    this.aliveCount = 0;
  }
}
