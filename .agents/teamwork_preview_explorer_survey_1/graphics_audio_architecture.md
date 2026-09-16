# PyroSync Graphics & Audio Architecture Specification
**Document ID**: ARCH-R1-R3-001  
**Version**: 1.0.0  
**Author**: Graphics & Audio Architect Explorer  
**Date**: 2026-09-13  
**Target Requirements**: R1 (Pure-Black Fireworks Engine) & R3 (Dual-Mode Audio Engine)

---

## 1. Executive Summary & Technology Stack Selection

PyroSync is a live projection player and digital pyrotechnics programmer designed for live performance and projection mapping. Unlike standard web animations, projector mapping requires:
1. **Absolute pitch-black (`#000000`) background clamp**: Any residual gray, tonemapping curve lifting zero, or blooming ambient background illuminates the projection surface (e.g. building facades, scrims, or stage backdrops), destroying the illusion of fireworks emerging from the night sky.
2. **60+ FPS zero-allocation particle simulation**: Sustaining 25,000+ to 50,000+ active particles during dense multi-shell barrages without a single garbage collection (GC) micro-pause.
3. **Sub-millisecond audio-visual synchronization**: Sample-accurate locking between musical transients, timeline cues, lift times, and bursting points.

### Recommended Technology Stack

| Layer | Recommended Choice | Rationale & Alternatives Evaluated |
| :--- | :--- | :--- |
| **Bundler & Tooling** | **Vite 6 + TypeScript 5.x** | Sub-second HMR, optimized Rollup production builds, native ES modules. Node v24.11.1 and npm 11.6.4 verified in environment. |
| **Frontend Framework** | **React 18 / 19** | Used strictly for operator controls, calibration sliders, inspector panels, and modals. **Critical architectural rule**: The WebGL render loop and Web Audio synthesis run imperatively outside React's render tree using `useRef` and standalone engine controller classes to ensure 0 React re-renders per frame. |
| **UI Styling & Icons** | **Tailwind CSS + Lucide React** | Zero runtime CSS overhead, dark-mode first design, responsive controls, crisp hardware/AV iconography. |
| **Graphics Engine** | **Three.js (`three` r160+) `THREE.Points` with custom `ShaderMaterial`** | Evaluated vs Raw WebGL and `InstancedMesh`. Raw WebGL requires re-authoring matrix projection, quaternion math for 3D shell rotations, and FBO ping-pong bloom passes from scratch. `THREE.Points` provides native WebGL2 performance with a **single draw call** (`gl.drawArrays(gl.POINTS)`) for all 30,000+ particles, while custom shaders enforce the pure-black clamp and additive HDR bloom. |
| **Post-Processing** | **Three.js `EffectComposer` + Custom `ProjectorCalibrationPass`** | Combines modified `UnrealBloomPass` with a custom GLSL clamping pass that forces all luminance below a configurable threshold strictly to `vec3(0.0, 0.0, 0.0)`. |
| **Audio Engine** | **Web Audio API (`AudioContext`)** | Native hardware-accelerated audio graph with `BiquadFilterNode`, `AnalyserNode`, `AudioBufferSourceNode`, and custom procedural synthesis nodes. Zero external audio library bloat. |

---

## 2. Zero-Allocation Typed Array Particle Engine (R1)

### 2.1 The Garbage Collection Problem & Solution
In JavaScript, allocating objects (`new Particle()`, `new THREE.Vector3()`, or object literals `{ x, y }`) inside a 60 FPS animation loop forces the V8 garbage collector to run periodic Scavenger and Mark-Sweep passes. A single 10ms GC pause drops a frame; a 50ms major GC stalls an entire musical beat.

**PyroSync Architecture Guarantee**: **Zero heap allocations during simulation**. All particle attributes reside in pre-allocated flat typed arrays (`Float32Array`, `Uint8Array`).

### 2.2 Memory Architecture: Structure of Arrays (SoA)
We pre-allocate a fixed pool of $N_{\max} = 65,536$ particles at initialization ($2^{16}$ allows 16-bit indexing and comfortably exceeds the 25,000+ requirement).

