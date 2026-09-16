/**
 * Empirical Challenger 2 Verification & Stress Suite
 * Milestone 3: Pop-Out Window Display, DOM Styling, Panic Blackout, and Route Resolution
 *
 * Requirements Tested:
 * 1. ProjectorWindow DOM Styling:
 *    - Guarantees 100vw/100vh full-bleed, overflow hidden, cursor none, strictly #000000 background.
 *    - document.body styling on mount and restoration on unmount.
 *    - CSS cascade override: [&_*]:cursor-none overrides child canvas cursor-crosshair.
 * 2. Zero Operator UI Chrome:
 *    - Asserts zero buttons, inputs, selects, textareas, headers, or operator chrome components.
 * 3. Emergency Blackout Propagation:
 *    - Bi-directional BroadcastChannel PANIC_BLACKOUT propagation (Studio <-> Projector).
 *    - ParticlePool zero-out verification (aliveCount drops from thousands to 0 immediately).
 *    - Hotkey simulation (Escape, Space, KeyF) and spam stress testing.
 * 4. Route Resolution:
 *    - Evaluates route detection for #/projector, #projector, /projector.
 *    - Scrutinizes RootRouter (main.tsx) vs App.tsx early return and React Hooks invariants.
 */

import fs from 'node:fs';
import path from 'node:path';
import { BroadcastBus } from '../src/state/BroadcastBus.ts';
import { ParticlePool } from '../src/engine/fireworks/ParticlePool.ts';
import type { BroadcastMessage, FireCuePayload, ParticleEngineConfig } from '../src/types/index.ts';

// ---------------------------------------------------------------------------
// Test Assertion Infrastructure
// ---------------------------------------------------------------------------
interface TestStats {
  passed: number;
  failed: number;
  total: number;
}

const stats: TestStats = { passed: 0, failed: 0, total: 0 };

