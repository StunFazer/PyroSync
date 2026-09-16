import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Settings2, Sliders, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { AudioBand, AudioBands, AudioReactiveProfile } from '../../types';
import { MicAnalyzer } from '../../engine/audio/MicAnalyzer';

interface AudioMetersProps {
  analyzer: MicAnalyzer;
  onProfileChange?: (profile: AudioReactiveProfile) => void;
}

export const AudioMeters: React.FC<AudioMetersProps> = ({
  analyzer,
  onProfileChange,
}) => {
  const [isActive, setIsActive] = useState<boolean>(analyzer.getIsActive());
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(analyzer.getIsPermissionDenied());
  const [selectedProfileKey, setSelectedProfileKey] = useState<string>('club_edm');
  const [reactiveMode, setReactiveMode] = useState<'auto' | 'fixed'>(analyzer.getMode());
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const handleModeChange = (mode: 'auto' | 'fixed') => {
    setReactiveMode(mode);
    analyzer.setMode(mode);
  };

  // Meter visual states
  const [energy, setEnergy] = useState<AudioBands>({ sub: 0, mid: 0, treble: 0 });
  const [thresholds, setThresholds] = useState<AudioBands>({ sub: 0.3, mid: 0.3, treble: 0.3 });
  const [recentTriggers, setRecentTriggers] = useState<Record<AudioBand, boolean>>({
    sub: false,
    mid: false,
    treble: false,
  });

  // Slider settings
  const [sensitivities, setSensitivities] = useState<AudioBands>({
    sub: analyzer.getSensitivity('sub'),
    mid: analyzer.getSensitivity('mid'),
    treble: analyzer.getSensitivity('treble'),
  });

  const [cooldowns, setCooldowns] = useState<Record<AudioBand, number>>({
    sub: analyzer.getCooldown('sub'),
    mid: analyzer.getCooldown('mid'),
    treble: analyzer.getCooldown('treble'),
  });

  // Polling loop for smooth 60fps LED meter animation
  useEffect(() => {
    let animId: number;

    const updateMeters = () => {
      if (analyzer.getIsActive()) {
        analyzer.processFrame();
        setEnergy(analyzer.getBands());
        setThresholds(analyzer.getThresholds());
        setIsActive(true);
      } else {
        setIsActive(false);
      }
      setIsPermissionDenied(analyzer.getIsPermissionDenied());
      animId = requestAnimationFrame(updateMeters);
    };

    animId = requestAnimationFrame(updateMeters);

    // Shell trigger visual flash hook
    analyzer.onTrigger((event) => {
      setRecentTriggers((prev) => ({ ...prev, [event.band]: true }));
      setTimeout(() => {
        setRecentTriggers((prev) => ({ ...prev, [event.band]: false }));
      }, 120);
    });

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [analyzer]);

  const handleToggleMic = async () => {
    if (analyzer.getIsActive()) {
      analyzer.stop();
      setIsActive(false);
    } else {
      analyzer.resetPermissionState();
      await analyzer.start();
      setIsActive(analyzer.getIsActive());
      setIsPermissionDenied(analyzer.getIsPermissionDenied());
    }
  };

  const handleRetryMic = async () => {
    analyzer.resetPermissionState();
    setIsPermissionDenied(false);
    await analyzer.start();
    setIsActive(analyzer.getIsActive());
    setIsPermissionDenied(analyzer.getIsPermissionDenied());
  };

  const handleProfileSelect = (key: string) => {
    setSelectedProfileKey(key);
    analyzer.loadProfile(key as any);
    setSensitivities({
      sub: analyzer.getSensitivity('sub'),
      mid: analyzer.getSensitivity('mid'),
      treble: analyzer.getSensitivity('treble'),
    });
    setCooldowns({
      sub: analyzer.getCooldown('sub'),
      mid: analyzer.getCooldown('mid'),
      treble: analyzer.getCooldown('treble'),
    });
    if (onProfileChange) {
      onProfileChange(analyzer.getCurrentProfile());
    }
  };

  const handleSensitivityChange = (band: AudioBand, val: number) => {
    analyzer.setSensitivity(band, val);
    setSensitivities((prev) => ({ ...prev, [band]: val }));
  };

  const handleCooldownChange = (band: AudioBand, val: number) => {
    analyzer.setCooldown(band, val);
    setCooldowns((prev) => ({ ...prev, [band]: val }));
  };

  // Helper to render LED ladder segments
  const renderLedLadder = (band: AudioBand, value: number, threshold: number, isTriggered: boolean) => {
    const segments = 12;
    const activeSegments = Math.round(value * segments);
    const thresholdSegment = Math.round(threshold * segments);

    const bandColors = {
      sub: {
        label: 'Sub-Bass',
        range: '< 140Hz',
        activeColor: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]',
        threshColor: 'border-rose-400',
        textColor: 'text-rose-400',
      },
      mid: {
        label: 'Mid',
        range: '140-2500Hz',
        activeColor: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
        threshColor: 'border-amber-300',
        textColor: 'text-amber-400',
      },
      treble: {
        label: 'Treble',
        range: '> 2500Hz',
        activeColor: 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]',
        threshColor: 'border-cyan-300',
        textColor: 'text-cyan-400',
      },
    }[band];

    return (
      <div className="flex flex-col items-center flex-1 bg-neutral-900/60 p-2 rounded border border-neutral-800/80">
        {/* Header with name and trigger flash */}
        <div className="flex items-center justify-between w-full mb-1.5">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${bandColors.textColor}`}>
            {bandColors.label}
          </span>
          <span
            className={`w-2 h-2 rounded-full transition-all duration-75 ${
              isTriggered
                ? 'bg-white scale-125 shadow-[0_0_10px_#ffffff]'
                : 'bg-neutral-800'
            }`}
            title="Active trigger pulse"
          />
        </div>

        {/* LED Ladder Display */}
        <div className="relative w-full h-24 bg-neutral-950/80 rounded border border-neutral-800 p-1 flex flex-col-reverse justify-between gap-0.5">
          {Array.from({ length: segments }).map((_, idx) => {
            const isLit = idx < activeSegments;
            const isThresh = idx === thresholdSegment;

            let colorClass = 'bg-neutral-800/50';
            if (isLit) {
              if (idx >= 9) {
                colorClass = 'bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.7)]';
              } else if (idx >= 6) {
                colorClass = 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.7)]';
              } else {
                colorClass = 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.7)]';
              }
            }

            return (
              <div
                key={idx}
                className={`relative w-full h-1.5 rounded-sm transition-colors duration-75 ${colorClass}`}
              >
                {/* Dynamic threshold marker line */}
                {isThresh && (
                  <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-white shadow-[0_0_6px_#fff] z-10" />
                )}
              </div>
            );
          })}
        </div>

        {/* Frequency range and percentage */}
        <div className="flex justify-between w-full mt-1.5 text-[9px] font-mono text-neutral-400">
          <span>{bandColors.range}</span>
          <span className="text-neutral-200">{Math.round(value * 100)}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-neutral-950/90 border border-neutral-800 rounded-lg text-xs shadow-xl backdrop-blur-md">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-neutral-800 pb-2 gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold uppercase tracking-wider text-neutral-300 text-[11px]">
            Live Mic 3-Band FFT
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider ${
              isActive
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
            }`}
          >
            {isActive ? 'Live' : 'Standby'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Mode Switcher: Auto-Follow vs Fixed Sensitivity */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded p-0.5 text-[10px]">
            <button
              onClick={() => handleModeChange('auto')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                reactiveMode === 'auto'
                  ? 'bg-cyan-500 text-black shadow-xs font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Auto-Follow: Adaptive algorithmic dynamic noise floor tracking"
            >
              Auto-Follow
            </button>
            <button
              onClick={() => handleModeChange('fixed')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                reactiveMode === 'fixed'
                  ? 'bg-amber-500 text-black shadow-xs font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Fixed: Static sensitivity thresholds"
            >
              Fixed
            </button>
          </div>

          {/* Profile selector */}
          <select
            value={selectedProfileKey}
            onChange={(e) => handleProfileSelect(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-neutral-200 rounded px-2 py-0.5 text-[11px] focus:outline-none focus:border-cyan-500"
            title="Audio-reactive profile preset"
          >
            <option value="club_edm">Club / EDM</option>
            <option value="ambient">Ambient</option>
            <option value="percussive">Percussive</option>
          </select>

          {/* Settings expand toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1 rounded border transition-colors ${
              showSettings
                ? 'bg-cyan-950/60 border-cyan-700/80 text-cyan-400'
                : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-neutral-400'
            }`}
            title="Toggle sensitivity and cooldown sliders"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>

          {/* Mic Toggle Button */}
          <button
            onClick={handleToggleMic}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors font-medium ${
              isActive
                ? 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/40'
                : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'
            }`}
            title={isActive ? 'Stop live mic analysis' : 'Start live mic analysis'}
          >
            {isActive ? (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span>Stop Mic</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>Enable Mic</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Permission Denied Recovery Banner */}
      {isPermissionDenied && (
        <div className="flex flex-col gap-2 p-2.5 bg-rose-950/60 border border-rose-800/80 rounded-lg text-rose-200 text-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
            <div className="flex flex-col flex-1">
              <span className="font-semibold text-rose-300">Microphone Access Blocked</span>
              <span className="text-[11px] text-rose-200/90 mt-0.5">
                {analyzer.getPermissionErrorMessage() ||
                  'Browser blocked mic access. Click the lock icon in your browser URL bar, set Microphone to "Allow", and retry.'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-rose-900/60">
            <button
              onClick={handleRetryMic}
              className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Permission</span>
            </button>
          </div>
        </div>
      )}

      {/* 3-Band Virtual LED Ladders */}
      <div className="flex items-center gap-2 pt-1">
        {renderLedLadder('sub', energy.sub, thresholds.sub, recentTriggers.sub)}
        {renderLedLadder('mid', energy.mid, thresholds.mid, recentTriggers.mid)}
        {renderLedLadder('treble', energy.treble, thresholds.treble, recentTriggers.treble)}
      </div>

      {/* Settings Sliders (Collapsible) */}
      {showSettings && (
        <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800 mt-1 bg-neutral-900/40 p-2 rounded">
          <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mb-1">
            <Sliders className="w-3 h-3 text-amber-400" />
            <span>Sensitivity & Cooldown Gating</span>
          </div>

          {/* Sub-Bass Sliders */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 w-16">Sub Sens:</span>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.05"
                value={sensitivities.sub}
                onChange={(e) => handleSensitivityChange('sub', parseFloat(e.target.value))}
                className="flex-1 h-1 bg-neutral-800 rounded appearance-none accent-rose-400"
              />
              <span className="font-mono text-neutral-300 w-8 text-right">
                {sensitivities.sub.toFixed(1)}x
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 w-16">Sub Gate:</span>
              <input
                type="range"
                min="50"
                max="1000"
                step="10"
                value={cooldowns.sub}
                onChange={(e) => handleCooldownChange('sub', parseInt(e.target.value, 10))}
                className="flex-1 h-1 bg-neutral-800 rounded appearance-none accent-rose-400"
              />
              <span className="font-mono text-neutral-300 w-10 text-right">
                {cooldowns.sub}ms
              </span>
            </div>
          </div>

          {/* Mid Sliders */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 w-16">Mid Sens:</span>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.05"
                value={sensitivities.mid}
                onChange={(e) => handleSensitivityChange('mid', parseFloat(e.target.value))}
                className="flex-1 h-1 bg-neutral-800 rounded appearance-none accent-amber-400"
              />
              <span className="font-mono text-neutral-300 w-8 text-right">
                {sensitivities.mid.toFixed(1)}x
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 w-16">Mid Gate:</span>
              <input
                type="range"
                min="50"
                max="1000"
                step="10"
                value={cooldowns.mid}
                onChange={(e) => handleCooldownChange('mid', parseInt(e.target.value, 10))}
                className="flex-1 h-1 bg-neutral-800 rounded appearance-none accent-amber-400"
              />
              <span className="font-mono text-neutral-300 w-10 text-right">
                {cooldowns.mid}ms
              </span>
            </div>
          </div>

          {/* Treble Sliders */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 w-16">Treble Sens:</span>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.05"
                value={sensitivities.treble}
                onChange={(e) => handleSensitivityChange('treble', parseFloat(e.target.value))}
                className="flex-1 h-1 bg-neutral-800 rounded appearance-none accent-cyan-400"
              />
              <span className="font-mono text-neutral-300 w-8 text-right">
                {sensitivities.treble.toFixed(1)}x
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 w-16">Treble Gate:</span>
              <input
                type="range"
                min="50"
                max="1000"
                step="10"
                value={cooldowns.treble}
                onChange={(e) => handleCooldownChange('treble', parseInt(e.target.value, 10))}
                className="flex-1 h-1 bg-neutral-800 rounded appearance-none accent-cyan-400"
              />
              <span className="font-mono text-neutral-300 w-10 text-right">
                {cooldowns.treble}ms
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
