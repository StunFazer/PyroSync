import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { FireworksSimulation } from '../../engine/fireworks/SimulationLoop';
import { ParticleEngineConfig, FireCuePayload, SimulationStats } from '../../types';

export interface CanvasViewportRef {
  fireCue: (cue: FireCuePayload) => void;
  blackout: () => void;
  updateConfig: (config: Partial<ParticleEngineConfig>) => void;
  getStats: () => SimulationStats;
  getCanvas: () => HTMLCanvasElement | null;
}

interface CanvasViewportProps {
  config: ParticleEngineConfig;
  onStatsUpdate?: (stats: SimulationStats) => void;
  onBlackout?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  isSuspended?: boolean;
  onResumePreview?: () => void;
}

export const CanvasViewport = forwardRef<CanvasViewportRef, CanvasViewportProps>(({
  config,
  onStatsUpdate,
  onBlackout,
  onToggleFullscreen,
  isFullscreen,
  isSuspended,
  onResumePreview,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const simRef = useRef<FireworksSimulation | null>(null);
  const currentStatsRef = useRef<SimulationStats>({
    fps: 60,
    frameTimeMs: 16.6,
    activeParticles: 0,
    maxParticles: 65536,
    drawCalls: 1,
  });

  // Expose imperative API to parent components
  useImperativeHandle(ref, () => ({
    fireCue: (cue: FireCuePayload) => {
      simRef.current?.fireCue(cue);
    },
    blackout: () => {
      simRef.current?.blackout();
    },
    updateConfig: (newConfig: Partial<ParticleEngineConfig>) => {
      simRef.current?.updateConfig(newConfig);
    },
    getStats: () => currentStatsRef.current,
    getCanvas: () => canvasRef.current,
  }));

  // Initialize FireworksSimulation engine once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sim = new FireworksSimulation(canvas, config);
    simRef.current = sim;

    sim.onStatsUpdate = (stats) => {
      currentStatsRef.current = stats;
      if (onStatsUpdate) {
        onStatsUpdate(stats);
      }
    };

    sim.start();

    // Resize handling via ResizeObserver
    const container = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          sim.resize(width, height);
        }
      }
    });

    if (container) {
      observer.observe(container);
    }

    return () => {
      observer.disconnect();
      sim.dispose();
      simRef.current = null;
    };
  }, []);

  // Sync config updates to engine
  useEffect(() => {
    simRef.current?.updateConfig(config);
  }, [config]);

  // Global Presentation ('F') and Panic Blackout ('Esc' / 'Space') hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore hotkeys when typing into an input/textarea
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Escape') {
        e.preventDefault();
        simRef.current?.blackout();
        if (onBlackout) onBlackout();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        if (onToggleFullscreen) onToggleFullscreen();
      } else if (e.code === 'Space' && isFullscreen) {
        // Spacebar in fullscreen mode acts as instant blackout panic
        e.preventDefault();
        simRef.current?.blackout();
        if (onBlackout) onBlackout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBlackout, onToggleFullscreen, isFullscreen]);

  // Pause/Resume simulation loop when preview is suspended
  useEffect(() => {
    if (isSuspended) {
      simRef.current?.stop();
    } else {
      simRef.current?.start();
    }
  }, [isSuspended]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden select-none flex items-center justify-center"
      style={{ backgroundColor: '#000000' }}
    >
      <canvas
        ref={canvasRef}
        className={`block w-full h-full cursor-crosshair transition-opacity duration-300 ${
          isSuspended ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ backgroundColor: '#000000' }}
      />

      {/* Standby Overlay when Local Preview is Suspended */}
      {isSuspended && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black text-neutral-400 p-6 animate-in fade-in">
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800/80 shadow-2xl flex flex-col items-center text-center max-w-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-center mb-3 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <span className="text-xl">📺</span>
            </div>
            <span className="font-semibold text-neutral-200 text-sm mb-1">
              Local Preview Suspended
            </span>
            <p className="text-[11px] text-neutral-500 mb-4 leading-relaxed">
              Rendering is paused in this editor window to save 100% of local GPU resources. Full real-time output continues broadcasting to the Pop-Out Projector.
            </p>
            {onResumePreview && (
              <button
                onClick={onResumePreview}
                className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 hover:text-white rounded-lg text-xs font-medium transition-all cursor-pointer shadow-sm hover:border-amber-500/50"
              >
                Resume Editor Preview
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

CanvasViewport.displayName = 'CanvasViewport';
