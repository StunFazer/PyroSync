# Milestone 3 Review & Adversarial Challenge Report

## 1. Observation

### Source Code Inspection
- **`src/types/index.ts`** (lines 82–99):
  - Defines `BroadcastMessage` union covering all specification types: `STATE_SYNC_REQUEST`, `STATE_SYNC_RESPONSE`, `TRANSPORT_PLAY`, `TRANSPORT_PAUSE`, `TRANSPORT_SEEK`, `FIRE_CUE`, `PANIC_BLACKOUT`, `CALIBRATION_UPDATE`, `LOAD_SHOW`, `PYRO_HELLO`, and `PYRO_PONG`.
  - Defines `ProjectorConnectionState` interface with `isConnected: boolean`, `latencyMs: number | null`, and `lastHeartbeatTime: number | null`.
- **`src/state/BroadcastBus.ts`** (lines 19–363):
  - Backed by native `BroadcastChannel` with channel `'pyrosync_projection_bus'`.
  - Full type-safe message dispatcher: `postMessage`, `send`, `on(type, handler)`, `onMessage(handler)`, `onConnectionChange(handler)`.
  - Implements heartbeat ping/pong protocol (`PYRO_HELLO` / `PYRO_PONG`). In `ping()`, sends timestamp using `performance.now()`; projector echoes `sendTimestamp: msg.timestamp`. Studio computes roundtrip latency `rtt = Math.max(0, Math.round(now - sendTime))`, eliminating cross-window clock skew.
  - Timeout check periodically monitors `_lastPongReceivedTime > timeoutMs` and transitions state to disconnected (`isConnected: false, latencyMs: null`).
  - Implements high-level dispatch helpers (`requestStateSync`, `sendStateSyncResponse`, `play`, `pause`, `seek`, `fireCue`, `panicBlackout`, `updateCalibration`, `loadShow`).
  - Full lifecycle cleanup in `destroy()` and `close()`.
- **`src/app/ProjectorWindow.tsx`** (lines 13–149):
  - Renders a pure-black `#000000` canvas filling 100% viewport (`fixed inset-0 w-screen h-screen bg-black select-none cursor-none [&_*]:cursor-none`).
  - Sets `document.body.style.cursor = 'none'` and `document.body.style.backgroundColor = '#000000'`.
  - Contains **zero operator UI chrome**: no headers, docks, timeline tracks, calibration sliders, or buttons.
  - Mounts `CanvasViewport` with `config` synced from studio.
  - On mount, requests initial state via `bus.requestStateSync()`.
  - Listens to `FIRE_CUE`, `PANIC_BLACKOUT`, `TRANSPORT_SEEK`, `CALIBRATION_UPDATE`, `STATE_SYNC_RESPONSE`, and `LOAD_SHOW`.
  - Binds hotkeys: `F` for fullscreen toggle (`document.documentElement.requestFullscreen()`), and `Esc` or `Space` for instant blackout that clears local particles AND transmits `PANIC_BLACKOUT` back to Studio.
- **`src/components/display/ProjectorSyncStatus.tsx`** (lines 16–62):
  - Renders status label strictly adhering to format: `Projector: Connected (${latencyDisplay})` (e.g. `"Projector: Connected (26 ms latency)"`) or `"Projector: Offline"`.
  - Features dynamic status LED indicator with emerald pulse when connected (`bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.85)]`) and neutral gray (`bg-neutral-600`) when offline.
  - Includes optional pop-out launch link with `ExternalLink` icon.
