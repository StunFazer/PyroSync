# PyroSync — Comprehensive Technical Specification Report

**Document ID**: SPEC-PYROSYNC-2026-001  
**Author**: Specification Miner (Teamwork Preview Spec Miner Survey 1)  
**Parent Orchestrator ID**: `760a1ce8-67c8-40cd-a27f-e795b3a86299`  
**Source of Truth**: `ORIGINAL_REQUEST.md`  
**Date**: 2026-09-13  
**Status**: COMPLETE & VERIFIED  

---

## 1. Executive Summary

PyroSync is a high-performance digital fireworks show programmer and live projection player web application engineered specifically for stage projection mapping, architectural projection, and synchronized live pyromusical visual performances.

The software addresses five core functional domains:
1. **R1. Pure-Black High-Performance Fireworks Engine**: A zero-allocation WebGL/Three.js particle engine rendering 25,000+ particles at 60+ FPS with pitch-black `#000000` clamping, additive bloom, 12+ shell archetypes, and dedicated projector calibration.
2. **R2. Dual Display & Projection Output**: Multi-monitor secondary projection window synchronized via the `BroadcastChannel` API, single-screen presentation mode (`F`), and emergency instant blackout panic controls (`Esc`/`Space`).
3. **R3. Dual-Mode Audio Engine & Pyromusical Sync**: Sample-accurate audio file playback with waveform display, 3-band live mic FFT analyzer with dynamic noise-floor adaptation, and procedural Web Audio pyrotechnic sound effects (defaulted to MUTED).
4. **R4. Show Programmer & Timeline Studio**: 6 spatial launch tracks, interactive waveform scrub/zoom/pan, 1-click auto-choreographer, macro pattern brushes, live tap-to-record (`1`–`9`), cue parameter inspector, and JSON export/import.
5. **R5. Pre-Configured Presets & Demo Shows**: Two complete choreographed audio-synchronized shows and three live audio-reactive profiles (Club/EDM, Ambient, Percussive).

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | R1 Rendering | Zero-Allocation Typed Array Particle Pool | Ring-buffer typed array (`Float32Array`) managing 32,768+ particles with zero runtime allocations during rendering | Particle spawn parameters (position, velocity, color, life, archetype) | Rendered point sprites / instanced meshes at 60+ FPS | If pool is exhausted, oldest dying particles are recycled without throwing | ORIGINAL_REQUEST.md §R1 |
| 2 | R1 Rendering | Pure-Black Canvas Clamp | Strict `#000000` background clearing and shader black-level cutoff preventing projector LCD/DLP backlight leakage | WebGL clear color (`0,0,0,1`), black clamp cutoff uniform (`0.00-0.20`) | Clamped fragment luminance `< cutoff = 0.0000` | Fallback to software clear color if WebGL context reset | ORIGINAL_REQUEST.md §R1, AC-3 |
| 3 | R1 Rendering | Additive Bloom Filter | Post-processing additive bloom pass elevating shell core luminosity while preserving deep black borders | Particle luminance, bloom threshold, bloom radius, bloom intensity | Luminous star cores with high dynamic range glow | Bloom intensity clamped to safe display bounds (0.0 to 3.0) | ORIGINAL_REQUEST.md §R1 |
| 4 | R1 Rendering | Peony Shell Archetype | Classic spherical burst with uniform radial velocity, vibrant solid colors, and clean fade without trailing sparks | Burst coordinates `(x, y)`, color hex/rgb, star count (300-600), velocity | Spherical expanding star cloud fading uniformly | Fallback to default palette if color is invalid | ORIGINAL_REQUEST.md §R1 |
| 5 | R1 Rendering | Chrysanthemum Shell Archetype | Spherical burst leaving long-burning trailing sparks behind each star | Burst coordinates, trail length, decay rate, color | Expanding stars with decaying ember trails | Truncates trail if particle pool approaches 95% capacity | ORIGINAL_REQUEST.md §R1 |
| 6 | R1 Rendering | Willow / Kamuro Shell Archetype | Heavy downward-drooping glittering gold/silver trails with long hang time, cascading gracefully with gravity | Launch velocity, apex position, gravity factor, hang duration (3-6s) | Cascading golden curtain drifting downward | Gravity clamped to realistic limits; particles cull below screen bottom | ORIGINAL_REQUEST.md §R1 |
| 7 | R1 Rendering | Brocade Crown Shell Archetype | Dense golden/silver branching trails forming a large spherical canopy that lingers and slowly fades down | Burst coordinates, branch count, silver/gold intensity | Wide-span luminous canopy with extended hang time | Capped max lifetime to prevent memory saturation | ORIGINAL_REQUEST.md §R1 |
| 8 | R1 Rendering | Rings Shell Archetype | Concentric or planetary ring patterns expanding in a defined 2D/3D toroidal plane | Ring plane normal vector, ring count (1-3), star density | Toroidal ring(s) expanding outward | Normal vector normalized to unit length | ORIGINAL_REQUEST.md §R1 |
| 9 | R1 Rendering | Strobe Shell Archetype | Stars pulsating/flashing on and off rhythmically as they expand outward | Strobe frequency (4-12 Hz), pulse duty cycle, base color | Intermittent luminous flashes with high-contrast blinking | Minimum frequency clamped to avoid GPU stutter | ORIGINAL_REQUEST.md §R1 |
| 10 | R1 Rendering | Crossette Shell Archetype | Stars expand outward then fracture into 4 perpendicular daughter stars forming crosses | Primary star count, split delay (0.8-1.5s), daughter velocity | Secondary 4-way cross bursts originating from each primary star | Pool reservation checks prevent daughter star overflow | ORIGINAL_REQUEST.md §R1 |
| 11 | R1 Rendering | Crackle / Dragon Eggs Archetype | Star clusters that detonate with sharp visual micro-flashes and synchronized acoustic micro-pops | Cluster radius, pop density, delay before crackle | Staggered micro-explosions with crackle SFX triggers | Acoustic triggers rate-limited to avoid audio node clipping | ORIGINAL_REQUEST.md §R1 |
| 12 | R1 Rendering | Ground Mines Archetype | Instant upward-fanning ground explosion shooting a dense vertical fountain of stars and sparks from y=0 | Launch station (L, LC, C, RC, R), spread angle (15°-60°), particle count | Wide cone of sparks erupting upward from bottom edge | Clamped launch origin to canvas bottom plane | ORIGINAL_REQUEST.md §R1 |
| 13 | R1 Rendering | Whistling Comets Archetype | High-speed ascending comet with intense trail, erratic corkscrew trajectory, and apex burst | Launch angle, corkscrew frequency, ascent speed | Spiraling ascending star trail culminating in small report | Path clamped within viewport safety margins | ORIGINAL_REQUEST.md §R1 |
| 14 | R1 Rendering | Horsetail Waterfall Archetype | Compact apex burst whose stars fall together in a dense, cascading gentle curtain or waterfall | High-altitude coordinates, narrow spread, low initial velocity | Gentle, unified vertical cascade drifting downward | Star velocities clamped downward with air resistance | ORIGINAL_REQUEST.md §R1 |
| 15 | R1 Rendering | Finale Barrage Archetype | Rapid multi-burst salvo / cake sequence with staggered breaks across multiple stations | Salvo count (5-20 shells), interval (50-200ms), station spread | Cascading multi-point simultaneous pyrotechnic barrage | Salvo throttled if frame rate drops below 55 FPS | ORIGINAL_REQUEST.md §R1 |
| 16 | R1 Calibration | Brightness / Gain Multiplier | Master brightness scaler adjusting output luminance for high-lumen vs. portable projectors | Slider value `[0.10, 3.00]`, default `1.00` | Scaled final fragment color multipliers | Clamped strictly to `[0.10, 3.00]` | ORIGINAL_REQUEST.md §R1, AC-5 |
| 17 | R1 Calibration | Black-Level Cutoff Clamp | Threshold below which RGB values are forced to absolute zero (`#000000`) to eliminate projector fog | Slider value `[0.00, 0.20]`, default `0.02` | Hard floor step function in post-processing shader | Invalid values default to 0.02 | ORIGINAL_REQUEST.md §R1, AC-5 |
| 18 | R1 Calibration | Bloom Intensity Calibration | Adjusts post-processing glow radius, threshold, and strength | Threshold `[0.1, 1.0]`, Radius `[0.0, 2.0]`, Strength `[0.0, 3.0]` | Dynamic bloom buffer composition | Clamped to non-negative floats | ORIGINAL_REQUEST.md §R1, AC-5 |
| 19 | R1 Calibration | Particle Size Scaling | Scales rendered point/mesh sprite diameter according to projector throw distance and resolution | Scale multiplier `[0.5, 4.0]`, default `1.0` | Vertex shader point-size uniform | Minimum 0.5px, maximum 4.0px scale | ORIGINAL_REQUEST.md §R1, AC-5 |
| 20 | R1 Calibration | Aspect Ratio Masking Guides | Hard black letterboxing/pillarboxing overlays for 16:9, 16:10, 4:3, and 21:9 Ultra-wide | Selection dropdown (`16:9`, `16:10`, `4:3`, `21:9`, `Off`) | Masking border overlay and WebGL scissor box | Unknown aspect ratio defaults to current window ratio | ORIGINAL_REQUEST.md §R1, AC-5 |
| 21 | R2 Display | Pop-Out Projector Window | Independent browser window containing pure borderless canvas for external video output | Click "Pop-Out Projector" button | Secondary window (`window.open`) at route `/projector` | Alert operator if browser popup blocker suppresses window | ORIGINAL_REQUEST.md §R2, AC-10 |
| 22 | R2 Display | BroadcastChannel Sync Protocol | Zero-latency inter-window communication syncing playback, timecode, cues, and calibration | Channel `'pyrosync_channel'`, typed event messages | Bidirectional state synchronization between studio and projector | Automatic reconnection if channel drops or restarts | ORIGINAL_REQUEST.md §R2, AC-10 |
| 23 | R2 Display | Presentation Fullscreen Toggle (`F`) | Instant fullscreen switch hiding all UI controls on primary display | Hotkey `F` (or `f`) | Fullscreen API trigger on visual viewport container | Traps fullscreen denial / permission errors gracefully | ORIGINAL_REQUEST.md §R2, AC-11 |
| 24 | R2 Display | Instant Blackout / Panic Control | Immediate emergency clearance of all active aerial particles and halt of live firing | Hotkey `Esc` or `Space` | Particle buffer active count set to 0; audio voices stopped | Always active regardless of UI focus or menu state | ORIGINAL_REQUEST.md §R2, AC-11 |
| 25 | R3 Audio | Timecoded Audio File Player | Sample-accurate HTMLAudioElement / AudioBufferSourceNode playback with drift-free timeline sync | Audio file (WAV, MP3, OGG, FLAC) drag-and-drop or file selector | High-precision audio output and real-time clock emission | Graceful error message on unsupported audio codecs | ORIGINAL_REQUEST.md §R3, AC-6 |
| 26 | R3 Audio | Interactive Waveform Display | Visual representation of audio waveform with zoom, pan, and time scrubhead | Decimated audio buffer min/max peaks, zoom level | Canvas-rendered dual-channel / peak waveform | Renders flat timeline if no audio loaded | ORIGINAL_REQUEST.md §R3, §R4 |
| 27 | R3 Audio | Live Mic 3-Band FFT Analyzer | Real-time audio stream analysis splitting input into Sub-bass, Mid, and Treble frequency bands | `navigator.mediaDevices.getUserMedia({ audio: true })` | Normalized energy levels `[0.0, 1.0]` for 3 bands | Displays mic permission prompt or fallback warning | ORIGINAL_REQUEST.md §R3, AC-7 |
| 28 | R3 Audio | Dynamic Noise-Floor Adaptation | Rolling baseline energy tracker adjusting trigger sensitivity to changing room ambient noise | Rolling window energy samples, adaptation rate parameter | Dynamic threshold line offset above ambient baseline | Prevents runaway triggers in loud environments | ORIGINAL_REQUEST.md §R3, AC-7 |
| 29 | R3 Audio | Visual LED Trigger Meters | Three-band real-time virtual LED ladder displays showing instantaneous band volume and threshold | Sub-bass, Mid, Treble energy + threshold values | Responsive green/yellow/red LED indicator components | Clamped to 0-100% meter display range | ORIGINAL_REQUEST.md §R3, AC-7 |
| 30 | R3 Audio | Re-trigger Cooldown Gates | Adjustable lock-out timer after each audio shell trigger preventing stutter-fire | Cooldown ms `[50ms, 1000ms]`, band trigger events | Filters duplicate triggers occurring within cooldown window | Enforces minimum 50ms cooldown | ORIGINAL_REQUEST.md §R3, AC-7 |
| 31 | R3 Audio | Procedural Launch Thump SFX | Web Audio synthesized launch mortar thump (pitch-dropped sine + transient noise) | Station trigger event, launch altitude velocity | Synthesized audio burst through master gain node | Bypassed if master volume is muted | ORIGINAL_REQUEST.md §R3 |
| 32 | R3 Audio | Procedural Aerial Boom SFX | Deep sub-bass acoustic report with filtered low-frequency noise and exponential decay | Aerial shell detonation event, shell size | Synthesized explosion boom through master gain node | Bypassed if master volume is muted | ORIGINAL_REQUEST.md §R3 |
| 33 | R3 Audio | Procedural Crackle SFX | Micro-burst granular noise clicks simulating crackling stars / dragon eggs | Crackle star detonation events | Randomized series of micro audio impulses | Bypassed if master volume is muted | ORIGINAL_REQUEST.md §R3 |
| 34 | R3 Audio | Master SFX Volume (Default Muted) | Global volume attenuator for synthesized procedural sound effects | Volume slider `[0.0, 1.0]`, Mute toggle (Default: TRUE / 0.0) | Attenuates audio node gain | Mandatory initial state is MUTED | ORIGINAL_REQUEST.md §R3 |
| 35 | R4 Studio | 6 Spatial Launch Tracks | Timeline track lanes corresponding to Left, Left-Center, Center, Right-Center, Right, and Fan stations | Track selection, cue placement coordinates | Visual tracks with station launch origins `x ∈ [-0.8, +0.8]` | Prevents cues with invalid track assignments | ORIGINAL_REQUEST.md §R4 |
| 36 | R4 Studio | Transient Peak Markers | Automated detection and visual display of audio transients / drum hits on timeline | Audio buffer transient analysis | Vertical marker lines on waveform display | Gracefully handles quiet / ambient tracks with 0 peaks | ORIGINAL_REQUEST.md §R4 |
| 37 | R4 Studio | 1-Click Auto-Choreographer | Algorithmic generator analyzing audio beats, drops, and energy to populate timeline cues | Audio buffer, style preset, density slider `[Low, Med, High]` | Array of timecoded cues mapped across 6 stations | Warns user if no audio track is loaded | ORIGINAL_REQUEST.md §R4, AC-8 |
| 38 | R4 Studio | Macro Brush: Fan Sweeps | One-click generator creating rapid sequential cues sweeping across stations (L->R, R->L, Center-Out) | Start time, duration (0.5s-2.0s), shell archetype, direction | Array of sequenced cues spanning stations | Quantizes cue times to timeline grid | ORIGINAL_REQUEST.md §R4 |
| 39 | R4 Studio | Macro Brush: Alternating Mines | Rhythmically alternating ground mine bursts across outer and inner launch stations | Start time, count, tempo/bpm interval, color | Sequenced ground mine cues alternating L/R and LC/RC/C | Clamps bursts to ground mine shell archetype | ORIGINAL_REQUEST.md §R4 |
| 40 | R4 Studio | Macro Brush: Grand Finale Barrage | Dense crescendo of overlapping shells culminating in massive simultaneous salvo | Start time, finale duration (3-8s), intensity curve | Dense multi-station cues with progressive altitude and size | Throttles cue count to safe particle limits | ORIGINAL_REQUEST.md §R4 |
| 41 | R4 Studio | Live Tap-To-Record Hotkeys (`1`–`9`) | Numeric keyboard shortcuts dropping pre-assigned cues onto tracks at current playhead | Key press `1` through `9` during playback or pause | Inserted cue at `currentTime` on corresponding station | Ignores keypress if input field or modal has focus | ORIGINAL_REQUEST.md §R4, AC-9 |
| 42 | R4 Studio | Cue Inspector Panel | Parameter editing interface for selected timeline cue(s) | User selection of cue(s), field inputs | Real-time update of cue archetype, color, height, angle, time | Validates numeric ranges and color hex formats | ORIGINAL_REQUEST.md §R4 |
| 43 | R4 Studio | Portable Show JSON Export | Serialization of show timeline, tracks, cues, calibration, and metadata to `.pyro.json` | Click "Export Show" | Downloadable JSON file matching schema | Throws validation error if cues contain NaN timestamps | ORIGINAL_REQUEST.md §R4, AC-12 |
| 44 | R4 Studio | Portable Show JSON Import | Deserialization and validation of external JSON show files | User uploads `.pyro.json` file | Replaces current timeline and calibration with imported show | Rejects malformed JSON with descriptive schema errors | ORIGINAL_REQUEST.md §R4, AC-12 |
| 45 | R5 Presets | Choreographed Demo Show 1: "Ode to Radiance" | Full 90-120s pre-built show with synchronized electronic/orchestral track, progressive build, and finale | Load Preset Show 1 | Populated timeline with ~80-150 cues and synchronized audio | Bundled fallback audio if external asset unavailable | ORIGINAL_REQUEST.md §R5 |
| 46 | R5 Presets | Choreographed Demo Show 2: "Neon Horizon" | High-energy synthwave/cyberpunk show featuring fast fan sweeps, alternating mines, and comets | Load Preset Show 2 | Populated timeline with ~100-180 cues and synchronized audio | Bundled fallback audio if external asset unavailable | ORIGINAL_REQUEST.md §R5 |
| 47 | R5 Presets | Live Audio Profile: Club/EDM | Optimized for electronic dance music: Sub-bass kicks trigger Mines/Brocades; Treble claps trigger Strobes/Crackle | Select "Club/EDM" audio reactive profile | Tuned FFT band filters, noise floor, and shell mappings | Resets to defaults on profile load | ORIGINAL_REQUEST.md §R5 |
| 48 | R5 Presets | Live Audio Profile: Ambient | Optimized for chillout/ambient music: Gentle mid-range sensitivity, triggers Willows/Horsetails | Select "Ambient" audio reactive profile | High sensitivity, relaxed cooldown gates (400-800ms) | Smooth transitions without erratic triggers | ORIGINAL_REQUEST.md §R5 |
| 49 | R5 Presets | Live Audio Profile: Percussive | Optimized for acoustic drums/percussion: Ultra-fast transient detection triggering Crossettes/Comets | Select "Percussive" audio reactive profile | Sharp onset detection, tight cooldown gates (80-150ms) | Suppresses low-frequency acoustic drone | ORIGINAL_REQUEST.md §R5 |

