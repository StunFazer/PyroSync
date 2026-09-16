## 2026-09-14T04:26:00Z
You are teamwork_preview_worker_m4_2.
Working directory: c:/Users/Beame/Documents/antigravity/zealous-shannon/.agents/teamwork_preview_worker_m4_2
Workspace root: c:/Users/Beame/Documents/antigravity/zealous-shannon
Original Request File: c:/Users/Beame/Documents/antigravity/zealous-shannon/ORIGINAL_REQUEST.md (You MUST read this file first).
Scope document: c:/Users/Beame/Documents/antigravity/zealous-shannon/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Carefully read the complete exploration and blueprint handoffs before implementing:
1. c:/Users/Beame/Documents/antigravity/zealous-shannon/.agents/teamwork_preview_spec_miner_m4_1/handoff.md
2. c:/Users/Beame/Documents/antigravity/zealous-shannon/.agents/teamwork_preview_explorer_m4_1/handoff.md
3. c:/Users/Beame/Documents/antigravity/zealous-shannon/.agents/teamwork_preview_explorer_m4_2/handoff.md

Your Objective for Milestone 4 (Timeline Studio, Choreography Engine & Presets):
Implement all components and integration required for Milestone 4:
1. Fix TS7006 error in `src/state/ShowSerialization.ts` at line 171 by explicitly typing `(a: ShowJSONCue, b: ShowJSONCue)`.
2. Implement `src/state/Presets.ts` with:
   - Demo Show 1: "Cosmic Awakening" (90s, 35 cues, 4 movements, 96 BPM)
   - Demo Show 2: "Neon Horizon" (75s, 15 cues, 128 BPM)
   - 3 Live Audio-Reactive Profiles: `club_edm`, `ambient`, `percussive`
3. Implement `src/state/ShowManager.ts`:
   - Timeline cue management (CRUD, chronological sorting, zero-allocation cursor playback loop with O(log N) binary search seek)
   - Track mute/solo state machine with pre-solo mute restoration
   - Undo/redo command history
   - Playhead timecode synchronization with AudioEngine
4. Implement `src/choreography/PatternBrushes.ts`:
   - Fan Sweeps (L->R, R->L, Center-Out)
   - Alternating Mines (128 BPM quarter note sync, ground line y=0 constraint)
   - Grand Finale Barrages (crescendo, staggered altitudes, 6-station saturation, particle safety budget)
5. Implement `src/choreography/AutoChoreographer.ts`:
   - 1-Click auto-choreography from AudioBuffer: downbeat / transient detection, spectral energy band mapping, beat grid quantization
   - Descriptive error thrown if no audio loaded; 0 cues on silence
6. Implement `src/choreography/TapRecorder.ts`:
   - Numeric hotkeys 1-6 for spatial stations, 7-9 for quick macro brushes
   - Playhead-relative cue insertion
   - Keyboard event listener with strict suppression when focused on INPUT or TEXTAREA elements
   - 'F' fullscreen and 'Esc'/'Space' panic blackout integration
7. Implement UI components in `src/components/timeline/`:
   - `WaveformCanvas.tsx`: OffscreenCanvas or Canvas rendering peak min/max envelopes with zoom/pan and transient peak markers
   - `CueInspector.tsx`: Inspector panel for cue parameters (archetype, station, color palette, altitude, launch angle, duration)
   - `MacroBrushesBar.tsx`: Macro pattern brush triggers and 1-click auto-choreograph button
   - `TimelineStudio.tsx`: Multi-track timeline dock with 6 spatial tracks (Left, Left-Center, Center, Right-Center, Right, Fan), playhead scrubber, zoom controls, track mute/solo toggles
8. Integrate into `src/app/App.tsx`:
   - Dock TimelineStudio at bottom of Operator Studio
   - Wire up ShowManager, AudioEngine, SimulationLoop, and BroadcastBus
   - Ensure Presentation Fullscreen ('F') hides all studio chrome leaving pure canvas, and Panic ('Esc'/'Space') stops transport, clears particles, and mutes audio.

Write Ownership:
You exclusively own:
- `src/state/ShowSerialization.ts`
- `src/state/ShowManager.ts`
- `src/state/Presets.ts`
- `src/choreography/AutoChoreographer.ts`
- `src/choreography/PatternBrushes.ts`
- `src/choreography/TapRecorder.ts`
- `src/components/timeline/WaveformCanvas.tsx`
- `src/components/timeline/CueInspector.tsx`
- `src/components/timeline/MacroBrushesBar.tsx`
- `src/components/timeline/TimelineStudio.tsx`
- `src/app/App.tsx`
