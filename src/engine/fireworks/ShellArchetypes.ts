import { ParticlePool } from './ParticlePool';
import { FireCuePayload, LaunchStation } from '../../types';

// Default station X offsets in 3D world units (stage half-width default ~36 units)
export const DEFAULT_STAGE_HALF_WIDTH = 36.0;

export const STATION_X_COORDS: Record<LaunchStation, number> = {
  far_left: -36.0,
  mid_left: -24.0,
  left_center: -12.0,
  center: 0.0,
  right_center: 12.0,
  mid_right: 24.0,
  far_right: 36.0,
  fan: 0.0,
  left: -36.0,
  right: 36.0,
};

// Default altitude range (world units: ground=0.0 at canvas bottom, apex=10.0 to 46.0)
export const MIN_ALTITUDE_Y = 10.0;
export const MAX_ALTITUDE_Y = 46.0;
export const GROUND_ORIGIN_Y = 0.0;

// Hex color parser into normalized RGB floats [0..1]
export function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    const g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    const b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
    return [r, g, b];
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    return [r, g, b];
  }
  // Default to gold if malformed
  return [1.0, 0.84, 0.0];
}

export class ShellArchetypeManager {
  private pool: ParticlePool;
  public stageHalfWidth: number = DEFAULT_STAGE_HALF_WIDTH;
  public burstRadiusScale: number = 1.0;

  constructor(pool: ParticlePool) {
    this.pool = pool;

    // Attach secondary burst handler to pool
    this.pool.onSecondaryBurst = (subType, x, y, z, r, g, b) => {
      this.handleSecondaryBurst(subType, x, y, z, r, g, b);
    };
  }

  public setStageWidth(halfWidth: number): void {
    this.stageHalfWidth = Math.max(28.0, halfWidth);
  }

  public setBurstRadiusScale(scale: number): void {
    this.burstRadiusScale = Math.max(0.4, Math.min(3.0, scale));
  }

  public getStationX(station: LaunchStation): number {
    switch (station) {
      case 'far_left':
      case 'left':
        return -this.stageHalfWidth * 0.95;
      case 'mid_left':
        return -this.stageHalfWidth * 0.62;
      case 'left_center':
        return -this.stageHalfWidth * 0.31;
      case 'center':
        return 0.0;
      case 'right_center':
        return this.stageHalfWidth * 0.31;
      case 'mid_right':
        return this.stageHalfWidth * 0.62;
      case 'far_right':
      case 'right':
        return this.stageHalfWidth * 0.95;
      case 'fan':
      default:
        return 0.0;
    }
  }

  /**
   * Main entry point to fire a shell according to FireCuePayload.
   * Injects organic pyrotechnic variance (Euler angle rotation, launch wobble,
   * combustion color jitter, velocity & burnout lifetime jitter).
   */
  public fire(cue: FireCuePayload): void {
    const stationX = this.getStationX(cue.station);
    
    // 1. Organic launch wobble (±2.5 deg angle drift, ±3% apex wobble)
    const angleWobble = (Math.random() - 0.5) * 4.0;
    const angleRad = (((cue.launchAngle ?? 0) + angleWobble) * Math.PI) / 180.0;

    const altClamped = Math.max(0.1, Math.min(1.0, cue.altitude));
    const altWobble = (Math.random() - 0.5) * 0.06;
    const burstY = MIN_ALTITUDE_Y + Math.max(0.1, Math.min(1.0, altClamped + altWobble)) * (MAX_ALTITUDE_Y - MIN_ALTITUDE_Y);
    
    // X position accounts for launch angle offset
    const burstX = stationX + Math.sin(angleRad) * (burstY * 0.4) + (Math.random() - 0.5) * 1.5;
    const burstZ = (Math.random() - 0.5) * 3.0; // Subtle depth jitter

    // 2. Combustion chemical color jitter (subtle temperature shift around target hex)
    const [baseR, baseG, baseB] = hexToRgb(cue.color || '#ffd700');
    const colorJitter = (Math.random() - 0.5) * 0.08;
    const r = Math.max(0.0, Math.min(1.0, baseR + colorJitter));
    const g = Math.max(0.0, Math.min(1.0, baseG + colorJitter * 0.8));
    const b = Math.max(0.0, Math.min(1.0, baseB + (Math.random() - 0.5) * 0.05));

    switch (cue.archetype) {
      case 'peony':
        this.spawnPeony(burstX, burstY, burstZ, r, g, b);
        break;
      case 'chrysanthemum':
        this.spawnChrysanthemum(burstX, burstY, burstZ, r, g, b);
        break;
      case 'willow':
        this.spawnWillow(burstX, burstY, burstZ, r, g, b);
        break;
      case 'weeping_willow':
        this.spawnWeepingWillow(burstX, burstY, burstZ, r, g, b);
        break;
      case 'brocade_crown':
        this.spawnBrocadeCrown(burstX, burstY, burstZ, r, g, b);
        break;
      case 'rings':
        this.spawnRings(burstX, burstY, burstZ, r, g, b);
        break;
      case 'saturn_ring':
        this.spawnSaturnRing(burstX, burstY, burstZ, r, g, b);
        break;
      case 'star_shape':
        this.spawnStarShape(burstX, burstY, burstZ, r, g, b);
        break;
      case 'spiral':
        this.spawnSpiral(burstX, burstY, burstZ, r, g, b);
        break;
      case 'palm_tree':
        this.spawnPalmTree(stationX, GROUND_ORIGIN_Y, burstZ, r, g, b, burstY, angleRad);
        break;
      case 'strobe':
        this.spawnStrobe(burstX, burstY, burstZ, r, g, b);
        break;
      case 'crossette':
        this.spawnCrossette(burstX, burstY, burstZ, r, g, b);
        break;
      case 'crackle':
        this.spawnCrackle(burstX, burstY, burstZ, r, g, b);
        break;
      case 'ground_mine':
        this.spawnGroundMine(stationX, GROUND_ORIGIN_Y, burstZ, r, g, b, angleRad);
        break;
      case 'whistling_comet':
        this.spawnWhistlingComet(stationX, GROUND_ORIGIN_Y, burstZ, r, g, b, burstY, angleRad);
        break;
      case 'horsetail':
        this.spawnHorsetail(burstX, burstY, burstZ, r, g, b);
        break;
      case 'finale_barrage':
        this.spawnFinaleBarrage(r, g, b);
        break;
      case 'multi_break':
        this.spawnMultiBreak(burstX, burstY, burstZ, r, g, b);
        break;
      case 'heart_shape':
        this.spawnHeartShape(burstX, burstY, burstZ, r, g, b);
        break;
      case 'double_ring':
        this.spawnDoubleRing(burstX, burstY, burstZ, r, g, b);
        break;
      case 'diamond_shape':
        this.spawnDiamondShape(burstX, burstY, burstZ, r, g, b);
        break;
      case 'butterfly':
        this.spawnButterfly(burstX, burstY, burstZ, r, g, b);
        break;
      default:
        this.spawnPeony(burstX, burstY, burstZ, r, g, b);
        break;
    }
  }

