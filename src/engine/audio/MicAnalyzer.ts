import { AudioBand, AudioBands, AudioReactiveProfile, AudioTriggerEvent, LaunchStation, ShellArchetype } from '../../types';

export const DEFAULT_PROFILES: Record<string, AudioReactiveProfile> = {
  club_edm: {
    name: 'Club/EDM',
    subBass: {
      sensitivity: 1.4,
      cutoffHz: 140,
      primaryArchetype: 'ground_mine',
      stations: ['left', 'right', 'center'],
    },
    mid: {
      sensitivity: 1.0,
      centerHz: 1000,
      primaryArchetype: 'peony',
      stations: ['left_center', 'right_center'],
    },
    treble: {
      sensitivity: 1.3,
      cutoffHz: 2500,
      primaryArchetype: 'strobe',
      stations: ['fan'],
    },
    cooldownMs: 120,
    noiseFloorAdaptationRate: 0.02,
  },
  ambient: {
    name: 'Ambient',
    subBass: {
      sensitivity: 0.6,
      cutoffHz: 120,
      primaryArchetype: 'willow',
      stations: ['center'],
    },
    mid: {
      sensitivity: 1.5,
      centerHz: 800,
      primaryArchetype: 'horsetail',
      stations: ['left_center', 'right_center'],
    },
    treble: {
      sensitivity: 0.5,
      cutoffHz: 3000,
      primaryArchetype: 'whistling_comet',
      stations: ['left', 'right'],
    },
    cooldownMs: 500,
    noiseFloorAdaptationRate: 0.01,
  },
  percussive: {
    name: 'Percussive',
    subBass: {
      sensitivity: 1.0,
      cutoffHz: 150,
      primaryArchetype: 'ground_mine',
      stations: ['center'],
    },
    mid: {
      sensitivity: 1.4,
      centerHz: 1200,
      primaryArchetype: 'crossette',
      stations: ['left_center', 'right_center'],
    },
    treble: {
      sensitivity: 1.8,
      cutoffHz: 2500,
      primaryArchetype: 'crackle',
      stations: ['left', 'right', 'fan'],
    },
    cooldownMs: 75,
    noiseFloorAdaptationRate: 0.05,
  },
};

/**
 * Live Mic 3-Band FFT Analyzer & Dynamic Noise-Floor Tracker
 * Splits live input into Sub-bass (<140Hz), Mid (140-2500Hz), and Treble (>2500Hz).
 * Tracks moving baseline ambient noise and fires pyrotechnic shell cues when peaks
 * cross dynamic thresholds subject to re-trigger cooldown gates.
 */
export class MicAnalyzer {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  // Band Filters
  private filterSub: BiquadFilterNode | null = null;
  private filterMid: BiquadFilterNode | null = null;
  private filterTreble: BiquadFilterNode | null = null;

  // Analysers
  private analyserSub: AnalyserNode | null = null;
  private analyserMid: AnalyserNode | null = null;
  private analyserTreble: AnalyserNode | null = null;

  // State
  private isActive: boolean = false;
  private isPermissionDenied: boolean = false;
  private permissionErrorType: 'denied' | 'not_found' | 'insecure' | 'unsupported' | null = null;
  private permissionErrorMessage: string = '';
  private animationFrameId: number | null = null;

  // Energy levels [0.0 - 1.0]
  private energy: AudioBands = { sub: 0.0, mid: 0.0, treble: 0.0 };

  // Noise floor baselines
  private baseline: AudioBands = { sub: 0.1, mid: 0.1, treble: 0.1 };
  private minNoiseFloorClamp: number = 0.05;
  private adaptationEnabled: boolean = true;
  private adaptationRate: number = 0.02; // Alpha EMA factor

  // Mode switcher: 'auto' (adaptive dynamic noise floor) vs 'fixed' (manual threshold offset)
  public mode: 'auto' | 'fixed' = 'auto';

