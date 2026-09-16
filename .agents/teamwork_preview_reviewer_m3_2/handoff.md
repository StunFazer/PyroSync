# Milestone 3 Review & Adversarial Critic Report

**Reviewer**: Reviewer 2 (Roles: Reviewer, Adversarial Critic)  
**Target Milestone**: Milestone 3 — BroadcastChannel Dual Display & Pop-Out Projection  
**Target Worker**: Worker 1 (`.agents/teamwork_preview_worker_m3_1`)  
**Verdict**: **APPROVE**  
**Overall Risk Assessment**: **LOW**  

---

## 1. Observation

### 1.1 Source Code Inspection
- **`src/state/BroadcastBus.ts`** (364 lines):
  - Provides a robust event-driven wrapper over `BroadcastChannel('pyrosync_projection_bus')`.
  - Implements strongly typed protocol methods: `requestStateSync`, `sendStateSyncResponse`, `play`, `pause`, `seek`, `fireCue`, `panicBlackout`, `updateCalibration`, `loadShow`, `ping`.
  - Heartbeat subsystem (lines 229–262): `startHeartbeat(intervalMs, timeoutMs)` transmits `PYRO_HELLO` carrying `performance.now()`. Receiver responds with `PYRO_PONG` returning `sendTimestamp`. Sender computes RTT locally (`now - sendTimestamp`), eliminating clock skew between disparate window timelines.
  - Missing pongs detection (lines 239–246): Periodic timeout monitor checks if `now - _lastPongReceivedTime > timeoutMs` and transitions bus state to `isConnected = false, latencyMs = null`.
  - Malformed message filtering (line 296): Safely drops null, primitive, or untyped payloads without throwing uncaught exceptions.
  - Safe lifecycle cleanup (lines 270–289): `destroy()` terminates timers, closes channel, clears listener maps/sets, and resets connection flags.
- **`src/app/ProjectorWindow.tsx`** (150 lines):
  - Pure-black presentation canvas filling 100vw / 100vh (`fixed inset-0 w-screen h-screen bg-black overflow-hidden select-none cursor-none [&_*]:cursor-none`).
  - Zero operator UI buttons, headers, or borders visible.
  - Mount sequence: Instantiates `BroadcastBus('projector')`, registers handlers for `FIRE_CUE`, `PANIC_BLACKOUT`, `TRANSPORT_SEEK`, `CALIBRATION_UPDATE`, `STATE_SYNC_RESPONSE`, `LOAD_SHOW`, and dispatches `requestStateSync()`.
  - Hotkey interlocks: `F` toggles fullscreen; `Esc` and `Space` immediately execute local particle blackout and propagate `panicBlackout()` back to Studio.
- **`src/components/display/ProjectorSyncStatus.tsx`** (63 lines):
  - Displays `"Projector: Connected (x ms latency)"` (with emerald pulse dot) or `"Projector: Offline"` (with neutral dot).
  - Includes pop-out launch action button with external link icon.
- **`src/app/App.tsx`** (679 lines):
  - Route detection (lines 23–52): Detects `/projector`, `#/projector`, `#projector` and renders `<ProjectorWindow />`.
  - BroadcastBus Studio role initialization (lines 134–160): Mounts bus, starts heartbeat (`1500ms / 4500ms`), listens for `STATE_SYNC_REQUEST` to return `currentAudioTime`, `isAudioPlaying`, `audioTrackTitle`, and `calibration`.
  - Pop-up launch handling (lines 240–255): `window.open('#/projector', 'PyroSyncProjector', 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no')`.
  - Pop-up blocker detection: Catches null/closed return and renders accessible amber warning toast (`data-testid="popup-blocked-warning"`) with unblock instructions and fallback link.
  - Bidirectional panic blackout (lines 153–156): Receives `PANIC_BLACKOUT` from Projector and immediately halts audio and clears viewport particles without echoing loops.

### 1.2 Build & Test Verification
1. **`npm run build`**:
   - Exit code: `0`
   - Output: `✓ 1591 modules transformed. built in 7.84s`. 0 TypeScript or bundler errors.
2. **`npm test`**:
   - Exit code: `0`
   - Output: `SUCCESS: All 260 test cases passed across all 4 tiers (2798 assertions verified in 146.1ms)`.
3. **`npm run test:all`**:
   - Exit code: `0`
   - Output: `pass 10, fail 0` across 5 suites.

### 1.3 Adversarial Probing & Stress Test Results
- **Barrage Flood Stress Test**: Dispatched 2,000 cues in an instantaneous loop from Studio to Projector.
  - Result: 2,000 of 2,000 cues successfully received and dispatched in <200ms with zero message drops, zero memory stalls, and zero exceptions.
- **Disconnect & Reconnect Lifecycle**:
  - Phase 1 (Connected): `isConnected = true`, `latency = 0ms`.
  - Phase 2 (Projector destroyed): After timeout window, Studio correctly reported `isConnected = false`, `latency = null`.
  - Phase 3 (New Projector spawned): Studio automatically re-acquired connection `isConnected = true`, `latency = 0ms`.
- **State Synchronization on Mount**:
  - Projector dispatched `STATE_SYNC_REQUEST`. Studio replied with `STATE_SYNC_RESPONSE` carrying exact calibration (`21:9`, `gain = 1.75`), `time = 42.5s`, and `isPlaying = true`. Projector applied calibration.
