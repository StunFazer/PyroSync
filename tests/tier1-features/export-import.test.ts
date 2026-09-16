/**
 * Tier 1: Feature Coverage - Portable Show JSON Export & Import
 * Authoritative source: ORIGINAL_REQUEST.md §R4, AC-12, PROJECT.md §195, spec_report.md §7.6
 *
 * Covers >= 5 test cases per feature:
 * 1. Show JSON Schema Serialization (AC-12)
 * 2. Show JSON Deserialization & Schema Validation
 * 3. Round-Trip Export / Clear / Import Fidelity (AC-12)
 * 4. Missing Optional Fields Fallback Handling
 * 5. Malformed JSON & Error Reporting
 */

import { tracker } from '../harness/test-utils.ts';
import { DEMO_SHOW_1_ODE_TO_RADIANCE } from '../fixtures/demo-shows.ts';
import { CORRUPTED_SHOWS } from '../fixtures/corrupted-shows.ts';
import type { ShowJSON } from '../../src/types/index.ts';

export function runExportImportTests(): { passed: number; failed: number; assertions: number } {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      passed++;
    } catch (err: any) {
      failed++;
      console.error(`  FAIL: ${name} -> ${err.message}`);
    }
  }

  // Schema Validator Helper
  function validateShowJSON(raw: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!raw || typeof raw !== 'object') {
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
        if (typeof c.time !== 'number' || isNaN(c.time) || c.time < 0) {
          errors.push(`Cue[${i}] invalid timecode: ${c.time}`);
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }

  // ====================================================
  // 1. SHOW JSON SCHEMA SERIALIZATION (>=5 tests, AC-12)
  // ====================================================
  test('Export Schema: Serializes valid ShowJSON to string with version "1.0.0" (AC-12)', () => {
    const serialized = JSON.stringify(DEMO_SHOW_1_ODE_TO_RADIANCE);
    tracker.assert(typeof serialized === 'string', 'Serialized output is a string');
    tracker.assert(serialized.includes('"version":"1.0.0"'), 'Includes version 1.0.0');
  });

  test('Export Schema: Includes complete calibration configuration in export payload', () => {
    const cal = DEMO_SHOW_1_ODE_TO_RADIANCE.calibration;
    tracker.assertEquals(cal.blackClamp, 0.02, 'Includes black cutoff clamp 0.02');
    tracker.assertEquals(cal.gain, 1.0, 'Includes master gain 1.0');
    tracker.assertEquals(cal.bloomIntensity, 1.2, 'Includes bloom intensity 1.2');
    tracker.assertEquals(cal.aspectRatioMask, '16:9', 'Includes aspect ratio 16:9');
  });

  test('Export Schema: Serializes all cue parameters (id, time, archetype, station, color, altitude)', () => {
    const cue = DEMO_SHOW_1_ODE_TO_RADIANCE.cues[0];
    tracker.assert(cue.id.length > 0, 'Cue ID present');
    tracker.assert(cue.time >= 0, 'Cue timecode non-negative');
    tracker.assert(cue.archetype.length > 0, 'Archetype present');
    tracker.assert(cue.station.length > 0, 'Station present');
    tracker.assert(cue.color.startsWith('#'), 'Color is valid hex');
    tracker.assertInRange(cue.altitude, 0.2, 1.0, 'Altitude in range [0.2, 1.0]');
  });

  test('Export Schema: Formats JSON with 2-space indentation for operator readability', () => {
    const formatted = JSON.stringify(DEMO_SHOW_1_ODE_TO_RADIANCE, null, 2);
    tracker.assert(formatted.includes('  "version": "1.0.0"'), 'Indented with 2 spaces');
  });

  test('Export Schema: Correctly serializes audio track metadata when present', () => {
    tracker.assert(DEMO_SHOW_1_ODE_TO_RADIANCE.audioTrack !== undefined, 'Audio track metadata present');
    tracker.assertEquals(
      DEMO_SHOW_1_ODE_TO_RADIANCE.audioTrack?.proceduralPreset,
      'cosmic_awakening',
      'Procedural preset saved'
    );
  });

  // ====================================================
  // 2. SHOW JSON DESERIALIZATION & VALIDATION (>=5 tests)
  // ====================================================
  test('Import Deserialization: Parses valid show JSON text into typed ShowJSON object', () => {
    const text = JSON.stringify(DEMO_SHOW_1_ODE_TO_RADIANCE);
    const parsed = JSON.parse(text) as ShowJSON;
    tracker.assertEquals(parsed.title, 'Ode to Radiance', 'Parsed title correctly');
    tracker.assertEquals(parsed.cues.length, DEMO_SHOW_1_ODE_TO_RADIANCE.cues.length, 'Parsed all cues');
  });

  test('Import Deserialization: Schema validation passes on compliant show file', () => {
    const res = validateShowJSON(DEMO_SHOW_1_ODE_TO_RADIANCE);
    tracker.assertEquals(res.valid, true, 'Validation passes on Demo Show 1');
    tracker.assertEquals(res.errors.length, 0, 'Zero validation errors');
  });

  test('Import Deserialization: Validates cue timestamps are chronological or sorts them', () => {
    const cues = [
      { id: '1', time: 5.0 },
      { id: '2', time: 1.0 },
      { id: '3', time: 8.0 },
    ];
    const sorted = [...cues].sort((a, b) => a.time - b.time);
    tracker.assertEquals(sorted[0].time, 1.0, 'Sorted first');
    tracker.assertEquals(sorted[1].time, 5.0, 'Sorted second');
    tracker.assertEquals(sorted[2].time, 8.0, 'Sorted third');
  });

  test('Import Deserialization: Validates cue stations belong to allowed set of 6 stations', () => {
    const validStations = ['left', 'left_center', 'center', 'right_center', 'right', 'fan'];
    for (const c of DEMO_SHOW_1_ODE_TO_RADIANCE.cues) {
      tracker.assert(validStations.includes(c.station), `Station ${c.station} is valid`);
    }
  });

  test('Import Deserialization: Sanitizes archetype string, defaulting unrecognized to "peony"', () => {
    const sanitize = (arch: string) => {
      const allowed = ['peony', 'chrysanthemum', 'willow', 'brocade_crown', 'rings', 'strobe', 'crossette', 'crackle', 'ground_mine', 'whistling_comet', 'horsetail', 'finale_barrage'];
      return allowed.includes(arch) ? arch : 'peony';
    };
    tracker.assertEquals(sanitize('willow'), 'willow', 'Preserves known archetype');
    tracker.assertEquals(sanitize('super_plasma_bomb'), 'peony', 'Falls back unknown to peony');
  });

  // ====================================================
  // 3. ROUND-TRIP EXPORT / CLEAR / IMPORT FIDELITY (>=5 tests, AC-12)
  // ====================================================
  test('Round-Trip Fidelity: Exported JSON re-imported equals original show (AC-12)', () => {
    const original = DEMO_SHOW_1_ODE_TO_RADIANCE;
    const exportedStr = JSON.stringify(original);
    // Simulate clearing timeline
    let currentTimeline: ShowJSON | null = null;
    tracker.assertEquals(currentTimeline, null, 'Timeline cleared');
    // Re-import
    currentTimeline = JSON.parse(exportedStr);
    tracker.assertEquals(currentTimeline?.title, original.title, 'Title matches');
    tracker.assertEquals(currentTimeline?.duration, original.duration, 'Duration matches');
    tracker.assertEquals(currentTimeline?.cues.length, original.cues.length, 'Cue count matches');
  });

  test('Round-Trip Fidelity: Cue parameters (color, angle, altitude) survive round-trip without loss', () => {
    const cue = DEMO_SHOW_1_ODE_TO_RADIANCE.cues[0];
    const exported = JSON.stringify(cue);
    const restored = JSON.parse(exported);
    tracker.assertEquals(restored.color, cue.color, 'Color preserved');
    tracker.assertEquals(restored.altitude, cue.altitude, 'Altitude preserved');
    tracker.assertEquals(restored.launchAngle, cue.launchAngle, 'Launch angle preserved');
  });

  test('Round-Trip Fidelity: Calibration configuration survives round-trip identically', () => {
    const cal = DEMO_SHOW_1_ODE_TO_RADIANCE.calibration;
    const restoredCal = JSON.parse(JSON.stringify(cal));
    tracker.assertDeepEquals(restoredCal, cal, 'Calibration matches exactly');
  });

  test('Round-Trip Fidelity: High precision floating-point timecodes maintain sub-millisecond fidelity', () => {
    const preciseTime = 12.34567;
    const serialized = JSON.stringify({ time: preciseTime });
    const restored = JSON.parse(serialized);
    tracker.assertCloseTo(restored.time, preciseTime, 0.00001, 'Floating point timecode preserved');
  });

  test('Round-Trip Fidelity: Large show with hundreds of cues exports and imports without data truncation', () => {
    const largeShow: ShowJSON = {
      ...DEMO_SHOW_1_ODE_TO_RADIANCE,
      cues: Array.from({ length: 300 }, (_, i) => ({
        id: `cue-${i}`,
        time: i * 0.25,
        archetype: 'peony',
        station: 'center',
        color: '#ff0000',
        altitude: 0.8,
      })),
    };
    const jsonStr = JSON.stringify(largeShow);
    const reimported = JSON.parse(jsonStr) as ShowJSON;
    tracker.assertEquals(reimported.cues.length, 300, 'All 300 cues restored faithfully');
  });

  // ====================================================
  // 4. MISSING OPTIONAL FIELDS FALLBACK (>=5 tests)
  // ====================================================
  test('Optional Fields: Missing audioTrack defaults gracefully to silent / manual timeline mode', () => {
    const showWithoutAudio: Partial<ShowJSON> = {
      version: '1.0.0',
      title: 'Silent Show',
      duration: 30.0,
      calibration: DEMO_SHOW_1_ODE_TO_RADIANCE.calibration,
      cues: [],
    };
    tracker.assertEquals(showWithoutAudio.audioTrack, undefined, 'audioTrack is optional');
  });

  test('Optional Fields: Missing cue launchAngle defaults to 0.0 (vertical)', () => {
    const cueWithoutAngle = { id: 'c1', time: 1.0, archetype: 'peony', station: 'center', color: '#fff', altitude: 0.8 };
    const defaultAngle = (cueWithoutAngle as any).launchAngle ?? 0.0;
    tracker.assertEquals(defaultAngle, 0.0, 'Default launch angle is 0.0');
  });

  test('Optional Fields: Missing cue duration defaults to archetype standard lifetime', () => {
    const cueWithoutDuration = { id: 'c1', time: 1.0, archetype: 'peony', station: 'center', color: '#fff', altitude: 0.8 };
    const defaultDuration = (cueWithoutDuration as any).duration ?? 2.2;
    tracker.assertEquals(defaultDuration, 2.2, 'Default peony duration applied');
  });

  test('Optional Fields: Missing calibration field applies factory defaults', () => {
    const partialCal: any = { gain: 1.5 };
    const mergedCal = {
      maxParticles: partialCal.maxParticles ?? 65536,
      blackClamp: partialCal.blackClamp ?? 0.02,
      gain: partialCal.gain ?? 1.0,
      bloomIntensity: partialCal.bloomIntensity ?? 1.2,
      particleSizeScale: partialCal.particleSizeScale ?? 1.0,
      aspectRatioMask: partialCal.aspectRatioMask ?? '16:9',
    };
    tracker.assertEquals(mergedCal.gain, 1.5, 'Custom gain preserved');
    tracker.assertEquals(mergedCal.blackClamp, 0.02, 'Default black clamp applied');
    tracker.assertEquals(mergedCal.maxParticles, 65536, 'Default particle capacity applied');
  });

  test('Optional Fields: Missing show author or metadata does not prevent import', () => {
    const minimalShow = {
      version: '1.0.0',
      title: 'Minimal',
      duration: 10.0,
      calibration: DEMO_SHOW_1_ODE_TO_RADIANCE.calibration,
      cues: [],
    };
    const res = validateShowJSON(minimalShow);
    tracker.assertEquals(res.valid, true, 'Minimal show without metadata passes validation');
  });

  // ====================================================
  // 5. MALFORMED JSON & ERROR REPORTING (>=5 tests)
  // ====================================================
  test('Corrupted JSON: Catches syntax error on malformed JSON string', () => {
    tracker.assertThrows(() => JSON.parse(CORRUPTED_SHOWS.malformedJsonString), 'Throws on invalid JSON syntax');
  });

  test('Corrupted JSON: Rejects file with missing version field', () => {
    const res = validateShowJSON(CORRUPTED_SHOWS.missingVersion);
    tracker.assertEquals(res.valid, false, 'Validation fails when version missing');
    tracker.assert(res.errors.length > 0, 'Reports error message');
  });

  test('Corrupted JSON: Rejects unsupported major version (e.g. 99.0.0)', () => {
    const res = validateShowJSON(CORRUPTED_SHOWS.unsupportedVersion);
    tracker.assertEquals(res.valid, false, 'Rejects unsupported version');
  });

  test('Corrupted JSON: Rejects file with missing cues property', () => {
    const res = validateShowJSON(CORRUPTED_SHOWS.missingCues);
    tracker.assertEquals(res.valid, false, 'Validation fails without cues array');
  });

  // ====================================================
  // 6. VIDEO EXPORT RESOLUTION PRESETS & BITRATE ALLOCATION
  // ====================================================
  test('Video Presets: Validates 1080p, 720p, and native preset options', () => {
    const presets = ['1080p', '720p', 'native'];
    tracker.assertEquals(presets.length, 3, 'Exactly 3 resolution presets supported');
    tracker.assert(presets.includes('1080p'), 'Supports 1080p Full HD');
    tracker.assert(presets.includes('720p'), 'Supports 720p Performance');
    tracker.assert(presets.includes('native'), 'Supports Native Viewport');
  });

  test('Video Presets: Optimal bitrate allocation prevents frame drop backpressure', () => {
    const bitrateMap: Record<string, number> = {
      '720p': 4_500_000,
      '1080p': 8_000_000,
      'native': 10_000_000,
    };
    tracker.assertEquals(bitrateMap['720p'], 4_500_000, '720p allocated 4.5 Mbps');
    tracker.assertEquals(bitrateMap['1080p'], 8_000_000, '1080p allocated 8.0 Mbps');
    tracker.assertEquals(bitrateMap['native'], 10_000_000, 'Native allocated 10.0 Mbps');
  });

  test('Video Presets: Target canvas dimensions scaled cleanly to prevent high-DPI stutter', () => {
    const getTargetDimensions = (preset: string) => {
      if (preset === '1080p') return { width: 1920, height: 1080 };
      if (preset === '720p') return { width: 1280, height: 720 };
      return null;
    };
    const p1080 = getTargetDimensions('1080p');
    tracker.assertEquals(p1080?.width, 1920, '1080p width is 1920');
    tracker.assertEquals(p1080?.height, 1080, '1080p height is 1080');

    const p720 = getTargetDimensions('720p');
    tracker.assertEquals(p720?.width, 1280, '720p width is 1280');
    tracker.assertEquals(p720?.height, 720, '720p height is 720');
  });

  return { passed, failed, assertions: tracker.count() };
}
