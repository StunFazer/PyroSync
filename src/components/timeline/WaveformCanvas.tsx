/**
 * PyroSync Waveform Canvas
 * High-performance HTML5 Canvas renderer for decimated audio peak envelopes
 * and transient peak markers with interactive zoom, pan, and playhead scrubbing.
 * Conforming to ORIGINAL_REQUEST.md §R3, §R4, and PROJECT.md §Feature Inventory #38.
 */

import React, { useEffect, useRef } from 'react';
import { WaveformPeaks } from '../../types';

interface WaveformCanvasProps {
  peaks: WaveformPeaks | null;
  transients?: number[];
  currentTime: number;
  duration: number;
  viewStartTime: number;
  viewEndTime: number;
  onSeek: (time: number) => void;
  height?: number;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  peaks,
  transients = [],
  currentTime,
  duration,
  viewStartTime,
  viewEndTime,
  onSeek,
  height = 42,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const h = height;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    ctx.scale(dpr, dpr);

    // Strictly clamped pure black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, h);

    const timeSpan = Math.max(0.1, viewEndTime - viewStartTime);
    const midY = h / 2;

    // Draw baseline
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    if (!peaks || peaks.min.length === 0 || duration <= 0) {
      return;
    }

    const numBuckets = peaks.min.length;
    const secPerBucket = duration / numBuckets;

    // Draw Decimated Waveform Peaks (Zero-Allocation Loop)
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      const timeAtX = viewStartTime + (x / width) * timeSpan;
      if (timeAtX < 0 || timeAtX > duration) continue;

      const bucketIdx = Math.min(numBuckets - 1, Math.max(0, Math.floor(timeAtX / secPerBucket)));
      const minVal = Math.max(-1.0, Math.min(1.0, peaks.min[bucketIdx]));
      const maxVal = Math.max(-1.0, Math.min(1.0, peaks.max[bucketIdx]));

      const yTop = midY - maxVal * (midY - 2);
      const yBottom = midY - minVal * (midY - 2);

      ctx.fillRect(x, yTop, 1, Math.max(1, yBottom - yTop));
    }

    // Draw Transient Peak Markers
    ctx.fillStyle = '#f59e0b';
    for (let i = 0; i < transients.length; i++) {
      const t = transients[i];
      if (t >= viewStartTime && t <= viewEndTime) {
        const x = ((t - viewStartTime) / timeSpan) * width;
        ctx.fillRect(x - 1, 0, 2, 7);
      }
    }

    // Draw Playhead Line
    if (currentTime >= viewStartTime && currentTime <= viewEndTime) {
      const playheadX = ((currentTime - viewStartTime) / timeSpan) * width;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, h);
      ctx.stroke();
    }
  }, [peaks, transients, currentTime, duration, viewStartTime, viewEndTime, height]);

  const seekFromPointer = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const timeSpan = Math.max(0.1, viewEndTime - viewStartTime);
    const targetTime = viewStartTime + (x / rect.width) * timeSpan;
    onSeek(Math.max(0, Math.min(duration, targetTime)));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    seekFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      seekFromPointer(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if capture lost
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="w-full cursor-pointer select-none rounded border border-neutral-900 bg-black block"
      style={{ height: `${height}px` }}
      title="Audio Waveform & Transients (Click or drag to scrub)"
    />
  );
};
