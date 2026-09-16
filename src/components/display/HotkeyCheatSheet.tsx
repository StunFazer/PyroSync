/**
 * PyroSync Hotkey Cheat Sheet Modal
 * Displays comprehensive operator hotkey shortcuts for live performance and programming.
 */

import React from 'react';
import { X, Keyboard, Sparkles } from 'lucide-react';

interface HotkeyCheatSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutCategory {
  category: string;
  shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutCategory[] = [
  {
    category: 'Playback & Display',
    shortcuts: [
      { keys: ['Space'], description: 'Play / Pause timeline playback' },
      { keys: ['Esc'], description: 'Instant Emergency Blackout (Clear all particles)' },
      { keys: ['F'], description: 'Toggle Clean Projection Fullscreen' },
      { keys: ['P'], description: 'Toggle Projector Calibration Panel' },
      { keys: ['? / H'], description: 'Toggle this Hotkeys Cheat Sheet' },
    ],
  },
  {
    category: 'Live Shell Firing & Tap-to-Record (1-9, 0)',
    shortcuts: [
      { keys: ['1'], description: 'Fire / Record Peony' },
      { keys: ['2'], description: 'Fire / Record Chrysanthemum' },
      { keys: ['3'], description: 'Fire / Record Willow' },
      { keys: ['4'], description: 'Fire / Record Weeping Willow' },
      { keys: ['5'], description: 'Fire / Record Brocade Crown' },
      { keys: ['6'], description: 'Fire / Record Rings / Saturn Ring' },
      { keys: ['7'], description: 'Fire / Record Star Shape' },
      { keys: ['8'], description: 'Fire / Record Strobe Flash' },
      { keys: ['9'], description: 'Fire / Record Dragon Eggs (Crackle)' },
      { keys: ['0'], description: 'Fire / Record Ground Mine' },
    ],
  },
  {
    category: 'Specialty Shells & Timeline Controls',
    shortcuts: [
      { keys: ['Q'], description: 'Fire / Record Palm Tree' },
      { keys: ['W'], description: 'Fire / Record Spiral Galaxy' },
      { keys: ['E'], description: 'Fire / Record Crossette' },
      { keys: ['R'], description: 'Fire / Record Whistling Comet' },
      { keys: ['T'], description: 'Fire / Record Horsetail Waterfall' },
      { keys: ['Y'], description: 'Fire / Record Finale Barrage Salvo' },
      { keys: ['Delete', 'Backspace'], description: 'Delete selected cue' },
      { keys: ['D'], description: 'Duplicate selected cue (+0.5s)' },
      { keys: ['Ctrl + Z'], description: 'Undo last timeline edit' },
      { keys: ['Ctrl + Y'], description: 'Redo timeline edit' },
    ],
  },
];

export const HotkeyCheatSheet: React.FC<HotkeyCheatSheetProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl max-w-2xl w-full mx-4 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-neutral-100 text-sm tracking-wide">
              Operator Keyboard Shortcuts & Hotkeys
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Body */}
        <div className="p-5 overflow-y-auto flex flex-col gap-5 text-xs">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.category} className="flex flex-col gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5 border-b border-neutral-800/80 pb-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{group.category}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {group.shortcuts.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-neutral-900/50 border border-neutral-800/60 hover:border-neutral-700 transition-colors"
                  >
                    <span className="text-neutral-300 text-[11px]">{item.description}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-2 py-0.5 bg-neutral-800 text-neutral-200 border border-neutral-700 rounded font-mono text-[10px] shadow-sm font-semibold"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-900/40 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Tip: Tap number keys 1–9 or Q-Y during playback to live-record cues onto spatial tracks.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-md font-medium transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
