# Milestone 4 Architectural Investigation & Synthesis Report

**Working Directory**: `c:/Users/Beame/Documents/antigravity/zealous-shannon/.agents/teamwork_preview_explorer_m4_1`  
**Target Milestone**: Milestone 4 (Timeline Studio, Choreography Engine & Presets)  
**Date**: 2026-09-14  

---

## 1. Observation

### 1.1 Test Suite Baseline & Build Status
Direct execution of the test runner command:
```bash
npm test (node tests/runner.ts)
```
Output:
```
======================================================================
         PYROSYNC E2E OPAQUE-BOX TEST SUITE EXECUTION (TIERS 1-4)    
======================================================================
TOTALS | 10 Test Modules | Passed: 260 | Failed: 0 | Assertions: 2798 | Time: 136.3ms
SUCCESS: All 260 test cases passed across all 4 tiers.
```

Direct execution of TypeScript typecheck / build:
```bash
npm run build (tsc && vite build)
```
Verbatim Error Output:
```
src/state/ShowSerialization.ts(171,12): error TS7006: Parameter 'a' implicitly has an 'any' type.
src/state/ShowSerialization.ts(171,15): error TS7006: Parameter 'b' implicitly has an 'any' type.
```
In `src/state/ShowSerialization.ts`, lines 170–172:
```typescript
170:     })
171:     .sort((a, b) => a.time - b.time);
172: 
```
Because `rawCues` is typed `any`, TypeScript in strict mode (`tsconfig.json: "noImplicitAny": true`) rejects unannotated sort callback parameters `a` and `b`.

### 1.2 Existing Type Definitions in `src/types/index.ts`
1. **`ShowCue` vs `ShowJSONCue` / `FireCuePayload` Discrepancy**:
   - In `src/types/index.ts:40-50`:
     ```typescript
     export interface ShowCue {
       id: string;
       timeMs: number; // timestamp in milliseconds
       trackId: LaunchStation;
       shellType: ShellArchetype;
       colorPalette: string[];
       altitude: number; // 0.1 to 1.0
       launchAngle: number; // degrees
       durationMs: number;
       label?: string;
     }
     ```
   - In `src/types/index.ts:62-72` and line 74:
     ```typescript
     export type ShowJSONCue = ShowJSON['cues'][number];
     // where cue is:
     // {
     //   id: string;
     //   time: number; // timestamp in seconds
     //   archetype: ShellArchetype;
     //   station: LaunchStation;
     //   color: string;
     //   altitude: number;
     //   launchAngle?: number;
     //   duration?: number;
     // }
     ```
   - In `src/types/index.ts:29-38` (`FireCuePayload`):
     ```typescript
     export interface FireCuePayload {
       id: string;
       archetype: ShellArchetype;
       station: LaunchStation;
       color: string; // hex color e.g. '#ff3366'
       altitude: number; // 0.1 to 1.0
       launchAngle?: number; // degrees offset (-45 to +45)
       duration?: number; // duration in seconds
       seed?: number;
     }
     ```
   - In `tests/tier1-features/timeline-tracks.test.ts:104-137`:
     ```typescript
     test('Cue Inspector: Editing cue archetype updates payload type', () => {
       const cue = { id: 'c1', archetype: 'peony' };
       cue.archetype = 'chrysanthemum';
       tracker.assertEquals(cue.archetype, 'chrysanthemum', 'Archetype changed');
     });
     test('Cue Inspector: Duration updates star hang-time override', () => {
       const cue = { id: 'c2', duration: 2.5 };
       cue.duration = 4.0;
     });
     ```
   - All tests (`tests/tier1-features/export-import.test.ts`, `tests/fixtures/demo-shows.ts`, `tests/tier3-combinations/cross-feature.test.ts`, `tests/tier4-scenarios/real-world-scenarios.test.ts`) expect cues to use `time` (seconds), `station` (LaunchStation), `archetype` (ShellArchetype), `color` (hex string), `duration` (seconds).
   - Currently, `ShowCue` is unreferenced in any implementation file across `src/`.

