/**
 * Corrupted and Boundary Show JSON Fixtures
 * For validating robustness, error handling, and schema sanitization
 */

export const CORRUPTED_SHOWS = {
  // Completely invalid JSON syntax string
  malformedJsonString: '{"title": "Broken", "cues": [ { "id": "1", "time": 0.0, } ]}',

  // Missing version field
  missingVersion: {
    title: 'Missing Version Show',
    duration: 60.0,
    calibration: { maxParticles: 65536, blackClamp: 0.02, gain: 1.0, bloomIntensity: 1.2, particleSizeScale: 1.0, aspectRatioMask: '16:9' },
    cues: [],
  },

  // Unsupported version
  unsupportedVersion: {
    version: '99.0.0',
    title: 'Future Version',
    duration: 60.0,
    calibration: { maxParticles: 65536, blackClamp: 0.02, gain: 1.0, bloomIntensity: 1.2, particleSizeScale: 1.0, aspectRatioMask: '16:9' },
    cues: [],
  },

  // Missing cues array
  missingCues: {
    version: '1.0.0',
    title: 'No Cues',
    duration: 30.0,
    calibration: { maxParticles: 65536, blackClamp: 0.02, gain: 1.0, bloomIntensity: 1.2, particleSizeScale: 1.0, aspectRatioMask: '16:9' },
  },

  // Non-array cues
  cuesNotArray: {
    version: '1.0.0',
    title: 'Cues Object Not Array',
    duration: 30.0,
    calibration: { maxParticles: 65536, blackClamp: 0.02, gain: 1.0, bloomIntensity: 1.2, particleSizeScale: 1.0, aspectRatioMask: '16:9' },
    cues: { '0': { id: 'c1', time: 1.0 } },
  },

  // Invalid timestamp: NaN or negative
  invalidTimestamps: {
    version: '1.0.0',
    title: 'Negative & NaN Times',
    duration: 60.0,
    calibration: { maxParticles: 65536, blackClamp: 0.02, gain: 1.0, bloomIntensity: 1.2, particleSizeScale: 1.0, aspectRatioMask: '16:9' },
    cues: [
      { id: 'c-neg', time: -5.0, archetype: 'peony', station: 'center', color: '#ff0000', altitude: 0.8 },
      { id: 'c-nan', time: NaN, archetype: 'willow', station: 'left', color: '#ffd700', altitude: 0.8 },
      { id: 'c-inf', time: Infinity, archetype: 'rings', station: 'right', color: '#00ff00', altitude: 0.8 },
    ],
  },

  // Unknown shell archetypes (should fall back to peony)
  unknownArchetypes: {
    version: '1.0.0',
    title: 'Unknown Archetypes',
    duration: 45.0,
    calibration: { maxParticles: 65536, blackClamp: 0.02, gain: 1.0, bloomIntensity: 1.2, particleSizeScale: 1.0, aspectRatioMask: '16:9' },
    cues: [
      { id: 'c-alien1', time: 2.0, archetype: 'quantum_singularity', station: 'center', color: '#ff00ff', altitude: 0.8 },
      { id: 'c-alien2', time: 5.0, archetype: 'supernova_plasma', station: 'fan', color: '#00ffff', altitude: 0.9 },
    ],
  },

  // Out of bounds calibration numbers
  extremeCalibration: {
    version: '1.0.0',
    title: 'Extreme Calibration',
    duration: 60.0,
    calibration: {
      maxParticles: -500,
      blackClamp: 0.95, // Above 0.20 clamp max
      gain: -2.0,       // Below 0.10 gain min
      bloomIntensity: 999.0,
      particleSizeScale: 0.01,
      aspectRatioMask: 'invalid_aspect',
    },
    cues: [],
  },

  // Empty show (valid structure, 0 duration, 0 cues)
  emptyShow: {
    version: '1.0.0',
    title: 'Empty Show',
    duration: 0.0,
    calibration: { maxParticles: 65536, blackClamp: 0.02, gain: 1.0, bloomIntensity: 1.2, particleSizeScale: 1.0, aspectRatioMask: 'off' },
    cues: [],
  },
};
