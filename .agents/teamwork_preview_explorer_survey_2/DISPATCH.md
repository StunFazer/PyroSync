## 2026-09-13T23:32:44Z

**From**: Parent Orchestrator (760a1ce8-67c8-40cd-a27f-e795b3a86299)
**Task**:
Conduct an architectural and technical feasibility investigation for R2 (Dual Display & Projection Output), R4 (Show Programmer & Timeline Studio), and R5 (Presets & Demo Shows).
Investigate and design:
1. Timeline Studio Architecture:
   - Multi-track timeline representation for the 6 spatial launch stations (Left, Left-Center, Center, Right-Center, Right, Fan).
   - High-performance canvas-based or SVG-based timeline with playhead, smooth scrolling, zoom (seconds per pixel), and cue snapping.
   - Interactive audio waveform renderer with peak transients markers.
   - 1-Click Auto-Choreographer algorithm: Audio peak detection / onset analysis that automatically generates a musical fireworks show synchronized to the beat and energetic build-ups/drops.
   - Macro pattern brushes: Fan sweeps (L to R / R to L / center out), alternating ground mines, grand finale barrages.
   - Live tap-to-record key bindings (`1`–`9` hotkeys) to drop timecoded cues during playback.
   - Cue Inspector panel (shell type, color palette, altitude, launch angle, duration).
   - Show JSON Schema (cues, audio track, calibration preset, duration, stations).
2. Dual Display & Projection Architecture:
   - BroadcastChannel API messaging protocol: message types, state sync (PLAY, PAUSE, SEEK, FIRE_CUE, BLACKOUT, SET_CALIBRATION, LOAD_SHOW).
   - Secondary Pop-out window (`window.open('/projector')` or route): full-screen borderless canvas, pure black background, auto-connecting to BroadcastChannel, receiver synchronization without lag.
   - Hotkeys: Fullscreen (`F`), Instant Blackout / Panic (`Esc` / `Space`) immediately clearing active aerial particles and halting cue firing.
3. Presets & Demo Shows:
   - 2 complete choreographed demo shows with rich timelines and synchronized audio.
   - 3 pre-configured live audio-reactive profiles (Club/EDM, Ambient, Percussive) with sensitivity, band thresholds, shell mappings.
4. Code layout and module boundaries for R2, R4, R5.