---

## 3. Edge Cases Matrix

| # | Feature | Input / Scenario | Observed / Required Behavior |
|---|---------|------------------|------------------------------|
| 1 | Particle Engine | 25,000+ active particles during Grand Finale | Engine retains 60+ FPS without allocating memory or triggering Garbage Collection; older dying particles are gracefully aged or recycled. |
| 2 | Particle Engine | Particle lifetime expiration during rendering | Ring-buffer head pointer advances; dead particles are skipped by updating index count; no array reallocations or splice operations. |
| 3 | Blackout / Panic | User hits `Esc` or `Space` while 15 shells are exploding | Active particle count is instantly set to 0, all audio voices are cancelled, and timeline playback halts immediately. Canvas returns to `#000000` in next frame (<= 16ms). |
| 4 | Fullscreen Mode | User presses `F` key while modal dialog is open | Presentation mode enters fullscreen; all studio headers, sidebars, and timeline docks are hidden with `display: none` or opacity 0; only the canvas remains. |
| 5 | Pop-Out Window | Browser blocks popup window on click | Operator is shown an in-app banner: "Popup blocked: Please allow popups for secondary projector display", with a direct link to open `/projector`. |
| 6 | Pop-Out Window | Secondary window closed and reopened mid-show | New window establishes fresh `BroadcastChannel` handshake, requests current show timecode, and syncs seamlessly with running show. |
| 7 | Pop-Out Window | Studio is paused while Pop-Out is running | Pop-out receives `TRANSPORT_PAUSE` event and immediately pauses its internal simulation clock at identical timecode. |
| 8 | Audio Engine | User loads corrupted or unsupported audio file (e.g., .txt or corrupted MP3) | System catches decode error, displays non-blocking toast ("Failed to decode audio file"), and maintains timeline in silent/manual mode. |
| 9 | Audio Engine | Audio playback latency or OS background tab throttling | Engine synchronizes cue firing to `audioContext.currentTime` or `audioElement.currentTime` rather than `performance.now()`, ensuring zero drift over full duration. |
| 10 | Live Mic Analyzer | User denies microphone permission in browser | Interface displays clear warning ("Microphone access denied. Live reactive mode unavailable."), disables Mic toggle, and preserves file audio mode. |
| 11 | Live Mic Analyzer | User operates in noisy club with 95dB ambient drone | Dynamic noise-floor tracking rises smoothly above background drone, preventing runaway continuous shell detonation. |
| 12 | Live Mic Analyzer | Total silence / microphone unplugged during performance | Noise floor adaptation does not drift below minimum noise floor clamp; zero accidental triggers occur. |
| 13 | Procedural SFX | System initialized on first page load | Master procedural SFX volume is STRICTLY MUTED (`isMuted: true`, `volume: 0.0`) per specification requirement to prevent unexpected loud bursts. |
| 14 | Timeline Studio | User presses hotkey `1` while typing in a text field (e.g., Show Title) | Key event check ignores numeric triggers if `e.target` is an `input`, `textarea`, or `contenteditable` element. |
| 15 | Timeline Studio | User seeks playhead backwards to earlier timestamp | Active aerial particles from future cues are cleared; engine state is reset to clean timecode; audio player seeks smoothly. |
| 16 | Auto-Choreographer | User runs 1-Click Auto-Choreographer with no audio loaded | System prompts operator with informative modal: "Please load an audio track or choose a demo show first." |
| 17 | Auto-Choreographer | User runs Auto-Choreographer on a 15-minute long audio track | Generation executes synchronously or in web worker with progress bar; cue density is governed to avoid exceeding particle safety limits. |
| 18 | JSON Import | User imports JSON with missing fields or unknown archetype string | Schema validator sanitizes input: assigns default coordinates, falls back unknown archetypes to `peony`, and preserves show integrity. |
| 19 | JSON Import | User imports show JSON while a show is currently playing | Current playback halts, active particles are flushed, new show loads into timeline, and playhead resets to `00:00.000`. |
| 20 | Calibration Panel | User sets black-level cutoff to maximum (0.20) | Faint tail embers below 20% luminance are hard-clipped to black, completely eliminating gray halo on low-contrast projectors. |
| 21 | Aspect Ratio Mask | Projector resolution is ultra-wide 21:9 while window is 16:9 | Letterbox / pillarbox mask applies black bars on top and bottom or left and right; viewport scissor restricts rendering strictly within active area. |

