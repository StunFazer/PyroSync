import * as THREE from 'three';
import { ParticlePool } from './ParticlePool';

export const PARTICLE_VERTEX_SHADER = /* glsl */ `
  attribute vec4 aColor;
  attribute vec2 aSizeLife;   // x: size, y: normLife [0..1]
  attribute vec2 aArchetype;  // x: archetypeId, y: sparklePhase

  varying vec4 vColor;
  varying vec2 vArchetype;
  varying float vLife;

  uniform float uParticleScale;

  void main() {
    vColor = aColor;
    vArchetype = aArchetype;
    vLife = aSizeLife.y;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    // Distance attenuation with calibrated scale factor for fine, radiant sparks
    float pointSize = aSizeLife.x * uParticleScale * (220.0 / max(1.0, -mvPosition.z));

    // Smooth fade out in the final 15% of lifetime
    float fade = 1.0 - smoothstep(0.85, 1.0, aSizeLife.y);
    gl_PointSize = max(1.0, pointSize * fade);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const PARTICLE_FRAGMENT_SHADER = /* glsl */ `
  varying vec4 vColor;
  varying vec2 vArchetype;
  varying float vLife;

  uniform float uTime;

  void main() {
    // Distance from center of point sprite [0.0 .. 0.5]
    vec2 coord = gl_PointCoord - vec2(0.5);
    float distSq = dot(coord, coord);
    if (distSq > 0.25) discard; // Sharp circular disc cutoff

    // Analytical Gaussian falloff for radiant hot core
    float intensity = exp(-distSq * 18.0);

    float alpha = vColor.a;

    // Archetype-specific optical modulation
    if (abs(vArchetype.x - 5.0) < 0.1) {
      // Strobe archetype (5): 10 Hz hard flash
      float strobe = step(0.5, fract(uTime * 10.0 + vArchetype.y));
      alpha *= strobe;
    } else if (abs(vArchetype.x - 1.0) < 0.1) {
      // Chrysanthemum sparkle (1): high-frequency scintillation
      float flicker = 0.75 + 0.25 * sin(uTime * 45.0 + vArchetype.y);
      alpha *= flicker;
    } else if (abs(vArchetype.x - 2.0) < 0.1 || abs(vArchetype.x - 3.0) < 0.1 || abs(vArchetype.x - 12.0) < 0.1) {
      // Willow (2), Brocade Crown (3), Weeping Willow (12): golden shimmer
      float shimmer = 0.85 + 0.15 * sin(uTime * 25.0 + vArchetype.y);
      alpha *= shimmer;
    }

    // HDR radiance boost for bloom pipeline capture
    vec3 radiantColor = vColor.rgb * intensity * 1.8;
    gl_FragColor = vec4(radiantColor, alpha * intensity);
  }
`;

export class ParticleRenderer {
  public readonly geometry: THREE.BufferGeometry;
  public readonly material: THREE.ShaderMaterial;
  public readonly points: THREE.Points;
  private pool: ParticlePool;

  private posAttr: THREE.BufferAttribute;
  private colorAttr: THREE.BufferAttribute;
  private sizeLifeAttr: THREE.BufferAttribute;
  private archetypeAttr: THREE.BufferAttribute;

  constructor(pool: ParticlePool) {
    this.pool = pool;

    this.geometry = new THREE.BufferGeometry();

    // Map ParticlePool Float32Arrays directly to Three.js BufferAttributes
    this.posAttr = new THREE.BufferAttribute(pool.gpuPositions, 3);
    this.colorAttr = new THREE.BufferAttribute(pool.gpuColors, 4);
    this.sizeLifeAttr = new THREE.BufferAttribute(pool.gpuSizeLife, 2);
    this.archetypeAttr = new THREE.BufferAttribute(pool.gpuArchetypes, 2);

    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.colorAttr.setUsage(THREE.DynamicDrawUsage);
    this.sizeLifeAttr.setUsage(THREE.DynamicDrawUsage);
    this.archetypeAttr.setUsage(THREE.DynamicDrawUsage);

    this.geometry.setAttribute('position', this.posAttr);
    this.geometry.setAttribute('aColor', this.colorAttr);
    this.geometry.setAttribute('aSizeLife', this.sizeLifeAttr);
    this.geometry.setAttribute('aArchetype', this.archetypeAttr);

    // Initial draw range is 0
    this.geometry.setDrawRange(0, 0);

    this.material = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX_SHADER,
      fragmentShader: PARTICLE_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0.0 },
        uParticleScale: { value: 1.0 },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false; // Never cull active particle cloud
  }

  /**
   * Updates uniforms and marks GPU attributes for streaming upload.
   */
  public render(timeSec: number, particleScale: number): void {
    const count = this.pool.aliveCount;

    this.material.uniforms.uTime.value = timeSec;
    this.material.uniforms.uParticleScale.value = particleScale;

    if (count > 0) {
      this.posAttr.needsUpdate = true;
      this.colorAttr.needsUpdate = true;
      this.sizeLifeAttr.needsUpdate = true;
      this.archetypeAttr.needsUpdate = true;
    }

    this.geometry.setDrawRange(0, count);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
