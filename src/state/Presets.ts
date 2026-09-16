/**
 * PyroSync Preset Shows and Audio-Reactive Profiles
 * Conforming to PROJECT.md §R5, §101-103
 */

import { ShowJSON, AudioReactiveProfile } from '../types';

/**
 * Demo Show 1: "Cosmic Awakening" ("Ode to Radiance")
 * 90-second orchestral/cinematic pyromusical show across 4 movements (96 BPM).
 */
export const DEMO_SHOW_COSMIC_AWAKENING: ShowJSON = {
  version: '1.0.0',
  title: 'Cosmic Awakening',
  duration: 90.0,
  audioTrack: {
    name: 'Cosmic Awakening (Cinematic Orchestral)',
    proceduralPreset: 'cosmic_awakening',
  },
  calibration: {
    maxParticles: 65536,
    blackClamp: 0.02,
    gain: 1.0,
    bloomIntensity: 1.2,
    particleSizeScale: 1.0,
    aspectRatioMask: '16:9',
  },
  cues: [
    // Movement 1: Introduction (0.0s - 25.0s) - Ambient & Cascading
    { id: 'cue-001', time: 1.0, archetype: 'horsetail', station: 'center', color: '#ffd700', altitude: 0.85, launchAngle: 0.0, duration: 4.5 },
    { id: 'cue-002', time: 4.5, archetype: 'willow', station: 'left_center', color: '#ffffff', altitude: 0.80, launchAngle: -0.1, duration: 5.0 },
    { id: 'cue-003', time: 4.5, archetype: 'willow', station: 'right_center', color: '#ffffff', altitude: 0.80, launchAngle: 0.1, duration: 5.0 },
    { id: 'cue-004', time: 9.0, archetype: 'peony', station: 'center', color: '#3b82f6', altitude: 0.75, launchAngle: 0.0, duration: 2.2 },
    { id: 'cue-005', time: 13.5, archetype: 'chrysanthemum', station: 'left', color: '#f59e0b', altitude: 0.70, launchAngle: 0.2, duration: 3.0 },
    { id: 'cue-006', time: 13.5, archetype: 'chrysanthemum', station: 'right', color: '#f59e0b', altitude: 0.70, launchAngle: -0.2, duration: 3.0 },
    { id: 'cue-007', time: 18.0, archetype: 'rings', station: 'center', color: '#ec4899', altitude: 0.85, launchAngle: 0.0, duration: 2.5 },
    { id: 'cue-008', time: 22.0, archetype: 'strobe', station: 'center', color: '#ffffff', altitude: 0.80, launchAngle: 0.0, duration: 3.0 },

    // Movement 2: Build-up (25.0s - 50.0s) - Rhythmic comets & mines
    { id: 'cue-009', time: 25.0, archetype: 'whistling_comet', station: 'left', color: '#10b981', altitude: 0.90, launchAngle: 0.15, duration: 2.8 },
    { id: 'cue-010', time: 26.5, archetype: 'whistling_comet', station: 'right', color: '#10b981', altitude: 0.90, launchAngle: -0.15, duration: 2.8 },
    { id: 'cue-011', time: 28.0, archetype: 'ground_mine', station: 'left', color: '#ef4444', altitude: 0.45, launchAngle: 0.1, duration: 1.8 },
    { id: 'cue-012', time: 28.5, archetype: 'ground_mine', station: 'right', color: '#ef4444', altitude: 0.45, launchAngle: -0.1, duration: 1.8 },
    { id: 'cue-013', time: 31.0, archetype: 'crossette', station: 'left_center', color: '#8b5cf6', altitude: 0.80, launchAngle: 0.0, duration: 2.5 },
    { id: 'cue-014', time: 31.0, archetype: 'crossette', station: 'right_center', color: '#8b5cf6', altitude: 0.80, launchAngle: 0.0, duration: 2.5 },
    { id: 'cue-015', time: 36.0, archetype: 'crackle', station: 'center', color: '#ffd700', altitude: 0.85, launchAngle: 0.0, duration: 2.8 },
    { id: 'cue-016', time: 40.0, archetype: 'brocade_crown', station: 'center', color: '#fbbf24', altitude: 0.90, launchAngle: 0.0, duration: 4.0 },
    { id: 'cue-017', time: 44.0, archetype: 'peony', station: 'left', color: '#06b6d4', altitude: 0.75, launchAngle: 0.2, duration: 2.2 },
    { id: 'cue-018', time: 44.5, archetype: 'peony', station: 'right', color: '#06b6d4', altitude: 0.75, launchAngle: -0.2, duration: 2.2 },
    { id: 'cue-019', time: 48.0, archetype: 'ground_mine', station: 'left_center', color: '#f97316', altitude: 0.50, launchAngle: 0.0, duration: 1.8 },
    { id: 'cue-020', time: 48.0, archetype: 'ground_mine', station: 'right_center', color: '#f97316', altitude: 0.50, launchAngle: 0.0, duration: 1.8 },

    // Movement 3: Apex & Drop (50.0s - 75.0s) - Fan Sweeps & Layered Shells
    { id: 'cue-021', time: 50.0, archetype: 'peony', station: 'fan', color: '#ef4444', altitude: 0.80, launchAngle: 0.0, duration: 2.5 },
    { id: 'cue-022', time: 53.0, archetype: 'rings', station: 'left', color: '#a855f7', altitude: 0.75, launchAngle: 0.1, duration: 2.5 },
    { id: 'cue-023', time: 53.0, archetype: 'rings', station: 'right', color: '#a855f7', altitude: 0.75, launchAngle: -0.1, duration: 2.5 },
    { id: 'cue-024', time: 57.0, archetype: 'strobe', station: 'center', color: '#ffffff', altitude: 0.85, launchAngle: 0.0, duration: 3.2 },
    { id: 'cue-025', time: 61.0, archetype: 'crossette', station: 'fan', color: '#22c55e', altitude: 0.85, launchAngle: 0.0, duration: 2.6 },
    { id: 'cue-026', time: 65.0, archetype: 'crackle', station: 'left_center', color: '#f59e0b', altitude: 0.80, launchAngle: 0.0, duration: 2.8 },
    { id: 'cue-027', time: 65.0, archetype: 'crackle', station: 'right_center', color: '#f59e0b', altitude: 0.80, launchAngle: 0.0, duration: 2.8 },
    { id: 'cue-028', time: 70.0, archetype: 'brocade_crown', station: 'center', color: '#ffd700', altitude: 0.95, launchAngle: 0.0, duration: 4.5 },

    // Movement 4: Grand Finale (75.0s - 90.0s) - Massive Multi-Station Barrage
    { id: 'cue-029', time: 75.0, archetype: 'ground_mine', station: 'fan', color: '#f43f5e', altitude: 0.60, launchAngle: 0.0, duration: 2.0 },
    { id: 'cue-030', time: 78.0, archetype: 'whistling_comet', station: 'left', color: '#38bdf8', altitude: 0.90, launchAngle: 0.25, duration: 2.5 },
    { id: 'cue-031', time: 78.0, archetype: 'whistling_comet', station: 'right', color: '#38bdf8', altitude: 0.90, launchAngle: -0.25, duration: 2.5 },
    { id: 'cue-032', time: 80.0, archetype: 'chrysanthemum', station: 'left_center', color: '#fbbf24', altitude: 0.85, launchAngle: 0.0, duration: 3.5 },
    { id: 'cue-033', time: 80.0, archetype: 'chrysanthemum', station: 'right_center', color: '#fbbf24', altitude: 0.85, launchAngle: 0.0, duration: 3.5 },
    { id: 'cue-034', time: 83.0, archetype: 'crackle', station: 'center', color: '#ffffff', altitude: 0.90, launchAngle: 0.0, duration: 3.0 },
    { id: 'cue-035', time: 85.0, archetype: 'finale_barrage', station: 'fan', color: '#ffd700', altitude: 0.95, launchAngle: 0.0, duration: 5.0 },
  ],
};