- **`src/app/App.tsx`** (lines 22–52, 133–192, 223–255, 437–492):
  - Route detection checks `isProjectorRoute` (`window.location.pathname` or `hash` matching `/projector` or `#/projector`) and routes to `<ProjectorWindow />`.
  - Initializes `BroadcastBus` in `'studio'` role and runs heartbeat (`bus.startHeartbeat(1500, 4500)`).
  - Handles `STATE_SYNC_REQUEST` by transmitting current timecode, transport state, show ID, and calibration.
  - Handles `PANIC_BLACKOUT` received from Projector window by immediately zeroing particles and halting audio.
  - Implements `handleOpenProjector`: calls `window.open('#/projector', 'PyroSyncProjector', 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no')`.
  - Pop-up blocker detection checks `!popout || popout.closed` and renders an accessible warning toast (`data-testid="popup-blocked-warning"`) with an unblock guidance link.
  - Top floating HUD integrates `<ProjectorSyncStatus />` and the dedicated `"Pop-Out Projector"` launch button (`data-testid="popout-projector-btn"`).

### Build and Test Execution Outputs
- **`npm run build`**:
  ```
  vite v6.4.3 building for production...
  transforming...
  ✓ 1591 modules transformed.
  rendering chunks...
  computing gzip size...
  dist/index.html                   0.71 kB │ gzip:   0.47 kB
  dist/assets/index-CBtBdnPS.css   27.95 kB │ gzip:   5.47 kB
  dist/assets/index-BgqGftVP.js   722.41 kB │ gzip: 193.26 kB
  ✓ built in 6.00s
  Exit code: 0
  ```
- **`npm test`**:
  ```
  ======================================================================
           PYROSYNC E2E OPAQUE-BOX TEST SUITE EXECUTION (TIERS 1-4)    
  ======================================================================
  | Tier 1: Features     | 12+ Shell Archetypes (Peony..Finale)         |     60 |      0 |         75 |    2ms |
  | Tier 1: Features     | Projector Calibration Engine                 |     25 |      0 |        117 |    1ms |
  | Tier 1: Features     | Audio Engine & Pyromusical Sync              |     30 |      0 |        165 |   40ms |
  | Tier 1: Features     | Timeline Studio & 6 Spatial Tracks           |     20 |      0 |        201 |    1ms |
  | Tier 1: Features     | Macro Brushes & Auto-Choreographer           |     20 |      0 |        236 |    1ms |
  | Tier 1: Features     | Hotkeys & Safety Interlocks (F/Esc/1-9)      |     20 |      0 |        268 |    1ms |
  | Tier 1: Features     | Show JSON Export & Import Pipeline           |     25 |      0 |        350 |    2ms |
  | Tier 2: Boundaries   | Boundary Limits & Stress (Saturation, Clamps) |     40 |      0 |        411 |    2ms |
  | Tier 3: Combinations | Cross-Feature Pairwise Interactions          |     15 |      0 |        449 |   93ms |
  | Tier 4: Scenarios    | Real-World E2E Scenarios (5 Full Shows)      |      5 |      0 |        526 |    4ms |
  ---------------------------------------------------------------------------------------------------------
  | TOTALS               | 10 Test Modules                              |    260 |      0 |       2798 | 144.7ms |
  SUCCESS: All 260 test cases passed across all 4 tiers (2798 assertions verified in 144.7ms).
  Exit code: 0
  ```
- **`npm run test:all`**:
  ```
  ▶ PyroSync 4-Tier E2E Test Suite
  ℹ tests 10
  ℹ suites 5
  ℹ pass 10
  ℹ fail 0
  Exit code: 0
  ```

### Empirical Stress Tests
- **Bi-directional IPC & Disconnect Detection**:
  - Direct Node execution with dual `BroadcastBus` instances confirmed handshake, latency calculation, sync response, cue dispatch, and calibration sync.
  - Closing the projector instance confirmed that the studio detects the missing pings and transitions `isConnected` to `false` and resets `latencyMs` to `null`.
- **High-Frequency Barrage Stress**:
  - Pumping 1,000 cues through `BroadcastBus` executed in 39ms with 100% receipt and zero loss.

## 2. Logic Chain

