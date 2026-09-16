# PyroSync E2E Test Infrastructure & Architecture

**Specification Version**: 1.0.0  
**Test Track**: E2E Testing Track (Opaque-Box & Requirement-Driven)  
**Methodology**: Dual Track Architecture (Tiers 1–4)  
**Authoritative Sources**: `ORIGINAL_REQUEST.md`, `PROJECT.md`, `spec_report.md`

---

## 1. Overview & Testing Philosophy

PyroSync is a live projection player and digital pyrotechnics programmer. Because it operates in live performance and projection mapping environments, reliability is mission-critical. The E2E testing suite is built strictly on **opaque-box, requirement-driven verification**:

1. **Opaque-Box Testing**: Tests interact with the application through public entry points, external interfaces, message protocols, event dispatches, and serialization boundaries without depending on internal implementation shortcuts.
2. **Authoritative Expected Outputs**: Every assertion is derived from the explicit requirements in `ORIGINAL_REQUEST.md` (R1–R5) and Acceptance Criteria (AC-1 to AC-12).
3. **Deterministic & Isolated**: Each test establishes its own state, sets up isolated mock environments for audio/canvas/BroadcastChannel, and cleans up after itself without cross-test state leakage.
4. **Zero-Dependency Native Execution**: Built to run natively in Node.js 24+ via native TypeScript execution and Node's test runner, with full compatibility with Vitest.

---

## 2. 4-Tier Test Architecture

```
tests/
├── fixtures/                     # Test data fixtures, demo shows, audio presets
│   ├── demo-shows.ts             # "Cosmic Awakening" & "Neon Horizon" shows
│   ├── corrupted-shows.ts        # Malformed & edge-case JSON fixtures
│   └── audio-profiles.ts         # Club/EDM, Ambient, Percussive profiles
├── harness/                      # Test environment mocks & assertions
│   ├── audio-mock.ts             # Web Audio API mock (AudioContext, Analyser, Nodes)
│   ├── canvas-mock.ts            # WebGL / Canvas 2D simulation mock
│   ├── broadcast-mock.ts         # Multi-window BroadcastChannel IPC harness
│   └── test-utils.ts             # Assertion helpers, timecode drift checkers
├── tier1-features/               # Tier 1: Feature Coverage (>=5 tests per feature)
│   ├── archetypes.test.ts        # 12+ shell archetypes (60+ tests)
│   ├── calibration.test.ts       # Projector calibration engine (25+ tests)
│   ├── audio-sync.test.ts        # Drift-free player, FFT, noise-floor, SFX (30+ tests)
│   ├── timeline-tracks.test.ts   # 6 spatial tracks, cue inspector, mute/solo (20+ tests)
│   ├── macro-brushes.test.ts     # Fan sweeps, alternating mines, finale (15+ tests)
│   ├── hotkeys.test.ts           # Fullscreen 'F', Blackout 'Esc'/'Space', 1-9 (20+ tests)
│   └── export-import.test.ts     # Show JSON schema export/import (25+ tests)
├── tier2-boundaries/             # Tier 2: Boundary & Corner Cases (>=5 tests per feature)
│   └── boundary-corner.test.ts   # Max particles, 0 volume, clamps, corrupted JSON (40+ tests)
├── tier3-combinations/           # Tier 3: Cross-Feature Interactions
│   └── cross-feature.test.ts     # Blackout during finale, calibration sync, etc. (15+ tests)
├── tier4-scenarios/              # Tier 4: Real-World Application Scenarios
│   └── real-world-scenarios.test.ts # 5 full realistic end-to-end shows/sessions
├── runner.ts                     # Standalone CLI test runner with formatted output
└── all.test.ts                   # Unified test suite index for node:test / vitest
```

### 2.1 Tier 1: Feature Coverage (>= 5 Test Cases per Feature)

Tier 1 verifies individual features across their primary functional paths:
- **12+ Shell Archetypes**: Peony, Chrysanthemum, Willow/Kamuro, Brocade Crown, Rings, Strobe, Crossette, Crackle/Dragon Eggs, Ground Mines, Whistling Comets, Horsetail Waterfall, Finale Barrage.
- **Calibration Engine**: Gain (0.10–3.00), Black-level cutoff clamp (0.00–0.20), Bloom intensity (0.00–3.00), Particle size scale (0.50–4.00), Aspect ratio masks (16:9, 16:10, 4:3, 21:9, off).
- **Dual-Mode Audio Engine**: Drift-free timecode synchronization (<15ms deviation), waveform peak generation, 3-band FFT analyzer (Sub-bass, Mid, Treble), dynamic noise-floor adaptation, re-trigger cooldown gates (50–1000ms), procedural SFX (launch thump, boom, crackle; defaulted to MUTED).
- **Timeline Studio**: 6 spatial launch tracks (`left`, `left_center`, `center`, `right_center`, `right`, `fan`), track mute/solo, cue inspector parameter edits (altitude, angle, color, duration).
- **Macro Brushes**: Fan sweeps (L->R, R->L, Center-Out), alternating mines, grand finale barrages with crescendo.
- **Hotkeys & Controls**: Presentation fullscreen toggle (`F`), instant panic blackout (`Esc`/`Space`), live tap-to-record keys (`1`–`9`), input field hotkey suppression.
- **Export / Import**: Show JSON serialization (v1.0.0 schema), deserialization, round-trip fidelity, error trapping on missing fields.

