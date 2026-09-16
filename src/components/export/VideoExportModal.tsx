import React from 'react';
import { Video, X, Check, Disc, Volume2, Music, Sparkles, Monitor, Tv, Gauge } from 'lucide-react';
import { VideoAudioMixMode, VideoResolutionPreset } from '../../engine/export/VideoRecorder';

interface VideoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRecording: boolean;
  elapsedSeconds: number;
  audioMixMode: VideoAudioMixMode;
  onAudioMixModeChange: (mode: VideoAudioMixMode) => void;
  resolutionPreset: VideoResolutionPreset;
  onResolutionPresetChange: (preset: VideoResolutionPreset) => void;
  syncWithPlayback: boolean;
  onSyncWithPlaybackChange: (sync: boolean) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export const VideoExportModal: React.FC<VideoExportModalProps> = ({
  isOpen,
  onClose,
  isRecording,
  elapsedSeconds,
  audioMixMode,
  onAudioMixModeChange,
  resolutionPreset,
  onResolutionPresetChange,
  syncWithPlayback,
  onSyncWithPlaybackChange,
  onStartRecording,
  onStopRecording,
}) => {
  if (!isOpen) return null;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-semibold tracking-wide text-neutral-100">
              Export Show as Video
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-4">
          {/* Active Recording Status Banner */}
          {isRecording ? (
            <div className="flex items-center justify-between p-3 bg-rose-950/70 border border-rose-800/80 rounded-lg text-rose-200">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
                    Recording Live
                  </span>
                  <span className="font-mono text-base font-bold text-white">
                    {formatTimer(elapsedSeconds)}
                  </span>
                </div>
              </div>
              <button
                onClick={onStopRecording}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold tracking-wide transition-colors cursor-pointer shadow-lg"
              >
                Stop & Download
              </button>
            </div>
          ) : (
            <>
              {/* Audio Mix Mode Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Audio Channels to Include</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => onAudioMixModeChange('full')}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      audioMixMode === 'full'
                        ? 'bg-amber-950/40 border-amber-500/80 text-amber-200'
                        : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Disc className="w-4 h-4 text-amber-400" />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">Full Mix (Soundtrack + Sound FX)</span>
                        <span className="text-[10px] text-neutral-400">
                          Music track combined with mortar launch thumps and burst booms
                        </span>
                      </div>
                    </div>
                    {audioMixMode === 'full' && <Check className="w-4 h-4 text-amber-400" />}
                  </button>

                  <button
                    onClick={() => onAudioMixModeChange('music_only')}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      audioMixMode === 'music_only'
                        ? 'bg-amber-950/40 border-amber-500/80 text-amber-200'
                        : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-cyan-400" />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">Music Soundtrack Only</span>
                        <span className="text-[10px] text-neutral-400">
                          Only the background music track without pyrotechnic explosions
                        </span>
                      </div>
                    </div>
                    {audioMixMode === 'music_only' && <Check className="w-4 h-4 text-amber-400" />}
                  </button>

                  <button
                    onClick={() => onAudioMixModeChange('sfx_only')}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      audioMixMode === 'sfx_only'
                        ? 'bg-amber-950/40 border-amber-500/80 text-amber-200'
                        : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-rose-400" />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">Procedural Pyrotechnic SFX Only</span>
                        <span className="text-[10px] text-neutral-400">
                          Launch thumps, aerial reports, and dragon eggs crackles
                        </span>
                      </div>
                    </div>
                    {audioMixMode === 'sfx_only' && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                </div>
              </div>

              {/* Resolution / Quality Presets */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-rose-400" />
                    <span>Recording Resolution & Quality</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-normal lowercase">Eliminates dropped frames</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => onResolutionPresetChange('1080p')}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      resolutionPreset === '1080p'
                        ? 'bg-rose-950/40 border-rose-500/80 text-rose-200'
                        : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Tv className="w-4 h-4 text-rose-400" />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold">1080p Full HD (1920×1080)</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded">
                            Recommended
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-400">
                          Silky-smooth 60 FPS recording with crisp particle trails and balanced encoder load
                        </span>
                      </div>
                    </div>
                    {resolutionPreset === '1080p' && <Check className="w-4 h-4 text-rose-400" />}
                  </button>

                  <button
                    onClick={() => onResolutionPresetChange('720p')}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      resolutionPreset === '720p'
                        ? 'bg-rose-950/40 border-rose-500/80 text-rose-200'
                        : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-emerald-400" />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold">720p Fast Performance (1280×720)</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">
                            Zero Lag
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-400">
                          Lightest GPU/CPU encoding footprint, guaranteed zero stutter even during massive finales
                        </span>
                      </div>
                    </div>
                    {resolutionPreset === '720p' && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>

                  <button
                    onClick={() => onResolutionPresetChange('native')}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      resolutionPreset === 'native'
                        ? 'bg-rose-950/40 border-rose-500/80 text-rose-200'
                        : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-cyan-400" />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">Native Viewport Resolution</span>
                        <span className="text-[10px] text-neutral-400">
                          Captures exact display pixels (e.g. 1440p/4K). Requires powerful GPU encoder.
                        </span>
                      </div>
                    </div>
                    {resolutionPreset === 'native' && <Check className="w-4 h-4 text-cyan-400" />}
                  </button>
                </div>
              </div>

              {/* Sync with Playback Checkbox */}
              <label className="flex items-start gap-2.5 p-2.5 bg-neutral-900/50 border border-neutral-800 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncWithPlayback}
                  onChange={(e) => onSyncWithPlaybackChange(e.target.checked)}
                  className="mt-0.5 rounded accent-rose-500 cursor-pointer"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-medium text-neutral-200">
                    Sync Automatically with Timeline Playback
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Starts recording from 00:00 when playback begins, and automatically stops and saves when the track duration finishes or pauses.
                  </span>
                </div>
              </label>

              {/* Recording Specs Information */}
              <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
                <span>
                  Preset: {resolutionPreset === '1080p' ? '1920×1080 Full HD' : resolutionPreset === '720p' ? '1280×720 HD' : 'Native Viewport'} (60 FPS)
                </span>
                <span className="font-mono text-emerald-400">
                  {resolutionPreset === '720p' ? '4.5 Mbps' : resolutionPreset === '1080p' ? '8.0 Mbps' : '10.0 Mbps'} Bitrate
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-800 bg-neutral-900/40">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>

          {!isRecording ? (
            <button
              onClick={() => {
                onStartRecording();
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-[0_0_12px_rgba(225,29,72,0.4)] cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>{syncWithPlayback ? 'Record & Play Show' : 'Start Recording Now'}</span>
            </button>
          ) : (
            <button
              onClick={onStopRecording}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Stop & Download Video
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
