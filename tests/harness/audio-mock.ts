/**
 * Web Audio API Mock for Headless E2E Testing
 * Deterministically simulates AudioContext, Analysers, Filters, and Buffer synthesis
 */

export class MockAudioParam {
  value: number;
  private timelineEvents: Array<{ type: string; time: number; value: number }> = [];

  constructor(initialValue: number = 1.0) {
    this.value = initialValue;
  }

  setValueAtTime(val: number, time: number): MockAudioParam {
    this.value = val;
    this.timelineEvents.push({ type: 'setValueAtTime', time, value: val });
    return this;
  }

  linearRampToValueAtTime(val: number, time: number): MockAudioParam {
    this.value = val;
    this.timelineEvents.push({ type: 'linearRampToValueAtTime', time, value: val });
    return this;
  }

  exponentialRampToValueAtTime(val: number, time: number): MockAudioParam {
    this.value = val;
    this.timelineEvents.push({ type: 'exponentialRampToValueAtTime', time, value: val });
    return this;
  }
}

export class MockAudioNode {
  context: MockAudioContext;
  connectedNodes: MockAudioNode[] = [];

  constructor(context: MockAudioContext) {
    this.context = context;
  }

  connect(target: MockAudioNode): MockAudioNode {
    this.connectedNodes.push(target);
    return target;
  }

  disconnect(): void {
    this.connectedNodes = [];
  }
}

export class MockGainNode extends MockAudioNode {
  gain: MockAudioParam;

  constructor(context: MockAudioContext, initialGain: number = 1.0) {
    super(context);
    this.gain = new MockAudioParam(initialGain);
  }
}

export class MockBiquadFilterNode extends MockAudioNode {
  type: 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'allpass';
  frequency: MockAudioParam;
  Q: MockAudioParam;

  constructor(context: MockAudioContext) {
    super(context);
    this.type = 'lowpass';
    this.frequency = new MockAudioParam(350);
    this.Q = new MockAudioParam(1);
  }
}

export class MockAnalyserNode extends MockAudioNode {
  fftSize: number = 2048;
  frequencyBinCount: number = 1024;
  minDecibels: number = -100;
  maxDecibels: number = -30;
  smoothingTimeConstant: number = 0.8;
  
  // Synthetic frequency data container for test injection
  syntheticFrequencyData: Uint8Array;
  syntheticTimeDomainData: Uint8Array;

  constructor(context: MockAudioContext) {
    super(context);
    this.syntheticFrequencyData = new Uint8Array(1024);
    this.syntheticTimeDomainData = new Uint8Array(1024);
  }

  getByteFrequencyData(array: Uint8Array): void {
    const len = Math.min(array.length, this.syntheticFrequencyData.length);
    for (let i = 0; i < len; i++) {
      array[i] = this.syntheticFrequencyData[i];
    }
  }

  getByteTimeDomainData(array: Uint8Array): void {
    const len = Math.min(array.length, this.syntheticTimeDomainData.length);
    for (let i = 0; i < len; i++) {
      array[i] = this.syntheticTimeDomainData[i];
    }
  }

  setSyntheticBandEnergy(band: 'sub' | 'mid' | 'treble', normalizedEnergy: number): void {
    const byteVal = Math.min(255, Math.max(0, Math.round(normalizedEnergy * 255)));
    if (band === 'sub') {
      // Sub-bass bins: 0 to 10 (~0 - 200 Hz at 44.1kHz)
      for (let i = 0; i < 10; i++) this.syntheticFrequencyData[i] = byteVal;
    } else if (band === 'mid') {
      // Mid bins: 11 to 100 (~200 - 2150 Hz)
      for (let i = 11; i < 100; i++) this.syntheticFrequencyData[i] = byteVal;
    } else if (band === 'treble') {
      // Treble bins: 101 to 500 (~2150 - 10kHz)
      for (let i = 101; i < 500; i++) this.syntheticFrequencyData[i] = byteVal;
    }
  }
}

export class MockAudioBuffer {
  sampleRate: number;
  length: number;
  duration: number;
  numberOfChannels: number;
  private channelData: Float32Array[];

