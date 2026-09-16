/**
 * PyroSync Show Manager
 * Central reactive store for timeline cues, track mute/solo isolation,
 * zero-allocation playback cursor, and undo/redo history.
 * Conforming to PROJECT.md §Architecture and specifications.
 */

import {
  ShowJSON,
  ShowJSONCue,
  LaunchStation,
  FireCuePayload,
} from '../types';
import { ShowSerialization, DEFAULT_CALIBRATION } from './ShowSerialization';

export interface TrackDefinition {
  id: LaunchStation;
  label: string;
  offset: string;
  defaultAngle: number;
}

export const TIMELINE_TRACKS: TrackDefinition[] = [
  { id: 'far_left', label: 'Far Left Flank', offset: '-38m (-0.95)', defaultAngle: 22 },
  { id: 'mid_left', label: 'Mid Left', offset: '-24m (-0.60)', defaultAngle: 12 },
  { id: 'left_center', label: 'Left Center', offset: '-12m (-0.30)', defaultAngle: 4 },
  { id: 'center', label: 'Center Stage', offset: '0m (0.00)', defaultAngle: 0 },
  { id: 'right_center', label: 'Right Center', offset: '+12m (+0.30)', defaultAngle: -4 },
  { id: 'mid_right', label: 'Mid Right', offset: '+24m (+0.60)', defaultAngle: -12 },
  { id: 'far_right', label: 'Far Right Flank', offset: '+38m (+0.95)', defaultAngle: -22 },
  { id: 'fan', label: 'Fan Array', offset: 'Wide Span', defaultAngle: 0 },
];

export interface ShowManagerOptions {
  initialShow?: ShowJSON;
  onFireCue?: (cue: FireCuePayload) => void;
}

export class ShowManager {
  private show: ShowJSON;
  private selectedCueIds: Set<string> = new Set();
  private mutedTracks: Set<LaunchStation> = new Set();
  private soloTracks: Set<LaunchStation> = new Set();
  private preSoloMutes: Set<LaunchStation> = new Set();

  // Zero-Allocation Playback Cursor
  private playbackCursor: number = 0;
  private lastTime: number = 0.0;
  private onFireCueCallback?: (cue: FireCuePayload) => void;

  // Change Listeners
  private listeners: Set<(show: ShowJSON) => void> = new Set();
  private selectionListeners: Set<(selectedIds: string[]) => void> = new Set();
  private trackListeners: Set<() => void> = new Set();

  // Undo / Redo Command History
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private readonly maxHistory: number = 50;

  constructor(options?: ShowManagerOptions) {
    if (options?.initialShow) {
      this.show = ShowSerialization.sanitizeShowJSON(options.initialShow);
    } else {
      this.show = this.createEmptyShow();
    }
    this.onFireCueCallback = options?.onFireCue;
    this.sortCues();
  }

  public createEmptyShow(title: string = 'Untitled Show', duration: number = 90.0): ShowJSON {
    return {
      version: '1.0.0',
      title,
      duration,
      calibration: { ...DEFAULT_CALIBRATION },
      cues: [],
    };
  }

  // Getters
  public getShow(): ShowJSON {
    return this.show;
  }

  public getCues(): ShowJSONCue[] {
    return this.show.cues;
  }

  public getDuration(): number {
    return this.show.duration;
  }

  public getTitle(): string {
    return this.show.title;
  }

  public setOnFireCue(callback: (cue: FireCuePayload) => void): void {
    this.onFireCueCallback = callback;
  }

  // Show Loading & Serialization
  public loadShow(newShow: ShowJSON): void {
    this.pushUndo();
    this.show = ShowSerialization.sanitizeShowJSON(newShow);
    this.sortCues();
    this.selectedCueIds.clear();
    this.playbackCursor = 0;
    this.lastTime = 0.0;
    this.emitChange();
    this.emitSelectionChange();
  }

  public exportShow(): ShowJSON {
    return JSON.parse(JSON.stringify(this.show));
  }

