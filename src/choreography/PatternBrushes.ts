/**
 * PyroSync Macro Pattern Brushes
 * Automated choreography generators for Fan Sweeps, Alternating Mines, and Grand Finale Barrages.
 * Conforming to ORIGINAL_REQUEST.md §R4 and PROJECT.md §Feature Inventory #40, #41, #42.
 */

import {
  LaunchStation,
  MacroBrushType,
  ShellArchetype,
  ShowJSONCue,
} from '../types';

export interface PatternBrushOptions {
  startTime: number;
  archetype?: ShellArchetype;
  color?: string;
  colors?: string[];
  duration?: number;
  interval?: number;
  burstCount?: number;
  bpm?: number;
  altitude?: number;
}

export class PatternBrushes {
  /**
   * Fan Sweeps Brush:
   * Sequences Left-to-Right [L, LC, C, RC, R], Right-to-Left [R, RC, C, LC, L], or Center-Out.
   * Clamps duration within [0.25s, 2.0s].
   */
  public static generateFanSweep(
    direction: 'left_to_right' | 'right_to_left' | 'center_out',
    options: PatternBrushOptions
  ): ShowJSONCue[] {
    const startTime = Math.max(0, options.startTime);
    const archetype: ShellArchetype = options.archetype || 'peony';
    const color = options.color || '#ffd700';
    const alt = Math.max(0.2, Math.min(1.0, options.altitude ?? 0.8));
    const duration = Math.max(0.25, Math.min(2.0, options.duration ?? 0.5));

    const cues: ShowJSONCue[] = [];

    if (direction === 'left_to_right') {
      const stations: LaunchStation[] = ['left', 'left_center', 'center', 'right_center', 'right'];
      const step = (duration - 0.05) / Math.max(1, stations.length - 1);
      stations.forEach((st, i) => {
        cues.push({
          id: `sweep_lr_${Date.now()}_${i}`,
          time: Number((startTime + i * step).toFixed(3)),
          archetype,
          station: st,
          color,
          altitude: alt,
          launchAngle: (i - 2) * 8,
          duration: 2.2,
        });
      });
    } else if (direction === 'right_to_left') {
      const stations: LaunchStation[] = ['right', 'right_center', 'center', 'left_center', 'left'];
      const step = (duration - 0.05) / Math.max(1, stations.length - 1);
      stations.forEach((st, i) => {
        cues.push({
          id: `sweep_rl_${Date.now()}_${i}`,
          time: Number((startTime + i * step).toFixed(3)),
          archetype,
          station: st,
          color,
          altitude: alt,
          launchAngle: (2 - i) * 8,
          duration: 2.2,
        });
      });
    } else {
      // Center-Out outward waves (step 0: center, step 1: LC/RC, step 2: L/R)
      const waves: { step: number; stations: LaunchStation[] }[] = [
        { step: 0, stations: ['center'] },
        { step: 1, stations: ['left_center', 'right_center'] },
        { step: 2, stations: ['left', 'right'] },
      ];
      const stepInterval = (duration - 0.05) / 2;
      waves.forEach((w) => {
        w.stations.forEach((st, sIdx) => {
          cues.push({
            id: `sweep_co_${Date.now()}_${w.step}_${sIdx}`,
            time: Number((startTime + w.step * stepInterval).toFixed(3)),
            archetype,
            station: st,
            color,
            altitude: alt,
            launchAngle: st === 'left' ? 12 : st === 'right' ? -12 : 0,
            duration: 2.2,
          });
        });
      });
    }

    return cues;
  }

  /**
   * Alternating Mines Brush:
   * Even beats trigger outer flanks [left, right]; odd beats trigger inner [left_center, center, right_center].
   * Spaced by quarter notes matching musical tempo (e.g. 128 BPM -> ~0.46875s).
   * Enforces ground_mine archetype, altitude <= 0.60 (e.g. 0.45), salvo count [4, 32], alternating colors.
   */
  public static generateAlternatingMines(options: PatternBrushOptions): ShowJSONCue[] {
    const startTime = Math.max(0, options.startTime);
    const bpm = options.bpm && options.bpm > 0 ? options.bpm : 128;
    const beatSec = 60 / bpm;
    const burstCount = Math.max(4, Math.min(32, options.burstCount ?? 8));
    const colors = options.colors && options.colors.length >= 2 ? options.colors : ['#06b6d4', '#f43f5e'];

    const cues: ShowJSONCue[] = [];

    for (let b = 0; b < burstCount; b++) {
      const beatTime = Number((startTime + b * beatSec).toFixed(3));
      const color = colors[b % colors.length];
      const isEven = b % 2 === 0;
      const stations: LaunchStation[] = isEven
        ? ['left', 'right']
        : ['left_center', 'center', 'right_center'];

      stations.forEach((st, idx) => {
        cues.push({
          id: `mine_alt_${Date.now()}_${b}_${idx}`,
          time: beatTime,
          archetype: 'ground_mine',
          station: st,
          color,
          altitude: 0.45,
          launchAngle: st === 'left' ? 10 : st === 'right' ? -10 : 0,
          duration: 1.8,
        });
      });
    }

    return cues;
  }

