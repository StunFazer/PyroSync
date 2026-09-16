/**
 * PyroSync Multi-Track Timeline Studio
 * 6 spatial tracks, waveform canvas, playhead scrubber, zoom controls,
 * track mute/solo toggles, macro brushes, preset selector, and JSON export/import.
 * Conforming to ORIGINAL_REQUEST.md §R4, §R5, and PROJECT.md §Feature Inventory #36-#48.
 */

import React, { useState, useRef, useEffect } from 'react';
import { ShowManager, TIMELINE_TRACKS } from '../../state/ShowManager';
import { AudioEngine } from '../../engine/audio/AudioEngine';
import { WaveformCanvas } from './WaveformCanvas';
import { CueInspector } from './CueInspector';
import { AutoChoreographer } from '../../choreography/AutoChoreographer';
import { ShowSerialization } from '../../state/ShowSerialization';
import {
  AutoChoreographyDensity,
  PaletteTheme,
  WaveformPeaks,
} from '../../types';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  ZoomIn,
  ZoomOut,
  Sliders,
  Undo2,
  Redo2,
  Trash2,
  Wand2,
  Palette,
  Music,
} from 'lucide-react';

interface TimelineStudioProps {
  showManager: ShowManager;
  audioEngine: AudioEngine | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onRewind: () => void;
  onSeek: (time: number) => void;
  onLoadShowPreset: (presetKey: string) => void;
  onUploadAudio?: (file: File) => Promise<void>;
  activeTrackTitle?: string;
}

