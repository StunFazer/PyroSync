import {
  ShowJSON,
  ShowJSONCue,
  ShellArchetype,
  LaunchStation,
  ParticleEngineConfig,
  AspectRatioType,
} from '../types';

export const VALID_ARCHETYPES: Set<ShellArchetype> = new Set([
  'peony',
  'chrysanthemum',
  'willow',
  'weeping_willow',
  'brocade_crown',
  'rings',
  'star_shape',
  'saturn_ring',
  'spiral',
  'palm_tree',
  'strobe',
  'crossette',
  'crackle',
  'ground_mine',
  'whistling_comet',
  'horsetail',
  'finale_barrage',
  'multi_break',
  'heart_shape',
  'double_ring',
  'diamond_shape',
  'butterfly',
]);

export const VALID_STATIONS: Set<LaunchStation> = new Set([
  'far_left',
  'mid_left',
  'left_center',
  'center',
  'right_center',
  'mid_right',
  'far_right',
  'fan',
  'left',
  'right',
]);

export const DEFAULT_CALIBRATION: ParticleEngineConfig = {
  maxParticles: 65536,
  blackClamp: 0.02,
  gain: 1.0,
  bloomIntensity: 0.25,
  particleSizeScale: 0.90,
  burstRadiusScale: 1.0,
  projectionMargin: 0.10, // 10% default safe margin
  aspectRatioMask: 'off',
  showGuides: false,
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ImportResult {
  success: boolean;
  show?: ShowJSON;
  errors: string[];
}

/**
 * Validates a raw show object against the ShowJSON v1.0.0 schema.
 */
export function validateShowJSON(raw: any): ValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, errors: ['Show must be an object'] };
  }

  if (raw.version !== '1.0.0') {
    errors.push(`Invalid version: expected 1.0.0, got ${raw.version}`);
  }

  if (typeof raw.title !== 'string' || !raw.title.trim()) {
    errors.push('Show title is required');
  }

  if (typeof raw.duration !== 'number' || isNaN(raw.duration) || raw.duration < 0) {
    errors.push('Show duration must be a non-negative number');
  }

  if (!Array.isArray(raw.cues)) {
    errors.push('Show cues must be an array');
  } else {
    for (let i = 0; i < raw.cues.length; i++) {
      const c = raw.cues[i];
      if (!c || typeof c !== 'object') {
        errors.push(`Cue[${i}] must be an object`);
        continue;
      }
      if (typeof c.time !== 'number' || isNaN(c.time) || c.time < 0) {
        errors.push(`Cue[${i}] invalid timecode: ${c.time}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Sanitizes and normalizes an imported ShowJSON object, applying safe defaults.
 */
export function sanitizeShowJSON(raw: any): ShowJSON {
  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'Untitled Show';
  const duration = typeof raw.duration === 'number' && !isNaN(raw.duration) && raw.duration >= 0 ? raw.duration : 60.0;

  // Sanitize calibration
  const rawCal = raw.calibration || {};
  const calibration: ParticleEngineConfig = {
    maxParticles: typeof rawCal.maxParticles === 'number' && !isNaN(rawCal.maxParticles)
      ? Math.max(1024, Math.min(131072, rawCal.maxParticles))
      : DEFAULT_CALIBRATION.maxParticles,
    blackClamp: typeof rawCal.blackClamp === 'number' && !isNaN(rawCal.blackClamp)
      ? Math.max(0.0, Math.min(0.2, rawCal.blackClamp))
      : DEFAULT_CALIBRATION.blackClamp,
    gain: typeof rawCal.gain === 'number' && !isNaN(rawCal.gain)
      ? Math.max(0.1, Math.min(3.0, rawCal.gain))
      : DEFAULT_CALIBRATION.gain,
    bloomIntensity: typeof rawCal.bloomIntensity === 'number' && !isNaN(rawCal.bloomIntensity)
      ? Math.max(0.0, Math.min(3.0, rawCal.bloomIntensity))
      : DEFAULT_CALIBRATION.bloomIntensity,
    particleSizeScale: typeof rawCal.particleSizeScale === 'number' && !isNaN(rawCal.particleSizeScale)
      ? Math.max(0.5, Math.min(4.0, rawCal.particleSizeScale))
      : DEFAULT_CALIBRATION.particleSizeScale,
    aspectRatioMask: (['16:9', '16:10', '4:3', '21:9', 'off'].includes(rawCal.aspectRatioMask)
      ? rawCal.aspectRatioMask
      : DEFAULT_CALIBRATION.aspectRatioMask) as AspectRatioType,
    showGuides: Boolean(rawCal.showGuides),
  };

  // Sanitize audioTrack
  let audioTrack: ShowJSON['audioTrack'] = undefined;
  if (raw.audioTrack && typeof raw.audioTrack === 'object') {
    audioTrack = {
      name: typeof raw.audioTrack.name === 'string' ? raw.audioTrack.name : 'Audio Track',
      url: typeof raw.audioTrack.url === 'string' ? raw.audioTrack.url : undefined,
      proceduralPreset: ['cosmic_awakening', 'neon_horizon'].includes(raw.audioTrack.proceduralPreset)
        ? raw.audioTrack.proceduralPreset
        : undefined,
    };
  }

  // Sanitize cues
  const rawCues = Array.isArray(raw.cues) ? raw.cues : [];
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;

  const cues: ShowJSONCue[] = rawCues
    .filter((c: any) => c && typeof c === 'object' && typeof c.time === 'number' && !isNaN(c.time) && c.time >= 0)
    .map((c: any, idx: number) => {
      const id = typeof c.id === 'string' && c.id ? c.id : `cue_${idx + 1}_${Date.now()}`;
      const time = Number(c.time);
      const archetype: ShellArchetype = VALID_ARCHETYPES.has(c.archetype) ? c.archetype : 'peony';
      let station: LaunchStation = VALID_STATIONS.has(c.station) ? c.station : 'center';
      // Automatic backward compatibility: remap legacy 'left'/'right' to 8-station equivalent
      if (station === 'left') station = 'far_left';
      if (station === 'right') station = 'far_right';
      const color = typeof c.color === 'string' && hexRegex.test(c.color) ? c.color : '#ffd700';
      const altitude = typeof c.altitude === 'number' && !isNaN(c.altitude)
        ? Math.max(0.1, Math.min(1.0, c.altitude))
        : 0.8;
      const launchAngle = typeof c.launchAngle === 'number' && !isNaN(c.launchAngle)
        ? Math.max(-45, Math.min(45, c.launchAngle))
        : 0.0;
      const duration = typeof c.duration === 'number' && !isNaN(c.duration) && c.duration > 0
        ? Math.max(0.5, Math.min(10.0, c.duration))
        : 2.2;

      return {
        id,
        time,
        archetype,
        station,
        color,
        altitude,
        launchAngle,
        duration,
      };
    })
    .sort((a: ShowJSONCue, b: ShowJSONCue) => a.time - b.time);

  return {
    version: '1.0.0',
    title,
    duration,
    audioTrack,
    calibration,
    cues,
  };
}

/**
 * Portable Show JSON Serialization & Deserialization Engine
 */
export class ShowSerialization {
  public static sanitizeShowJSON(raw: any): ShowJSON {
    return sanitizeShowJSON(raw);
  }

  /**
   * Serializes a ShowJSON object into a formatted JSON string.
   */
  public static exportToJSON(show: ShowJSON, pretty: boolean = true): string {
    const validation = validateShowJSON(show);
    if (!validation.valid) {
      throw new Error(`Cannot export invalid show: ${validation.errors.join(', ')}`);
    }

    return pretty ? JSON.stringify(show, null, 2) : JSON.stringify(show);
  }

  /**
   * Deserializes and validates a JSON string into a sanitized ShowJSON object.
   */
  public static importFromJSON(jsonString: string): ImportResult {
    let raw: any;
    try {
      raw = JSON.parse(jsonString);
    } catch (err: any) {
      return {
        success: false,
        errors: [`Malformed JSON: ${err?.message || 'Invalid JSON syntax'}`],
      };
    }

    const validation = validateShowJSON(raw);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    try {
      const show = sanitizeShowJSON(raw);
      return {
        success: true,
        show,
        errors: [],
      };
    } catch (err: any) {
      return {
        success: false,
        errors: [`Failed to sanitize show: ${err?.message || 'Unknown error'}`],
      };
    }
  }

  /**
   * Triggers a browser file download of the show JSON.
   */
  public static downloadShowFile(show: ShowJSON, filename?: string): void {
    if (typeof document === 'undefined') return;

    const jsonStr = this.exportToJSON(show, true);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const safeTitle = (show.title || 'show').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const actualFilename = filename || `${safeTitle}.pyro.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = actualFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Reads and parses a File object uploaded by user.
   */
  public static async readShowFile(file: File): Promise<ShowJSON> {
    const text = await file.text();
    const result = this.importFromJSON(text);
    if (!result.success || !result.show) {
      throw new Error(result.errors.join('; '));
    }
    return result.show;
  }
}
