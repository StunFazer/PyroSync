# Project: PyroSync

PyroSync is a high-performance digital fireworks show programmer and live projection player web application. Designed specifically for projection mapping and live visual performances, PyroSync features a pure-black visual canvas, dual-mode audio synchronization (choreographed timecoded audio files and real-time reactive mic input), a multi-track timeline programmer with 1-click auto-choreography, a multi-monitor pop-out projector window (BroadcastChannel), and a projector calibration engine.

---

## Architecture

### System Topology & Module Boundaries
```
+---------------------------------------------------------------------------------------+
|                                    Operator Studio (UI)                              |
|                                                                                       |
|  +--------------------+  +------------------------+  +-----------------------------+  |
|  | Projector Calib.   |  | Multi-Track Timeline   |  | Audio Engine (R3)           |  |
|  | Panel (R1)         |  | & Waveform Canvas (R4) |  | - File Player + Timecode    |  |
|  | - Brightness/Gain  |  | - 6 Spatial Tracks     |  | - 3-Band FFT Analyzer (Mic) |  |
|  | - Black Cutoff     |  | - 1-Click Auto-Choreo  |  | - Procedural SFX (Muted)    |  |
|  | - Bloom Intensity  |  | - Macro Brushes        |  | - Dynamic Noise Floor       |  |
|  | - Particle Size    |  | - Tap-to-Record (1-9)  |  | - Cooldown Gates            |  |
|  | - Aspect Masks     |  | - Cue Inspector        |  +--------------+--------------+  |
|  +---------+----------+  +-----------+------------+                 |                 |
|            |                         |                              |                 |
|            v                         v                              v                 |
|  +---------------------------------------------------------------------------------+  |
|  |                              Show Orchestrator & State                          |  |
|  |  - JSON Import/Export (R4)                                                      |  |
|  |  - Demo Shows & Audio Reactive Profiles (R5)                                    |  |
|  |  - Presentation Fullscreen ('F') & Instant Blackout ('Esc'/'Space') (R2)        |  |
|  +---------------------------+----------------------------------+------------------+  |
|                              |                                  |                     |
|                              v                                  v                     |
|  +--------------------------------------------+    +-------------------------------+  |
|  | High-Perf WebGL Fireworks Engine (R1)      |    | BroadcastChannel Sync Bus (R2)|  |
|  | - Zero-Allocation Typed Array Particle Pool|    | ('pyrosync_projection_bus')   |  |
|  | - 12+ Shell Archetypes Physics Simulation  |    +---------------+---------------+  |
|  | - Projector Post-Processing & Black Clamp  |                    |                  |
|  +--------------------------------------------+                    | IPC              |
+--------------------------------------------------------------------|------------------+
                                                                     |
                                                                     v
                                    +---------------------------------------------------+
                                    | Pop-out Projector Window (Secondary Display) (R2)  |
                                    | - Pure-Black Borderless Fullscreen Canvas         |
                                    | - Mirrored Zero-Latency Particle Engine           |
                                    | - Synchronized Projector Calibration Shader       |
                                    +---------------------------------------------------+
```