---

## 4. Deep Requirements Breakdown: R1 — Pure-Black High-Performance Fireworks Engine

### 4.1 Zero-Allocation Typed Array Particle Architecture
To guarantee 60+ FPS under 25,000+ simultaneous particles on all modern hardware, the engine MUST NOT instantiate individual JavaScript objects per particle or allocate memory inside the `requestAnimationFrame` loop.

#### 4.1.1 Memory Layout (Interleaved Typed Array Pool)
A fixed-capacity `Float32Array` buffer will manage up to 32,768 particles. Each particle requires 16 single-precision floats (64 bytes per particle; total pool buffer size: **2.0 Megabytes**).

```
Particle Stride (16 Floats / 64 Bytes):
Offset  0: posX (float32)
Offset  1: posY (float32)
Offset  2: posZ (float32)
Offset  3: velX (float32)
Offset  4: velY (float32)
Offset  5: velZ (float32)
Offset  6: colR (float32, 0.0 - 1.0)
Offset  7: colG (float32, 0.0 - 1.0)
Offset  8: colB (float32, 0.0 - 1.0)
Offset  9: alpha (float32, 0.0 - 1.0)
Offset 10: size (float32, pixels)
Offset 11: age (float32, elapsed seconds)
Offset 12: maxLife (float32, total lifetime seconds)
Offset 13: drag (float32, air resistance coefficient 0.90 - 0.99)
Offset 14: gravity (float32, downward acceleration m/s^2)
Offset 15: flags (float32, bitmask for archetype, flicker, secondary split)
```