2. **Pre-existing M4 Definitions in `src/types/index.ts`**:
   - `AutoChoreographyDensity`: `'low' | 'medium' | 'high' | 'sparse' | 'balanced' | 'intense'` (line 180).
   - `AutoChoreographyOptions`: `density`, `palette`, `paletteTheme`, `bpm`, `includeGroundMines`, `includeSweeps`, `climaxSalvo` (lines 182-190).
   - `MacroBrushType`: `'sweep_left_to_right' | 'sweep_right_to_left' | 'sweep_center_out' | 'alternating_mines' | 'grand_finale_barrage'` (lines 192-198).
   - `AudioReactiveProfile`: lines 122-144.

### 1.3 Audio Engine & Synchronization Hook Points
In `src/engine/audio/AudioEngine.ts`:
- `loadAudio(source: string | File | AudioBuffer): Promise<void>` (lines 105-145)
- `loadDemoTrack(preset: ProceduralMusicPreset, durationSec?: number): void` (lines 150-160)
- `getCurrentTime(): number` (lines 271-284) — Sample-accurate timecode clock derived directly from `AudioContext.currentTime`. Drift < 15ms.
- `extractWaveformPeaks(numBuckets: number = 1000): WaveformPeaks` (lines 298-338) — Decimated min/max Float32Array envelopes.
- `detectTransients(threshold: number = 0.28): number[]` (lines 344-377) — Array of beat onset timestamps in seconds.
- `getAudioBuffer(): AudioBuffer | null` (lines 166-168)
- `addTimeUpdateListener(listener: (time: number) => void): () => void` (lines 459-462)
- `play()`, `pause()`, `seek(time: number)` (lines 181-264)

### 1.4 BroadcastBus & Projector Window Integration
In `src/state/BroadcastBus.ts` and `src/app/ProjectorWindow.tsx`:
- `bus.fireCue(cue: FireCuePayload)` transmits `FIRE_CUE` to pop-out window with zero latency.
- `bus.loadShow(show: ShowJSON)` transmits full show definitions.
- `bus.play(time)`, `bus.pause(time)`, `bus.seek(time)` synchronize transport.
- In `src/app/App.tsx:204-220`:
  `handleFireCue(cue: FireCuePayload)` sends the cue to `viewportRef.current.fireCue(cue)`, `busRef.current.fireCue(cue)`, and procedural SFX (`audioEngineRef.current.playProceduralSFX`).

### 1.5 Missing Target Files
The following files do NOT yet exist in `src/`:
- `src/state/ShowManager.ts`
- `src/state/Presets.ts`
- `src/choreography/AutoChoreographer.ts`
- `src/choreography/PatternBrushes.ts`
- `src/choreography/TapRecorder.ts`
- `src/components/timeline/TimelineStudio.tsx`
- `src/components/timeline/WaveformCanvas.tsx`
- `src/components/timeline/CueInspector.tsx`
- `src/components/timeline/MacroBrushesBar.tsx`

---

## 2. Logic Chain

### 2.1 Model Alignment: `ShowJSONCue` as the Native Timeline Cue Model
1. **Observation**: `ShowJSONCue` is used in `ShowSerialization.ts`, `demo-shows.ts`, `export-import.test.ts`, `cross-feature.test.ts`, and `real-world-scenarios.test.ts`. `FireCuePayload` shares `id`, `archetype`, `station`, `color`, `altitude`, `launchAngle`, `duration`.
2. **Inference**: If `ShowManager` stores cues conforming to `ShowJSONCue` (augmented with optional UI fields like `selected?: boolean`), zero serialization conversion is required during JSON import/export, and cue firing requires zero property mapping to `FireCuePayload`.
3. **Action**: `ShowCue` in `src/types/index.ts` should be updated/harmonized to be compatible with `ShowJSONCue` (e.g. `export interface TimelineCue extends ShowJSONCue { selected?: boolean; isMuted?: boolean; label?: string; }`).

### 2.2 `ShowManager` State Architecture & Scheduling Logic
1. **Observation**: `timeline-tracks.test.ts` asserts:
   - 6 tracks: `['left', 'left_center', 'center', 'right_center', 'right', 'fan']`.
   - Track Mute: suppresses cue firing on that station only.
   - Track Solo: soloing a track mutes all other tracks; multiple tracks can be soloed simultaneously; disabling solo restores previous track mute states.
