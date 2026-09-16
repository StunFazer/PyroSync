import React from 'react';
import { Volume2, VolumeX, Sparkles, Bomb, Zap } from 'lucide-react';
import { ProceduralSFXType } from '../../types';

interface SFXControlsProps {
  isMuted: boolean;
  volume: number;
  onToggleMute: () => void;
  onVolumeChange: (vol: number) => void;
  onPlayPreview: (type: ProceduralSFXType) => void;
}

export const SFXControls: React.FC<SFXControlsProps> = ({
  isMuted,
  volume,
  onToggleMute,
  onVolumeChange,
  onPlayPreview,
}) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onVolumeChange(val);
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-neutral-950/90 border border-neutral-800 rounded-lg text-xs shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold uppercase tracking-wider text-neutral-300 text-[11px]">
            Procedural Sound FX
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider ${
              isMuted
                ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
            }`}
          >
            {isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}
          </span>
        </div>

        <button
          onClick={onToggleMute}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors font-medium ${
            isMuted
              ? 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/40'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
          }`}
          title={isMuted ? 'Unmute procedural sound FX' : 'Mute procedural sound FX'}
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              <span>Unmute</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mute</span>
            </>
          )}
        </button>
      </div>

      {/* Volume Slider */}
      <div className="flex items-center gap-3 pt-1">
        <span className="text-neutral-400 text-[11px] w-12 font-mono">Master</span>
        <input
          type="range"
          min="0.0"
          max="1.0"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={handleSliderChange}
          className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          title="Master Procedural Sound FX Volume"
        />
        <span className="w-9 text-right font-mono text-neutral-300 text-[11px]">
          {Math.round((isMuted ? 0 : volume) * 100)}%
        </span>
      </div>

      {/* Audition Preview Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-neutral-500 text-[10px] uppercase tracking-wider">Audition:</span>
        <button
          onClick={() => onPlayPreview('launch')}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 border border-neutral-800 rounded text-neutral-300 text-[11px] transition-colors"
          title="Audition synthesized launch mortar thump"
        >
          <Zap className="w-3 h-3 text-amber-400" />
          <span>Thump</span>
        </button>
        <button
          onClick={() => onPlayPreview('boom')}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 border border-neutral-800 rounded text-neutral-300 text-[11px] transition-colors"
          title="Audition synthesized aerial explosion boom"
        >
          <Bomb className="w-3 h-3 text-rose-400" />
          <span>Boom</span>
        </button>
        <button
          onClick={() => onPlayPreview('crackle')}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 border border-neutral-800 rounded text-neutral-300 text-[11px] transition-colors"
          title="Audition synthesized dragon egg crackle"
        >
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Crackle</span>
        </button>
      </div>
    </div>
  );
};
