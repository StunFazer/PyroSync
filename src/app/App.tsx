import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CanvasViewport, CanvasViewportRef } from '../components/display/CanvasViewport';
import { PanicBar } from '../components/display/PanicBar';
import { CalibrationPanel } from '../components/calibration/CalibrationPanel';
import { ShellLauncherDock } from '../components/display/ShellLauncherDock';
import { SFXControls } from '../components/audio/SFXControls';
import { AudioEngine } from '../engine/audio/AudioEngine';
import { ProjectorWindow } from './ProjectorWindow';
import { BroadcastBus } from '../state/BroadcastBus';
import { TimelineStudio } from '../components/timeline/TimelineStudio';
import { HotkeyCheatSheet } from '../components/display/HotkeyCheatSheet';
import { ShowManager } from '../state/ShowManager';
import { TapRecorder } from '../choreography/TapRecorder';
import { DEMO_SHOW_COSMIC_AWAKENING, PRESET_SHOWS } from '../state/Presets';
import {
  ParticleEngineConfig,
  FireCuePayload,
  SimulationStats,
  LaunchStation,
  ProceduralSFXType,
} from '../types';
import { VideoRecorder, VideoAudioMixMode, VideoResolutionPreset } from '../engine/export/VideoRecorder';
import { VideoExportModal } from '../components/export/VideoExportModal';
import { Music, Play, Pause, RotateCcw, Upload, AlertTriangle, X } from 'lucide-react';