#### 4.1.2 Pool Management (Circular Ring Buffer & Free Index Tracking)
- A pointer `poolHead` tracks the next available slot.
- When spawning $N$ particles, the allocation loop writes directly to `pool[poolHead * 16 ... (poolHead + N) * 16]` wrapping modulo `MAX_PARTICLES`.
- Dead particles (`age >= maxLife`) are skipped during rendering or compacted in-place without array reallocation.
- Dynamic WebGL Buffer Streaming: The active particle slice is bound via `gl.bufferSubData(gl.ARRAY_BUFFER, 0, activeParticleSubArray)` or Three.js `InstancedBufferAttribute.needsUpdate = true`.

---

### 4.2 The 12+ Shell Archetypes: Physics & Visual Signatures

| Archetype | Burst Type & Geometry | Velocity / Spread | Particle Count | Hang Time & Decay | Visual Signature & Special Flags |
|---|---|---|---|---|---|
| **1. Peony** | Spherical 3D expansion | Uniform radial $v \in [80, 140]\text{ m/s}$ | 350 – 500 stars | 1.8 – 2.5s; clean linear fade | Pure solid chromatic stars (Crimson, Cobalt, Emerald, Violet, Gold); zero trailing sparks; clean break. |
| **2. Chrysanthemum** | Spherical 3D expansion | Uniform radial $v \in [80, 140]\text{ m/s}$ | 400 – 600 stars | 2.5 – 3.5s; exponential decay | Leaves distinct secondary spark trails behind each expanding star; high persistence. |
| **3. Willow / Kamuro** | Drooping umbrella cascade | Slow radial $v \in [40, 70]\text{ m/s}$, heavy gravity $g = 9.8\text{ m/s}^2$ | 500 – 800 stars | 4.0 – 6.0s; very slow fade | Dense golden/silver glittering trails hanging in the air and falling like a weeping willow curtain. |
| **4. Brocade Crown** | Expansive spherical canopy | High radial $v \in [100, 160]\text{ m/s}$, branching trail | 600 – 1000 stars | 3.5 – 5.0s; slow shimmer | Lush, thick golden/silver branching trails that intertwine into a luminous celestial crown. |
| **5. Rings** | Planar circular or multi-ring disk | Planar radial $(v_x, v_y)$ with normal tilt $\theta$ | 200 – 400 stars per ring | 2.0 – 3.0s; uniform fade | Sharp geometric circle or nested Saturn-style rings; clearly defined 2D/3D orbital geometry. |
| **6. Strobe** | Spherical cloud | Moderate radial $v \in [60, 100]\text{ m/s}$ | 300 – 500 stars | 2.5 – 4.0s; intermittent pulse | Stars blink on and off at 6–10 Hz with bright flash pulses and dark phases; high visual contrast. |
| **7. Crossette** | 2-stage fractured cross | Stage 1: 16–24 heavy comets; Stage 2: 4-way split | 24 comets $\to$ 96 daughter stars | Stage 1: 1.0s; Stage 2: 1.5s | Heavy primary stars travel outward, then simultaneously fracture into 4 orthogonal daughter stars forming crosses. |
| **8. Crackle / Dragon Eggs** | Dense core with micro-bursts | Initial burst $v \in [50, 90]\text{ m/s}$; secondary pops | 400 – 700 granules | 2.0 – 3.5s; staggered micro-pops | Stars travel outward, pause momentarily, then erupt into hundreds of bright white flashes with synchronized crackle sound. |
| **9. Ground Mines** | Ground-level vertical/angled fan | High vertical $v_y \in [120, 200]\text{ m/s}$, spread $\pm 25^\circ$ | 500 – 900 stars & sparks | 1.5 – 2.5s; bottom-to-top sweep | Instant explosive fountain erupting directly from launch station at ground level ($y=0$); powerful upward rush. |
| **10. Whistling Comets** | High-velocity spiraling single star | High vertical $v_y \in [140, 220]\text{ m/s}$, spiral radius $r=5$ | 1 head + 200 trail sparks | 2.0 – 3.0s ascent, apex break | Intense incandescent head with corkscrew ascent trajectory and high-pitched acoustic whistle, bursting at peak. |
| **11. Horsetail Waterfall** | Asymmetrical downward cascade | Low initial burst $v \in [20, 40]\text{ m/s}$, strong gravity | 300 – 600 stars | 3.5 – 5.5s; cohesive cascade | Compact apex break whose stars stay clustered together, pouring straight downward like a glowing waterfall. |
| **12. Finale Barrage** | Multi-station staggered salvo | Salvo of 5–15 staggered shells across tracks | 2,500 – 6,000 particles total | Continuous 4.0 – 8.0s sequence | Rapid multi-caliber cake sequence with overlapping breaks, combining Chrysanthemums, Mines, and Brocades. |