  public updateTitle(title: string): void {
    this.pushUndo();
    this.show.title = title;
    this.emitChange();
  }

  public updateDuration(duration: number): void {
    this.pushUndo();
    this.show.duration = Math.max(1.0, duration);
    this.emitChange();
  }

  // Cue Mutations
  public addCue(cue: ShowJSONCue): void {
    this.pushUndo();
    this.show.cues.push({ ...cue });
    this.sortCues();
    this.emitChange();
  }

  public addCues(cues: ShowJSONCue[]): void {
    if (cues.length === 0) return;
    this.pushUndo();
    for (let i = 0; i < cues.length; i++) {
      this.show.cues.push({ ...cues[i] });
    }
    this.sortCues();
    this.emitChange();
  }

  public updateCue(id: string, patch: Partial<ShowJSONCue>): void {
    const idx = this.show.cues.findIndex((c) => c.id === id);
    if (idx === -1) return;
    this.pushUndo();
    this.show.cues[idx] = { ...this.show.cues[idx], ...patch };
    if (patch.time !== undefined) {
      this.sortCues();
    }
    this.emitChange();
  }

  public removeCue(id: string): void {
    const idx = this.show.cues.findIndex((c) => c.id === id);
    if (idx === -1) return;
    this.pushUndo();
    this.show.cues.splice(idx, 1);
    this.selectedCueIds.delete(id);
    this.emitChange();
    this.emitSelectionChange();
  }

  public removeSelectedCues(): void {
    if (this.selectedCueIds.size === 0) return;
    this.pushUndo();
    this.show.cues = this.show.cues.filter((c) => !this.selectedCueIds.has(c.id));
    this.selectedCueIds.clear();
    this.emitChange();
    this.emitSelectionChange();
  }

  public clearAllCues(): void {
    this.pushUndo();
    this.show.cues = [];
    this.selectedCueIds.clear();
    this.playbackCursor = 0;
    this.emitChange();
    this.emitSelectionChange();
  }

  // Track Mute & Solo State Machine with Pre-Solo Restoration
  public toggleMute(station: LaunchStation): void {
    if (this.mutedTracks.has(station)) {
      this.mutedTracks.delete(station);
    } else {
      this.mutedTracks.add(station);
    }
    this.emitTrackChange();
  }

  public setTrackMute(station: LaunchStation, muted: boolean): void {
    if (muted) {
      this.mutedTracks.add(station);
    } else {
      this.mutedTracks.delete(station);
    }
    this.emitTrackChange();
  }

  public toggleSolo(station: LaunchStation): void {
    if (this.soloTracks.has(station)) {
      this.soloTracks.delete(station);
      if (this.soloTracks.size === 0) {
        // Restore pre-solo mute states
        this.mutedTracks = new Set(this.preSoloMutes);
        this.preSoloMutes.clear();
      }
    } else {
      if (this.soloTracks.size === 0) {
        // Save current mute states before entering solo mode
        this.preSoloMutes = new Set(this.mutedTracks);
      }
      this.soloTracks.add(station);
    }
    this.emitTrackChange();
  }

  public setTrackSolo(station: LaunchStation, soloed: boolean): void {
    if (soloed) {
      if (this.soloTracks.size === 0) {
        this.preSoloMutes = new Set(this.mutedTracks);
      }
      this.soloTracks.add(station);
    } else {
      this.soloTracks.delete(station);
      if (this.soloTracks.size === 0) {
        this.mutedTracks = new Set(this.preSoloMutes);
        this.preSoloMutes.clear();
      }
    }
    this.emitTrackChange();
  }

  public clearAllMutesAndSolos(): void {
    this.mutedTracks.clear();
    this.soloTracks.clear();
    this.preSoloMutes.clear();
    this.emitTrackChange();
  }

  public isTrackMuted(station: LaunchStation): boolean {
    return this.mutedTracks.has(station);
  }

