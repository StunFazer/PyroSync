/**
 * PyroSync Live Tap-To-Record & Safety Interlocks
 * Numeric hotkeys 1-6 for spatial stations, 7-9 for quick macro bursts,
 * presentation fullscreen ('F'), and emergency panic blackout ('Esc'/'Space'),
 * with strict focus suppression inside text inputs.
 * Conforming to ORIGINAL_REQUEST.md §R4, AC-9, and PROJECT.md §Feature Inventory #44.
 */

import {
  FireCuePayload,
  LaunchStation,
  ShellArchetype,
  ShowJSONCue,
} from '../types';

export interface TapRecorderConfig {
  getCurrentTime: () => number;
  getIsPlaying: () => boolean;
  onRecordCue: (cue: ShowJSONCue) => void;
  onFireLive: (cue: FireCuePayload) => void;
  onBlackout: () => void;
  onToggleFullscreen: () => void;
  onToggleHotkeys?: () => void;
  isModalOpen?: () => boolean;
  onCloseModal?: () => void;
  getActiveArchetype?: () => ShellArchetype;
  getActiveColor?: () => string;
}

export const STATION_HOTKEY_MAP: Record<string, LaunchStation> = {
  '1': 'left',
  '2': 'left_center',
  '3': 'center',
  '4': 'right_center',
  '5': 'right',
  '6': 'fan',
};

export class TapRecorder {
  private config: TapRecorderConfig;
  private attachedTarget: HTMLElement | Window | null = null;
  private boundHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(config: TapRecorderConfig) {
    this.config = config;
  }

  public handleKeyDown(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement | null;

    // Safety Interlock: Strictly suppress hotkeys inside input fields or editable areas
    if (
      target &&
      (target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA')
    ) {
      // In text input fields: Space types space, numbers type numbers, F types F.
      // Escape can blur or dismiss
      if (e.key === 'Escape' && this.config.isModalOpen && this.config.isModalOpen()) {
        e.preventDefault();
        this.config.onCloseModal?.();
        return true;
      }
      return false;
    }

    const key = e.key;

    // 1. Modal Dismissal vs Emergency Panic Blackout
    if (key === 'Escape') {
      e.preventDefault();
      if (this.config.isModalOpen && this.config.isModalOpen()) {
        this.config.onCloseModal?.();
      } else {
        this.config.onBlackout();
      }
      return true;
    }

    // 2. Spacebar Emergency Panic Blackout
    if (key === ' ') {
      e.preventDefault();
      this.config.onBlackout();
      return true;
    }

    // 3. Presentation Fullscreen Toggle ('F' or 'f')
    if (key === 'f' || key === 'F') {
      e.preventDefault();
      this.config.onToggleFullscreen();
      return true;
    }

    // 3b. Hotkey Cheat Sheet Toggle ('?' or 'H' or 'h')
    if (key === '?' || key === 'h' || key === 'H') {
      if (this.config.onToggleHotkeys) {
        e.preventDefault();
        this.config.onToggleHotkeys();
        return true;
      }
    }

    const playhead = this.config.getCurrentTime();
    const archetype = this.config.getActiveArchetype ? this.config.getActiveArchetype() : 'peony';
    const color = this.config.getActiveColor ? this.config.getActiveColor() : '#ffd700';

    // 4. Numeric Keys '1'–'6': Spatial Launch Stations
    if (STATION_HOTKEY_MAP[key]) {
      e.preventDefault();
      const station = STATION_HOTKEY_MAP[key];
      const cue: ShowJSONCue = {
        id: `tap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        time: Number(playhead.toFixed(3)),
        archetype,
        station,
        color,
        altitude: 0.85,
        launchAngle: station === 'left' ? 15 : station === 'right' ? -15 : 0,
        duration: 2.2,
      };

      this.config.onRecordCue(cue);
      this.config.onFireLive(cue);
      return true;
    }

    // 5. Numeric Keys '7'–'9': Quick Macro Brushes
    if (key === '7') {
      // Key 7: Ground Mine Salvo
      e.preventDefault();
      const mineCue: ShowJSONCue = {
        id: `tap_mine_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        time: Number(playhead.toFixed(3)),
        archetype: 'ground_mine',
        station: 'center',
        color: '#ef4444',
        altitude: 0.45,
        launchAngle: 0,
        duration: 1.8,
      };
      this.config.onRecordCue(mineCue);
      this.config.onFireLive(mineCue);
      return true;
    }

    if (key === '8') {
      // Key 8: Crossette Fan
      e.preventDefault();
      const crossCue: ShowJSONCue = {
        id: `tap_cross_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        time: Number(playhead.toFixed(3)),
        archetype: 'crossette',
        station: 'fan',
        color: '#22c55e',
        altitude: 0.85,
        launchAngle: 0,
        duration: 2.5,
      };
      this.config.onRecordCue(crossCue);
      this.config.onFireLive(crossCue);
      return true;
    }

    if (key === '9') {
      // Key 9: Finale Salvo
      e.preventDefault();
      const finCue: ShowJSONCue = {
        id: `tap_fin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        time: Number(playhead.toFixed(3)),
        archetype: 'finale_barrage',
        station: 'fan',
        color: '#ffd700',
        altitude: 0.95,
        launchAngle: 0,
        duration: 4.5,
      };
      this.config.onRecordCue(finCue);
      this.config.onFireLive(finCue);
      return true;
    }

    return false;
  }

  public attach(target: HTMLElement | Window = window): () => void {
    this.detach();
    this.attachedTarget = target;
    this.boundHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    target.addEventListener('keydown', this.boundHandler as EventListener);
    return () => this.detach();
  }

  public detach(): void {
    if (this.attachedTarget && this.boundHandler) {
      this.attachedTarget.removeEventListener('keydown', this.boundHandler as EventListener);
    }
    this.attachedTarget = null;
    this.boundHandler = null;
  }
}