---

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Zero-Allocation Particle Pool | Structure of Arrays Float32Array pool (32k-65k capacity) sustaining 60+ FPS under 25k+ particles without GC stutter | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Pure-Black Canvas Clamp | `#000000` clear color and post-processing fragment cutoff eliminating projector backlight leakage | M1 | ORIGINAL_REQUEST §R1, AC-3 |
| 3 | Additive Bloom Filter | Luminous star cores with high dynamic range glow while preserving pure black borders | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Peony Shell Archetype | Spherical 3D burst, uniform radial velocity, vibrant solid colors, clean break | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Chrysanthemum Shell Archetype | Spherical burst leaving long-burning trailing sparks behind each star | M1 | ORIGINAL_REQUEST §R1 |
| 6 | Willow / Kamuro Shell Archetype | Heavy downward-drooping glittering gold/silver trails with long hang time | M1 | ORIGINAL_REQUEST §R1 |
| 7 | Brocade Crown Shell Archetype | Dense golden/silver branching trails forming a wide canopy with extended hang time | M1 | ORIGINAL_REQUEST §R1 |
| 8 | Rings Shell Archetype | Concentric or planetary ring patterns expanding in a defined 2D/3D toroidal plane | M1 | ORIGINAL_REQUEST §R1 |
| 9 | Strobe Shell Archetype | Stars pulsating/flashing on and off rhythmically (4-12 Hz) as they expand | M1 | ORIGINAL_REQUEST §R1 |
| 10 | Crossette Shell Archetype | Stars expand then fracture into 4 perpendicular daughter stars forming crosses | M1 | ORIGINAL_REQUEST §R1 |
| 11 | Crackle / Dragon Eggs Archetype | Star clusters detonating with sharp visual micro-flashes and synchronized micro-crackles | M1 | ORIGINAL_REQUEST §R1 |
| 12 | Ground Mines Archetype | Instant upward-fanning cone of sparks and stars from bottom edge (y=0) | M1 | ORIGINAL_REQUEST §R1 |
| 13 | Whistling Comets Archetype | High-speed ascending comet with erratic corkscrew trajectory and apex burst | M1 | ORIGINAL_REQUEST §R1 |
| 14 | Horsetail Waterfall Archetype | Compact apex burst whose stars fall together in a gentle cascading curtain | M1 | ORIGINAL_REQUEST §R1 |
| 15 | Finale Barrage Archetype | Rapid multi-burst salvo across multiple stations with staggered breaks | M1 | ORIGINAL_REQUEST §R1 |
| 16 | Brightness / Gain Multiplier | Master brightness scaler (0.10 to 3.00) adjusting luminance for high-lumen vs portable projectors | M1 | ORIGINAL_REQUEST §R1, AC-5 |
| 17 | Black-Level Cutoff Clamp | Threshold (0.00 to 0.20) below which RGB values are forced to absolute zero | M1 | ORIGINAL_REQUEST §R1, AC-5 |
| 18 | Bloom Intensity Calibration | Calibrate bloom threshold, radius, and intensity dynamically | M1 | ORIGINAL_REQUEST §R1, AC-5 |
| 19 | Particle Size Scaling | Scale rendered particle size (0.5x to 4.0x) according to projector throw distance | M1 | ORIGINAL_REQUEST §R1, AC-5 |
| 20 | Aspect Ratio Masking Guides | Hard letterbox/pillarbox masks and scissoring for 16:9, 16:10, 4:3, and 21:9 Ultra-wide | M1 | ORIGINAL_REQUEST §R1, AC-5 |
| 21 | Presentation Fullscreen Toggle (`F`) | Instant fullscreen switch hiding all operator UI on primary display | M1 | ORIGINAL_REQUEST §R2, AC-11 |
| 22 | Instant Blackout / Panic Control | Emergency hotkey (`Esc` or `Space`) instantly clearing particles and halting firing | M1 | ORIGINAL_REQUEST §R2, AC-11 |
| 23 | Timecoded Audio File Player | Sample-accurate Web Audio / HTMLAudio player with zero-drift timeline synchronization | M2 | ORIGINAL_REQUEST §R3, AC-6 |
| 24 | Interactive Waveform Engine | High-performance audio buffer decimation and waveform rendering | M2 | ORIGINAL_REQUEST §R3, §R4 |
| 25 | Live Mic 3-Band FFT Analyzer | Real-time audio stream analysis splitting input into Sub-bass, Mid, and Treble bands | M2 | ORIGINAL_REQUEST §R3, AC-7 |
| 26 | Dynamic Noise-Floor Adaptation | Rolling baseline energy tracker adjusting trigger sensitivity to changing room ambient noise | M2 | ORIGINAL_REQUEST §R3, AC-7 |
| 27 | Visual LED Trigger Meters | Three-band real-time virtual LED ladders showing instantaneous band energy & thresholds | M2 | ORIGINAL_REQUEST §R3, AC-7 |
| 28 | Re-trigger Cooldown Gates | Adjustable lock-out timer after each audio shell trigger preventing stutter-fire | M2 | ORIGINAL_REQUEST §R3, AC-7 |
| 29 | Procedural Launch Thump SFX | Web Audio synthesized launch mortar thump (pitch-dropped sine + transient noise) | M2 | ORIGINAL_REQUEST §R3 |
| 30 | Procedural Aerial Boom SFX | Deep sub-bass acoustic report with filtered low-frequency noise and exponential decay | M2 | ORIGINAL_REQUEST §R3 |
| 31 | Procedural Crackle SFX | Micro-burst granular noise clicks simulating crackling stars / dragon eggs | M2 | ORIGINAL_REQUEST §R3 |
| 32 | Master SFX Volume (Default Muted) | Global volume attenuator for synthesized procedural sound effects, strictly defaulted to MUTED | M2 | ORIGINAL_REQUEST §R3 |
| 33 | Pop-Out Projector Window | Independent browser window containing pure borderless canvas for secondary displays | M3 | ORIGINAL_REQUEST §R2, AC-10 |
| 34 | BroadcastChannel Sync Protocol | Zero-latency inter-window communication syncing playback, timecode, cues, and calibration | M3 | ORIGINAL_REQUEST §R2, AC-10 |
| 35 | Pop-Out Reconnection & Handshake | Resilient handshake on window launch requesting current timecode and state | M3 | ORIGINAL_REQUEST §R2 |
| 36 | 6 Spatial Launch Tracks | Timeline track lanes for Left, Left-Center, Center, Right-Center, Right, and Fan stations | M4 | ORIGINAL_REQUEST §R4 |
| 37 | Transient Peak Markers | Automated detection and visual display of audio transients / drum hits on timeline | M4 | ORIGINAL_REQUEST §R4 |
| 38 | 1-Click Auto-Choreographer | Algorithmic generator analyzing audio beats, drops, and energy to populate timeline cues | M4 | ORIGINAL_REQUEST §R4, AC-8 |
| 39 | Macro Brush: Fan Sweeps | Sequential cues sweeping across stations (L->R, R->L, Center-Out) | M4 | ORIGINAL_REQUEST §R4 |
| 40 | Macro Brush: Alternating Mines | Rhythmically alternating ground mine bursts across outer and inner launch stations | M4 | ORIGINAL_REQUEST §R4 |
| 41 | Macro Brush: Grand Finale Barrage | Dense crescendo of overlapping shells culminating in massive simultaneous salvo | M4 | ORIGINAL_REQUEST §R4 |
| 42 | Live Tap-To-Record Hotkeys (`1`–`9`) | Numeric keyboard shortcuts dropping pre-assigned cues onto tracks during playback | M4 | ORIGINAL_REQUEST §R4, AC-9 |
| 43 | Cue Inspector Panel | Parameter editing interface for selected cue(s) (type, color, altitude, angle, duration) | M4 | ORIGINAL_REQUEST §R4 |
| 44 | Portable Show JSON Export | Serialization of timeline, tracks, cues, calibration, and metadata to JSON | M4 | ORIGINAL_REQUEST §R4, AC-12 |
| 45 | Portable Show JSON Import | Deserialization, schema validation, and loading of external JSON show files | M4 | ORIGINAL_REQUEST §R4, AC-12 |
| 46 | Choreographed Demo Show 1 | "Cosmic Awakening" - 75s synchronized cinematic pyromusical show with audio | M4 | ORIGINAL_REQUEST §R5 |
| 47 | Choreographed Demo Show 2 | "Neon Horizon" - 70s synchronized synthwave/cyberpunk show with audio | M4 | ORIGINAL_REQUEST §R5 |
| 48 | Live Audio-Reactive Profiles | 3 pre-configured profiles (Club/EDM, Ambient, Percussive) with sensitivity & shell mappings | M4 | ORIGINAL_REQUEST §R5 |
| 49 | Integrated End-to-End Delivery | Complete system verification against all 12 Acceptance Criteria & Tier 1-5 test suite | M5 | ORIGINAL_REQUEST Acceptance Criteria |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Fireworks Engine & Calibration | Project setup (Vite/React/TS/Tailwind), zero-allocation typed array particle pool (32k+ particles, 60+ FPS), 12+ shell archetypes, projector calibration post-processing (gain, black cutoff clamp, bloom, particle size, aspect ratio masks), Fullscreen ('F') & Blackout/Panic ('Esc'/'Space'). | none | DONE (Gate passed, 260/260 tests, clean audit) |
| M2 | Dual-Mode Audio Engine & Pyromusical Sync | Timecoded audio file player with sample-accurate clock, 3-band FFT analyzer (Sub-bass, Mid, Treble) with dynamic noise floor adaptation & cooldown gates, visual LED meters, procedural Web Audio SFX (launch, boom, crackle - defaulted to MUTED), embedded procedural music synth. | M1 | DONE (Gate passed, 260/260 tests, clean audit) |
| M3 | BroadcastChannel Dual Display & Pop-Out Projection | Multi-monitor pop-out projector window (`/projector` or `#/projector`), borderless pure-black canvas, BroadcastChannel IPC sync protocol, timecode sync, cue execution, calibration sync, instant blackout sync, reconnection handling. | M1 | DONE (Gate passed, 260/260 tests, clean audit) |
| M4 | Timeline Studio, Choreography Engine & Presets | 6-track spatial timeline (L, LC, C, RC, R, Fan), interactive waveform display with transients, 1-Click Auto-Choreographer, macro brushes (fan sweeps, alternating mines, finale), live tap-to-record (`1`–`9`), cue inspector, JSON export/import, 2 demo shows with audio, 3 live audio-reactive profiles. | M1, M2, M3 | IN_PROGRESS (spawning worker_m4) |
| M5 | System Integration & E2E Acceptance Verification | Pass 100% of E2E test suite (Tiers 1-4) published by E2E Testing Track (`TEST_READY.md`), adversarial coverage hardening (Tier 5), verify all 12 Acceptance Criteria cleanly. | M1, M2, M3, M4, E2E Testing Track | PLANNED |