2. **Observation**: `real-world-scenarios.test.ts` executes a 90-second pyromusical playback in discrete 100ms steps, requiring all cues whose `time <= currentPlayhead` to fire within the step without drift and without double-triggering.
3. **Inference**: `ShowManager` needs:
   - Internal state:
     - `show: ShowJSON` (title, duration, calibration, audioTrack, cues).
     - `tracks: Record<LaunchStation, { muted: boolean; soloed: boolean }>`.
     - `selectedCueIds: Set<string>`.
     - `history: ShowJSONCue[][]` (undo/redo stack).
     - `lastScheduledTime: number` and `firedCueIds: Set<string>`.
   - Scheduling method `evaluateCues(currentTime: number, onFire: (cue: ShowJSONCue) => void)`:
     - When time moves forward (`currentTime > lastScheduledTime`):
       - Identifies cues where `c.time > lastScheduledTime && c.time <= currentTime`.
       - Filters out cues where station is inactive:
         `isStationActive(station)`: if any track is soloed, station must be soloed; otherwise station must not be muted.
       - Dispatches `onFire(cue)` for active cues and marks them in `firedCueIds`.
     - When user seeks backward (`currentTime < lastScheduledTime`):
       - Resets `firedCueIds` for cues after `currentTime` and updates `lastScheduledTime = currentTime`.
   - Complete undo/redo management:
     - Push immutable snapshots of `show.cues` onto `undoStack` (depth limit 50).
     - Provide `undo()`, `redo()`, `canUndo()`, `canRedo()`.

### 2.3 `Presets.ts` Design
1. **Observation**: R5 requires 2 complete choreographed demo shows with audio, and 3 live audio-reactive profiles (`Club/EDM`, `Ambient`, `Percussive`).
2. **Observation**: `tests/fixtures/demo-shows.ts` and `tests/fixtures/audio-profiles.ts` already contain verified data structures (`DEMO_SHOW_1_ODE_TO_RADIANCE`, `DEMO_SHOW_2_NEON_HORIZON`, `AUDIO_REACTIVE_PROFILES`).
3. **Inference**: `src/state/Presets.ts` should define and export production-ready versions of:
   - `DEMO_SHOW_1_ODE_TO_RADIANCE: ShowJSON` (90s, 35 cues across 4 movements, 96 BPM cinematic orchestral).
   - `DEMO_SHOW_2_NEON_HORIZON: ShowJSON` (75s, 25 cues locked to 128 BPM grid, synthwave).
   - `AUDIO_REACTIVE_PROFILES: Record<'club_edm' | 'ambient' | 'percussive', AudioReactiveProfile>`.
   - Utility getters: `getDemoShow(id: string): ShowJSON | undefined`, `getAudioProfile(id: string): AudioReactiveProfile | undefined`.

### 2.4 `AutoChoreographer.ts` Design
1. **Observation**: `macro-brushes.test.ts:152-195` tests:
   - Analyzes audio downbeats and populates timeline matching beat grid.
   - Sub-bass energy drops map to `ground_mine` and `brocade_crown`.
   - High-energy treble peaks map to `crackle` and `strobe`.
   - Quantizes generated cues to musical subdivisions (e.g. 1/4 note).
   - Throws error if `audioBuffer` is null/empty: `Cannot auto-choreograph: No audio track loaded`.
2. **Inference**: `AutoChoreographer.generate(audioBuffer: AudioBuffer, options?: AutoChoreographyOptions): ShowJSONCue[]` should:
   - Check `if (!audioBuffer) throw new Error('Cannot auto-choreograph: No audio track loaded')`.
   - Run short-time energy flux analysis over audio buffer channel data.
   - Detect peaks and map to stations (`center` / `fan` on downbeats; `left`/`right`/`left_center`/`right_center` on rhythmic subdivisions).
   - Apply density thresholds ('sparse', 'balanced', 'intense') and palette themes.
   - Quantize timestamps to `(60 / bpm)` or detected tempo.

