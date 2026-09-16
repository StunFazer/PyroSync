/**
 * Live Audio-Reactive Profiles Fixtures
 * Per ORIGINAL_REQUEST.md §R5 and spec_report.md §8.2
 */

export interface AudioReactiveProfile {
  name: 'Club/EDM' | 'Ambient' | 'Percussive';
  subBass: {
    sensitivity: number;
    cutoffHz: number;
    primaryArchetype: string;
    stations: string[];
  };
  mid: {
    sensitivity: number;
    centerHz: number;
    primaryArchetype: string;
    stations: string[];
  };
  treble: {
    sensitivity: number;
    cutoffHz: number;
    primaryArchetype: string;
    stations: string[];
  };
  cooldownMs: number;
  noiseFloorAdaptationRate: number;
}

export const AUDIO_REACTIVE_PROFILES: Record<string, AudioReactiveProfile> = {
  'club_edm': {
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

  'ambient': {
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

  'percussive': {
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