  // -------------------------------------------------------------
  // Archetype 1: Peony
  // Spherical 3D expansion, uniform radial velocity, vibrant solid colors, clean break.
  // -------------------------------------------------------------
  public spawnPeony(x: number, y: number, z: number, r: number, g: number, b: number): void {
    const count = 350;
    const baseSpeed = 22.0 * this.burstRadiusScale;

    for (let k = 0; k < count; k++) {
      // Fibonacci sphere distribution
      const phi = Math.acos(1.0 - (2.0 * (k + 0.5)) / count);
      const theta = 3.883222 * k; // Golden spiral angle
      const speed = baseSpeed + (Math.random() - 0.5) * 4.0 * this.burstRadiusScale;

      const vx = speed * Math.sin(phi) * Math.cos(theta);
      const vy = speed * Math.sin(phi) * Math.sin(theta);
      const vz = speed * Math.cos(phi);

      const life = 1.6 + Math.random() * 0.4;
      const size = 3.5 + Math.random() * 1.5;

      this.pool.spawn(
        x, y, z,
        vx, vy, vz,
        r, g, b, 1.0,
        size, life,
        0.965, 8.5,
        0, 0, 0
      );
    }
  }

  // -------------------------------------------------------------
  // Archetype 2: Chrysanthemum
  // Spherical burst leaving persistent gold/silver sparkling trails behind stars.
  // -------------------------------------------------------------
  public spawnChrysanthemum(x: number, y: number, z: number, r: number, g: number, b: number): void {
    const count = 420;
    const baseSpeed = 24.0 * this.burstRadiusScale;

    for (let k = 0; k < count; k++) {
      const phi = Math.acos(1.0 - (2.0 * (k + 0.5)) / count);
      const theta = 3.883222 * k;
      const speed = baseSpeed + (Math.random() - 0.5) * 5.0 * this.burstRadiusScale;

      const vx = speed * Math.sin(phi) * Math.cos(theta);
      const vy = speed * Math.sin(phi) * Math.sin(theta);
      const vz = speed * Math.cos(phi);

      const life = 2.4 + Math.random() * 0.6;
      const size = 3.8 + Math.random() * 1.8;
      const sparkle = Math.random() * 100.0;

      this.pool.spawn(
        x, y, z,
        vx, vy, vz,
        r, g, b, 1.0,
        size, life,
        0.970, 9.8,
        1, sparkle, 0
      );
    }
  }

  // -------------------------------------------------------------
  // Archetype 3: Willow / Kamuro
  // Heavy downward-drooping glittering gold/silver trails with long hang time (3.5 - 5.2s).
  // -------------------------------------------------------------
  public spawnWillow(x: number, y: number, z: number, r: number, g: number, b: number): void {
    const count = 550;
    const baseSpeed = 16.0 * this.burstRadiusScale;

    for (let k = 0; k < count; k++) {
      // Umbrella-shaped hemispherical bias
      const phi = (Math.acos(1.0 - (2.0 * (k + 0.5)) / count)) * 0.75;
      const theta = 3.883222 * k;
      const speed = baseSpeed + (Math.random() - 0.5) * 5.0 * this.burstRadiusScale;

      const vx = speed * Math.sin(phi) * Math.cos(theta);
      const vy = speed * Math.sin(phi) * Math.sin(theta) * 0.6 + 2.0 * this.burstRadiusScale; // Initial upward arc
      const vz = speed * Math.cos(phi);

      const life = 3.8 + Math.random() * 1.2;
      const size = 3.0 + Math.random() * 1.5;

      // Heavy gravity droop: g = 14.5, high drag for lingering curtain
      this.pool.spawn(
        x, y, z,
        vx, vy, vz,
        r * 1.1, g * 0.95, b * 0.7, 1.0, // Warm shimmering gold
        size, life,
        0.985, 14.5,
        2, Math.random() * 50.0, 0
      );
    }
  }

  // -------------------------------------------------------------
  // Archetype: Weeping Willow / Kamuro Ghost Shell
  // Massive cascading golden kamuro canopy with delayed color-morphing
  // ghost-silver/platinum tips that drift downward in shimmering curtains.
  // -------------------------------------------------------------
  public spawnWeepingWillow(x: number, y: number, z: number, r: number, g: number, b: number): void {
    const count = 680;
    const baseSpeed = 18.0 * this.burstRadiusScale;

    for (let k = 0; k < count; k++) {
      // Umbrella-shaped cascading canopy bias
      const phi = (Math.acos(1.0 - (2.0 * (k + 0.5)) / count)) * 0.82;
      const theta = 3.883222 * k + (Math.random() - 0.5) * 0.25;
      const speed = baseSpeed + (Math.random() - 0.5) * 6.0 * this.burstRadiusScale;

      const vx = speed * Math.sin(phi) * Math.cos(theta);
      const vy = speed * Math.sin(phi) * Math.sin(theta) * 0.45 + 3.5 * this.burstRadiusScale; // Upward initial fountain lift
      const vz = speed * Math.cos(phi);

      const isGhostTip = k % 3 === 0; // 33% ghost-silver/platinum tips
      const life = 4.8 + Math.random() * 1.6; // Ultra-long hang time (4.8s - 6.4s)
      const size = isGhostTip ? 3.0 + Math.random() * 1.2 : 3.8 + Math.random() * 1.5;

      // Kamuro gold core (archetype 12) vs Ghost-silver tip streamers (archetype 2 with heavy sparkle)
      const starR = isGhostTip ? 0.95 : r * 1.2;
      const starG = isGhostTip ? 0.96 : g * 0.90;
      const starB = isGhostTip ? 1.0 : b * 0.25;

      this.pool.spawn(
        x, y, z,
        vx, vy, vz,
        starR, starG, starB, 1.0,
        size, life,
        0.984, 15.5, // High air resistance & heavy gravity droop
        isGhostTip ? 2 : 12, // Archetype 2: glittering sparkling trail, 12: weeping tendril
        Math.random() * 70.0, 0
      );
    }
  }