---

## Interface Contracts

### 1. Fireworks Simulation & Particle Engine
```typescript
export interface ParticleEngineConfig {
  maxParticles: number; // default 65536
  blackClamp: number; // 0.00 to 0.20, default 0.02
  gain: number; // 0.10 to 3.00, default 1.00
  bloomIntensity: number; // 0.00 to 3.00, default 1.20
  particleSizeScale: number; // 0.50 to 4.00, default 1.00
  aspectRatioMask: '16:9' | '16:10' | '4:3' | '21:9' | 'off';
}

export type ShellArchetype =
  | 'peony'
  | 'chrysanthemum'
  | 'willow'
  | 'brocade_crown'
  | 'rings'
  | 'strobe'
  | 'crossette'
  | 'crackle'
  | 'ground_mine'
  | 'whistling_comet'
  | 'horsetail'
  | 'finale_barrage';

export interface FireCuePayload {
  id: string;
  archetype: ShellArchetype;
  station: 'left' | 'left_center' | 'center' | 'right_center' | 'right' | 'fan';
  color: string; // hex
  altitude: number; // 0.2 to 1.0 (normalized height)
  launchAngle?: number; // radians or degrees offset
  duration?: number;
  seed?: number;
}
```

### 2. Audio Engine & Pyromusical Sync
```typescript
export interface AudioEngineInterface {
  loadAudio(source: string | File | AudioBuffer): Promise<void>;
  play(startTime?: number): void;
  pause(): void;
  seek(time: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  startMic(): Promise<void>;
  stopMic(): void;
  getBands(): { sub: number; mid: number; treble: number };
  getThresholds(): { sub: number; mid: number; treble: number };
  setNoiseFloorAdaptation(enabled: boolean, rate: number): void;
  setCooldown(band: 'sub' | 'mid' | 'treble', ms: number): void;
  playProceduralSFX(type: 'launch' | 'boom' | 'crackle', volume?: number): void;
  setSFXVolume(volume: number): void;
  setSFXMuted(muted: boolean): void;
}
```