### 2.2 Tier 2: Boundary & Corner Cases (>= 5 Test Cases per Feature)

Tier 2 exercises stress, resource limits, and extreme input values:
- **Max Particle Limits**: Particle pool saturation at 32,768 and 65,536 particles; ring-buffer wrapping without memory reallocation or crash.
- **Zero Volume & Muted Defaults**: Initial procedural SFX volume strictly 0.0, muted flag strictly true, master volume clamping `[0.0, 1.0]`.
- **Negative & Out-of-Bounds Coordinates**: Station coordinates outside `[-1.0, 1.0]`, altitude normalization outside `[0.2, 1.0]`, extreme launch angles `[-180°, +180°]`.
- **Black-Level Clamp Boundaries**: Edge conditions at `0.00`, `0.02`, `0.20`, luminance remapping when all fragment RGB values fall below threshold.
- **Empty Timeline**: Transport playback with 0 cues, export of empty show, auto-choreography on empty audio buffer.
- **Corrupted JSON Import**: Malformed JSON syntax, missing required fields (`version`, `cues`), invalid timestamps (`NaN`, negative), unknown shell archetypes (fallback to `peony`).
- **Mic Permission Denied**: Graceful rejection handling when `navigator.mediaDevices.getUserMedia` fails, preserving file audio mode without unhandled exceptions.
- **Rapid Hotkey Spam**: 100+ consecutive `F` toggles, rapid `Esc`/`Space` spamming during active particle bursts, rapid 50Hz numeric tap-to-record bursts.

### 2.3 Tier 3: Cross-Feature Combinations (Pairwise Interactions)

Tier 3 validates complex multi-system concurrent interactions:
- **Blackout during Finale Barrage**: Triggering emergency panic kill while a 25,000+ particle salvo is bursting — particle pool drops to 0 active particles within 1 frame (<=16ms), audio stops immediately.
- **Calibration Changes during Popout Sync**: Adjusting gain/cutoff/aspect in Operator Studio transmits `CALIBRATION_UPDATE` via `BroadcastChannel` and immediately applies shader updates on secondary projector window.
- **Tap-to-Record during Active Audio Playback**: Pressing keys `1`–`9` while timecoded audio is actively playing creates cues with timestamps matching `audioContext.currentTime` with zero drift.
- **Auto-Choreographer on Custom Audio Track**: Ingesting audio file, performing spectral transient detection, and generating multi-station cues across tracks 1–6 without clashing.
- **Transport Seek Mid-Playback with Active Salvo**: Seeking backward in timeline immediately flushes in-flight particles from future cues and repositions audio clock.
- **Audio Reactive Triggers Concurrent with Show Playback**: Live mic band triggers coexist with choreographed timeline playback without state corruption.
- **Panic Blackout Across BroadcastChannel**: Operator panic press (`Esc`) propagates `PANIC_BLACKOUT` message to popout projector window within <5ms.
- **JSON Show Import During Active Playback**: Loading new `.pyro.json` show while existing show is running safely halts transport, resets timecode to `00:00.000`, clears active particles, and mounts new show.

### 2.4 Tier 4: Real-World Application Scenarios (>= 5 Full End-to-End Shows)

Tier 4 simulates complete production workflows:
1. **Scenario 1: Full 90-Second Pyromusical Playback ("Ode to Radiance")**:
   - 90s audio track, 120+ timecoded cues, 4-movement structure (ambient intro -> build -> drop -> grand finale).
   - Verifies continuous playhead tracking, zero drift (<15ms), particle lifecycle across all stations.
2. **Scenario 2: Multi-Monitor Projection Sync Session**:
   - Studio window + Pop-out Projector window connected via `pyrosync_projection_bus`.
   - Initial state handshake (`STATE_SYNC_REQUEST` / `STATE_SYNC_RESPONSE`), play/pause/seek sync, cue execution, live calibration updates, and panic blackout sync.