  // -------------------------------------------------------------
  // Archetype: 5-Point Star Shape
  // Geometric star burst with trailing embers along star rays, rotated organically in 3D.
  // -------------------------------------------------------------
  public spawnStarShape(x: number, y: number, z: number, r: number, g: number, b: number): void {
    const points = 5;
    const totalParticles = 380;
    const rotZ = Math.random() * Math.PI * 2.0; // Random roll
    const rotPitch = (Math.random() - 0.5) * 0.6; // Subtle audience-facing pitch
    const rotYaw = (Math.random() - 0.5) * 0.5;   // Subtle audience-facing yaw

    const cp = Math.cos(rotPitch), sp = Math.sin(rotPitch);
    const cy = Math.cos(rotYaw), sy = Math.sin(rotYaw);
    const cz = Math.cos(rotZ), sz = Math.sin(rotZ);

    for (let i = 0; i < totalParticles; i++) {
      const angle = (i / totalParticles) * Math.PI * 2.0;
      // 5-pointed star modulation in polar coordinates
      const rMod = 0.5 + 0.5 * Math.cos(points * angle);
      const speed = (10.0 + rMod * 16.0 + (Math.random() - 0.5) * 2.0) * this.burstRadiusScale;

      const lx = Math.cos(angle) * speed;
      const ly = Math.sin(angle) * speed;
      const lz = (Math.random() - 0.5) * 2.5;

      // Rotate roll -> pitch -> yaw
      const x1 = lx * cz - ly * sz;
      const y1 = lx * sz + ly * cz;
      const z1 = lz;

      const x2 = x1;
      const y2 = y1 * cp - z1 * sp;
      const z2 = y1 * sp + z1 * cp;

      const vx = x2 * cy + z2 * sy;
      const vy = y2;
      const vz = -x2 * sy + z2 * cy;

      const life = 2.0 + Math.random() * 0.5;
      this.pool.spawn(
        x, y, z,
        vx, vy, vz,
        r, g, b, 1.0,
        3.8, life,
        0.965, 8.5,
        13, Math.random() * 20.0, 0
      );
    }
  }

  // -------------------------------------------------------------
  // Archetype: Saturn Ring
  // Central solid sphere with an inclined elliptical planetary ring
  // -------------------------------------------------------------
  public spawnSaturnRing(x: number, y: number, z: number, r: number, g: number, b: number): void {
    // 1. Central Core Sphere (160 stars)
    const coreCount = 160;
    for (let k = 0; k < coreCount; k++) {
      const phi = Math.acos(1.0 - (2.0 * (k + 0.5)) / coreCount);
      const theta = 3.883222 * k;
      const speed = 11.0 + (Math.random() - 0.5) * 2.0;

      this.pool.spawn(
        x, y, z,
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.sin(phi) * Math.sin(theta),
        speed * Math.cos(phi),
        1.0, 1.0, 1.0, 1.0, // White hot core
        3.5, 1.6 + Math.random() * 0.4,
        0.965, 8.0,
        0, 0, 0
      );
    }

    // 2. Wide Inclined Toroidal Ring (280 stars)
    const ringCount = 280;
    const ringSpeed = 24.0;
    const tilt = 0.45;

    for (let i = 0; i < ringCount; i++) {
      const rad = (i / ringCount) * Math.PI * 2.0;
      const cosR = Math.cos(rad);
      const sinR = Math.sin(rad);

      const vx = cosR * ringSpeed;
      const vy = sinR * ringSpeed * tilt;
      const vz = sinR * ringSpeed * Math.sqrt(1 - tilt * tilt);

      this.pool.spawn(
        x, y, z,
        vx + (Math.random() - 0.5) * 1.5,
        vy + (Math.random() - 0.5) * 1.5,
        vz + (Math.random() - 0.5) * 1.5,
        r, g, b, 1.0,
        4.0, 2.4 + Math.random() * 0.4,
        0.970, 8.5,
        14, 0, 0
      );
    }
  }

  // -------------------------------------------------------------
  // Archetype: Spiral / Galaxy Whirl
  // Archimedean logarithmic spiral arms spinning outward
  // -------------------------------------------------------------
  public spawnSpiral(x: number, y: number, z: number, r: number, g: number, b: number): void {
    const arms = 3;
    const particlesPerArm = 120;
    const rotBase = Math.random() * Math.PI * 2.0;

    for (let a = 0; a < arms; a++) {
      const armOffset = (a / arms) * Math.PI * 2.0;

      for (let p = 0; p < particlesPerArm; p++) {
        const t = p / particlesPerArm;
        const theta = t * 4.0 * Math.PI + armOffset + rotBase;
        const speed = 6.0 + t * 20.0;

        const vx = Math.cos(theta) * speed;
        const vy = Math.sin(theta) * speed;
        const vz = (Math.random() - 0.5) * 3.5;

        this.pool.spawn(
          x, y, z,
          vx, vy, vz,
          r, g, b, 1.0,
          3.6, 2.0 + t * 0.8,
          0.970, 9.0,
          15, Math.random() * 20.0, 0
        );
      }
    }
  }

