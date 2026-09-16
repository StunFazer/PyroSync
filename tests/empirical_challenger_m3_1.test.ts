/**
 * Empirical Challenger 1 Verification & Stress Suite
 * Milestone 3: BroadcastChannel Dual Display & Pop-Out Projection
 *
 * Adversarial Testing:
 * 1. Inter-window communication over channel 'pyrosync_projection_bus':
 *    Verify transmission and handling of all message schemas:
 *    - STATE_SYNC_REQUEST, STATE_SYNC_RESPONSE, TRANSPORT_PLAY, TRANSPORT_PAUSE,
 *      TRANSPORT_SEEK, FIRE_CUE, PANIC_BLACKOUT, CALIBRATION_UPDATE, LOAD_SHOW,
 *      PYRO_HELLO, PYRO_PONG
 * 2. High-frequency barrage stress test:
 *    Flood 1,000 rapid cues across the bus; verify 100% receipt without message corruption or drops.
 * 3. Reconnection handshake:
 *    Simulate late-joining projector window sending STATE_SYNC_REQUEST and verify studio responds with full state.
 * 4. Heartbeat roundtrip latency & disconnect timeout detection.
 * 5. Concurrent bidirectional transmission stress (Studio <-> Projector).
 * 6. Channel name isolation & listener subscription hygiene.
 * 7. Malformed payload resilience & error isolation.
 */

import { BroadcastBus, DEFAULT_BROADCAST_CHANNEL_NAME } from '../src/state/BroadcastBus.ts';
import type {
  BroadcastMessage,
  FireCuePayload,
  ParticleEngineConfig,
  ShowJSON,
  ShellArchetype,
  LaunchStation,
} from '../src/types/index.ts';

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
    const err = `❌ FAIL: ${msg}`;
    console.error(err);
    throw new Error(err);
  }
  stats.passed++;
}

function assertEqual<T>(actual: T, expected: T, msg: string) {
  stats.total++;
  if (actual !== expected) {
    stats.failed++;
    const err = `❌ FAIL: ${msg} (Actual: ${actual}, Expected: ${expected})`;
    console.error(err);
    throw new Error(err);
  }
  stats.passed++;
}

function assertDeepEqual(actual: any, expected: any, msg: string) {
  stats.total++;
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    stats.failed++;
    const err = `❌ FAIL: ${msg}\n  Actual:   ${actualJson}\n  Expected: ${expectedJson}`;
    console.error(err);
    throw new Error(err);
  }
  stats.passed++;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// SUITE 1: ALL MESSAGE SCHEMAS & INTER-WINDOW COMMUNICATION
