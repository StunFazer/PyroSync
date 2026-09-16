/**
 * PyroSync Cue Inspector Panel
 * Precise editing and validation for selected cue parameters
 * (archetype, station, timestamp, color, altitude, launch angle, duration).
 * Conforming to ORIGINAL_REQUEST.md §R4 and PROJECT.md §Feature Inventory #45.
 */

import React from 'react';
import { ShowJSONCue, ShellArchetype, LaunchStation } from '../../types';
import { Trash2, Copy, X, Sliders } from 'lucide-react';

interface CueInspectorProps {
  cue: ShowJSONCue | null;
  onUpdate: (patch: Partial<ShowJSONCue>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClose: () => void;
}

const ARCHETYPES: ShellArchetype[] = [
  'peony',
  'heart_shape',
  'double_ring',
  'diamond_shape',
  'butterfly',
  'chrysanthemum',
  'willow',
  'weeping_willow',
  'brocade_crown',
  'rings',
  'star_shape',
  'saturn_ring',
  'spiral',
  'palm_tree',
  'strobe',
  'crossette',
  'crackle',
  'ground_mine',
  'whistling_comet',
  'horsetail',
  'finale_barrage',
  'multi_break',
];

const STATIONS: { id: LaunchStation; label: string }[] = [
  { id: 'far_left', label: 'Far Left Flank (-0.95)' },
  { id: 'mid_left', label: 'Mid Left (-0.60)' },
  { id: 'left_center', label: 'Left Center (-0.30)' },
  { id: 'center', label: 'Center Stage (0.00)' },
  { id: 'right_center', label: 'Right Center (+0.30)' },
  { id: 'mid_right', label: 'Mid Right (+0.60)' },
  { id: 'far_right', label: 'Far Right Flank (+0.95)' },
  { id: 'fan', label: 'Fan Array (Wide)' },
];

const PRESET_SWATCHES = [
  '#ffd700', // Gold
  '#ff2244', // Ruby / Crimson
  '#06b6d4', // Cyan
  '#f43f5e', // Rose / Magenta
  '#10b981', // Emerald
  '#a855f7', // Purple
  '#f97316', // Orange
  '#ffffff', // Pure White
];

export const CueInspector: React.FC<CueInspectorProps> = ({
  cue,
  onUpdate,
  onDelete,
  onDuplicate,
  onClose,
}) => {
  if (!cue) {
    return (
      <div className="p-3 text-[11px] text-neutral-500 bg-neutral-950/90 border border-neutral-800 rounded-lg flex items-center justify-center gap-2 backdrop-blur-md">
        <Sliders className="w-3.5 h-3.5 text-neutral-600" />
        <span>Select a cue on the timeline to inspect parameters</span>
      </div>
    );
  }

  const isValidHex = (c: string) => /^#[0-9A-Fa-f]{6}$/.test(c);

  return (
    <div className="p-3 bg-neutral-950/95 border border-neutral-800 rounded-lg text-xs shadow-2xl backdrop-blur-md flex flex-col gap-2.5 w-72 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-full border border-neutral-700 shadow-sm"
            style={{ backgroundColor: cue.color }}
          />
          <span className="font-semibold text-neutral-200 uppercase tracking-wider text-[11px]">
            Cue Inspector
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onDuplicate}
            title="Duplicate cue (+0.5s)"
            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            title="Delete cue"
            className="p-1 hover:bg-rose-950 rounded text-rose-400 hover:text-rose-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            title="Close inspector"
            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Timestamp */}
      <div className="flex items-center justify-between">
        <span className="text-neutral-400 text-[11px]">Timestamp:</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.05"
            min="0"
            value={cue.time}
            onChange={(e) => onUpdate({ time: Math.max(0, parseFloat(e.target.value) || 0) })}
            className="w-24 px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded font-mono text-amber-400 text-right focus:border-amber-500 outline-none text-[11px]"
          />
          <span className="text-neutral-500 text-[10px]">sec</span>
        </div>
      </div>

      {/* Archetype Selector */}
      <div className="flex items-center justify-between">
        <span className="text-neutral-400 text-[11px]">Archetype:</span>
        <select
          value={cue.archetype}
          onChange={(e) => onUpdate({ archetype: e.target.value as ShellArchetype })}
          className="w-36 px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:border-cyan-500 outline-none capitalize text-[11px]"
        >
          {ARCHETYPES.map((a) => (
            <option key={a} value={a}>
              {a.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Station Selector */}
      <div className="flex items-center justify-between">
        <span className="text-neutral-400 text-[11px]">Launch Station:</span>
        <select
          value={cue.station}
          onChange={(e) => onUpdate({ station: e.target.value as LaunchStation })}
          className="w-36 px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:border-cyan-500 outline-none text-[11px]"
        >
          {STATIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Color Hex & Swatches */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-neutral-400 text-[11px]">Color Palette:</span>
          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded border border-neutral-700"
              style={{ backgroundColor: cue.color }}
            />
            <input
              type="text"
              value={cue.color}
              onChange={(e) => {
                const val = e.target.value;
                if (isValidHex(val)) onUpdate({ color: val });
              }}
              className="w-20 px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 rounded font-mono text-neutral-200 text-center uppercase focus:border-cyan-500 outline-none text-[11px]"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-1 pt-0.5">
          {PRESET_SWATCHES.map((hex) => (
            <button
              key={hex}
              onClick={() => onUpdate({ color: hex })}
              className={`w-5 h-5 rounded border transition-transform ${
                cue.color.toLowerCase() === hex.toLowerCase()
                  ? 'border-white scale-110 shadow-sm'
                  : 'border-neutral-700 hover:scale-105'
              }`}
              style={{ backgroundColor: hex }}
              title={hex}
            />
          ))}
        </div>
      </div>

      {/* Altitude Slider [0.20, 1.00] */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-neutral-400">
            Altitude {cue.archetype === 'ground_mine' && '(Origin: y=0)'}:
          </span>
          <span className="font-mono text-cyan-400">{Math.round(cue.altitude * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.20"
          max="1.00"
          step="0.01"
          value={cue.altitude}
          onChange={(e) =>
            onUpdate({ altitude: Math.max(0.2, Math.min(1.0, parseFloat(e.target.value))) })
          }
          className="w-full h-1 bg-neutral-800 rounded accent-cyan-400 cursor-pointer"
        />
      </div>

      {/* Launch Angle Slider [-45°, +45°] */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-neutral-400">Launch Angle Offset:</span>
          <span className="font-mono text-cyan-400">{cue.launchAngle ?? 0}°</span>
        </div>
        <input
          type="range"
          min="-45"
          max="45"
          step="1"
          value={cue.launchAngle ?? 0}
          onChange={(e) =>
            onUpdate({
              launchAngle: Math.max(-45, Math.min(45, parseInt(e.target.value, 10))),
            })
          }
          className="w-full h-1 bg-neutral-800 rounded accent-cyan-400 cursor-pointer"
        />
      </div>

      {/* Duration [0.5s, 10.0s] */}
      <div className="flex items-center justify-between">
        <span className="text-neutral-400 text-[11px]">Duration:</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.1"
            min="0.5"
            max="10.0"
            value={cue.duration ?? 2.2}
            onChange={(e) =>
              onUpdate({
                duration: Math.max(0.5, Math.min(10.0, parseFloat(e.target.value) || 2.2)),
              })
            }
            className="w-20 px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded font-mono text-neutral-200 text-right focus:border-cyan-500 outline-none text-[11px]"
          />
          <span className="text-neutral-500 text-[10px]">sec</span>
        </div>
      </div>
    </div>
  );
};