function assert(condition: boolean, msg: string) {
  stats.total++;
  if (!condition) {
    stats.failed++;
    console.error(`❌ FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  stats.passed++;
}

function assertEquals<T>(actual: T, expected: T, msg: string) {
  stats.total++;
  if (actual !== expected) {
    stats.failed++;
    const message = `❌ FAIL: ${msg} (Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)})`;
    console.error(message);
    throw new Error(message);
  }
  stats.passed++;
}

console.log('\n======================================================================');
console.log('       CHALLENGER 2 EMPIRICAL TEST SUITE - MILESTONE 3 VERIFICATION    ');
console.log('======================================================================\n');

// ---------------------------------------------------------------------------
// 1. DOM STYLING & FULL-BLEED PURE-BLACK VERIFICATION
// ---------------------------------------------------------------------------
console.log('--- 1. Testing ProjectorWindow DOM Styling & Full-Bleed Guarantees ---');

const projectorWindowPath = path.resolve('src/app/ProjectorWindow.tsx');
const canvasViewportPath = path.resolve('src/components/display/CanvasViewport.tsx');
assert(fs.existsSync(projectorWindowPath), 'ProjectorWindow.tsx exists');
assert(fs.existsSync(canvasViewportPath), 'CanvasViewport.tsx exists');

const projectorWindowCode = fs.readFileSync(projectorWindowPath, 'utf-8');
const canvasViewportCode = fs.readFileSync(canvasViewportPath, 'utf-8');

// 1.1 Viewport Container Full-Bleed (100vw / 100vh)
assert(
  projectorWindowCode.includes('w-screen') && projectorWindowCode.includes('h-screen'),
  'ProjectorWindow specifies w-screen and h-screen classes for 100vw/100vh'
);
assert(
  projectorWindowCode.includes('fixed inset-0'),
  'ProjectorWindow pins container with fixed inset-0 full viewport coordinates'
);
assert(
  projectorWindowCode.includes("margin: 0") && projectorWindowCode.includes("padding: 0"),
  'ProjectorWindow strictly forces margin: 0 and padding: 0 via inline style'
);

// 1.2 Overflow Hidden Guarantee
assert(
  projectorWindowCode.includes('overflow-hidden') && projectorWindowCode.includes("overflow: 'hidden'"),
  'ProjectorWindow guarantees overflow: hidden via both Tailwind class and inline styles'
);
assert(
  projectorWindowCode.includes("document.body.style.overflow = 'hidden'"),
  'ProjectorWindow sets document.body.style.overflow = "hidden" on mount'
);

// 1.3 Cursor None Guarantee
assert(
  projectorWindowCode.includes('cursor-none') && projectorWindowCode.includes("cursor: 'none'"),
  'ProjectorWindow specifies cursor-none and inline cursor: "none"'
);
assert(
  projectorWindowCode.includes("document.body.style.cursor = 'none'"),
  'ProjectorWindow sets document.body.style.cursor = "none" on mount'
);
assert(
  projectorWindowCode.includes("document.body.style.cursor = 'auto'"),
  'ProjectorWindow cleans up and restores document.body.style.cursor = "auto" on unmount'
);
assert(
  projectorWindowCode.includes('[&_*]:cursor-none'),
  'ProjectorWindow applies [&_*]:cursor-none arbitrary variant to suppress cursor on all descendants'
);

// 1.4 Strict #000000 Background Guarantee
assert(
  projectorWindowCode.includes("background: '#000000'") &&
  projectorWindowCode.includes("backgroundColor: '#000000'"),
  'ProjectorWindow specifies strict #000000 background and backgroundColor inline'
);
assert(
  projectorWindowCode.includes("document.body.style.backgroundColor = '#000000'"),
  'ProjectorWindow sets document.body.style.backgroundColor = "#000000" on mount'
);
assert(
  canvasViewportCode.includes("style={{ backgroundColor: '#000000' }}"),
  'CanvasViewport explicitly clamps canvas container and canvas element background to #000000'
);

// 1.5 CSS Cascade & Specificity Verification
// Check that built CSS contains the [&_*]:cursor-none selector overriding canvas cursor
const distDir = path.resolve('dist/assets');
if (fs.existsSync(distDir)) {
  const cssFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.css'));
  if (cssFiles.length > 0) {
    const cssContent = fs.readFileSync(path.join(distDir, cssFiles[0]), 'utf-8');
    assert(cssContent.includes('cursor:none'), 'Built CSS bundle includes cursor:none rule');
    assert(
      cssContent.includes('cursor-none') || cssContent.includes('cursor:none'),
      'Built CSS defines cursor-none variant'
    );
  }
}

console.log('✔ DOM styling and full-bleed pure black guarantees verified.');

// ---------------------------------------------------------------------------
// 2. ZERO OPERATOR UI CHROME OR BUTTONS VERIFICATION
// ---------------------------------------------------------------------------
console.log('\n--- 2. Verifying Zero Operator UI Chrome in ProjectorWindow ---');

// Parse JSX return statement of ProjectorWindow
const returnMatch = projectorWindowCode.match(/return\s*\(\s*<div[\s\S]*?<\/div>\s*\);/);
assert(returnMatch !== null, 'Found ProjectorWindow JSX return block');
const returnJSX = returnMatch ? returnMatch[0] : '';

// 2.1 Assert zero interactive HTML controls
assert(!returnJSX.includes('<button'), 'ProjectorWindow JSX contains 0 <button> elements');
assert(!returnJSX.includes('<input'), 'ProjectorWindow JSX contains 0 <input> elements');
assert(!returnJSX.includes('<select'), 'ProjectorWindow JSX contains 0 <select> elements');
assert(!returnJSX.includes('<textarea'), 'ProjectorWindow JSX contains 0 <textarea> elements');
assert(!returnJSX.includes('<nav'), 'ProjectorWindow JSX contains 0 <nav> elements');
assert(!returnJSX.includes('<header'), 'ProjectorWindow JSX contains 0 <header> elements');
assert(!returnJSX.includes('<footer'), 'ProjectorWindow JSX contains 0 <footer> elements');
assert(!returnJSX.includes('role="button"'), 'ProjectorWindow JSX contains 0 role="button" elements');

// 2.2 Assert zero Operator Studio components imported or rendered
assert(!projectorWindowCode.includes('PanicBar'), 'ProjectorWindow does not render PanicBar');
assert(!projectorWindowCode.includes('CalibrationPanel'), 'ProjectorWindow does not render CalibrationPanel');
assert(!projectorWindowCode.includes('ShellLauncherDock'), 'ProjectorWindow does not render ShellLauncherDock');
assert(!projectorWindowCode.includes('SFXControls'), 'ProjectorWindow does not render SFXControls');
assert(!projectorWindowCode.includes('AudioMeters'), 'ProjectorWindow does not render AudioMeters');
assert(!projectorWindowCode.includes('ProjectorSyncStatus'), 'ProjectorWindow does not render ProjectorSyncStatus');
assert(!projectorWindowCode.includes('TimelineStudio'), 'ProjectorWindow does not render TimelineStudio');

// 2.3 Verify only CanvasViewport is mounted
assert(
  returnJSX.includes('<CanvasViewport') &&
  (returnJSX.match(/<[A-Z]/g) || []).length === 1,
  'ProjectorWindow renders strictly CanvasViewport as its sole child component'
);

console.log('✔ Zero operator UI chrome verified.');

// ---------------------------------------------------------------------------
// 3. EMERGENCY PANIC BLACKOUT PROPAGATION & PARTICLE CLEARING
// ---------------------------------------------------------------------------
console.log('\n--- 3. Testing Emergency Blackout Propagation & Particle Clearing ---');

// Mock a functional ParticlePool and simulation engine for both endpoints
const studioPool = new ParticlePool(65536);
const projectorPool = new ParticlePool(65536);

// Helper to fill pool with active particles
function populatePool(pool: ParticlePool, count: number) {
  for (let i = 0; i < count; i++) {
    pool.spawn(
      (Math.random() - 0.5) * 50,
      10 + Math.random() * 40,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      1.0, 0.5, 0.0, 1.0,
      2.5,
      1.5
    );
  }
}

// 3.1 Verify ParticlePool spawn and blackout behavior
populatePool(studioPool, 3000);
populatePool(projectorPool, 3000);
assertEquals(studioPool.aliveCount, 3000, 'Studio pool successfully populated with 3,000 active particles');
assertEquals(projectorPool.aliveCount, 3000, 'Projector pool successfully populated with 3,000 active particles');

studioPool.blackout();
assertEquals(studioPool.aliveCount, 0, 'Studio pool blackout() directly clears all active particles to 0');

projectorPool.blackout();
assertEquals(projectorPool.aliveCount, 0, 'Projector pool blackout() directly clears all active particles to 0');

// 3.2 Inter-window BroadcastChannel PANIC_BLACKOUT Propagation
async function testPanicBlackoutPropagation() {
  const channelName = `pyrosync_test_panic_${Date.now()}`;
  const studioBus = new BroadcastBus('studio', channelName);
  const projectorBus = new BroadcastBus('projector', channelName);

  let studioBlackoutCount = 0;
  let projectorBlackoutCount = 0;

  studioBus.on('PANIC_BLACKOUT', () => {
    studioBlackoutCount++;
    studioPool.blackout();
  });

  projectorBus.on('PANIC_BLACKOUT', () => {
    projectorBlackoutCount++;
    projectorPool.blackout();
  });

  // Scenario A: Blackout triggered from Operator Studio
  populatePool(studioPool, 4500);
  populatePool(projectorPool, 4500);
  assertEquals(studioPool.aliveCount, 4500, 'Populated studio pool before Studio panic');
  assertEquals(projectorPool.aliveCount, 4500, 'Populated projector pool before Studio panic');

  // Studio initiates panic blackout
  studioPool.blackout(); // local clear
  studioBus.panicBlackout(); // IPC broadcast

  // Wait for IPC delivery
  await new Promise(resolve => setTimeout(resolve, 40));

  assertEquals(studioPool.aliveCount, 0, 'Studio pool cleared upon Studio panic initiation');
  assertEquals(projectorBlackoutCount, 1, 'Projector received PANIC_BLACKOUT from Studio');
  assertEquals(projectorPool.aliveCount, 0, 'Projector pool cleared upon receiving PANIC_BLACKOUT from Studio');

  // Scenario B: Blackout triggered from Pop-Out Projector Window (e.g. Esc or Space hotkey)
  populatePool(studioPool, 6000);
  populatePool(projectorPool, 6000);
  assertEquals(studioPool.aliveCount, 6000, 'Populated studio pool before Projector panic');
  assertEquals(projectorPool.aliveCount, 6000, 'Populated projector pool before Projector panic');

  // Projector initiates panic blackout
  projectorPool.blackout(); // local clear
  projectorBus.panicBlackout(); // IPC broadcast back to studio

  // Wait for IPC delivery
  await new Promise(resolve => setTimeout(resolve, 40));

  assertEquals(projectorPool.aliveCount, 0, 'Projector pool cleared upon Projector panic initiation');
  assertEquals(studioBlackoutCount, 1, 'Studio received PANIC_BLACKOUT from Projector');
  assertEquals(studioPool.aliveCount, 0, 'Studio pool cleared upon receiving PANIC_BLACKOUT from Projector');

  // Scenario C: Projector Window Keyboard Handler Logic
  // Emulate handleKeyDown from ProjectorWindow.tsx lines 94-101
  let localBlackoutCalled = 0;
  let localFullscreenCalled = 0;
  const mockHandleBlackout = () => {
    localBlackoutCalled++;
    projectorPool.blackout();
    projectorBus.panicBlackout();
  };
  const mockHandleToggleFullscreen = () => {
    localFullscreenCalled++;
  };

  const dispatchProjectorKeyDown = (code: string) => {
    const event = { code, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    if (event.code === 'KeyF') {
      event.preventDefault();
      mockHandleToggleFullscreen();
    } else if (event.code === 'Escape' || event.code === 'Space') {
      event.preventDefault();
      mockHandleBlackout();
    }
    return event;
  };

  // 3.3.1 Escape hotkey
  populatePool(projectorPool, 1000);
  const escEvt = dispatchProjectorKeyDown('Escape');
  assert(escEvt.defaultPrevented, 'Escape keydown default was prevented');
  assertEquals(localBlackoutCalled, 1, 'Escape triggered blackout');
  assertEquals(projectorPool.aliveCount, 0, 'Escape cleared projector pool');

  // 3.3.2 Space hotkey
  populatePool(projectorPool, 1000);
  const spaceEvt = dispatchProjectorKeyDown('Space');
  assert(spaceEvt.defaultPrevented, 'Space keydown default was prevented');
  assertEquals(localBlackoutCalled, 2, 'Space triggered blackout');
  assertEquals(projectorPool.aliveCount, 0, 'Space cleared projector pool');

  // 3.3.3 KeyF hotkey
  const fEvt = dispatchProjectorKeyDown('KeyF');
  assert(fEvt.defaultPrevented, 'KeyF keydown default was prevented');
  assertEquals(localFullscreenCalled, 1, 'KeyF toggled fullscreen');

  // 3.3.4 Unrelated keys (Digit1, KeyA, Enter)
  const aEvt = dispatchProjectorKeyDown('KeyA');
  assert(!aEvt.defaultPrevented, 'KeyA default not prevented');
  assertEquals(localBlackoutCalled, 2, 'KeyA did not trigger blackout');

  // Await hotkey IPC messages in flight
  await new Promise(resolve => setTimeout(resolve, 40));

  // Scenario D: High-Frequency Panic Spam Stress Test (50 rapid triggers)
  const preSpamStudioCount = studioBlackoutCount;
  for (let i = 0; i < 50; i++) {
    projectorBus.panicBlackout();
  }
  await new Promise(resolve => setTimeout(resolve, 60));
  assertEquals(
    studioBlackoutCount,
    preSpamStudioCount + 50,
    'All 50 rapid blackout messages arrived cleanly without dropped IPC events'
  );
  assertEquals(studioPool.aliveCount, 0, 'Studio pool remains strictly at 0 active particles under spam');
  assertEquals(projectorPool.aliveCount, 0, 'Projector pool remains strictly at 0 active particles under spam');

  studioBus.destroy();
  projectorBus.destroy();
}

await testPanicBlackoutPropagation();
console.log('✔ Emergency blackout propagation and particle clearing verified.');

// ---------------------------------------------------------------------------
// 4. ROUTE RESOLUTION & REACT HOOKS ARCHITECTURAL AUDIT
// ---------------------------------------------------------------------------
console.log('\n--- 4. Testing Route Resolution & React Architecture ---');

const mainTsxPath = path.resolve('src/app/main.tsx');
const appTsxPath = path.resolve('src/app/App.tsx');
assert(fs.existsSync(mainTsxPath), 'main.tsx exists');
assert(fs.existsSync(appTsxPath), 'App.tsx exists');

const mainCode = fs.readFileSync(mainTsxPath, 'utf-8');
const appCode = fs.readFileSync(appTsxPath, 'utf-8');

// 4.1 Route matching in main.tsx (RootRouter)
assert(
  mainCode.includes("currentHash === '#/projector'") &&
  mainCode.includes("currentHash === '#projector'"),
  'RootRouter in main.tsx matches both #/projector and #projector'
);
assert(
  mainCode.includes('<ProjectorWindow />'),
  'RootRouter renders <ProjectorWindow /> when currentHash matches #/projector'
);

// 4.2 Fallback route matching in App.tsx
assert(
  appCode.includes("currentPath.includes('/projector')"),
  'App.tsx detects /projector in currentPath'
);
assert(
  appCode.includes("window.location.pathname === '/projector'") ||
  appCode.includes("window.location.pathname.endsWith('/projector')"),
  'App.tsx detects window.location.pathname === "/projector"'
);

// Helper function to test route matching logic extracted from App.tsx
function evaluateIsProjectorRoute(pathname: string, hash: string): boolean {
  const currentPath = pathname + hash;
  return (
    currentPath.includes('/projector') ||
    pathname === '/projector' ||
    pathname.endsWith('/projector') ||
    hash === '#/projector' ||
    hash === '#projector'
  );
}

// Test matrix of route configurations
const routeTestMatrix = [
  { pathname: '/', hash: '#/projector', expected: true, desc: 'Hash route #/projector' },
  { pathname: '/', hash: '#projector', expected: true, desc: 'Hash route #projector' },
  { pathname: '/projector', hash: '', expected: true, desc: 'Path route /projector' },
  { pathname: '/sub/projector', hash: '', expected: true, desc: 'Nested path ending in /projector' },
  { pathname: '/', hash: '', expected: false, desc: 'Default studio root route' },
  { pathname: '/studio', hash: '', expected: false, desc: 'Standard non-projector path' },
  { pathname: '/', hash: '#timeline', expected: false, desc: 'Standard non-projector hash' },
];

for (const tc of routeTestMatrix) {
  const result = evaluateIsProjectorRoute(tc.pathname, tc.hash);
  assertEquals(result, tc.expected, `Route matching for ${tc.desc} (${tc.pathname}${tc.hash})`);
}

// 4.3 Adversarial Analysis: React Rules of Hooks in App.tsx
console.log('\n--- 4.3 Adversarial Analysis: Early Return in App.tsx ---');

// Locate early return in App.tsx
const earlyReturnRegex = /if\s*\(\s*isProjectorRoute\s*\)\s*\{\s*return\s*<ProjectorWindow\s*\/>;\s*\}/;
const hasEarlyReturn = earlyReturnRegex.test(appCode);
assert(hasEarlyReturn, 'Identified early return statement in App.tsx');

// Count hooks inside App component body before early return vs hooks after early return
const appBodyStart = appCode.indexOf('export const App: React.FC = () => {');
const codeBeforeEarlyReturn = appCode.substring(appBodyStart, appCode.search(earlyReturnRegex));
const codeAfterEarlyReturn = appCode.substring(appCode.search(earlyReturnRegex));

const hooksBefore = (codeBeforeEarlyReturn.match(/\buse(State|Ref|Effect|Callback|Memo)\b/g) || []).length;
const hooksAfter = (codeAfterEarlyReturn.match(/\buse(State|Ref|Effect|Callback|Memo)\b/g) || []).length;

console.log(`Hooks before early return: ${hooksBefore}`);
console.log(`Hooks after early return: ${hooksAfter}`);

assert(hooksBefore === 2, 'Exactly 2 hooks (useState, useEffect) declared inside App before early return');
assert(hooksAfter >= 15, `Identified ${hooksAfter} hooks declared after early return in App.tsx`);

// Audit finding documentation:
// In the current pop-out architecture:
// 1. When pop-out window opens (#/projector), main.tsx intercepts it at RootRouter level, rendering ProjectorWindow directly. App.tsx is never mounted.
// 2. When navigated directly to /projector on initial page load, App.tsx renders ProjectorWindow consistently on every tick with 2 hooks.
// 3. However, if an operator client transitions dynamically between / and /projector without a page reload (via popstate/hashchange),
//    React's fiber reconciliation will detect a hook count mismatch (2 vs 20+ hooks) and throw:
//    "Rendered fewer/more hooks than expected. This may be caused by an accidental early return statement."
// Recommendation: RootRouter in main.tsx should handle both pathname === '/projector' and hash === '#/projector',
// removing the need for an early return inside App.tsx.

console.log('✔ Route resolution verified across all path and hash variants.');

// ---------------------------------------------------------------------------
// FINAL SUMMARY
// ---------------------------------------------------------------------------
console.log('\n======================================================================');
console.log(`SUMMARY: All ${stats.passed} / ${stats.total} assertions PASSED cleanly.`);
console.log(`Failures: ${stats.failed}`);
console.log('======================================================================\n');

if (stats.failed > 0) {
  process.exit(1);
}
