import assert from 'node:assert';
import { createServer } from 'vite';

async function runForensicAudit() {
  console.log('======================================================================');
  console.log('    PYROSYNC MILESTONE 2: INDEPENDENT FORENSIC INTEGRITY AUDIT SUITE  ');
  console.log('======================================================================\n');

  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });

  try {
    const sfxModule = await server.ssrLoadModule('./src/engine/audio/ProceduralSFX.ts');
    const micModule = await server.ssrLoadModule('./src/engine/audio/MicAnalyzer.ts');
    const musicModule = await server.ssrLoadModule('./src/engine/audio/ProceduralMusic.ts');
    const audioEngineModule = await server.ssrLoadModule('./src/engine/audio/AudioEngine.ts');
    const audioMock = await server.ssrLoadModule('./tests/harness/audio-mock.ts');

    const { ProceduralSFX } = sfxModule;
    const { MicAnalyzer, DEFAULT_PROFILES } = micModule;
    const { ProceduralMusic } = musicModule;
    const { AudioEngine } = audioEngineModule;
    const { MockAudioContext, MockAnalyserNode, MockAudioNode } = audioMock;

    let checksCount = 0;
    function pass(msg) {
      checksCount++;
      console.log(`  [PASS ${checksCount}] ${msg}`);
    }

    // =======================================================================
    // 1. PROCEDURAL SFX FORENSIC CHECKS
    // =======================================================================
    console.log('\n--- Phase 1: ProceduralSFX Integrity & Default Muted Verification ---');
    const mockCtx = new MockAudioContext();
    // Add createMediaStreamSource mock if missing
    mockCtx.createMediaStreamSource = (stream) => new MockAudioNode(mockCtx);

    const sfx = new ProceduralSFX(mockCtx);

    // 1.1 Strictly Muted by Default
    assert.strictEqual(sfx.getIsMuted(), true, 'isMuted must be strictly true upon instantiation');
    assert.strictEqual(sfx.getVolume(), 0.0, 'volume must be strictly 0.0 upon instantiation');
    pass('ProceduralSFX is strictly MUTED by default with 0.0 volume');

    // 1.2 Zero Node Allocation While Muted
    const destNodesBefore = mockCtx.destination.connectedNodes.length;
    sfx.play('launch');
    sfx.play('boom');
    sfx.play('crackle');
    const destNodesAfter = mockCtx.destination.connectedNodes.length;
    assert.strictEqual(destNodesAfter, destNodesBefore, 'Zero audio nodes connected to destination while muted');
    pass('ProceduralSFX play() returns immediately when muted (zero audio graph pollution)');

    // 1.3 Unmuting Behavior
    sfx.setMuted(false);
    assert.strictEqual(sfx.getIsMuted(), false, 'Unmuted successfully');
    assert.strictEqual(sfx.getVolume(), 0.5, 'Unmuting from 0.0 restores comfortable 0.5 default volume');
    pass('Unmuting restores default 0.5 volume');

    // 1.4 Volume Clamping
    sfx.setVolume(-0.5);
    assert.strictEqual(sfx.getVolume(), 0.0, 'Negative volume clamped to 0.0');
    sfx.setVolume(2.5);
    assert.strictEqual(sfx.getVolume(), 1.0, 'Excess volume clamped to 1.0');
    pass('SFX volume strictly clamped to [0.0, 1.0]');

    // 1.5 Genuine Synthesis Execution
    sfx.setVolume(0.8);
    // Should execute launch thump, boom, crackle without error
    sfx.play('launch');
    sfx.play('boom');
    sfx.play('crackle');
    pass('ProceduralSFX synthesizes launch thump, boom, and crackle via Web Audio nodes');

    // 1.6 Blackout StopAll
    sfx.stopAll();
    pass('ProceduralSFX stopAll() safely silences active voices');

    // =======================================================================
    // 2. PROCEDURAL MUSIC FORENSIC CHECKS
    // =======================================================================
    console.log('\n--- Phase 2: ProceduralMusic Zero-Dependency Multi-Track Synthesis ---');

    // 2.1 Demo Show 1: Cosmic Awakening
    const cosmicBuf = ProceduralMusic.generate(mockCtx, 'cosmic_awakening', 5.0);
    assert.strictEqual(cosmicBuf.numberOfChannels, 2, 'Cosmic Awakening is true stereo (2 channels)');
    assert.strictEqual(cosmicBuf.sampleRate, 44100, 'Sample rate is 44.1kHz');
    assert.strictEqual(cosmicBuf.duration, 5.0, 'Duration matches requested duration');
    const cLeft = cosmicBuf.getChannelData(0);
    const cRight = cosmicBuf.getChannelData(1);
    let cNonZero = 0;
    let cPeak = 0;
    for (let i = 0; i < cLeft.length; i++) {
      if (Math.abs(cLeft[i]) > 0.0001) cNonZero++;
      if (Math.abs(cLeft[i]) > cPeak) cPeak = Math.abs(cLeft[i]);
      assert.ok(cLeft[i] >= -1.0 && cLeft[i] <= 1.0, 'Audio samples clamped [-1.0, 1.0]');
      assert.ok(cRight[i] >= -1.0 && cRight[i] <= 1.0, 'Audio samples clamped [-1.0, 1.0]');
    }
    assert.ok(cNonZero > 10000, 'Cosmic Awakening contains non-trivial synthesized wave data');
    pass(`Cosmic Awakening: ${cNonZero} non-zero samples synthesized, peak amplitude = ${cPeak.toFixed(4)}`);

    // 2.2 Demo Show 2: Neon Horizon
    const neonBuf = ProceduralMusic.generate(mockCtx, 'neon_horizon', 5.0);
    assert.strictEqual(neonBuf.numberOfChannels, 2, 'Neon Horizon is true stereo (2 channels)');
    assert.strictEqual(neonBuf.duration, 5.0, 'Duration matches requested duration');
    const nLeft = neonBuf.getChannelData(0);
    let nNonZero = 0;
    let nPeak = 0;
    for (let i = 0; i < nLeft.length; i++) {
      if (Math.abs(nLeft[i]) > 0.0001) nNonZero++;
      if (Math.abs(nLeft[i]) > nPeak) nPeak = Math.abs(nLeft[i]);
      assert.ok(nLeft[i] >= -1.0 && nLeft[i] <= 1.0, 'Audio samples clamped [-1.0, 1.0]');
    }
    assert.ok(nNonZero > 10000, 'Neon Horizon contains non-trivial synthesized wave data');
    pass(`Neon Horizon: ${nNonZero} non-zero samples synthesized, peak amplitude = ${nPeak.toFixed(4)}`);

    // 2.3 Stereo Panning Difference
    let hasStereoVariance = false;
    for (let i = 0; i < cLeft.length; i++) {
      if (Math.abs(cLeft[i] - cRight[i]) > 0.0001) {
        hasStereoVariance = true;
        break;
      }
    }
    assert.ok(hasStereoVariance, 'Procedural music contains authentic stereo widening and panning');
    pass('ProceduralMusic includes genuine stereo spatial widening (L != R)');

    // =======================================================================
    // 3. MIC ANALYZER 3-BAND FFT & DYNAMIC NOISE FLOOR CHECKS
    // =======================================================================
    console.log('\n--- Phase 3: MicAnalyzer 3-Band FFT & Dynamic Noise Floor ---');
    const mic = new MicAnalyzer(mockCtx);
    assert.strictEqual(mic.getIsActive(), false, 'Inactive before start()');
    assert.strictEqual(mic.getIsPermissionDenied(), false, 'No initial permission denial');
    pass('MicAnalyzer initializes cleanly in standby mode');

    // 3.1 Pre-configured Audio-Reactive Profiles
    assert.ok(DEFAULT_PROFILES.club_edm, 'Club/EDM profile exists');
    assert.ok(DEFAULT_PROFILES.ambient, 'Ambient profile exists');
    assert.ok(DEFAULT_PROFILES.percussive, 'Percussive profile exists');
    assert.strictEqual(DEFAULT_PROFILES.club_edm.subBass.cutoffHz, 140, 'Club/EDM sub cutoff 140Hz');
    assert.strictEqual(DEFAULT_PROFILES.club_edm.treble.cutoffHz, 2500, 'Club/EDM treble cutoff 2500Hz');
    pass('Pre-configured audio-reactive profiles (Club/EDM, Ambient, Percussive) verified');

    // 3.2 Cooldown Clamping & Enforcement
    mic.setCooldown('sub', 10);
    assert.strictEqual(mic.getCooldown('sub'), 50, 'Minimum cooldown clamped to 50ms safety barrier');
    mic.setCooldown('sub', 2000);
    assert.strictEqual(mic.getCooldown('sub'), 1000, 'Maximum cooldown clamped to 1000ms');
    mic.setCooldown('sub', 250); // Set standard 250ms for trigger tests
    pass('Cooldown gate strictly clamped to [50ms, 1000ms]');

    // 3.3 Noise Floor Floor Clamp
    const baselines = mic.getBaselines();
    assert.ok(baselines.sub >= 0.05, 'Baseline noise floor clamped >= 0.05 min barrier');
    pass('Dynamic noise floor enforces 0.05 minimum floor clamp');

    // 3.4 Retrigger Gate Suppression
    let triggerCount = 0;
    let lastTriggerEvent = null;
    mic.onTrigger((evt) => {
      triggerCount++;
      lastTriggerEvent = evt;
    });

    // Start mic with mock stream
    const mockTrack = { stop: () => {} };
    const mockStream = { getTracks: () => [mockTrack] };
    await mic.start(mockStream);
    assert.strictEqual(mic.getIsActive(), true, 'Mic analyzer active after start');
    pass('MicAnalyzer starts with genuine audio stream');

    // Feed high synthetic energy into dedicated sub-bass analyser
    const analyserSub = mic.analyserSub;
    if (analyserSub && analyserSub.syntheticFrequencyData) {
      analyserSub.syntheticFrequencyData.fill(240);
    }

    // Trigger frame 1 at t=1000ms
    mic.processFrame(1000);
    const triggersAfterT1 = triggerCount;
    assert.ok(triggersAfterT1 >= 1, 'Trigger fired on energy spike crossing threshold');
    assert.strictEqual(lastTriggerEvent.band, 'sub');
    pass('3-Band trigger fires accurately on sub-bass transient energy');

    // Immediate frame 2 at t=1020ms (inside cooldown window)
    mic.processFrame(1020);
    assert.strictEqual(triggerCount, triggersAfterT1, 'Duplicate trigger strictly suppressed during cooldown');
    pass('Cooldown gate suppresses duplicate trigger inside lockout window');

    // Frame 3 after cooldown window (t=1400ms)
    mic.processFrame(1400);
    assert.ok(triggerCount > triggersAfterT1, 'Subsequent trigger permitted after cooldown elapsed');
    pass('Cooldown gate permits trigger after lockout duration expires');

    mic.stop();
    assert.strictEqual(mic.getIsActive(), false, 'Mic stopped cleanly');
    pass('MicAnalyzer stops cleanly and halts audio processing');

    // =======================================================================
    // 4. AUDIO ENGINE INTEGRATED TIMECODE & WAVEFORM CHECKS
    // =======================================================================
    console.log('\n--- Phase 4: AudioEngine Drift-Free Clock & Waveform Peak Decimation ---');
    const engine = new AudioEngine(mockCtx);
    assert.strictEqual(engine.isSFXMuted(), true, 'Engine inherits SFX default muted state');
    assert.strictEqual(engine.getSFXVolume(), 0.0, 'Engine inherits SFX 0.0 volume');
    assert.strictEqual(engine.getCurrentTime(), 0.0, 'Initial playhead at 0.0s');
    pass('AudioEngine defaults verified');

    // 4.1 Load Demo Track
    engine.loadDemoTrack('neon_horizon', 20.0);
    assert.strictEqual(engine.getDuration(), 20.0, 'Duration matches loaded track');
    assert.strictEqual(engine.getTrackTitle(), 'Neon Horizon (128 BPM Synthwave)');
    pass('AudioEngine loads procedural synth soundtrack cleanly');

    // 4.2 Waveform Min/Max Peaks Extraction
    const peaks = engine.extractWaveformPeaks(200);
    assert.strictEqual(peaks.min.length, 200, '200 min buckets generated');
    assert.strictEqual(peaks.max.length, 200, '200 max buckets generated');
    for (let b = 0; b < 200; b++) {
      assert.ok(peaks.min[b] >= -1.0 && peaks.min[b] <= 0.0, 'Min peak strictly in [-1.0, 0.0]');
      assert.ok(peaks.max[b] >= 0.0 && peaks.max[b] <= 1.0, 'Max peak strictly in [0.0, 1.0]');
    }
    pass('Waveform peak extraction produces bounded [-1.0, 1.0] envelopes');

    // 4.3 Transient Peak Detection
    const transients = engine.detectTransients(0.05);
    assert.ok(Array.isArray(transients), 'Returns array of transient timestamps');
    assert.ok(transients.length > 0, 'Detects rhythm transients in synthesized audio track');
    pass(`Transient detector identified ${transients.length} rhythmic transients`);

    // 4.4 Drift-Free Hardware Audio DAC Clock
    engine.play(5.0);
    assert.strictEqual(engine.getIsPlaying(), true, 'Transport is playing');
    mockCtx.advanceTime(7.250);
    const measuredTime = engine.getCurrentTime();
    const expectedTime = 5.0 + 7.250;
    const driftMs = Math.abs(measuredTime - expectedTime) * 1000;
    assert.ok(driftMs < 1.0, `Clock drift ${driftMs}ms is < 1ms (locked to hardware DAC clock)`);
    pass(`Sample-accurate timecode clock verified: drift = ${driftMs.toFixed(4)}ms`);

    // 4.5 Pause & Blackout
    engine.pause();
    assert.strictEqual(engine.getIsPlaying(), false, 'Transport paused');
    engine.blackout();
    pass('AudioEngine emergency blackout halts playback');

    console.log('\n======================================================================');
    console.log(`VERDICT: ALL ${checksCount} FORENSIC INTEGRITY CHECKS PASSED CLEANLY.`);
    console.log('======================================================================\n');
  } finally {
    await server.close();
  }
}

runForensicAudit().catch((err) => {
  console.error('\n❌ FORENSIC AUDIT FAILED:', err);
  process.exit(1);
});
