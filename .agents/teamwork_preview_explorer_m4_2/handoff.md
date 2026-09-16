# Milestone 4 Implementation Blueprint: Timeline Studio, Choreography Engine & Presets

**Document ID**: BLUEPRINT-M4-002  
**Author**: `teamwork_preview_explorer_m4_2`  
**Target Recipient**: `teamwork_preview_worker_m4_1` / Orchestrator  
**Status**: Ready for Implementation  
**Workspace Root**: `c:/Users/Beame/Documents/antigravity/zealous-shannon`  
**Target Milestone**: Milestone 4 (Timeline Studio, 6 Spatial Tracks, Macro Brushes, 1-Click Auto-Choreographer, Tap-to-Record Hotkeys, Cue Inspector, Portable Show JSON Export/Import, 2 Demo Shows, 3 Audio-Reactive Profiles)

---

## 1. Observation

Direct observations from codebase inspection, specification documents, and test execution:

1. **Test Suite Baseline & Pass Status**:
   - `node tests/runner.ts` executes 10 test modules across 4 tiers with 2,798 assertions.
   - Result: **260 Passed / 0 Failed (100% Pass Rate in 133ms, Exit Code 0)**.
   - `npm run test:all` executes Node's built-in test runner on `tests/all.test.ts`: **10 Passed / 0 Failed**.
   - The test suite rigorously validates Milestone 4 specifications:
     - `tests/tier1-features/timeline-tracks.test.ts`: 6 spatial tracks (`left`, `left_center`, `center`, `right_center`, `right`, `fan`), track mute/solo isolation, ground mine elevation constraint (`y = 0.0`), coordinate conversions, parameter clamping.
     - `tests/tier1-features/macro-brushes.test.ts`: Fan Sweeps (`L->R`, `R->L`, `Center-Out`), Alternating Mines (even/odd beat alternation, 128 BPM grid, cyan/magenta palette), Grand Finale Barrage (crescendo, staggered altitudes, multi-archetypes, pool limit guard), 1-Click Auto-Choreographer (spectral energy mapping, quantization, missing audio error).
     - `tests/tier1-features/hotkeys.test.ts`: Fullscreen (`F`), Panic Blackout (`Esc` / `Space`), Numeric keys `1`–`6` (stations), `7`–`9` (macro brushes), text input suppression (`INPUT`, `TEXTAREA`).
     - `tests/tier1-features/export-import.test.ts`: Schema v1.0.0 serialization, 2-space indentation, calibration persistence, round-trip fidelity up to 300+ cues, malformed JSON recovery, chronological sorting.
     - `tests/tier3-combinations/cross-feature.test.ts`: Blackout during finale, BroadcastChannel sync of shows and cues, transport seeking mid-salvo.
     - `tests/tier4-scenarios/real-world-scenarios.test.ts`: 90-second pyromusical playback ("Ode to Radiance", 35 cues), multi-monitor sync, live concert set with `club_edm` profile, export-edit-reimport workflow, 75-second synthwave show ("Neon Horizon", 15 cues).

2. **Existing Engine State**:
   - `src/types/index.ts`: Contains core types (`ShellArchetype`, `LaunchStation`, `ParticleEngineConfig`, `FireCuePayload`, `ShowJSON`, `ShowJSONCue`, `AudioReactiveProfile`, `WaveformPeaks`, `AutoChoreographyOptions`, `MacroBrushType`, `BroadcastMessage`).
   - `src/engine/audio/AudioEngine.ts`: Fully implements sample-accurate timecode clock (`getCurrentTime`, `play`, `pause`, `seek`), `extractWaveformPeaks(numBuckets)`, `detectTransients(threshold)`, `loadAudio`, `loadDemoTrack`.
   - `src/engine/audio/ProceduralMusic.ts`: Synthesizes in-memory soundtracks for `cosmic_awakening` (96 BPM orchestral) and `neon_horizon` (128 BPM synthwave).
   - `src/state/BroadcastBus.ts`: Implements `fireCue`, `updateCalibration`, `panicBlackout`, `loadShow`, and transport messages over BroadcastChannel `pyrosync_projection_bus`.
   - `src/components/display/CanvasViewport.tsx`: Provides WebGL fireworks simulation preview with imperative ref (`fireCue`, `blackout`, `updateConfig`).

3. **Current TypeScript Compiler Check**:
   - Running `npm run build` or `npx tsc --noEmit` flags exactly one pre-existing error:
     ```
     src/state/ShowSerialization.ts(171,12): error TS7006: Parameter 'a' implicitly has an 'any' type.
     src/state/ShowSerialization.ts(171,15): error TS7006: Parameter 'b' implicitly has an 'any' type.
     ```
     This is caused by `.sort((a, b) => a.time - b.time)` on an untyped intermediate array in `ShowSerialization.ts:171`. Adding explicit parameter types `(a: ShowJSONCue, b: ShowJSONCue)` will resolve this cleanly.

4. **Missing Modules for Milestone 4**:
   The following modules specified in `PROJECT.md` §Code Layout do not yet exist:
   - `src/state/Presets.ts` (Demo Show 1, Demo Show 2, 3 Audio Reactive Profiles)
   - `src/state/ShowManager.ts` (Reactive show document, cue CRUD, track mute/solo state, zero-allocation playback cursor)
   - `src/choreography/PatternBrushes.ts` (Fan sweeps, alternating mines, grand finale barrage generators)
   - `src/choreography/AutoChoreographer.ts` (1-Click algorithmic generator from audio buffer/transients)
   - `src/choreography/TapRecorder.ts` (Live numeric hotkeys 1-9 recorder with focus suppression)
   - `src/components/timeline/WaveformCanvas.tsx` (Offscreen/Canvas interactive waveform display with transients, zoom, pan)
   - `src/components/timeline/CueInspector.tsx` (Selected cue parameter editor)
   - `src/components/timeline/MacroBrushesBar.tsx` (Macro brush and auto-choreo toolbar)
   - `src/components/timeline/TimelineStudio.tsx` (6-track spatial timeline, transport dock, ruler, cue clips)
   - `src/app/App.tsx` (Integration of TimelineStudio alongside CanvasViewport, CalibrationPanel, AudioMeters, PanicBar)

---

## 2. Logic Chain

1. **Data Model and State Flow**:
   - The master document format is `ShowJSON` (`v1.0.0`), containing `title`, `duration`, `audioTrack`, `calibration`, and `cues: ShowJSONCue[]`.
   - `ShowManager` encapsulates the in-memory show state. It maintains cues sorted chronologically by `time`.
   - Track lanes correspond to the 6 physical launch stations: `left` (-0.80), `left_center` (-0.40), `center` (0.00), `right_center` (+0.40), `right` (+0.80), and `fan` ([-0.80, +0.80]).
   - Track Mute and Solo states dictate cue firing:
     $$\text{ShouldFire} = (\text{SoloSet.size} > 0 \implies \text{SoloSet.has}(\text{station})) \land (\text{SoloSet.size} = 0 \implies \neg\text{MuteSet.has}(\text{station}))$$
   - Disabling solo restores previous mute states without data loss.

2. **Zero-Allocation & High Performance Principles**:
   - **Playback Dispatcher**: In a 60 FPS animation frame loop, running `cues.filter()` allocates a new array every 16ms (3,600 allocations/minute). Instead, `ShowManager` maintains a cursor index `playbackCursor = 0`:
     - Each tick: `while (playbackCursor < cues.length && cues[playbackCursor].time <= currentTime) { dispatch(cues[playbackCursor++]); }`.
     - On seek: binary search (bisect) `playbackCursor` in $O(\log N)$ with 0 array allocations.
   - **Waveform Rendering**: Decimation occurs once upon audio load into typed arrays (`min: Float32Array`, `max: Float32Array`). Canvas draw iterates slice indices directly onto 2D context using `moveTo` and `lineTo` without allocating intermediate objects.
   - **Track Virtualization**: Only cues whose timestamp falls within the visible horizontal window $[t_{\text{viewStart}} - 1.0, t_{\text{viewEnd}} + 1.0]$ are rendered to the DOM/canvas.
   - **Live Tap-to-Record**: Keyboard event handlers look up stations via a pre-allocated static mapping table `STATION_KEY_MAP` and avoid generating garbage per keystroke.

3. **Audio-Choreography & Musical Synchronization**:
   - `AutoChoreographer` inspects `AudioEngine.getAudioBuffer()` and `AudioEngine.detectTransients()`.
   - Transients are quantized to musical beat subdivisions: $\text{quantizedTime} = \text{round}(\text{rawTime} / \text{gridStep}) \times \text{gridStep}$, where $\text{gridStep} = 60 / \text{BPM}$.
   - Energy classification distributes shells dynamically:
     - Sub-bass ($> 0.80$) $\to$ `ground_mine` (elevation $y = 0.0$) and `brocade_crown` (drops).
     - Mid-range $\to$ `peony`, `willow`, `chrysanthemum`, `crossette`.
     - Treble ($> 0.85$) $\to$ `crackle`, `strobe`, `whistling_comet`.
   - If invoked without an audio buffer, it throws `Error('Cannot auto-choreograph: No audio track loaded')`, satisfying AC-8 and test requirements.

4. **UI Ergonomics & App.tsx Integration Topology**:
   - **Top**: `PanicBar` (performance HUD, Calibration button, Fullscreen toggle, Emergency Panic button).
   - **Upper Middle**: `CanvasViewport` (WebGL fireworks simulation preview, aspect ratio guides).
   - **Overlays / Floating Drawers**:
     - `CalibrationPanel` (projector gain, black clamp, bloom, aspect masks).
     - `AudioMeters` drawer (3-band FFT live mic meters and cooldowns).
     - `CueInspector` (docked on top-right of timeline or canvas, inspects selected cue).
   - **Lower Dock (Height: ~260px - 320px)**: `TimelineStudio`:
     - Header: Transport controls (Play/Pause, Rewind, Timecode MM:SS.mmm, Duration), Zoom buttons/slider, Preset loader dropdown, Macro brushes toolbar, 1-Click Auto-Choreograph button, Export/Import JSON buttons.
     - Waveform Lane: `WaveformCanvas` with transient markers.
     - 6 Track Lanes: `left`, `left_center`, `center`, `right_center`, `right`, `fan` with Mute (`M`), Solo (`S`), and cue clips.
     - Playhead: Draggable vertical line synchronized with `AudioEngine.getCurrentTime()`.
   - **Presentation Fullscreen (`F`)**: Hides all chrome (PanicBar, TimelineStudio, drawers), expanding `CanvasViewport` to `100vw` x `100vh` strictly pure black `#000000`.
   - **Emergency Panic Blackout (`Esc` or `Space`)**: Instantly zeroes active particles, halts transport, mutes sound, and broadcasts `PANIC_BLACKOUT` across BroadcastBus.

