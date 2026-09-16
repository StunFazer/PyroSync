import React from 'react';
import { Maximize2, Minimize2, Sparkles, ExternalLink, Radio, Keyboard, Eye, EyeOff, Video } from 'lucide-react';
import { SimulationStats } from '../../types';
import { ProjectorSyncStatus } from './ProjectorSyncStatus';

interface PanicBarProps {
  stats: SimulationStats;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenCalibration: () => void;
  isCalibrationOpen: boolean;
  // Consolidated controls
  isProjectorConnected: boolean;
  projectorLatency: number | null;
  onOpenProjector: () => void;
  isLocalPreviewSuspended: boolean;
  onTogglePreview: () => void;
  isAudioDrawerOpen: boolean;
  onToggleAudioDrawer: () => void;
  onOpenHotkeys: () => void;
  timecodeText: string;
  // Video Export
  isRecordingVideo?: boolean;
  recordingElapsedSeconds?: number;
  onOpenVideoExport?: () => void;
}

export const PanicBar: React.FC<PanicBarProps> = ({
  stats,
  isFullscreen,
  onToggleFullscreen,
  onOpenCalibration,
  isCalibrationOpen,
  isProjectorConnected,
  projectorLatency,
  onOpenProjector,
  isLocalPreviewSuspended,
  onTogglePreview,
  isAudioDrawerOpen,
  onToggleAudioDrawer,
  onOpenHotkeys,
  timecodeText,
  isRecordingVideo = false,
  recordingElapsedSeconds = 0,
  onOpenVideoExport,
}) => {
  return (
    <header className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800 text-neutral-200 select-none z-30 gap-2 min-h-[44px]">
      {/* 1. Brand & Telemetry Cluster */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
          <span className="font-bold text-sm tracking-wider uppercase bg-gradient-to-r from-amber-400 via-rose-400 to-cyan-400 bg-clip-text text-transparent">
            PyroSync
          </span>
        </div>

        {/* Streamlined Live HUD */}
        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-neutral-800 text-xs font-mono">
          <div className="flex items-center gap-1">
            <span className="text-neutral-500">FPS</span>
            <span
              className={`font-semibold ${
                stats.fps >= 55 ? 'text-emerald-400' : stats.fps >= 40 ? 'text-amber-400' : 'text-rose-500'
              }`}
            >
              {stats.fps}
            </span>
          </div>

          <div className="h-3 w-px bg-neutral-800 hidden md:block" />

          <div className="hidden md:flex items-center gap-1">
            <span className="text-cyan-400 font-semibold">
              {stats.activeParticles.toLocaleString()}
            </span>
            <span className="text-neutral-500">stars</span>
          </div>
        </div>

        {/* Timecode Badge */}
        <div className="flex items-center gap-1.5 bg-black/80 border border-neutral-800 px-2 py-0.5 rounded text-xs font-mono text-amber-400">
          <span className="text-neutral-500 text-[10px]">TC</span>
          <span>{timecodeText}</span>
        </div>
      </div>

      {/* 2. Unified Operator Controls Cluster (No Screen Split) */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Projector Sync Status & Pop-out */}
        <ProjectorSyncStatus
          isConnected={isProjectorConnected}
          latencyMs={projectorLatency}
          onOpenProjector={onOpenProjector}
          showLaunchButton={false}
        />

        <button
          onClick={onOpenProjector}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/60 text-amber-400 hover:text-amber-300 rounded text-xs font-medium transition-colors cursor-pointer"
          title="Open secondary projector canvas window (1920x1080)"
          data-testid="popout-projector-btn"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Pop-Out</span>
        </button>

        {/* Local Preview GPU Offload Toggle */}
        <button
          onClick={onTogglePreview}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
            isLocalPreviewSuspended
              ? 'bg-amber-950/80 border-amber-600/80 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
              : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-neutral-300'
          }`}
          title={
            isLocalPreviewSuspended
              ? 'Preview suspended (0% GPU). Click to resume local rendering.'
              : 'Turn off local preview to save GPU resources when output window is active.'
          }
          data-testid="toggle-preview-btn"
        >
          {isLocalPreviewSuspended ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Preview Off</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden md:inline">Preview On</span>
            </>
          )}
        </button>

        <div className="h-4 w-px bg-neutral-800 mx-0.5 hidden sm:block" />

        {/* Audio & Sync Drawer Toggle */}
        <button
          onClick={onToggleAudioDrawer}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-colors cursor-pointer ${
            isAudioDrawerOpen
              ? 'bg-cyan-950/80 border-cyan-700/80 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
              : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-neutral-300'
          }`}
          title="Open Audio & Pyromusical Sync Control Panel"
        >
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          <span>Audio</span>
        </button>

        {/* Video Export Button */}
        {onOpenVideoExport && (
          <button
            onClick={onOpenVideoExport}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
              isRecordingVideo
                ? 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse'
                : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white'
            }`}
            title="Export show as high-quality video with synchronized audio"
            data-testid="export-video-btn"
          >
            <Video className={`w-3.5 h-3.5 ${isRecordingVideo ? 'text-rose-400' : 'text-rose-500'}`} />
            <span>
              {isRecordingVideo
                ? `REC ${Math.floor(recordingElapsedSeconds)}s`
                : 'Export Video'}
            </span>
          </button>
        )}

        {/* Projector Calibration Toggle */}
        <button
          onClick={onOpenCalibration}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
            isCalibrationOpen
              ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
              : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-neutral-300'
          }`}
          title="Open Projector Calibration Panel"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Calibration</span>
        </button>

        {/* Hotkeys Cheat Sheet */}
        <button
          onClick={onOpenHotkeys}
          className="flex items-center gap-1 px-2 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer"
          title="Keyboard Hotkeys [?] (Esc = Blackout, F = Fullscreen, Space = Play/Pause)"
        >
          <Keyboard className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline">Keys</span>
        </button>

        {/* Fullscreen Presentation Mode ('F') */}
        <button
          onClick={onToggleFullscreen}
          className="flex items-center gap-1 px-2 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 rounded text-xs font-medium transition-colors cursor-pointer"
          title="Presentation Mode [F]"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