1. **Protocol Completeness**: The message definitions in `src/types/index.ts` fully satisfy the `BroadcastMessage` contract from `PROJECT.md` §182–192 plus heartbeat extensions (`PYRO_HELLO`, `PYRO_PONG`).
2. **Clock-Independent Latency Measurement**: Because `PYRO_PONG` echoes back `sendTimestamp` originating from the sender's own `performance.now()`, the calculated roundtrip latency is immune to system clock discrepancies between distinct browser tabs or OS threads.
3. **Presentation Canvas Isolation**: `ProjectorWindow.tsx` mounts only `CanvasViewport` with styling `background: #000000`, `cursor: none`, and zero DOM controls. The operator studio controls (PanicBar, AudioMeters, SFXControls, Timeline, CalibrationPanel) are completely omitted from this route.
4. **Safety Interlock Propagation**: Both `ProjectorWindow` and `App` register keyboard hotkeys (`Esc` / `Space`) that trigger particle clearing and transmit `PANIC_BLACKOUT`. Both endpoints listen for incoming `PANIC_BLACKOUT` and clear local simulations immediately, ensuring full safety redundancy across primary and secondary screens.
5. **Pop-Up Blocker Resilience**: If the browser's pop-up blocker intercepts `window.open()`, `popout` is null or `popout.closed` is true. `App.tsx` catches this condition and displays `popup-blocked-warning` with actionable user guidance and a direct link to `#/projector`.
6. **Zero Integrity Violations**: Source code inspection confirmed that no test results are hardcoded, no facade logic is present, and all tests execute actual algorithmic assertions.

## 3. Caveats

- **Browser Native Pop-Up Policy**: Modern desktop browsers require user-initiated gestures to open pop-out windows without restriction. Because the "Pop-Out Projector" button is triggered via direct click (`onClick`), modern browsers permit the popup in standard configurations. The implemented blocker toast provides a graceful fallback for locked-down browser profiles.
- **Physical Multi-Monitor Detection**: The browser Web API does not allow programmatic window placement onto secondary monitors without the Window Management API permission (`getScreenDetails`). Opening with dimensions `1920x1080` allows the operator to drag or maximize the window directly onto the target projector.

## 4. Conclusion

**Verdict: APPROVE**

Milestone 3 (BroadcastChannel Dual Display & Pop-Out Projection) satisfies all technical, architectural, visual, and performance requirements:
- Clean production build (`tsc && vite build`) with zero errors.
- 100% of test suite passing (260/260 tests, 2,798 assertions).
- Borderless pure-black `#000000` projector display with zero UI chrome and hidden cursor.
- Full bidirectional BroadcastChannel IPC with sub-millisecond dispatch and roundtrip heartbeat latency tracking.
- Redundant instant panic blackout propagation.
- Pop-up blocker detection with warning banner and direct fallback link.

## 5. Verification Method

To independently verify this evaluation:

1. **Build Verification**:
   ```bash
   npm run build
   ```
   Verify build completes with exit code 0 and zero TypeScript or Rollup errors.

2. **Test Suite Verification**:
   ```bash
   npm test
   npm run test:all
   ```
   Verify 260 tests pass across all 4 tiers with 2,798 assertions.

3. **IPC Latency and Heartbeat Verification**:
   ```bash
   node --experimental-strip-types -e "import { BroadcastBus } from './src/state/BroadcastBus.ts'; const s = new BroadcastBus('studio'); const p = new BroadcastBus('projector'); s.ping(); setTimeout(() => { console.log('Studio connected:', s.isConnected, 'Latency:', s.latencyMs, 'ms'); s.destroy(); p.destroy(); process.exit(0); }, 50);"
   ```
   Expected output: `Studio connected: true Latency: <number> ms`.

4. **Visual & UI Chrome Inspection**:
   Inspect `src/app/ProjectorWindow.tsx`:
   - Lines 128–147: Confirm root container has `style={{ background: '#000000', cursor: 'none' }}`.
   - Confirm only `CanvasViewport` is rendered with no controls, docks, or text elements.