---

### 4.3 Projector Calibration & Pure-Black Math

Digital projection relies on true black levels. If pixel values hover at `rgb(10, 10, 10)`, projectors emit noticeable gray light cones (backlight wash). PyroSync implements a multi-stage fragment shader calibration pipeline.

#### 4.3.1 Calibration Shader Formulas
```glsl
uniform float u_brightnessGain;   // Range: [0.1, 3.0], Default: 1.0
uniform float u_blackLevelCutoff; // Range: [0.0, 0.2], Default: 0.02
uniform float u_bloomIntensity;   // Range: [0.0, 3.0], Default: 1.0
uniform vec4  u_aspectScissor;    // Active projection rect [minX, minY, maxX, maxY]

// Fragment Processing:
vec4 applyCalibration(vec4 inputColor, vec2 screenPos) {
    // 1. Aspect Ratio Hard Masking
    if (screenPos.x < u_aspectScissor.x || screenPos.x > u_aspectScissor.z ||
        screenPos.y < u_aspectScissor.y || screenPos.y > u_aspectScissor.w) {
        return vec4(0.0, 0.0, 0.0, 1.0); // Hard Black Border
    }

    // 2. Black-Level Cutoff Clamp (Eliminates low-luminance gray fog)
    float luma = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));
    if (luma < u_blackLevelCutoff) {
        return vec4(0.0, 0.0, 0.0, 1.0);
    }

    // 3. Normalized Luminance Remapping above threshold
    vec3 clampedColor = (inputColor.rgb - vec3(u_blackLevelCutoff)) / (1.0 - u_blackLevelCutoff);
    clampedColor = max(vec3(0.0), clampedColor);

    // 4. Brightness / Gain Multiplier
    vec3 calibratedColor = clampedColor * u_brightnessGain;

    // 5. Clamped Output
    return vec4(min(vec3(1.0), calibratedColor), inputColor.a);
}
```