```
+-------------------------------------------------------------------------------+
|                             PARTICLE POOL MEMORY                              |
+-------------------------------------------------------------------------------+
| WebGL Vertex Attributes (Interleaved or Contiguous BufferAttributes)          |
|  - aPosition:  Float32Array[N * 3]  (x, y, z)                                  |
|  - aColor:     Float32Array[N * 4]  (r, g, b, a)                              |
|  - aSizeLife:  Float32Array[N * 2]  (current_size, normalized_age [0..1])     |
|  - aArchetype: Float32Array[N * 2]  (type_id, sparkle_phase)                   |
+-------------------------------------------------------------------------------+
| CPU Physics Simulation State (Allocated Once, Never Mutated via GC)           |
|  - vx, vy, vz: Float32Array[N]      (velocity vectors in m/s)                 |
|  - drag:       Float32Array[N]      (air resistance factor, e.g. 0.96..0.99)   |
|  - gravity:    Float32Array[N]      (per-particle downward acceleration)      |
|  - age:        Float32Array[N]      (seconds alive)                           |
|  - maxLife:    Float32Array[N]      (total lifespan in seconds)               |
|  - twinkle:    Float32Array[N]      (frequency/rate of strobe or flicker)     |
|  - trailRate:  Float32Array[N]      (spark/smoke spawn interval)              |
|  - subType:    Uint8Array[N]        (secondary break archetype, e.g. Crossette)|
+-------------------------------------------------------------------------------+
| Indices Tracking                                                              |
|  - aliveCount: number (0 <= aliveCount <= N_max)                              |
+-------------------------------------------------------------------------------+
```

### 2.3 $O(1)$ Swap-and-Pop Particle Recycling
Instead of linked lists or array slicing (`array.splice`), dead particles are recycled in $O(1)$ time by copying the last active particle into the dead slot:

```typescript
// Active particles occupy indices [0 ... aliveCount - 1]
function updateParticles(dt: number): void {
  let i = 0;
  while (i < aliveCount) {
    age[i] += dt;
    if (age[i] >= maxLife[i]) {
      // Particle expired: handle secondary burst trigger if needed
      if (subType[i] > 0) {
        triggerSecondaryBreak(i);
      }
      
      // Swap-and-Pop: copy state from (aliveCount - 1) to i
      const last = aliveCount - 1;
      if (i < last) {
        copyParticle(last, i);
      }
      aliveCount--;
      // Do NOT increment i; re-check the swapped particle at index i
    } else {
      // Numerical integration (Euler / Verlet)
      const d = Math.pow(drag[i], dt * 60);
      vx[i] *= d;
      vy[i] = (vy[i] - gravity[i] * dt) * d;
      vz[i] *= d;

      // Update position
      const pIdx = i * 3;
      posBuffer[pIdx]     += vx[i] * dt;
      posBuffer[pIdx + 1] += vy[i] * dt;
      posBuffer[pIdx + 2] += vz[i] * dt;

      // Update normalized life & alpha
      const normLife = age[i] / maxLife[i];
      sizeLifeBuffer[i * 2 + 1] = normLife;
      
      // Color fade / sparkle updates
      updateVisualAttributes(i, normLife, dt);
      
      i++;
    }
  }

  // Synchronize GPU Buffer Attributes
  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.aColor.needsUpdate = true;
  geometry.attributes.aSizeLife.needsUpdate = true;
  
  // Set update range to avoid uploading inactive tail
  geometry.setDrawRange(0, aliveCount);
}
```

### 2.4 Instant Panic / Blackout Silencing
When the operator triggers Blackout (`Esc` or `Space`):
- `aliveCount = 0` instantly.
- `geometry.setDrawRange(0, 0)` sets the GPU draw count to 0.
- All active audio sound FX gain nodes are ramped to 0 within 5ms (`gain.setTargetAtTime(0, audioCtx.currentTime, 0.005)`).
- Zero memory reallocations or GC pauses occur during or after panic recovery.

---

## 3. Shaders, Pure-Black Pipeline & Calibration Engine (R1)

### 3.1 Projector Black Level Clamping: The `#000000` Constraint
In projection mapping, the black level is physical darkness. If a canvas renders `rgb(5, 5, 5)` or tone mapping lifts the shadows, the projector projects a visible gray trapezoid/rectangle on the stage.