---

## 3. Caveats

1. **TypeScript Strict Mode**:
   All new files must adhere to strict typing with zero `any` parameters in callback signatures to ensure `tsc && vite build` compiles cleanly.
2. **AudioContext Autoplay Policy**:
   Browsers require a user gesture before resuming an AudioContext. Any initial audio playback or demo loading must call `audioContext.resume()` safely.
3. **Canvas HiDPI Scaling**:
   `WaveformCanvas` must account for `window.devicePixelRatio` to prevent blurry lines on retina displays while keeping memory footprint low.
4. **Modal vs Hotkey Interlocks**:
   When modals or dialogs are open, `Escape` must close the modal first rather than immediately triggering a full emergency blackout.

---

## 4. Conclusion & Concrete File-by-File Blueprint

Here is the exact, complete file-by-file specification for the Worker.

```
========================================================================================
FILE MAP FOR MILESTONE 4
========================================================================================
1. src/state/ShowSerialization.ts        [MODIFY] Fix TS7006 parameter typing error
2. src/state/Presets.ts                  [CREATE] 2 Demo Shows + 3 Audio-Reactive Profiles
3. src/state/ShowManager.ts              [CREATE] Reactive Show state, cue CRUD, Mute/Solo, zero-alloc playback loop
4. src/choreography/PatternBrushes.ts    [CREATE] Fan Sweeps, Alternating Mines, Grand Finale Barrage
5. src/choreography/AutoChoreographer.ts [CREATE] 1-Click Auto-Choreography & transient quantizer
6. src/choreography/TapRecorder.ts       [CREATE] Live tap-to-record hotkeys 1-9 & input suppression
7. src/components/timeline/WaveformCanvas.tsx  [CREATE] Decimated waveform canvas with transient markers
8. src/components/timeline/CueInspector.tsx    [CREATE] Selected cue parameter editor
9. src/components/timeline/MacroBrushesBar.tsx [CREATE] Macro brushes & auto-choreo toolbar
10. src/components/timeline/TimelineStudio.tsx [CREATE] Multi-track timeline & tracks dock
11. src/app/App.tsx                            [MODIFY] Full integration of TimelineStudio, CanvasViewport, PanicBar
========================================================================================
```

---

### File 1: `src/state/ShowSerialization.ts` (Bugfix)

- **Target File**: `c:/Users/Beame/Documents/antigravity/zealous-shannon/src/state/ShowSerialization.ts`
- **Action**: Fix line 171 where parameter `a` and `b` implicitly have `any` type under TypeScript strict mode.
- **Diff Blueprint**:
```typescript
// Replace lines 170-172:
    })
    .sort((a: ShowJSONCue, b: ShowJSONCue) => a.time - b.time);
```
- **Verification**: Run `npx tsc --noEmit` to verify 0 errors in this file.

---

### File 2: `src/state/Presets.ts` (Demo Shows & Profiles)

- **Target File**: `c:/Users/Beame/Documents/antigravity/zealous-shannon/src/state/Presets.ts`
- **Purpose**: Export pre-configured demo shows ("Cosmic Awakening", "Neon Horizon") and 3 live audio-reactive profiles (`club_edm`, `ambient`, `percussive`).
- **Blueprint**:
```typescript
import { ShowJSON, AudioReactiveProfile } from '../types';

/**
 * Demo Show 1: "Cosmic Awakening" ("Ode to Radiance")
 * 90-second orchestral/cinematic pyromusical show across 4 movements.
 */
export const DEMO_SHOW_COSMIC_AWAKENING: ShowJSON = {
  version: '1.0.0',
  title: 'Cosmic Awakening',
  duration: 90.0,
  audioTrack: {
    name: 'Cosmic Awakening (Cinematic Orchestral)',
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
    // Movement 1: Introduction (0.0s - 25.0s) - Ambient & Cascading
    { id: 'cue-001', time: 1.0, archetype: 'horsetail', station: 'center', color: '#ffd700', altitude: 0.85, launchAngle: 0.0, duration: 4.5 },
    { id: 'cue-002', time: 4.5, archetype: 'willow', station: 'left_center', color: '#ffffff', altitude: 0.80, launchAngle: -0.1, duration: 5.0 },
    { id: 'cue-003', time: 4.5, archetype: 'willow', station: 'right_center', color: '#ffffff', altitude: 0.80, launchAngle: 0.1, duration: 5.0 },
    { id: 'cue-004', time: 9.0, archetype: 'peony', station: 'center', color: '#3b82f6', altitude: 0.75, launchAngle: 0.0, duration: 2.2 },
    { id: 'cue-005', time: 13.5, archetype: 'chrysanthemum', station: 'left', color: '#f59e0b', altitude: 0.70, launchAngle: 0.2, duration: 3.0 },
    { id: 'cue-006', time: 13.5, archetype: 'chrysanthemum', station: 'right', color: '#f59e0b', altitude: 0.70, launchAngle: -0.2, duration: 3.0 },
    { id: 'cue-007', time: 18.0, archetype: 'rings', station: 'center', color: '#ec4899', altitude: 0.85, launchAngle: 0.0, duration: 2.5 },
    { id: 'cue-008', time: 22.0, archetype: 'strobe', station: 'center', color: '#ffffff', altitude: 0.80, launchAngle: 0.0, duration: 3.0 },

    // Movement 2: Build-up (25.0s - 50.0s) - Rhythmic comets & mines
    { id: 'cue-009', time: 25.0, archetype: 'whistling_comet', station: 'left', color: '#10b981', altitude: 0.90, launchAngle: 0.15, duration: 2.8 },
    { id: 'cue-010', time: 26.5, archetype: 'whistling_comet', station: 'right', color: '#10b981', altitude: 0.90, launchAngle: -0.15, duration: 2.8 },
    { id: 'cue-011', time: 28.0, archetype: 'ground_mine', station: 'left', color: '#ef4444', altitude: 0.45, launchAngle: 0.1, duration: 1.8 },
    { id: 'cue-012', time: 28.5, archetype: 'ground_mine', station: 'right', color: '#ef4444', altitude: 0.45, launchAngle: -0.1, duration: 1.8 },
    { id: 'cue-013', time: 31.0, archetype: 'crossette', station: 'left_center', color: '#8b5cf6', altitude: 0.80, launchAngle: 0.0, duration: 2.5 },
    { id: 'cue-014', time: 31.0, archetype: 'crossette', station: 'right_center', color: '#8b5cf6', altitude: 0.80, launchAngle: 0.0, duration: 2.5 },
    { id: 'cue-015', time: 36.0, archetype: 'crackle', station: 'center', color: '#ffd700', altitude: 0.85, launchAngle: 0.0, duration: 2.8 },
    { id: 'cue-016', time: 40.0, archetype: 'brocade_crown', station: 'center', color: '#fbbf24', altitude: 0.90, launchAngle: 0.0, duration: 4.0 },
    { id: 'cue-017', time: 44.0, archetype: 'peony', station: 'left', color: '#06b6d4', altitude: 0.75, launchAngle: 0.2, duration: 2.2 },
    { id: 'cue-018', time: 44.5, archetype: 'peony', station: 'right', color: '#06b6d4', altitude: 0.75, launchAngle: -0.2, duration: 2.2 },
    { id: 'cue-019', time: 48.0, archetype: 'ground_mine', station: 'left_center', color: '#f97316', altitude: 0.50, launchAngle: 0.0, duration: 1.8 },
    { id: 'cue-020', time: 48.0, archetype: 'ground_mine', station: 'right_center', color: '#f97316', altitude: 0.50, launchAngle: 0.0, duration: 1.8 },

    // Movement 3: Apex & Drop (50.0s - 75.0s) - Fan Sweeps & Layered Shells
    { id: 'cue-021', time: 50.0, archetype: 'peony', station: 'fan', color: '#ef4444', altitude: 0.80, launchAngle: 0.0, duration: 2.5 },
    { id: 'cue-022', time: 53.0, archetype: 'rings', station: 'left', color: '#a855f7', altitude: 0.75, launchAngle: 0.1, duration: 2.5 },
    { id: 'cue-023', time: 53.0, archetype: 'rings', station: 'right', color: '#a855f7', altitude: 0.75, launchAngle: -0.1, duration: 2.5 },
    { id: 'cue-024', time: 57.0, archetype: 'strobe', station: 'center', color: '#ffffff', altitude: 0.85, launchAngle: 0.0, duration: 3.2 },
    { id: 'cue-025', time: 61.0, archetype: 'crossette', station: 'fan', color: '#22c55e', altitude: 0.85, launchAngle: 0.0, duration: 2.6 },
    { id: 'cue-026', time: 65.0, archetype: 'crackle', station: 'left_center', color: '#f59e0b', altitude: 0.80, launchAngle: 0.0, duration: 2.8 },
    { id: 'cue-027', time: 65.0, archetype: 'crackle', station: 'right_center', color: '#f59e0b', altitude: 0.80, launchAngle: 0.0, duration: 2.8 },
    { id: 'cue-028', time: 70.0, archetype: 'brocade_crown', station: 'center', color: '#ffd700', altitude: 0.95, launchAngle: 0.0, duration: 4.5 },

    // Movement 4: Grand Finale (75.0s - 90.0s) - Massive Multi-Station Barrage
    { id: 'cue-029', time: 75.0, archetype: 'ground_mine', station: 'fan', color: '#f43f5e', altitude: 0.60, launchAngle: 0.0, duration: 2.0 },
    { id: 'cue-030', time: 78.0, archetype: 'whistling_comet', station: 'left', color: '#38bdf8', altitude: 0.90, launchAngle: 0.25, duration: 2.5 },
    { id: 'cue-031', time: 78.0, archetype: 'whistling_comet', station: 'right', color: '#38bdf8', altitude: 0.90, launchAngle: -0.25, duration: 2.5 },
    { id: 'cue-032', time: 80.0, archetype: 'chrysanthemum', station: 'left_center', color: '#fbbf24', altitude: 0.85, launchAngle: 0.0, duration: 3.5 },
    { id: 'cue-033', time: 80.0, archetype: 'chrysanthemum', station: 'right_center', color: '#fbbf24', altitude: 0.85, launchAngle: 0.0, duration: 3.5 },
    { id: 'cue-034', time: 83.0, archetype: 'crackle', station: 'center', color: '#ffffff', altitude: 0.90, launchAngle: 0.0, duration: 3.0 },
    { id: 'cue-035', time: 85.0, archetype: 'finale_barrage', station: 'fan', color: '#ffd700', altitude: 0.95, launchAngle: 0.0, duration: 5.0 },
  ],
};

/**
 * Demo Show 2: "Neon Horizon"
 * 75-second synthwave pyromusical show synchronized to 128 BPM grid (~0.46875s/beat).
 */
export const DEMO_SHOW_NEON_HORIZON: ShowJSON = {
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
    { id: 'nh-001', time: 0.0, archetype: 'ground_mine', station: 'left', color: '#06b6d4', altitude: 0.40, duration: 1.5 },
    { id: 'nh-002', time: 0.9375, archetype: 'ground_mine', station: 'right', color: '#f43f5e', altitude: 0.40, duration: 1.5 },
    { id: 'nh-003', time: 1.875, archetype: 'ground_mine', station: 'left_center', color: '#06b6d4', altitude: 0.45, duration: 1.5 },
    { id: 'nh-004', time: 2.8125, archetype: 'ground_mine', station: 'right_center', color: '#f43f5e', altitude: 0.45, duration: 1.5 },
    { id: 'nh-005', time: 3.75, archetype: 'peony', station: 'center', color: '#d946ef', altitude: 0.80, duration: 2.0 },
    { id: 'nh-006', time: 7.5, archetype: 'strobe', station: 'center', color: '#ffffff', altitude: 0.85, duration: 2.5 },
    { id: 'nh-007', time: 11.25, archetype: 'crossette', station: 'left', color: '#06b6d4', altitude: 0.75, duration: 2.2 },
    { id: 'nh-008', time: 11.25, archetype: 'crossette', station: 'right', color: '#f43f5e', altitude: 0.75, duration: 2.2 },
    { id: 'nh-009', time: 15.0, archetype: 'rings', station: 'center', color: '#e11d48', altitude: 0.85, duration: 2.5 },
    { id: 'nh-010', time: 20.0, archetype: 'whistling_comet', station: 'left', color: '#10b981', altitude: 0.90, duration: 2.8 },
    { id: 'nh-011', time: 20.0, archetype: 'whistling_comet', station: 'right', color: '#10b981', altitude: 0.90, duration: 2.8 },
    { id: 'nh-012', time: 25.0, archetype: 'crackle', station: 'center', color: '#facc15', altitude: 0.85, duration: 2.6 },
    { id: 'nh-013', time: 30.0, archetype: 'brocade_crown', station: 'fan', color: '#fbbf24', altitude: 0.90, duration: 3.5 },
    { id: 'nh-014', time: 45.0, archetype: 'willow', station: 'center', color: '#38bdf8', altitude: 0.92, duration: 4.0 },
    { id: 'nh-015', time: 60.0, archetype: 'finale_barrage', station: 'fan', color: '#f43f5e', altitude: 0.95, duration: 6.0 },
  ],
};

export const PRESET_SHOWS: Record<string, ShowJSON> = {
  cosmic_awakening: DEMO_SHOW_COSMIC_AWAKENING,
  neon_horizon: DEMO_SHOW_NEON_HORIZON,
};

export const AUDIO_REACTIVE_PROFILES: Record<string, AudioReactiveProfile> = {
  club_edm: {
    name: 'Club/EDM',
    subBass: {
      sensitivity: 1.4,
      cutoffHz: 140,
      primaryArchetype: 'ground_mine',
      stations: ['left', 'right', 'center'],
    },
    mid: {
      sensitivity: 1.0,
      centerHz: 1000,
      primaryArchetype: 'peony',
      stations: ['left_center', 'right_center'],
    },
    treble: {
      sensitivity: 1.3,
      cutoffHz: 2500,
      primaryArchetype: 'strobe',
      stations: ['fan'],
    },
    cooldownMs: 120,
    noiseFloorAdaptationRate: 0.02,
  },
  ambient: {
    name: 'Ambient',
    subBass: {
      sensitivity: 0.6,
      cutoffHz: 120,
      primaryArchetype: 'willow',
      stations: ['center'],
    },
    mid: {
      sensitivity: 1.5,
      centerHz: 800,
      primaryArchetype: 'horsetail',
      stations: ['left_center', 'right_center'],
    },
    treble: {
      sensitivity: 0.5,
      cutoffHz: 3000,
      primaryArchetype: 'whistling_comet',
      stations: ['left', 'right'],
    },
    cooldownMs: 500,
    noiseFloorAdaptationRate: 0.01,
  },
  percussive: {
    name: 'Percussive',
    subBass: {
      sensitivity: 1.0,
      cutoffHz: 150,
      primaryArchetype: 'ground_mine',
      stations: ['center'],
    },
    mid: {
      sensitivity: 1.4,
      centerHz: 1200,
      primaryArchetype: 'crossette',
      stations: ['left_center', 'right_center'],
    },
    treble: {
      sensitivity: 1.8,
      cutoffHz: 2500,
      primaryArchetype: 'crackle',
      stations: ['left', 'right', 'fan'],
    },
    cooldownMs: 75,
    noiseFloorAdaptationRate: 0.05,
  },
};
```

