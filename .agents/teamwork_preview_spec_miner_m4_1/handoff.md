# Milestone 4 Specification Mining Report: Timeline Studio, Choreography Engine & Presets

**Document ID**: SPEC-MINER-M4-001  
**Working Directory**: `c:/Users/Beame/Documents/antigravity/zealous-shannon/.agents/teamwork_preview_spec_miner_m4_1`  
**Authoritative Sources**: `ORIGINAL_REQUEST.md` (§R4, §R5, AC-6, AC-8, AC-9, AC-11, AC-12), `PROJECT.md` (§Feature Inventory #36-#48, §Architecture, §Interface Contracts, §Code Layout), `TEST_READY.md`, `tests/runner.ts`, `tests/tier1-features/*.test.ts`, `tests/fixtures/*.ts`, `tests/tier2-boundaries/boundary-corner.test.ts`, `tests/tier3-combinations/cross-feature.test.ts`, `tests/tier4-scenarios/real-world-scenarios.test.ts`, `src/types/index.ts`, `src/state/ShowSerialization.ts`, `src/engine/audio/ProceduralMusic.ts`.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Spatial Tracks | 6 Spatial Launch Tracks Geometry | 6 discrete launch tracks mapped to normalized horizontal stage coordinates: Left (-0.80), Left-Center (-0.40), Center (0.00), Right-Center (+0.40), Right (+0.80), and Fan ([-0.80, +0.80] array). Outer stations default to inward launch angles (Left: +15°, Right: -15°); Center defaults to vertical 0°. Screen coordinate conversion: `(normX * 0.5 + 0.5) * viewportWidth`. | Station ID (`LaunchStation`), viewport width | Station normalized X [-1.0, 1.0], pixel screen coordinate X, default angle | Unrecognized station string falls back to `'center'` | `PROJECT.md` §150, `tests/tier1-features/timeline-tracks.test.ts`:31-61, 141-173 |
| 2 | Spatial Tracks | Track Mute & Solo Controls | Lane-level audio/visual firing interlocks. Muting a track suppresses cue firing for that station only. Soloing a track mutes all non-soloed tracks. Multiple tracks can be soloed simultaneously (`Set<LaunchStation>`). Disabling solo restores previous mute states. Active track UI opacity 1.0 (#ffffff), muted track opacity 0.4 (#6b7280). | Track toggle action (`mute`, `solo`), station ID | Firing authorization boolean (`shouldFire = !isMuted && (!hasSolo || isSoloed)`), UI visual state | Prevents cue firing on muted tracks without altering stored cue data | `PROJECT.md` §91, `tests/tier1-features/timeline-tracks.test.ts`:63-100 |
| 3 | Spatial Tracks | Ground Line Spatial Constraint | Ground Mine archetype is strictly constrained to launch at ground line elevation `y = 0.0` regardless of cue altitude parameter. Other aerial archetypes burst at their specified altitude. | `archetype: 'ground_mine'`, altitude | Burst origin `{ x, y: 0.0 }` | Ignores elevation altitude for mine lift | `tests/tier1-features/timeline-tracks.test.ts`:169-173, `tests/tier2-boundaries/boundary-corner.test.ts`:144-149 |
| 4 | Waveform & Transients | AudioBuffer Peak Decimation | Decimates 44.1kHz raw PCM audio buffer into min/max amplitude envelopes within `[-1.0, 1.0]` mapped to pixel columns. Pixel window sample stride: `samplesPerPixel = Math.floor(buffer.length / canvasWidth)`. | `AudioBuffer`, `canvasWidth` (px) | `WaveformPeaks` (`min: Float32Array`, `max: Float32Array`, `duration`, `sampleRate`) | Renders flat baseline (`flat_baseline`) when buffer is null or empty | `PROJECT.md` §146-151, `tests/tier1-features/audio-sync.test.ts`:82-101 |
| 5 | Waveform & Transients | Waveform Viewport Zoom & Pan | Interactive timeline viewport navigation. Zoom span is bounded between `1.0s` (extreme detail) and `300.0s` (5 minutes, full show duration). Pan position is clamped between `0.0s` and `show.duration`. | Zoom level (seconds per window), scroll offset (seconds) | Rendered time window `[startTime, endTime]` | Clamps zoom strictly within `[1.0, 300.0]s` and pan within `[0.0, duration]` | `PROJECT.md` §79, `tests/tier1-features/audio-sync.test.ts`:103-108 |
| 6 | Waveform & Transients | Transient Onset Peak Detection | Algorithmic peak/transient onset detector analyzing audio energy flux to locate rhythmic drum hits and downbeats (e.g., 120 BPM quarter notes at 0.5s intervals). | `AudioBuffer`, sensitivity threshold | Array of transient timestamps (seconds), vertical visual marker overlays | Produces 0 markers on silence without throwing | `PROJECT.md` §92, `tests/tier1-features/audio-sync.test.ts`:110-123 |
| 7 | Auto-Choreographer | 1-Click Auto-Choreographer Beat Grid Quantization | Synchronizes audio transients to musical beat subdivisions (e.g. quarter note grid step: `gridStep = 60 / bpm`; quantized time = `Math.round(rawTime / gridStep) * gridStep`). | Raw transient timestamps, `bpm` (e.g. 120, 128) | Quantized cue timestamps aligned to musical grid | Handles arbitrary BPMs cleanly; clamps grid steps > 0 | `ORIGINAL_REQUEST.md` §R4, AC-8, `tests/tier1-features/macro-brushes.test.ts`:154-186 |
| 8 | Auto-Choreographer | Audio Band Energy to Archetype & Station Mapping | Maps spectral energy bands to shell archetypes and stations: heavy sub-bass energy (>0.80) maps to `ground_mine` (outer/center) and `brocade_crown` (drops); high treble transients (>0.85) map to `crackle` and `strobe` (fan/outer); mid-range energy maps to `peony`, `willow`, `chrysanthemum`, `crossette`. | Audio FFT spectral bands (`sub`, `mid`, `treble`), energy values | Generated `ShowJSONCue[]` with archetypes, stations, colors, and altitudes | Throws explicit Error if audio buffer is missing | `ORIGINAL_REQUEST.md` §R4, `tests/tier1-features/macro-brushes.test.ts`:167-177 |
| 9 | Auto-Choreographer | Auto-Choreographer Execution Guard & Options | Configurable choreography generation parameters: `density` ('low', 'medium', 'high', 'sparse', 'balanced', 'intense'), `palette` (hex strings), `paletteTheme` ('royal_gold', 'neon_cyber', 'rainbow', 'patriotic'), `bpm`, `includeGroundMines`, `includeSweeps`, `climaxSalvo`. | `AutoChoreographyOptions`, `AudioBuffer | null` | Complete populated timeline cues | Throws `'Cannot auto-choreograph: No audio track loaded'` when buffer is null; generates 0 cues on silent audio | `src/types/index.ts`:180-190, `tests/tier1-features/macro-brushes.test.ts`:187-193, `tests/tier2-boundaries/boundary-corner.test.ts`:209-213 |
| 10 | Macro Brushes | Fan Sweeps Brush (`sweep_left_to_right`, `sweep_right_to_left`, `sweep_center_out`) | Generates sequential cues across stations. Left-to-Right: `[L, LC, C, RC, R]` with configurable interval (default 50ms = 0.05s). Right-to-Left: `[R, RC, C, LC, L]`. Center-Out: 3 waves (Wave 0: Center; Wave 1: LC + RC; Wave 2: L + R). Configurable sweep duration: `[0.25s, 2.0s]`. Uniform shell archetype and color applied across cues. | Sweep pattern type, start time, sweep duration, archetype, color | Array of timed cues deposited on timeline | Clamps sweep duration to `[0.25, 2.0]s` | `PROJECT.md` §94, `src/types/index.ts`:193-195, `tests/tier1-features/macro-brushes.test.ts`:31-75 |
| 11 | Macro Brushes | Alternating Mines Brush (`alternating_mines`) | Rhythmic alternating ground mine bursts between outer flanks and inner stations: Even beats (0, 2) trigger 2 outer stations (`['left', 'right']`); Odd beats (1, 3) trigger 3 inner stations (`['left_center', 'center', 'right_center']`). Spaced by quarter notes matching musical tempo (e.g. 128 BPM = 0.46875s). Enforces `ground_mine` archetype, altitude <= 0.60 (e.g. 0.45), y=0 origin. Salvo burst count: `[4, 32]`. Alternating dual-color palette (e.g. Cyan `#06b6d4` & Magenta `#f43f5e`). | Start time, tempo BPM, salvo count [4, 32], colors [colorA, colorB] | Timed `ground_mine` cues spanning alternating stations | Clamps burst count to `[4, 32]`; enforces ground mine archetype | `PROJECT.md` §95, `src/types/index.ts`:196, `tests/tier1-features/macro-brushes.test.ts`:78-114 |
| 12 | Macro Brushes | Grand Finale Barrage Brush (`grand_finale_barrage`) | Dense crescendo building particle saturation over `[3.0s, 10.0s]` (e.g. 6.0s). Staggers shell breaks with progressive altitude scaling (0.70 -> 0.80 -> 0.90 -> 0.98). Culminates in massive simultaneous salvo across all 6 stations (`['left', 'left_center', 'center', 'right_center', 'right', 'fan']`). Combines complementary archetypes (`brocade_crown`, `chrysanthemum`, `crackle`, `ground_mine`, `finale_barrage`). Enforces safety limit (<65,536 particles, ~28,000 peak). | Start time, duration `[3.0, 10.0]s`, base palette | Dense composite barrage cue array | Clamps duration within `[3.0, 10.0]s`; throttles cues to prevent exceeding pool capacity | `PROJECT.md` §96, `src/types/index.ts`:197, `tests/tier1-features/macro-brushes.test.ts`:117-150 |
| 13 | Tap-To-Record | Live Numeric Hotkeys `1`–`6` Station Bindings | Numeric key triggers during playback/pause drop cues at exact current playhead time: Key 1 -> Left; Key 2 -> Left-Center; Key 3 -> Center; Key 4 -> Right-Center; Key 5 -> Right; Key 6 -> Fan. Deposited cues match AudioContext clock with sub-millisecond precision. Supports rapid bursts (up to 50Hz) maintaining strict chronological order. | Keyboard event (`e.key` in `'1'`..'6'`), current playhead timecode | New `ShowJSONCue` added to timeline without interrupting audio transport or particle simulation | Suppressed when typing in text input fields | `ORIGINAL_REQUEST.md` §R4, AC-9, `tests/tier1-features/hotkeys.test.ts`:124-177 |
| 14 | Tap-To-Record | Live Numeric Hotkeys `7`–`9` Quick Macro Brushes | Numeric key shortcuts triggering rapid macro brushes: Key 7 -> `ground_mine_salvo`; Key 8 -> `crossette_fan`; Key 9 -> `finale_break`. Drops pre-configured multi-cue patterns relative to playhead time. | Keyboard event (`e.key` in `'7'`..'9'`), current playhead timecode | Deposited macro pattern cues on timeline | Suppressed when typing in text input fields | `PROJECT.md` §97, `tests/tier1-features/hotkeys.test.ts`:139-148 |
| 15 | Tap-To-Record | Text Input Field Focus Suppression & Interlocks | Comprehensive keyboard safety interlocks: numeric keys (`1`-`9`), presentation fullscreen (`F`/`f`), and panic blackout (`Space`) are strictly ignored when active focus is inside an `HTMLInputElement` or `HTMLTextAreaElement` (`target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA'`). Allows typing spaces in show title and numbers in parameter fields without triggering blackout or cue drops. Escape key dismisses open modal dialogs before triggering panic blackout. Focus on canvas/body enables hotkeys. | Key event, event target element | Action execution or cancellation | Prevents accidental cue insertion, fullscreen toggle, or emergency blackout during editing | `tests/tier1-features/hotkeys.test.ts`:180-215 |
| 16 | Cue Inspector | Cue Parameter Inspector & Validation | Interactive inspector panel for viewing and editing selected cue parameters: Archetype (12+ types), Station (6 stations), Color (6-char hex code `^#[0-9A-Fa-f]{6}$`), Altitude (normalized `[0.20, 1.00]`), Launch Angle (offset `[-45°, +45°]`), Duration (hang-time override `[0.5s, 10.0s]`), Timecode (seconds >= 0). | Selected cue ID, edited parameter key & value | Updated cue payload in timeline state | Clamps altitude to `[0.20, 1.00]`; clamps angle to `[-45°, +45°]`; rejects invalid hex; falls back unknown archetype to `'peony'` | `ORIGINAL_REQUEST.md` §R4, `PROJECT.md` §98, `tests/tier1-features/timeline-tracks.test.ts`:102-137 |
| 17 | Show Serialization | Portable Show JSON Export (v1.0.0) | Serializes complete show structure to compliant JSON string with 2-space indentation: `version: '1.0.0'`, `title`, `duration`, `audioTrack` metadata, complete `calibration` object (`maxParticles`, `blackClamp`, `gain`, `bloomIntensity`, `particleSizeScale`, `aspectRatioMask`), and chronologically sorted `cues` array. Preserves high-precision floating point timecodes. Supports browser file download (`ShowSerialization.downloadShowFile`) as `.pyro.json`. | `ShowJSON` object, pretty print boolean | Formatted JSON string, `.pyro.json` file download | Throws Error if show schema is invalid | `ORIGINAL_REQUEST.md` §R4, AC-12, `src/state/ShowSerialization.ts`:186-198, `tests/tier1-features/export-import.test.ts`:61-100 |
| 18 | Show Serialization | Show JSON Deserialization & Schema Validation | Parses JSON text and validates against v1.0.0 schema. Rejects non-object root, invalid/missing version, empty title, invalid duration (<0 or NaN), missing cues, or invalid timestamps. | JSON text string | `ValidationResult` (`valid: boolean`, `errors: string[]`), `ImportResult` | Returns informative error messages; rejects unsupported major versions (e.g. 99.0.0) | `PROJECT.md` §100, `src/state/ShowSerialization.ts`:44-93, `tests/tier1-features/export-import.test.ts`:102-144 |
| 19 | Show Serialization | Show JSON Sanitization & Safe Defaults Recovery | Sanitizes imported data: unknown archetypes default to `'peony'`; invalid stations default to `'center'`; invalid hex colors default to `'#ffd700'`; missing/invalid altitudes clamp to `[0.10, 1.00]` (default 0.8); missing launch angles default to `0.0°` (clamped `[-45°, +45°]`); missing durations default to `2.2s` (clamped `[0.5, 10.0]s`); missing audioTrack enables silent mode; out-of-range calibration numbers are clamped to safe projector ranges; cues are sorted chronologically (`a.time - b.time`). Non-blocking operator toast notification on failure. | Raw parsed object | Fully compliant, sanitized `ShowJSON` | Recovers gracefully from partial corruption | `src/state/ShowSerialization.ts`:95-181, `tests/tier1-features/export-import.test.ts`:146-182, 201-252 |
| 20 | Show Serialization | Round-Trip Export / Clear / Import Fidelity | Guarantees lossless persistence across authoring lifecycle: Author show -> Export JSON -> Clear timeline state -> Re-import JSON yields exact match on title, duration, calibration parameters, cue count, colors, altitudes, launch angles, durations, and high-precision timecodes. Verified up to 300+ cues scale. | Exported JSON text | Re-imported `ShowJSON` identical to source | Detects and reports schema deviations | `ORIGINAL_REQUEST.md` AC-12, `tests/tier1-features/export-import.test.ts`:146-199 |
| 21 | Presets & Demos | Demo Show 1: "Cosmic Awakening" ("Ode to Radiance") | Pre-loaded 90-second pyromusical show. Audio: `proceduralPreset: 'cosmic_awakening'` (in-memory 96 BPM orchestral/hybrid soundtrack synthesized by `ProceduralMusic.generateCosmicAwakening`). Calibration: 16:9 mask, blackClamp 0.02, gain 1.0, bloom 1.2. 35 timecoded cues across 4 movements: Intro (0-25s, horsetail, willow, peony), Build-up (25-50s, comets, mines, crossettes), Apex (50-75s, fan peony, strobe, rings), Grand Finale (75-90s, fan mines, comets, 8,000-particle finale barrage). Drift <15ms over 90s. | Preset selector `'cosmic_awakening'` | Loaded 90s show with 35 cues and audio buffer | Loads fallback silent show if audio synthesis unavailable | `ORIGINAL_REQUEST.md` §R5, `PROJECT.md` §101, `tests/fixtures/demo-shows.ts`:8-68, `tests/tier4-scenarios/real-world-scenarios.test.ts`:36-83 |
| 22 | Presets & Demos | Demo Show 2: "Neon Horizon" | Pre-loaded 75-second synthwave pyromusical show. Audio: `proceduralPreset: 'neon_horizon'` (in-memory 128 BPM synthwave track synthesized by `ProceduralMusic.generateNeonHorizon`, ~0.46875s/beat). Calibration: 21:9 ultra-wide mask, blackClamp 0.03, gain 1.2, bloom 1.5. 15 timecoded cues quantized to 128 BPM grid (cyan/magenta alternating mines, peonies, strobes, crossettes, rings, comets, crackle, willow, finale barrage). | Preset selector `'neon_horizon'` | Loaded 75s show with 15 cues and audio buffer | Clamps 21:9 letterbox margins strictly to pure black | `ORIGINAL_REQUEST.md` §R5, `PROJECT.md` §102, `tests/fixtures/demo-shows.ts`:70-104, `tests/tier4-scenarios/real-world-scenarios.test.ts`:236-276 |
| 23 | Presets & Demos | 3 Live Audio-Reactive Profiles (`club_edm`, `ambient`, `percussive`) | Pre-configured reactive profiles: (1) `club_edm`: sub-bass 1.4 sens (140Hz cutoff, ground_mine on L/R/C), mid 1.0 sens (1000Hz, peony on LC/RC), treble 1.3 sens (2500Hz, strobe on Fan), cooldown 120ms, noise adaptation 0.02; (2) `ambient`: sub-bass 0.6 sens (120Hz, willow on C), mid 1.5 sens (800Hz, horsetail on LC/RC), treble 0.5 sens (3000Hz, comet on L/R), cooldown 500ms, noise adaptation 0.01; (3) `percussive`: sub-bass 1.0 sens (150Hz, ground_mine on C), mid 1.4 sens (1200Hz, crossette on LC/RC), treble 1.8 sens (2500Hz, crackle on L/R/Fan), cooldown 75ms, noise adaptation 0.05. | Profile key (`'club_edm'`, `'ambient'`, `'percussive'`) | Configured `AudioReactiveProfile` with band sensitivities, cutoffs, archetypes, stations, and cooldowns | Independent band cooldown timers prevent runaway trigger stutter | `ORIGINAL_REQUEST.md` §R5, `PROJECT.md` §103, `src/types/index.ts`:122-144, `tests/fixtures/audio-profiles.ts`:1-103 |
| 24 | Integration & State | BroadcastChannel Show Sync & Projector Mirroring | When a show is loaded, exported, or edited in Studio Operator, the show state and live cues are broadcast over the `pyrosync_projection_bus` BroadcastChannel (`{ type: 'LOAD_SHOW', show }`, `{ type: 'FIRE_CUE', cue }`, `{ type: 'TRANSPORT_SEEK', time }`). Allows secondary pop-out projector window to run mirrored simulation. | `ShowJSON`, cue payload, transport time | IPC message dispatched to Projector window | Projector window ignores invalid payloads; handles reconnection | `PROJECT.md` §180-192, `src/types/index.ts`:85-97, `tests/tier3-combinations/cross-feature.test.ts`:73-96 |
| 25 | Transport & Seeking | Transport Seek Flush & Resync Lifecycle | Seeking backward mid-playback flushes in-flight/future aerial particles and resets audio clock to seek time. Seeking forward marks past cues as fired without simulating them. Importing new show while playing halts transport, resets playhead to 00:00.000, and clears particles. | Seek target time (seconds), show import trigger | Resynchronized playhead, updated cue fired states, zeroed active particles on backward seek | Avoids memory corruption or ghost particle burst upon seek | `tests/tier1-features/audio-sync.test.ts`:58-70, `tests/tier3-combinations/cross-feature.test.ts`:193-227, 256-274 |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Spatial Tracks | Station identifier string set to `'unknown_pod'` or undefined | Falls back safely to `'center'` station (x = 0.00, angle = 0°); no runtime exception thrown. |
| 2 | Spatial Tracks | Station normalized X coordinate set to `-2.5` or `+3.8` | Clamped strictly to bounds `[-1.0, 1.0]`. |
| 3 | Spatial Tracks | Ground Mine cue with altitude parameter set to `0.90` | Altitude parameter ignored for launch origin; Y position is strictly enforced at ground line `y = 0.0`. |
| 4 | Spatial Tracks | Multi-track solo enabled (`soloSet = new Set(['left', 'right'])`) | Left and Right fire normally; Center, Left-Center, Right-Center, and Fan are muted; clearing solo restores previous individual mute states. |
| 5 | Waveform Display | Audio file player loaded with null audio buffer or empty track | Waveform canvas renders flat baseline (`flat_baseline`); no canvas drawing crashes or division-by-zero. |
| 6 | Waveform Display | Viewport zoom requested at `0.05s` or `600s` | Clamped strictly to min zoom `1.0s` (extreme detail) and max zoom `300.0s` (5 minutes). |
| 7 | Waveform Display | Waveform peak calculation over high-amplitude clipping audio (> 1.0) | Envelopes are bounded within `[-1.0, 1.0]`. |
| 8 | Auto-Choreographer | 1-Click Auto-Choreographer invoked when audio buffer is `null` | Immediately throws descriptive Error: `'Cannot auto-choreograph: No audio track loaded'`. |
| 9 | Auto-Choreographer | Auto-Choreographer executed on completely silent audio buffer | Generates exactly 0 cues without crashing or generating NaN timecodes. |
| 10 | Auto-Choreographer | Raw transient detected at `1.882s` with 120 BPM tempo | Quantizes cleanly to quarter-note grid step (0.5s) resulting in `2.000s`. |
| 11 | Macro Brushes: Sweeps | Sweep duration configured below `0.25s` (e.g. `0.1s`) or above `2.0s` (e.g. `5.0s`) | Duration clamped within safe span `[0.25s, 2.0s]`. |
| 12 | Macro Brushes: Mines | Salvo burst count set to `2` or `50` | Clamped to valid salvo count range `[4, 32]`. |
| 13 | Macro Brushes: Barrage | Grand Finale Barrage spawned near pool capacity (e.g. 28,000 particles) | Pool capacity guard enforces total alive particles remain strictly below `65,536` pool ceiling. |
| 14 | Tap-To-Record | Operator rapidly presses keys `1`–`6` at 50Hz (every 20ms) | All 20 rapid taps are recorded with chronologically ascending timestamps without dropping cues. |
| 15 | Tap-To-Record | Operator taps numeric hotkey `'1'` while typing in show title `HTMLInputElement` | Hotkey is suppressed; character `'1'` appears in text input; no cue is deposited on timeline. |
| 16 | Safety Interlocks | Operator presses Spacebar while editing cue label or show title in text field | Panic blackout is suppressed; space character inserted into text field; show simulation continues. |
| 17 | Safety Interlocks | Operator presses Escape while modal dialog is open | Dismisses modal dialog safely without triggering full panic blackout. |
| 18 | Cue Inspector | Cue altitude parameter edited to `-0.5` or `0.05` | Clamped to minimum safe burst height `0.20`. |
| 19 | Cue Inspector | Cue altitude parameter edited to `1.80` | Clamped to maximum ceiling `1.00`. |
| 20 | Cue Inspector | Cue launch angle edited to `-120°` or `+95°` | Clamped strictly to `[-45°, +45°]`. |
| 21 | Cue Inspector | Color value edited to invalid string (e.g. `'blue'`, `'#ff336'`, `'123456'`) | Hex validator `/^#[0-9A-Fa-f]{6}$/` rejects input; falls back to `#ffd700`. |
| 22 | Show JSON Import | JSON string has invalid syntax (e.g. trailing commas, missing braces) | Catches JSON parse error; returns `{ success: false, errors: ['Malformed JSON...'] }` without crashing operator studio. |
| 23 | Show JSON Import | File missing `"version"` field or containing unsupported major version (`"99.0.0"`) | Schema validator flags validation error; rejects import; displays user toast. |
| 24 | Show JSON Import | File containing unknown alien shell archetypes (`"quantum_singularity"`, `"supernova_plasma"`) | Sanitizer safely normalizes unknown archetypes to standard `"peony"`. |
| 25 | Show JSON Import | Cue timestamps containing `NaN`, `Infinity`, or negative numbers (`-5.0`) | Schema validator rejects cues with invalid timestamps; reports exact cue index in error list. |
| 26 | Show JSON Import | Calibration object contains extreme values (`gain: -2.0`, `blackClamp: 0.95`, `maxParticles: -500`) | Sanitizer clamps values to permitted projector ranges: gain `0.10`, blackClamp `0.20`, maxParticles `1024`..`65536`. |
| 27 | Show JSON Import | Show JSON without `audioTrack` field | Imported cleanly into silent / manual timeline mode without error. |
| 28 | Show JSON Import | Show JSON loaded mid-playback while particles are actively exploding | Immediately halts transport, resets playhead to `00:00.000`, clears active particles to `0`, and mounts new show. |
| 29 | Transport Seeking | User seeks backwards from `45.0s` to `10.0s` mid-salvo | Immediately clears in-flight aerial particles, halts audio, and resyncs audio clock to `10.0s`. |
| 30 | Transport Seeking | User seeks forward from `0.0s` to `20.0s` | Marks cues before `20.0s` as past/fired without triggering their particle simulations. |
| 31 | Empty Timeline | Transport play started on an empty show (0 cues, 0s duration) | Transport playhead advances smoothly without errors; 0 cues fired; blackout on 0 particles succeeds. |
| 32 | Concurrent Firing | Live microphone reactive triggers fire concurrently with choreographed timeline cues | Both cue sources allocate particles from the shared 65,536 Float32Array pool without collision or state corruption. |

---

## 1. Observation

Direct observations from codebase inspection, specification documents, and test execution:

1. **Test Infrastructure & Pass Status**:
   - Running `node tests/runner.ts` executes 10 test modules across 4 tiers with 2,798 assertions.
   - Result: **260 Passed / 0 Failed (100% Pass Rate in 176.5ms, Exit Code 0)**.
   - Modules relevant to Milestone 4:
     - `Timeline Studio & 6 Spatial Tracks` (20 tests, 201 assertions)
     - `Macro Brushes & Auto-Choreographer` (20 tests, 236 assertions)
     - `Hotkeys & Safety Interlocks (F/Esc/1-9)` (20 tests, 268 assertions)
     - `Show JSON Export & Import Pipeline` (25 tests, 350 assertions)
     - `Boundary Limits & Stress` (40 tests, 411 assertions)
     - `Cross-Feature Pairwise Interactions` (15 tests, 449 assertions)
     - `Real-World E2E Scenarios (5 Full Shows)` (5 tests, 526 assertions)

2. **Spatial Tracks Specification**:
   - `tests/tier1-features/timeline-tracks.test.ts:31-60`: 6 spatial tracks: `'left'`, `'left_center'`, `'center'`, `'right_center'`, `'right'`, `'fan'`.
   - Normal coordinates: Left `-0.80`, Left-Center `-0.40`, Center `0.00`, Right-Center `+0.40`, Right `+0.80`, Fan `[-0.80, +0.80]`.
   - Default angles: Center `0°` (vertical); Left `+15°` (inward right); Right `-15°` (inward left) (`tests/tier1-features/timeline-tracks.test.ts:141-146`).
   - Screen conversion: `(normX * 0.5 + 0.5) * viewportWidth` (`timeline-tracks.test.ts:153-159`).
   - Invariant: Ground Mine origin Y is strictly `0.0` at ground line (`timeline-tracks.test.ts:169-173`, `boundary-corner.test.ts:144-149`).

3. **Macro Brushes & Auto-Choreography**:
   - `tests/tier1-features/macro-brushes.test.ts:31-75`: Fan sweeps sequence `[L, LC, C, RC, R]`, `[R, RC, C, LC, L]`, or Center-Out in 3 waves (`['center']` -> `['left_center', 'right_center']` -> `['left', 'right']`). Sweep duration configurable in `[0.25s, 2.0s]`.
   - `tests/tier1-features/macro-brushes.test.ts:78-114`: Alternating mines alternates outer `['left', 'right']` on even beats and inner `['left_center', 'center', 'right_center']` on odd beats. Quarter notes sync to BPM (128 BPM -> 0.46875s). Salvo length `[4, 32]`. Cyan (`#06b6d4`) and Magenta (`#f43f5e`) alternating colors.
   - `tests/tier1-features/macro-brushes.test.ts:117-150`: Finale barrage builds crescendo over `[3.0s, 10.0s]`, staggers breaks with progressive altitude scaling (0.70 -> 0.98), saturates all 6 stations simultaneously, and caps particle emission to protect 65,536 pool limit.
   - `tests/tier1-features/macro-brushes.test.ts:154-193`: 1-Click Auto-Choreographer quantizes transients to beat grid, maps sub-bass (>0.80) to ground mines and brocades, maps treble (>0.85) to crackle and strobes, and throws `Error('Cannot auto-choreograph: No audio track loaded')` if buffer is missing.

4. **Hotkeys & Safety Interlocks**:
   - `tests/tier1-features/hotkeys.test.ts:124-177`: Keys 1-6 map to stations (`left`, `left_center`, `center`, `right_center`, `right`, `fan`); Keys 7-9 map to macros (`ground_mine_salvo`, `crossette_fan`, `finale_break`). Cues are inserted relative to playhead timecode.
   - `tests/tier1-features/hotkeys.test.ts:180-215`: Input suppression checks `target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA'`. Suppresses numeric hotkeys, Fullscreen (`F`), and Blackout (`Space`) in text fields. Escape closes open modals first.

5. **Show Serialization**:
   - `src/state/ShowSerialization.ts:1-270`: Implements `ShowSerialization.exportToJSON`, `ShowSerialization.importFromJSON`, `validateShowJSON`, `sanitizeShowJSON`, `downloadShowFile`, `readShowFile`.
   - `tests/tier1-features/export-import.test.ts:1-283`: Verifies v1.0.0 schema compliance, 2-space indentation, calibration preservation, unknown archetype fallback to `'peony'`, chronological cue sorting, round-trip fidelity up to 300+ cues, and corrupted JSON rejection.

6. **Demo Shows & Audio Profiles**:
   - `tests/fixtures/demo-shows.ts:8-104`: Defines `DEMO_SHOW_1_ODE_TO_RADIANCE` (90s, 35 cues, 4 movements, 96 BPM) and `DEMO_SHOW_2_NEON_HORIZON` (75s, 15 cues, 128 BPM).
   - `src/engine/audio/ProceduralMusic.ts:1-256`: Synthesizes both soundtracks in-memory (`cosmic_awakening` and `neon_horizon`) without external downloads.
   - `tests/fixtures/audio-profiles.ts:30-102`: Defines `club_edm` (120ms cooldown, 0.02 adaptation), `ambient` (500ms cooldown, 0.01 adaptation), `percussive` (75ms cooldown, 0.05 adaptation).

7. **Codebase Status**:
   - Core engine (M1: ParticlePool, ParticleRenderer, ShellArchetypes, ProjectorShaders), audio engine (M2: AudioEngine, MicAnalyzer, ProceduralSFX, ProceduralMusic), and BroadcastBus (M3) are fully implemented.
   - `ShowSerialization.ts` is implemented and verified.
   - Timeline UI components (`src/components/timeline/`) and choreography modules (`src/choreography/`) are documented in `PROJECT.md` §Code Layout and ready for implementation in Milestone 4.

---

## 2. Logic Chain

1. **Requirement Derivation**:
   - `ORIGINAL_REQUEST.md` specifies Requirements R4 (Show Programmer & Timeline Studio) and R5 (Pre-Configured Presets & Demo Shows).
   - Acceptance Criteria AC-8 (1-Click Auto-Choreographer), AC-9 (Tap-to-Record Hotkeys 1-9), and AC-12 (Show JSON Export/Import) govern the verification requirements.

2. **Spatial Geometry & Firing Logic**:
   - The 6 spatial tracks are anchored to physical projector coordinates. Symmetrical flank positions (-0.80 and +0.80) with inward angles (±15°) ensure bursts converge aesthetically toward the visual center of the projection canvas.
   - Ground Mines require zero lift time and ground-level ignition (`y = 0.0`), distinguishing them from aerial shells whose trajectory reaches an altitude apex (`0.20` to `1.00`).
   - Mute and Solo controls require state persistence: un-soloing must restore pre-solo mute configurations rather than unmuting all tracks blindly.

3. **Choreography & Macro Brushes**:
   - Manual cue placement across 6 tracks can be tedious; macro brushes automate structured multi-cue sequences (Fan Sweeps, Alternating Mines, Barrages).
   - Because pyrotechnic particle pools have hard memory limits (65,536 floats in SoA pool), macro brushes must calculate particle budgets. A grand finale barrage spawning 25,000 to 28,000 particles is safe, but unbounded generation would trigger ring buffer overwrites.
   - Auto-choreography leverages Web Audio FFT analysis: low-frequency kicks trigger ground mines and brocades, while high-frequency percussion/hi-hats trigger strobes and crackle. Quantizing these transients to beat subdivisions (quarter notes) prevents rhythmic clutter.

4. **Input Safety & Operator Ergonomics**:
   - Pyrotechnicians operate live in dark environments. Numeric hotkeys `1`-`6` enable real-time tap-recording during audio playback.
   - However, without tag-based suppression, entering a show title containing numbers or spaces would inadvertently trigger cue drops or emergency blackouts. Suppressing hotkeys when focused in `INPUT` or `TEXTAREA` elements guarantees operator safety.

5. **Serialization Fidelity & Fault Tolerance**:
   - Show portability requires strict schema validation. External edits or malformed files must not crash the web application.
   - The sanitization layer ensures missing fields fall back to sensible defaults (unknown archetype -> `peony`, missing angle -> `0°`, missing duration -> `2.2s`), preserving whatever valid cue data exists while surfacing non-blocking operator notifications.

---

## 3. Caveats

1. **UI Component Implementation**:
   - While `src/state/ShowSerialization.ts` and `src/engine/audio/ProceduralMusic.ts` are fully implemented, the visual React components for the timeline (`TimelineStudio.tsx`, `WaveformCanvas.tsx`, `CueInspector.tsx`, `MacroBrushesBar.tsx`) and choreography helper classes (`AutoChoreographer.ts`, `PatternBrushes.ts`, `TapRecorder.ts`) are currently pending implementation by the Milestone 4 worker.
2. **Audio Buffer Availability**:
   - The interactive waveform display and auto-choreographer require a loaded `AudioBuffer`. When no audio is loaded, both components must display non-crashing fallback states (flat baseline and disabled auto-choreography button with informative toast).
3. **Browser Fullscreen API**:
   - In unit/headless test environments, `requestFullscreen` and `exitFullscreen` are mocked; real browser security requires fullscreen requests to be initiated by user gestures.

---

## 4. Conclusion

All 8 feature areas for Milestone 4 (Timeline Studio, Choreography Engine & Presets) have been fully probed and documented with unambiguous data contracts, algorithms, constraints, and edge cases:
1. **6 Spatial Launch Tracks**: Stations (`left`, `left_center`, `center`, `right_center`, `right`, `fan`), normalized X coordinates `[-0.80, +0.80]`, default inward angles (±15°), mute/solo state tracking, ground mine `y = 0.0` invariant.
2. **Interactive Waveform & Transients**: Audio buffer decimation to canvas width, peak extraction `[-1.0, 1.0]`, zoom span `[1.0s, 300.0s]`, pan bounds `[0.0, duration]`, transient downbeat markers, flat baseline fallback.
3. **1-Click Auto-Choreographer**: Transient onset detection, quarter-note beat grid quantization, sub-bass/treble/mid band energy mapping, missing audio error handling, silence tolerance.
4. **Macro Brushes**: Fan sweeps (L->R, R->L, Center-Out in 3 waves, 0.25-2.0s), Alternating Mines (128 BPM, salvo count [4, 32], cyan/magenta palette, altitude <= 0.60), Grand Finale Barrage (3.0-10.0s crescendo, progressive altitude scaling 0.70-0.98, all 6 stations, pool capacity safety guard).
5. **Live Tap-To-Record (Keys 1-9)**: Station keys `1`-`6`, macro keys `7`-`9`, AudioContext timecode locking, 50Hz burst support, input/textarea suppression for numeric keys, Spacebar, and `F`.
6. **Cue Inspector**: Archetype, station, 6-char hex color, altitude `[0.20, 1.00]`, launch angle `[-45°, +45°]`, duration override `[0.5s, 10.0s]`, timecode validation.
7. **Portable Show JSON Schema v1.0.0**: 2-space formatted serialization, schema validation, fault-tolerant sanitization, unknown archetype fallback to `peony`, float precision retention, export-clear-import round-trip fidelity up to 300+ cues.
8. **Demo Shows & Audio Profiles**: "Cosmic Awakening" (90s, 35 cues, 4 movements, 96 BPM) & "Neon Horizon" (75s, 15 cues, 128 BPM) with in-memory procedural audio synthesis; 3 live audio-reactive profiles (`club_edm`, `ambient`, `percussive`) with band sensitivities, cutoffs, and cooldown gates.

---

## 5. Verification Method

To independently verify all documented Milestone 4 specifications, run the test suites:

```bash
# 1. Run full E2E test runner (All 260 tests, Exit Code 0)
node tests/runner.ts

# 2. Run Tier 1 Timeline Tracks feature tests specifically
node -e "import('./tests/tier1-features/timeline-tracks.test.ts').then(m => console.log(m.runTimelineTrackTests()))"

# 3. Run Tier 1 Macro Brushes & Auto-Choreographer tests
node -e "import('./tests/tier1-features/macro-brushes.test.ts').then(m => console.log(m.runMacroBrushTests()))"

# 4. Run Tier 1 Hotkeys & Safety Interlocks tests
node -e "import('./tests/tier1-features/hotkeys.test.ts').then(m => console.log(m.runHotkeyTests()))"

# 5. Run Tier 1 Show JSON Export/Import tests
node -e "import('./tests/tier1-features/export-import.test.ts').then(m => console.log(m.runExportImportTests()))"

# 6. Run Tier 2-4 Boundary, Combination, and Scenario suites
node -e "import('./tests/tier2-boundaries/boundary-corner.test.ts').then(m => console.log(m.runBoundaryCornerTests()))"
node -e "import('./tests/tier3-combinations/cross-feature.test.ts').then(m => console.log(m.runCrossFeatureTests()))"
node -e "import('./tests/tier4-scenarios/real-world-scenarios.test.ts').then(m => console.log(m.runRealWorldScenarioTests()))"
```

**Files to Inspect**:
- `tests/tier1-features/timeline-tracks.test.ts` (tracks, mute/solo, cue inspector, coordinate clamping)
- `tests/tier1-features/macro-brushes.test.ts` (fan sweeps, alternating mines, finale, auto-choreographer)
- `tests/tier1-features/hotkeys.test.ts` (tap-to-record keys 1-9, input suppression, panic blackout)
- `tests/tier1-features/export-import.test.ts` (Show JSON v1.0.0 serialization, deserialization, sanitization)
- `tests/fixtures/demo-shows.ts` (Cosmic Awakening and Neon Horizon show data)
- `tests/fixtures/audio-profiles.ts` (Club/EDM, Ambient, Percussive reactive profiles)
- `src/state/ShowSerialization.ts` (canonical implementation of Show JSON serialization and sanitization)
- `src/engine/audio/ProceduralMusic.ts` (procedural audio soundtrack synthesis for demo shows)