3. **Scenario 3: Live Audio Reactive Concert Set**:
   - Live microphone stream with 3-band FFT analyzer in loud club environment.
   - Club/EDM profile applied: Sub-bass kicks trigger Mines/Brocades, Treble triggers Strobes/Crackle, dynamic noise floor adapts to rising crowd noise, cooldown gates prevent stutter-fire.
4. **Scenario 4: Show Export-Edit-Reimport Pipeline**:
   - Operator authors show using macro brushes and tap-to-record.
   - Exports show to `.pyro.json`, validates JSON schema, programmatically alters cue parameters, reimports into clean studio, and verifies 100% cue and calibration fidelity.
5. **Scenario 5: High-Lumen Architectural Projection Setup**:
   - Calibrated for 21:9 ultra-wide architectural projection surface.
   - Custom calibration: Black cutoff = 0.05, Gain = 1.8x, Particle scale = 2.0x, Aspect mask = 21:9.
   - Execution of "Neon Horizon" 75-second synthwave pyromusical show.

---

## 3. Test Runner & Invocation

### 3.1 Primary Test Runner
The test suite includes a standalone TypeScript runner with rich terminal reporting, timing breakdown, tier statistics, and POSIX exit codes (`0` for success, `1` for failures):

```bash
# Run full 4-tier E2E test suite
node tests/runner.ts

# Or run via npm
npm test
```

### 3.2 Native Node.js Test Runner
The test files are also compatible with Node's built-in test runner:

```bash
# Run all test files via node:test
node --test tests/**/*.test.ts
```

### 3.3 Vitest Runner
For IDE integration and watch mode, the tests run seamlessly under Vitest:

```bash
# Run via vitest
npx vitest run
```

---

## 4. Coverage Thresholds & Quality Gates

| Tier | Target Areas | Minimum Test Cases | Passing Threshold |
| :--- | :--- | :--- | :--- |
| **Tier 1** | 12 Archetypes, Calibration, Audio Sync, Tracks, Brushes, Hotkeys, JSON | >= 195 | 100% Pass |
| **Tier 2** | Max Particles, Zero Vol, Clamps, Empty Timeline, Corrupted JSON, Mic Deny, Spam | >= 40 | 100% Pass |
| **Tier 3** | Pairwise cross-feature combinations | >= 15 | 100% Pass |
| **Tier 4** | Full realistic end-to-end application scenarios | >= 5 | 100% Pass |
| **Total** | **Comprehensive Opaque-Box Suite** | **>= 255 tests** | **100% Pass** |

---

## 5. Acceptance Criteria Mapping (AC-1 to AC-12)

| Acceptance Criterion | Verification Method | Test Location |
| :--- | :--- | :--- |
| **AC-1**: Clean Build | TypeScript compile & Vite build | `tests/tier1-features/` & build check |
| **AC-2**: Clean Runtime Server | Dev server boot & zero uncaught exceptions | `tests/harness/` |
| **AC-3**: Pure-Black Canvas (`#000000`) | Luminance shader test & clear color verification | `tests/tier1-features/calibration.test.ts` |
| **AC-4**: 60+ FPS Under 25,000+ Particles | Particle pool allocation & benchmark verification | `tests/tier1-features/archetypes.test.ts`, `tier2-boundaries/` |
| **AC-5**: Real-Time Projector Calibration | Gain, black cutoff, particle scale, aspect mask tests | `tests/tier1-features/calibration.test.ts` |
| **AC-6**: Drift-Free Timecode Audio Sync | <15ms audio clock vs cue dispatch deviation | `tests/tier1-features/audio-sync.test.ts` |
| **AC-7**: Live Mic 3-Band LEDs & Cooldowns | FFT filter splitting, noise-floor, cooldown gates | `tests/tier1-features/audio-sync.test.ts` |
| **AC-8**: 1-Click Auto-Choreographer | Transient detection & rhythmic cue generation | `tests/tier1-features/macro-brushes.test.ts` |
| **AC-9**: Tap-to-Record Hotkeys (`1`–`9`) | Timecode cue insertion at current playhead | `tests/tier1-features/hotkeys.test.ts` |
| **AC-10**: Pop-Out Window & BroadcastChannel | Sub-millisecond sync across `BroadcastChannel` | `tests/tier3-combinations/cross-feature.test.ts`, `tier4-scenarios/` |
| **AC-11**: Fullscreen (`F`) & Panic (`Esc`/`Space`)| Immediate UI hide & 1-frame active particle kill | `tests/tier1-features/hotkeys.test.ts`, `tier3-combinations/` |
| **AC-12**: Show JSON Export / Import Round-Trip | Serialization, schema validation, fidelity check | `tests/tier1-features/export-import.test.ts` |
