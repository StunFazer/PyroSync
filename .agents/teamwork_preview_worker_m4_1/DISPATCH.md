## 2026-09-13T17:22:28Z
You are the Milestone 4 Worker for the PyroSync project.
Working directory: c:/Users/Beame/Documents/antigravity/zealous-shannon/.agents/teamwork_preview_worker_m4_1
Parent Orchestrator ID: 760a1ce8-67c8-40cd-a27f-e795b3a86299
Workspace root: c:/Users/Beame/Documents/antigravity/zealous-shannon

Mandatory Input Files:
- ORIGINAL_REQUEST.md: c:/Users/Beame/Documents/antigravity/zealous-shannon/ORIGINAL_REQUEST.md (You MUST read this before starting work)
- PROJECT.md: c:/Users/Beame/Documents/antigravity/zealous-shannon/PROJECT.md
- Spec Report: c:/Users/Beame/Documents/antigravity/zealous-shannon/.agents/teamwork_preview_spec_miner_survey_1/spec_report.md
- Studio & Display Architecture: c:/Users/Beame/Documents/antigravity/zealous-shannon/.agents/teamwork_preview_explorer_survey_2/studio_display_architecture.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope of Milestone 4 (Timeline Studio, Choreography Engine & Presets):
1. Show Manager & State (`src/state/ShowManager.ts`):
   - Comprehensive state management for timeline cues, track assignment, cue selection, multi-selection, time scrubhead, playback scheduling, undo/redo history.
   - Schedules cue dispatch to local FireworksSimulation AND to secondary window via BroadcastBus.
2. 6-Track Spatial Timeline (`src/components/timeline/TimelineStudio.tsx`):
   - Multi-track timeline lanes representing the 6 spatial stations: Left, Left-Center, Center, Right-Center, Right, and Fan.
   - Smooth playhead scrubbing, zooming (seconds-per-pixel scaling) and horizontal panning.
   - Render interactive cue blocks with archetype badges, color swatches, and drag/reposition handles.
3. Interactive Audio Waveform Canvas (`src/components/timeline/WaveformCanvas.tsx`):
   - High-performance canvas-based waveform display rendered from AudioEngine min/max decimation.
   - Transient peak markers visually rendered as vertical accent lines at audio downbeats.
   - Scrubbing/clicking on waveform seeks audio player, timeline playhead, and simulation clock synchronously.
4. 1-Click Auto-Choreographer (`src/choreography/AutoChoreographer.ts`):
   - Algorithmic generator analyzing audio downbeats, energy drops, and spectral flux.
   - Automatically populates the timeline with rhythmic, synchronized fireworks cues across the 6 stations.
   - Musical structuring: intros use subtle peony/horsetail; build-ups use comets and alternating mines; drops/choruses use big chrysanthemums, brocades, and rings; finales use rapid barrages.
   - Density settings: Low, Medium, High.
5. Macro Pattern Brushes (`src/choreography/PatternBrushes.ts`):
   - Rapid authoring macro tools:
     - Fan sweeps (L->R, R->L, Center-Out)
     - Alternating ground mines (staggered bursts across outer and inner stations)
     - Grand finale barrages (dense multi-station salvo crescendo)
6. Live Tap-To-Record Hotkeys (`1`–`9`) (`src/choreography/TapRecorder.ts`):
   - Numeric keys `1`–`9` mapped to shell archetypes and stations.
   - Pressing during playback drops timecoded cues onto tracks at the current playhead in real time and fires live preview shells.
   - Hotkeys suppressed inside text input fields.
7. Cue Inspector Panel (`src/components/timeline/CueInspector.tsx`):
   - Inspector panel to edit selected cue parameters: shell archetype, color palette (hex/swatches), altitude (0.2 to 1.0), launch angle (-30° to +30°), duration, station assignment.
8. Portable Show JSON Serialization (`src/state/ShowSerialization.ts`):
   - Export show to valid portable JSON file matching `ShowJSON` schema.
   - Import JSON show with validation, sanitization, and graceful error handling on corrupt input.
9. Presets & Demo Shows (`src/state/Presets.ts`):
   - 2 complete choreographed demo shows with rich timelines and synchronized audio:
     - Demo Show 1: "Cosmic Awakening" (90s, cinematic orchestral hybrid, rich 4-act cue sequence with grand finale).
     - Demo Show 2: "Neon Horizon" (75s, synthwave/cyberpunk, fast fan sweeps, alternating mines, strobes, and barrages).
   - 3 pre-configured live audio-reactive profiles: Club/EDM, Ambient, Percussive.
10. Studio UI Integration (`src/app/App.tsx`):
   - Mount TimelineStudio, WaveformCanvas, CueInspector, MacroBrushes, Preset selector, Auto-Choreographer button, Tap-to-record, and JSON Export/Import buttons into the operator studio.

Write Ownership:
You own: `src/components/timeline/*`, `src/choreography/*`, `src/state/ShowManager.ts`, `src/state/ShowSerialization.ts`, `src/state/Presets.ts`, `src/app/App.tsx`, `src/types/index.ts`.
You MUST NOT write to `tests/*`.

Verification:
- Run `npm run build` and ensure 0 TypeScript or bundler errors.
- Run `npm test` and ensure all 260 tests pass with 0 regressions.
- Write `progress.md` and `handoff.md` in your working directory.
- When done, send a message to parent (ID: 760a1ce8-67c8-40cd-a27f-e795b3a86299).
