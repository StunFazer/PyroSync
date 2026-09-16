## 2026-09-13T23:52:13Z
You are the Milestone 2 Worker for the PyroSync project.
Working directory: c:/Users/Beame/Documents/antigravity/zealous-shannon/.agents/teamwork_preview_worker_m2_1
Parent Orchestrator ID: 760a1ce8-67c8-40cd-a27f-e795b3a86299
Workspace root: c:/Users/Beame/Documents/antigravity/zealous-shannon

Mandatory Input Files:
- ORIGINAL_REQUEST.md: c:/Users/Beame/Documents/antigravity/zealous-shannon/ORIGINAL_REQUEST.md (You MUST read this before starting work)
- PROJECT.md: c:/Users/Beame/Documents/antigravity/zealous-shannon/PROJECT.md
- Spec Report: c:/Users/Beame/Documents/antigravity/zealous-shannon/.agents/teamwork_preview_spec_miner_survey_1/spec_report.md
- Graphics & Audio Architecture: c:/Users/Beame/Documents/antigravity/zealous-shannon/.agents/teamwork_preview_explorer_survey_1/graphics_audio_architecture.md

Scope of Milestone 2 (Dual-Mode Audio Engine & Pyromusical Sync):
1. Audio File Player & Timecode Engine (`src/engine/audio/AudioEngine.ts`):
   - Web Audio API graph (`AudioContext`, `GainNode`, buffer decoding).
   - Sample-accurate timecode clock (`audioContext.currentTime`) with drift-free tracking.
   - Decodes audio files (WAV, MP3, OGG, FLAC) and extracts decimated waveform min/max peaks for timeline rendering.
2. Live Mic 3-Band FFT Analyzer (`src/engine/audio/MicAnalyzer.ts`):
   - Real-time audio stream analysis splitting input into Sub-bass (<140Hz), Mid (140-2500Hz), and Treble (>2500Hz) using `BiquadFilterNode` and `AnalyserNode`.
   - Dynamic noise-floor adaptation: rolling baseline energy tracker adapting trigger sensitivity to ambient room sound.
   - Re-trigger cooldown gates (adjustable, e.g. 250ms Sub, 180ms Mid, 120ms Treble) preventing runaway rapid firing.
   - Automatic shell trigger dispatcher connecting live band peaks to fireworks engine (`ParticlePool`).
3. Procedural Web Audio Sound FX (`src/engine/audio/ProceduralSFX.ts`):
   - Launch thump: synthesized pitch-dropped sine oscillator + transient noise burst.
   - Aerial report boom: sub-bass concussion burst + filtered lowpass rumble + exponential decay.
   - Crackle: granular micro-clicks / micro-bursts for dragon eggs / crackle stars.
   - Master volume slider and mute toggle. MANDATORY: Default state is STRICTLY MUTED (`isMuted: true`, `volume: 0.0`) per specification!
4. In-Memory Procedural Music Synthesizer (`src/engine/audio/ProceduralMusic.ts`):
   - Zero-dependency procedural soundtrack generator for Demo Show 1 ("Cosmic Awakening", cinematic orchestral/hybrid) and Demo Show 2 ("Neon Horizon", synthwave/cyberpunk) so audio works out-of-the-box without requiring external MP3 downloads.
5. Audio UI Components & Integration:
   - `src/components/audio/AudioMeters.tsx`: Visual 3-band virtual LED ladder displays showing instantaneous band volume and dynamic threshold lines, mic enable toggle, sensitivity sliders, cooldown sliders, and audio-reactive profile selector.
   - `src/components/audio/SFXControls.tsx`: Master SFX volume slider, mute toggle (defaulted to MUTED).
   - Integrate with `src/app/App.tsx` and connect shell triggers to procedural SFX (when unmuted) and mic analyzer to live fireworks simulation.

Write Ownership:
You own: `src/engine/audio/*`, `src/components/audio/*`, `src/app/App.tsx`, `src/types/index.ts`.
You MUST NOT write to `tests/*`.

Verification:
- Run `npm run build` and ensure 0 TypeScript or bundler errors.
- Run `npm test` and ensure existing 260 tests continue to pass with 0 regressions.
- Write `progress.md` and `handoff.md` in your working directory.
- When done, send a message to parent (ID: 760a1ce8-67c8-40cd-a27f-e795b3a86299).
