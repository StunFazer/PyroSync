/**
 * PyroSync Macro Brushes Toolbar
 * Rapid choreography authoring triggers for sweeps, alternating mines,
 * grand finale barrages, and 1-click auto-choreographer.
 * Conforming to ORIGINAL_REQUEST.md §R4, AC-8, and PROJECT.md §Feature Inventory #40-#43.
 */

import React from 'react';
import { MacroBrushType } from '../../types';
import { Wand2, Zap, Waves, Sparkles, Flame } from 'lucide-react';

interface MacroBrushesBarProps {
  onApplyBrush: (type: MacroBrushType) => void;
  onAutoChoreograph: () => void;
  isAudioLoaded: boolean;
}

export const MacroBrushesBar: React.FC<MacroBrushesBarProps> = ({
  onApplyBrush,
  onAutoChoreograph,
  isAudioLoaded,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-neutral-950 border-t border-b border-neutral-800 text-xs select-none">
      {/* 1-Click Auto-Choreographer */}
      <button
        onClick={onAutoChoreograph}
        disabled={!isAudioLoaded}
        className={`flex items-center gap-1.5 px-3 py-1 rounded font-semibold transition-all ${
          isAudioLoaded
            ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.4)] hover:brightness-110 cursor-pointer'
            : 'bg-neutral-900 text-neutral-600 border border-neutral-800 cursor-not-allowed'
        }`}
        title={isAudioLoaded ? 'Generate show automatically from audio' : 'Load an audio track first'}
      >
        <Wand2 className="w-3.5 h-3.5" />
        <span>1-Click Auto-Choreograph</span>
      </button>

      <div className="h-4 w-px bg-neutral-800 mx-1" />

      {/* Sweep L->R */}
      <button
        onClick={() => onApplyBrush('sweep_left_to_right')}
        className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-300 hover:text-white transition-colors cursor-pointer"
        title="Fan Sweep: Left to Right across 5 stations"
      >
        <Waves className="w-3 h-3 text-cyan-400" />
        <span>Sweep L→R</span>
      </button>

      {/* Sweep R->L */}
      <button
        onClick={() => onApplyBrush('sweep_right_to_left')}
        className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-300 hover:text-white transition-colors cursor-pointer"
        title="Fan Sweep: Right to Left across 5 stations"
      >
        <Waves className="w-3 h-3 text-cyan-400 rotate-180" />
        <span>Sweep R→L</span>
      </button>

      {/* Sweep Center-Out */}
      <button
        onClick={() => onApplyBrush('sweep_center_out')}
        className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-300 hover:text-white transition-colors cursor-pointer"
        title="Fan Sweep: Center Outward in 3 waves"
      >
        <Zap className="w-3 h-3 text-amber-400" />
        <span>Center-Out</span>
      </button>

      {/* Alternating Mines */}
      <button
        onClick={() => onApplyBrush('alternating_mines')}
        className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-300 hover:text-white transition-colors cursor-pointer"
        title="Alternating Ground Mines on musical beats"
      >
        <Flame className="w-3 h-3 text-rose-400" />
        <span>Alternating Mines</span>
      </button>

      {/* Grand Finale Barrage */}
      <button
        onClick={() => onApplyBrush('grand_finale_barrage')}
        className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-300 hover:text-white transition-colors cursor-pointer"
        title="Grand Finale Barrage crescendo & 6-station salvo"
      >
        <Sparkles className="w-3 h-3 text-emerald-400" />
        <span>Grand Finale</span>
      </button>

      {/* Hotkey Cheat Sheet */}
      <div className="ml-auto hidden xl:flex items-center gap-2 text-[10px] text-neutral-500 font-mono">
        <span>HOTKEYS: [1-6] STATIONS</span>
        <span>|</span>
        <span>[7-9] MACROS</span>
        <span>|</span>
        <span>[F] FULLSCREEN</span>
        <span>|</span>
        <span>[ESC/SPACE] PANIC</span>
      </div>
    </div>
  );
};