### 3. BroadcastChannel IPC Protocol (`pyrosync_projection_bus`)
```typescript
export type BroadcastMessage =
  | { type: 'STATE_SYNC_REQUEST' }
  | { type: 'STATE_SYNC_RESPONSE'; payload: { time: number; isPlaying: boolean; showId: string; calibration: ParticleEngineConfig } }
  | { type: 'TRANSPORT_PLAY'; time: number }
  | { type: 'TRANSPORT_PAUSE'; time: number }
  | { type: 'TRANSPORT_SEEK'; time: number }
  | { type: 'FIRE_CUE'; cue: FireCuePayload }
  | { type: 'PANIC_BLACKOUT' }
  | { type: 'CALIBRATION_UPDATE'; calibration: Partial<ParticleEngineConfig> }
  | { type: 'LOAD_SHOW'; show: ShowJSON };
```

### 4. Show JSON Schema
```typescript
export interface ShowJSON {
  version: '1.0.0';
  title: string;
  duration: number; // in seconds
  audioTrack?: {
    name: string;
    url?: string;
    proceduralPreset?: 'cosmic_awakening' | 'neon_horizon';
  };
  calibration: ParticleEngineConfig;
  cues: Array<{
    id: string;
    time: number; // timestamp in seconds
    archetype: ShellArchetype;
    station: 'left' | 'left_center' | 'center' | 'right_center' | 'right' | 'fan';
    color: string;
    altitude: number;
    launchAngle?: number;
  }>;
}
```