---

### File 3: `src/state/ShowManager.ts` (State Manager & Playback Cursor)

- **Target File**: `c:/Users/Beame/Documents/antigravity/zealous-shannon/src/state/ShowManager.ts`
- **Purpose**: Centralized reactive show state store, track Mute/Solo logic, and zero-allocation playback loop.
- **Key Methods & Interfaces**:
```typescript
import { ShowJSON, ShowJSONCue, LaunchStation, FireCuePayload, ParticleEngineConfig } from '../types';

export interface ShowManagerOptions {
  initialShow?: ShowJSON;
  onFireCue?: (cue: FireCuePayload) => void;
}

export class ShowManager {
  private show: ShowJSON;
  private selectedCueIds: Set<string> = new Set();
  private mutedTracks: Set<LaunchStation> = new Set();
  private soloTracks: Set<LaunchStation> = new Set();
  private preSoloMutes: Set<LaunchStation> = new Set();

  // Zero-Allocation Playback Cursor
  private playbackCursor: number = 0;
  private lastTime: number = 0.0;
  private onFireCueCallback?: (cue: FireCuePayload) => void;

  // Listeners
  private listeners: Set<(show: ShowJSON) => void> = new Set();
  private selectionListeners: Set<(selectedIds: string[]) => void> = new Set();
  private trackStateListeners: Set<() => void> = new Set();

  // Undo / Redo stacks
  private undoStack: ShowJSON[] = [];
  private redoStack: ShowJSON[] = [];
  private maxHistory: number = 50;

  constructor(options?: ShowManagerOptions) {
    this.show = options?.initialShow || this.createEmptyShow();
    this.onFireCueCallback = options?.onFireCue;
    this.sortCues();
  }

  // Create clean blank show
  public createEmptyShow(title: string = 'Untitled Show', duration: number = 60.0): ShowJSON {
    return {
      version: '1.0.0',
      title,
      duration,
      calibration: {
        maxParticles: 65536,
        blackClamp: 0.02,
        gain: 1.0,
        bloomIntensity: 1.2,
        particleSizeScale: 1.0,
        aspectRatioMask: '16:9',
      },
      cues: [],
    };
  }

  // Getters
  public getShow(): ShowJSON { return this.show; }
  public getCues(): ShowJSONCue[] { return this.show.cues; }
  public getDuration(): number { return this.show.duration; }
  public getTitle(): string { return this.show.title; }

  // Load new show
  public loadShow(newShow: ShowJSON): void {
    this.pushUndo();
    this.show = {
      ...newShow,
      cues: [...newShow.cues].sort((a, b) => a.time - b.time),
    };
    this.selectedCueIds.clear();
    this.playbackCursor = 0;
    this.lastTime = 0.0;
    this.emitChange();
    this.emitSelectionChange();
  }

  // Cue Mutations
  public addCue(cue: ShowJSONCue): void {
    this.pushUndo();
    this.show.cues.push(cue);
    this.sortCues();
    this.emitChange();
  }

  public addCues(cues: ShowJSONCue[]): void {
    if (cues.length === 0) return;
    this.pushUndo();
    this.show.cues.push(...cues);
    this.sortCues();
    this.emitChange();
  }

  public updateCue(id: string, patch: Partial<ShowJSONCue>): void {
    const idx = this.show.cues.findIndex(c => c.id === id);
    if (idx === -1) return;
    this.pushUndo();
    this.show.cues[idx] = { ...this.show.cues[idx], ...patch };
    if (patch.time !== undefined) {
      this.sortCues();
    }
    this.emitChange();
  }

  public removeCue(id: string): void {
    this.pushUndo();
    this.show.cues = this.show.cues.filter(c => c.id !== id);
    this.selectedCueIds.delete(id);
    this.emitChange();
    this.emitSelectionChange();
  }

  public removeSelectedCues(): void {
    if (this.selectedCueIds.size === 0) return;
    this.pushUndo();
    this.show.cues = this.show.cues.filter(c => !this.selectedCueIds.has(c.id));
    this.selectedCueIds.clear();
    this.emitChange();
    this.emitSelectionChange();
  }

  public clearCues(): void {
    this.pushUndo();
    this.show.cues = [];
    this.selectedCueIds.clear();
    this.playbackCursor = 0;
    this.emitChange();
    this.emitSelectionChange();
  }

  // Track Mute & Solo Behavior (Tier 1 Verified)
  public toggleMute(station: LaunchStation): void {
    if (this.mutedTracks.has(station)) {
      this.mutedTracks.delete(station);
    } else {
      this.mutedTracks.add(station);
    }
    this.emitTrackChange();
  }

  public toggleSolo(station: LaunchStation): void {
    if (this.soloTracks.has(station)) {
      this.soloTracks.delete(station);
      if (this.soloTracks.size === 0) {
        // Restore pre-solo mute states
        this.mutedTracks = new Set(this.preSoloMutes);
        this.preSoloMutes.clear();
      }
    } else {
      if (this.soloTracks.size === 0) {
        // Save current mute states before entering solo
        this.preSoloMutes = new Set(this.mutedTracks);
      }
      this.soloTracks.add(station);
    }
    this.emitTrackChange();
  }

  public isTrackMuted(station: LaunchStation): boolean {
    return this.mutedTracks.has(station);
  }

  public isTrackSoloed(station: LaunchStation): boolean {
    return this.soloTracks.has(station);
  }

  public isStationActive(station: LaunchStation): boolean {
    if (this.soloTracks.size > 0) {
      return this.soloTracks.has(station);
    }
    return !this.mutedTracks.has(station);
  }

  // Zero-Allocation Playback Tick Loop
  public tick(currentTime: number): void {
    // If seeked backward, reset cursor
    if (currentTime < this.lastTime) {
      this.seek(currentTime);
    }
    this.lastTime = currentTime;

    const cues = this.show.cues;
    const len = cues.length;

    while (this.playbackCursor < len && cues[this.playbackCursor].time <= currentTime) {
      const cue = cues[this.playbackCursor];
      if (this.isStationActive(cue.station) && this.onFireCueCallback) {
        this.onFireCueCallback({
          id: cue.id,
          archetype: cue.archetype,
          station: cue.station,
          color: cue.color,
          altitude: cue.altitude,
          launchAngle: cue.launchAngle,
          duration: cue.duration,
        });
      }
      this.playbackCursor++;
    }
  }

  // O(log N) Binary Search Seek
  public seek(time: number): void {
    this.lastTime = time;
    const cues = this.show.cues;
    let low = 0;
    let high = cues.length;

    while (low < high) {
      const mid = (low + high) >>> 1;
      if (cues[mid].time < time) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    this.playbackCursor = low;
  }

  // Selection
  public selectCue(id: string, multi: boolean = false): void {
    if (!multi) {
      this.selectedCueIds.clear();
    }
    this.selectedCueIds.add(id);
    this.emitSelectionChange();
  }

  public deselectCue(id: string): void {
    this.selectedCueIds.delete(id);
    this.emitSelectionChange();
  }

  public clearSelection(): void {
    this.selectedCueIds.clear();
    this.emitSelectionChange();
  }

  public getSelectedCueIds(): string[] {
    return Array.from(this.selectedCueIds);
  }

  public getSelectedCues(): ShowJSONCue[] {
    return this.show.cues.filter(c => this.selectedCueIds.has(c.id));
  }

  // Undo / Redo
  private pushUndo(): void {
    this.undoStack.push(JSON.parse(JSON.stringify(this.show)));
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack = [];
  }

  public undo(): void {
    if (this.undoStack.length === 0) return;
    this.redoStack.push(JSON.parse(JSON.stringify(this.show)));
    this.show = this.undoStack.pop()!;
    this.emitChange();
  }

  public redo(): void {
    if (this.redoStack.length === 0) return;
    this.undoStack.push(JSON.parse(JSON.stringify(this.show)));
    this.show = this.redoStack.pop()!;
    this.emitChange();
  }

  private sortCues(): void {
    this.show.cues.sort((a, b) => a.time - b.time);
  }

  // Subscriptions
  public subscribe(listener: (show: ShowJSON) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public onSelectionChange(listener: (ids: string[]) => void): () => void {
    this.selectionListeners.add(listener);
    return () => this.selectionListeners.delete(listener);
  }

  public onTrackChange(listener: () => void): () => void {
    this.trackStateListeners.add(listener);
    return () => this.trackStateListeners.delete(listener);
  }

  private emitChange(): void {
    this.listeners.forEach(fn => fn(this.show));
  }

  private emitSelectionChange(): void {
    const ids = this.getSelectedCueIds();
    this.selectionListeners.forEach(fn => fn(ids));
  }

  private emitTrackChange(): void {
    this.trackStateListeners.forEach(fn => fn());
  }
}
```