### 2.5 `PatternBrushes.ts` Design
1. **Observation**: `macro-brushes.test.ts:28-150` tests:
   - Fan Sweeps:
     - Left-to-Right: sequences `['left', 'left_center', 'center', 'right_center', 'right']` over duration (e.g. 0.05s intervals for 0.20s total sweep).
     - Right-to-Left: sequences `['right', 'right_center', 'center', 'left_center', 'left']`.
     - Center-Out: 3 waves: step 0: `['center']`, step 1: `['left_center', 'right_center']`, step 2: `['left', 'right']`.
     - Duration configurable within [0.25s, 2.0s].
     - Preserves specified archetype across all cues.
   - Alternating Mines:
     - Alternates outer flanks (`left`/`right`) and inner stations (`left_center`/`center`/`right_center`).
     - Interval syncs to 128 BPM quarter notes (`60 / 128` = ~0.46875s).
     - Enforces `ground_mine` archetype with low altitude (<= 0.6, e.g. 0.45).
     - Configurable burst count (4 to 32).
     - Alternating colors (e.g. cyan & magenta).
   - Grand Finale Barrage:
     - Crescendo over 3.0s to 10.0s (default 6.0s).
     - Staggers breaks with progressive altitude scaling (e.g. 0.70 -> 0.80 -> 0.90 -> 0.98).
     - Spans all 6 stations simultaneously for final salvo (`['left', 'left_center', 'center', 'right_center', 'right', 'fan']`).
     - Combines complementary archetypes (`brocade_crown`, `chrysanthemum`, `crackle`, `ground_mine`, `finale_barrage`).
2. **Inference**: `PatternBrushes` static class with dedicated generator functions:
   - `generateFanSweep(type, startTime, options)`
   - `generateAlternatingMines(startTime, options)`
   - `generateFinaleBarrage(startTime, options)`
   - `applyBrush(type, startTime, options)`

### 2.6 `TapRecorder.ts` Design
1. **Observation**: `hotkeys.test.ts:121-215` tests:
   - Keys `'1'` through `'6'` map to `left`, `left_center`, `center`, `right_center`, `right`, `fan`.
   - Keys `'7'`, `'8'`, `'9'` map to `ground_mine_salvo`, `crossette_fan`, `finale_break`.
   - Drops cue at exact current playhead timecode.
   - Works during active playback AND when paused.
   - **Input Field Focus Suppression**:
     Suppresses `'1'`–`'9'`, `'F'`, and `' '` (spacebar panic) when `document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable`.
2. **Inference**: `TapRecorder` class / hook:
   - Listens to `keydown` on `window`.
   - Validates event target.
   - Obtains timecode from `audioEngine.getCurrentTime()`.
   - Maps station or triggers quick macro burst.
   - Dispatches cue immediately to visual engine (`handleFireCue`) AND adds to `ShowManager`.

### 2.7 Timeline Studio UI Components Structure
1. `src/components/timeline/WaveformCanvas.tsx`:
   - Renders decimations via `audioEngine.extractWaveformPeaks(width)`.
   - Renders transient markers from `audioEngine.detectTransients()`.
   - Draws playhead cursor line.
   - Supports click/drag seeking: `onSeek(timeSec)`.
2. `src/components/timeline/CueInspector.tsx`:
   - Inspects selected cue from `ShowManager.getSelectedCues()`.
   - Validates hex colors: `/^#[0-9A-Fa-f]{6}$/`.
   - Clamps altitude: `[0.2, 1.0]`.
   - Clamps launchAngle: `[-45, 45]`.
   - Updates cue via `ShowManager.updateCue(id, patch)`.
3. `src/components/timeline/MacroBrushesBar.tsx`:
   - Buttons for Fan Sweep (L->R, R->L, Center-Out), Alternating Mines, Grand Finale.
   - Button for 1-Click Auto-Choreographer with density selector.
   - Calls `PatternBrushes` and appends cues to `ShowManager`.
4. `src/components/timeline/TimelineStudio.tsx`:
   - Hosts 6 track lanes (Left, Left-Center, Center, Right-Center, Right, Fan).
   - Track headers with Track Name, offset, Mute (`M`) button, Solo (`S`) button.
   - Horizontal time ruler with timecodes.
   - Cue blocks positioned by `left = cue.time * zoom`. Click to select, drag to reposition.
   - Transport controls, Zoom controls (+/-), Undo/Redo (`Ctrl+Z`/`Ctrl+Y`).
   - Integrated with `App.tsx` layout as the bottom studio workstation.