PyroSync guarantees optical black via a 3-stage defense:
1. **WebGL Clear Color**: `renderer.setClearColor(0x000000, 1.0);`
2. **Tonemapping Disabled**: `renderer.toneMapping = THREE.NoToneMapping;` (avoids standard ACES/Reinhard curves that lift dark pixels or compress high-dynamic ranges).
3. **Custom Calibration Post-Processing Shader (`ProjectorCalibrationPass`)**:
   Applies a hard black-cutoff knee and dynamic gain adjustment.

```glsl
// ProjectorCalibrationPass.frag.glsl
uniform sampler2D tDiffuse;
uniform sampler2D tBloom;
uniform float uGain;             // Master brightness/gain multiplier [0.5 - 3.0]
uniform float uBlackClamp;       // Cutoff threshold [0.001 - 0.08, default: 0.015]
uniform float uBloomIntensity;   // Bloom blend weight [0.0 - 2.5]
uniform float uContrast;         // Contrast curve exponent [0.8 - 1.5]
varying vec2 vUv;

void main() {
    vec4 baseColor = texture2D(tDiffuse, vUv);
    vec4 bloomColor = texture2D(tBloom, vUv);

    // Combine scene with additive bloom
    vec3 color = baseColor.rgb + bloomColor.rgb * uBloomIntensity;
    
    // Master gain
    color *= uGain;

    // Contrast adjustment
    color = pow(color, vec3(uContrast));

    // Perceptual luminance calculation (ITU-R BT.709)
    float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));

    // Strict black cutoff clamp:
    // If luminance is below uBlackClamp, force hard 0.0 (pitch black)
    // Above uBlackClamp, apply smooth cubic hermite knee to prevent banding
    if (lum < uBlackClamp) {
        color = vec3(0.0);
    } else {
        float knee = smoothstep(uBlackClamp, uBlackClamp + 0.02, lum);
        color = color * knee;
    }

    gl_FragColor = vec4(color, 1.0);
}
```

### 3.2 Particle Vertex & Fragment Shaders (`THREE.ShaderMaterial`)
Standard Three.js `PointsMaterial` uses rectangular textures that create square artifacts when scaled. PyroSync uses custom procedural point shaders with analytical Gaussian glow:

```glsl
// particle.vert.glsl
attribute vec4 aColor;
attribute vec2 aSizeLife; // x: base size, y: normalized life [0..1]
attribute vec2 aArchetype; // x: archetype id, y: flicker seed
varying vec4 vColor;
varying vec2 vArchetype;
varying float vLife;

uniform float uParticleScale; // Global calibration particle scale [0.5 - 3.0]

void main() {
    vColor = aColor;
    vArchetype = aArchetype;
    vLife = aSizeLife.y;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    // Distance attenuation
    float pointSize = aSizeLife.x * uParticleScale * (300.0 / -mvPosition.z);
    
    // Smooth fade out in the last 15% of lifetime
    float fade = 1.0 - smoothstep(0.85, 1.0, aSizeLife.y);
    gl_PointSize = max(1.0, pointSize * fade);
    gl_Position = projectionMatrix * mvPosition;
}
```

```glsl
// particle.frag.glsl
varying vec4 vColor;
varying vec2 vArchetype;
varying float vLife;
uniform float uTime;

void main() {
    // Distance from center of point sprite [0.0 to 0.5]
    vec2 coord = gl_PointCoord - vec2(0.5);
    float distSq = dot(coord, coord);
    if (distSq > 0.25) discard; // Strict circular disc cutoff

    // Analytical Gaussian falloff for intense radiant core
    float intensity = exp(-distSq * 18.0);
    
    // Strobe / flicker modulation
    float alpha = vColor.a;
    if (vArchetype.x == 5.0) { // Strobe archetype
        float strobe = step(0.5, fract(uTime * 18.0 + vArchetype.y));
        alpha *= strobe;
    } else if (vArchetype.x == 1.0) { // Chrysanthemum sparkle
        float flicker = 0.7 + 0.3 * sin(uTime * 40.0 + vArchetype.y);
        alpha *= flicker;
    }

    vec3 finalRgb = vColor.rgb * intensity * 1.8; // HDR boost for bloom capture
    gl_FragColor = vec4(finalRgb, alpha * intensity);
}
```

