## 2026-09-13T23:32:44Z
From: Parent Orchestrator (760a1ce8-67c8-40cd-a27f-e795b3a86299)
Task:
Conduct an architectural and technical feasibility investigation for R1 (Pure-Black Fireworks Engine) and R3 (Dual-Mode Audio Engine).
Investigate and design:
1. Technology Stack Selection:
   - Modern frontend bundler and framework (e.g. Vite + React + TypeScript + Tailwind CSS or modern CSS). Check existing environment or recommend cleanest setup.
   - Graphics engine: Three.js vs raw WebGL vs InstancedBufferGeometry/Points. How to achieve ZERO-allocation typed array particle pool capable of 25,000+ particles at 60+ FPS with NO garbage collection pauses.
   - Shaders / Post-Processing: Additive blending, bloom filter (e.g. UnrealBloomPass or custom WebGL post-processing shader) with strictly pitch-black #000000 background clamp and gain/brightness controls.
   - Aspect ratio masking overlay / viewport scissor (16:9, 16:10, 4:3, 21:9).
   - Particle physics and lifecycles for all 12+ shell archetypes (Peony, Chrysanthemum, Willow/Kamuro, Brocade Crown, Rings, Strobe, Crossette, Crackle/Dragon Eggs, Ground Mines, Whistling Comets, Horsetail Waterfall, Finale Barrage).
2. Audio Engine Architecture:
   - Web Audio API graph design.
   - Audio file decoding and sample-accurate timecode synchronization with requestAnimationFrame clock.
   - 3-band FFT analyzer (BiquadFilterNode lowpass, bandpass, highpass + AnalyserNodes for Sub-bass, Mid, Treble) with dynamic noise-floor adaptation algorithms and re-trigger cooldown gates.
   - Procedural sound FX synthesis: Launch thump (pitch-dropped sine oscillator + noise burst), Aerial boom (filtered low-frequency burst + exponential decay), Crackle (random micro-clicks/granular noise). Must default to MUTED as required.
   - Demo audio files: How to provide high-quality bundled/synthesized royalty-free audio tracks for the 2 demo shows.
3. Code layout and module boundaries for R1 and R3.

Output:
Write findings and architectural designs to:
c:/Users/Beame/Documents/antigravity/zealous-shannon/.agents/teamwork_preview_explorer_survey_1/graphics_audio_architecture.md.
Write progress.md and handoff.md in working directory.
When done, send a message to parent (ID: 760a1ce8-67c8-40cd-a27f-e795b3a86299) notifying that report is ready.