---

## 3. Detailed Architectural Blueprint for M4 Modules

### Module 1: `src/state/ShowManager.ts`
```typescript
import { ShowJSON, ShowJSONCue, LaunchStation, ShellArchetype, ParticleEngineConfig } from '../types';
import { ShowSerialization, DEFAULT_CALIBRATION } from './ShowSerialization';

export interface TrackState {
  id: LaunchStation;
  label: string;
  offset: string;
  muted: boolean;
  soloed: boolean;
}

export const TIMELINE_TRACKS: Array<{ id: LaunchStation; label: string; offset: string }> = [
  { id: 'left', label: 'Left Flank', offset: '-22m (-0.80)' },
  { id: 'left_center', label: 'Left Center', offset: '-11m (-0.40)' },
  { id: 'center', label: 'Center Main', offset: '0m (0.00)' },
  { id: 'right_center', label: 'Right Center', offset: '+11m (+0.40)' },
  { id: 'right', label: 'Right Flank', offset: '+22m (+0.80)' },
  { id: 'fan', label: 'Fan Array', offset: 'Wide Span' },
];

export class ShowManager {
  private show: ShowJSON;
  private tracks: Map<LaunchStation, TrackState>;
  private priorMutesBeforeSolo: Map<LaunchStation, boolean> = new Map();
  private selectedCueIds: Set<string> = new Set();
  
  // Playhead & Cue Scheduling
  private lastEvaluatedTime: number = 0;
  private firedCueIds: Set<string> = new Set();

  // Undo / Redo history
  private undoStack: ShowJSONCue[][] = [];
  private redoStack: ShowJSONCue[][] = [];
  private maxHistoryDepth: number = 50;

  // Listeners
  private listeners: Set<() => void> = new Set();

  constructor(initialShow?: ShowJSON) {
    this.tracks = new Map();
    TIMELINE_TRACKS.forEach((t) => {
      this.tracks.set(t.id, { ...t, muted: false, soloed: false });
    });

    this.show = initialShow ? ShowSerialization.sanitizeShowJSON(initialShow) : {
      version: '1.0.0',
      title: 'Untitled Show',
      duration: 90.0,
      calibration: { ...DEFAULT_CALIBRATION },
      cues: [],
    };
  }

  // State queries
  public getShow(): ShowJSON;
  public getCues(): ShowJSONCue[];
  public getDuration(): number;
  public getTracks(): TrackState[];
  public isStationActive(station: LaunchStation): boolean;
  
  // Track Controls (Mute / Solo)
  public toggleTrackMute(station: LaunchStation): void;
  public setTrackMute(station: LaunchStation, muted: boolean): void;
  public toggleTrackSolo(station: LaunchStation): void;
  public setTrackSolo(station: LaunchStation, soloed: boolean): void;
  
  // Selection
  public selectCue(id: string, multiSelect?: boolean): void;
  public deselectAll(): void;
  public getSelectedCueIds(): string[];
  public getSelectedCues(): ShowJSONCue[];
  public getPrimarySelectedCue(): ShowJSONCue | null;
  
  // Cue CRUD with Undo
  public addCue(cue: Omit<ShowJSONCue, 'id'> & { id?: string }): ShowJSONCue;
  public addCues(cues: Array<Omit<ShowJSONCue, 'id'> & { id?: string }>): ShowJSONCue[];
  public updateCue(id: string, patch: Partial<ShowJSONCue>): void;
  public removeCue(id: string): void;
  public removeSelectedCues(): void;
  public clearAllCues(): void;
  
  // Scheduling during playback
  public scheduleCues(currentTime: number, onFire: (cue: ShowJSONCue) => void): void;
  public handleSeek(targetTime: number): void;
  public resetScheduler(): void;
  
  // History
  public undo(): boolean;
  public redo(): boolean;
  public canUndo(): boolean;
  public canRedo(): boolean;
  
  // Show Loading & Serialization
  public loadShow(show: ShowJSON): void;
  public exportShow(): ShowJSON;
  
  // Subscriptions
  public subscribe(listener: () => void): () => void;
  private notify(): void;
}
```

