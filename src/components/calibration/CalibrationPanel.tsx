import React, { useState } from 'react';
import { Sliders, X, RotateCcw, Sparkles, Maximize2, Save, Download } from 'lucide-react';
import { ParticleEngineConfig } from '../../types';

interface CalibrationPanelProps {
  config: ParticleEngineConfig;
  onChange: (patch: Partial<ParticleEngineConfig>) => void;
  onClose: () => void;
}

interface SavedSlot {
  config: ParticleEngineConfig;
  savedAt: string;
}

const STORAGE_KEY = 'pyrosync_calibration_slots_v1';

export const CalibrationPanel: React.FC<CalibrationPanelProps> = ({
  config,
  onChange,
  onClose,
}) => {
  const [slots, setSlots] = useState<Record<string, SavedSlot | null>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return { '1': null, '2': null, '3': null, '4': null };
  });

  const [activeNotification, setActiveNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setActiveNotification(msg);
    setTimeout(() => {
      setActiveNotification(null);
    }, 2000);
  };

  const handleSaveSlot = (slotKey: string) => {
    const updated = {
      ...slots,
      [slotKey]: {
        config: { ...config },
        savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    };
    setSlots(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    showNotification(`Slot ${slotKey} Saved`);
  };

  const handleLoadSlot = (slotKey: string) => {
    const slot = slots[slotKey];
    if (slot && slot.config) {
      onChange(slot.config);
      showNotification(`Slot ${slotKey} Loaded`);
    }
  };

  const handleResetDefaults = () => {
    onChange({
      gain: 1.0,
      bloomIntensity: 0.25,
      particleSizeScale: 0.90,
      burstRadiusScale: 1.0,
      projectionMargin: 0.10,
      showGuides: false,
    });
    showNotification('Reset to Defaults');
  };

  return (
    <div className="fixed top-14 right-4 w-92 max-h-[88vh] overflow-y-auto bg-neutral-950/95 border border-neutral-800 rounded-xl shadow-2xl p-4 backdrop-blur-xl z-40 text-neutral-200 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold tracking-wide">Projector Calibration</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Preset Slots (Save & Load) */}
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold uppercase text-neutral-400 tracking-wider">
            Calibration Preset Slots
          </label>
          {activeNotification && (
            <span className="text-[10px] font-medium text-emerald-400 animate-pulse">
              {activeNotification}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1.5">
          {['1', '2', '3', '4'].map((slotKey) => {
            const slot = slots[slotKey];
            const isSaved = !!slot;

            return (
              <div
                key={slotKey}
                className="flex flex-col gap-1 p-2 bg-neutral-900/70 border border-neutral-800 rounded-lg text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-300">Slot {slotKey}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                      isSaved
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                        : 'bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    {isSaved ? `Saved ${slot.savedAt}` : 'Empty'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mt-0.5">
                  <button
                    onClick={() => handleSaveSlot(slotKey)}
                    className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                    title={`Save current calibration sliders to Slot ${slotKey}`}
                  >
                    <Save className="w-3 h-3 text-amber-400" />
                    <span>Save</span>
                  </button>

                  <button
                    onClick={() => handleLoadSlot(slotKey)}
                    disabled={!isSaved}
                    className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      isSaved
                        ? 'bg-amber-500 hover:bg-amber-400 text-black font-semibold'
                        : 'bg-neutral-900 text-neutral-600 border border-neutral-800/60 cursor-not-allowed'
                    }`}
                    title={isSaved ? `Load settings from Slot ${slotKey}` : 'Slot is empty'}
                  >
                    <Download className="w-3 h-3" />
                    <span>Load</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Streamlined Calibration Sliders */}
      <div className="space-y-3.5 mt-4">
        {/* Firework Burst Radius / Scale [0.50x to 2.50x] */}
        <div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-300 font-medium flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              Firework Burst Radius / Scale
            </span>
            <span className="font-mono text-amber-400">
              {(config.burstRadiusScale ?? 1.0).toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min="0.50"
            max="2.50"
            step="0.05"
            value={config.burstRadiusScale ?? 1.0}
            onChange={(e) => onChange({ burstRadiusScale: parseFloat(e.target.value) })}
            className="w-full mt-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <p className="text-[10px] text-neutral-500 mt-0.5">
            Scales shell explosion blossom size and widens stage coverage to fill full area dimensions.
          </p>
        </div>

        {/* Master Brightness / Gain Multiplier [0.10 to 2.00] */}
        <div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-300 font-medium">Master Gain / Brightness</span>
            <span className="font-mono text-amber-400">{config.gain.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.10"
            max="2.00"
            step="0.05"
            value={config.gain}
            onChange={(e) => onChange({ gain: parseFloat(e.target.value) })}
            className="w-full mt-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* Additive Bloom Intensity [0.00 to 1.00] */}
        <div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-300 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Additive Bloom Intensity
            </span>
            <span className="font-mono text-cyan-400">{config.bloomIntensity.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.00"
            max="1.00"
            step="0.02"
            value={config.bloomIntensity}
            onChange={(e) => onChange({ bloomIntensity: parseFloat(e.target.value) })}
            className="w-full mt-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Particle Size Scaling [0.40 to 1.50] */}
        <div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-300 font-medium">Particle Size Scaling</span>
            <span className="font-mono text-emerald-400">{config.particleSizeScale.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.40"
            max="1.50"
            step="0.05"
            value={config.particleSizeScale}
            onChange={(e) => onChange({ particleSizeScale: parseFloat(e.target.value) })}
            className="w-full mt-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>
      </div>

      {/* Footer Reset */}
      <div className="mt-5 pt-3 border-t border-neutral-800 flex justify-end">
        <button
          onClick={handleResetDefaults}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 rounded transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>
    </div>
  );
};
