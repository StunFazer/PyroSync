## 2026-09-13T23:35:50Z
You are the Milestone 1 Worker for the PyroSync project.
Working directory: c:/Users/Beame/Documents/antigravity/zealous-shannon/.agents/teamwork_preview_worker_m1_1
Parent Orchestrator ID: 760a1ce8-67c8-40cd-a27f-e795b3a86299
Workspace root: c:/Users/Beame/Documents/antigravity/zealous-shannon

Mandatory Input Files:
- ORIGINAL_REQUEST.md: c:/Users/Beame/Documents/antigravity/zealous-shannon/ORIGINAL_REQUEST.md (You MUST read this before starting work)
- PROJECT.md: c:/Users/Beame/Documents/antigravity/zealous-shannon/PROJECT.md
- Spec Report: c:/Users/Beame/Documents/antigravity/zealous-shannon/.agents/teamwork_preview_spec_miner_survey_1/spec_report.md
- Graphics Architecture: c:/Users/Beame/Documents/antigravity/zealous-shannon/.agents/teamwork_preview_explorer_survey_1/graphics_audio_architecture.md
- Studio Architecture: c:/Users/Beame/Documents/antigravity/zealous-shannon/.agents/teamwork_preview_explorer_survey_2/studio_display_architecture.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope of Milestone 1 (Core Fireworks Engine & Projector Calibration):
1. Project Scaffolding & Setup:
   - Initialize Vite + React + TypeScript in workspace root (or verify package.json, tsconfig.json, vite.config.ts). Install dependencies (three, @types/three, lucide-react or similar icons, tailwindcss or custom CSS).
   - Ensure clean compilation with `npm run build` (tsc + vite build).
2. Pure-Black High-Performance Fireworks Engine (R1):
   - Zero-allocation typed array particle pool (Float32Array Structure of Arrays with capacity for 32,768 to 65,536 particles).
   - Single-draw-call WebGL/Three.js particle renderer using THREE.Points and custom vertex/fragment shaders.
   - Sustains 60+ FPS under 25,000+ simultaneous particles with ZERO garbage collection allocation in the render loop.
   - Complete implementation of all 12+ shell archetypes:
     1. Peony (spherical 3D burst, uniform radial velocity, vibrant solid colors, clean break)
     2. Chrysanthemum (spherical burst with lingering trails behind stars)
     3. Willow / Kamuro (cascading gold/silver trails with heavy gravity droop and long hang time)
     4. Brocade Crown (dense golden/silver branching trails forming a large lingering canopy)
     5. Rings (concentric / planetary planar rings in 2D/3D toroidal planes)
     6. Strobe (stars pulsating/flashing at 4-12 Hz)
     7. Crossette (stars expand then fracture into 4 perpendicular daughter stars)
     8. Crackle / Dragon Eggs (clusters detonating with micro-flashes)
     9. Ground Mines (dense upward cone of sparks from ground level y=0)
     10. Whistling Comets (high-speed ascending spiraling corkscrew trail with report burst)
     11. Horsetail Waterfall (compact apex burst falling in gentle cascading curtain)
     12. Finale Barrage (rapid staggered salvo sequence across stations)
3. Projector Calibration Engine (R1):
   - Post-processing shader / pass with strict pitch-black #000000 background clamp (fragment cutoff uniform eliminating projector backlight leakage).
   - Brightness / Gain multiplier (0.10 to 3.00).
   - Additive bloom filter (threshold, radius, intensity).
   - Particle size scaling multiplier (0.50 to 4.00).
   - Aspect ratio masking guides & scissoring (16:9, 16:10, 4:3, 21:9 Ultra-wide, Off).
   - Projector Calibration interactive UI panel with live controls and instant feedback.
4. Presentation & Panic Controls (R2 Core):
   - Single-screen Presentation Fullscreen toggle ('F' key) hiding all operator controls.
   - Instant Blackout / Panic control ('Esc' or 'Space') instantly clearing all active particles and resetting pool.
5. Interactive Demo Shell Launcher & HUD:
   - Live FPS counter, active particle counter, station selector (L, LC, C, RC, R, Fan), archetype trigger buttons for manual testing.

Write Ownership:
You own: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/types/*`, `src/engine/fireworks/*`, `src/engine/calibration/*`, `src/components/display/*`, `src/components/calibration/*`, `src/app/*`, `src/index.css`.
You MUST NOT write to `tests/*`.
