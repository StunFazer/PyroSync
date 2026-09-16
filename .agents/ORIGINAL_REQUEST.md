# Original User Request

## Initial Request — 2026-09-13T23:31:23Z

Build PyroSync, a high-performance digital fireworks show programmer and live projection player web application. Designed specifically for projection mapping and live visual performances, PyroSync features a pure-black visual canvas, dual-mode audio synchronization (choreographed timecoded audio files and real-time reactive mic input), a multi-track timeline programmer with 1-click auto-choreography, a multi-monitor pop-out projector window (BroadcastChannel), and a projector calibration engine.

Working directory: c:/Users/Beame/Documents/antigravity/zealous-shannon
Integrity mode: development

## Requirements

### R1. Pure-Black High-Performance Fireworks Engine
- WebGL / Three.js particle rendering engine optimized for projectors with a strictly clamped pitch-black `#000000` background and high-vibrancy additive bloom.
- Zero-allocation typed array particle pool capable of sustaining 60+ FPS under heavy barrages (25,000+ particles) with zero garbage collection stutter.
- Complete pyrotechnic library supporting 12+ shell archetypes (Peony, Chrysanthemum, Willow/Kamuro, Brocade Crown, Rings, Strobe, Crossette, Crackle/Dragon Eggs, Ground Mines, Whistling Comets, Horsetail Waterfall, Finale Barrage).
- Dedicated Projector Calibration panel providing master brightness/gain multiplier, black-level cutoff clamp, bloom intensity, particle size scaling, and aspect ratio masking guides (16:9, 16:10, 4:3, 21:9 Ultra-wide).

### R2. Dual Display & Projection Output
- Multi-monitor Pop-out Projector Window utilizing the BroadcastChannel API for zero-latency event-driven synchronization (clean, borderless pure-black canvas for secondary displays/projectors).
- Single-screen Presentation Fullscreen toggle (`F` key) instantly hiding all operator UI.
- Instant Blackout / Panic control (`Esc` or `Space`) immediately clearing active aerial particles.

### R3. Dual-Mode Audio Engine & Pyromusical Sync
- Audio file player with precise timecode synchronization and interactive waveform display.
- Live microphone / line-in audio-reactive mode featuring a 3-band FFT analyzer (Sub-bass, Mid, Treble) with dynamic noise-floor adaptation, visual LED trigger meters, and re-trigger cooldown gates.
- Procedural Web Audio synthesized sound FX (launch thump, aerial report boom, crackle) with master volume slider, defaulted to MUTED.

### R4. Show Programmer & Timeline Studio
- Multi-track timeline representing spatial launch stations (Left, Left-Center, Center, Right-Center, Right, and Fan angles).
- Interactive audio waveform display with zoom, pan, and transient peak markers.
- 1-Click Auto-Choreographer: automatically analyzes audio energy and drops to generate a synchronized show.
- Macro pattern brushes for rapid authoring (fan sweeps, alternating mines, grand finale barrages).
- Live tap-to-record hotkeys (`1`–`9`) to drop cues onto tracks during playback.
- Inspector panel for cue parameters (shell type, color palette, altitude, launch angle, duration).
- Portable JSON show file export and import.

### R5. Pre-Configured Presets & Demo Shows
- Pre-loaded with 2 complete choreographed demo shows with synchronized audio tracks.
- Pre-configured live audio-reactive profiles (Club/EDM, Ambient, Percussive).

## Acceptance Criteria

### Build & Code Quality
- [ ] Application compiles cleanly (`npm run build`) with zero TypeScript or bundler errors.
- [ ] Development server starts cleanly (`npm run dev`) and runs without runtime exceptions.

### Visual & Projection Performance
- [ ] Canvas background is strictly `#000000` with no ambient backlight or gray washed-out elements.
- [ ] Particle engine sustains 60+ FPS during multi-shell barrages.
- [ ] Projector Calibration panel controls (gain, black clamp, particle size scale, aspect ratio mask) function dynamically in real time.

### Audio & Choreography Verification
- [ ] Audio file playback locks exactly to timeline cues with zero drift over full playback duration.
- [ ] Live mic input activates 3-band LED indicators and triggers shells with cooldown gating preventing runaway firing.
- [ ] 1-Click Auto-Choreographer populates the timeline with rhythmic cues from an audio track.
- [ ] Tap-to-record keys (`1`-`9`) drop timecoded cues at the playhead during playback.

### Display & Output Sync
- [ ] Pop-out projector window opens borderless and receives real-time launch and blackout events with no noticeable lag.
- [ ] Fullscreen toggle (`F`) transitions to clean projection view; Blackout (`Esc`/`Space`) immediately silences bursts.
- [ ] Show JSON export produces valid JSON that can be cleared and re-imported faithfully.