### Module 2: `src/state/Presets.ts`
```typescript
import { ShowJSON, AudioReactiveProfile } from '../types';

export const DEMO_SHOW_1_ODE_TO_RADIANCE: ShowJSON = {
  version: '1.0.0',
  title: 'Ode to Radiance',
  duration: 90.0,
  audioTrack: {
    name: 'Ode to Radiance (Cinematic Orchestral)',
    proceduralPreset: 'cosmic_awakening',
  },
  calibration: {
    maxParticles: 65536,
    blackClamp: 0.02,
    gain: 1.0,
    bloomIntensity: 1.2,
    particleSizeScale: 1.0,
    aspectRatioMask: '16:9',
  },
  cues: [
    // 35 cues spanning 4 movements (0s-25s, 25s-50s, 50s-75s, 75s-90s)
  ],
};

export const DEMO_SHOW_2_NEON_HORIZON: ShowJSON = {
  version: '1.0.0',
  title: 'Neon Horizon',
  duration: 75.0,
  audioTrack: {
    name: 'Neon Horizon (128 BPM Synthwave)',
    proceduralPreset: 'neon_horizon',
  },
  calibration: {
    maxParticles: 65536,
    blackClamp: 0.03,
    gain: 1.2,
    bloomIntensity: 1.5,
    particleSizeScale: 1.1,
    aspectRatioMask: '21:9',
  },
  cues: [
    // 25+ cues locked to 128 BPM grid
  ],
};

export const AUDIO_REACTIVE_PROFILES: Record<'club_edm' | 'ambient' | 'percussive', AudioReactiveProfile> = {
  // club_edm, ambient, percussive definitions
};

export function getDemoShow(id: string): ShowJSON | undefined;
export function getAudioProfile(id: string): AudioReactiveProfile | undefined;
```

### Module 3: `src/choreography/AutoChoreographer.ts`
```typescript
import { ShowJSONCue, AutoChoreographyOptions, ShellArchetype, LaunchStation } from '../types';

export class AutoChoreographer {
  public static generate(
    audioBuffer: AudioBuffer | null,
    options?: AutoChoreographyOptions
  ): ShowJSONCue[] {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Cannot auto-choreograph: No audio track loaded');
    }

    const density = options?.density || 'balanced';
    const bpm = options?.bpm || 120;
    const gridStep = 60 / bpm; // Beat spacing in seconds
    
    // 1. Analyze channel data energy & transient flux
    // 2. Identify transient onset timestamps
    // 3. Map sub-bass drops -> ground_mine (outer/center) & brocade_crown
    // 4. Map treble peaks -> crackle & strobe (fan)
    // 5. Map rhythmic beats -> peony, chrysanthemum, rings
    // 6. Quantize timecodes to musical grid
    // 7. Apply color palettes according to paletteTheme
    // 8. Return sorted ShowJSONCue[]
  }
}
```

### Module 4: `src/choreography/PatternBrushes.ts`
```typescript
import { ShowJSONCue, MacroBrushType, ShellArchetype, LaunchStation } from '../types';

export interface MacroBrushOptions {
  archetype?: ShellArchetype;
  color?: string;
  colors?: string[];
  altitude?: number;
  duration?: number;
  burstCount?: number;
  bpm?: number;
}

export class PatternBrushes {
  public static generateFanSweep(
    type: 'left_to_right' | 'right_to_left' | 'center_out',
    startTime: number,
    options?: MacroBrushOptions
  ): ShowJSONCue[];

  public static generateAlternatingMines(
    startTime: number,
    options?: MacroBrushOptions
  ): ShowJSONCue[];

  public static generateFinaleBarrage(
    startTime: number,
    options?: MacroBrushOptions
  ): ShowJSONCue[];

  public static applyBrush(
    type: MacroBrushType,
    startTime: number,
    options?: MacroBrushOptions
  ): ShowJSONCue[];
}
```

