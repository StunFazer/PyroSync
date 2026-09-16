export type ShellArchetype =
  | 'peony'
  | 'chrysanthemum'
  | 'willow'
  | 'weeping_willow'
  | 'brocade_crown'
  | 'rings'
  | 'star_shape'
  | 'saturn_ring'
  | 'spiral'
  | 'palm_tree'
  | 'strobe'
  | 'crossette'
  | 'crackle'
  | 'ground_mine'
  | 'whistling_comet'
  | 'horsetail'
  | 'finale_barrage'
  | 'multi_break'
  | 'heart_shape'
  | 'double_ring'
  | 'diamond_shape'
  | 'butterfly';

export type LaunchStation =
  | 'far_left'
  | 'mid_left'
  | 'left_center'
  | 'center'
  | 'right_center'
  | 'mid_right'
  | 'far_right'
  | 'fan'
  | 'left'
  | 'right'; // 'left' and 'right' preserved as backward-compatible aliases

export type AspectRatioType = '16:9' | '16:10' | '4:3' | '21:9' | 'off';

export interface ParticleEngineConfig {
  maxParticles: number; // default 65536
  gain: number; // 0.10 to 2.00, default 1.00
  bloomIntensity: number; // 0.00 to 1.00, default 0.25
  particleSizeScale: number; // 0.40 to 1.50, default 0.90
  burstRadiusScale?: number; // 0.50 to 2.50, default 1.00
  projectionMargin?: number; // 0.05 to 0.25 (5% to 25% safety inset), default 0.10 (10%)
  blackClamp?: number; // legacy backward-compatibility
  aspectRatioMask?: AspectRatioType; // legacy backward-compatibility
  showGuides?: boolean;
}

export interface FireCuePayload {
  id: string;
  archetype: ShellArchetype;
  station: LaunchStation;
  color: string; // hex color e.g. '#ff3366'
  altitude: number; // 0.1 to 1.0 (normalized burst height)
  launchAngle?: number; // degrees offset (-45 to +45)
  duration?: number; // duration in seconds
  seed?: number;
}

export interface ShowCue {
  id: string;
  timeMs: number; // timestamp in milliseconds
  trackId: LaunchStation;
  shellType: ShellArchetype;
  colorPalette: string[];
  altitude: number; // 0.1 to 1.0
  launchAngle: number; // degrees
  durationMs: number;
  label?: string;
}

export interface ShowJSON {
  version: '1.0.0';
  title: string;
  duration: number; // in seconds
  audioTrack?: {
    name: string;
    url?: string;
    proceduralPreset?: 'cosmic_awakening' | 'neon_horizon';
  };
  calibration: ParticleEngineConfig;
  cues: Array<{
    id: string;
    time: number; // timestamp in seconds
    archetype: ShellArchetype;
    station: LaunchStation;
    color: string;
    altitude: number;
    launchAngle?: number;
    duration?: number;
  }>;
}

export type ShowJSONCue = ShowJSON['cues'][number];

export interface ProjectorCalibration {
  masterBrightness: number;
  blackLevelCutoff: number;
  bloomIntensity: number;
  particleSizeScale: number;
  aspectRatio: AspectRatioType;
  showGuides?: boolean;
}

export type BroadcastMessage =
  | { type: 'STATE_SYNC_REQUEST' }
  | { type: 'STATE_SYNC_RESPONSE'; payload: { time: number; isPlaying: boolean; showId: string; calibration: ParticleEngineConfig } }
  | { type: 'TRANSPORT_PLAY'; time: number }
  | { type: 'TRANSPORT_PAUSE'; time: number }
  | { type: 'TRANSPORT_SEEK'; time: number }
  | { type: 'FIRE_CUE'; cue: FireCuePayload }
  | { type: 'PANIC_BLACKOUT' }
  | { type: 'CALIBRATION_UPDATE'; calibration: Partial<ParticleEngineConfig> }
  | { type: 'LOAD_SHOW'; show: ShowJSON }
  | { type: 'PYRO_HELLO'; timestamp: number }
  | { type: 'PYRO_PONG'; timestamp: number; sendTimestamp?: number };

export interface ProjectorConnectionState {
  isConnected: boolean;
  latencyMs: number | null;
  lastHeartbeatTime: number | null;
}

export interface SimulationStats {
  fps: number;
  frameTimeMs: number;
  activeParticles: number;
  maxParticles: number;
  drawCalls: number;
}

export type AudioBand = 'sub' | 'mid' | 'treble';

export interface AudioBands {
  sub: number;
  mid: number;
  treble: number;
}

export type ProceduralSFXType = 'launch' | 'boom' | 'crackle';

export interface AudioReactiveProfile {
  name: 'Club/EDM' | 'Ambient' | 'Percussive';
  subBass: {
    sensitivity: number;
    cutoffHz: number;
    primaryArchetype: ShellArchetype;
    stations: LaunchStation[];
  };
  mid: {
    sensitivity: number;
    centerHz: number;
    primaryArchetype: ShellArchetype;
    stations: LaunchStation[];
  };
  treble: {
    sensitivity: number;
    cutoffHz: number;
    primaryArchetype: ShellArchetype;
    stations: LaunchStation[];
  };
  cooldownMs: number;
  noiseFloorAdaptationRate: number;
}

export interface WaveformPeaks {
  min: Float32Array;
  max: Float32Array;
  duration: number;
  sampleRate: number;
}

export interface AudioTriggerEvent {
  band: AudioBand;
  energy: number;
  threshold: number;
  timestamp: number;
  suggestedStation: LaunchStation;
  suggestedArchetype: ShellArchetype;
}

export interface AudioEngineInterface {
  loadAudio(source: string | File | AudioBuffer): Promise<void>;
  play(startTime?: number): void;
  pause(): void;
  seek(time: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  startMic(): Promise<void>;
  stopMic(): void;
  getBands(): AudioBands;
  getThresholds(): AudioBands;
  setNoiseFloorAdaptation(enabled: boolean, rate: number): void;
  setCooldown(band: AudioBand, ms: number): void;
  playProceduralSFX(type: ProceduralSFXType, volume?: number): void;
  setSFXVolume(volume: number): void;
  setSFXMuted(muted: boolean): void;
}

export type AutoChoreographyDensity = 'low' | 'medium' | 'high' | 'sparse' | 'balanced' | 'intense';

export type PaletteTheme =
  | 'golden_imperial'
  | 'neon_cyberpunk'
  | 'ocean_breeze'
  | 'sunset_fire'
  | 'emerald_forest'
  | 'classic_rainbow'
  | 'patriotic'
  | 'aurora_borealis'
  | 'cosmic_galaxy'
  | 'carnival_fiesta'
  | 'electric_citrus'
  | 'twilight_dusk'
  | 'retro_synth'
  | 'fire_and_ice';

export interface AutoChoreographyOptions {
  density?: AutoChoreographyDensity;
  palette?: string[];
  paletteTheme?: PaletteTheme | 'royal_gold' | 'neon_cyber' | 'rainbow';
  bpm?: number;
  includeGroundMines?: boolean;
  includeSweeps?: boolean;
  climaxSalvo?: boolean;
}

export type MacroBrushType =
  | 'sweep_left_to_right'
  | 'sweep_right_to_left'
  | 'sweep_center_out'
  | 'alternating_mines'
  | 'grand_finale_barrage';

export type VideoResolutionPreset = '1080p' | '720p' | 'native';