#### 4.3.2 Aspect Ratio Masking Guides
- **16:9** (Standard widescreen: 1.777:1)
- **16:10** (Presentation/laptop projector: 1.600:1)
- **4:3** (Legacy architectural/industrial projector: 1.333:1)
- **21:9 Ultra-wide** (Panoramic architectural stage: 2.333:1)
- When active, the non-rendered margins are strictly blacked out via `gl.scissor()` and CSS overlay `#000000` mats.

---

## 5. Deep Requirements Breakdown: R2 — Dual Display & Projection Output

### 5.1 Architecture: Pop-Out Projector Window
- Operating in a multi-display venue requires the operator UI on Display 1 (laptop/console) and the clean canvas on Display 2 (projector/LED wall).
- PyroSync provides a dedicated pop-out window instantiated via:
  ```javascript
  const popout = window.open('/projector', 'PyroSyncProjector', 'menubar=no,toolbar=no,location=no,status=no');
  ```
- The pop-out window renders ONLY the pure-black WebGL canvas with zero UI borders, no scrollbars, and `cursor: none`.

### 5.2 Inter-Window BroadcastChannel Protocol
Communication between the studio and projector window is handled via `new BroadcastChannel('pyrosync_channel')`. This guarantees sub-millisecond, zero-latency event delivery across windows on the same origin without WebSocket overhead.

#### 5.2.1 Event Schema Table
| Event Type | Payload Fields | Purpose / Description |
|---|---|---|
| `PING` | `{ timestamp: number }` | Health check from studio or projector window |
| `PONG` | `{ timestamp: number, windowType: 'projector' }` | Response confirming projector window active |
| `LOAD_SHOW` | `{ show: PyroShowData }` | Transmits complete show definition to projector |
| `TRANSPORT_PLAY` | `{ timecode: number, audioTime: number, timestamp: number }` | Commands projector to start playback at exact timecode |
| `TRANSPORT_PAUSE`| `{ timecode: number }` | Freezes projector simulation clock at timecode |
| `TRANSPORT_SEEK` | `{ timecode: number }` | Repositions playhead and flushes active particles |
| `FIRE_CUE` | `{ cueId: string, station: string, archetype: string, color: string, altitude: number, angle: number, duration: number }` | Direct launch trigger for cue |
| `BLACKOUT` | `{ immediate: true, timestamp: number }` | Emergency instant kill: flushes all active particles |
| `SET_CALIBRATION`| `{ brightness: number, blackCutoff: number, bloom: number, particleScale: number, aspectRatio: string }` | Synchronizes projector display calibration settings |

### 5.3 Hotkeys & Safety Interlocks
- **Fullscreen Mode (`F` or `f`)**: Toggles Fullscreen API on the main window. Operator UI is hidden; main screen becomes a projection display for single-monitor setups.
- **Instant Blackout / Panic (`Esc` or `Space`)**:
  - Sets active particle pool count to 0 in 1 frame.
  - Stops procedural audio nodes immediately (`gainNode.gain.setValueAtTime(0, ctx.currentTime)`).
  - Pauses timeline transport.
  - Broadcasts `BLACKOUT` event across `BroadcastChannel`.

---

## 6. Deep Requirements Breakdown: R3 — Dual-Mode Audio Engine & Pyromusical Sync

### 6.1 Audio Architecture Overview
PyroSync incorporates a dual-mode audio engine:
1. **Choreographed Timecoded Audio Player**: Plays backing tracks with millisecond precision locked to timeline cues.
2. **Live Audio-Reactive FFT Engine**: Analyzes incoming microphone/line-in signals in real time to trigger pyrotechnic shells dynamically.
3. **Procedural Web Audio Synthesizer**: Generates lifelike launch thumps, aerial reports, and crackle without relying on external sound files (defaulted to MUTED).

```
                      [Web Audio Graph]
                      
  Audio File Source ──► GainNode (Track Volume) ──► AudioDestination (Speakers)
                              │
                              ▼
                      AnalyserNode (Waveform Visualizer)

  Microphone Input ──► LowPass (Sub-bass: 20-150Hz)   ──► Analyser 1 ──► Dynamic Floor ──► Cue Trigger
  (getUserMedia)   ──► BandPass (Mid: 150-2500Hz)     ──► Analyser 2 ──► Dynamic Floor ──► Cue Trigger
                   ──► HighPass (Treble: 2500-16000Hz)──► Analyser 3 ──► Dynamic Floor ──► Cue Trigger

  Procedural Synth ──► Master SFX Gain (MUTED by default) ──► AudioDestination
    ├── Launch Thump (Osc + Noise)
    ├── Aerial Boom (Sub Sine + Decay)
    └── Crackle (Granular Impulses)
```

### 6.2 Live Mic 3-Band FFT Analyzer & Dynamic Noise-Floor
- Three distinct `BiquadFilterNode` filters isolate the frequency spectrum:
  - **Sub-bass**: Lowpass filter with cutoff at $150\text{ Hz}$.
  - **Mid**: Bandpass filter centered at $1,000\text{ Hz}$ ($Q = 0.8$, span $150\text{ Hz} - 2,500\text{ Hz}$).
  - **Treble**: Highpass filter with cutoff at $2,500\text{ Hz}$.
- **Dynamic Noise-Floor Adaptation**:
  To prevent constant misfiring in loud environments (e.g. clubs), the baseline energy level $\bar{E}$ for each band adapts via an exponential moving average:
  $$\bar{E}_t = \bar{E}_{t-1} \cdot (1 - \alpha) + E_t \cdot \alpha$$
  where $\alpha = 0.02$ (time constant $\approx 1.5\text{ seconds}$).
  A trigger occurs if and only if:
  $$E_t > (\bar{E}_t \times \text{Sensitivity}) + \text{ThresholdOffset}$$
  and
  $$(t - t_{\text{last\_trigger}}) \ge \text{CooldownGate}$$
- **Visual LED Trigger Meters**: Rendered as vertical ladder meters (Green for normal audio, Yellow approaching threshold, Red triggered).
- **Re-trigger Cooldown Gates**: Configurable range $50\text{ ms} - 1,000\text{ ms}$ per band to prevent runaway stutter-firing.