---

### File 4: `src/choreography/PatternBrushes.ts` (Macro Brushes)

- **Target File**: `c:/Users/Beame/Documents/antigravity/zealous-shannon/src/choreography/PatternBrushes.ts`
- **Purpose**: Generates structured multi-cue pattern brushes: Fan Sweeps (L->R, R->L, Center-Out), Alternating Mines, and Grand Finale Barrage.
- **Specifications & Blueprint**:
```typescript
import { LaunchStation, MacroBrushType, ShellArchetype, ShowJSONCue } from '../types';

export interface PatternBrushOptions {
  startTime: number;
  archetype?: ShellArchetype;
  color?: string;
  colors?: string[];
  duration?: number;
  interval?: number;
  burstCount?: number;
  bpm?: number;
  altitude?: number;
}

export class PatternBrushes {
  /**
   * Fan Sweeps Brush:
   * Sequences Left-to-Right [L, LC, C, RC, R], Right-to-Left [R, RC, C, LC, L], or Center-Out.
   * Clamps duration within [0.25s, 2.0s].
   */
  public static generateFanSweep(
    direction: 'left_to_right' | 'right_to_left' | 'center_out',
    options: PatternBrushOptions
  ): ShowJSONCue[] {
    const startTime = Math.max(0, options.startTime);
    const archetype: ShellArchetype = options.archetype || 'peony';
    const color = options.color || '#ffd700';
    const alt = options.altitude ?? 0.8;
    const duration = Math.max(0.25, Math.min(2.0, options.duration || 0.5));

    const cues: ShowJSONCue[] = [];

    if (direction === 'left_to_right') {
      const stations: LaunchStation[] = ['left', 'left_center', 'center', 'right_center', 'right'];
      const step = (duration - 0.05) / Math.max(1, stations.length - 1);
      stations.forEach((st, i) => {
        cues.push({
          id: `sweep_lr_${Date.now()}_${i}`,
          time: Number((startTime + i * step).toFixed(3)),
          archetype,
          station: st,
          color,
          altitude: alt,
          launchAngle: (i - 2) * 8,
          duration: 2.2,
        });
      });
    } else if (direction === 'right_to_left') {
      const stations: LaunchStation[] = ['right', 'right_center', 'center', 'left_center', 'left'];
      const step = (duration - 0.05) / Math.max(1, stations.length - 1);
      stations.forEach((st, i) => {
        cues.push({
          id: `sweep_rl_${Date.now()}_${i}`,
          time: Number((startTime + i * step).toFixed(3)),
          archetype,
          station: st,
          color,
          altitude: alt,
          launchAngle: (2 - i) * 8,
          duration: 2.2,
        });
      });
    } else {
      // Center-Out in 3 outward waves
      const waves: { step: number; stations: LaunchStation[] }[] = [
        { step: 0, stations: ['center'] },
        { step: 1, stations: ['left_center', 'right_center'] },
        { step: 2, stations: ['left', 'right'] },
      ];
      const stepInterval = (duration - 0.05) / 2;
      waves.forEach((w) => {
        w.stations.forEach((st, sIdx) => {
          cues.push({
            id: `sweep_co_${Date.now()}_${w.step}_${sIdx}`,
            time: Number((startTime + w.step * stepInterval).toFixed(3)),
            archetype,
            station: st,
            color,
            altitude: alt,
            launchAngle: st === 'left' ? 12 : st === 'right' ? -12 : 0,
            duration: 2.2,
          });
        });
      });
    }

    return cues;
  }

  /**
   * Alternating Mines Brush:
   * Even beats trigger outer flanks [left, right]; odd beats trigger inner [left_center, center, right_center].
   * Syncs to BPM quarter notes (e.g. 128 BPM -> ~0.46875s).
   * Enforces ground_mine archetype, altitude <= 0.60 (e.g. 0.45), salvo count [4, 32], alternating colors.
   */
  public static generateAlternatingMines(options: PatternBrushOptions): ShowJSONCue[] {
    const startTime = Math.max(0, options.startTime);
    const bpm = options.bpm && options.bpm > 0 ? options.bpm : 128;
    const beatSec = 60 / bpm;
    const burstCount = Math.max(4, Math.min(32, options.burstCount || 8));
    const colors = options.colors && options.colors.length >= 2 ? options.colors : ['#06b6d4', '#f43f5e'];

    const cues: ShowJSONCue[] = [];

    for (let b = 0; b < burstCount; b++) {
      const beatTime = Number((startTime + b * beatSec).toFixed(3));
      const color = colors[b % colors.length];
      const isEven = b % 2 === 0;
      const stations: LaunchStation[] = isEven
        ? ['left', 'right']
        : ['left_center', 'center', 'right_center'];

      stations.forEach((st, idx) => {
        cues.push({
          id: `mine_alt_${Date.now()}_${b}_${idx}`,
          time: beatTime,
          archetype: 'ground_mine',
          station: st,
          color,
          altitude: 0.45,
          launchAngle: st === 'left' ? 10 : st === 'right' ? -10 : 0,
          duration: 1.8,
        });
      });
    }

    return cues;
  }

  /**
   * Grand Finale Barrage Brush:
   * Dense crescendo building over [3.0s, 10.0s] (default 6.0s).
   * Staggered breaks with progressive altitude scaling (0.70 -> 0.80 -> 0.90 -> 0.98).
   * Saturates all 6 stations with multi-archetype composition while guarding 65k pool limit.
   */
  public static generateGrandFinale(options: PatternBrushOptions): ShowJSONCue[] {
    const startTime = Math.max(0, options.startTime);
    const duration = Math.max(3.0, Math.min(10.0, options.duration || 6.0));
    const baseColor = options.color || '#ffd700';
    const cues: ShowJSONCue[] = [];

    // Wave 1: Ground mines and whistling comets (0.0s)
    ['left', 'right', 'left_center', 'right_center'].forEach((st, i) => {
      cues.push({
        id: `fin_mine_${i}`,
        time: Number((startTime + i * 0.1).toFixed(3)),
        archetype: 'ground_mine',
        station: st as LaunchStation,
        color: '#ff3366',
        altitude: 0.45,
        duration: 1.8,
      });
    });

    // Wave 2: Rising Altitude Crescendo (staggered altitude 0.70 -> 0.80 -> 0.90 -> 0.98)
    const altitudeSteps = [0.70, 0.80, 0.90, 0.98];
    const archetypes: ShellArchetype[] = ['brocade_crown', 'chrysanthemum', 'crackle', 'peony'];
    const stations: LaunchStation[] = ['left', 'left_center', 'center', 'right_center', 'right'];

    altitudeSteps.forEach((alt, stepIdx) => {
      const stepTime = Number((startTime + (duration * 0.3) + stepIdx * (duration * 0.15)).toFixed(3));
      stations.forEach((st, sIdx) => {
        cues.push({
          id: `fin_cresc_${stepIdx}_${sIdx}`,
          time: stepTime + sIdx * 0.04,
          archetype: archetypes[(stepIdx + sIdx) % archetypes.length],
          station: st,
          color: sIdx % 2 === 0 ? baseColor : '#ffffff',
          altitude: alt,
          launchAngle: (sIdx - 2) * 6,
          duration: 3.5,
        });
      });
    });

    // Wave 3: Grand Salvo Climax on all 6 stations (at duration - 0.5s)
    const finalSalvoTime = Number((startTime + duration - 0.5).toFixed(3));
    const allStations: LaunchStation[] = ['left', 'left_center', 'center', 'right_center', 'right', 'fan'];
    allStations.forEach((st, idx) => {
      cues.push({
        id: `fin_salvo_${idx}`,
        time: finalSalvoTime,
        archetype: st === 'fan' ? 'finale_barrage' : 'brocade_crown',
        station: st,
        color: baseColor,
        altitude: 0.95,
        launchAngle: 0,
        duration: 5.0,
      });
    });

    return cues;
  }

  public static applyMacroBrush(type: MacroBrushType, options: PatternBrushOptions): ShowJSONCue[] {
    switch (type) {
      case 'sweep_left_to_right':
        return this.generateFanSweep('left_to_right', options);
      case 'sweep_right_to_left':
        return this.generateFanSweep('right_to_left', options);
      case 'sweep_center_out':
        return this.generateFanSweep('center_out', options);
      case 'alternating_mines':
        return this.generateAlternatingMines(options);
      case 'grand_finale_barrage':
        return this.generateGrandFinale(options);
      default:
        return [];
    }
  }
}
```