---

## Code Layout

```
src/
├── app/
│   ├── App.tsx                  # Main Operator Studio Application
│   ├── ProjectorWindow.tsx      # Pop-out Window Route Component (#/projector)
│   └── main.tsx                 # Application Entry Point & Router
├── components/
│   ├── timeline/
│   │   ├── TimelineStudio.tsx   # Multi-track timeline & tracks dock
│   │   ├── WaveformCanvas.tsx   # OffscreenCanvas interactive waveform
│   │   ├── CueInspector.tsx     # Cue parameter editor
│   │   └── MacroBrushesBar.tsx  # Macro brushes (fan sweep, mines, barrage)
│   ├── calibration/
│   │   └── CalibrationPanel.tsx # Brightness, black clamp, bloom, particle size, masks
│   ├── audio/
│   │   ├── AudioMeters.tsx      # 3-band LED visual meters & mic controls
│   │   └── SFXControls.tsx      # Procedural sound FX controls (default muted)
│   └── display/
│       ├── CanvasViewport.tsx   # Primary WebGL canvas container
│       └── PanicBar.tsx         # Fullscreen ('F') & Panic Blackout ('Esc'/'Space') buttons
├── engine/
│   ├── fireworks/
│   │   ├── ParticlePool.ts      # Zero-allocation Structure of Arrays (SoA) Typed Array pool
│   │   ├── ParticleRenderer.ts  # WebGL/Three.js Points & custom point shaders
│   │   ├── ShellArchetypes.ts   # 12+ shell physics generators & lifecycle controllers
│   │   └── SimulationLoop.ts    # 60+ FPS imperative animation frame loop
│   ├── calibration/
│   │   └── ProjectorShaders.ts  # Additive bloom, black-level clamp, aspect ratio scissoring
│   └── audio/
│       ├── AudioEngine.ts       # Audio file playback, sample-accurate timecode clock
│       ├── MicAnalyzer.ts       # 3-band FFT analyzer, dynamic noise-floor, cooldown gates
│       ├── ProceduralSFX.ts     # Synthesized launch thump, aerial boom, crackle (muted by default)
│       └── ProceduralMusic.ts   # Built-in synth tracks for Demo Show 1 & 2
├── choreography/
│   ├── AutoChoreographer.ts    # 1-Click spectral flux & transient onset detection
│   ├── PatternBrushes.ts       # Fan sweeps, alternating mines, finale generators
│   └── TapRecorder.ts          # Hotkeys 1-9 live timecode cue recorder
├── state/
│   ├── BroadcastBus.ts         # BroadcastChannel IPC manager
│   ├── ShowManager.ts          # Timeline state, undo/redo, cue storage
│   ├── ShowSerialization.ts    # JSON schema validator, exporter, importer
│   └── Presets.ts              # Demo shows 1 & 2 and audio-reactive profiles
└── types/
    └── index.ts                # Shared TypeScript definitions & contracts
tests/
├── e2e/                        # Comprehensive E2E test suite (Tiers 1-4)
└── unit/                       # Unit tests for core algorithms
```
