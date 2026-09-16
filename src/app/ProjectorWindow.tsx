import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CanvasViewport, CanvasViewportRef } from '../components/display/CanvasViewport';
import { BroadcastBus } from '../state/BroadcastBus';
import { ParticleEngineConfig } from '../types';

/**
 * ProjectorWindow: Pop-Out Projection Display component.
 * Renders a clean, borderless pure-black #000000 canvas filling 100% of the viewport.
 * Zero operator UI controls, zero headers, zero borders visible.
 * Features dedicated WebGL particle rendering with ProjectorCalibrationPass post-processing
 * and zero-latency BroadcastChannel IPC synchronization.
 */
export const ProjectorWindow: React.FC = () => {
  const viewportRef = useRef<CanvasViewportRef | null>(null);
  const busRef = useRef<BroadcastBus | null>(null);

  const [config, setConfig] = useState<ParticleEngineConfig>({
    maxParticles: 65536,
    blackClamp: 0.02,
    gain: 1.0,
    bloomIntensity: 0.25,
    particleSizeScale: 0.90,
    aspectRatioMask: 'off',
    showGuides: false,
  });

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Toggle presentation fullscreen mode ('F')
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Instant emergency panic blackout ('Esc' or 'Space')
  // Immediately zeros particle pool locally and broadcasts back to studio
  const handleBlackout = useCallback(() => {
    viewportRef.current?.blackout();
    busRef.current?.panicBlackout();
  }, []);

  useEffect(() => {
    // 1. Initialize BroadcastChannel IPC bus in 'projector' role
    const bus = new BroadcastBus('projector');
    busRef.current = bus;

    // React to live shell launch events
    const unsubFire = bus.on('FIRE_CUE', (msg) => {
      viewportRef.current?.fireCue(msg.cue);
    });

    // React to instant panic blackout
    const unsubPanic = bus.on('PANIC_BLACKOUT', () => {
      viewportRef.current?.blackout();
    });

    // React to transport seek (clears active aerial particles)
    const unsubSeek = bus.on('TRANSPORT_SEEK', () => {
      viewportRef.current?.blackout();
    });

    // React to dynamic calibration updates (gain, black clamp, bloom, aspect mask)
    const unsubCal = bus.on('CALIBRATION_UPDATE', (msg) => {
      setConfig((prev) => ({ ...prev, ...msg.calibration }));
    });

    // React to full state sync response from Operator Studio
    const unsubSync = bus.on('STATE_SYNC_RESPONSE', (msg) => {
      if (msg.payload?.calibration) {
        setConfig((prev) => ({ ...prev, ...msg.payload.calibration }));
      }
    });

    // React to show loading (applies show's calibration profile)
    const unsubShow = bus.on('LOAD_SHOW', (msg) => {
      if (msg.show?.calibration) {
        setConfig((prev) => ({ ...prev, ...msg.show.calibration }));
      }
    });

    // On mount, broadcast STATE_SYNC_REQUEST to grab current studio state
    bus.requestStateSync();

    // 2. Fullscreen event listener
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // 3. Projector keyboard controls: 'F' for fullscreen, 'Esc' or 'Space' for blackout
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyF') {
        e.preventDefault();
        handleToggleFullscreen();
      } else if (e.code === 'Escape' || e.code === 'Space') {
        e.preventDefault();
        handleBlackout();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Hide cursor on window
    document.body.style.cursor = 'none';
    document.body.style.backgroundColor = '#000000';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';

    return () => {
      unsubFire();
      unsubPanic();
      unsubSeek();
      unsubCal();
      unsubSync();
      unsubShow();
      bus.destroy();
      busRef.current = null;
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.cursor = 'auto';
    };
  }, [handleToggleFullscreen, handleBlackout]);

  return (
    <div
      className="fixed inset-0 w-screen h-screen bg-black overflow-hidden select-none cursor-none [&_*]:cursor-none"
      style={{
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        background: '#000000',
        backgroundColor: '#000000',
        cursor: 'none',
      }}
      data-testid="projector-window-canvas"
    >
      <CanvasViewport
        ref={viewportRef}
        config={config}
        isFullscreen={isFullscreen || true}
        onToggleFullscreen={handleToggleFullscreen}
        onBlackout={handleBlackout}
      />
    </div>
  );
};