export const App: React.FC = () => {
  // Fallback route detection for /projector or #/projector
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname + window.location.hash;
    }
    return '';
  });

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname + window.location.hash);
    };
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const isProjectorRoute =
    currentPath.includes('/projector') ||
    (typeof window !== 'undefined' &&
      (window.location.pathname === '/projector' ||
        window.location.pathname.endsWith('/projector') ||
        window.location.hash === '#/projector' ||
        window.location.hash === '#projector'));

  if (isProjectorRoute) {
    return <ProjectorWindow />;
  }

  const viewportRef = useRef<CanvasViewportRef | null>(null);
  const busRef = useRef<BroadcastBus | null>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const showManagerRef = useRef<ShowManager | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Calibration settings (Projector Calibration Engine R1)
  const [config, setConfig] = useState<ParticleEngineConfig>(() => {
    const defaults: ParticleEngineConfig = {
      maxParticles: 65536,
      blackClamp: 0.02,
      gain: 1.0,
      bloomIntensity: 0.25,
      particleSizeScale: 0.90,
      burstRadiusScale: 1.0,
      aspectRatioMask: 'off',
      showGuides: false,
    };
    try {
      const saved = localStorage.getItem('pyrosync_active_calibration_v1');
      if (saved) {
        return { ...defaults, ...JSON.parse(saved) };
      }
    } catch {}
    return defaults;
  });

  // Performance stats from simulation loop
  const [stats, setStats] = useState<SimulationStats>({
    fps: 60,
    frameTimeMs: 16.6,
    activeParticles: 0,
    maxParticles: 65536,
    drawCalls: 1,
  });

  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);
  const [isHotkeySheetOpen, setIsHotkeySheetOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isProjectorConnected, setIsProjectorConnected] = useState<boolean>(false);
  const [projectorLatency, setProjectorLatency] = useState<number | null>(null);
  const [isPopupBlocked, setIsPopupBlocked] = useState<boolean>(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'timeline' | 'launcher'>('timeline');

  // Milestone 2 Audio State
  const [isAudioDrawerOpen, setIsAudioDrawerOpen] = useState<boolean>(false);
  const [isSFXMuted, setIsSFXMuted] = useState<boolean>(true); // MANDATORY: strictly MUTED initially
  const [sfxVolume, setSFXVolume] = useState<number>(0.0);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [currentAudioTime, setCurrentAudioTime] = useState<number>(0.0);
  const [audioDuration, setAudioDuration] = useState<number>(0.0);
  const [audioTrackTitle, setAudioTrackTitle] = useState<string>('No Audio Loaded');
  const [isLocalPreviewSuspended, setIsLocalPreviewSuspended] = useState<boolean>(false);

  // Video Export State
  const [isVideoExportModalOpen, setIsVideoExportModalOpen] = useState<boolean>(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState<boolean>(false);
  const [recordingElapsedSeconds, setRecordingElapsedSeconds] = useState<number>(0);
  const [audioMixMode, setAudioMixMode] = useState<VideoAudioMixMode>('full');
  const [videoResolutionPreset, setVideoResolutionPreset] = useState<VideoResolutionPreset>('1080p');
  const [syncWithPlayback, setSyncWithPlayback] = useState<boolean>(true);
  const videoRecorderRef = useRef<VideoRecorder>(new VideoRecorder());

  const configRef = useRef(config);
  configRef.current = config;
  const currentAudioTimeRef = useRef(currentAudioTime);
  const syncWithPlaybackRef = useRef(syncWithPlayback);
  syncWithPlaybackRef.current = syncWithPlayback;
  currentAudioTimeRef.current = currentAudioTime;
  const isRecordingVideoRef = useRef(isRecordingVideo);
  isRecordingVideoRef.current = isRecordingVideo;
  const isAudioPlayingRef = useRef(isAudioPlaying);
  isAudioPlayingRef.current = isAudioPlaying;
  const audioTrackTitleRef = useRef(audioTrackTitle);
  audioTrackTitleRef.current = audioTrackTitle;

  // Fire cue: Dispatches to visual particle pool AND procedural sound FX
  const handleFireCue = useCallback((cue: FireCuePayload) => {
    viewportRef.current?.fireCue(cue);
    busRef.current?.fireCue(cue);

    // Procedural sound FX: Mortar launch thump
    audioEngineRef.current?.playProceduralSFX('launch');

    // Burst sound report at apex
    const burstDelayMs = Math.max(150, (cue.altitude || 0.8) * 850);
    setTimeout(() => {
      if (cue.archetype === 'crackle') {
        audioEngineRef.current?.playProceduralSFX('crackle');
      } else {
        audioEngineRef.current?.playProceduralSFX('boom');
      }

      // 2-Stage Multi-Break aerial salute: trigger secondary detonation sound report & crackle
      if (cue.archetype === 'multi_break') {
        setTimeout(() => {
          audioEngineRef.current?.playProceduralSFX('boom');
          setTimeout(() => {
            audioEngineRef.current?.playProceduralSFX('crackle');
          }, 80);
        }, 1200); // Fuses expire at ~1.1s - 1.4s
      }
    }, burstDelayMs);
  }, []);

  // Instant Panic Blackout ('Esc' or 'Space')
  const handleBlackout = useCallback(() => {
    viewportRef.current?.blackout();
    audioEngineRef.current?.blackout();
    busRef.current?.panicBlackout();
    if (audioEngineRef.current) {
      showManagerRef.current?.seek(audioEngineRef.current.getCurrentTime());
    }
  }, []);

  // Fullscreen presentation toggle ('F')
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Initialize ShowManager singleton in ref
  if (!showManagerRef.current) {
    showManagerRef.current = new ShowManager({
      initialShow: DEMO_SHOW_COSMIC_AWAKENING,
      onFireCue: (cue) => {
        handleFireCue(cue);
      },
    });
  }

  // Initialize AudioEngine, BroadcastBus, TapRecorder, and Animation Loop
  useEffect(() => {
    // 1. Initialize Audio Engine
    const engine = new AudioEngine();
    audioEngineRef.current = engine;

    setIsSFXMuted(engine.isSFXMuted());
    setSFXVolume(engine.getSFXVolume());

    const unsubscribeState = engine.addStateChangeListener((playing) => {
      setIsAudioPlaying(playing);
    });

    const unsubscribeEnded = engine.addEndedListener(() => {
      if (isRecordingVideoRef.current && syncWithPlaybackRef.current) {
        videoRecorderRef.current.stop();
        setIsRecordingVideo(false);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    });

    // 2. Initialize BroadcastBus IPC Manager in 'studio' role
    const bus = new BroadcastBus('studio');
    busRef.current = bus;

    const unsubConnection = bus.onConnectionChange((connected, latency) => {
      setIsProjectorConnected(connected);
      setProjectorLatency(latency);
    });

    // Handle Projector state sync requests upon launch
    const unsubSyncReq = bus.on('STATE_SYNC_REQUEST', () => {
      bus.sendStateSyncResponse({
        time: currentAudioTimeRef.current,
        isPlaying: isAudioPlayingRef.current,
        showId: audioTrackTitleRef.current || 'studio-live',
        calibration: configRef.current,
      });
    });

    // Handle panic blackout triggered from Projector window
    const unsubPanic = bus.on('PANIC_BLACKOUT', () => {
      viewportRef.current?.blackout();
      audioEngineRef.current?.blackout();
      if (audioEngineRef.current) {
        showManagerRef.current?.seek(audioEngineRef.current.getCurrentTime());
      }
    });

    // Start periodic heartbeat & roundtrip latency tracking
    bus.startHeartbeat(1500, 4500);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Audio timecode update loop & sample-accurate cue dispatch
    let animId: number;
    const updateTimecode = () => {
      if (audioEngineRef.current) {
        const t = audioEngineRef.current.getCurrentTime();
        setCurrentAudioTime(t);
        setAudioDuration(audioEngineRef.current.getDuration());
        setAudioTrackTitle(audioEngineRef.current.getTrackTitle());

        // Zero-allocation playback cursor tick
        if (isAudioPlayingRef.current) {
          showManagerRef.current?.tick(t);
        }
      }
      animId = requestAnimationFrame(updateTimecode);
    };
    animId = requestAnimationFrame(updateTimecode);

    return () => {
      cancelAnimationFrame(animId);
      unsubscribeState();
      unsubscribeEnded();
      unsubConnection();
      unsubSyncReq();
      unsubPanic();
      bus.destroy();
      busRef.current = null;
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      engine.pause();
    };
  }, [handleFireCue]);

  // Attach TapRecorder for live hotkeys (1-9, F, Esc/Space)
  useEffect(() => {
    const recorder = new TapRecorder({
      getCurrentTime: () => audioEngineRef.current?.getCurrentTime() || 0,
      getIsPlaying: () => isAudioPlayingRef.current,
      onRecordCue: (cue) => {
        showManagerRef.current?.addCue(cue);
      },
      onFireLive: (cue) => {
        handleFireCue(cue);
      },
      onBlackout: () => {
        handleBlackout();
      },
      onToggleFullscreen: () => {
        handleToggleFullscreen();
      },
      onToggleHotkeys: () => {
        setIsHotkeySheetOpen((prev) => !prev);
      },
      isModalOpen: () => isCalibrationOpen || isHotkeySheetOpen,
      onCloseModal: () => {
        setIsCalibrationOpen(false);
        setIsHotkeySheetOpen(false);
      },
    });

    const detach = recorder.attach(window);
    return () => detach();
  }, [handleFireCue, handleBlackout, handleToggleFullscreen, isCalibrationOpen, isHotkeySheetOpen]);

  // Update calibration
  const handleCalibrationChange = (patch: Partial<ParticleEngineConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem('pyrosync_active_calibration_v1', JSON.stringify(next));
      } catch {}
      busRef.current?.updateCalibration(patch);
      return next;
    });
  };

  // Open pop-out projector window (1920x1080 borderless) with pop-up blocker detection
  const handleOpenProjector = () => {
    try {
      const popout = window.open(
        '#/projector',
        'PyroSyncProjector',
        'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no'
      );
      if (!popout || popout.closed || typeof popout.closed === 'undefined') {
        setIsPopupBlocked(true);
      } else {
        popout.focus();
        setIsPopupBlocked(false);
      }
    } catch {
      setIsPopupBlocked(true);
    }
  };

  // Audio SFX Controls
  const handleToggleSFXMute = () => {
    if (!audioEngineRef.current) return;
    const nextMuted = !isSFXMuted;
    audioEngineRef.current.setSFXMuted(nextMuted);
    setIsSFXMuted(audioEngineRef.current.isSFXMuted());
    setSFXVolume(audioEngineRef.current.getSFXVolume());
  };

  const handleSFXVolumeChange = (vol: number) => {
    if (!audioEngineRef.current) return;
    audioEngineRef.current.setSFXVolume(vol);
    setIsSFXMuted(audioEngineRef.current.isSFXMuted());
    setSFXVolume(audioEngineRef.current.getSFXVolume());
  };

  const handleSFXPreview = (type: ProceduralSFXType) => {
    audioEngineRef.current?.playProceduralSFX(type);
  };

  // Transport & Seeking Controls
  const handlePlayPause = () => {
    if (!audioEngineRef.current) return;
    if (isAudioPlaying) {
      audioEngineRef.current.pause();
      busRef.current?.pause(audioEngineRef.current.getCurrentTime());
    } else {
      audioEngineRef.current.play();
      busRef.current?.play(audioEngineRef.current.getCurrentTime());
    }
  };

  const handleSeek = (time: number) => {
    if (audioEngineRef.current) {
      audioEngineRef.current.seek(time);
    }
    showManagerRef.current?.seek(time);
    busRef.current?.seek(time);
  };

  const handleRewind = () => {
    handleSeek(0.0);
  };

  const handleLoadShowPreset = (presetKey: string) => {
    const preset = PRESET_SHOWS[presetKey];
    if (!preset) return;
    showManagerRef.current?.loadShow(preset);
    if (preset.audioTrack?.proceduralPreset && audioEngineRef.current) {
      audioEngineRef.current.loadDemoTrack(preset.audioTrack.proceduralPreset);
      setAudioTrackTitle(audioEngineRef.current.getTrackTitle());
      setAudioDuration(audioEngineRef.current.getDuration());
    }
    busRef.current?.loadShow(preset);
  };

  const handleDirectAudioUpload = async (file: File) => {
    if (!file || !audioEngineRef.current) return;
    try {
      await audioEngineRef.current.loadAudio(file);
      const newDur = audioEngineRef.current.getDuration();
      setAudioTrackTitle(file.name);
      setAudioDuration(newDur);
      if (showManagerRef.current && newDur > 0) {
        showManagerRef.current.updateDuration(newDur);
      }
    } catch (err: any) {
      alert(`Audio file error: ${err.message}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleDirectAudioUpload(file);
    }
  };

  const handleStartVideoRecording = () => {
    const canvas = viewportRef.current?.getCanvas();
    if (!canvas) {
      alert('Canvas viewport not ready for recording');
      return;
    }

    const audioDest = audioEngineRef.current?.createRecordingDestination(audioMixMode);
    const audioStream = audioDest ? audioDest.stream : null;

    // Bitrate budget tailored to resolution preset for stutter-free 60 FPS recording
    const bitrateMap: Record<VideoResolutionPreset, number> = {
      '720p': 4_500_000,
      '1080p': 8_000_000,
      'native': 10_000_000,
    };
    const targetBitrate = bitrateMap[videoResolutionPreset] || 8_000_000;

    const started = videoRecorderRef.current.start({
      canvas,
      audioStream,
      fps: 60,
      bitrate: targetBitrate,
      resolutionPreset: videoResolutionPreset,
      onTimeUpdate: (elapsed) => {
        setRecordingElapsedSeconds(elapsed);
      },
      onStop: (_blob, url) => {
        setIsRecordingVideo(false);
        setRecordingElapsedSeconds(0);

        // Auto exit fullscreen if currently in fullscreen
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }

        // Automatic download
        const a = document.createElement('a');
        a.href = url;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        a.download = `pyrosync_${audioTrackTitleRef.current.replace(/[^a-zA-Z0-9_-]/g, '_')}_${ts}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      },
      onError: (err) => {
        alert(`Recording error: ${err.message}`);
        setIsRecordingVideo(false);
        setRecordingElapsedSeconds(0);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      },
    });

    if (started) {
      setIsRecordingVideo(true);
      setRecordingElapsedSeconds(0);
      setIsVideoExportModalOpen(false);

      // Automatically fullscreen the show
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }

      // If sync with playback is enabled, rewind and start playback
      if (syncWithPlaybackRef.current) {
        handleSeek(0.0);
        if (audioEngineRef.current) {
          audioEngineRef.current.play();
          busRef.current?.play(0.0);
        }
      }
    }
  };

  const handleStopVideoRecording = () => {
    videoRecorderRef.current.stop();
    setIsRecordingVideo(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Format timecode (MM:SS.mmm)
  const formatTimecode = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  // Massive Barrage Stress Test: spawns 25,000+ particles to verify 60+ FPS sustained performance
  const handleStressTest = () => {
    const stations: LaunchStation[] = ['left', 'left_center', 'center', 'right_center', 'right'];
    const colors = ['#ffd700', '#ff007f', '#00f0ff', '#ff2244', '#11dd66', '#ffffff'];

    // Wave 1: 5 simultaneous ground mines (t=0)
    stations.forEach((st, idx) => {
      handleFireCue({
        id: `stress_mine_${idx}`,
        archetype: 'ground_mine',
        station: st,
        color: colors[idx % colors.length],
        altitude: 0.35,
        launchAngle: (idx - 2) * 10,
      });
    });

    // Wave 2: 5 whistling comets cross-firing (t=120ms)
    setTimeout(() => {
      stations.forEach((st, idx) => {
        handleFireCue({
          id: `stress_comet_${idx}`,
          archetype: 'whistling_comet',
          station: st,
          color: colors[(idx + 1) % colors.length],
          altitude: 0.85,
          launchAngle: (2 - idx) * 8,
        });
      });
    }, 120);

    // Wave 3: Brocades, Chrysanthemums, and Peonies across all stations (t=350ms)
    setTimeout(() => {
      stations.forEach((st, idx) => {
        const arch = idx === 2 ? 'brocade_crown' : idx % 2 === 0 ? 'chrysanthemum' : 'peony';
        handleFireCue({
          id: `stress_burst_${idx}`,
          archetype: arch,
          station: st,
          color: colors[(idx + 2) % colors.length],
          altitude: 0.88 + (idx % 2 === 0 ? 0.05 : -0.05),
          launchAngle: (idx - 2) * 5,
        });
      });
    }, 350);

    // Wave 4: Dragon eggs crackle & Crossettes (t=600ms)
    setTimeout(() => {
      stations.forEach((st, idx) => {
        handleFireCue({
          id: `stress_crackle_${idx}`,
          archetype: idx % 2 === 0 ? 'crackle' : 'crossette',
          station: st,
          color: colors[(idx + 3) % colors.length],
          altitude: 0.75,
          launchAngle: (idx - 2) * 8,
        });
      });
    }, 600);

    // Wave 5: Strobe cloud & Willow waterfall (t=900ms)
    setTimeout(() => {
      stations.forEach((st, idx) => {
        handleFireCue({
          id: `stress_willow_${idx}`,
          archetype: idx === 2 ? 'willow' : 'strobe',
          station: st,
          color: '#ffd700',
          altitude: 0.92,
          launchAngle: 0,
        });
      });
    }, 900);

    // Wave 6: Cascading grand finale barrage salvo (t=1200ms)
    setTimeout(() => {
      handleFireCue({
        id: `stress_finale_salvo`,
        archetype: 'finale_barrage',
        station: 'center',
        color: '#ffcc00',
        altitude: 0.9,
      });
    }, 1200);
  };

  return (
    <div className="flex flex-col w-full h-full bg-black text-neutral-100 overflow-hidden select-none">
      {/* Top Unified Master Command Bar (hidden during fullscreen) */}
      {!isFullscreen && (
        <div className="relative z-30">
          <PanicBar
            stats={stats}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            onOpenCalibration={() => setIsCalibrationOpen((prev) => !prev)}
            isCalibrationOpen={isCalibrationOpen}
            isProjectorConnected={isProjectorConnected}
            projectorLatency={projectorLatency}
            onOpenProjector={handleOpenProjector}
            isLocalPreviewSuspended={isLocalPreviewSuspended}
            onTogglePreview={() => setIsLocalPreviewSuspended((prev) => !prev)}
            isAudioDrawerOpen={isAudioDrawerOpen}
            onToggleAudioDrawer={() => setIsAudioDrawerOpen((prev) => !prev)}
            onOpenHotkeys={() => setIsHotkeySheetOpen(true)}
            timecodeText={`${formatTimecode(currentAudioTime)}${audioDuration > 0 ? ` / ${formatTimecode(audioDuration)}` : ''}`}
            isRecordingVideo={isRecordingVideo}
            recordingElapsedSeconds={recordingElapsedSeconds}
            onOpenVideoExport={() => setIsVideoExportModalOpen(true)}
          />
        </div>
      )}

      {/* Main Pure-Black WebGL Canvas Viewport */}
      <div className="relative flex-1 w-full h-full bg-black overflow-hidden">
        <CanvasViewport
          ref={viewportRef}
          config={config}
          onStatsUpdate={setStats}
          onBlackout={handleBlackout}
          onToggleFullscreen={handleToggleFullscreen}
          isFullscreen={isFullscreen}
          isSuspended={isLocalPreviewSuspended}
          onResumePreview={() => setIsLocalPreviewSuspended(false)}
        />

        {/* Discreet Fullscreen Recording Indicator & Stop Control */}
        {isRecordingVideo && isFullscreen && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-3 py-1.5 bg-neutral-950/80 border border-rose-600/80 rounded-full shadow-2xl backdrop-blur-md text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="font-mono text-rose-300 font-bold">
              REC {Math.floor(recordingElapsedSeconds)}s
            </span>
            <button
              onClick={handleStopVideoRecording}
              className="ml-1 px-2.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full font-semibold transition-colors cursor-pointer text-[11px]"
              title="Stop recording and exit fullscreen"
            >
              Stop & Save
            </button>
          </div>
        )}

        {/* Pop-up Blocker Warning Toast */}
        {isPopupBlocked && !isFullscreen && (
          <div
            className="fixed top-14 right-4 z-50 flex items-center gap-3 bg-amber-950/95 border border-amber-600 text-amber-100 px-4 py-3 rounded-lg shadow-2xl backdrop-blur-md text-xs transition-all max-w-md animate-in fade-in"
            role="alert"
            data-testid="popup-blocked-warning"
          >
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="flex flex-col flex-1">
              <span className="font-semibold text-amber-300">Pop-up Blocked by Browser</span>
              <span className="text-amber-200/90 text-[11px] mt-0.5">
                Please allow pop-ups for PyroSync to open the projector window, or{' '}
                <a
                  href="#/projector"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-white font-medium hover:text-amber-200"
                  onClick={() => setIsPopupBlocked(false)}
                >
                  open #/projector directly
                </a>
                .
              </span>
            </div>
            <button
              onClick={() => setIsPopupBlocked(false)}
              className="p-1 hover:bg-amber-900/50 rounded text-amber-300 hover:text-white transition-colors"
              title="Dismiss warning"
              aria-label="Dismiss warning"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Audio & Sync Modal Dialog (Centered overlay with backdrop, constrained max height) */}
        {isAudioDrawerOpen && !isFullscreen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/60">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold tracking-wide text-neutral-100">Audio & Pyromusical Sync</h3>
                </div>
                <button
                  onClick={() => setIsAudioDrawerOpen(false)}
                  className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                  title="Close Audio & Sync Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-4 overflow-y-auto flex flex-col gap-4">
                {/* 1. Track Player & Demo Soundtrack Loader */}
                <div className="p-3 bg-neutral-900/50 border border-neutral-800 rounded-lg text-xs flex flex-col gap-2">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-semibold uppercase tracking-wider text-neutral-300 text-[11px]">
                        Timecoded Audio Player
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 truncate max-w-[200px]" title={audioTrackTitle}>
                      {audioTrackTitle}
                    </span>
                  </div>

                  {/* Transport buttons & Timecode bar */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handlePlayPause}
                        disabled={audioDuration <= 0}
                        className={`flex items-center gap-1 px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                          audioDuration <= 0
                            ? 'bg-neutral-900 text-neutral-600 border border-neutral-800 cursor-not-allowed'
                            : isAudioPlaying
                            ? 'bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                        }`}
                      >
                        {isAudioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isAudioPlaying ? 'Pause' : 'Play'}</span>
                      </button>

                      <button
                        onClick={handleRewind}
                        disabled={audioDuration <= 0}
                        className="p-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-neutral-300 disabled:opacity-40 cursor-pointer"
                        title="Rewind to 00:00"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="font-mono text-amber-400 text-xs">
                      {formatTimecode(currentAudioTime)}
                    </div>
                  </div>

                  {/* Playhead Scrub Slider */}
                  {audioDuration > 0 && (
                    <input
                      type="range"
                      min="0"
                      max={audioDuration}
                      step="0.05"
                      value={currentAudioTime}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        handleSeek(val);
                      }}
                      className="w-full h-1 bg-neutral-800 rounded appearance-none cursor-pointer accent-amber-400"
                    />
                  )}

                  {/* Demo Show Pre-loaded Audio Buttons */}
                  <div className="flex flex-col gap-1.5 pt-1 border-t border-neutral-800/80">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                      Load Pre-Configured Soundtrack:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handleLoadShowPreset('cosmic_awakening')}
                        className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 border border-neutral-800 rounded text-neutral-300 text-[11px] transition-colors truncate text-left cursor-pointer"
                        title="Demo Show 1: Cosmic Awakening (90s Orchestral/Hybrid)"
                      >
                        ✨ Demo 1: Cosmic
                      </button>
                      <button
                        onClick={() => handleLoadShowPreset('neon_horizon')}
                        className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 border border-neutral-800 rounded text-neutral-300 text-[11px] transition-colors truncate text-left cursor-pointer"
                        title="Demo Show 2: Neon Horizon (75s 128 BPM Synthwave)"
                      >
                        🌆 Demo 2: Neon
                      </button>
                    </div>

                    {/* Upload Custom Audio File */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="audio/*,.mp3,.wav,.ogg,.flac"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-300 hover:text-white text-[11px] transition-colors cursor-pointer"
                      title="Upload WAV, MP3, OGG, FLAC file"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload Audio File</span>
                    </button>
                  </div>
                </div>

                {/* 2. Procedural Pyrotechnic SFX Controls */}
                <SFXControls
                  isMuted={isSFXMuted}
                  volume={sfxVolume}
                  onToggleMute={handleToggleSFXMute}
                  onVolumeChange={handleSFXVolumeChange}
                  onPlayPreview={handleSFXPreview}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video Export Modal */}
      <VideoExportModal
        isOpen={isVideoExportModalOpen}
        onClose={() => setIsVideoExportModalOpen(false)}
        isRecording={isRecordingVideo}
        elapsedSeconds={recordingElapsedSeconds}
        audioMixMode={audioMixMode}
        onAudioMixModeChange={setAudioMixMode}
        resolutionPreset={videoResolutionPreset}
        onResolutionPresetChange={setVideoResolutionPreset}
        syncWithPlayback={syncWithPlayback}
        onSyncWithPlaybackChange={setSyncWithPlayback}
        onStartRecording={handleStartVideoRecording}
        onStopRecording={handleStopVideoRecording}
      />

      {/* Projector Calibration Interactive Panel */}
      {isCalibrationOpen && !isFullscreen && (
        <CalibrationPanel
          config={config}
          onChange={handleCalibrationChange}
          onClose={() => setIsCalibrationOpen(false)}
        />
      )}

      {/* Operator Hotkey Cheat Sheet Modal */}
      <HotkeyCheatSheet
        isOpen={isHotkeySheetOpen}
        onClose={() => setIsHotkeySheetOpen(false)}
      />

      {/* Bottom Operator Studio Dock (Timeline Studio & Shell Launcher) */}
      {!isFullscreen && (
        <div className="relative z-20 flex flex-col bg-neutral-950 border-t border-neutral-800">
          {/* Tab Navigation */}
          <div className="flex items-center justify-between px-3 py-1 bg-neutral-900 border-b border-neutral-800 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveBottomTab('timeline')}
                className={`px-3 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  activeBottomTab === 'timeline'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Timeline Studio
              </button>
              <button
                onClick={() => setActiveBottomTab('launcher')}
                className={`px-3 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  activeBottomTab === 'launcher'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Manual Shell Launcher
              </button>
            </div>
          </div>

          {/* Active Tab Panel */}
          {activeBottomTab === 'timeline' ? (
            <TimelineStudio
              showManager={showManagerRef.current}
              audioEngine={audioEngineRef.current}
              currentTime={currentAudioTime}
              duration={audioDuration}
              isPlaying={isAudioPlaying}
              onPlayPause={handlePlayPause}
              onRewind={handleRewind}
              onSeek={handleSeek}
              onLoadShowPreset={handleLoadShowPreset}
              onUploadAudio={handleDirectAudioUpload}
              activeTrackTitle={audioTrackTitle}
            />
          ) : (
            <ShellLauncherDock
              onFire={handleFireCue}
              onFireStressTest={handleStressTest}
            />
          )}
        </div>
      )}
    </div>
  );
};