  // Sensitivities and threshold offsets
  private sensitivity: AudioBands = { sub: 1.4, mid: 1.0, treble: 1.3 };
  private thresholdOffset: AudioBands = { sub: 0.12, mid: 0.15, treble: 0.14 };

  // Cooldown timer gates (in milliseconds)
  private cooldowns: Record<AudioBand, number> = {
    sub: 250,
    mid: 180,
    treble: 120,
  };
  private lastTriggerTime: Record<AudioBand, number> = {
    sub: 0,
    mid: 0,
    treble: 0,
  };

  // Station & Archetype mappings
  private currentProfile: AudioReactiveProfile = DEFAULT_PROFILES.club_edm;
  private onTriggerCallback: ((event: AudioTriggerEvent) => void) | null = null;

  // Byte buffers for FFT analysis
  private byteDataSub: Uint8Array = new Uint8Array(128);
  private byteDataMid: Uint8Array = new Uint8Array(128);
  private byteDataTreble: Uint8Array = new Uint8Array(128);

  constructor(context?: AudioContext | null) {
    if (context) {
      this.ctx = context;
    }
  }

  public setContext(context: AudioContext): void {
    this.ctx = context;
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public getIsPermissionDenied(): boolean {
    return this.isPermissionDenied;
  }

  public getPermissionErrorType(): 'denied' | 'not_found' | 'insecure' | 'unsupported' | null {
    return this.permissionErrorType;
  }

  public getPermissionErrorMessage(): string {
    return this.permissionErrorMessage;
  }

  public resetPermissionState(): void {
    this.isPermissionDenied = false;
    this.permissionErrorType = null;
    this.permissionErrorMessage = '';
  }

  public onTrigger(callback: (event: AudioTriggerEvent) => void): void {
    this.onTriggerCallback = callback;
  }

  /**
   * Starts microphone analysis.
   * Acquires audio stream via getUserMedia and configures 3-band filter bank.
   */
  public async start(providedStream?: MediaStream): Promise<void> {
    if (this.isActive) return;

    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume().catch(() => {});
    }

    try {
      if (providedStream) {
        this.stream = providedStream;
      } else {
        const nav = typeof navigator !== 'undefined' ? navigator : null;
        const mediaDevices = nav?.mediaDevices;
        const getUserMedia =
          mediaDevices?.getUserMedia?.bind(mediaDevices) ||
          (nav as any)?.getUserMedia?.bind(nav) ||
          (nav as any)?.webkitGetUserMedia?.bind(nav) ||
          (nav as any)?.mozGetUserMedia?.bind(nav);

        if (mediaDevices?.getUserMedia) {
          this.stream = await mediaDevices.getUserMedia({ audio: true, video: false });
        } else if (getUserMedia) {
          this.stream = await new Promise<MediaStream>((resolve, reject) => {
            getUserMedia({ audio: true, video: false }, resolve, reject);
          });
        } else {
          // Check if failure is due to non-secure origin (e.g. accessing via 192.168.x.x or embedded view)
          const isNonSecure =
            typeof window !== 'undefined' &&
            (window.isSecureContext === false ||
              (window.location.protocol !== 'https:' &&
                window.location.hostname !== 'localhost' &&
                window.location.hostname !== '127.0.0.1'));

          this.isPermissionDenied = true;
          this.permissionErrorType = isNonSecure ? 'insecure' : 'unsupported';
          this.permissionErrorMessage = isNonSecure
            ? `Microphone access is blocked because this page is loaded over "${typeof window !== 'undefined' ? window.location.origin : 'insecure origin'}". Browsers restrict microphone access to http://localhost:5173 or HTTPS.`
            : 'Microphone API (getUserMedia) is not supported or was blocked by your browser/webview environment.';
          throw new Error(this.permissionErrorMessage);
        }
      }

      this.isPermissionDenied = false;
      this.permissionErrorType = null;
      this.permissionErrorMessage = '';
      this.setupAudioGraph();
      this.isActive = true;
      this.startAnalysisLoop();
    } catch (err: any) {
      const errName = err?.name || '';

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        this.isPermissionDenied = true;
        this.isActive = false;
        this.permissionErrorType = 'denied';
        this.permissionErrorMessage =
          'Microphone permission was blocked. Click the lock/tune icon in your browser URL bar to allow microphone access.';
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        this.isPermissionDenied = true;
        this.isActive = false;
        this.permissionErrorType = 'not_found';
        this.permissionErrorMessage =
          'No physical microphone detected. Connect an audio input device and retry.';
      } else {
        this.isPermissionDenied = true;
        this.isActive = false;
        if (!this.permissionErrorType) {
          this.permissionErrorType = 'unsupported';
          this.permissionErrorMessage =
            err?.message || 'Failed to initialize microphone access. Check browser permissions and audio device settings.';
        }
      }
    }
  }

  private setupAudioGraph(): void {
    if (!this.ctx || !this.stream) return;

    this.sourceNode = this.ctx.createMediaStreamSource(this.stream);

    // 1. Sub-bass band (<140Hz lowpass)
    this.filterSub = this.ctx.createBiquadFilter();
    this.filterSub.type = 'lowpass';
    this.filterSub.frequency.setValueAtTime(this.currentProfile.subBass.cutoffHz || 140, this.ctx.currentTime);
    this.filterSub.Q.setValueAtTime(1.0, this.ctx.currentTime);

    this.analyserSub = this.ctx.createAnalyser();
    this.analyserSub.fftSize = 256;
    this.analyserSub.smoothingTimeConstant = 0.5;
    this.sourceNode.connect(this.filterSub);
    this.filterSub.connect(this.analyserSub);

    // 2. Mid band (140Hz - 2500Hz bandpass)
    this.filterMid = this.ctx.createBiquadFilter();
    this.filterMid.type = 'bandpass';
    this.filterMid.frequency.setValueAtTime(this.currentProfile.mid.centerHz || 1000, this.ctx.currentTime);
    this.filterMid.Q.setValueAtTime(1.2, this.ctx.currentTime);

    this.analyserMid = this.ctx.createAnalyser();
    this.analyserMid.fftSize = 256;
    this.analyserMid.smoothingTimeConstant = 0.5;
    this.sourceNode.connect(this.filterMid);
    this.filterMid.connect(this.analyserMid);

    // 3. Treble band (>2500Hz highpass)
    this.filterTreble = this.ctx.createBiquadFilter();
    this.filterTreble.type = 'highpass';
    this.filterTreble.frequency.setValueAtTime(this.currentProfile.treble.cutoffHz || 2500, this.ctx.currentTime);
    this.filterTreble.Q.setValueAtTime(1.0, this.ctx.currentTime);

    this.analyserTreble = this.ctx.createAnalyser();
    this.analyserTreble.fftSize = 256;
    this.analyserTreble.smoothingTimeConstant = 0.5;
    this.sourceNode.connect(this.filterTreble);
    this.filterTreble.connect(this.analyserTreble);

    this.byteDataSub = new Uint8Array(this.analyserSub.frequencyBinCount);
    this.byteDataMid = new Uint8Array(this.analyserMid.frequencyBinCount);
    this.byteDataTreble = new Uint8Array(this.analyserTreble.frequencyBinCount);
  }

  public stop(): void {
    this.isActive = false;

    if (this.animationFrameId !== null) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.animationFrameId);
      }
      this.animationFrameId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }

    try {
      this.sourceNode?.disconnect();
      this.filterSub?.disconnect();
      this.filterMid?.disconnect();
      this.filterTreble?.disconnect();
      this.analyserSub?.disconnect();
      this.analyserMid?.disconnect();
      this.analyserTreble?.disconnect();
    } catch {}

    this.energy = { sub: 0, mid: 0, treble: 0 };
  }

  private startAnalysisLoop(): void {
    const loop = () => {
      if (!this.isActive) return;
      this.processFrame(performance.now());
      if (typeof requestAnimationFrame === 'function') {
        this.animationFrameId = requestAnimationFrame(loop);
      }
    };
    if (typeof requestAnimationFrame === 'function') {
      this.animationFrameId = requestAnimationFrame(loop);
    }
  }

  /**
   * Measures current band energy, updates noise-floor tracking,
   * evaluates cooldown gates, and fires trigger events.
   */
  public processFrame(nowMs: number = performance.now()): void {
    if (!this.isActive) return;

    // 1. Extract RMS energy from each analyser
    const subEnergy = this.computeEnergy(this.analyserSub, this.byteDataSub);
    const midEnergy = this.computeEnergy(this.analyserMid, this.byteDataMid);
    const trebleEnergy = this.computeEnergy(this.analyserTreble, this.byteDataTreble);

    this.energy = { sub: subEnergy, mid: midEnergy, treble: trebleEnergy };

    // 2. Dynamic Noise-Floor Adaptation (Asymmetric Alpha EMA)
    if (this.adaptationEnabled) {
      this.updateBaseline('sub', subEnergy);
      this.updateBaseline('mid', midEnergy);
      this.updateBaseline('treble', trebleEnergy);
    }

    // 3. Evaluate trigger thresholds and cooldown gates
    this.checkBandTrigger('sub', subEnergy, nowMs);
    this.checkBandTrigger('mid', midEnergy, nowMs);
    this.checkBandTrigger('treble', trebleEnergy, nowMs);
  }

  private computeEnergy(analyser: AnalyserNode | null, buffer: Uint8Array): number {
    if (!analyser) return 0.0;
    analyser.getByteFrequencyData(buffer as any);
    if (buffer.length === 0) return 0.0;

    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i];
    }
    const avg = sum / buffer.length;
    // Normalize to [0.0, 1.0]
    return Math.max(0.0, Math.min(1.0, avg / 255.0));
  }

  private updateBaseline(band: AudioBand, currentEnergy: number): void {
    const alpha = this.adaptationRate;
    // Asymmetric update: faster drop on quiet, slow creep on sustained sound
    let effectiveAlpha = alpha;
    if (currentEnergy < this.baseline[band]) {
      effectiveAlpha = 0.05; // Quick recovery to silence
    } else {
      effectiveAlpha = alpha; // Slow rise to prevent masking ongoing beats
    }

    const next = this.baseline[band] * (1 - effectiveAlpha) + currentEnergy * effectiveAlpha;
    // Clamp to minimum noise floor barrier
    this.baseline[band] = Math.max(this.minNoiseFloorClamp, next);
  }

  private checkBandTrigger(band: AudioBand, currentEnergy: number, nowMs: number): void {
    const threshold = this.getBandThreshold(band);
    const cooldown = this.cooldowns[band];
    const elapsed = nowMs - this.lastTriggerTime[band];

    // Check if energy crosses threshold AND cooldown gate has elapsed
    if (currentEnergy > threshold && elapsed >= cooldown) {
      this.lastTriggerTime[band] = nowMs;

      // Select station & archetype according to profile
      let archetype: ShellArchetype = 'peony';
      let stations: LaunchStation[] = ['center'];

      if (band === 'sub') {
        archetype = this.currentProfile.subBass.primaryArchetype;
        stations = this.currentProfile.subBass.stations;
      } else if (band === 'mid') {
        archetype = this.currentProfile.mid.primaryArchetype;
        stations = this.currentProfile.mid.stations;
      } else if (band === 'treble') {
        archetype = this.currentProfile.treble.primaryArchetype;
        stations = this.currentProfile.treble.stations;
      }

      const randomStation = stations[Math.floor(Math.random() * stations.length)] || 'center';

      if (this.onTriggerCallback) {
        this.onTriggerCallback({
          band,
          energy: currentEnergy,
          threshold,
          timestamp: nowMs,
          suggestedStation: randomStation,
          suggestedArchetype: archetype,
        });
      }
    }
  }

  public getBandThreshold(band: AudioBand): number {
    if (this.mode === 'fixed') {
      // Fixed sensitivity mode: fixed threshold scaled inversely by sensitivity
      const fixedBase = band === 'sub' ? 0.35 : band === 'mid' ? 0.30 : 0.28;
      const thresh = fixedBase / Math.max(0.1, this.sensitivity[band]);
      return Math.max(0.05, Math.min(0.95, thresh));
    }
    // Auto-Follow mode: adaptive dynamic noise floor tracking
    const thresh = this.baseline[band] * this.sensitivity[band] + this.thresholdOffset[band];
    return Math.max(0.05, Math.min(1.0, thresh));
  }

  public setMode(mode: 'auto' | 'fixed'): void {
    this.mode = mode;
    this.adaptationEnabled = (mode === 'auto');
  }

  public getMode(): 'auto' | 'fixed' {
    return this.mode;
  }

  public getBands(): AudioBands {
    return { ...this.energy };
  }

  public getThresholds(): AudioBands {
    return {
      sub: this.getBandThreshold('sub'),
      mid: this.getBandThreshold('mid'),
      treble: this.getBandThreshold('treble'),
    };
  }

  public getBaselines(): AudioBands {
    return { ...this.baseline };
  }

  public setNoiseFloorAdaptation(enabled: boolean, rate?: number): void {
    this.adaptationEnabled = enabled;
    if (rate !== undefined) {
      this.adaptationRate = Math.max(0.001, Math.min(0.2, rate));
    }
  }

  public setCooldown(band: AudioBand, ms: number): void {
    // Clamped strictly to minimum 50ms safety barrier up to 1000ms
    this.cooldowns[band] = Math.max(50, Math.min(1000, ms));
  }

  public getCooldown(band: AudioBand): number {
    return this.cooldowns[band];
  }

  public setSensitivity(band: AudioBand, sens: number): void {
    this.sensitivity[band] = Math.max(0.1, Math.min(3.0, sens));
  }

  public getSensitivity(band: AudioBand): number {
    return this.sensitivity[band];
  }

  public loadProfile(profileOrKey: AudioReactiveProfile | 'club_edm' | 'ambient' | 'percussive'): void {
    let p: AudioReactiveProfile;
    if (typeof profileOrKey === 'string') {
      p = DEFAULT_PROFILES[profileOrKey] || DEFAULT_PROFILES.club_edm;
    } else {
      p = profileOrKey;
    }

    this.currentProfile = p;
    this.sensitivity.sub = p.subBass.sensitivity;
    this.sensitivity.mid = p.mid.sensitivity;
    this.sensitivity.treble = p.treble.sensitivity;

    this.cooldowns.sub = Math.max(50, p.cooldownMs);
    this.cooldowns.mid = Math.max(50, Math.round(p.cooldownMs * 0.9));
    this.cooldowns.treble = Math.max(50, Math.round(p.cooldownMs * 0.8));

    this.adaptationRate = p.noiseFloorAdaptationRate;

    // Update filter frequencies if filters already exist
    if (this.ctx && this.filterSub) {
      this.filterSub.frequency.setValueAtTime(p.subBass.cutoffHz, this.ctx.currentTime);
    }
    if (this.ctx && this.filterMid) {
      this.filterMid.frequency.setValueAtTime(p.mid.centerHz, this.ctx.currentTime);
    }
    if (this.ctx && this.filterTreble) {
      this.filterTreble.frequency.setValueAtTime(p.treble.cutoffHz, this.ctx.currentTime);
    }
  }

  public getCurrentProfile(): AudioReactiveProfile {
    return this.currentProfile;
  }
}