// ============================================================================
async function testAllMessageSchemas() {
  console.log('\n--- Suite 1: All Message Schemas & Inter-Window Communication ---');

  // Verify default channel name matches specification
  assertEqual(
    DEFAULT_BROADCAST_CHANNEL_NAME,
    'pyrosync_projection_bus',
    'DEFAULT_BROADCAST_CHANNEL_NAME must be pyrosync_projection_bus'
  );

  const studioBus = new BroadcastBus('studio');
  const projectorBus = new BroadcastBus('projector');

  assertEqual(studioBus.role, 'studio', 'Studio bus role should be studio');
  assertEqual(projectorBus.role, 'projector', 'Projector bus role should be projector');
  assertEqual(studioBus.channelName, 'pyrosync_projection_bus', 'Studio channelName matches spec');
  assertEqual(projectorBus.channelName, 'pyrosync_projection_bus', 'Projector channelName matches spec');

  try {
    // 1.1 STATE_SYNC_REQUEST (Projector -> Studio)
    let syncReqReceived = false;
    studioBus.on('STATE_SYNC_REQUEST', (msg) => {
      syncReqReceived = true;
      assertEqual(msg.type, 'STATE_SYNC_REQUEST', 'Received message type must be STATE_SYNC_REQUEST');
    });

    projectorBus.requestStateSync();
    await sleep(25);
    assert(syncReqReceived, 'Studio must receive STATE_SYNC_REQUEST from Projector');

    // 1.2 STATE_SYNC_RESPONSE (Studio -> Projector)
    const mockSyncPayload = {
      time: 42.125,
      isPlaying: true,
      showId: 'cosmic_awakening_demo',
      calibration: {
        maxParticles: 65536,
        blackClamp: 0.04,
        gain: 1.65,
        bloomIntensity: 1.85,
        particleSizeScale: 1.5,
        aspectRatioMask: '16:9' as const,
        showGuides: true,
      },
    };

    let syncRespReceived: any = null;
    projectorBus.on('STATE_SYNC_RESPONSE', (msg) => {
      syncRespReceived = msg.payload;
    });

    studioBus.sendStateSyncResponse(mockSyncPayload);
    await sleep(25);
    assert(syncRespReceived !== null, 'Projector must receive STATE_SYNC_RESPONSE');
    assertDeepEqual(syncRespReceived, mockSyncPayload, 'STATE_SYNC_RESPONSE payload must match exactly');

    // 1.3 TRANSPORT_PLAY (Studio -> Projector)
    let playReceivedTime: number | null = null;
    projectorBus.on('TRANSPORT_PLAY', (msg) => {
      playReceivedTime = msg.time;
    });

    studioBus.play(15.75);
    await sleep(25);
    assertEqual(playReceivedTime, 15.75, 'Projector must receive TRANSPORT_PLAY with exact time');

    // 1.4 TRANSPORT_PAUSE (Studio -> Projector)
    let pauseReceivedTime: number | null = null;
    projectorBus.on('TRANSPORT_PAUSE', (msg) => {
      pauseReceivedTime = msg.time;
    });

    studioBus.pause(30.5);
    await sleep(25);
    assertEqual(pauseReceivedTime, 30.5, 'Projector must receive TRANSPORT_PAUSE with exact time');

    // 1.5 TRANSPORT_SEEK (Studio -> Projector)
    let seekReceivedTime: number | null = null;
    projectorBus.on('TRANSPORT_SEEK', (msg) => {
      seekReceivedTime = msg.time;
    });

    studioBus.seek(0.0);
    await sleep(25);
    assertEqual(seekReceivedTime, 0.0, 'Projector must receive TRANSPORT_SEEK with exact time');

    // 1.6 FIRE_CUE (Studio -> Projector) covering multiple shell archetypes and stations
    const archetypesToTest: ShellArchetype[] = [
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

    const stationsToTest: LaunchStation[] = [
      'left',
      'left_center',
      'center',
      'right_center',
      'right',
      'fan',
    ];

    const receivedCues: FireCuePayload[] = [];
    projectorBus.on('FIRE_CUE', (msg) => {
      receivedCues.push(msg.cue);
    });

    for (let i = 0; i < archetypesToTest.length; i++) {
      const cue: FireCuePayload = {
        id: `schema_test_cue_${i}`,
        archetype: archetypesToTest[i],
        station: stationsToTest[i % stationsToTest.length],
        color: `#${(0x100000 + i * 0x012345).toString(16).slice(0, 6)}`,
        altitude: 0.2 + (i / archetypesToTest.length) * 0.7,
        launchAngle: (i - 6) * 5,
        duration: 2.5 + i * 0.2,
        seed: 1000 + i,
      };
      studioBus.fireCue(cue);
    }

    await sleep(50);
    assertEqual(
      receivedCues.length,
      archetypesToTest.length,
      `Projector must receive all ${archetypesToTest.length} fire cues`
    );

    for (let i = 0; i < archetypesToTest.length; i++) {
      assertEqual(receivedCues[i].archetype, archetypesToTest[i], `Cue ${i} archetype match`);
      assertEqual(receivedCues[i].station, stationsToTest[i % stationsToTest.length], `Cue ${i} station match`);
      assertEqual(receivedCues[i].id, `schema_test_cue_${i}`, `Cue ${i} id match`);
      assertEqual(receivedCues[i].seed, 1000 + i, `Cue ${i} seed match`);
    }

    // 1.7 PANIC_BLACKOUT (Bidirectional)
    let projectorReceivedBlackout = false;
    projectorBus.on('PANIC_BLACKOUT', () => {
      projectorReceivedBlackout = true;
    });

    studioBus.panicBlackout();
    await sleep(25);
    assert(projectorReceivedBlackout, 'Projector must receive PANIC_BLACKOUT dispatched by Studio');

    let studioReceivedBlackout = false;
    studioBus.on('PANIC_BLACKOUT', () => {
      studioReceivedBlackout = true;
    });

    projectorBus.panicBlackout();
    await sleep(25);
    assert(studioReceivedBlackout, 'Studio must receive PANIC_BLACKOUT dispatched by Projector');

    // 1.8 CALIBRATION_UPDATE (Studio -> Projector)
    const calPatch: Partial<ParticleEngineConfig> = {
      blackClamp: 0.08,
      gain: 2.2,
      bloomIntensity: 2.9,
      particleSizeScale: 3.2,
      aspectRatioMask: '21:9',
    };

    let receivedCalPatch: Partial<ParticleEngineConfig> | null = null;
    projectorBus.on('CALIBRATION_UPDATE', (msg) => {
      receivedCalPatch = msg.calibration;
    });

    studioBus.updateCalibration(calPatch);
    await sleep(25);
    assertDeepEqual(receivedCalPatch, calPatch, 'Projector must receive CALIBRATION_UPDATE partial config');

    // 1.9 LOAD_SHOW (Studio -> Projector)
    const mockShow: ShowJSON = {
      version: '1.0.0',
      title: 'Grand Finale Showcase',
      duration: 120,
      audioTrack: {
        name: 'Epic Symphonic Horizon',
        url: 'https://example.com/audio.mp3',
        proceduralPreset: 'cosmic_awakening',
      },
      calibration: {
        maxParticles: 65536,
        blackClamp: 0.03,
        gain: 1.8,
        bloomIntensity: 2.0,
        particleSizeScale: 1.2,
        aspectRatioMask: '16:10',
      },
      cues: [
        {
          id: 'show_cue_1',
          time: 0.5,
          archetype: 'ground_mine',
          station: 'left',
          color: '#ff0055',
          altitude: 0.3,
          launchAngle: -15,
        },
        {
          id: 'show_cue_2',
          time: 1.0,
          archetype: 'peony',
          station: 'center',
          color: '#00ffff',
          altitude: 0.9,
          launchAngle: 0,
        },
      ],
    };

    let receivedShow: ShowJSON | null = null;
    projectorBus.on('LOAD_SHOW', (msg) => {
      receivedShow = msg.show;
    });

    studioBus.loadShow(mockShow);
    await sleep(25);
    assertDeepEqual(receivedShow, mockShow, 'Projector must receive full ShowJSON definition');

    // 1.10 PYRO_HELLO & PYRO_PONG
    let pongReceived = false;
    studioBus.on('PYRO_PONG', (msg) => {
      pongReceived = true;
      assert(typeof msg.timestamp === 'number', 'PONG timestamp is number');
      assert(typeof msg.sendTimestamp === 'number', 'PONG sendTimestamp is number');
    });

    studioBus.ping();
    await sleep(35);
    assert(pongReceived, 'Studio must receive PYRO_PONG in response to ping()');

    console.log('✔ All 10 message schemas transmitted and handled with 100% integrity.');
  } finally {
    studioBus.destroy();
    projectorBus.destroy();
  }
}

// ============================================================================
// SUITE 2: HIGH-FREQUENCY BARRAGE STRESS TEST (1,000 RAPID CUES)
// ============================================================================
async function testHighFrequencyBarrageStress() {
  console.log('\n--- Suite 2: High-Frequency Barrage Stress Test (1,000 Rapid Cues) ---');

  const channelName = 'pyrosync_barrage_test_bus';
  const studio = new BroadcastBus('studio', channelName);
  const projector = new BroadcastBus('projector', channelName);

  const TOTAL_CUES = 1000;
  const sentCues: FireCuePayload[] = [];
  const receivedCues: FireCuePayload[] = [];

  // Generate 1,000 diverse cues
  const archetypes: ShellArchetype[] = [
    'peony', 'chrysanthemum', 'willow', 'brocade_crown',
    'rings', 'strobe', 'crossette', 'crackle',
    'ground_mine', 'whistling_comet', 'horsetail', 'finale_barrage'
  ];
  const stations: LaunchStation[] = ['left', 'left_center', 'center', 'right_center', 'right', 'fan'];
  const colors = ['#ff0033', '#00ff66', '#0099ff', '#ffff00', '#ff00ff', '#ffffff', '#ff9900'];

  for (let i = 0; i < TOTAL_CUES; i++) {
    sentCues.push({
      id: `barrage_${i.toString().padStart(4, '0')}`,
      archetype: archetypes[i % archetypes.length],
      station: stations[i % stations.length],
      color: colors[i % colors.length],
      altitude: parseFloat((0.2 + ((i * 17) % 80) / 100).toFixed(2)),
      launchAngle: ((i * 7) % 91) - 45,
      duration: 1.5 + (i % 20) * 0.1,
      seed: 50000 + i,
    });
  }

  // Set up receiver promise to await all 1,000 cues
  const barragePromise = new Promise<number>((resolve) => {
    projector.on('FIRE_CUE', (msg) => {
      receivedCues.push(msg.cue);
      if (receivedCues.length === TOTAL_CUES) {
        resolve(receivedCues.length);
      }
    });
  });

  const sendStartTime = performance.now();

  // Blast all 1,000 cues in an immediate synchronous loop
  for (let i = 0; i < TOTAL_CUES; i++) {
    studio.fireCue(sentCues[i]);
  }

  const sendDurationMs = performance.now() - sendStartTime;
  console.log(`    Dispatched ${TOTAL_CUES} cues synchronously in ${sendDurationMs.toFixed(2)}ms`);

  // Wait for all messages to arrive with a safety timeout of 3.0s
  const timeoutPromise = sleep(3000).then(() => -1);
  const result = await Promise.race([barragePromise, timeoutPromise]);

  const totalDurationMs = performance.now() - sendStartTime;

  assert(result === TOTAL_CUES, `Expected ${TOTAL_CUES} cues received, got ${receivedCues.length}`);
  assertEqual(receivedCues.length, TOTAL_CUES, `Barrage 100% receipt: ${receivedCues.length}/${TOTAL_CUES}`);

  // Deep integrity verification across every single one of the 1,000 cues
  let corruptionCount = 0;
  let outOfOrderCount = 0;

  for (let i = 0; i < TOTAL_CUES; i++) {
    const sent = sentCues[i];
    const recv = receivedCues[i];

    if (recv.id !== sent.id) {
      outOfOrderCount++;
    }

    if (
      recv.id !== sent.id ||
      recv.archetype !== sent.archetype ||
      recv.station !== sent.station ||
      recv.color !== sent.color ||
      recv.altitude !== sent.altitude ||
      recv.launchAngle !== sent.launchAngle ||
      recv.seed !== sent.seed
    ) {
      corruptionCount++;
    }
  }

  assertEqual(outOfOrderCount, 0, `Zero out-of-order deliveries in FIFO queue (got ${outOfOrderCount})`);
  assertEqual(corruptionCount, 0, `Zero corrupted payloads across 1,000 cues (got ${corruptionCount})`);

  const throughput = Math.round((TOTAL_CUES / (totalDurationMs / 1000)));
  console.log(`    Total barrage turnaround: ${totalDurationMs.toFixed(2)}ms (${throughput} cues/sec throughput)`);
  assert(throughput > 1000, `Throughput must exceed 1,000 cues/sec (measured: ${throughput} cues/sec)`);

  // Sub-test: Rapid micro-burst flood (50 waves x 20 cues = 1,000 additional cues)
  console.log('    Testing 50 rapid burst waves of 20 cues...');
  const waveReceived: FireCuePayload[] = [];
  const wavePromise = new Promise<number>((resolve) => {
    projector.on('FIRE_CUE', (msg) => {
      waveReceived.push(msg.cue);
      if (waveReceived.length === TOTAL_CUES) {
        resolve(waveReceived.length);
      }
    });
  });

  const waveStartTime = performance.now();
  for (let wave = 0; wave < 50; wave++) {
    for (let c = 0; c < 20; c++) {
      const idx = wave * 20 + c;
      studio.fireCue({
        id: `wave_cue_${idx}`,
        archetype: 'crossette',
        station: 'fan',
        color: '#ff00aa',
        altitude: 0.8,
      });
    }
    await sleep(1); // 1ms micro-tick
  }

  const waveResult = await Promise.race([wavePromise, sleep(3000).then(() => -1)]);
  const waveDurationMs = performance.now() - waveStartTime;

  assertEqual(waveResult, TOTAL_CUES, `50-wave microburst test: 100% receipt (${waveReceived.length}/${TOTAL_CUES})`);
  console.log(`    50-wave microburst completed in ${waveDurationMs.toFixed(2)}ms without drops.`);

  studio.destroy();
  projector.destroy();

  console.log(`✔ High-frequency barrage stress test passed: 2,000 total cues received with 0 drops and 0 corruption.`);
}

// ============================================================================
// SUITE 3: RECONNECTION HANDSHAKE & LATE-JOINING PROJECTOR WINDOW
// ============================================================================
async function testReconnectionHandshake() {
  console.log('\n--- Suite 3: Reconnection Handshake & Late-Joining Projector ---');

  const channelName = 'pyrosync_reconnect_bus';

  // 1. Studio initializes and runs for a period with active state
  const studio = new BroadcastBus('studio', channelName);

  const activeStudioState = {
    time: 54.321,
    isPlaying: true,
    showId: 'neon_horizon_live',
    calibration: {
      maxParticles: 65536,
      blackClamp: 0.05,
      gain: 2.1,
      bloomIntensity: 2.4,
      particleSizeScale: 1.8,
      aspectRatioMask: '21:9' as const,
      showGuides: true,
    },
  };

  // Studio listens for STATE_SYNC_REQUEST and replies with full state
  studio.on('STATE_SYNC_REQUEST', () => {
    studio.sendStateSyncResponse(activeStudioState);
  });

  // 2. Late-joining projector window 1 initializes
  const lateProjector1 = new BroadcastBus('projector', channelName);

  let p1ReceivedState: any = null;
  lateProjector1.on('STATE_SYNC_RESPONSE', (msg) => {
    p1ReceivedState = msg.payload;
  });

  // Projector sends sync request upon mount
  lateProjector1.requestStateSync();
  await sleep(35);

  assert(p1ReceivedState !== null, 'Late-joining Projector 1 must receive STATE_SYNC_RESPONSE');
  assertEqual(p1ReceivedState.time, 54.321, 'Projector 1 time matches studio');
  assertEqual(p1ReceivedState.isPlaying, true, 'Projector 1 isPlaying matches studio');
  assertEqual(p1ReceivedState.showId, 'neon_horizon_live', 'Projector 1 showId matches studio');
  assertDeepEqual(p1ReceivedState.calibration, activeStudioState.calibration, 'Projector 1 calibration matches studio');

  // Verify Studio registers connection on receiving sync request
  assertEqual(studio.isConnected, true, 'Studio registers Projector 1 as connected');

  // 3. Projector 1 closes (user closes projector tab/window)
  lateProjector1.destroy();
  await sleep(20);

  // 4. Studio state advances while no projector is open
  activeStudioState.time = 88.99;
  activeStudioState.isPlaying = false;
  activeStudioState.calibration.gain = 1.2;
  activeStudioState.calibration.blackClamp = 0.02;

  // 5. Late-joining projector window 2 launches later
  const lateProjector2 = new BroadcastBus('projector', channelName);

  let p2ReceivedState: any = null;
  lateProjector2.on('STATE_SYNC_RESPONSE', (msg) => {
    p2ReceivedState = msg.payload;
  });

  lateProjector2.requestStateSync();
  await sleep(35);

  assert(p2ReceivedState !== null, 'Late-joining Projector 2 must receive fresh STATE_SYNC_RESPONSE');
  assertEqual(p2ReceivedState.time, 88.99, 'Projector 2 received updated time');
  assertEqual(p2ReceivedState.isPlaying, false, 'Projector 2 received updated transport pause state');
  assertEqual(p2ReceivedState.calibration.gain, 1.2, 'Projector 2 received updated calibration gain');
  assertEqual(p2ReceivedState.calibration.blackClamp, 0.02, 'Projector 2 received updated black clamp');

  // 6. Concurrent multi-projector connection handshake
  // Simulate 3 displays (e.g. Center, Left, Right projectors) joining simultaneously
  const projA = new BroadcastBus('projector', channelName);
  const projB = new BroadcastBus('projector', channelName);
  const projC = new BroadcastBus('projector', channelName);

  let syncCountA = 0;
  let syncCountB = 0;
  let syncCountC = 0;

  projA.on('STATE_SYNC_RESPONSE', () => { syncCountA++; });
  projB.on('STATE_SYNC_RESPONSE', () => { syncCountB++; });
  projC.on('STATE_SYNC_RESPONSE', () => { syncCountC++; });

  projA.requestStateSync();
  projB.requestStateSync();
  projC.requestStateSync();

  await sleep(50);

  assert(syncCountA >= 1, 'Concurrent Projector A received sync response');
  assert(syncCountB >= 1, 'Concurrent Projector B received sync response');
  assert(syncCountC >= 1, 'Concurrent Projector C received sync response');

  studio.destroy();
  lateProjector2.destroy();
  projA.destroy();
  projB.destroy();
  projC.destroy();

  console.log('✔ Reconnection handshake & multi-window late joining verified cleanly.');
}

// ============================================================================
// SUITE 4: HEARTBEAT, ROUNDTRIP LATENCY & TIMEOUT DETECTION
// ============================================================================
async function testHeartbeatAndTimeout() {
  console.log('\n--- Suite 4: Heartbeat, Roundtrip Latency & Disconnect Detection ---');

  const channelName = 'pyrosync_heartbeat_bus';
  const studio = new BroadcastBus('studio', channelName);
  const projector = new BroadcastBus('projector', channelName);

  assertEqual(studio.isConnected, false, 'Studio initially disconnected');
  assertEqual(studio.latencyMs, null, 'Studio initially null latency');

  const connectionEvents: Array<{ connected: boolean; latency: number | null }> = [];
  const unsubConn = studio.onConnectionChange((connected, latency) => {
    connectionEvents.push({ connected, latency });
  });

  // Immediate registration fires initial state
  assertEqual(connectionEvents.length, 1, 'Initial connection listener invocation');
  assertEqual(connectionEvents[0].connected, false, 'Initial state is disconnected');

  // Start fast heartbeat on Studio (every 40ms, timeout at 120ms)
  studio.startHeartbeat(40, 120);

  // Wait for 2 heartbeat cycles
  await sleep(100);

  assert(studio.isConnected, 'Studio must be connected after receiving pongs');
  assert(studio.latencyMs !== null && studio.latencyMs >= 0, `Studio latency measured: ${studio.latencyMs}ms`);
  assert(projector.isConnected, 'Projector must be marked connected after handling HELLO');

  const snapshot = studio.getConnectionState();
  assertEqual(snapshot.isConnected, true, 'Snapshot isConnected is true');
  assert(snapshot.latencyMs !== null && snapshot.latencyMs >= 0, 'Snapshot latencyMs is valid');
  assert(snapshot.lastHeartbeatTime !== null && snapshot.lastHeartbeatTime > 0, 'Snapshot lastHeartbeatTime is non-zero');

  // Now simulate Projector disconnect / window close
  console.log('    Simulating projector window close / crash...');
  projector.destroy();

  // Wait past the timeout threshold (120ms timeout + check interval)
  await sleep(220);

  assertEqual(studio.isConnected, false, 'Studio must detect disconnect after timeout window');
  assertEqual(studio.latencyMs, null, 'Studio latency must reset to null on disconnect');

  // Check connection change events log
  const disconnectedEvents = connectionEvents.filter((e) => !e.connected);
  assert(disconnectedEvents.length >= 2, 'Connection change listener reported disconnection');

  unsubConn();
  studio.destroy();

  console.log('✔ Heartbeat ping/pong and disconnect timeout detection verified cleanly.');
}

// ============================================================================
// SUITE 5: BIDIRECTIONAL CONCURRENT TRAFFIC STRESS
// ============================================================================
async function testBidirectionalTrafficStress() {
  console.log('\n--- Suite 5: Bidirectional Concurrent Traffic Stress ---');

  const channelName = 'pyrosync_bidirectional_bus';
  const studio = new BroadcastBus('studio', channelName);
  const projector = new BroadcastBus('projector', channelName);

  const CUES_TO_SEND = 500;
  const BLACKOUTS_TO_SEND = 500;

  let cuesReceivedByProjector = 0;
  let blackoutsReceivedByStudio = 0;

  projector.on('FIRE_CUE', () => {
    cuesReceivedByProjector++;
  });

  studio.on('PANIC_BLACKOUT', () => {
    blackoutsReceivedByStudio++;
  });

  // Simultaneously transmit cues Studio -> Projector, and blackouts Projector -> Studio
  const t0 = performance.now();

  const studioPromise = (async () => {
    for (let i = 0; i < CUES_TO_SEND; i++) {
      studio.fireCue({
        id: `bi_cue_${i}`,
        archetype: 'peony',
        station: 'center',
        color: '#ff0000',
        altitude: 0.8,
      });
    }
  })();

  const projectorPromise = (async () => {
    for (let i = 0; i < BLACKOUTS_TO_SEND; i++) {
      projector.panicBlackout();
    }
  })();

  await Promise.all([studioPromise, projectorPromise]);

  // Wait for delivery
  await sleep(150);

  const dur = performance.now() - t0;
  console.log(`    Bidirectional 1,000 total messages handled in ${dur.toFixed(2)}ms`);

  assertEqual(cuesReceivedByProjector, CUES_TO_SEND, `Projector received 100% of cues (${cuesReceivedByProjector}/${CUES_TO_SEND})`);
  assertEqual(blackoutsReceivedByStudio, BLACKOUTS_TO_SEND, `Studio received 100% of blackouts (${blackoutsReceivedByStudio}/${BLACKOUTS_TO_SEND})`);

  studio.destroy();
  projector.destroy();

  console.log('✔ Bidirectional concurrent traffic completed with zero collision or packet drop.');
}

// ============================================================================
// SUITE 6: CHANNEL NAME ISOLATION & SUBSCRIPTION HYGIENE
// ============================================================================
async function testChannelIsolationAndHygiene() {
  console.log('\n--- Suite 6: Channel Name Isolation & Subscription Hygiene ---');

  const busA1 = new BroadcastBus('studio', 'channel_alpha');
  const busA2 = new BroadcastBus('projector', 'channel_alpha');
  const busB1 = new BroadcastBus('studio', 'channel_beta');

  let alphaReceived = 0;
  let betaReceived = 0;

  busA2.on('FIRE_CUE', () => { alphaReceived++; });
  busB1.on('FIRE_CUE', () => { betaReceived++; });

  busA1.fireCue({ id: 'alpha_1', archetype: 'willow', station: 'left', color: '#fff', altitude: 0.5 });
  await sleep(25);

  assertEqual(alphaReceived, 1, 'Alpha receiver got message from Alpha sender');
  assertEqual(betaReceived, 0, 'Beta receiver must NOT receive messages from Alpha channel');

  busB1.fireCue({ id: 'beta_1', archetype: 'strobe', station: 'right', color: '#fff', altitude: 0.5 });
  await sleep(25);

  assertEqual(alphaReceived, 1, 'Alpha receiver must NOT receive messages from Beta channel');

  // Test Wildcard Listener & Unsubscription
  let wildcardCount = 0;
  let typeCount = 0;

  const unsubWildcard = busA2.onMessage(() => { wildcardCount++; });
  const unsubType = busA2.on('TRANSPORT_PLAY', () => { typeCount++; });

  busA1.play(10.0);
  await sleep(25);

  assertEqual(wildcardCount, 1, 'Wildcard listener received TRANSPORT_PLAY');
  assertEqual(typeCount, 1, 'Type-specific listener received TRANSPORT_PLAY');

  // Unsubscribe type listener
  unsubType();

  busA1.play(20.0);
  await sleep(25);

  assertEqual(wildcardCount, 2, 'Wildcard still active after type unsubscription');
  assertEqual(typeCount, 1, 'Type listener must not fire after unsubscription');

  // Unsubscribe wildcard listener
  unsubWildcard();

  busA1.play(30.0);
  await sleep(25);

  assertEqual(wildcardCount, 2, 'Wildcard must not fire after unsubscription');

  // Idempotent unsubscription
  unsubType();
  unsubWildcard();

  busA1.destroy();
  busA2.destroy();
  busB1.destroy();

  console.log('✔ Channel isolation and subscription hygiene verified.');
}

// ============================================================================
// SUITE 7: ADVERSARIAL RESILIENCE & ERROR BOUNDARY STRESS
// ============================================================================
async function testAdversarialResilience() {
  console.log('\n--- Suite 7: Adversarial Resilience & Error Boundary Stress ---');

  const channelName = 'pyrosync_adversarial_bus';
  const rawChannel = new BroadcastChannel(channelName);
  const bus = new BroadcastBus('projector', channelName);

  let validCuesReceived = 0;
  bus.on('FIRE_CUE', () => {
    validCuesReceived++;
  });

  // Buggy handler that deliberately throws an unhandled exception
  let buggyHandlerExecuted = false;
  bus.on('FIRE_CUE', () => {
    buggyHandlerExecuted = true;
    throw new Error('Adversarial fault injection: deliberate handler crash');
  });

  let safeHandlerExecuted = false;
  bus.on('FIRE_CUE', () => {
    safeHandlerExecuted = true;
  });

  // Inject malformed messages directly via native BroadcastChannel
  console.log('    Injecting malformed raw payloads (null, empty, primitive, unknown types)...');
  rawChannel.postMessage(null);
  rawChannel.postMessage(undefined);
  rawChannel.postMessage('not_a_json_message');
  rawChannel.postMessage(12345);
  rawChannel.postMessage({});
  rawChannel.postMessage({ type: 'CORRUPTED_UNKNOWN_EVENT_TYPE', payload: { secret: true } });

  await sleep(35);

  // Now send a valid cue - verify bus is still operational and resilient despite malformed inputs
  bus.fireCue({ id: 'resilience_cue_1', archetype: 'peony', station: 'center', color: '#ff0000', altitude: 0.5 });
  // Note: bus does not receive its own postMessage, so send from raw channel
  rawChannel.postMessage({
    type: 'FIRE_CUE',
    cue: { id: 'resilience_cue_2', archetype: 'peony', station: 'center', color: '#ff0000', altitude: 0.5 },
  });

  await sleep(35);

  assert(buggyHandlerExecuted, 'Buggy handler was invoked');
  assert(safeHandlerExecuted, 'Safe handler still executed despite buggy handler error (error isolation)');
  assertEqual(validCuesReceived, 1, 'Valid cue was processed successfully');

  // Verify calling methods on destroyed bus is safe and does not throw
  bus.destroy();
  assert(!bus.isConnected, 'Destroyed bus is not connected');
  assertEqual(bus.latencyMs, null, 'Destroyed bus latency is null');

  // Should all be safe no-ops:
  bus.fireCue({ id: 'noop', archetype: 'peony', station: 'center', color: '#fff', altitude: 0.5 });
  bus.panicBlackout();
  bus.play(0);
  bus.pause(0);
  bus.seek(0);
  bus.requestStateSync();
  bus.ping();
  bus.destroy(); // Idempotent destroy

  rawChannel.close();

  console.log('✔ Adversarial error boundary and exception isolation verified.');
}

// ============================================================================
// MAIN RUNNER
// ============================================================================
async function runAllChallengerTests() {
  console.log('======================================================================');
  console.log('      EMPIRICAL CHALLENGER 1: BROADCASTCHANNEL IPC & STATE SYNC       ');
  console.log('======================================================================');

  const tStart = performance.now();

  try {
    await testAllMessageSchemas();
    await testHighFrequencyBarrageStress();
    await testReconnectionHandshake();
    await testHeartbeatAndTimeout();
    await testBidirectionalTrafficStress();
    await testChannelIsolationAndHygiene();
    await testAdversarialResilience();
  } catch (err) {
    console.error('\n💥 Unhandled exception during challenger test execution:', err);
    process.exit(1);
  }

  const elapsed = (performance.now() - tStart).toFixed(1);

  console.log('\n======================================================================');
  console.log('EMPIRICAL CHALLENGER 1 VERIFICATION SUMMARY:');
  console.log(`Total Assertions Evaluated: ${stats.total}`);
  console.log(`Passed:                     ${stats.passed}`);
  console.log(`Failed:                     ${stats.failed}`);
  console.log(`Total Execution Time:       ${elapsed}ms`);
  console.log('======================================================================\n');

  if (stats.failed > 0) {
    console.error(`VERDICT: REQUEST_CHANGES (${stats.failed} failed assertions)`);
    process.exit(1);
  } else {
    console.log('VERDICT: APPROVE (100% empirical assertions passed cleanly)');
    process.exit(0);
  }
}

runAllChallengerTests();