### 3.3 Aspect Ratio Masking & Viewport Scissor
Projectors come in native aspect ratios:
- **16:9** (Standard 1080p, 4K UHD)
- **16:10** (Conference / Commercial WUXGA 1920x1200)
- **4:3** (Legacy architectural projection)
- **21:9** (Ultra-wide panoramic blend)

**Dual Implementation Strategy**:
1. **GPU Viewport Scissor**: During rendering, `gl.scissor(x, y, w, h)` clips output to the exact target bounding box centered on screen. Pixels outside the scissor region are cleared to `#000000`.
2. **Calibration Overlay Guides**: A configurable operator overlay rendering cyan/amber alignment crosshairs, safety bounds, center grid, and outer matte letterboxing. In presentation mode (`F`), guide lines vanish, leaving solid black matte bars.

---

## 4. Pyrotechnic Physics & Lifecycle Specifications (12+ Archetypes)

Each pyrotechnic archetype has distinct physical aerodynamics, burst distribution, burn duration, color progression, and acoustic trigger profile.

| # | Archetype | Particle Count | Burst Velocity ($m/s$) | Drag ($k_d$) | Gravity ($m/s^2$) | Burn Life ($s$) | Visual Signature & Aerodynamics |
|---|:---|:---|:---|:---|:---|:---|:---|
| **1** | **Peony** | 200 – 350 | $35 - 55$ (Uniform Sphere) | 0.965 | 9.8 | $1.2 - 1.8$ | Classic spherical shell. Stars expand evenly without trailing smoke. Clean, sudden extinguishing of solid vibrant colors (Ruby, Cobalt, Emerald). |
| **2** | **Chrysanthemum** | 300 – 500 | $40 - 60$ (Uniform Sphere) | 0.970 | 9.8 | $2.0 - 2.8$ | Spherical burst leaving persistent gold/silver sparkling trails. Particle size decays with high-frequency micro-flicker. |
| **3** | **Willow / Kamuro** | 450 – 750 | $25 - 45$ (Hemispherical) | 0.985 | 14.5 | $3.5 - 5.2$ | Dense, heavy golden streamers with long burn duration. Fall down in an umbrella curve, creating drooping willow branches that cascade near the ground. |
| **4** | **Brocade Crown** | 500 – 800 | $45 - 70$ (Spherical Wide) | 0.980 | 12.0 | $3.0 - 4.5$ | Ultra-bright reflective gold/silver crowns. Wide canopy expansion with trailing star tips that linger long after burst peak. |
| **5** | **Rings (Saturn / Concentric)** | 180 – 320 | $30 - 50$ (Planar 2D Ring) | 0.970 | 9.8 | $1.5 - 2.2$ | Particles constrained to a 2D circle tilted in 3D space via random 3D quaternion rotation. Dual concentric rings use contrasting colors (e.g. Cyan outer, Magenta inner). |
| **6** | **Strobe / Blinkers** | 200 – 400 | $25 - 40$ (Spherical) | 0.960 | 9.8 | $2.5 - 3.8$ | Periodic on/off flashing stars (12–18 Hz). Sharp visual pulses alternating between full illumination and complete darkness. |
| **7** | **Crossette** | 60 – 120 (Primary) $\to \times 4$ | $35 - 50$ (Primary) $\to 25$ | 0.975 | 9.8 | $2.2 - 3.0$ | Two-stage shell: 8 primary stars shoot out, then at $t = 0.8s$, each star fractures into a 4-way cross ($90^\circ$ perpendicular breaks) with synchronized pop sounds. |
| **8** | **Crackle / Dragon Eggs** | 250 – 450 | $30 - 50$ (Spherical) | 0.965 | 9.8 | $1.8 - 2.6$ | Primary stars disperse silently, then flash violently into micro-burst clusters with crackling audio transients between $t = 0.8s$ and $1.5s$. |
| **9** | **Ground Mines** | 400 – 700 | $v_y: 50-85, v_x: \pm 30$ | 0.960 | 12.0 | $1.0 - 1.6$ | Instantaneous ground-level eruption! Upward fan/cone trajectory ($45^\circ - 90^\circ$) lighting up the bottom third of the projection surface immediately upon cue. |
| **10** | **Whistling Comets** | 80 – 150 (Wake) | $v_y: 60-95, v_x: \pm 10$ | 0.990 | 8.0 | $2.2 - 3.5$ | High-speed climbing projectile with corkscrew/spiral jitter ($x = A\sin(\omega t), z = A\cos(\omega t)$). Leaves dense trailing wake, accompanied by rising procedural whistle. |
| **11** | **Horsetail Waterfall** | 300 – 550 | $v_x: \pm 15, v_y: -5..+10$ | 0.985 | 16.0 | $3.5 - 5.0$ | Asymmetric apex ejection that immediately drifts downwards like a glowing waterfall or silver horse tail cascading under heavy gravity. |
| **12** | **Finale Barrage** | 2,500 – 6,000 (Multi-shot) | Compound Multi-Velocity | Var | Var | $3.0 - 6.0$ | Macro pattern cue: Rapid coordinated sequence across all 5 spatial launch stations (L, LC, C, RC, R) firing cascading Mines, Brocades, and Crackle shells to fill the screen. |

