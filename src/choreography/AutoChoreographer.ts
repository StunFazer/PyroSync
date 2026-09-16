/**
 * PyroSync 1-Click Auto-Choreographer
 * Analyzes audio energy flux, transient downbeats, and spectral bands
 * to generate synchronized pyrotechnic cues quantized to musical beat grids.
 * Conforming to ORIGINAL_REQUEST.md §R4, AC-8, and PROJECT.md §Feature Inventory #43.
 */

import {
  AutoChoreographyOptions,
  LaunchStation,
  ShellArchetype,
  ShowJSONCue,
} from '../types';

export class AutoChoreographer {
  /**
   * Generates synchronized pyrotechnic cues from an audio buffer.
   * Throws descriptive Error if buffer is null/missing (AC-8).
   * Generates 0 cues on silent audio.
   */
  public static choreographFromAudioBuffer(
    audioBuffer: AudioBuffer | null,
    options?: AutoChoreographyOptions
  ): ShowJSONCue[] {
    if (!audioBuffer) {
      throw new Error('Cannot auto-choreograph: No audio track loaded');
    }

    const duration = audioBuffer.duration;
    if (duration <= 0 || audioBuffer.length === 0) return [];

    const bpm = options?.bpm && options.bpm > 0 ? options.bpm : 120;
    const gridStep = 60 / bpm; // Beat spacing in seconds (e.g. 0.5s for 120 BPM)

    // 1. Analyze PCM channel data to compute dynamic energy flux profile
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.02); // 20ms analysis window
    const hopSize = Math.floor(sampleRate * 0.01); // 10ms hop
    const density = options?.density || 'balanced';
    // Spacing between standard rhythmic shots:
    // 'sparse' / 'low': ~1.4s (major downbeats, whole/half notes, very airy)
    // 'balanced' / 'medium': ~0.80s - 1.0s (downbeats & key backbeats, spacious blooming)
    // 'intense' / 'high': ~0.45s - 0.50s (energetic rhythmic drive)
    let minInterval = 0.85;
    if (density === 'sparse' || density === 'low') {
      minInterval = Math.max(1.30, gridStep * 2.0);
    } else if (density === 'intense' || density === 'high') {
      minInterval = Math.max(0.40, gridStep * 0.8);
    } else {
      // balanced default
      minInterval = Math.max(0.75, gridStep * 1.5);
    }

    let maxSampleMagnitude = 0;
    const fluxValues: number[] = [];
    const windowEnergies: number[] = [];
    const windowTimes: number[] = [];
    const windowZcr: number[] = [];

    let prevEnergy = 0.0;

    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      let energy = 0.0;
      let zeroCrossings = 0;

      for (let j = 0; j < windowSize; j++) {
        const s = channelData[i + j];
        const absS = Math.abs(s);
        if (absS > maxSampleMagnitude) maxSampleMagnitude = absS;
        energy += s * s;
        if (j > 0 && ((s >= 0 && channelData[i + j - 1] < 0) || (s < 0 && channelData[i + j - 1] >= 0))) {
          zeroCrossings++;
        }
      }
      energy = Math.sqrt(energy / windowSize);

      const flux = Math.max(0, energy - prevEnergy);
      fluxValues.push(flux);
      windowEnergies.push(energy);
      windowTimes.push(i / sampleRate);
      windowZcr.push(zeroCrossings / windowSize);

