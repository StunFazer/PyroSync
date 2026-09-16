/**
 * Empirical Challenger 2 Verification & Stress Suite
 * Milestone 1: Projector Calibration, Aspect Ratio Scissoring, BroadcastChannel Protocol, Hotkeys
 *
 * Adversarial Testing: Edge Cases, Oracles, Generators, Stress Harness
 */

import { calculateAspectScissor } from '../src/engine/calibration/ProjectorShaders';
import { ParticlePool } from '../src/engine/fireworks/ParticlePool';
import {
  BroadcastMessage,
  FireCuePayload,
  ParticleEngineConfig,
  AspectRatioType,
  ShellArchetype,
  LaunchStation,
} from '../src/types';

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

function assertCloseTo(actual: number, expected: number, delta = 1e-4, msg = '') {
  stats.total++;
  if (Math.abs(actual - expected) > delta) {
    stats.failed++;
    const message = `❌ FAIL: ${msg} (Expected ${actual} to be close to ${expected} within delta ${delta})`;
    console.error(message);
    throw new Error(message);
  }
  stats.passed++;
}

console.log('\n======================================================================');
console.log('       CHALLENGER 2 EMPIRICAL TEST SUITE - MILESTONE 1 VERIFICATION    ');
console.log('======================================================================\n');

// ----------------------------------------------------------------------
// 1. PROJECTOR SHADER MATHEMATICAL FORMULAS
// ----------------------------------------------------------------------
console.log('--- 1. Testing Projector Shader Mathematical Formulas ---');

// 1.1 Gaussian Blur Weights
const blurWeights = [
  0.0162162162,
  0.0540540541,
  0.1216216216,
  0.1945945946,
  0.2270270270,
  0.1945945946,
  0.1216216216,
  0.0540540541,
  0.0162162162,
];

// Verify sum == 1.0 (normalized energy conservation)
const sumWeights = blurWeights.reduce((acc, w) => acc + w, 0);
assertCloseTo(sumWeights, 1.0, 1e-6, 'Gaussian blur weights sum strictly to 1.0 (energy conservation)');

// Verify symmetry
for (let i = 0; i < 4; i++) {
  assertCloseTo(
    blurWeights[i],
    blurWeights[8 - i],
    1e-9,
    `Gaussian blur kernel symmetry between tap -${4 - i} and +${4 - i}`
  );
}

// Verify monotonic decay from center
for (let i = 4; i < 8; i++) {
  assert(
    blurWeights[i] > blurWeights[i + 1],
    `Gaussian weight decreases with distance from center tap (${blurWeights[i]} > ${blurWeights[i + 1]})`
  );
}

// 1.2 ITU-R BT.709 Perceptual Luminance Formula
const BT709_R = 0.2126;
const BT709_G = 0.7152;
const BT709_B = 0.0722;
assertCloseTo(BT709_R + BT709_G + BT709_B, 1.0, 1e-6, 'BT.709 coefficients sum to 1.0');

function calcLumaBT709(r: number, g: number, b: number): number {
  return BT709_R * r + BT709_G * g + BT709_B * b;
}

// 1.3 Bright-pass extraction simulation (BRIGHT_PASS_FRAGMENT)
function simulateBrightPass(r: number, g: number, b: number, threshold: number): [number, number, number] {
  const luma = calcLumaBT709(r, g, b);
  if (luma > threshold) {
    const factor = (luma - threshold) / Math.max(0.001, luma);
    return [r * factor, g * factor, b * factor];
  } else {
    return [0.0, 0.0, 0.0];
  }
}

// Sub-threshold bright pass produces 0.0
const bpSub = simulateBrightPass(0.15, 0.15, 0.15, 0.20);
assert(bpSub[0] === 0 && bpSub[1] === 0 && bpSub[2] === 0, 'Bright pass zero below threshold 0.20');

// Above threshold produces positive bloom core
const bpSuper = simulateBrightPass(0.8, 0.8, 0.8, 0.20);
assert(bpSuper[0] > 0 && bpSuper[1] > 0 && bpSuper[2] > 0, 'Bright pass isolates luminous star core');
assertCloseTo(bpSuper[0], 0.8 * (0.8 - 0.2) / 0.8, 1e-4, 'Bright pass matches mathematical scaling curve');