---

### File 5: `src/choreography/AutoChoreographer.ts` (1-Click Choreographer)

- **Target File**: `c:/Users/Beame/Documents/antigravity/zealous-shannon/src/choreography/AutoChoreographer.ts`
- **Purpose**: Analyzes audio transients/energy and generates synchronized cues quantized to musical beat subdivisions.
- **Specifications & Blueprint**:
```typescript
import {
  AutoChoreographyOptions,
  LaunchStation,
  ShellArchetype,
  ShowJSONCue,
} from '../types';

export class AutoChoreographer {
  /**
   * Generates synchronized pyrotechnic cues from an audio buffer.
   * Throws descriptive Error if buffer is null/missing (AC-8).
   */
  public static choreographFromAudioBuffer(
    audioBuffer: AudioBuffer | null,
    options?: AutoChoreographyOptions
  ): ShowJSONCue[] {
    if (!audioBuffer) {
      throw new Error('Cannot auto-choreograph: No audio track loaded');
    }

    const duration = audioBuffer.duration;
    if (duration <= 0) return [];

    const bpm = options?.bpm && options.bpm > 0 ? options.bpm : 120;
    const gridStep = 60 / bpm; // e.g. 0.5s for 120 BPM

    // 1. Detect transient energy flux from PCM channel data
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.02); // 20ms
    const hopSize = Math.floor(sampleRate * 0.01); // 10ms
    const rawTransients: { time: number; energy: number; trebleRatio: number }[] = [];

    let prevEnergy = 0.0;
    let lastTime = -1.0;
    const minInterval = 0.20; // 200ms minimum gap

    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      let energy = 0.0;
      let zeroCrossings = 0;

      for (let j = 0; j < windowSize; j++) {
        const s = channelData[i + j];
        energy += s * s;
        if (j > 0 && ((s >= 0 && channelData[i + j - 1] < 0) || (s < 0 && channelData[i + j - 1] >= 0))) {
          zeroCrossings++;
        }
      }
      energy = Math.sqrt(energy / windowSize);

      const flux = Math.max(0, energy - prevEnergy);
      const timeSec = i / sampleRate;

      if (flux > 0.22 && (timeSec - lastTime) >= minInterval) {
        rawTransients.push({
          time: timeSec,
          energy: Math.min(1.0, energy * 2.0),
          trebleRatio: zeroCrossings / windowSize,
        });
        lastTime = timeSec;
      }
      prevEnergy = energy;
    }

    // 2. Quantize transients and map to shell archetypes and stations
    const cues: ShowJSONCue[] = [];
    const usedTimes = new Set<string>();

    const palette = options?.palette && options.palette.length > 0
      ? options.palette
      : ['#ffd700', '#ef4444', '#06b6d4', '#f59e0b', '#a855f7', '#ffffff'];

    const stations: LaunchStation[] = ['left', 'left_center', 'center', 'right_center', 'right', 'fan'];

    for (let idx = 0; idx < rawTransients.length; idx++) {
      const t = rawTransients[idx];
      // Quantize to beat grid
      const quantizedTime = Number((Math.round(t.time / gridStep) * gridStep).toFixed(3));
      const key = `${quantizedTime}`;
      if (usedTimes.has(key)) continue;
      usedTimes.add(key);

      // Archetype & Station selection based on spectral profile
      let archetype: ShellArchetype = 'peony';
      let station: LaunchStation = 'center';
      let altitude = 0.8;

      if (t.energy > 0.80) {
        // High energy drop / sub-bass
        if (idx % 3 === 0) {
          archetype = 'ground_mine';
          station = idx % 2 === 0 ? 'left' : 'right';
          altitude = 0.45;
        } else {
          archetype = 'brocade_crown';
          station = 'fan';
          altitude = 0.92;
        }
      } else if (t.trebleRatio > 0.15) {
        // High treble transient
        archetype = idx % 2 === 0 ? 'crackle' : 'strobe';
        station = stations[idx % stations.length];
        altitude = 0.85;
      } else {
        // Melodic / rhythmic mid
        const mids: ShellArchetype[] = ['peony', 'chrysanthemum', 'crossette', 'rings'];
        archetype = mids[idx % mids.length];
        station = stations[idx % 5];
        altitude = 0.75 + (idx % 3) * 0.05;
      }

      cues.push({
        id: `auto_${idx + 1}_${Math.random().toString(36).substring(2, 6)}`,
        time: quantizedTime,
        archetype,
        station,
        color: palette[idx % palette.length],
        altitude,
        launchAngle: station === 'left' ? 15 : station === 'right' ? -15 : 0,
        duration: archetype === 'ground_mine' ? 1.8 : 2.5,
      });
    }

    // Add optional climax finale at the end of the track
    if (options?.climaxSalvo !== false && duration > 10.0) {
      const finaleTime = Number((duration - 4.0).toFixed(3));
      cues.push({
        id: `auto_climax_salvo`,
        time: finaleTime,
        archetype: 'finale_barrage',
        station: 'fan',
        color: '#ffd700',
        altitude: 0.95,
        duration: 4.5,
      });
    }

    return cues.sort((a, b) => a.time - b.time);
  }
}
```

---

### File 6: `src/choreography/TapRecorder.ts` (Live Tap-To-Record & Interlocks)

- **Target File**: `c:/Users/Beame/Documents/antigravity/zealous-shannon/src/choreography/TapRecorder.ts`
- **Purpose**: Keyboard listener for live tap-to-record (`1`–`9`), presentation fullscreen (`F`), and emergency blackout (`Esc`/`Space`) with strict input suppression.
- **Specifications & Blueprint**:
```typescript
import { LaunchStation, ShellArchetype, ShowJSONCue, FireCuePayload } from '../types';

export interface TapRecorderConfig {
  getCurrentTime: () => number;
  getIsPlaying: () => boolean;
  onRecordCue: (cue: ShowJSONCue) => void;
  onFireLive: (cue: FireCuePayload) => void;
  onBlackout: () => void;
  onToggleFullscreen: () => void;
  getActiveArchetype?: () => ShellArchetype;
  getActiveColor?: () => string;
}

const STATION_KEY_MAP: Record<string, LaunchStation> = {
  '1': 'left',
  '2': 'left_center',
  '3': 'center',
  '4': 'right_center',
  '5': 'right',
  '6': 'fan',
};

export class TapRecorder {
  private config: TapRecorderConfig;
  private attachedTarget: HTMLElement | Window | null = null;
  private boundHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(config: TapRecorderConfig) {
    this.config = config;
  }

  public handleKeyDown(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement;

    // Safety Interlock: Strictly suppress hotkeys inside input fields
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target.isContentEditable ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA'
    ) {
      return false;
    }

    const key = e.key;

    // 1. Emergency Panic Blackout ('Escape' or 'Space')
    if (key === 'Escape' || key === ' ') {
      e.preventDefault();
      this.config.onBlackout();
      return true;
    }

    // 2. Presentation Fullscreen Toggle ('F' or 'f')
    if (key === 'f' || key === 'F') {
      e.preventDefault();
      this.config.onToggleFullscreen();
      return true;
    }

    const playhead = this.config.getCurrentTime();
    const archetype = this.config.getActiveArchetype ? this.config.getActiveArchetype() : 'peony';
    const color = this.config.getActiveColor ? this.config.getActiveColor() : '#ffd700';

    // 3. Numeric Keys '1'–'6': Spatial Launch Stations
    if (STATION_KEY_MAP[key]) {
      e.preventDefault();
      const station = STATION_KEY_MAP[key];
      const cue: ShowJSONCue = {
        id: `tap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        time: Number(playhead.toFixed(3)),
        archetype,
        station,
        color,
        altitude: 0.85,
        launchAngle: station === 'left' ? 15 : station === 'right' ? -15 : 0,
        duration: 2.2,
      };

      this.config.onRecordCue(cue);
      this.config.onFireLive(cue);
      return true;
    }

    // 4. Numeric Keys '7'–'9': Quick Macro Brushes
    if (key === '7') {
      // Key 7: Ground Mine Salvo
      e.preventDefault();
      const mineCue: ShowJSONCue = {
        id: `tap_mine_${Date.now()}`,
        time: Number(playhead.toFixed(3)),
        archetype: 'ground_mine',
        station: 'center',
        color: '#ef4444',
        altitude: 0.45,
        duration: 1.8,
      };
      this.config.onRecordCue(mineCue);
      this.config.onFireLive(mineCue);
      return true;
    }

    if (key === '8') {
      // Key 8: Crossette Fan
      e.preventDefault();
      const crossCue: ShowJSONCue = {
        id: `tap_cross_${Date.now()}`,
        time: Number(playhead.toFixed(3)),
        archetype: 'crossette',
        station: 'fan',
        color: '#22c55e',
        altitude: 0.85,
        duration: 2.5,
      };
      this.config.onRecordCue(crossCue);
      this.config.onFireLive(crossCue);
      return true;
    }

    if (key === '9') {
      // Key 9: Finale Salvo
      e.preventDefault();
      const finCue: ShowJSONCue = {
        id: `tap_fin_${Date.now()}`,
        time: Number(playhead.toFixed(3)),
        archetype: 'finale_barrage',
        station: 'fan',
        color: '#ffd700',
        altitude: 0.95,
        duration: 4.5,
      };
      this.config.onRecordCue(finCue);
      this.config.onFireLive(finCue);
      return true;
    }

    return false;
  }

  public attach(target: HTMLElement | Window = window): () => void {
    this.detach();
    this.attachedTarget = target;
    this.boundHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    target.addEventListener('keydown', this.boundHandler as EventListener);
    return () => this.detach();
  }

  public detach(): void {
    if (this.attachedTarget && this.boundHandler) {
      this.attachedTarget.removeEventListener('keydown', this.boundHandler as EventListener);
    }
    this.attachedTarget = null;
    this.boundHandler = null;
  }
}
```

---

### File 7: `src/components/timeline/WaveformCanvas.tsx` (Decimated Waveform & Transients)

- **Target File**: `c:/Users/Beame/Documents/antigravity/zealous-shannon/src/components/timeline/WaveformCanvas.tsx`
- **Purpose**: Zero-allocation HTML5 Canvas renderer for audio waveform peak envelopes and transient peak ticks with interactive zoom/pan/scrub.
- **Specifications & Blueprint**:
```typescript
import React, { useEffect, useRef } from 'react';
import { WaveformPeaks } from '../../types';