export const TimelineStudio: React.FC<TimelineStudioProps> = ({
  showManager,
  audioEngine,
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
  onRewind,
  onSeek,
  onLoadShowPreset,
  onUploadAudio,
  activeTrackTitle,
}) => {
  const [show, setShow] = useState(showManager.getShow());
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);
  const [peaks, setPeaks] = useState<WaveformPeaks | null>(null);
  const [transients, setTransients] = useState<number[]>([]);
  const [zoom, setZoom] = useState<number>(40); // Pixels per second
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [selectedPalette, setSelectedPalette] = useState<PaletteTheme>('golden_imperial');
  const [selectedDensity, setSelectedDensity] = useState<AutoChoreographyDensity>('balanced');
  const [choreographNotice, setChoreographNotice] = useState<string | null>(null);
  const [, setTrackStateVersion] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const tracksScrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync subscriptions
  useEffect(() => {
    const unsubShow = showManager.subscribe((s) => setShow({ ...s }));
    const unsubSel = showManager.onSelectionChange((ids) => {
      setSelectedCueId(ids[0] || null);
    });
    const unsubTracks = showManager.onTrackChange(() => {
      setTrackStateVersion((v) => v + 1);
    });

    return () => {
      unsubShow();
      unsubSel();
      unsubTracks();
    };
  }, [showManager]);

  // Extract waveform peaks & transients when audio track changes or engine updates
  useEffect(() => {
    if (audioEngine && audioEngine.getAudioBuffer()) {
      try {
        const p = audioEngine.extractWaveformPeaks(1200);
        setPeaks(p);
        const t = audioEngine.detectTransients(0.25);
        setTransients(t);
      } catch (err) {
        console.warn('Could not extract waveform peaks:', err);
      }
    }
  }, [audioEngine, show.audioTrack, duration, activeTrackTitle]);

  const showDuration = Math.max(1.0, duration > 0 ? duration : show.duration);
  const totalTimelineWidth = Math.max(900, Math.ceil(showDuration * zoom));

  const PALETTE_DEFINITIONS: Record<PaletteTheme, { label: string; colors: string[] }> = {
    golden_imperial: {
      label: 'Golden Imperial',
      colors: ['#ffd700', '#f59e0b', '#fffbeb', '#d97706', '#fef08a'],
    },
    neon_cyberpunk: {
      label: 'Neon Cyberpunk',
      colors: ['#06b6d4', '#f43f5e', '#a855f7', '#10b981', '#ec4899'],
    },
    ocean_breeze: {
      label: 'Ocean Breeze',
      colors: ['#0284c7', '#38bdf8', '#2dd4bf', '#a7f3d0', '#ffffff'],
    },
    sunset_fire: {
      label: 'Sunset Fire',
      colors: ['#ef4444', '#f97316', '#eab308', '#fda4af', '#dc2626'],
    },
    emerald_forest: {
      label: 'Emerald Forest',
      colors: ['#10b981', '#059669', '#34d399', '#a7f3d0', '#6ee7b7'],
    },
    classic_rainbow: {
      label: 'Classic Rainbow',
      colors: ['#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#a855f7'],
    },
    patriotic: {
      label: 'Patriotic (Red/White/Blue)',
      colors: ['#ef4444', '#ffffff', '#3b82f6', '#dc2626', '#1d4ed8'],
    },
    aurora_borealis: {
      label: 'Aurora Borealis (Teal/Violet/Pink)',
      colors: ['#00ffcc', '#38ef7d', '#11998e', '#a855f7', '#38bdf8', '#ff007f'],
    },
    cosmic_galaxy: {
      label: 'Cosmic Galaxy (Deep Purple/Cyan)',
      colors: ['#9d4edd', '#c77dff', '#e0aaff', '#240046', '#3c096c', '#00f0ff'],
    },
    carnival_fiesta: {
      label: 'Carnival Fiesta (Vibrant Multi)',
      colors: ['#ff0055', '#ff5500', '#ffcc00', '#00cc66', '#0099ff', '#aa00ff'],
    },
    electric_citrus: {
      label: 'Electric Citrus (Lime/Tangerine/Cyan)',
      colors: ['#ff007f', '#ffaa00', '#eeff00', '#00ff66', '#00f0ff'],
    },
    twilight_dusk: {
      label: 'Twilight Dusk (Magenta/Amber/Coral)',
      colors: ['#2e0854', '#511845', '#900c3f', '#c70039', '#ff5733', '#ffc300'],
    },
    retro_synth: {
      label: 'Retro Synth (Hot Pink/Cyan/Gold)',
      colors: ['#ff2a6d', '#05d9e8', '#005670', '#01012b', '#d1f7ff', '#f5d300'],
    },
    fire_and_ice: {
      label: 'Fire & Ice (Flame Red/Arctic Cyan)',
      colors: ['#ff2200', '#ff6600', '#ffcc00', '#00ccff', '#0066ff', '#ffffff'],
    },
  };

  // 1-Click Auto-Choreographer with dynamic feedback
  const handleAutoChoreograph = () => {
    if (!audioEngine || !audioEngine.getAudioBuffer()) {
      alert('Cannot auto-choreograph: No audio track loaded. Upload an audio track or choose a demo soundtrack first.');
      return;
    }
    try {
      const cues = AutoChoreographer.choreographFromAudioBuffer(audioEngine.getAudioBuffer(), {
        paletteTheme: selectedPalette,
        density: selectedDensity,
      });
      if (cues.length === 0) {
        alert('Auto-choreographer found 0 transients in this audio track (audio might be silent).');
        return;
      }
      showManager.addCues(cues);
      setChoreographNotice(`Generated ${cues.length} beat-synced cues!`);
      setTimeout(() => setChoreographNotice(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Auto-choreography failed');
    }
  };

  // Recolor all timeline cues to active palette
  const handleRecolorTimeline = () => {
    const pal = PALETTE_DEFINITIONS[selectedPalette]?.colors || PALETTE_DEFINITIONS.golden_imperial.colors;
    show.cues.forEach((cue, idx) => {
      showManager.updateCue(cue.id, {
        color: pal[idx % pal.length],
      });
    });
  };

  // Handle direct audio file upload from timeline toolbar
  const handleTimelineAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onUploadAudio) {
      await onUploadAudio(file);
      setChoreographNotice(`Loaded "${file.name}". Click Auto-Choreograph to build cues!`);
      setTimeout(() => setChoreographNotice(null), 6000);
    }
    if (audioFileInputRef.current) {
      audioFileInputRef.current.value = '';
    }
  };

  // Export JSON file
  const handleExportJSON = () => {
    ShowSerialization.downloadShowFile(showManager.getShow());
  };

  // Import JSON file
  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedShow = await ShowSerialization.readShowFile(file);
      showManager.loadShow(importedShow);
      if (importedShow.audioTrack?.proceduralPreset && audioEngine) {
        audioEngine.loadDemoTrack(importedShow.audioTrack.proceduralPreset);
      }
    } catch (err: any) {
      alert(`Failed to import show: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const selectedCue = show.cues.find((c) => c.id === selectedCueId) || null;

  return (
    <div className="flex flex-col w-full bg-neutral-950 border-t border-neutral-800 select-none text-xs">
      {/* 1. Header Toolbar: Transport, Timecode, Presets, Export/Import, Zoom */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-neutral-900/90 border-b border-neutral-800 gap-2">
        <div className="flex items-center gap-2">
          {/* Transport buttons */}
          <button
            onClick={onPlayPause}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-semibold transition-colors cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                : 'bg-neutral-800 hover:bg-neutral-700 text-white'
            }`}
            title={isPlaying ? 'Pause playback (Space)' : 'Start playback (Space)'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={onRewind}
            className="p-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 transition-colors cursor-pointer"
            title="Rewind playhead to 00:00"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Timecode readouts */}
          <div className="font-mono text-xs px-2.5 py-0.5 bg-black border border-neutral-800 rounded text-amber-400">
            {currentTime.toFixed(2)}s / {showDuration.toFixed(2)}s
          </div>

          <div className="h-4 w-px bg-neutral-800 mx-1 hidden sm:block" />

          {/* Audio Upload & Track Selector */}
          <input
            type="file"
            ref={audioFileInputRef}
            onChange={handleTimelineAudioUpload}
            accept="audio/*,.mp3,.wav,.ogg,.aac,.flac,.m4a"
            className="hidden"
          />
          <button
            onClick={() => audioFileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 hover:text-white transition-colors cursor-pointer text-[11px]"
            title="Upload audio track (MP3, WAV, OGG) to timeline"
          >
            <Music className="w-3 h-3 text-cyan-400" />
            <span>Upload Audio</span>
          </button>

          {/* Audio Track & Preset Selector */}
          <select
            onChange={(e) => {
              if (e.target.value) {
                onLoadShowPreset(e.target.value);
                e.target.value = '';
              }
            }}
            className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-neutral-200 outline-none text-[11px] cursor-pointer max-w-[190px] truncate"
            defaultValue=""
          >
            <option value="" disabled>
              {activeTrackTitle && activeTrackTitle !== 'No Audio Loaded' ? `🎵 ${activeTrackTitle}` : 'Select Audio Track...'}
            </option>
            <option value="cosmic_awakening">✨ Cosmic Awakening (90s, 96 BPM)</option>
            <option value="neon_horizon">🌆 Neon Horizon (75s, 128 BPM)</option>
          </select>

          {/* Undo / Redo */}
          <button
            onClick={() => showManager.undo()}
            disabled={!showManager.canUndo()}
            className={`p-1 rounded text-neutral-400 ${
              showManager.canUndo() ? 'hover:bg-neutral-800 hover:text-white cursor-pointer' : 'opacity-30 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => showManager.redo()}
            disabled={!showManager.canRedo()}
            className={`p-1 rounded text-neutral-400 ${
              showManager.canRedo() ? 'hover:bg-neutral-800 hover:text-white cursor-pointer' : 'opacity-30 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Tools: Zoom, Export, Import, Clear, Inspector */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-neutral-800 rounded px-1.5 py-0.5">
            <button
              onClick={() => setZoom(Math.max(15, zoom - 10))}
              title="Zoom out timeline"
              className="p-0.5 text-neutral-400 hover:text-white cursor-pointer"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="font-mono text-[10px] text-neutral-300 min-w-10 text-center">
              {zoom}px/s
            </span>
            <button
              onClick={() => setZoom(Math.min(160, zoom + 10))}
              title="Zoom in timeline"
              className="p-0.5 text-neutral-400 hover:text-white cursor-pointer"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {/* Export button */}
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Export show as portable JSON file"
          >
            <Download className="w-3 h-3" />
            <span>Export</span>
          </button>

          {/* Hidden File Input & Import button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportJSON}
            accept=".json,.pyro.json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Import Show JSON file"
          >
            <Upload className="w-3 h-3" />
            <span>Import</span>
          </button>

          {/* Clear Cues */}
          <button
            onClick={() => {
              if (confirm('Clear all cues from timeline?')) {
                showManager.clearAllCues();
              }
            }}
            className="p-1 bg-neutral-800 hover:bg-rose-950 text-neutral-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
            title="Clear all cues"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Inspector Toggle */}
          <button
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer ${
              isInspectorOpen
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-700'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
            title="Toggle Cue Parameter Inspector"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Inspector</span>
          </button>
        </div>
      </div>

      {/* 2. Auto-Choreograph & Palette Presets Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-neutral-900/60 border-b border-neutral-800 gap-2">
        <div className="flex items-center gap-2">
          {/* Auto-Choreographer */}
          <button
            onClick={handleAutoChoreograph}
            disabled={!audioEngine?.getAudioBuffer()}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-semibold transition-all cursor-pointer ${
              audioEngine?.getAudioBuffer()
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.4)] hover:brightness-110'
                : 'bg-neutral-800 text-neutral-500 border border-neutral-700/50 cursor-not-allowed'
            }`}
            title={audioEngine?.getAudioBuffer() ? 'Auto-choreograph show from audio energy' : 'Load an audio track first'}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Auto-Choreograph</span>
          </button>

          {/* Density / Pacing Dropdown */}
          <select
            value={selectedDensity}
            onChange={(e) => setSelectedDensity(e.target.value as AutoChoreographyDensity)}
            className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-neutral-200 text-[11px] outline-none cursor-pointer"
            title="Auto-Choreography launch pacing and spacing"
          >
            <option value="sparse">Spacious (~1.4s spacing)</option>
            <option value="balanced">Balanced (~0.85s spacing)</option>
            <option value="intense">Energetic (~0.45s spacing)</option>
          </select>

          {choreographNotice && (
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-medium animate-pulse">
              ✨ {choreographNotice}
            </span>
          )}

          <div className="h-4 w-px bg-neutral-800 mx-1" />

          {/* Palette Preset Dropdown */}
          <div className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={selectedPalette}
              onChange={(e) => setSelectedPalette(e.target.value as PaletteTheme)}
              className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-neutral-200 text-[11px] outline-none cursor-pointer"
            >
              {Object.entries(PALETTE_DEFINITIONS).map(([key, def]) => (
                <option key={key} value={key}>
                  {def.label}
                </option>
              ))}
            </select>

            {/* Recolor Timeline Button */}
            <button
              onClick={handleRecolorTimeline}
              disabled={show.cues.length === 0}
              className={`px-2.5 py-1 rounded border text-[11px] font-medium transition-colors cursor-pointer ${
                show.cues.length > 0
                  ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-600 cursor-not-allowed'
              }`}
              title="Recolor all current timeline cues using selected palette"
            >
              Recolor Timeline
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Multi-Track Lanes & Waveform Area with Docked Inspector */}
      <div className="flex relative overflow-hidden" style={{ height: '300px' }}>
        {/* Track Headers (Left Static Column) */}
        <div className="w-48 flex-shrink-0 bg-neutral-950 border-r border-neutral-800 z-20 flex flex-col shadow-lg overflow-y-auto">
          {/* Waveform Lane Header */}
          <div className="h-10 px-2.5 flex items-center justify-between border-b border-neutral-800 text-[10px] text-neutral-400 uppercase tracking-wider font-semibold bg-neutral-900/50">
            <span>Audio Waveform</span>
          </div>

          {/* 6 Spatial Track Headers */}
          {TIMELINE_TRACKS.map((t) => {
            const isMuted = showManager.isTrackMuted(t.id);
            const isSoloed = showManager.isTrackSoloed(t.id);

            return (
              <div
                key={t.id}
                className="h-8 px-2 flex items-center justify-between border-b border-neutral-800/60 text-neutral-300 bg-neutral-950"
              >
                <div className="flex flex-col truncate pr-1">
                  <span className="font-medium text-[11px] truncate leading-tight">{t.label}</span>
                  <span className="text-[9px] text-neutral-500 font-mono leading-none">{t.offset}</span>
                </div>

                <div className="flex items-center gap-1">
                  {/* Mute Button */}
                  <button
                    onClick={() => showManager.toggleMute(t.id)}
                    className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-colors cursor-pointer ${
                      isMuted
                        ? 'bg-rose-950 text-rose-400 border border-rose-700'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                    title={isMuted ? 'Unmute track' : 'Mute track'}
                  >
                    M
                  </button>

                  {/* Solo Button */}
                  <button
                    onClick={() => showManager.toggleSolo(t.id)}
                    className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-colors cursor-pointer ${
                      isSoloed
                        ? 'bg-amber-500 text-black shadow-[0_0_6px_rgba(245,158,11,0.6)]'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                    title={isSoloed ? 'Clear solo' : 'Solo track'}
                  >
                    S
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable Tracks Area */}
        <div
          ref={tracksScrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-black"
        >
          <div style={{ width: `${totalTimelineWidth}px` }} className="relative min-h-full">
            {/* Waveform Lane */}
            <div className="h-10 border-b border-neutral-800/80 p-0.5 bg-black">
              <WaveformCanvas
                peaks={peaks}
                transients={transients}
                currentTime={currentTime}
                duration={showDuration}
                viewStartTime={0}
                viewEndTime={showDuration}
                onSeek={onSeek}
                height={36}
              />
            </div>

            {/* 6 Spatial Track Lanes */}
            {TIMELINE_TRACKS.map((t) => {
              const isMuted = showManager.isTrackMuted(t.id);
              const trackCues = show.cues.filter((c) => c.station === t.id);

              return (
                <div
                  key={t.id}
                  className={`h-8 relative border-b border-neutral-800/40 transition-opacity bg-neutral-950/40 hover:bg-neutral-900/20 ${
                    isMuted ? 'opacity-40' : 'opacity-100'
                  }`}
                  onDoubleClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const clickedTime = Math.max(0, clickX / zoom);
                    showManager.addCue({
                      id: `cue_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                      time: Number(clickedTime.toFixed(3)),
                      archetype: t.id === 'fan' ? 'finale_barrage' : 'peony',
                      station: t.id,
                      color: '#ffd700',
                      altitude: 0.85,
                      launchAngle: t.defaultAngle,
                      duration: 2.2,
                    });
                  }}
                  title={`Track: ${t.label} (Double-click to drop cue)`}
                >
                  {/* Grid Lines per second */}
                  {Array.from({ length: Math.ceil(showDuration / 5) }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-px bg-neutral-900 pointer-events-none"
                      style={{ left: `${i * 5 * zoom}px` }}
                    />
                  ))}

                  {/* Cues on this track */}
                  {trackCues.map((c) => {
                    const leftPx = c.time * zoom;
                    const isSelected = c.id === selectedCueId;

                    return (
                      <div
                        key={c.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          showManager.selectCue(c.id, e.shiftKey);
                        }}
                        className={`absolute top-1 bottom-1 px-1.5 rounded flex items-center justify-center gap-1 cursor-pointer truncate transition-all text-[10px] select-none ${
                          isSelected
                            ? 'ring-2 ring-white z-20 brightness-125 shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                            : 'hover:brightness-110 z-10'
                        }`}
                        style={{
                          left: `${leftPx}px`,
                          backgroundColor: c.color,
                          color: '#000000',
                          minWidth: '40px',
                        }}
                        title={`${c.archetype.replace(/_/g, ' ')} @ ${c.time.toFixed(2)}s (${c.station})`}
                      >
                        <span className="font-bold uppercase tracking-tight text-[9px] truncate">
                          {c.archetype.substring(0, 3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Playhead Scrubber Line spanning all tracks */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none"
              style={{ left: `${currentTime * zoom}px` }}
            >
              <div className="w-2.5 h-2.5 -ml-[4px] bg-rose-500 rotate-45 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
            </div>
          </div>
        </div>

        {/* Docked Cue Inspector Panel (Fixed width, vertical scrolling, no clipping) */}
        {isInspectorOpen && (
          <div className="w-80 flex-shrink-0 bg-neutral-950/95 border-l border-neutral-800 z-40 overflow-y-auto max-h-[260px] p-2 flex flex-col shadow-2xl">
            <CueInspector
              cue={selectedCue}
              onUpdate={(patch) => {
                if (selectedCue) showManager.updateCue(selectedCue.id, patch);
              }}
              onDelete={() => {
                if (selectedCue) showManager.removeCue(selectedCue.id);
              }}
              onDuplicate={() => {
                if (selectedCue) {
                  showManager.addCue({
                    ...selectedCue,
                    id: `cue_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    time: Number((selectedCue.time + 0.5).toFixed(3)),
                  });
                }
              }}
              onClose={() => setIsInspectorOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
