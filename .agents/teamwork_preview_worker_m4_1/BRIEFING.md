# BRIEFING — 2026-09-13T17:22:28Z

## Mission
Implement Milestone 4 (Timeline Studio, Choreography Engine & Presets) for PyroSync, fully integrated into Studio UI and tested against all existing test suites with zero regressions.

## 🔒 My Identity
- Archetype: teamwork_preview_worker_m4_1
- Roles: implementer, qa, specialist
- Working directory: c:/Users/Beame/Documents/antigravity/zealous-shannon/.agents/teamwork_preview_worker_m4_1
- Original parent: 760a1ce8-67c8-40cd-a27f-e795b3a86299
- Milestone: Milestone 4 (Timeline Studio, Choreography Engine & Presets)

## 🔒 Key Constraints
- DO NOT CHEAT: genuine logic, real state, real behavior. No hardcoding or dummy implementations.
- Write Ownership: `src/components/timeline/*`, `src/choreography/*`, `src/state/ShowManager.ts`, `src/state/ShowSerialization.ts`, `src/state/Presets.ts`, `src/app/App.tsx`, `src/types/index.ts`.
- MUST NOT write to `tests/*`.
- Verify: `npm run build` (0 TS/bundler errors) and `npm test` (all 260 tests pass with 0 regressions).
- Handoff report in `handoff.md`, progress in `progress.md`.

## Current Parent
- Conversation ID: 760a1ce8-67c8-40cd-a27f-e795b3a86299
- Updated: not yet

## Task Summary
- **What to build**:
  1. Show Manager & State (`src/state/ShowManager.ts`): state, selection, scrubhead, scheduling, undo/redo, local + BroadcastBus dispatch.
  2. 6-Track Spatial Timeline (`src/components/timeline/TimelineStudio.tsx`): 6 spatial stations, scrubbing, zooming, panning, interactive cue blocks.
  3. Interactive Audio Waveform Canvas (`src/components/timeline/WaveformCanvas.tsx`): min/max decimation, transient peaks, synchronous seeking.
  4. 1-Click Auto-Choreographer (`src/choreography/AutoChoreographer.ts`): downbeat/energy/flux analysis, musical structure, density.
  5. Macro Pattern Brushes (`src/choreography/PatternBrushes.ts`): fan sweeps, alternating ground mines, grand finale barrages.
  6. Live Tap-To-Record Hotkeys (`1`–`9`) (`src/choreography/TapRecorder.ts`): real-time cue dropping and preview firing, input suppression.
  7. Cue Inspector Panel (`src/components/timeline/CueInspector.tsx`): parameter editing.
  8. Portable Show JSON Serialization (`src/state/ShowSerialization.ts`): export and import with validation/sanitization.
  9. Presets & Demo Shows (`src/state/Presets.ts`): 2 demo shows ("Cosmic Awakening", "Neon Horizon"), 3 audio-reactive profiles.
  10. Studio UI Integration (`src/app/App.tsx`): integrate all components into operator studio.
- **Success criteria**: 0 TS/bundler errors on `npm run build`, all 260 tests pass on `npm test`, robust user-interactive timeline studio.
- **Interface contracts**: PROJECT.md, spec_report.md, studio_display_architecture.md
- **Code layout**: src/components/timeline/*, src/choreography/*, src/state/*, src/app/*, src/types/*

## Change Tracker
- **Files modified**: [TBD]
- **Build status**: [TBD]
- **Pending issues**: none

## Quality Status
- **Build/test result**: [TBD]
- **Lint status**: clean
- **Tests added/modified**: [TBD]

## Loaded Skills
- None specified by prompt

## Key Decisions Made
- [TBD]

## Artifact Index
- DISPATCH.md — Assignment from orchestrator
- BRIEFING.md — Working memory and context index
- progress.md — Liveness and step tracking
- handoff.md — 5-component completion report