// 1.4 Projector Black Clamp Step & Remapping Function Simulation
function simulateBlackClamp(
  rgb: [number, number, number],
  blackClamp: number,
  gain: number
): [number, number, number] {
  let [r, g, b] = rgb;
  r *= gain;
  g *= gain;
  b *= gain;

  const luma = calcLumaBT709(r, g, b);

  if (luma < blackClamp) {
    return [0.0, 0.0, 0.0];
  } else {
    const remapped = (luma - blackClamp) / Math.max(0.0001, 1.0 - blackClamp);
    const factor = remapped / Math.max(0.0001, luma);
    return [
      Math.min(1.0, r * factor),
      Math.min(1.0, g * factor),
      Math.min(1.0, b * factor),
    ];
  }
}

// Edge Cases:
// Black clamp = 0.0 (disabled)
const [rNoClamp] = simulateBlackClamp([0.05, 0.05, 0.05], 0.0, 1.0);
assertCloseTo(rNoClamp, 0.05, 1e-4, 'Clamp 0.0 does not attenuate 0.05');

// Black clamp = 0.20 (maximum venue profile)
const [rMaxClamp] = simulateBlackClamp([0.19, 0.19, 0.19], 0.20, 1.0);
assert(rMaxClamp === 0.0, 'Clamp 0.20 kills low-contrast gray fog of 0.19 luminance');

// Gain = 3.0 (maximum stadium gain)
const [rMaxGain] = simulateBlackClamp([0.5, 0.5, 0.5], 0.02, 3.0);
assert(rMaxGain === 1.0, 'Gain 3.0x caps saturated pixels strictly to 1.0');

// Gain = 0.10 (minimum high-lumen gain)
const [rMinGain] = simulateBlackClamp([1.0, 1.0, 1.0], 0.0, 0.10);
assertCloseTo(rMinGain, 0.10, 1e-4, 'Gain 0.10x scales 1.0 to 0.10');

// Pure black stays pure black
const [r0, g0, b0] = simulateBlackClamp([0, 0, 0], 0.02, 1.0);
assert(r0 === 0 && g0 === 0 && b0 === 0, 'Pure black [0,0,0] remains strictly [0,0,0]');

// Sub-threshold pixel is strictly clamped to #000000
const subLumaColor: [number, number, number] = [0.01, 0.01, 0.01];
const [rc1, gc1, bc1] = simulateBlackClamp(subLumaColor, 0.02, 1.0);
assert(rc1 === 0 && gc1 === 0 && bc1 === 0, 'Sub-threshold ember clamped to #000000');

// Boundary at threshold
const atThresholdColor: [number, number, number] = [0.02, 0.02, 0.02];
const [rc2, gc2, bc2] = simulateBlackClamp(atThresholdColor, 0.02, 1.0);
assertCloseTo(rc2, 0.0, 1e-4, 'Threshold boundary clamps to 0.0');

// Full luminance 1.0 with default 0.02 clamp and 1.0 gain
const [rf1, gf1, bf1] = simulateBlackClamp([1.0, 1.0, 1.0], 0.02, 1.0);
assertCloseTo(rf1, 1.0, 1e-4, 'Full white 1.0 remains 1.0');

// Chromaticity ratio preservation
const coloredStar: [number, number, number] = [0.6, 0.3, 0.1];
const [cr, cg, cb] = simulateBlackClamp(coloredStar, 0.05, 1.0);
const origRatioG = coloredStar[1] / coloredStar[0];
const postRatioG = cg / cr;
assertCloseTo(origRatioG, postRatioG, 1e-4, 'Green/Red chromaticity ratio preserved');
const origRatioB = coloredStar[2] / coloredStar[0];
const postRatioB = cb / cr;
assertCloseTo(origRatioB, postRatioB, 1e-4, 'Blue/Red chromaticity ratio preserved');

console.log('✔ Projector shader formulas verified.');