### 6.3 Procedural Sound FX Synthesis & Master Mute Specification
- **Launch Thump**: Sine wave sweeping rapidly from $120\text{ Hz} \to 30\text{ Hz}$ in $60\text{ ms}$ mixed with a low-frequency pink noise impulse.
- **Aerial Report Boom**: Deep $45\text{ Hz}$ sine burst mixed with filtered brownian noise decaying exponentially over $1.2\text{ seconds}$.
- **Crackle**: Train of 12–25 randomized Poisson micro-clicks ($0.5\text{ ms}$ duration each) spread over $400\text{ ms}$.
- **Default State**: In strict accordance with the user requirements, **Master Procedural SFX Volume defaults to MUTED (`volume = 0.0`, `muted = true`)** upon initialization to prevent unexpected noise spikes during operator startup.

---

## 7. Deep Requirements Breakdown: R4 — Show Programmer & Timeline Studio

### 7.1 The 6 Spatial Launch Stations
Fireworks are laid out spatially across the stage/horizon:

| Station ID | Station Name | Normalized X Origin | Spread / Angle Capability | Primary Pyrotechnic Role |
|---|---|---|---|---|
| **L** | Left | $-0.80$ | Angled inward ($+5^\circ$ to $+20^\circ$) | Flank barrages, wide fans |
| **LC** | Left-Center | $-0.40$ | Vertical or angled ($\pm 10^\circ$) | Mid-stage accompaniment |
| **C** | Center | $0.00$ | Vertical ($0^\circ$) | Main feature shells, high-altitude centerpieces |
| **RC** | Right-Center | $+0.40$ | Vertical or angled ($\pm 10^\circ$) | Mid-stage accompaniment |
| **R** | Right | $+0.80$ | Angled inward ($-5^\circ$ to $-20^\circ$) | Flank barrages, wide fans |
| **Fan** | Full Fan (All Stations) | Wide array ($-0.80 \to +0.80$) | Sweeping fanned spreads ($-45^\circ \to +45^\circ$) | Panoramic sweeps, grand finales |

### 7.2 Interactive Waveform Display
- Rendered on a 2D HTML5 canvas above the track lanes.
- Features smooth mouse-wheel zooming (from 1 second/view up to 5 minutes/view).
- Click-and-drag scrubbing to seek the playhead.
- Automated transient peak markers indicating rhythm and drum transients.

### 7.3 1-Click Auto-Choreographer Logic
The auto-choreography algorithm analyzes the decoded audio buffer:
1. **Spectral Analysis**: Extracts energy envelopes across low (bass drum), mid (vocals/chords), and high (cymbals/snares) frequencies.
2. **Onset Detection**: Identifies downbeats and major rhythmic drops using dynamic thresholding.
3. **Choreography Synthesis Mapping**:
   - **Heavy Sub-bass drops** $\to$ Ground Mines (stations L, LC, C, RC, R) or heavy Brocade Crowns at Center.
   - **Sharp Treble / Snare hits** $\to$ Strobes, Crackle, or Crossettes on alternating flanks.
   - **Sustained musical swells / build-ups** $\to$ Rapid Whistling Comets or Fan Sweeps.
   - **Climax / Outro** $\to$ Grand Finale Barrage spanning all 6 stations.
4. **Quantization**: Aligns generated cues to nearest 1/4 or 1/8 note subdivisions based on estimated tempo (BPM).

### 7.4 Macro Pattern Brushes
- **Fan Sweeps**: Spawns cues sequenced $50\text{ ms}$ apart across stations: `L -> LC -> C -> RC -> R` or `R -> RC -> C -> LC -> L`, or center-out `C -> (LC, RC) -> (L, R)`.
- **Alternating Mines**: Creates rhythmic ground mines alternating between outer flanks (`L`, `R`) and inner stations (`LC`, `RC`, `C`) on alternating beats.
- **Grand Finale Barrages**: Generates dense clusters of overlapping shells with staggered apex breaks over a $3 - 8\text{ second}$ crescendo.

### 7.5 Live Tap-to-Record Hotkeys (`1`–`9`)
Operators can author shows in real time during audio playback by tapping keys `1` through `9`.
- Keys `1` through `6` map to Launch Stations (L, LC, C, RC, R, Fan).
- Keys `7`, `8`, `9` map to quick macro brushes (Mine salvo, Crossette burst, Finale break).
- Tapping a key immediately inserts a timecoded cue at the current playhead timestamp.

### 7.6 Show JSON Schema (`.pyro.json`)
```json
{
  "$schema": "https://pyrosync.app/schemas/v1/show.json",
  "version": "1.0.0",
  "metadata": {
    "title": "Neon Horizon",
    "author": "PyroSync Studio",
    "duration": 92.5,
    "bpm": 128
  },
  "audio": {
    "title": "Neon Horizon Theme",
    "url": "assets/audio/neon_horizon.mp3",
    "duration": 92.5
  },
  "calibration": {
    "brightnessGain": 1.0,
    "blackLevelCutoff": 0.02,
    "bloomIntensity": 1.2,
    "particleScale": 1.0,
    "aspectRatio": "16:9"
  },
  "cues": [
    {
      "id": "cue-001",
      "timecode": 0.000,
      "station": "C",
      "archetype": "peony",
      "color": "#ff3366",
      "altitude": 0.85,
      "angle": 0.0,
      "duration": 2.2
    },
    {
      "id": "cue-002",
      "timecode": 1.875,
      "station": "Fan",
      "archetype": "brocade_crown",
      "color": "#ffd700",
      "altitude": 0.90,
      "angle": 0.0,
      "duration": 3.5
    }
  ]
}
```

---

## 8. Deep Requirements Breakdown: R5 — Presets & Demo Shows

### 8.1 Demo Show Specifications
1. **Demo Show 1: "Ode to Radiance"**
   - **Duration**: ~90 seconds.
   - **Genre**: Cinematic Orchestral / Electronic hybrid.
   - **Narrative Arc**:
     - *Introduction (0:00 - 0:25)*: Subtle high-altitude Horsetail Waterfalls and gentle gold Willows at Center.
     - *Build-up (0:25 - 0:50)*: Rhythmic Whistling Comets and alternating Chrysanthemums on Left and Right stations.
     - *Apex / Drop (0:50 - 1:15)*: Intense Fan Sweeps, concentric Rings, and multi-color Crossettes.
     - *Grand Finale (1:15 - 1:30)*: 20-shell dense Brocade Crown and Crackling Dragon Egg cake barrage across all stations.
   - **Bundled Audio**: Pre-rendered royalty-free or procedurally scheduled synthesized soundtrack.