      prevEnergy = energy;
    }

    // Silence detection: if peak amplitude is virtually zero, return 0 cues
    if (maxSampleMagnitude < 0.001 || fluxValues.length === 0) {
      return [];
    }

    // Compute dynamic adaptive threshold based on peak flux and signal distribution
    let maxFlux = 0.0;
    for (let k = 0; k < fluxValues.length; k++) {
      if (fluxValues[k] > maxFlux) maxFlux = fluxValues[k];
    }

    // Dynamic adaptive threshold calculation: higher threshold in balanced/sparse modes to ignore micro-noise
    const threshMultiplier = density === 'sparse' || density === 'low' ? 0.35 : density === 'intense' ? 0.18 : 0.28;
    let threshold = Math.max(0.02, Math.min(0.20, maxFlux * threshMultiplier));

    const extractTransients = (thresh: number) => {
      const results: { time: number; energy: number; trebleRatio: number }[] = [];
      let lastTime = -10.0;
      for (let k = 0; k < fluxValues.length; k++) {
        const timeSec = windowTimes[k];
        const flux = fluxValues[k];
        if (flux > thresh && (timeSec - lastTime) >= minInterval) {
          const normEnergy = maxSampleMagnitude > 0 ? Math.min(1.0, (windowEnergies[k] / maxSampleMagnitude) * 1.5) : windowEnergies[k];
          results.push({
            time: timeSec,
            energy: normEnergy,
            trebleRatio: windowZcr[k],
          });
          lastTime = timeSec;
        }
      }
      return results;
    };

    let rawTransients = extractTransients(threshold);

    // Fallback pass: if music is very subtle, acoustic, or quiet (< 6 cues on tracks > 5s)
    if (rawTransients.length < 6 && duration > 5.0 && maxFlux > 0.005) {
      threshold = Math.max(0.01, maxFlux * 0.15);
      rawTransients = extractTransients(threshold);
    }

    // Secondary fallback: if still very sparse, sample peak energy windows across regular musical bars
    if (rawTransients.length < 4 && duration > 3.0 && maxSampleMagnitude > 0.01) {
      const stepTime = Math.max(1.0, gridStep * 4); // 1 bar spacing
      let tIter = 1.0;
      while (tIter < duration - 1.0) {
        rawTransients.push({
          time: tIter,
          energy: 0.65,
          trebleRatio: 0.1,
        });
        tIter += stepTime;
      }
    }

    if (rawTransients.length === 0) {
      return [];
    }

    // 2. Quantize transients to musical beat grid and map to archetypes/stations
    const cues: ShowJSONCue[] = [];
    const usedTimes = new Set<string>();

    // Palette preset mapping
    const PALETTE_PRESETS: Record<string, string[]> = {
      golden_imperial: ['#ffd700', '#f59e0b', '#fffbeb', '#d97706', '#fef08a'],
      neon_cyberpunk: ['#06b6d4', '#f43f5e', '#a855f7', '#10b981', '#ec4899'],
      ocean_breeze: ['#0284c7', '#38bdf8', '#2dd4bf', '#a7f3d0', '#ffffff'],
      sunset_fire: ['#ef4444', '#f97316', '#eab308', '#fda4af', '#dc2626'],
      emerald_forest: ['#10b981', '#059669', '#34d399', '#a7f3d0', '#6ee7b7'],
      classic_rainbow: ['#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#a855f7'],
      patriotic: ['#ef4444', '#ffffff', '#3b82f6', '#dc2626', '#1d4ed8'],
      aurora_borealis: ['#00ffcc', '#38ef7d', '#11998e', '#a855f7', '#38bdf8', '#ff007f'],
      cosmic_galaxy: ['#9d4edd', '#c77dff', '#e0aaff', '#240046', '#3c096c', '#00f0ff'],
      carnival_fiesta: ['#ff0055', '#ff5500', '#ffcc00', '#00cc66', '#0099ff', '#aa00ff'],
      electric_citrus: ['#ff007f', '#ffaa00', '#eeff00', '#00ff66', '#00f0ff'],
      twilight_dusk: ['#2e0854', '#511845', '#900c3f', '#c70039', '#ff5733', '#ffc300'],
      retro_synth: ['#ff2a6d', '#05d9e8', '#005670', '#01012b', '#d1f7ff', '#f5d300'],
      fire_and_ice: ['#ff2200', '#ff6600', '#ffcc00', '#00ccff', '#0066ff', '#ffffff'],
      royal_gold: ['#ffd700', '#f59e0b', '#ffffff'],
      neon_cyber: ['#06b6d4', '#ec4899', '#a855f7'],
      rainbow: ['#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#a855f7'],
    };

    let palette = options?.palette && options.palette.length > 0 ? options.palette : null;
    if (!palette && options?.paletteTheme && PALETTE_PRESETS[options.paletteTheme]) {
      palette = PALETTE_PRESETS[options.paletteTheme];
    }
    if (!palette || palette.length === 0) {
      palette = PALETTE_PRESETS.golden_imperial;
    }

    // Non-linear choreographic sequences (breaking monotonous L->R sweeps)
    const SYMMETRICAL_MOTIF: LaunchStation[] = ['center', 'left_center', 'right_center', 'mid_left', 'mid_right', 'far_left', 'far_right'];
    const CROSSOVER_MOTIF: LaunchStation[] = ['far_left', 'far_right', 'mid_left', 'mid_right', 'left_center', 'right_center', 'center'];
    const MIRROR_MOTIF: LaunchStation[] = ['center', 'mid_right', 'mid_left', 'right_center', 'left_center', 'far_right', 'far_left'];
    const SCATTER_MOTIF: LaunchStation[] = ['left_center', 'far_right', 'mid_left', 'center', 'mid_right', 'far_left', 'right_center'];

    const CHOREO_MOTIFS = [SYMMETRICAL_MOTIF, CROSSOVER_MOTIF, MIRROR_MOTIF, SCATTER_MOTIF];

    // Novelty shapes rotation pool (Heart, Diamond, Butterfly, Star, Double Ring)
    const NOVELTY_SHAPES: ShellArchetype[] = ['heart_shape', 'diamond_shape', 'butterfly', 'star_shape', 'double_ring'];
    let noveltyShapeIndex = 0;
    let lastNoveltyTime = -999.0; // Cooldown tracking

    let lastAssignedStation: LaunchStation = 'center';
    let lastAssignedArchetype: ShellArchetype = 'peony';

    for (let idx = 0; idx < rawTransients.length; idx++) {
      const t = rawTransients[idx];
      // Beat grid quantization: round to nearest musical subdivision
      const quantizedTime = Number((Math.round(t.time / gridStep) * gridStep).toFixed(3));
      const key = `${quantizedTime}`;
      if (usedTimes.has(key)) continue;
      usedTimes.add(key);

      // Motif selection based on 8-cue musical phrases
      const motifIdx = Math.floor(idx / 8) % CHOREO_MOTIFS.length;
      const activeMotif = CHOREO_MOTIFS[motifIdx];

      let archetype: ShellArchetype = 'peony';
      let station: LaunchStation = 'center';
      let altitude = 0.8;

      // Check if this cue qualifies for a rare novelty shape accent:
      // Minimum 8.0s cooldown, on melodic/peak transients, maximum once every ~16 beats
      const canFireNoveltyShape = (quantizedTime - lastNoveltyTime) >= 8.5 && (idx % 12 === 5 || t.energy > 0.88);

      if (canFireNoveltyShape) {
        archetype = NOVELTY_SHAPES[noveltyShapeIndex % NOVELTY_SHAPES.length];
        noveltyShapeIndex++;
        lastNoveltyTime = quantizedTime;
        station = 'center'; // Featured shapes command center stage or prominent center flank
        altitude = 0.86;
      } else if (t.energy > 0.80) {
        // Heavy sub-bass drop / downbeat: Ground mines, Brocades, Kamuro Ghost Willow
        const heavyChoices: ShellArchetype[] = ['ground_mine', 'weeping_willow', 'brocade_crown', 'willow'];
        const filtered = heavyChoices.filter((a) => a !== lastAssignedArchetype);
        archetype = filtered[idx % filtered.length];

        if (archetype === 'ground_mine') {
          station = idx % 2 === 0 ? 'mid_left' : 'mid_right';
          altitude = 0.40;
        } else if (archetype === 'brocade_crown') {
          station = 'fan';
          altitude = 0.92;
        } else {
          station = activeMotif[idx % activeMotif.length];
          altitude = 0.88;
        }
      } else if (t.trebleRatio > 0.15 || t.energy > 0.85) {
        // High treble energy / transient: Crisp crackle, Strobe, Palm Tree
        const trebleChoices: ShellArchetype[] = ['strobe', 'crackle', 'palm_tree', 'crossette'];
        const filtered = trebleChoices.filter((a) => a !== lastAssignedArchetype);
        archetype = filtered[idx % filtered.length];

        station = activeMotif[idx % activeMotif.length];
        if (station === lastAssignedStation) {
          station = activeMotif[(idx + 3) % activeMotif.length];
        }
        altitude = 0.84;
      } else {
        // Core Classical Backbone (Peony, Chrysanthemum, Crossette, Saturn Ring, Multi-Break)
        const classicalMids: ShellArchetype[] = [
          'peony',
          'chrysanthemum',
          'crossette',
          'saturn_ring',
          'multi_break',
        ];
        const filtered = classicalMids.filter((a) => a !== lastAssignedArchetype);
        archetype = filtered[idx % filtered.length];

        station = activeMotif[idx % activeMotif.length];
        if (station === lastAssignedStation) {
          station = activeMotif[(idx + 2) % activeMotif.length];
        }
        altitude = 0.74 + (idx % 3) * 0.06;
      }

      lastAssignedStation = station;
      lastAssignedArchetype = archetype;

      // Station-specific launch angles (inwards fanning for wide flank stations)
      let launchAngle = 0;
      if (station === 'far_left') launchAngle = 20;
      else if (station === 'mid_left') launchAngle = 10;
      else if (station === 'left_center') launchAngle = 3;
      else if (station === 'right_center') launchAngle = -3;
      else if (station === 'mid_right') launchAngle = -10;
      else if (station === 'far_right') launchAngle = -20;

      cues.push({
        id: `auto_${idx + 1}_${Math.random().toString(36).substring(2, 6)}`,
        time: quantizedTime,
        archetype,
        station,
        color: palette[idx % palette.length],
        altitude,
        launchAngle,
        duration: archetype === 'ground_mine' ? 1.8 : 2.5,
      });
    }

    // Optional climax salvo at the end of the track
    if (options?.climaxSalvo !== false && duration > 10.0) {
      const finaleTime = Number((duration - 4.0).toFixed(3));
      cues.push({
        id: `auto_climax_salvo`,
        time: finaleTime,
        archetype: 'finale_barrage',
        station: 'fan',
        color: '#ffd700',
        altitude: 0.95,
        duration: 4.5,
      });
    }

    return cues.sort((a, b) => a.time - b.time);
  }

  /**
   * Alias for choreographFromAudioBuffer
   */
  public static generate(
    audioBuffer: AudioBuffer | null,
    options?: AutoChoreographyOptions
  ): ShowJSONCue[] {
    return this.choreographFromAudioBuffer(audioBuffer, options);
  }
}