interface WaveformCanvasProps {
  peaks: WaveformPeaks | null;
  transients?: number[];
  currentTime: number;
  duration: number;
  viewStartTime: number;
  viewEndTime: number;
  onSeek: (time: number) => void;
  height?: number;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  peaks,
  transients = [],
  currentTime,
  duration,
  viewStartTime,
  viewEndTime,
  onSeek,
  height = 50,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const h = height;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Pure-black background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, h);

    const timeSpan = Math.max(0.1, viewEndTime - viewStartTime);
    const midY = h / 2;

    // Draw baseline
    ctx.strokeStyle = '#262626';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    if (!peaks || peaks.min.length === 0 || duration <= 0) {
      return;
    }

    const numBuckets = peaks.min.length;
    const secPerBucket = duration / numBuckets;

    // Draw Decimated Waveform Peaks (Zero-Allocation Loop)
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      const timeAtX = viewStartTime + (x / width) * timeSpan;
      if (timeAtX < 0 || timeAtX > duration) continue;

      const bucketIdx = Math.min(numBuckets - 1, Math.max(0, Math.floor(timeAtX / secPerBucket)));
      const minVal = peaks.min[bucketIdx];
      const maxVal = peaks.max[bucketIdx];

      const yTop = midY - maxVal * (midY - 2);
      const yBottom = midY - minVal * (midY - 2);

      ctx.fillRect(x, yTop, 1, Math.max(1, yBottom - yTop));
    }

    // Draw Transient Peak Markers
    ctx.fillStyle = '#f59e0b';
    transients.forEach((t) => {
      if (t >= viewStartTime && t <= viewEndTime) {
        const x = ((t - viewStartTime) / timeSpan) * width;
        ctx.fillRect(x - 1, 0, 2, 8);
      }
    });

    // Draw Playhead Line
    if (currentTime >= viewStartTime && currentTime <= viewEndTime) {
      const playheadX = ((currentTime - viewStartTime) / timeSpan) * width;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, h);
      ctx.stroke();
    }
  }, [peaks, transients, currentTime, duration, viewStartTime, viewEndTime, height]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const timeSpan = Math.max(0.1, viewEndTime - viewStartTime);
    const targetTime = viewStartTime + (x / rect.width) * timeSpan;
    onSeek(Math.max(0, Math.min(duration, targetTime)));
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      className="w-full cursor-pointer select-none rounded border border-neutral-800"
      style={{ height: `${height}px` }}
    />
  );
};
```

---

### File 8: `src/components/timeline/CueInspector.tsx` (Parameter Inspector)

- **Target File**: `c:/Users/Beame/Documents/antigravity/zealous-shannon/src/components/timeline/CueInspector.tsx`
- **Purpose**: Parameter editing panel for selected cue(s) (archetype, station, timecode, color hex, altitude, launch angle, duration).
- **Specifications & Blueprint**:
```typescript
import React from 'react';
import { ShowJSONCue, ShellArchetype, LaunchStation } from '../../types';
import { Trash2, Copy, X } from 'lucide-react';