2. **Demo Show 2: "Neon Horizon"**
   - **Duration**: ~75 seconds.
   - **Genre**: 128 BPM Synthwave / Cyberpunk.
   - **Narrative Arc**:
     - *Intro (0:00 - 0:15)*: Alternating ground mines on kick beats (`L` and `R`).
     - *Verse (0:15 - 0:35)*: Rapid Peony and Strobe bursts synced to neon cyan and magenta color palette.
     - *Drop (0:35 - 1:00)*: High-speed fan sweeps, whistling comets, and dragon eggs.
     - *Outro Finale (1:00 - 1:15)*: Wall-to-wall golden kamuro cascades with ground mine barrages.
   - **Bundled Audio**: Pre-rendered royalty-free or procedurally scheduled synthesized soundtrack.

### 8.2 Live Audio-Reactive Profile Specifications
1. **Club / EDM Profile**
   - **Sub-bass Sensitivity**: High ($1.4\times$), Lowpass cutoff: $140\text{ Hz}$. Shell Trigger: Ground Mines (outer) and Brocades (center).
   - **Mid Sensitivity**: Moderate ($1.0\times$). Shell Trigger: Peonies and Rings.
   - **Treble Sensitivity**: High ($1.3\times$). Shell Trigger: Strobes and Crackle.
   - **Cooldown Gate**: $120\text{ ms}$.

2. **Ambient Profile**
   - **Sub-bass Sensitivity**: Low ($0.6\times$). Shell Trigger: Willow / Kamuro.
   - **Mid Sensitivity**: High ($1.5\times$). Shell Trigger: Horsetail Waterfall and Chrysanthemum.
   - **Treble Sensitivity**: Low ($0.5\times$). Shell Trigger: Soft Gold Comets.
   - **Cooldown Gate**: $500\text{ ms}$ (enforces calm, spacious cascades).

3. **Percussive Profile**
   - **Sub-bass Sensitivity**: Moderate ($1.0\times$). Shell Trigger: Ground Mines.
   - **Mid Sensitivity**: High ($1.4\times$). Shell Trigger: Crossettes and Peonies.
   - **Treble Sensitivity**: Very High ($1.8\times$). Shell Trigger: Whistling Comets and Strobes.
   - **Cooldown Gate**: $75\text{ ms}$ (allows rapid drum fills without locking up).

---

## 9. Quality and Verification Matrix

Every single acceptance criterion from `ORIGINAL_REQUEST.md` is mapped to definitive verification checks.

| AC # | Acceptance Criterion | Target Requirement | Concrete Verification Check / Procedure | Success Threshold |
|---|---|---|---|---|
| **AC-1** | Clean Build | Build & Code Quality | Run `npm run build` from repository root | Zero TypeScript errors, zero bundler errors, exit code `0` |
| **AC-2** | Clean Runtime Dev Server | Build & Code Quality | Run `npm run dev` and navigate to `http://localhost:5173` | Server boots without errors; browser console contains zero uncaught exceptions |
| **AC-3** | Pitch-Black Canvas Background | R1 Visual & Projection | Inspect canvas background in devtools; measure sampled pixel colors with canvas readPixels or eyedropper | Background is strictly `#000000` (`rgb(0,0,0)`) with zero ambient backlight glow or gray wash |
| **AC-4** | 60+ FPS under 25,000+ Particles | R1 Performance | Trigger Grand Finale Barrage macro (spawns 25,000+ active particles); monitor FPS meter | Frame rate remains $\ge 60\text{ FPS}$ with zero garbage-collection stutter or frame drops |
| **AC-5** | Projector Calibration Dynamic Real-Time | R1 Calibration | Adjust Gain (0.5 to 2.0), Black Cutoff (0.0 to 0.15), Particle Scale, and Aspect Mask dropdown | Canvas visuals update immediately in real time; letterbox borders clamp to `#000000` |
| **AC-6** | Drift-Free Timecode Audio Sync | R3 Audio Engine | Start playback of 90s audio track with cues at 10.0s, 30.0s, 60.0s; inspect trigger timestamps | Audio clock and cue firing deviate by $< 15\text{ ms}$ over full playback duration |
| **AC-7** | Live Mic 3-Band LEDs & Cooldown Gating | R3 Audio Reactive | Feed audio input into mic; observe LED meters and trigger rates | Sub-bass, Mid, Treble LED meters dance to audio; cooldown gate prevents runaway re-triggers |
| **AC-8** | 1-Click Auto-Choreographer | R4 Choreographer | Click "Auto-Choreograph" button on loaded audio track | Timeline track lanes populate with synchronized rhythmic cues matching musical energy |
| **AC-9** | Tap-to-Record Hotkeys (`1`–`9`) | R4 Studio Studio | Start playback and tap keys `1` through `6` at musical beats | Timecoded cues are deposited directly at the playhead position on corresponding tracks |
| **AC-10**| Borderless Pop-Out Window & BroadcastChannel Sync | R2 Dual Display | Click "Pop-Out Projector"; fire cue and adjust calibration in studio | Secondary window opens borderless pure black; launches cues and updates calibration with zero noticeable lag |
| **AC-11**| Fullscreen (`F`) & Panic Blackout (`Esc`/`Space`) | R2 Output Controls | Press `F` to enter projection mode; press `Esc`/`Space` while 10+ shells explode | `F` enters borderless fullscreen; `Esc`/`Space` kills all particles within 1 frame (<= 16ms) |
| **AC-12**| Show JSON Export / Import Round-Trip | R4 Studio Studio | Export current show to `.json`, clear timeline, and re-import exported file | Imported show contains exact identical cues, timestamps, tracks, audio settings, and calibration |

---

## 10. Architectural Recommendations for Implementation

1. **Frontend Foundation**: Vite + React 18 / 19 + TypeScript.
2. **Graphics Subsystem**: Three.js with raw `InstancedBufferGeometry` / `BufferGeometry` or custom WebGL shader material to maintain zero allocations during `requestAnimationFrame`.
3. **Inter-Window State**: `BroadcastChannel('pyrosync_channel')` with structured TypeScript event union types.
4. **State Management**: Lightweight reactive store (Zustand or NanoStores) enabling instantaneous cue updates and decoupled rendering.
5. **Web Audio Graph**: Dedicated singleton audio context with master compressor, procedural synthesis nodes, and 3-band FFT analyzer nodes.