  // -------------------------------------------------------------
  // Archetype: Palm Tree
  // Heavy rising comet trunk with gold sparks breaking into drooping palm fronds
  // -------------------------------------------------------------
  public spawnPalmTree(
    x: number, y: number, z: number,
    r: number, g: number, b: number,
    targetApexY: number,
    angleRad: number = 0
  ): void {
    // 1. Rising thick gold trunk trail
    const trunkSparks = 180;
    const vy = Math.sqrt(2 * 14.0 * (targetApexY - y)) + 2.0;
    const vx = Math.sin(angleRad) * 8.0;

    for (let i = 0; i < trunkSparks; i++) {
      const frac = i / trunkSparks;
      this.pool.spawn(
        x + (Math.random() - 0.5) * 0.8,
        y + frac * (targetApexY * 0.85),
        z + (Math.random() - 0.5) * 0.8,
        vx * frac + (Math.random() - 0.5) * 2.0,
        vy * (1.0 - frac * 0.6) - Math.random() * 4.0,
        (Math.random() - 0.5) * 2.0,
        1.0, 0.85, 0.3, 1.0, // Rich gold trunk
        3.5, 1.2 + Math.random() * 0.6,
        0.965, 12.0,
        10, 0, 0
      );
    }

    // 2. Crown Fronds at apex
    const fronds = 8;
    const starsPerFrond = 40;

    for (let f = 0; f < fronds; f++) {
      const frondAngle = (f / fronds) * Math.PI * 2.0 + (Math.random() - 0.5) * 0.2;
      const baseFrondSpeed = 16.0;

      for (let s = 0; s < starsPerFrond; s++) {
        const progress = s / starsPerFrond;
        const speed = baseFrondSpeed * (0.6 + progress * 0.5);

        const fvx = Math.cos(frondAngle) * speed;
        const fvy = 4.0 + Math.sin(progress * Math.PI) * 5.0; // Arching frond arc
        const fvz = Math.sin(frondAngle) * speed * 0.5;

        this.pool.spawn(
          x, targetApexY, z,
          fvx, fvy, fvz,
          r, g, b, 1.0,
          3.8, 3.2 + Math.random() * 0.8,
          0.975, 15.0, // Heavy droop for fronds
          10, Math.random() * 40.0, 0
        );
      }
    }
  }

  // -------------------------------------------------------------
  // Archetype 4: Brocade Crown
  // Dense golden/silver branching trails forming a large lingering canopy.
  // -------------------------------------------------------------
  public spawnBrocadeCrown(x: number, y: number, z: number, r: number, g: number, b: number): void {
    const count = 650;
    const baseSpeed = 26.0 * this.burstRadiusScale;

    for (let k = 0; k < count; k++) {
      const phi = Math.acos(1.0 - (2.0 * (k + 0.5)) / count);
      const theta = 3.883222 * k;
      const speed = baseSpeed + (Math.random() - 0.5) * 6.0 * this.burstRadiusScale;

      const vx = speed * Math.sin(phi) * Math.cos(theta);
      const vy = speed * Math.sin(phi) * Math.sin(theta);
      const vz = speed * Math.cos(phi);

      const life = 3.2 + Math.random() * 1.0;
      const size = 4.0 + Math.random() * 2.0;

      this.pool.spawn(
        x, y, z,
        vx, vy, vz,
        r, g, b, 1.0,
        size, life,
        0.980, 11.5,
        3, Math.random() * 80.0, 0
      );
    }
  }

  // -------------------------------------------------------------
  // Archetype 5: Rings
  // Concentric / planetary planar rings in 2D/3D toroidal planes.
  // -------------------------------------------------------------
  public spawnRings(x: number, y: number, z: number, r: number, g: number, b: number): void {
    // Random 3D plane tilt
    const tiltX = (Math.random() - 0.5) * 0.8;
    const tiltZ = (Math.random() - 0.5) * 0.8;
    const tiltLen = Math.sqrt(tiltX * tiltX + 1.0 + tiltZ * tiltZ);
    const nx = tiltX / tiltLen;
    const ny = 1.0 / tiltLen;
    const nz = tiltZ / tiltLen;

    // Basis vectors perpendicular to normal (nx, ny, nz)
    const ux = -nz;
    const uz = nx;
    const uLen = Math.sqrt(ux * ux + uz * uz) || 1.0;
    const b1x = ux / uLen;
    const b1y = 0;
    const b1z = uz / uLen;

    // Cross product b2 = n x b1
    const b2x = ny * b1z - nz * b1y;
    const b2y = nz * b1x - nx * b1z;
    const b2z = nx * b1y - ny * b1x;

    // Outer ring (220 stars)
    const outerCount = 220;
    const outerSpeed = 22.0 * this.burstRadiusScale;
    for (let i = 0; i < outerCount; i++) {
      const rad = (i / outerCount) * Math.PI * 2.0;
      const cosR = Math.cos(rad);
      const sinR = Math.sin(rad);

      const vx = (b1x * cosR + b2x * sinR) * outerSpeed;
      const vy = (b1y * cosR + b2y * sinR) * outerSpeed;
      const vz = (b1z * cosR + b2z * sinR) * outerSpeed;

      this.pool.spawn(
        x, y, z,
        vx, vy, vz,
        r, g, b, 1.0,
        3.5, 2.2 + Math.random() * 0.3,
        0.970, 9.8,
        4, 0, 0
      );
    }

    // Inner concentric ring (120 stars, contrasting hue)
    const innerCount = 120;
    const innerSpeed = 13.0 * this.burstRadiusScale;
    for (let i = 0; i < innerCount; i++) {
      const rad = (i / innerCount) * Math.PI * 2.0;
      const cosR = Math.cos(rad);
      const sinR = Math.sin(rad);

      const vx = (b1x * cosR + b2x * sinR) * innerSpeed;
      const vy = (b1y * cosR + b2y * sinR) * innerSpeed;
      const vz = (b1z * cosR + b2z * sinR) * innerSpeed;

      this.pool.spawn(
        x, y, z,
        vx, vy, vz,
        1.0, 1.0, 1.0, 1.0, // Bright white inner core ring
        3.0, 1.8 + Math.random() * 0.2,
        0.970, 9.8,
        4, 0, 0
      );
    }
  }

  // -------------------------------------------------------------
  // Archetype 6: Strobe
  // Stars pulsating/flashing on and off at 8-12 Hz.
  // -------------------------------------------------------------
  public spawnStrobe(x: number, y: number, z: number, r: number, g: number, b: number): void {
    const count = 350;
    const baseSpeed = 18.0 * this.burstRadiusScale;

    for (let k = 0; k < count; k++) {
      const phi = Math.acos(1.0 - (2.0 * (k + 0.5)) / count);
      const theta = 3.883222 * k;
      const speed = baseSpeed + (Math.random() - 0.5) * 4.0 * this.burstRadiusScale;

      const vx = speed * Math.sin(phi) * Math.cos(theta);
      const vy = speed * Math.sin(phi) * Math.sin(theta);
      const vz = speed * Math.cos(phi);

      const life = 2.8 + Math.random() * 0.8;
      const size = 3.8 + Math.random() * 1.5;
      const flickerSeed = Math.random() * 10.0;

      this.pool.spawn(
        x, y, z,
        vx, vy, vz,
        r, g, b, 1.0,
        size, life,
        0.960, 9.8,
        5, flickerSeed, 0
      );
    }
  }