### 4.1 Mathematical Formulation for Fibonacci Sphere Particle Distribution
To generate mathematically uniform spherical bursts without clustering at the poles:
For particle index $k \in [0, N-1]$:
$$\phi = \arccos\left(1 - \frac{2(k + 0.5)}{N}\right)$$
$$\theta = \pi (1 + \sqrt{5}) k \approx 3.883222 \cdot k$$
$$v_x = v_{\text{burst}} \sin(\phi) \cos(\theta), \quad v_y = v_{\text{burst}} \sin(\phi) \sin(\theta), \quad v_z = v_{\text{burst}} \cos(\phi)$$
A random variance $\sigma \sim [-0.1, +0.1] \cdot v_{\text{burst}}$ is added to prevent artificial grid patterns.

---

## 5. Dual-Mode Audio Engine Architecture (R3)

```
                                  +---------------------------------------+
                                  |         User Interaction Boot         |
                                  |       (AudioContext.resume())         |
                                  +-------------------+-------------------+
                                                      |
                   +----------------------------------+----------------------------------+
                   |                                                                     |
         [MODE 1: Audio File Sync]                                             [MODE 2: Live Mic/Line-In]
                   |                                                                     |
  +----------------+----------------+                                   +----------------+----------------+
  | AudioBuffer / HTMLAudioElement  |                                   | navigator.mediaDevices.         |
  | (Sample-accurate currentTime)   |                                   | getUserMedia({ audio: true })   |
  +----------------+----------------+                                   +----------------+----------------+
                   |                                                                     |
                   v                                                                     v
            [Music Gain Node]                                                     [Mic Gain Node]
                   |                                                                     |
       +-----------+-----------+                                                         |
       |                       |                                                         |
       v                       v                                                         v
 [Master Gain]        [3-Band Filter Bank] <---------------------------------------------+
       |                       |
       v           +-----------+-----------+
  [Destination]    |           |           |
 (Speaker Out)     v           v           v
              [Sub-Bass]     [Mid]     [Treble]
               Lowpass     Bandpass    Highpass
               < 140Hz    140-2500Hz   > 2500Hz
                   |           |           |
                   v           v           v
              [Analyser]  [Analyser]  [Analyser]
                   |           |           |
                   +-----------+-----------+
                               |
                               v
               +-------------------------------+
               | Dynamic Noise Floor Estimator |
               |     (Asymmetric Alpha EMA)    |
               +---------------+---------------+
                               |
                               v
               +-------------------------------+
               |   Schmitt Hysteresis Trigger  |
               |     & Cooldown Timer Gates    |
               +---------------+---------------+
                               |
                   +-----------+-----------+
                   |                       |
                   v                       v
            [LED Trigger UI]      [Auto-Choreographer /
             (Peak / Flash)        Shell Launch Engine]
```

### 5.1 Sample-Accurate Timeline Synchronization
Visual rendering loops (`requestAnimationFrame`) suffer from frame jitter ($\pm 1-5$ ms). Pyromusical synchronization must not rely on `performance.now()` delta accumulation.

**Master Synchronization Rule**:
1. When audio playback begins, record:
   $T_{\text{audio\_start}} = \text{audioContext.currentTime}$
   $T_{\text{timeline\_start}} = \text{timeline.currentPlayheadSeconds}$
