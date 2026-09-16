import React from 'react';
import { ExternalLink } from 'lucide-react';

export interface ProjectorSyncStatusProps {
  isConnected: boolean;
  latencyMs?: number | null;
  onOpenProjector?: () => void;
  className?: string;
  showLaunchButton?: boolean;
}

/**
 * ProjectorSyncStatus: Displays secondary projector connection state and roundtrip latency.
 * Text displays "Projector: Connected (x ms latency)" or "Projector: Offline".
 */
export const ProjectorSyncStatus: React.FC<ProjectorSyncStatusProps> = ({
  isConnected,
  latencyMs = null,
  onOpenProjector,
  className = '',
  showLaunchButton = true,
}) => {
  const latencyDisplay = latencyMs !== null && latencyMs !== undefined ? `${latencyMs} ms latency` : '0 ms latency';
  const statusLabel = isConnected
    ? `Projector: Connected (${latencyDisplay})`
    : 'Projector: Offline';

  return (
    <div
      className={`inline-flex items-center space-x-2 bg-neutral-950/80 backdrop-blur-md border border-neutral-800 px-2.5 py-1 rounded-md text-[11px] select-none ${
        isConnected ? 'text-neutral-300' : 'text-neutral-400'
      } ${className}`}
      data-testid="projector-sync-status"
    >
      {/* Status LED Dot */}
      <span
        className={`w-2 h-2 rounded-full transition-all duration-300 ${
          isConnected
            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.85)] animate-pulse'
            : 'bg-neutral-600'
        }`}
        aria-hidden="true"
      />

      {/* Verbatim Status Text */}
      <span className="font-mono tracking-tight">{statusLabel}</span>

      {/* Pop-Out Launch Button */}
      {showLaunchButton && onOpenProjector && (
        <button
          onClick={onOpenProjector}
          className="ml-1 text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-0.5 font-sans font-medium transition-colors"
          title="Open secondary projector canvas window (1920x1080)"
          aria-label="Open Pop-Out Projector"
        >
          <span>Pop-Out</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