  constructor(options: { numberOfChannels?: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels || 2;
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.duration = this.length / this.sampleRate;
    this.channelData = [];
    for (let i = 0; i < this.numberOfChannels; i++) {
      this.channelData.push(new Float32Array(this.length));
    }
  }

  getChannelData(channel: number): Float32Array {
    return this.channelData[channel] || this.channelData[0];
  }
}

export class MockAudioBufferSourceNode extends MockAudioNode {
  buffer: MockAudioBuffer | null = null;
  playbackRate: MockAudioParam;
  onended: (() => void) | null = null;
  isPlaying: boolean = false;
  startTime: number = 0;

  constructor(context: MockAudioContext) {
    super(context);
    this.playbackRate = new MockAudioParam(1.0);
  }

  start(when: number = 0, offset: number = 0): void {
    this.isPlaying = true;
    this.startTime = when;
  }

  stop(when: number = 0): void {
    this.isPlaying = false;
    if (this.onended) this.onended();
  }
}

export class MockAudioContext {
  currentTime: number = 0.0;
  sampleRate: number = 44100;
  state: 'suspended' | 'running' | 'closed' = 'running';
  destination: MockAudioNode;

  constructor() {
    this.destination = new MockAudioNode(this);
  }

  createGain(): MockGainNode {
    return new MockGainNode(this);
  }

  createAnalyser(): MockAnalyserNode {
    return new MockAnalyserNode(this);
  }

  createBiquadFilter(): MockBiquadFilterNode {
    return new MockBiquadFilterNode(this);
  }

  createBufferSource(): MockAudioBufferSourceNode {
    return new MockAudioBufferSourceNode(this);
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): MockAudioBuffer {
    return new MockAudioBuffer({ numberOfChannels, length, sampleRate });
  }

  async resume(): Promise<void> {
    this.state = 'running';
  }

  async suspend(): Promise<void> {
    this.state = 'suspended';
  }

  async close(): Promise<void> {
    this.state = 'closed';
  }

  // Test simulation helper: advances audio clock by dt
  advanceTime(dtSeconds: number): void {
    if (this.state === 'running') {
      this.currentTime += dtSeconds;
    }
  }
}

/**
 * Creates a synthetic multi-track pyromusical audio buffer
 * with simulated kick drums, snare transients, and drops
 */
export function createSyntheticAudioTrack(durationSec: number = 60.0, bpm: number = 120): MockAudioBuffer {
  const sampleRate = 44100;
  const length = Math.floor(sampleRate * durationSec);
  const buffer = new MockAudioBuffer({ numberOfChannels: 2, length, sampleRate });
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const beatInterval = 60 / bpm;
  const samplesPerBeat = Math.floor(sampleRate * beatInterval);

  // Generate kicks on beat 1 & 3, snares on 2 & 4
  for (let sample = 0; sample < length; sample++) {
    const beatIndex = Math.floor(sample / samplesPerBeat);
    const sampleInBeat = sample % samplesPerBeat;
    const timeInBeat = sampleInBeat / sampleRate;

    let val = 0.0;

    // Bass drum / kick transient on downbeats (beat 0, 2, 4...)
    if (beatIndex % 2 === 0 && timeInBeat < 0.2) {
      const kickFreq = 120 * Math.exp(-timeInBeat * 20); // rapid pitch sweep down
      val += 0.8 * Math.sin(2 * Math.PI * kickFreq * timeInBeat) * Math.exp(-timeInBeat * 15);
    }

    // Snare / high transient on backbeats (beat 1, 3, 5...)
    if (beatIndex % 2 === 1 && timeInBeat < 0.15) {
      // Noise burst
      val += 0.5 * (Math.random() * 2 - 1) * Math.exp(-timeInBeat * 25);
    }

    // Ambient tone / synth drone
    const t = sample / sampleRate;
    val += 0.05 * Math.sin(2 * Math.PI * 220 * t);

    left[sample] = Math.max(-1.0, Math.min(1.0, val));
    right[sample] = left[sample];
  }

  return buffer;
}