  public isTrackSoloed(station: LaunchStation): boolean {
    return this.soloTracks.has(station);
  }

  public isStationActive(station: LaunchStation): boolean {
    if (this.soloTracks.size > 0) {
      return this.soloTracks.has(station);
    }
    return !this.mutedTracks.has(station);
  }

  // Zero-Allocation Cursor Playback Loop
  public tick(currentTime: number): void {
    // If seeked backward, reset cursor via binary search
    if (currentTime < this.lastTime) {
      this.seek(currentTime);
    }
    this.lastTime = currentTime;

    const cues = this.show.cues;
    const len = cues.length;

    while (this.playbackCursor < len && cues[this.playbackCursor].time <= currentTime) {
      const cue = cues[this.playbackCursor];
      if (this.isStationActive(cue.station) && this.onFireCueCallback) {
        this.onFireCueCallback({
          id: cue.id,
          archetype: cue.archetype,
          station: cue.station,
          color: cue.color,
          altitude: cue.altitude,
          launchAngle: cue.launchAngle,
          duration: cue.duration,
        });
      }
      this.playbackCursor++;
    }
  }

  // O(log N) Binary Search Seek
  public seek(time: number): void {
    this.lastTime = time;
    const cues = this.show.cues;
    let low = 0;
    let high = cues.length;

    while (low < high) {
      const mid = (low + high) >>> 1;
      if (cues[mid].time < time) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    this.playbackCursor = low;
  }

  public resetScheduler(): void {
    this.playbackCursor = 0;
    this.lastTime = 0.0;
  }

  // Selection
  public selectCue(id: string, multi: boolean = false): void {
    if (!multi) {
      this.selectedCueIds.clear();
    }
    this.selectedCueIds.add(id);
    this.emitSelectionChange();
  }

  public deselectCue(id: string): void {
    this.selectedCueIds.delete(id);
    this.emitSelectionChange();
  }

  public clearSelection(): void {
    this.selectedCueIds.clear();
    this.emitSelectionChange();
  }

  public getSelectedCueIds(): string[] {
    return Array.from(this.selectedCueIds);
  }

  public getSelectedCues(): ShowJSONCue[] {
    return this.show.cues.filter((c) => this.selectedCueIds.has(c.id));
  }

  public getPrimarySelectedCue(): ShowJSONCue | null {
    if (this.selectedCueIds.size === 0) return null;
    const firstId = this.selectedCueIds.values().next().value;
    return this.show.cues.find((c) => c.id === firstId) || null;
  }

  // Undo / Redo Command History
  private pushUndo(): void {
    this.undoStack.push(JSON.stringify(this.show));
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  public undo(): boolean {
    if (this.undoStack.length === 0) return false;
    this.redoStack.push(JSON.stringify(this.show));
    const serialized = this.undoStack.pop()!;
    this.show = JSON.parse(serialized);
    this.emitChange();
    return true;
  }

  public redo(): boolean {
    if (this.redoStack.length === 0) return false;
    this.undoStack.push(JSON.stringify(this.show));
    const serialized = this.redoStack.pop()!;
    this.show = JSON.parse(serialized);
    this.emitChange();
    return true;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  private sortCues(): void {
    this.show.cues.sort((a, b) => a.time - b.time);
  }

  // Subscriptions
  public subscribe(listener: (show: ShowJSON) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public onSelectionChange(listener: (selectedIds: string[]) => void): () => void {
    this.selectionListeners.add(listener);
    return () => this.selectionListeners.delete(listener);
  }

  public onTrackChange(listener: () => void): () => void {
    this.trackListeners.add(listener);
    return () => this.trackListeners.delete(listener);
  }

  private emitChange(): void {
    this.listeners.forEach((fn) => fn(this.show));
  }

  private emitSelectionChange(): void {
    const ids = this.getSelectedCueIds();
    this.selectionListeners.forEach((fn) => fn(ids));
  }

  private emitTrackChange(): void {
    this.trackListeners.forEach((fn) => fn());
  }
}