// ----------------------------------------------------------------------
// 2. ASPECT RATIO SCISSORING CALCULATIONS
// ----------------------------------------------------------------------
console.log('\n--- 2. Testing Aspect Ratio Scissoring Calculations ---');

interface AspectTestCase {
  name: string;
  mask: AspectRatioType;
  w: number;
  h: number;
  expectedMinU: number;
  expectedMinV: number;
  expectedMaxU: number;
  expectedMaxV: number;
}

const aspectCases: AspectTestCase[] = [
  // 16:9 on 1920x1080 (16:9 display) -> Full display
  {
    name: '16:9 on 1920x1080 (16:9 display)',
    mask: '16:9',
    w: 1920,
    h: 1080,
    expectedMinU: 0.0,
    expectedMinV: 0.0,
    expectedMaxU: 1.0,
    expectedMaxV: 1.0,
  },
  // 4:3 on 1920x1080 (16:9 display) -> Pillarbox
  {
    name: '4:3 on 1920x1080 (16:9 display)',
    mask: '4:3',
    w: 1920,
    h: 1080,
    expectedMinU: 0.125,
    expectedMinV: 0.0,
    expectedMaxU: 0.875,
    expectedMaxV: 1.0,
  },
  // 16:10 on 1920x1080 (16:9 display) -> Pillarbox
  {
    name: '16:10 on 1920x1080 (16:9 display)',
    mask: '16:10',
    w: 1920,
    h: 1080,
    expectedMinU: 0.05,
    expectedMinV: 0.0,
    expectedMaxU: 0.95,
    expectedMaxV: 1.0,
  },
  // 21:9 on 1920x1080 (16:9 display) -> Letterbox
  {
    name: '21:9 on 1920x1080 (16:9 display)',
    mask: '21:9',
    w: 1920,
    h: 1080,
    expectedMinU: 0.0,
    expectedMinV: 5 / 42,
    expectedMaxU: 1.0,
    expectedMaxV: 37 / 42,
  },
  // 16:9 on 1024x768 (4:3 display) -> Letterbox
  {
    name: '16:9 on 1024x768 (4:3 display)',
    mask: '16:9',
    w: 1024,
    h: 768,
    expectedMinU: 0.0,
    expectedMinV: 0.125,
    expectedMaxU: 1.0,
    expectedMaxV: 0.875,
  },
  // 21:9 on exact 2520x1080 (21:9 native display) -> Full display
  {
    name: '21:9 on exact 2520x1080 (21:9 native display)',
    mask: '21:9',
    w: 2520,
    h: 1080,
    expectedMinU: 0.0,
    expectedMinV: 0.0,
    expectedMaxU: 1.0,
    expectedMaxV: 1.0,
  },
  // 21:9 on consumer 2560x1080 monitor (64:27 -> 20px pillarbox)
  {
    name: '21:9 on consumer 2560x1080 monitor (64:27 -> 20px pillarbox)',
    mask: '21:9',
    w: 2560,
    h: 1080,
    expectedMinU: 1 / 128,
    expectedMinV: 0.0,
    expectedMaxU: 127 / 128,
    expectedMaxV: 1.0,
  },
  // 16:9 on 4K UHD 3840x2160 -> Full display
  {
    name: '16:9 on 3840x2160 (4K UHD)',
    mask: '16:9',
    w: 3840,
    h: 2160,
    expectedMinU: 0.0,
    expectedMinV: 0.0,
    expectedMaxU: 1.0,
    expectedMaxV: 1.0,
  },
  // 16:9 on 8K UHD 7680x4320 -> Full display
  {
    name: '16:9 on 7680x4320 (8K UHD)',
    mask: '16:9',
    w: 7680,
    h: 4320,
    expectedMinU: 0.0,
    expectedMinV: 0.0,
    expectedMaxU: 1.0,
    expectedMaxV: 1.0,
  },
  // 16:9 on portrait 1080x1920 (9:16 mobile) -> Letterbox
  // screenAspect = 9/16 = 0.5625. targetAspect = 16/9 = 1.7778
  // activeHeightFraction = (9/16) / (16/9) = 81 / 256 = 0.31640625
  // minV = (1 - 81/256)/2 = 175 / 512 = 0.341796875, maxV = 1 - minV = 337 / 512 = 0.658203125
  {
    name: '16:9 on portrait 1080x1920 mobile',
    mask: '16:9',
    w: 1080,
    h: 1920,
    expectedMinU: 0.0,
    expectedMinV: 175 / 512,
    expectedMaxU: 1.0,
    expectedMaxV: 337 / 512,
  },
  // 16:9 on 1:1 square display 1000x1000 -> Letterbox
  // activeHeightFraction = 1.0 / (16/9) = 9/16 = 0.5625
  // minV = (1 - 0.5625)/2 = 0.21875, maxV = 0.78125
  {
    name: '16:9 on square 1000x1000',
    mask: '16:9',
    w: 1000,
    h: 1000,
    expectedMinU: 0.0,
    expectedMinV: 0.21875,
    expectedMaxU: 1.0,
    expectedMaxV: 0.78125,
  },
  // 16:9 on 32:9 Super Ultra-Wide 5120x1440 -> Pillarbox
  // screenAspect = 32/9. targetAspect = 16/9.
  // activeWidthFraction = (16/9) / (32/9) = 0.5
  // minU = 0.25, maxU = 0.75
  {
    name: '16:9 on 32:9 super ultra-wide 5120x1440',
    mask: '16:9',
    w: 5120,
    h: 1440,
    expectedMinU: 0.25,
    expectedMinV: 0.0,
    expectedMaxU: 0.75,
    expectedMaxV: 1.0,
  },
  // 'off' setting -> Always full [0, 0, 1, 1]
  {
    name: 'Aspect ratio "off" on any resolution',
    mask: 'off',
    w: 1920,
    h: 1080,
    expectedMinU: 0.0,
    expectedMinV: 0.0,
    expectedMaxU: 1.0,
    expectedMaxV: 1.0,
  },
  // Degenerate dimensions (0, 0)
  {
    name: 'Degenerate dimensions (0, 0)',
    mask: '16:9',
    w: 0,
    h: 0,
    expectedMinU: 0.0,
    expectedMinV: 0.0,
    expectedMaxU: 1.0,
    expectedMaxV: 1.0,
  },
  // Microscopic screen (1, 1)
  {
    name: 'Microscopic 1x1 screen with 16:9 mask',
    mask: '16:9',
    w: 1,
    h: 1,
    expectedMinU: 0.0,
    expectedMinV: 0.21875,
    expectedMaxU: 1.0,
    expectedMaxV: 0.78125,
  },
];