### Module 5: `src/choreography/TapRecorder.ts`
```typescript
import { ShowJSONCue, LaunchStation, ShellArchetype } from '../types';

export interface TapRecorderOptions {
  getTime: () => number;
  onRecordCue: (cue: ShowJSONCue) => void;
  defaultArchetype?: ShellArchetype;
  defaultColor?: string;
  defaultAltitude?: number;
}

export class TapRecorder {
  // Binds keyboard event listeners
  // Intercepts '1'-'9'
  // Enforces input field focus suppression:
  // (ignores when focused on INPUT, TEXTAREA, or isContentEditable)
  // Drops cue locked to getTime()
}
```

### Module 6: UI Components in `src/components/timeline/`
1. `TimelineStudio.tsx`: Master multi-track timeline component with 6 track lanes (`left`, `left_center`, `center`, `right_center`, `right`, `fan`), track mute/solo toggles, ruler, zoom, transport, and cue blocks.
2. `WaveformCanvas.tsx`: Offscreen or direct canvas rendering peaks and transient markers.
3. `CueInspector.tsx`: Editing panel for archetype, altitude, hex color, launch angle, duration.
4. `MacroBrushesBar.tsx`: Rapid action bar for fan sweeps, alternating mines, finale barrage, and 1-click auto-choreographer.

---

## 4. Caveats
1. **No Source Code Modified**: As an explorer subagent, no files in `src/` were edited during this analysis turn.
2. **Existing TypeScript Error**: `src/state/ShowSerialization.ts(171,12)` must be patched by the implementer agent (`a: ShowJSONCue, b: ShowJSONCue`) to allow `npm run build` to pass cleanly.
3. **AudioContext Autoplay Policy**: During testing in Node.js headless environments, `MockAudioContext` is utilized. In browser runtime, `AudioEngine.initContext` must handle user gesture resumption (`ctx.resume()`).

---

## 5. Conclusion & Implementation Plan

The architecture of PyroSync is sound, clean, and ready for Milestone 4 construction.
- All core engine subsystems (WebGL typed array particles, procedural audio, BroadcastChannel IPC, and Show JSON serialization) are established and verified by 260/260 passing tests.
- Implementing Milestone 4 consists of:
  1. Quick one-line fix in `src/state/ShowSerialization.ts:171` to satisfy TypeScript strict mode.
  2. Harmonizing `src/types/index.ts` with `TimelineCue` / `TimelineTrack` / `MacroBrushOptions`.
  3. Implementing `src/state/ShowManager.ts` (observable timeline state, cue scheduling, track mute/solo, undo/redo).
  4. Implementing `src/state/Presets.ts` (pre-configured demo shows 1 & 2, 3 audio-reactive profiles).
  5. Implementing `src/choreography/AutoChoreographer.ts` (1-click spectral analysis and cue generation).
  6. Implementing `src/choreography/PatternBrushes.ts` (fan sweeps, alternating mines, finale barrage).
  7. Implementing `src/choreography/TapRecorder.ts` (keys 1-9 timecoded recording with focus suppression).
  8. Implementing `src/components/timeline/` (`TimelineStudio.tsx`, `WaveformCanvas.tsx`, `CueInspector.tsx`, `MacroBrushesBar.tsx`).
  9. Integrating `TimelineStudio` into `src/app/App.tsx`.

---

## 6. Verification Method

To independently verify after implementation:

1. **TypeScript Build & Lint Check**:
   ```bash
   npm run build
   ```
   *Expected result*: Exits with code 0; zero TypeScript compilation or bundler errors.

2. **Full E2E Test Suite**:
   ```bash
   npm test
   ```
   *Expected result*: All 260 tests across 10 modules pass cleanly with 0 failures.

3. **Specific Feature Verification**:
   - `tests/tier1-features/timeline-tracks.test.ts` (6 spatial tracks, mute/solo behavior, cue inspector parameters)
   - `tests/tier1-features/macro-brushes.test.ts` (fan sweeps, alternating mines, grand finale barrage, auto-choreographer)
   - `tests/tier1-features/hotkeys.test.ts` (keys 1-9 tap recording, focus suppression, F fullscreen, Esc blackout)
   - `tests/tier1-features/export-import.test.ts` (Show JSON export and import round-trip fidelity)
   - `tests/tier4-scenarios/real-world-scenarios.test.ts` (90s full playback scenario with 0 drift)