  // -------------------------------------------------------------
  // Archetype 7: Crossette
  // Stars expand then fracture into 4 perpendicular daughter stars forming crosses.
  // -------------------------------------------------------------
  public spawnCrossette(x: number, y: number, z: number, r: number, g: number, b: number): void {
    const primaryCount = 24;
    const baseSpeed = 20.0 * this.burstRadiusScale;

    for (let k = 0; k < primaryCount; k++) {
      const phi = Math.acos(1.0 - (2.0 * (k + 0.5)) / primaryCount);
      const theta = 3.883222 * k;

      const vx = baseSpeed * Math.sin(phi) * Math.cos(theta);
      const vy = baseSpeed * Math.sin(phi) * Math.sin(theta);
      const vz = baseSpeed * Math.cos(phi);

      const life = 0.9 + Math.random() * 0.15; // Splits at ~0.9s

      // subType = 1 triggers 4-way cross on death
      this.pool.spawn(
        x, y, z,
        vx, vy, vz,
        r, g, b, 1.0,
        5.0, life,
        0.975, 9.8,
        6, 0, 1
      );
    }
  }

  // -------------------------------------------------------------
  // Archetype 8: Crackle / Dragon Eggs
  // Star clusters that detonate with sharp visual micro-flashes.
  // -------------------------------------------------------------
  public spawnCrackle(x: number, y: number, z: number, r: number, g: number, b: number): void {
    const primaryCount = 70;
    const baseSpeed = 19.0 * this.burstRadiusScale;

    for (let k = 0; k < primaryCount; k++) {
      const phi = Math.acos(1.0 - (2.0 * (k + 0.5)) / primaryCount);
      const theta = 3.883222 * k;

      const vx = baseSpeed * Math.sin(phi) * Math.cos(theta);
      const vy = baseSpeed * Math.sin(phi) * Math.sin(theta);
      const vz = baseSpeed * Math.cos(phi);

      const life = 0.8 + Math.random() * 0.5; // Staggered micro-bursts

      // subType = 2 triggers crackle burst on death
      this.pool.spawn(
        x, y, z,
        vx, vy, vz,
        r, g, b, 1.0,
        4.0, life,
        0.965, 9.8,
        7, 0, 2
      );
    }
  }

  // -------------------------------------------------------------
  // Archetype 9: Ground Mines
  // Instant upward-fanning cone of sparks and stars from ground level y=0.
  // -------------------------------------------------------------
  public spawnGroundMine(
    x: number, y: number, z: number,
    r: number, g: number, b: number,
    angleRad: number = 0
  ): void {
    const count = 420;

    for (let i = 0; i < count; i++) {
      // 60-degree upward fanning cone
      const spreadAngle = (Math.random() - 0.5) * 1.05 + angleRad;
      const speed = 26.0 + Math.random() * 26.0;

      const vx = Math.sin(spreadAngle) * speed + (Math.random() - 0.5) * 3.0;
      const vy = Math.cos(spreadAngle) * speed + 3.0;
      const vz = (Math.random() - 0.5) * 8.0;

      const life = 1.3 + Math.random() * 0.5;
      const size = 2.4 + Math.random() * 1.2;

      this.pool.spawn(
        x, y, z,
        vx, vy, vz,
        r, g, b, 1.0,
        size, life,
        0.960, 12.0,
        8, Math.random() * 30.0, 0
      );
    }
  }

  // -------------------------------------------------------------
  // Archetype 10: Whistling Comets
  // High-speed ascending spiraling corkscrew trail with apex burst.
  // -------------------------------------------------------------
  public spawnWhistlingComet(
    x: number, y: number, z: number,
    r: number, g: number, b: number,
    targetApexY: number,
    angleRad: number = 0
  ): void {
    const flightTime = 1.8;
    const vy = (targetApexY - y) / flightTime + 0.5 * 8.0 * flightTime;
    const vx = Math.sin(angleRad) * 12.0;
    const vz = 0.0;

    // Head projectile (subType = 3 spawns apex break on death)
    this.pool.spawn(
      x, y, z,
      vx, vy, vz,
      1.0, 1.0, 1.0, 1.0, // Brilliant white head
      7.0, flightTime,
      0.990, 8.0,
      9, Math.random() * 10.0, 3
    );

    // Ascending sparks wake
    const trailSparks = 200;
    for (let i = 0; i < trailSparks; i++) {
      const progress = i / trailSparks;
      const sparkLife = 0.4 + Math.random() * 0.3;
      const sparkSpeed = (Math.random() - 0.5) * 4.0;

      this.pool.spawn(
        x, y + progress * 2.0, z,
        vx * 0.3 + (Math.random() - 0.5) * 3.0,
        vy * (1.0 - progress * 0.7) - sparkSpeed,
        vz + (Math.random() - 0.5) * 3.0,
        r, g, b, 1.0,
        2.5, sparkLife,
        0.95, 9.8,
        9, Math.random() * 10.0, 0
      );
    }
  }