for (const c of aspectCases) {
  const [minU, minV, maxU, maxV] = calculateAspectScissor(c.mask, c.w, c.h);
  assertCloseTo(minU, c.expectedMinU, 1e-4, `${c.name} minU`);
  assertCloseTo(minV, c.expectedMinV, 1e-4, `${c.name} minV`);
  assertCloseTo(maxU, c.expectedMaxU, 1e-4, `${c.name} maxU`);
  assertCloseTo(maxV, c.expectedMaxV, 1e-4, `${c.name} maxV`);

  // Verify active aspect ratio geometry and centering symmetry
  if (c.w > 0 && c.h > 0 && c.mask !== 'off') {
    // Symmetry check: center must be exactly (0.5, 0.5)
    assertCloseTo((minU + maxU) * 0.5, 0.5, 1e-4, `${c.name} horizontal centering symmetry`);
    assertCloseTo((minV + maxV) * 0.5, 0.5, 1e-4, `${c.name} vertical centering symmetry`);

    const activePixelW = (maxU - minU) * c.w;
    const activePixelH = (maxV - minV) * c.h;
    const computedActiveRatio = activePixelW / activePixelH;

    let targetRatio = 16 / 9;
    if (c.mask === '16:10') targetRatio = 16 / 10;
    else if (c.mask === '4:3') targetRatio = 4 / 3;
    else if (c.mask === '21:9') targetRatio = 21 / 9;

    assertCloseTo(
      computedActiveRatio,
      targetRatio,
      1e-4,
      `${c.name} active pixel aspect ratio strictly matches ${c.mask}`
    );
  }
}