2. On every animation frame:
   $$T_{\text{playhead}} = T_{\text{timeline\_start}} + (\text{audioContext.currentTime} - T_{\text{audio\_start}}) \times \text{playbackRate}$$
3. **Lift Time Compensation**: A real fireworks shell takes $t_{\text{lift}}$ (typically $0.8s - 1.5s$) to climb from the mortar to its apex burst height:
   $$T_{\text{launch}} = T_{\text{burst\_beat}} - t_{\text{lift}}$$
   The timeline cue scheduler looks ahead by $100\text{ ms}$. When $T_{\text{playhead}} \ge T_{\text{launch}}$, the launch mortar is fired with the launch thump sound; when $T_{\text{playhead}} \ge T_{\text{burst\_beat}}$, the shell explodes at apex in exact sync with the musical downbeat.

### 5.2 3-Band FFT Analyzer & Dynamic Noise-Floor Algorithm
Standard fixed thresholds fail in live environments due to mic gain differences, crowd noise, and venue acoustics. PyroSync implements **Dynamic Noise-Floor Adaptation**:

1. **Filter Specifications**:
   - **Sub-bass**: Biquad Filter lowpass, $f_c = 140\text{ Hz}, Q = 1.0$ (kicks, 808 bass, sub drops).
   - **Mid**: Biquad Filter bandpass, $f_0 = 1000\text{ Hz}, Q = 1.2$ (snares, claps, vocals, brass).
   - **Treble**: Biquad Filter highpass, $f_c = 2500\text{ Hz}, Q = 1.0$ (hi-hats, cymbals, synth plucks).

2. **Asymmetric EMA Tracking**:
   For each band $b \in \{\text{sub}, \text{mid}, \text{treble}\}$, calculate current frame RMS energy $E_b(t)$.
   $$\text{If } E_b(t) < N_b(t): \quad N_b(t) \leftarrow (1 - \alpha_{\text{down}}) N_b(t) + \alpha_{\text{down}} E_b(t) \quad (\alpha_{\text{down}} = 0.05 \text{ - fast decay})$$
   $$\text{If } E_b(t) \ge N_b(t): \quad N_b(t) \leftarrow (1 - \alpha_{\text{up}}) N_b(t) + \alpha_{\text{up}} E_b(t) \quad (\alpha_{\text{up}} = 0.003 \text{ - slow creep})$$
   This ensures the noise floor drops quickly in quiet passages, but does not climb aggressively during sustained loud segments.

3. **Onset Flux & Cooldown Gating**:
   Instantaneous onset signal:
   $$\text{Flux}_b(t) = \max(0, E_b(t) - N_b(t) \times k_{\text{sensitivity}})$$
   - **Sub-bass Cooldown**: $250\text{ ms}$ (prevents double triggers on sustained 808s) $\to$ Triggers Ground Mines or Heavy Brocade shells.
   - **Mid Cooldown**: $180\text{ ms}$ $\to$ Triggers Peony or Chrysanthemum shells across spatial stations.
   - **Treble Cooldown**: $120\text{ ms}$ $\to$ Triggers Crackle, Strobe, or Whistling Comets.

---

## 6. Procedural Pyrotechnic Sound FX Synthesis (R3)

All sound effects are synthesized procedurally via the Web Audio API without requiring external audio asset files.
**Strict Requirement Compliance**: **All procedural SFX default to MUTED** (`sfxGain.gain.value = 0.0`). The user can enable them via the master volume slider.

```
                      +---------------------------------------+
                      |         Procedural SFX Engine         |
                      | (Default: sfxGain.gain.value = 0.0)   |
                      +-------------------+-------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                 |                                 |
 [1. Launch Thump]                [2. Aerial Boom]                 [3. Crackle / Eggs]
  - Sine Osc: 130Hz -> 35Hz        - Sine Osc: 80Hz -> 24Hz         - 8-15 Micro-clicks
    (Exp ramp 70ms)                  (Exp ramp 200ms)                 (Noise bursts 8ms)
  - Noise Burst:                   - Lowpass Noise:                 - Random intervals
    180Hz Bandpass (Q=3)             450Hz cutoff, decay 1.2s         over 400ms window
  - Duration: 120ms                - Secondary Reflection Tail      - Duration: 450ms
                                     (120ms delay, 800ms decay)
```