  // -------------------------------------------------------------
  // Archetype 11: Horsetail Waterfall
  // Compact apex burst falling in gentle cascading curtain.
  // -------------------------------------------------------------
  public spawnHorsetail(x: number, y: number, z: number, r: number, g: number, b: number): void {
    const count = 450;

    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 7.0;
      const vy = (Math.random() - 0.5) * 3.0 + 2.0;
      const vz = (Math.random() - 0.5) * 7.0;

      const life = 3.8 + Math.random() * 1.2;
      const size = 3.2 + Math.random() * 1.5;

      // Heavy gravity curtain droop: g = 16.0, high drag
      this.pool.spawn(
        x, y, z,
        vx, vy, vz,
        r * 1.2, g * 1.1, b * 0.8, 1.0, // Brilliant silver/champagne waterfall
        size, life,
        0.985, 16.0,
        10, Math.random() * 20.0, 0
      );
    }
  }

  // -------------------------------------------------------------
  // Archetype 12: Finale Barrage
  // Rapid multi-station staggered salvo sequence across stations.
  // -------------------------------------------------------------
  public spawnFinaleBarrage(r: number, g: number, b: number): void {
    const stations: LaunchStation[] = ['left', 'left_center', 'center', 'right_center', 'right'];

    // Salvo across all stations with staggered height & archetypes
    stations.forEach((st, idx) => {
      const sx = STATION_X_COORDS[st];
      const apexY = 22.0 + (idx % 2 === 0 ? 8.0 : 0.0);
      const angle = (idx - 2) * 6.0;

      // Ground mine base eruption
      this.spawnGroundMine(sx, 0.0, 0.0, r, g, b, (angle * Math.PI) / 180.0);

      // Aerial shell break
      if (idx === 2) {
        this.spawnBrocadeCrown(sx, apexY + 5.0, 0.0, 1.0, 0.84, 0.0);
      } else if (idx % 2 === 0) {
        this.spawnChrysanthemum(sx, apexY, 0.0, r, g, b);
      } else {
        this.spawnCrackle(sx, apexY - 3.0, 0.0, 1.0, 0.9, 0.2);
      }
    });
  }

  // -------------------------------------------------------------
  // Archetype 13: Multi-Break Aerial Shell (True 2-Stage Aerial Salute)
  // Stage 1: Initial expanding floral sphere of stars.
  // Stage 2: Each primary star detonates at apex/burnout into secondary
  // ring salutes, dragon eggs crackle pops, or glittering strobe bursts.
  // -------------------------------------------------------------
  public spawnMultiBreak(x: number, y: number, z: number, r: number, g: number, b: number): void {
    // Primary Stage 1: Sphere of floral stars that carry timed secondary fuses (subType = 4)
    const primaryCount = 48;
    const baseSpeed = 23.0 * this.burstRadiusScale;

    for (let k = 0; k < primaryCount; k++) {
      const phi = Math.acos(1.0 - (2.0 * (k + 0.5)) / primaryCount);
      const theta = 3.883222 * k;
      const speed = baseSpeed + (Math.random() - 0.5) * 4.0 * this.burstRadiusScale;

      const vx = speed * Math.sin(phi) * Math.cos(theta);
      const vy = speed * Math.sin(phi) * Math.sin(theta);
      const vz = speed * Math.cos(phi);

      // Stage 1 lifetime: 1.1s - 1.4s before detonation into stage 2 secondary bursts
      const life = 1.1 + Math.random() * 0.3;
      const size = 4.5 + Math.random() * 1.5;

      this.pool.spawn(
        x, y, z,
        vx, vy, vz,
        r, g, b, 1.0,
        size, life,
        0.970, 9.8,
        16, Math.random() * 10.0,
        4 // subType = 4 triggers multi-break secondary bursts
      );
    }

    // Central supporting floral peony core for visual depth during Stage 1
    const coreCount = 120;
    const coreSpeed = 12.0;
    for (let c = 0; c < coreCount; c++) {
      const phi = Math.acos(1.0 - (2.0 * (c + 0.5)) / coreCount);
      const theta = 3.883222 * c;
      const speed = coreSpeed + (Math.random() - 0.5) * 3.0;

      this.pool.spawn(
        x, y, z,
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.sin(phi) * Math.sin(theta),
        speed * Math.cos(phi),
        1.0, 0.9, 0.4, 1.0, // Warm golden inner sphere
        3.2, 1.0 + Math.random() * 0.3,
        0.960, 9.8,
        0, 0, 0
      );
    }
  }

  // -------------------------------------------------------------
  // Secondary Burst Handler
  // -------------------------------------------------------------
  private handleSecondaryBurst(
    subType: number,
    x: number, y: number, z: number,
    r: number, g: number, b: number
  ): void {
    if (subType === 1) {
      // Crossette 4-way perpendicular cross split
      const speed = 14.0;
      const dirs = [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
      ];

      for (const [dx, dy, dz] of dirs) {
        for (let s = 0; s < 3; s++) {
          const spread = (Math.random() - 0.5) * 1.5;
          this.pool.spawn(
            x, y, z,
            dx * speed + spread,
            dy * speed + spread,
            dz * speed + spread,
            r * 1.2, g * 1.2, b * 1.2, 1.0,
            3.6, 1.3 + Math.random() * 0.3,
            0.965, 9.8,
            6, 0, 0
          );
        }
      }
    } else if (subType === 2) {
      // Crackle / Dragon Eggs micro-flashes
      const microCount = 8;
      for (let m = 0; m < microCount; m++) {
        const phi = Math.random() * Math.PI * 2.0;
        const theta = Math.random() * Math.PI;
        const speed = 6.0 + Math.random() * 10.0;

        const vx = speed * Math.sin(theta) * Math.cos(phi);
        const vy = speed * Math.sin(theta) * Math.sin(phi);
        const vz = speed * Math.cos(theta);

        this.pool.spawn(
          x, y, z,
          vx, vy, vz,
          1.0, 1.0, 0.9, 1.0, // High-intensity flash white
          4.0, 0.45 + Math.random() * 0.25,
          0.940, 9.8,
          7, Math.random() * 20.0, 0
        );
      }
    } else if (subType === 3) {
      // Whistling Comet Apex Report Break
      const count = 120;
      for (let k = 0; k < count; k++) {
        const phi = Math.acos(1.0 - (2.0 * (k + 0.5)) / count);
        const theta = 3.883222 * k;
        const speed = 18.0 + (Math.random() - 0.5) * 4.0;

        this.pool.spawn(
          x, y, z,
          speed * Math.sin(phi) * Math.cos(theta),
          speed * Math.sin(phi) * Math.sin(theta),
          speed * Math.cos(phi),
          r, g, b, 1.0,
          3.5, 1.2 + Math.random() * 0.4,
          0.965, 9.8,
          0, 0, 0
        );
      }
    } else if (subType === 4) {
      // Multi-Break Stage 2: Secondary ring salutes & crackling dragon egg clusters
      const mode = Math.random();
      if (mode < 0.5) {
        // Mode A: Micro-ring salute (10 stars expanding in a sharp toroidal ring)
        const ringStars = 10;
        const ringSpeed = 15.0;
        const tilt = Math.random() * Math.PI;
        for (let i = 0; i < ringStars; i++) {
          const rad = (i / ringStars) * Math.PI * 2.0;
          const vx = Math.cos(rad) * ringSpeed;
          const vy = Math.sin(rad) * ringSpeed * Math.cos(tilt);
          const vz = Math.sin(rad) * ringSpeed * Math.sin(tilt);

          this.pool.spawn(
            x, y, z,
            vx, vy, vz,
            1.0, 0.85, 0.2, 1.0, // Brilliant golden titanium salute ring
            3.6, 0.8 + Math.random() * 0.3,
            0.960, 9.8,
            4, 0, 0
          );
        }
      } else {
        // Mode B: Dragon eggs crackle cluster
        const eggCount = 8;
        for (let e = 0; e < eggCount; e++) {
          const phi = Math.random() * Math.PI * 2.0;
          const theta = Math.random() * Math.PI;
          const speed = 8.0 + Math.random() * 12.0;

          const vx = speed * Math.sin(theta) * Math.cos(phi);
          const vy = speed * Math.sin(theta) * Math.sin(phi);
          const vz = speed * Math.cos(theta);

          this.pool.spawn(
            x, y, z,
            vx, vy, vz,
            1.0, 1.0, 1.0, 1.0, // High-energy white flash
            4.2, 0.5 + Math.random() * 0.3,
            0.950, 9.8,
            7, Math.random() * 20.0, 0
          );
        }
      }
    }
  }

  // -------------------------------------------------------------
  // Archetype 14: Heart Shape
  // Staggered dual-tone: parametric cardioid perimeter in palette color
  // with sparkling white/gold glittering core embers, rotated in 3D facing audience.
  // -------------------------------------------------------------
  public spawnHeartShape(x: number, y: number, z: number, r: number, g: number, b: number): void {
    const perimeterCount = 320;
    const baseScale = 1.35 * this.burstRadiusScale;
    
    // Organic 3D orientation variance (tilted toward audience: pitch ±25°, roll ±35°, yaw ±20°)
    const rotZ = (Math.random() - 0.5) * 0.7;
    const rotX = (Math.random() - 0.5) * 0.45;
    const rotY = (Math.random() - 0.5) * 0.4;
    const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);

    // 1. Parametric cardioid perimeter curve
    for (let i = 0; i < perimeterCount; i++) {
      const t = (i / perimeterCount) * Math.PI * 2.0;
      // Parametric 2D heart formula
      const hx = 16 * Math.pow(Math.sin(t), 3) * baseScale;
      const hy = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * baseScale;
      const hz = (Math.random() - 0.5) * 2.0;

      // 3D Euler rotation [Z then X then Y]
      const x1 = hx * cosZ - hy * sinZ;
      const y1 = hx * sinZ + hy * cosZ;
      const z1 = hz;

      const x2 = x1;
      const y2 = y1 * cosX - z1 * sinX;
      const z2 = y1 * sinX + z1 * cosX;

      const rx = x2 * cosY + z2 * sinY;
      const ry = y2;
      const rz = -x2 * sinY + z2 * cosY;

      const speed = 1.25;
      const life = 2.2 + Math.random() * 0.4;
      const size = 3.8 + Math.random() * 1.2;

      this.pool.spawn(
        x, y, z,
        rx * speed, ry * speed, rz,
        r, g, b, 1.0,
        size, life,
        0.965, 8.5,
        14, Math.random() * 20.0, 0
      );
    }

    // 2. Glittering white/gold core embers for visual depth
    const coreCount = 90;
    for (let c = 0; c < coreCount; c++) {
      const phi = Math.acos(1.0 - (2.0 * (c + 0.5)) / coreCount);
      const theta = 3.883222 * c;
      const speed = 7.0 + (Math.random() - 0.5) * 2.5;

      this.pool.spawn(
        x, y, z,
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.sin(phi) * Math.sin(theta) + 1.0,
        speed * Math.cos(phi),
        1.0, 0.95, 0.7, 1.0, // Warm shimmering white/gold
        3.2, 1.6 + Math.random() * 0.4,
        0.960, 9.0,
        1, Math.random() * 40.0, 0
      );
    }
  }

  // -------------------------------------------------------------
  // Archetype 15: Double Ring
  // 3D Orthogonal interlocking rings rotated organically across 3D orientations
  // while tilted primarily towards the audience camera.
  // -------------------------------------------------------------
  public spawnDoubleRing(x: number, y: number, z: number, r: number, g: number, b: number): void {
    const starsPerRing = 190;
    const ringSpeed = 22.0 * this.burstRadiusScale;

    // Organic 3D orientation: random rotation angles with camera-facing tilt bias
    const rotPitch = (Math.random() - 0.5) * 0.9; // ±26° pitch
    const rotYaw = (Math.random() - 0.5) * 0.8;   // ±23° yaw
    const rotRoll = Math.random() * Math.PI * 2.0; // Full 360° spin

    const cp = Math.cos(rotPitch), sp = Math.sin(rotPitch);
    const cy = Math.cos(rotYaw), sy = Math.sin(rotYaw);
    const cr = Math.cos(rotRoll), sr = Math.sin(rotRoll);

    // Helper 3D vector rotation function
    const rotateVec = (vx: number, vy: number, vz: number): [number, number, number] => {
      // Roll (Z)
      const x1 = vx * cr - vy * sr;
      const y1 = vx * sr + vy * cr;
      const z1 = vz;
      // Pitch (X)
      const x2 = x1;
      const y2 = y1 * cp - z1 * sp;
      const z2 = y1 * sp + z1 * cp;
      // Yaw (Y)
      const x3 = x2 * cy + z2 * sy;
      const y3 = y2;
      const z3 = -x2 * sy + z2 * cy;
      return [x3, y3, z3];
    };

    // Ring 1: Primary equatorial ring (palette color)
    for (let i = 0; i < starsPerRing; i++) {
      const rad = (i / starsPerRing) * Math.PI * 2.0;
      const localVx = Math.cos(rad) * ringSpeed;
      const localVy = (Math.random() - 0.5) * 2.0;
      const localVz = Math.sin(rad) * ringSpeed;

      const [rx, ry, rz] = rotateVec(localVx, localVy, localVz);

      this.pool.spawn(
        x, y, z,
        rx, ry, rz,
        r, g, b, 1.0,
        3.8, 2.3 + Math.random() * 0.4,
        0.970, 9.0,
        4, 0, 0
      );
    }

    // Ring 2: Orthogonal meridian ring (high-contrast complementary color)
    const altR = r < 0.5 ? 1.0 : 0.2;
    const altG = g < 0.5 ? 0.9 : 0.8;
    const altB = b < 0.5 ? 1.0 : 0.1;

    for (let j = 0; j < starsPerRing; j++) {
      const rad = (j / starsPerRing) * Math.PI * 2.0;
      const localVx = (Math.random() - 0.5) * 2.0;
      const localVy = Math.cos(rad) * ringSpeed;
      const localVz = Math.sin(rad) * ringSpeed;

      const [rx, ry, rz] = rotateVec(localVx, localVy, localVz);

      this.pool.spawn(
        x, y, z,
        rx, ry, rz,
        altR, altG, altB, 1.0,
        3.8, 2.3 + Math.random() * 0.4,
        0.970, 9.0,
        4, 0, 0
      );
    }
  }

  // -------------------------------------------------------------
  // Archetype 16: Diamond Shape
  // 3D faceted octahedron / rhombus star break rotated dynamically in 3D space.
  // -------------------------------------------------------------
  public spawnDiamondShape(x: number, y: number, z: number, r: number, g: number, b: number): void {
    const particlesPerEdge = 24;
    const diamondScale = 22.0 * this.burstRadiusScale;

    // Organic 3D rotation angles with camera-facing prominence
    const rotPitch = (Math.random() - 0.5) * 0.7;
    const rotYaw = (Math.random() - 0.5) * 0.7;
    const rotRoll = Math.random() * Math.PI * 2.0;

    const cp = Math.cos(rotPitch), sp = Math.sin(rotPitch);
    const cy = Math.cos(rotYaw), sy = Math.sin(rotYaw);
    const cr = Math.cos(rotRoll), sr = Math.sin(rotRoll);

    const rotatePoint = (px: number, py: number, pz: number): [number, number, number] => {
      const x1 = px * cr - py * sr;
      const y1 = px * sr + py * cr;
      const z1 = pz;
      const x2 = x1;
      const y2 = y1 * cp - z1 * sp;
      const z2 = y1 * sp + z1 * cp;
      const x3 = x2 * cy + z2 * sy;
      const y3 = y2;
      const z3 = -x2 * sy + z2 * cy;
      return [x3, y3, z3];
    };

    // 6 Octahedron Vertices in normalized coords
    const rawVertices = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];

    // Apply 3D rotation to vertices
    const vertices = rawVertices.map(([vx, vy, vz]) => rotatePoint(vx, vy, vz));

    // 12 connecting edges between cardinal vertices
    const edgePairs = [
      [0, 2], [0, 3], [0, 4], [0, 5],
      [1, 2], [1, 3], [1, 4], [1, 5],
      [2, 4], [4, 3], [3, 5], [5, 2],
    ];

    for (const [v1Idx, v2Idx] of edgePairs) {
      const v1 = vertices[v1Idx];
      const v2 = vertices[v2Idx];

      for (let p = 0; p < particlesPerEdge; p++) {
        const frac = p / particlesPerEdge;
        const vx = (v1[0] * (1 - frac) + v2[0] * frac) * diamondScale + (Math.random() - 0.5) * 1.5;
        const vy = (v1[1] * (1 - frac) + v2[1] * frac) * diamondScale + (Math.random() - 0.5) * 1.5;
        const vz = (v1[2] * (1 - frac) + v2[2] * frac) * diamondScale + (Math.random() - 0.5) * 1.5;

        const life = 2.0 + Math.random() * 0.5;
        const size = 3.6 + Math.random() * 1.4;

        this.pool.spawn(
          x, y, z,
          vx, vy, vz,
          r, g, b, 1.0,
          size, life,
          0.965, 8.5,
          13, Math.random() * 20.0, 0
        );
      }
    }
  }

  // -------------------------------------------------------------
  // Archetype 17: Butterfly
  // Dynamic bilateral wings with flapping propulsion velocities,
  // trailing strobe micro-sparks, and a glowing golden rising body/antenna core.
  // -------------------------------------------------------------
  public spawnButterfly(x: number, y: number, z: number, r: number, g: number, b: number): void {
    const wingParticles = 180;
    const baseSpeed = 16.0 * this.burstRadiusScale;

    // 1. Bilateral Wing Contours (Left & Right flapping wings)
    for (const side of [-1, 1]) {
      for (let i = 0; i < wingParticles; i++) {
        const t = (i / wingParticles) * Math.PI * 2.0;
        // Butterfly wing polar curve modulation: r(t) = e^cos(t) - 2*cos(4t) + sin^5(t/12)
        const wingR = (Math.exp(Math.cos(t)) - 2.0 * Math.cos(4.0 * t) + Math.pow(Math.sin(t / 12.0), 5.0)) * 0.45;

        const wx = side * Math.abs(Math.sin(t) * wingR) * baseSpeed;
        const wy = Math.cos(t) * wingR * baseSpeed * 0.9 + 2.0;
        const wz = (Math.sin(t * 3.0) * 0.4 + (Math.random() - 0.5) * 0.3) * baseSpeed;

        const life = 2.4 + Math.random() * 0.6;
        const size = 3.6 + Math.random() * 1.5;

        this.pool.spawn(
          x, y, z,
          wx, wy, wz,
          r, g, b, 1.0,
          size, life,
          0.970, 9.5,
          5, Math.random() * 10.0, 0 // Strobe micro-flicker on wings
        );
      }
    }

    // 2. Rising golden body and antennae core
    const bodySparks = 60;
    for (let bIdx = 0; bIdx < bodySparks; bIdx++) {
      const frac = bIdx / bodySparks;
      const bvy = 6.0 + frac * 8.0;
      const bvx = (Math.random() - 0.5) * 1.8;
      const bvz = (Math.random() - 0.5) * 1.8;

      this.pool.spawn(
        x, y, z,
        bvx, bvy, bvz,
        1.0, 0.88, 0.25, 1.0, // Brilliant golden body
        4.0, 1.8 + Math.random() * 0.4,
        0.965, 8.0,
        1, Math.random() * 30.0, 0
      );
    }
  }
}