console.log('✔ Aspect ratio scissoring math verified across all profiles.');

// ----------------------------------------------------------------------
// 3. BROADCASTCHANNEL MESSAGING STRUCTURE & SERIALIZABILITY
// ----------------------------------------------------------------------
console.log('\n--- 3. Testing BroadcastChannel Protocol & Message Serializability ---');

const archetypes: ShellArchetype[] = [
  'peony',
  'chrysanthemum',
  'willow',
  'brocade_crown',
  'rings',
  'strobe',
  'crossette',
  'crackle',
  'ground_mine',
  'whistling_comet',
  'horsetail',
  'finale_barrage',
];

const stations: LaunchStation[] = ['left', 'left_center', 'center', 'right_center', 'right', 'fan'];

// Generate cue messages for all 12 archetypes and 6 stations
const cueMessages: BroadcastMessage[] = archetypes.map((arch, idx) => ({
  type: 'FIRE_CUE',
  cue: {
    id: `cue_${arch}_${idx}`,
    archetype: arch,
    station: stations[idx % stations.length],
    color: '#00ffcc',
    altitude: 0.2 + (idx * 0.06),
    launchAngle: (idx - 6) * 5,
    duration: 2.5,
    seed: 1000 + idx,
  },
}));

const protocolMessages: BroadcastMessage[] = [
  { type: 'STATE_SYNC_REQUEST' },
  {
    type: 'STATE_SYNC_RESPONSE',
    payload: {
      time: 14.5,
      isPlaying: true,
      showId: 'show-m1-demo',
      calibration: {
        maxParticles: 65536,
        blackClamp: 0.03,
        gain: 1.5,
        bloomIntensity: 1.4,
        particleSizeScale: 1.2,
        aspectRatioMask: '16:9',
        showGuides: true,
      },
    },
  },
  { type: 'TRANSPORT_PLAY', time: 0.0 },
  { type: 'TRANSPORT_PAUSE', time: 12.35 },
  { type: 'TRANSPORT_SEEK', time: 45.0 },
  { type: 'PANIC_BLACKOUT' },
  {
    type: 'CALIBRATION_UPDATE',
    calibration: {
      gain: 2.0,
      blackClamp: 0.05,
      aspectRatioMask: '21:9',
    },
  },
  {
    type: 'LOAD_SHOW',
    show: {
      version: '1.0.0',
      title: 'Cosmic Awakening Demo',
      duration: 75,
      audioTrack: {
        name: 'cosmic_synth.mp3',
        proceduralPreset: 'cosmic_awakening',
      },
      calibration: {
        maxParticles: 65536,
        blackClamp: 0.02,
        gain: 1.0,
        bloomIntensity: 1.2,
        particleSizeScale: 1.0,
        aspectRatioMask: 'off',
      },
      cues: [
        {
          id: 'c1',
          time: 0.0,
          archetype: 'ground_mine',
          station: 'center',
          color: '#ffd700',
          altitude: 0.3,
        },
      ],
    },
  },
  { type: 'PYRO_HELLO', timestamp: 1234567.89 },
  { type: 'PYRO_PONG', timestamp: 1234568.12 },
  ...cueMessages,
];

// Test 3.1: Structured cloneability
for (const msg of protocolMessages) {
  try {
    const cloned = structuredClone(msg);
    assert(cloned.type === msg.type, `Message type ${msg.type} survived structuredClone`);
    assert(JSON.stringify(cloned) === JSON.stringify(msg), `Message ${msg.type} serializes faithfully`);
  } catch (err: any) {
    assert(false, `Failed structuredClone for message ${msg.type}: ${err.message}`);
  }
}