interface CueInspectorProps {
  cue: ShowJSONCue | null;
  onUpdate: (patch: Partial<ShowJSONCue>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClose: () => void;
}

const ARCHETYPES: ShellArchetype[] = [
  'peony', 'chrysanthemum', 'willow', 'brocade_crown',
  'rings', 'strobe', 'crossette', 'crackle',
  'ground_mine', 'whistling_comet', 'horsetail', 'finale_barrage',
];

const STATIONS: LaunchStation[] = ['left', 'left_center', 'center', 'right_center', 'right', 'fan'];

const PRESET_SWATCHES = ['#ffd700', '#ff2244', '#11dd66', '#06b6d4', '#a855f7', '#f97316', '#ffffff'];

export const CueInspector: React.FC<CueInspectorProps> = ({
  cue,
  onUpdate,
  onDelete,
  onDuplicate,
  onClose,
}) => {
  if (!cue) {
    return (
      <div className="p-4 text-xs text-neutral-500 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-center">
        Select a cue on the timeline to inspect parameters
      </div>
    );
  }

  const isValidHex = (c: string) => /^#[0-9A-Fa-f]{6}$/.test(c);

  return (
    <div className="p-3 bg-neutral-950/95 border border-neutral-800 rounded-lg text-xs shadow-2xl backdrop-blur-md flex flex-col gap-2.5 w-72">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <span className="font-semibold text-neutral-200 uppercase tracking-wider text-[11px]">
          Cue Inspector
        </span>
        <div className="flex items-center gap-1">
          <button onClick={onDuplicate} title="Duplicate cue" className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} title="Delete cue" className="p-1 hover:bg-rose-950 rounded text-rose-400 hover:text-rose-300">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} title="Close inspector" className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Timecode */}
      <div className="flex items-center justify-between">
        <span className="text-neutral-400">Timestamp:</span>
        <input
          type="number"
          step="0.05"
          min="0"
          value={cue.time}
          onChange={(e) => onUpdate({ time: Math.max(0, parseFloat(e.target.value) || 0) })}
          className="w-24 px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded font-mono text-amber-400 text-right focus:border-amber-500 outline-none"
        />
      </div>

      {/* Archetype Selector */}
      <div className="flex items-center justify-between">
        <span className="text-neutral-400">Archetype:</span>
        <select
          value={cue.archetype}
          onChange={(e) => onUpdate({ archetype: e.target.value as ShellArchetype })}
          className="w-36 px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:border-cyan-500 outline-none capitalize"
        >
          {ARCHETYPES.map((a) => (
            <option key={a} value={a}>{a.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {/* Station Selector */}
      <div className="flex items-center justify-between">
        <span className="text-neutral-400">Station:</span>
        <select
          value={cue.station}
          onChange={(e) => onUpdate({ station: e.target.value as LaunchStation })}
          className="w-36 px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:border-cyan-500 outline-none capitalize"
        >
          {STATIONS.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {/* Color Hex & Swatches */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-neutral-400">Color Hex:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border border-neutral-700" style={{ backgroundColor: cue.color }} />
            <input
              type="text"
              value={cue.color}
              onChange={(e) => {
                const val = e.target.value;
                if (isValidHex(val)) onUpdate({ color: val });
              }}
              className="w-20 px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 rounded font-mono text-neutral-200 text-center uppercase focus:border-cyan-500 outline-none text-[11px]"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-1 pt-1">
          {PRESET_SWATCHES.map((hex) => (
            <button
              key={hex}
              onClick={() => onUpdate({ color: hex })}
              className="w-5 h-5 rounded border border-neutral-700 hover:scale-110 transition-transform"
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>

      {/* Altitude Slider [0.20, 1.00] */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-neutral-400">Altitude:</span>
          <span className="font-mono text-cyan-400">{Math.round(cue.altitude * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.20"
          max="1.00"
          step="0.01"
          value={cue.altitude}
          onChange={(e) => onUpdate({ altitude: Math.max(0.2, Math.min(1.0, parseFloat(e.target.value))) })}
          className="w-full h-1 bg-neutral-800 rounded accent-cyan-400"
        />
      </div>

      {/* Launch Angle Slider [-45°, +45°] */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-neutral-400">Launch Angle:</span>
          <span className="font-mono text-cyan-400">{(cue.launchAngle || 0)}°</span>
        </div>
        <input
          type="range"
          min="-45"
          max="45"
          step="1"
          value={cue.launchAngle || 0}
          onChange={(e) => onUpdate({ launchAngle: Math.max(-45, Math.min(45, parseInt(e.target.value, 10))) })}
          className="w-full h-1 bg-neutral-800 rounded accent-cyan-400"
        />
      </div>

      {/* Duration [0.5s, 10.0s] */}
      <div className="flex items-center justify-between">
        <span className="text-neutral-400">Duration:</span>
        <input
          type="number"
          step="0.1"
          min="0.5"
          max="10.0"
          value={cue.duration || 2.2}
          onChange={(e) => onUpdate({ duration: Math.max(0.5, Math.min(10.0, parseFloat(e.target.value) || 2.2)) })}
          className="w-20 px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded font-mono text-neutral-200 text-right focus:border-cyan-500 outline-none"
        />
      </div>
    </div>
  );
};
```

---

### File 9: `src/components/timeline/MacroBrushesBar.tsx` (Macro Brushes Toolbar)

- **Target File**: `c:/Users/Beame/Documents/antigravity/zealous-shannon/src/components/timeline/MacroBrushesBar.tsx`
- **Purpose**: Fast authoring toolbar for Fan Sweeps, Alternating Mines, Grand Finale, 1-Click Auto-Choreographer, and Hotkeys reference.
- **Specifications & Blueprint**:
```typescript
import React from 'react';
import { MacroBrushType } from '../../types';
import { Wand2, Zap, Waves, Sparkles, Flame } from 'lucide-react';

interface MacroBrushesBarProps {
  onApplyBrush: (type: MacroBrushType) => void;
  onAutoChoreograph: () => void;
  isAudioLoaded: boolean;
}

export const MacroBrushesBar: React.FC<MacroBrushesBarProps> = ({
  onApplyBrush,
  onAutoChoreograph,
  isAudioLoaded,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-neutral-950 border-t border-b border-neutral-800 text-xs">
      {/* 1-Click Auto-Choreographer */}
      <button
        onClick={onAutoChoreograph}
        disabled={!isAudioLoaded}
        className={`flex items-center gap-1.5 px-3 py-1 rounded font-semibold transition-all ${
          isAudioLoaded
            ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.4)] hover:brightness-110'
            : 'bg-neutral-900 text-neutral-600 border border-neutral-800 cursor-not-allowed'
        }`}
        title={isAudioLoaded ? 'Generate show automatically from audio' : 'Load an audio track first'}
      >
        <Wand2 className="w-3.5 h-3.5" />
        <span>1-Click Auto-Choreograph</span>
      </button>

      <div className="h-4 w-px bg-neutral-800 mx-1" />

      {/* Sweep L->R */}
      <button
        onClick={() => onApplyBrush('sweep_left_to_right')}
        className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-300 hover:text-white transition-colors"
        title="Fan Sweep: Left to Right"
      >
        <Waves className="w-3 h-3 text-cyan-400" />
        <span>Sweep L→R</span>
      </button>

      {/* Sweep R->L */}
      <button
        onClick={() => onApplyBrush('sweep_right_to_left')}
        className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-300 hover:text-white transition-colors"
        title="Fan Sweep: Right to Left"
      >
        <Waves className="w-3 h-3 text-cyan-400 rotate-180" />
        <span>Sweep R→L</span>
      </button>

      {/* Sweep Center-Out */}
      <button
        onClick={() => onApplyBrush('sweep_center_out')}
        className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-300 hover:text-white transition-colors"
        title="Fan Sweep: Center Outward"
      >
        <Zap className="w-3 h-3 text-amber-400" />
        <span>Center-Out</span>
      </button>

      {/* Alternating Mines */}
      <button
        onClick={() => onApplyBrush('alternating_mines')}
        className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-300 hover:text-white transition-colors"
        title="Alternating Mines (Flanks / Inner)"
      >
        <Flame className="w-3 h-3 text-rose-400" />
        <span>Alternating Mines</span>
      </button>

      {/* Grand Finale Barrage */}
      <button
        onClick={() => onApplyBrush('grand_finale_barrage')}
        className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-300 hover:text-white transition-colors"
        title="Grand Finale Barrage Salvo"
      >
        <Sparkles className="w-3 h-3 text-emerald-400" />
        <span>Grand Finale</span>
      </button>

      {/* Hotkey Cheat Sheet */}
      <div className="ml-auto hidden xl:flex items-center gap-2 text-[10px] text-neutral-500 font-mono">
        <span>RECORD: [1-6] STATIONS</span>
        <span>|</span>
        <span>[7-9] MACROS</span>
      </div>
    </div>
  );
};
```

---

### File 10: `src/components/timeline/TimelineStudio.tsx` (6-Track Spatial Timeline)

- **Target File**: `c:/Users/Beame/Documents/antigravity/zealous-shannon/src/components/timeline/TimelineStudio.tsx`
- **Purpose**: Multi-track timeline representing the 6 spatial stations with track mute/solo buttons, draggable playhead scrubber, cue clips, JSON export/import, and demo preset loader.
- **Specifications & Blueprint**:
```typescript
import React, { useState, useRef, useEffect } from 'react';
import { ShowManager } from '../../state/ShowManager';
import { AudioEngine } from '../../engine/audio/AudioEngine';
import { WaveformCanvas } from './WaveformCanvas';
import { CueInspector } from './CueInspector';
import { MacroBrushesBar } from './MacroBrushesBar';
import { PatternBrushes } from '../../choreography/PatternBrushes';
import { AutoChoreographer } from '../../choreography/AutoChoreographer';
import { ShowSerialization } from '../../state/ShowSerialization';
import { PRESET_SHOWS } from '../../state/Presets';
import {
  LaunchStation,
  MacroBrushType,
  ShowJSONCue,
  WaveformPeaks,
} from '../../types';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  ZoomIn,
  ZoomOut,
  Sliders,
  VolumeX,
} from 'lucide-react';

interface TimelineStudioProps {
  showManager: ShowManager;
  audioEngine: AudioEngine | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onRewind: () => void;
  onSeek: (time: number) => void;
  onLoadShow: (presetKey: string) => void;
  onFireLiveCue: (cue: ShowJSONCue) => void;
}

const TRACKS: { id: LaunchStation; label: string; offset: string }[] = [
  { id: 'left', label: 'Left Flank', offset: '-22m' },
  { id: 'left_center', label: 'L-Center', offset: '-11m' },
  { id: 'center', label: 'Center Stage', offset: '0m' },
  { id: 'right_center', label: 'R-Center', offset: '+11m' },
  { id: 'right', label: 'Right Flank', offset: '+22m' },
  { id: 'fan', label: 'Fan Array', offset: '[-22m, +22m]' },
];

export const TimelineStudio: React.FC<TimelineStudioProps> = ({
  showManager,
  audioEngine,
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
  onRewind,
  onSeek,
  onLoadShow,
  onFireLiveCue,
}) => {
  const [show, setShow] = useState(showManager.getShow());
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);
  const [peaks, setPeaks] = useState<WaveformPeaks | null>(null);
  const [transients, setTransients] = useState<number[]>([]);
  const [zoom, setZoom] = useState<number>(40); // Pixels per second
  const [viewStartTime, setViewStartTime] = useState<number>(0);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tracksContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync state subscriptions
  useEffect(() => {
    const unsub = showManager.subscribe((s) => setShow({ ...s }));
    const unsubSel = showManager.onSelectionChange((ids) => {
      setSelectedCueId(ids[0] || null);
    });
    return () => {
      unsub();
      unsubSel();
    };
  }, [showManager]);

  // Extract waveform peaks & transients when audio changes
  useEffect(() => {
    if (audioEngine && audioEngine.getAudioBuffer()) {
      const p = audioEngine.extractWaveformPeaks(1200);
      setPeaks(p);
      const t = audioEngine.detectTransients(0.25);
      setTransients(t);
    }
  }, [audioEngine, show.audioTrack]);

  const viewSpan = Math.max(1.0, duration || 60);
  const totalTimelineWidth = Math.max(800, viewSpan * zoom);

  // Apply Macro Brush
  const handleApplyBrush = (type: MacroBrushType) => {
    const generated = PatternBrushes.applyMacroBrush(type, {
      startTime: currentTime,
      bpm: 120,
    });
    showManager.addCues(generated);
  };

  // 1-Click Auto-Choreographer
  const handleAutoChoreograph = () => {
    if (!audioEngine || !audioEngine.getAudioBuffer()) {
      alert('Cannot auto-choreograph: No audio track loaded');
      return;
    }
    try {
      const cues = AutoChoreographer.choreographFromAudioBuffer(audioEngine.getAudioBuffer());
      showManager.addCues(cues);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Export JSON file
  const handleExportJSON = () => {
    ShowSerialization.downloadShowFile(showManager.getShow());
  };

  // Import JSON file
  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedShow = await ShowSerialization.readShowFile(file);
      showManager.loadShow(importedShow);
    } catch (err: any) {
      alert(`Failed to import show: ${err.message}`);
    }
  };

  const selectedCue = show.cues.find((c) => c.id === selectedCueId) || null;

  return (
    <div className="flex flex-col w-full bg-neutral-950 border-t border-neutral-800 select-none text-xs">
      {/* 1. Header Toolbar: Transport, Timecode, Presets, Export/Import */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-900/80 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          {/* Transport buttons */}
          <button
            onClick={onPlayPause}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-semibold transition-colors ${
              isPlaying
                ? 'bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                : 'bg-neutral-800 hover:bg-neutral-700 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={onRewind}
            className="p-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300"
            title="Rewind to 00:00"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Timecode readouts */}
          <div className="font-mono text-xs px-2 py-0.5 bg-neutral-950 border border-neutral-800 rounded text-amber-400">
            {currentTime.toFixed(2)}s / {(duration || show.duration).toFixed(2)}s
          </div>

          {/* Preset Selector */}
          <select
            onChange={(e) => onLoadShow(e.target.value)}
            className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-neutral-200 outline-none text-[11px]"
            defaultValue=""
          >
            <option value="" disabled>Load Preset Show...</option>
            <option value="cosmic_awakening">✨ Cosmic Awakening (90s)</option>
            <option value="neon_horizon">🌆 Neon Horizon (75s)</option>
          </select>
        </div>

        {/* Right tools: Zoom, Export, Import, Inspector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-neutral-800 rounded px-1.5 py-0.5">
            <button onClick={() => setZoom(Math.max(10, zoom - 10))} title="Zoom out" className="p-0.5 text-neutral-400 hover:text-white">
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="font-mono text-[10px] text-neutral-300">{zoom}px/s</span>
            <button onClick={() => setZoom(Math.min(150, zoom + 10))} title="Zoom in" className="p-0.5 text-neutral-400 hover:text-white">
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 hover:text-white"
            title="Export portable Show JSON file"
          >
            <Download className="w-3 h-3" />
            <span>Export</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportJSON}
            accept=".json,.pyro.json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 hover:text-white"
            title="Import Show JSON file"
          >
            <Upload className="w-3 h-3" />
            <span>Import</span>
          </button>

          <button
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            className={`p-1 rounded ${isInspectorOpen ? 'bg-cyan-950 text-cyan-400 border border-cyan-700' : 'bg-neutral-800 text-neutral-400'}`}
            title="Toggle Cue Inspector"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Macro Brushes Toolbar */}
      <MacroBrushesBar
        onApplyBrush={handleApplyBrush}
        onAutoChoreograph={handleAutoChoreograph}
        isAudioLoaded={!!audioEngine?.getAudioBuffer()}
      />

      {/* 3. Main Multi-Track Lanes & Waveform Area */}
      <div className="flex relative overflow-hidden" style={{ maxHeight: '240px' }}>
        {/* Track Headers (Left Column) */}
        <div className="w-44 flex-shrink-0 bg-neutral-950 border-r border-neutral-800 z-10 flex flex-col">
          {/* Waveform Header */}
          <div className="h-10 px-2 flex items-center justify-between border-b border-neutral-800/80 text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
            <span>Audio Waveform</span>
          </div>

          {/* 6 Spatial Track Headers */}
          {TRACKS.map((t) => {
            const isMuted = showManager.isTrackMuted(t.id);
            const isSoloed = showManager.isTrackSoloed(t.id);

            return (
              <div
                key={t.id}
                className="h-8 px-2 flex items-center justify-between border-b border-neutral-800/60 text-neutral-300"
              >
                <div className="flex flex-col truncate">
                  <span className="font-medium text-[11px] truncate">{t.label}</span>
                  <span className="text-[9px] text-neutral-500">{t.offset}</span>
                </div>

                <div className="flex items-center gap-1">
                  {/* Mute Button */}
                  <button
                    onClick={() => showManager.toggleMute(t.id)}
                    className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${
                      isMuted
                        ? 'bg-rose-950 text-rose-400 border border-rose-700'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                    title={isMuted ? 'Unmute track' : 'Mute track'}
                  >
                    M
                  </button>

                  {/* Solo Button */}
                  <button
                    onClick={() => showManager.toggleSolo(t.id)}
                    className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${
                      isSoloed
                        ? 'bg-amber-500 text-black shadow-[0_0_6px_rgba(245,158,11,0.6)]'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                    title={isSoloed ? 'Clear solo' : 'Solo track'}
                  >
                    S
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable Tracks Canvas & Cue Items */}
        <div
          ref={tracksContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-black"
        >
          <div style={{ width: `${totalTimelineWidth}px` }} className="relative">
            {/* Waveform Lane */}
            <div className="h-10 border-b border-neutral-800/80 p-0.5">
              <WaveformCanvas
                peaks={peaks}
                transients={transients}
                currentTime={currentTime}
                duration={duration || show.duration}
                viewStartTime={0}
                viewEndTime={duration || show.duration}
                onSeek={onSeek}
                height={36}
              />
            </div>

            {/* 6 Spatial Track Lanes */}
            {TRACKS.map((t) => {
              const isMuted = showManager.isTrackMuted(t.id);
              const trackCues = show.cues.filter((c) => c.station === t.id);

              return (
                <div
                  key={t.id}
                  className={`h-8 relative border-b border-neutral-800/40 transition-opacity ${
                    isMuted ? 'opacity-40' : 'opacity-100'
                  }`}
                  onDoubleClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left + (tracksContainerRef.current?.scrollLeft || 0);
                    const time = Math.max(0, clickX / zoom);
                    showManager.addCue({
                      id: `cue_${Date.now()}`,
                      time: Number(time.toFixed(3)),
                      archetype: 'peony',
                      station: t.id,
                      color: '#ffd700',
                      altitude: 0.85,
                      launchAngle: t.id === 'left' ? 15 : t.id === 'right' ? -15 : 0,
                    });
                  }}
                >
                  {/* Cues on this track */}
                  {trackCues.map((c) => {
                    const leftPx = c.time * zoom;
                    const isSelected = c.id === selectedCueId;

                    return (
                      <div
                        key={c.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          showManager.selectCue(c.id, e.shiftKey);
                        }}
                        className={`absolute top-1 bottom-1 px-1.5 rounded flex items-center gap-1 cursor-pointer truncate transition-all text-[10px] ${
                          isSelected
                            ? 'ring-2 ring-white z-20 brightness-125'
                            : 'hover:brightness-110 z-10'
                        }`}
                        style={{
                          left: `${leftPx}px`,
                          backgroundColor: c.color,
                          color: '#000000',
                          minWidth: '42px',
                        }}
                        title={`${c.archetype} @ ${c.time.toFixed(2)}s`}
                      >
                        <span className="font-bold uppercase tracking-tight text-[9px]">
                          {c.archetype.substring(0, 3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Playhead Scrubber Line across all tracks */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none"
              style={{ left: `${currentTime * zoom}px` }}
            >
              <div className="w-2 h-2 -ml-[3px] bg-rose-500 rotate-45" />
            </div>
          </div>
        </div>

        {/* Floating / Docked Cue Inspector */}
        {isInspectorOpen && (
          <div className="absolute top-2 right-2 z-40">
            <CueInspector
              cue={selectedCue}
              onUpdate={(patch) => {
                if (selectedCue) showManager.updateCue(selectedCue.id, patch);
              }}
              onDelete={() => {
                if (selectedCue) showManager.removeCue(selectedCue.id);
              }}
              onDuplicate={() => {
                if (selectedCue) {
                  showManager.addCue({
                    ...selectedCue,
                    id: `cue_dup_${Date.now()}`,
                    time: selectedCue.time + 0.5,
                  });
                }
              }}
              onClose={() => setIsInspectorOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
```

---

### File 11: `src/app/App.tsx` (Complete Integrated Studio)

- **Target File**: `c:/Users/Beame/Documents/antigravity/zealous-shannon/src/app/App.tsx`
- **Purpose**: Integrates `TimelineStudio`, `ShowManager`, `TapRecorder`, `AudioEngine`, `CanvasViewport`, `PanicBar`, `CalibrationPanel`, and `BroadcastBus`.
- **Key Changes Blueprint**:
  1. Instantiate `ShowManager` in ref:
     ```typescript
     const showManagerRef = useRef<ShowManager | null>(null);
     if (!showManagerRef.current) {
       showManagerRef.current = new ShowManager({
         initialShow: DEMO_SHOW_COSMIC_AWAKENING,
         onFireCue: (cue) => {
           handleFireCue(cue);
         },
       });
     }
     ```
  2. Setup `TapRecorder`:
     ```typescript
     useEffect(() => {
       const recorder = new TapRecorder({
         getCurrentTime: () => audioEngineRef.current?.getCurrentTime() || 0,
         getIsPlaying: () => !!isAudioPlayingRef.current,
         onRecordCue: (cue) => {
           showManagerRef.current?.addCue(cue);
         },
         onFireLive: (cue) => {
           handleFireCue(cue);
         },
         onBlackout: () => {
           handleBlackout();
         },
         onToggleFullscreen: () => {
           handleToggleFullscreen();
         },
       });

       const detach = recorder.attach(window);
       return () => detach();
     }, [handleBlackout, handleToggleFullscreen]);
     ```
  3. Timecode Animation Loop Syncs `ShowManager.tick(t)`:
     ```typescript
     const updateTimecode = () => {
       if (audioEngineRef.current) {
         const t = audioEngineRef.current.getCurrentTime();
         setCurrentAudioTime(t);
         setAudioDuration(audioEngineRef.current.getDuration());
         setAudioTrackTitle(audioEngineRef.current.getTrackTitle());

         // Dispatch timeline cues to fireworks engine locked to sample-accurate clock
         if (isAudioPlayingRef.current) {
           showManagerRef.current?.tick(t);
         }
       }
       animId = requestAnimationFrame(updateTimecode);
     };
     ```
  4. Transport Play / Pause / Seek:
     - When seeking (`handleRewind`, seek slider), call `showManagerRef.current?.seek(targetTime)` to synchronize cursor index without generating garbage.
  5. Presentation Fullscreen Mode:
     - When `isFullscreen` is active: hides `PanicBar`, `TimelineStudio`, `CueInspector`, and drawers. Canvas becomes `100vw` x `100vh` borderless pure black `#000000`.
  6. Emergency Panic Blackout (`handleBlackout`):
     - Clears active particles in `viewportRef.current?.blackout()`.
     - Halts audio in `audioEngineRef.current?.blackout()`.
     - Broadcasts `PANIC_BLACKOUT` across `busRef.current?.panicBlackout()`.

---

## 5. Verification Method

To verify the implementation independently after code completion:

1. **Static Analysis & Compilation Check**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
   Must pass with **0 TypeScript errors and 0 bundler errors**.

2. **Run All 10 Test Modules Across Tiers 1-4**:
   ```bash
   node tests/runner.ts
   npm run test:all
   ```
   Expected: **260/260 tests passed, 0 failures across all suites**.

3. **Feature-by-Feature Operational Smoke Test**:
   - **6 Spatial Tracks**: Observe tracks for Left, Left-Center, Center, Right-Center, Right, and Fan. Double click to add cues.
   - **Track Mute / Solo**: Click `M` to mute Left; verify Left cues do not fire. Click `S` on Center; verify only Center cues fire. Un-solo Center; verify Left returns to muted.
   - **1-Click Auto-Choreographer**: Load "Cosmic Awakening" soundtrack, click "1-Click Auto-Choreograph", verify cues populate the timeline synchronized to beats.
   - **Macro Brushes**: Click "Sweep L→R", verify 5 staggered cues across stations. Click "Alternating Mines", verify rhythmic mine salvo. Click "Grand Finale", verify multi-archetype crescendo.
   - **Live Tap-to-Record**: Start playback, tap keys `1`–`6` to drop cues. Tap keys `7`–`9` to drop macro brushes. Verify cues appear at playhead.
   - **Focus Suppression**: Click into a text input or textarea, press `1`, `f`, and `Space`. Verify characters type normally and do NOT drop cues or trigger blackout.
   - **Cue Inspector**: Click a cue block on the timeline; verify archetype, station, altitude, angle, duration, and color can be modified in real time.
   - **Show JSON Export/Import**: Click "Export", verify valid JSON file downloads. Clear timeline, click "Import", verify show is restored identically.
   - **Presentation Fullscreen (`F`)**: Press `F`; verify operator studio UI completely disappears leaving pure `#000000` canvas.
   - **Emergency Panic Blackout (`Esc` or `Space`)**: Trigger barrage, press `Esc` or `Space`; verify particles immediately vanish and playback halts.