### 6.1 Launch Thump (Mortar Muzzle Concussion)
Simulates high-pressure gas expelling the shell from the launch tube:
```typescript
function playLaunchThump(ctx: AudioContext, destination: AudioNode): void {
  const t0 = ctx.currentTime;
  
  // 1. Pitch-dropped sine body
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(130, t0);
  osc.frequency.exponentialRampToValueAtTime(35, t0 + 0.07);
  oscGain.gain.setValueAtTime(0.8, t0);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
  osc.connect(oscGain);
  oscGain.connect(destination);
  osc.start(t0);
  osc.stop(t0 + 0.12);

  // 2. Muzzle gas noise burst
  const noise = createNoiseBufferSource(ctx, 0.08);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(180, t0);
  filter.Q.setValueAtTime(3.0, t0);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.6, t0);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(destination);
  noise.start(t0);
}
```

### 6.2 Aerial Boom / Report (High-Altitude Burst)
Simulates the concussive burst report followed by natural low-frequency ground reflections:
```typescript
function playAerialBoom(ctx: AudioContext, destination: AudioNode, power: number = 1.0): void {
  const t0 = ctx.currentTime;

  // 1. Sub-bass concussion sine
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(85, t0);
  subOsc.frequency.exponentialRampToValueAtTime(24, t0 + 0.25);
  subGain.gain.setValueAtTime(1.0 * power, t0);
  subGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);
  subOsc.connect(subGain);
  subGain.connect(destination);
  subOsc.start(t0);
  subOsc.stop(t0 + 0.6);

  // 2. Diffuse lowpass rumble tail
  const noise = createNoiseBufferSource(ctx, 1.4);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(450, t0);
  filter.frequency.exponentialRampToValueAtTime(120, t0 + 1.2);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.85 * power, t0);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.3);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(destination);
  noise.start(t0);
}
```

### 6.3 Crackle / Dragon Eggs (Granular Micro-Clicks)
Simulates bismuth/magnesium crackle grains exploding in random sequence:
```typescript
function playCrackleBurst(ctx: AudioContext, destination: AudioNode): void {
  const t0 = ctx.currentTime;
  const count = 12 + Math.floor(Math.random() * 8);
  
  for (let i = 0; i < count; i++) {
    const clickTime = t0 + Math.random() * 0.45;
    const duration = 0.008 + Math.random() * 0.012;
    const clickNoise = createNoiseBufferSource(ctx, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2500 + Math.random() * 1500, clickTime);
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.3 + Math.random() * 0.4, clickTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, clickTime + duration);
    clickNoise.connect(filter);
    filter.connect(clickGain);
    clickGain.connect(destination);
    clickNoise.start(clickTime);
  }
}
```

---

## 7. Demo Audio Tracks & Royalty-Free Music Strategy

To satisfy R5 ("Pre-loaded with 2 complete choreographed demo shows with synchronized audio tracks"):
1. **Primary Asset Path**: Provide two royalty-free, cinematic music tracks in `public/audio/`:
   - `show_1_electronic_pulse.mp3` (High-energy electronic track with distinct drum hits and drops).
   - `show_2_symphonic_anthem.mp3` (Cinematic orchestral crescendo suited for classical pyromusical displays).
2. **Procedural Fallback Music Generator**: If running in an offline or restricted bundle environment without external audio file access, PyroSync embeds a built-in `ProceduralDemoMusicGenerator` utilizing Web Audio synthesis to generate a rich 60-second pyromusical EDM / Synthwave track into an `AudioBuffer` at runtime.

---

## 8. Code Layout & Architecture Module Boundaries