// Test 3.2: Real BroadcastChannel IPC Inter-instance communication
async function testBroadcastChannelIPC() {
  const channelA = new BroadcastChannel('pyrosync_test_bus');
  const channelB = new BroadcastChannel('pyrosync_test_bus');

  const receivedMessages: any[] = [];

  channelB.onmessage = (event) => {
    receivedMessages.push(event.data);
  };

  // Send all test messages across channelA
  for (const msg of protocolMessages) {
    channelA.postMessage(msg);
  }

  // Allow async dispatch
  await new Promise((resolve) => setTimeout(resolve, 50));

  assert(
    receivedMessages.length === protocolMessages.length,
    `BroadcastChannel transferred all ${protocolMessages.length} messages (received: ${receivedMessages.length})`
  );

  for (let i = 0; i < protocolMessages.length; i++) {
    assert(
      receivedMessages[i].type === protocolMessages[i].type,
      `Message ${i} received in exact order: ${protocolMessages[i].type}`
    );
  }

  // Test high-frequency flood: 1000 rapid cue events
  let floodCount = 0;
  channelB.onmessage = (event) => {
    if (event.data?.type === 'FIRE_CUE') floodCount++;
  };

  const floodStart = performance.now();
  for (let i = 0; i < 1000; i++) {
    channelA.postMessage({
      type: 'FIRE_CUE',
      cue: {
        id: `flood_${i}`,
        archetype: 'peony',
        station: 'center',
        color: '#ff0000',
        altitude: 0.9,
      },
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 150));
  const floodDuration = performance.now() - floodStart;

  assert(floodCount === 1000, `BroadcastChannel sustained rapid flood: 1,000 cues received (${floodDuration.toFixed(1)}ms)`);

  channelA.close();
  channelB.close();
}

// ----------------------------------------------------------------------
// 4. HOTKEYS AND SAFETY INTERLOCKS EMPIRICAL VERIFICATION
// ----------------------------------------------------------------------
console.log('\n--- 4. Testing Hotkey Handlers & Safety Interlocks ---');

function simulateKeyDown(
  code: string,
  targetTagName: string,
  isFullscreen: boolean,
  actions: {
    blackout: () => void;
    toggleFullscreen: () => void;
  }
) {
  // Logic from CanvasViewport.tsx lines 98-122
  if (
    targetTagName === 'INPUT' ||
    targetTagName === 'TEXTAREA' ||
    targetTagName === 'CONTENTEDITABLE'
  ) {
    return;
  }

  if (code === 'Escape') {
    actions.blackout();
  } else if (code === 'KeyF') {
    actions.toggleFullscreen();
  } else if (code === 'Space' && isFullscreen) {
    actions.blackout();
  }
}

let blackoutTriggered = false;
let fullscreenToggled = false;

const resetActionFlags = () => {
  blackoutTriggered = false;
  fullscreenToggled = false;
};

const actions = {
  blackout: () => {
    blackoutTriggered = true;
  },
  toggleFullscreen: () => {
    fullscreenToggled = true;
  },
};

// 4.1 'Escape' triggers blackout in standard mode
resetActionFlags();
simulateKeyDown('Escape', 'BODY', false, actions);
assert(blackoutTriggered, 'Escape hotkey triggers blackout in standard mode');

// 4.2 'Escape' triggers blackout in fullscreen mode
resetActionFlags();
simulateKeyDown('Escape', 'BODY', true, actions);
assert(blackoutTriggered, 'Escape hotkey triggers blackout in fullscreen mode');

// 4.3 'KeyF' toggles fullscreen
resetActionFlags();
simulateKeyDown('KeyF', 'BODY', false, actions);
assert(fullscreenToggled, 'KeyF toggles presentation fullscreen');

// 4.4 'Space' triggers blackout in fullscreen mode
resetActionFlags();
simulateKeyDown('Space', 'BODY', true, actions);
assert(blackoutTriggered, 'Space hotkey triggers emergency blackout in fullscreen mode');

// 4.5 'Space' does NOT trigger blackout when in standard editor mode
resetActionFlags();
simulateKeyDown('Space', 'BODY', false, actions);
assert(!blackoutTriggered, 'Space hotkey suppressed from blackout in windowed editor mode');

// 4.6 Input field focus suppression: typing 'F' into input field does NOT toggle fullscreen
resetActionFlags();
simulateKeyDown('KeyF', 'INPUT', false, actions);
assert(!fullscreenToggled, 'KeyF suppressed when focused inside input element');

// 4.7 Input field focus suppression: typing 'F' into textarea does NOT toggle fullscreen
resetActionFlags();
simulateKeyDown('KeyF', 'TEXTAREA', false, actions);
assert(!fullscreenToggled, 'KeyF suppressed when focused inside textarea element');

// 4.8 Input field focus suppression: typing in contenteditable does NOT trigger hotkeys
resetActionFlags();
simulateKeyDown('KeyF', 'CONTENTEDITABLE', false, actions);
assert(!fullscreenToggled, 'KeyF suppressed when focused in contenteditable');

// 4.9 Escape suppressed from canvas blackout when focused in input
resetActionFlags();
simulateKeyDown('Escape', 'INPUT', false, actions);
assert(!blackoutTriggered, 'Escape hotkey suppressed from canvas blackout when focused in input');

console.log('✔ Hotkey bindings & interlocks verified.');

// ----------------------------------------------------------------------
// 5. STRESS HARNESS: PARTICLE POOL SATURATION & BLACKOUT TIMING
// ----------------------------------------------------------------------
console.log('\n--- 5. Stress Harness: ParticlePool Zero-Allocation & Blackout Timing ---');

const pool = new ParticlePool(65536);

// Spawn up to capacity
const spawnStart = performance.now();
for (let i = 0; i < 65536; i++) {
  const idx = pool.spawn(
    0, 20, 0,
    (Math.random() - 0.5) * 20,
    (Math.random() - 0.5) * 20,
    (Math.random() - 0.5) * 20,
    1.0, 0.8, 0.2, 1.0,
    3.0,
    2.0
  );
  if (idx < 0) {
    throw new Error(`Unexpected spawn saturation at ${i}`);
  }
}
const spawnTime = performance.now() - spawnStart;
assert(pool.aliveCount === 65536, `Spawned all 65,536 particles into flat TypedArrays (${spawnTime.toFixed(1)}ms)`);

// Attempt 1 extra spawn past capacity
const overflowIdx = pool.spawn(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
assert(overflowIdx === -1, 'Pool saturation gracefully returns -1 without crash or reallocation');

// Benchmark physics update step under maximum 65,536 particle load
const updateStart = performance.now();
pool.update(0.0166, 1.0);
const updateDuration = performance.now() - updateStart;
assert(updateDuration < 16.6, `Full 65,536 particle physics update executed in ${updateDuration.toFixed(2)}ms (< 16.6ms for 60 FPS)`);

// Run 100 consecutive simulation frames to verify zero memory instability
for (let f = 0; f < 100; f++) {
  pool.update(0.0166, 1.0 + f * 0.0166);
}
assert(pool.aliveCount === 65536, 'Alive count maintained steadily across 100 continuous frames');

// Test Instant Blackout Reset
const blackoutStart = performance.now();
pool.blackout();
const blackoutDuration = performance.now() - blackoutStart;
assert(pool.aliveCount === 0, 'Instant blackout resets aliveCount to 0 immediately');
assert(blackoutDuration < 1.0, `Blackout took ${blackoutDuration.toFixed(3)}ms (< 1ms zero-overhead)`);

// Idempotent blackout call test
pool.blackout();
assert(pool.aliveCount === 0, 'Subsequent blackout call remains safe and idempotent');

// Verify recycling and respawning after blackout
for (let i = 0; i < 1000; i++) {
  pool.spawn(0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2, 1);
}
assert(pool.aliveCount === 1000, 'Successfully respawned 1,000 particles immediately after blackout');

// ----------------------------------------------------------------------
// EXECUTION & SUMMARY
// ----------------------------------------------------------------------
async function runAll() {
  await testBroadcastChannelIPC();

  console.log('\n======================================================================');
  console.log(`SUMMARY: ${stats.passed} / ${stats.total} assertions passed. ${stats.failed} failures.`);
  console.log('======================================================================\n');

  if (stats.failed > 0) {
    process.exit(1);
  }
}

runAll();