- **Bidirectional Blackout**:
  - Studio panic -> Projector cleared (1 message received, 0 echo back to studio).
  - Projector panic -> Studio cleared (1 message received, 0 echo back to projector).
- **Multi-Window Fanout**:
  - Simultaneous dual-projector instances (P1, P2) received broadcast cues concurrently. Destroying P1 left P2 active, and Studio remained connected without disruption.
- **Malformed Message Resilience**:
  - Injected `null`, `undefined`, arbitrary strings, numbers, empty objects, and invalid schemas. All filtered cleanly with zero crashes.
- **Memory & Timer Lifecycle**:
  - 500 consecutive `BroadcastBus` instantiate-subscribe-destroy cycles completed cleanly with zero leaked timer intervals.

---

## 2. Logic Chain

1. **Requirement R2 & AC-10 Compliance**:
   - The original specification requires a pop-out projector window utilizing `BroadcastChannel` for zero-latency event-driven synchronization with a pure-black borderless canvas.
   - `BroadcastBus.ts` fulfills the IPC requirements by encapsulating `'pyrosync_projection_bus'` with typed protocol methods and heartbeat latency tracking.
   - `ProjectorWindow.tsx` fulfills the display requirements by mounting a full-screen `#000000` canvas with `cursor: none`, zero UI chrome, and dynamic calibration updates.
2. **Requirement R2 & AC-11 Blackout Interlock Compliance**:
   - Panic blackout (`Esc` or `Space`) triggers immediate particle pool zeroing in both directions.
   - Because `BroadcastChannel` natively does not dispatch messages back to the originating window instance, bidirectional blackout synchronization operates without feedback/echo loops.
3. **Resilience & Fault Tolerance**:
   - Heartbeat timeout handling prevents stale "connected" states if the pop-out window is closed or crashes.
   - Popup blocker detection in `App.tsx` handles browser restrictions gracefully by providing both an accessible notification and a direct hyperlink.
4. **Integrity Verification**:
   - Codebase was thoroughly inspected for integrity violations: no hardcoded test responses, no facade/dummy objects, no bypassed logic.
   - Full TypeScript build and the complete 4-tier test suite execute genuinely with zero regressions.

---

## 3. Caveats

1. **Redundant Keydown Listener in `ProjectorWindow.tsx`**:
   - Both `ProjectorWindow` and `CanvasViewport` bind `keydown` listeners on `window` for `Escape` and `Space`. When either key is pressed in the pop-out window, both listeners fire and invoke `blackout()`. Because `blackout()` is idempotent (setting active particle count to 0), this has no negative visual or state consequence, but it results in two identical `PANIC_BLACKOUT` messages sent to Studio on a single keypress.
2. **OS Multi-Monitor Hardware Dependent Constraints**:
   - In browser environments, programmatic positioning of a pop-up window onto a physical secondary monitor requires the experimental Window Management API (`getScreenDetails()`), which requires explicit permissions. Standard `window.open` opens a 1920x1080 window that the operator drags onto the projector monitor before pressing `F` to engage full-screen. This is standard and compliant with web security models.

---

## 4. Conclusion

Milestone 3 is verified, fully functional, resilient under adversarial conditions, and meets all architectural, functional, and performance requirements specified in `ORIGINAL_REQUEST.md` and `PROJECT.md`.

**Explicit Verdict**: **`APPROVE`**

---

## 5. Verification Method

To independently verify all findings and test suite integrity:

1. **Compilation Check**:
   ```bash
   npm run build
   ```
   Expect: Exit code 0, clean Vite bundle emission with 0 TypeScript errors.

2. **Full E2E 4-Tier Test Suite**:
   ```bash
   npm test
   npm run test:all
   ```
   Expect: Exit code 0, all 260 tests passed across 4 tiers, 2798 assertions verified.

3. **IPC Architecture & Rapid Barrage Verification**:
   ```bash
   node --experimental-strip-types -e "
   import { BroadcastBus } from './src/state/BroadcastBus.ts';
   const studio = new BroadcastBus('studio', 'verify_bus');
   const projector = new BroadcastBus('projector', 'verify_bus');
   let count = 0;
   projector.on('FIRE_CUE', () => { count++; });
   for (let i = 0; i < 1000; i++) studio.fireCue({ id: 'c_' + i, archetype: 'peony', station: 'center', color: '#ff0', altitude: 0.8 });
   setTimeout(() => { console.log('Received:', count); studio.destroy(); projector.destroy(); process.exit(count === 1000 ? 0 : 1); }, 150);
   "
   ```
   Expect: `Received: 1000`, exit code 0.

4. **Heartbeat Timeout & Reconnection Verification**:
   ```bash
   node --experimental-strip-types -e "
   import { BroadcastBus } from './src/state/BroadcastBus.ts';
   const s = new BroadcastBus('studio', 'hb_verify');
   let p = new BroadcastBus('projector', 'hb_verify');
   s.startHeartbeat(50, 150);
   setTimeout(() => {
     console.log('Connected:', s.isConnected);
     p.destroy();
     setTimeout(() => {
       console.log('Disconnected:', !s.isConnected);
       s.destroy();
       process.exit(0);
     }, 200);
   }, 100);
   "
   ```
   Expect: `Connected: true`, then `Disconnected: true`, exit code 0.