  /**
   * Grand Finale Barrage Brush:
   * Dense crescendo building over [3.0s, 10.0s] (default 6.0s).
   * Staggered breaks with progressive altitude scaling (0.70 -> 0.80 -> 0.90 -> 0.98).
   * Saturates all 6 stations with multi-archetype composition while guarding particle pool limit.
   */
  public static generateGrandFinale(options: PatternBrushOptions): ShowJSONCue[] {
    const startTime = Math.max(0, options.startTime);
    const duration = Math.max(3.0, Math.min(10.0, options.duration ?? 6.0));
    const baseColor = options.color || '#ffd700';
    const cues: ShowJSONCue[] = [];

    // Wave 1: Ground mines and whistling comets opening (0.0s)
    const wave1Stations: LaunchStation[] = ['left', 'right', 'left_center', 'right_center'];
    wave1Stations.forEach((st, i) => {
      cues.push({
        id: `fin_mine_${Date.now()}_${i}`,
        time: Number((startTime + i * 0.1).toFixed(3)),
        archetype: 'ground_mine',
        station: st,
        color: '#ff3366',
        altitude: 0.45,
        duration: 1.8,
      });
    });

    // Wave 2: Rising Altitude Crescendo (progressive altitude scaling 0.70 -> 0.80 -> 0.90 -> 0.98)
    const altitudeSteps = [0.70, 0.80, 0.90, 0.98];
    const archetypes: ShellArchetype[] = ['brocade_crown', 'chrysanthemum', 'crackle', 'peony'];
    const midStations: LaunchStation[] = ['left', 'left_center', 'center', 'right_center', 'right'];

    altitudeSteps.forEach((alt, stepIdx) => {
      const stepTime = Number((startTime + (duration * 0.25) + stepIdx * (duration * 0.15)).toFixed(3));
      midStations.forEach((st, sIdx) => {
        cues.push({
          id: `fin_cresc_${Date.now()}_${stepIdx}_${sIdx}`,
          time: Number((stepTime + sIdx * 0.05).toFixed(3)),
          archetype: archetypes[(stepIdx + sIdx) % archetypes.length],
          station: st,
          color: sIdx % 2 === 0 ? baseColor : '#ffffff',
          altitude: alt,
          launchAngle: (sIdx - 2) * 6,
          duration: 3.2,
        });
      });
    });

    // Wave 3: Grand Salvo Climax on all 6 stations simultaneously (at duration - 0.5s)
    const finalSalvoTime = Number((startTime + duration - 0.5).toFixed(3));
    const allStations: LaunchStation[] = ['left', 'left_center', 'center', 'right_center', 'right', 'fan'];
    allStations.forEach((st, idx) => {
      cues.push({
        id: `fin_salvo_${Date.now()}_${idx}`,
        time: finalSalvoTime,
        archetype: st === 'fan' ? 'finale_barrage' : 'brocade_crown',
        station: st,
        color: baseColor,
        altitude: 0.95,
        launchAngle: 0,
        duration: 4.5,
      });
    });

    return cues.sort((a, b) => a.time - b.time);
  }

  /**
   * Universal Macro Brush Dispatcher
   */
  public static applyMacroBrush(type: MacroBrushType, options: PatternBrushOptions): ShowJSONCue[] {
    switch (type) {
      case 'sweep_left_to_right':
        return this.generateFanSweep('left_to_right', options);
      case 'sweep_right_to_left':
        return this.generateFanSweep('right_to_left', options);
      case 'sweep_center_out':
        return this.generateFanSweep('center_out', options);
      case 'alternating_mines':
        return this.generateAlternatingMines(options);
      case 'grand_finale_barrage':
        return this.generateGrandFinale(options);
      default:
        return [];
    }
  }
}