```
src/
├── engine/
│   ├── graphics/
│   │   ├── FireworksEngine.ts        # Main engine coordinator (tick loop, resize, panic)
│   │   ├── ParticlePool.ts           # Zero-allocation Float32Array pool & swap-and-pop
│   │   ├── ProjectorPipeline.ts      # EffectComposer, UnrealBloomPass, ProjectorCalibrationPass
│   │   ├── ViewportScissor.ts        # Aspect ratio masking (16:9, 16:10, 4:3, 21:9)
│   │   ├── shaders/
│   │   │   ├── particle.vert.glsl    # Point sprite vertex shader with attenuation
│   │   │   ├── particle.frag.glsl    # Analytical Gaussian glow & strobe shader
│   │   │   └── calibration.frag.glsl # Pure-black cutoff clamp and gain shader
│   │   └── archetypes/
│   │       ├── ShellRegistry.ts      # Parameter definitions for all 12+ shell types
│   │       ├── BurstMath.ts          # Fibonacci sphere, ring quaternions, crossette math
│   │       └── ShellSpawner.ts       # Spawns stars, lifts, and secondary breaks into pool
│   │
│   ├── audio/
│   │   ├── AudioEngine.ts            # Master Web Audio coordinator & clock synchronization
│   │   ├── AudioPlayer.ts            # Audio file loading, decoding, scrubbing, waveform data
│   │   ├── FFTAnalyzer.ts            # 3-band filter bank (Sub, Mid, Treble) & dynamic noise floor
│   │   ├── SoundFXSynthesizer.ts     # Procedural Launch Thump, Boom, and Crackle (default MUTED)
│   │   ├── MicReactiveService.ts     # getUserMedia input stream & LED trigger state
│   │   └── ProceduralDemoTrack.ts    # Fallback synthesizer generating demo show audio
│   │
│   └── core/
│       ├── TimecodeClock.ts          # Sample-accurate master playhead clock
│       └── CueScheduler.ts           # Lookahead queue with lift-time compensation
│
├── types/
│   ├── graphics.ts                   # Particle, Archetype, Calibration, AspectRatio types
│   ├── audio.ts                      # FFTBands, TriggerMeter, SoundFXConfig types
│   └── timeline.ts                   # Cue, Track, ShowDocument types
│
└── components/                       # React UI (Isolated from 60 FPS animation loop)
    ├── calibration/
    │   └── CalibrationPanel.tsx      # Sliders for gain, black clamp, bloom, aspect ratio
    ├── audio/
    │   ├── AudioMeterLEDs.tsx        # 3-Band reactive visual indicators
    │   └── MasterAudioControl.tsx    # Play, seek, volume, mic toggle
    └── viewport/
        └── FireworksCanvas.tsx       # Canvas mount point connecting to FireworksEngine
```

---

## 9. Verification & Acceptance Criteria Mapping

| Requirement | Acceptance Criterion | Technical Verification Method |
| :--- | :--- | :--- |
| **R1 (Pure Black)** | Canvas background strictly `#000000` with zero ambient backlight or gray washout. | Inspect WebGL canvas with pixel probe: RGB values of unlit pixels must measure strictly `(0, 0, 0)`. Verify `uBlackClamp` cuts off luminance below threshold. |
| **R1 (Performance)** | Particle engine sustains 60+ FPS during multi-shell barrages (25,000+ particles) with zero GC pauses. | Profile with Chrome DevTools Performance panel under 30,000 active particles: Heap allocation rate during simulation must be 0 KB/s; frame time $< 12\text{ ms}$. |
| **R1 (Archetypes)** | Complete pyrotechnic library supporting 12+ shell archetypes. | Verify all 12 shell types spawn with expected velocity profiles, drag, burn times, and secondary breaks (Crossette split, Crackle pop). |
| **R1 (Calibration)** | Calibration panel controls master gain, black clamp, bloom, particle scale, and aspect ratio masks. | Dynamically adjust sliders: confirm uniform uniforms update in real time on both main and popout windows. |
| **R3 (Audio Sync)** | Sample-accurate timecode synchronization with zero drift over show duration. | Compare `AudioContext.currentTime` against timeline cue firing times: drift must remain $< 2\text{ ms}$ over 5 minutes. |
| **R3 (3-Band FFT)** | Live mic input activates 3-band LED indicators with dynamic noise floor and cooldown gating. | Feed mic input with varying noise floors: confirm LED meters track dynamic threshold; verify cooldown gate suppresses runaway firing. |
| **R3 (Sound FX)** | Procedural Web Audio FX synthesized; default to MUTED. | Verify `sfxGain.gain.value === 0.0` at application start; verify launch thump, aerial boom, and crackle play clean audio when unmuted. |
