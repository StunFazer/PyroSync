import * as THREE from 'three';
import { ParticlePool } from './ParticlePool';
import { ShellArchetypeManager } from './ShellArchetypes';
import { ParticleRenderer } from './ParticleRenderer';
import { ProjectorPipeline } from '../calibration/ProjectorShaders';
import { ParticleEngineConfig, FireCuePayload, SimulationStats } from '../../types';

export class FireworksSimulation {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  public readonly pool: ParticlePool;
  public readonly archetypes: ShellArchetypeManager;
  public readonly particleRenderer: ParticleRenderer;
  public readonly pipeline: ProjectorPipeline;

  public config: ParticleEngineConfig;

  // Animation Loop State
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private lastTimeSec: number = 0;

  // Performance Stats Monitoring
  private frameCount: number = 0;
  private lastFpsUpdateSec: number = 0;
  private currentFps: number = 60;
  private lastFrameDurationMs: number = 16.6;
  public onStatsUpdate: ((stats: SimulationStats) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, initialConfig?: Partial<ParticleEngineConfig>) {
    this.canvas = canvas;

    this.config = {
      maxParticles: 65536,
      gain: 1.0,
      bloomIntensity: 0.9,
      particleSizeScale: 1.0,
      burstRadiusScale: 1.0,
      projectionMargin: 0.10, // 10% safe margin from screen edges
      blackClamp: 0.02,
      aspectRatioMask: 'off',
      showGuides: false,
      ...initialConfig,
    };

    // Initialize Three.js WebGLRenderer with strictly pitch-black clear color
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setClearColor(0x000000, 1.0);
    this.renderer.toneMapping = THREE.NoToneMapping; // Disable tone mapping to preserve optical black
    // Clamp pixel ratio strictly to 1.0 to guarantee solid 60 FPS without GPU fill-rate exhaustion (especially on 1440p/4K displays & video export)
    this.renderer.setPixelRatio(1.0);

    const width = Math.max(1, canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, canvas.clientHeight || window.innerHeight);
    this.renderer.setSize(width, height, false);

    // Initialize Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Camera framed widely on pyrotechnic stage (stage width ~76 units, height ~55 units)
    // Positioned at (0, 24, 78) with FOV 60 to ensure full window coverage without center bunching
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.5, 600);
    this.camera.position.set(0, 24, 78);
    this.camera.lookAt(0, 24, 0);

    // Initialize Zero-Allocation Particle Pool & Subsystems
    this.pool = new ParticlePool(this.config.maxParticles);
    this.archetypes = new ShellArchetypeManager(this.pool);
    const aspect = width / height;
    const stageHalfWidth = Math.max(34.0, 24.0 * Math.max(1.0, aspect));
    this.archetypes.setStageWidth(stageHalfWidth);

    this.particleRenderer = new ParticleRenderer(this.pool);
    this.scene.add(this.particleRenderer.points);

    // Initialize Projector Calibration Pipeline
    this.pipeline = new ProjectorPipeline(width, height);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimeSec = performance.now() * 0.001;
    this.lastFpsUpdateSec = this.lastTimeSec;
    this.tick = this.tick.bind(this);
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * 60+ FPS Imperative Animation Tick
   */
  private tick(nowMs: number): void {
    if (!this.isRunning) return;

    const nowSec = nowMs * 0.001;
    const dt = Math.max(0.001, Math.min(0.1, nowSec - this.lastTimeSec));
    this.lastTimeSec = nowSec;

    const frameStart = performance.now();

    // 1. Physics update in typed array pool (0 heap allocation)
    this.pool.update(dt, nowSec);

    // 2. Stream updated particle buffers to GPU
    this.particleRenderer.render(nowSec, this.config.particleSizeScale);

    // 3. Post-processing calibration pass with pitch black clamp & bloom
    this.pipeline.render(this.renderer, this.scene, this.camera, this.config);

    const frameEnd = performance.now();
    this.lastFrameDurationMs = frameEnd - frameStart;

    // 4. Update FPS meter at ~10 Hz to prevent React re-render thrashing
    this.frameCount++;
    if (nowSec - this.lastFpsUpdateSec >= 0.1) {
      this.currentFps = Math.round(this.frameCount / (nowSec - this.lastFpsUpdateSec));
      this.frameCount = 0;
      this.lastFpsUpdateSec = nowSec;

      if (this.onStatsUpdate) {
        this.onStatsUpdate({
          fps: this.currentFps,
          frameTimeMs: parseFloat(this.lastFrameDurationMs.toFixed(1)),
          activeParticles: this.pool.aliveCount,
          maxParticles: this.pool.capacity,
          drawCalls: 1, // Single-draw-call WebGL points
        });
      }
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  public resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    const aspect = width / height;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    // Dynamically adjust stage half-width to match window aspect ratio & burst radius scale
    const radiusBoost = Math.max(1.0, this.config.burstRadiusScale ?? 1.0);
    const stageHalfWidth = Math.max(34.0, 24.0 * Math.max(1.0, aspect)) * (0.8 + 0.2 * radiusBoost);
    this.archetypes.setStageWidth(stageHalfWidth);

    this.renderer.setSize(width, height, false);
    this.pipeline.resize(width, height);
  }

  public fireCue(cue: FireCuePayload): void {
    // Apply gentle projection safety margin without artificial center pinch
    const margin = this.config.projectionMargin ?? 0.10;
    const safeScale = 1.0 - margin * 0.4; // Gentle safe boundary (e.g. 0.96)
    const clampedCue: FireCuePayload = {
      ...cue,
      altitude: Math.max(0.15, Math.min(1.0, (cue.altitude || 0.85) * safeScale)),
      launchAngle: (cue.launchAngle ?? 0) * safeScale,
    };
    this.archetypes.fire(clampedCue);
  }

  /**
   * Instant Panic Blackout ('Esc' or 'Space'):
   * Immediately clears all active particles within 1 frame.
   */
  public blackout(): void {
    this.pool.blackout();
    this.particleRenderer.render(this.lastTimeSec, this.config.particleSizeScale);
    this.pipeline.render(this.renderer, this.scene, this.camera, this.config);
  }

  public updateConfig(newConfig: Partial<ParticleEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (this.config.burstRadiusScale !== undefined) {
      this.archetypes.setBurstRadiusScale(this.config.burstRadiusScale);
      // Dynamically widen camera and stage so high-radius fireworks fill full area dimensions
      const aspect = this.camera.aspect || 1.777;
      const radiusBoost = Math.max(1.0, this.config.burstRadiusScale);
      const stageHalfWidth = Math.max(34.0, 24.0 * Math.max(1.0, aspect)) * (0.8 + 0.2 * radiusBoost);
      this.archetypes.setStageWidth(stageHalfWidth);
      
      // Smoothly adjust camera distance and height so massive barrages fill the screen without clipping
      const targetZ = 78 + (radiusBoost - 1.0) * 18;
      const targetY = 24 + (radiusBoost - 1.0) * 4;
      this.camera.position.set(0, targetY, targetZ);
      this.camera.lookAt(0, targetY, 0);
      this.camera.updateProjectionMatrix();
    }
  }

  public dispose(): void {
    this.stop();
    this.scene.remove(this.particleRenderer.points);
    this.particleRenderer.dispose();
    this.pipeline.dispose();
    this.renderer.dispose();
  }
}