export const DEMO_SHOW_1_ODE_TO_RADIANCE: ShowJSON = DEMO_SHOW_COSMIC_AWAKENING;

/**
 * Demo Show 2: "Neon Horizon"
 * 75-second synthwave pyromusical show synchronized to 128 BPM grid (~0.46875s/beat).
 */
export const DEMO_SHOW_NEON_HORIZON: ShowJSON = {
  version: '1.0.0',
  title: 'Neon Horizon',
  duration: 75.0,
  audioTrack: {
    name: 'Neon Horizon (128 BPM Synthwave)',
    proceduralPreset: 'neon_horizon',
  },
  calibration: {
    maxParticles: 65536,
    blackClamp: 0.03,
    gain: 1.2,
    bloomIntensity: 1.5,
    particleSizeScale: 1.1,
    aspectRatioMask: '21:9',
  },
  cues: [
    { id: 'nh-001', time: 0.0, archetype: 'ground_mine', station: 'left', color: '#06b6d4', altitude: 0.40, duration: 1.5 },
    { id: 'nh-002', time: 0.9375, archetype: 'ground_mine', station: 'right', color: '#f43f5e', altitude: 0.40, duration: 1.5 },
    { id: 'nh-003', time: 1.875, archetype: 'ground_mine', station: 'left_center', color: '#06b6d4', altitude: 0.45, duration: 1.5 },
    { id: 'nh-004', time: 2.8125, archetype: 'ground_mine', station: 'right_center', color: '#f43f5e', altitude: 0.45, duration: 1.5 },
    { id: 'nh-005', time: 3.75, archetype: 'peony', station: 'center', color: '#d946ef', altitude: 0.80, duration: 2.0 },
    { id: 'nh-006', time: 7.5, archetype: 'strobe', station: 'center', color: '#ffffff', altitude: 0.85, duration: 2.5 },
    { id: 'nh-007', time: 11.25, archetype: 'crossette', station: 'left', color: '#06b6d4', altitude: 0.75, duration: 2.2 },
    { id: 'nh-008', time: 11.25, archetype: 'crossette', station: 'right', color: '#f43f5e', altitude: 0.75, duration: 2.2 },
    { id: 'nh-009', time: 15.0, archetype: 'rings', station: 'center', color: '#e11d48', altitude: 0.85, duration: 2.5 },
    { id: 'nh-010', time: 20.0, archetype: 'whistling_comet', station: 'left', color: '#10b981', altitude: 0.90, duration: 2.8 },
    { id: 'nh-011', time: 20.0, archetype: 'whistling_comet', station: 'right', color: '#10b981', altitude: 0.90, duration: 2.8 },
    { id: 'nh-012', time: 25.0, archetype: 'crackle', station: 'center', color: '#facc15', altitude: 0.85, duration: 2.6 },
    { id: 'nh-013', time: 30.0, archetype: 'brocade_crown', station: 'fan', color: '#fbbf24', altitude: 0.90, duration: 3.5 },
    { id: 'nh-014', time: 45.0, archetype: 'willow', station: 'center', color: '#38bdf8', altitude: 0.80, duration: 4.5 },
    { id: 'nh-015', time: 60.0, archetype: 'finale_barrage', station: 'fan', color: '#ec4899', altitude: 0.95, duration: 6.0 },
  ],
};

export const DEMO_SHOW_2_NEON_HORIZON: ShowJSON = DEMO_SHOW_NEON_HORIZON;

export const PRESET_SHOWS: Record<string, ShowJSON> = {
  cosmic_awakening: DEMO_SHOW_COSMIC_AWAKENING,
  ode_to_radiance: DEMO_SHOW_COSMIC_AWAKENING,
  neon_horizon: DEMO_SHOW_NEON_HORIZON,
};

export const AUDIO_REACTIVE_PROFILES: Record<string, AudioReactiveProfile> = {
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

export function getDemoShow(id: string): ShowJSON | undefined {
  return PRESET_SHOWS[id];
}

export function getAudioProfile(id: string): AudioReactiveProfile | undefined {
  return AUDIO_REACTIVE_PROFILES[id];
}
