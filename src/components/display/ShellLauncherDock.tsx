import React, { useState } from 'react';
import {
  Flame,
  Zap,
  CircleDot,
  Compass,
  Sparkles,
  Bomb,
  Layers,
  Wind,
  Waves,
  Rocket,
  Crown,
  FastForward,
} from 'lucide-react';
import { FireCuePayload, LaunchStation, ShellArchetype } from '../../types';

interface ShellLauncherDockProps {
  onFire: (cue: FireCuePayload) => void;
  onFireStressTest: () => void;
}

interface ArchetypeDef {
  type: ShellArchetype;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const ARCHETYPES: ArchetypeDef[] = [
  { type: 'peony', label: 'Peony', icon: CircleDot, description: 'Spherical 3D burst, uniform velocity, clean break' },
  { type: 'heart_shape', label: 'Heart', icon: Sparkles, description: 'Parametric cardioid with glowing perimeter and golden core' },
  { type: 'double_ring', label: 'Double Ring', icon: Compass, description: '3D orthogonal interlocking rings in contrasting dual colors' },
  { type: 'diamond_shape', label: 'Diamond', icon: Layers, description: '3D faceted octahedron/rhombus cardinal star break' },
  { type: 'butterfly', label: 'Butterfly', icon: Wind, description: 'Bilateral flapping wings with trailing strobe micro-sparks' },
  { type: 'chrysanthemum', label: 'Chrysanthemum', icon: Sparkles, description: 'Spherical burst leaving persistent gold trails' },
  { type: 'willow', label: 'Willow', icon: Waves, description: 'Cascading gold/silver trails with heavy gravity droop' },
  { type: 'weeping_willow', label: 'Kamuro Willow', icon: Waves, description: 'Dense cascading gold canopy fading into glittering ghost-silver tips' },
  { type: 'brocade_crown', label: 'Brocade Crown', icon: Crown, description: 'Dense golden/silver branching canopy with long hang' },
  { type: 'rings', label: 'Rings', icon: Compass, description: 'Planar concentric rings in 3D toroidal plane' },
  { type: 'saturn_ring', label: 'Saturn Ring', icon: Compass, description: 'Central spherical core surrounded by tilted orbital ring' },
  { type: 'star_shape', label: 'Star Shape', icon: Sparkles, description: 'Geometric 5-pointed pyrotechnic star' },
  { type: 'spiral', label: 'Spiral Galaxy', icon: FastForward, description: 'Spinning logarithmic dual spiral galaxy burst' },
  { type: 'palm_tree', label: 'Palm Tree', icon: Flame, description: 'Thick rising trunk blooming into drooping coconut fronds' },
  { type: 'strobe', label: 'Strobe Flash', icon: Zap, description: 'Stars pulsating & flashing at 10 Hz' },
  { type: 'crossette', label: 'Crossette', icon: Layers, description: 'Stars expand then fracture into 4 perpendicular crosses' },
  { type: 'crackle', label: 'Dragon Eggs', icon: Bomb, description: 'Granules detonating with sharp visual micro-flashes' },
  { type: 'ground_mine', label: 'Ground Mine', icon: Flame, description: 'Instant explosive vertical fountain from ground y=0' },
  { type: 'whistling_comet', label: 'Whistling Comet', icon: Rocket, description: 'Ascending spiraling corkscrew trail with apex break' },
  { type: 'horsetail', label: 'Horsetail Waterfall', icon: Wind, description: 'Compact apex burst falling in cascading curtain' },
  { type: 'finale_barrage', label: 'Finale Barrage', icon: FastForward, description: 'Rapid staggered salvo sequence across stations' },
  { type: 'multi_break', label: 'Multi-Break', icon: Sparkles, description: '2-stage salute: floral break detonating into secondary rings & dragon eggs' },
];

const STATIONS: { id: LaunchStation; label: string; offset: string }[] = [
  { id: 'far_left', label: 'Far Left', offset: '-38m' },
  { id: 'mid_left', label: 'Mid Left', offset: '-24m' },
  { id: 'left_center', label: 'L-Center', offset: '-12m' },
  { id: 'center', label: 'Center', offset: '0m' },
  { id: 'right_center', label: 'R-Center', offset: '+12m' },
  { id: 'mid_right', label: 'Mid Right', offset: '+24m' },
  { id: 'far_right', label: 'Far Right', offset: '+38m' },
  { id: 'fan', label: 'Fan Array', offset: 'All' },
];

const COLOR_PALETTES = [
  { label: 'Gold Sparkle', hex: '#ffd700' },
  { label: 'Ruby Crimson', hex: '#ff2244' },
  { label: 'Emerald Sky', hex: '#11dd66' },
  { label: 'Cobalt Blue', hex: '#2277ff' },
  { label: 'Royal Violet', hex: '#a855f7' },
  { label: 'Neon Cyan', hex: '#00f0ff' },
  { label: 'Neon Magenta', hex: '#ff007f' },
  { label: 'Electric Lime', hex: '#00ff66' },
  { label: 'Sunset Coral', hex: '#ff5500' },
  { label: 'Aurora Teal', hex: '#00ffcc' },
  { label: 'Cosmic Purple', hex: '#9d4edd' },
  { label: 'Arctic Ice White', hex: '#ffffff' },
];

export const ShellLauncherDock: React.FC<ShellLauncherDockProps> = ({
  onFire,
  onFireStressTest,
}) => {
  const [selectedStation, setSelectedStation] = useState<LaunchStation>('center');
  const [selectedColor, setSelectedColor] = useState<string>('#ffd700');
  const [altitude, setAltitude] = useState<number>(0.85);
  const [launchAngle, setLaunchAngle] = useState<number>(0);

  const handleFireArchetype = (archetype: ShellArchetype) => {
    if (selectedStation === 'fan') {
      // Fan array fires across all 7 stations in rapid succession
      const stations: LaunchStation[] = ['far_left', 'mid_left', 'left_center', 'center', 'right_center', 'mid_right', 'far_right'];
      stations.forEach((st, idx) => {
        setTimeout(() => {
          onFire({
            id: `fan_${Date.now()}_${idx}`,
            archetype,
            station: st,
            color: selectedColor,
            altitude: altitude + (idx % 2 === 0 ? 0.05 : -0.05),
            launchAngle: (idx - 3) * 8,
          });
        }, idx * 75);
      });
    } else {
      onFire({
        id: `cue_${Date.now()}`,
        archetype,
        station: selectedStation,
        color: selectedColor,
        altitude,
        launchAngle,
      });
    }
  };

  return (
    <div className="bg-neutral-950/95 border-t border-neutral-800 p-3 text-neutral-200 select-none z-20 shadow-2xl backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Left Side: Station & Color Selector */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Launch Station Selector */}
          <div>
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Station
            </div>
            <div className="flex items-center space-x-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
              {STATIONS.map((st) => (
                <button
                  key={st.id}
                  onClick={() => setSelectedStation(st.id)}
                  className={`px-2.5 py-1 text-xs font-mono rounded transition-all ${
                    selectedStation === st.id
                      ? 'bg-amber-500 text-black font-bold shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                  title={`${st.label} (${st.offset})`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Palette Selector */}
          <div>
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Color
            </div>
            <div className="flex items-center space-x-1.5 bg-neutral-900 p-1.5 rounded-lg border border-neutral-800">
              {COLOR_PALETTES.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setSelectedColor(c.hex)}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    selectedColor === c.hex
                      ? 'scale-125 ring-2 ring-white shadow-[0_0_10px_currentColor]'
                      : 'hover:scale-110 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex, color: c.hex }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Altitude & Angle Controls */}
          <div className="flex items-center space-x-3 bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800 text-xs">
            <div>
              <div className="flex justify-between text-[10px] text-neutral-400">
                <span>ALTITUDE</span>
                <span className="font-mono text-amber-400">{(altitude * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={altitude}
                onChange={(e) => setAltitude(parseFloat(e.target.value))}
                className="w-20 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            <div className="border-l border-neutral-800 pl-3">
              <div className="flex justify-between text-[10px] text-neutral-400">
                <span>ANGLE</span>
                <span className="font-mono text-cyan-400">{launchAngle}°</span>
              </div>
              <input
                type="range"
                min="-30"
                max="30"
                step="5"
                value={launchAngle}
                onChange={(e) => setLaunchAngle(parseInt(e.target.value, 10))}
                className="w-20 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* Center / Right: 12 Archetype Trigger Buttons */}
        <div className="w-full lg:w-auto flex flex-col items-end gap-1.5">
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              12 Pyrotechnic Shell Archetypes (M1)
            </span>
            <button
              onClick={onFireStressTest}
              className="text-[10px] font-bold text-rose-400 hover:text-rose-300 bg-rose-950/60 hover:bg-rose-900/80 px-2 py-0.5 rounded border border-rose-800/80 transition-colors flex items-center gap-1 shadow-[0_0_8px_rgba(225,29,72,0.3)]"
              title="Spawn 25,000+ particles to verify 60+ FPS stress performance"
            >
              <Zap className="w-3 h-3" />
              <span>Stress Test (25k+ Stars)</span>
            </button>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 xl:grid-cols-12 gap-1.5 w-full">
            {ARCHETYPES.map((arch) => {
              const Icon = arch.icon;
              return (
                <button
                  key={arch.type}
                  onClick={() => handleFireArchetype(arch.type)}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 active:scale-95 border border-neutral-800 hover:border-amber-500/50 text-neutral-300 hover:text-white transition-all group"
                  title={`${arch.label}: ${arch.description}`}
                >
                  <Icon className="w-4 h-4 mb-1 text-amber-400 group-hover:scale-110 group-hover:text-amber-300 transition-transform" />
                  <span className="text-[10px] font-medium text-center truncate max-w-[85px] leading-tight">
                    {arch.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
