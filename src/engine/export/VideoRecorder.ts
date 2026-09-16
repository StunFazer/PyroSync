/**
 * VideoRecorder: Captures 60 FPS WebGL canvas stream and Web Audio stream,
 * multiplexing them into a single high-quality video recording using MediaRecorder.
 *
 * Performance optimizations against stutter:
 * 1. Optimal bitrate budget (6 Mbps default, preventing encoder buffer queue thrash)
 * 2. Codec preference hierarchy (VP8 hardware-accelerated fallback before heavy VP9)
 * 3. 500ms chunk timeslice preventing memory spikes
 */

export type VideoAudioMixMode = 'full' | 'music_only' | 'sfx_only';
export type VideoResolutionPreset = '1080p' | '720p' | 'native';

export interface VideoRecorderOptions {
  canvas: HTMLCanvasElement;
  audioStream?: MediaStream | null;
  fps?: number;
  bitrate?: number;
  resolutionPreset?: VideoResolutionPreset;
  onTimeUpdate?: (elapsedSec: number) => void;
  onStop?: (blob: Blob, url: string) => void;
  onError?: (error: Error) => void;
}

export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording: boolean = false;
  private startTimeMs: number = 0;
  private timerInterval: any = null;
  private combinedStream: MediaStream | null = null;
  private scaleCanvas: HTMLCanvasElement | null = null;
  private scaleCtx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public getElapsedSeconds(): number {
    if (!this.isRecording) return 0;
    return (performance.now() - this.startTimeMs) / 1000;
  }

  public start(options: VideoRecorderOptions): boolean {
    if (this.isRecording) return false;

    try {
      const fps = options.fps || 60;
      const preset = options.resolutionPreset || '1080p';

      let captureCanvas: HTMLCanvasElement = options.canvas;

      // When fixed resolution presets are chosen, use a dedicated offscreen canvas
      // to downscale/resample cleanly from arbitrarily high viewport dimensions (e.g. 1440p/4K).
      // This eliminates GPU/encoder queue backpressure and frame dropping.
      if (preset === '1080p' || preset === '720p') {
        const targetW = preset === '1080p' ? 1920 : 1280;
        const targetH = preset === '1080p' ? 1080 : 720;

        this.scaleCanvas = document.createElement('canvas');
        this.scaleCanvas.width = targetW;
        this.scaleCanvas.height = targetH;
        this.scaleCtx = this.scaleCanvas.getContext('2d', { alpha: false, desynchronized: true });

        const srcCanvas = options.canvas;
        const sCtx = this.scaleCtx;

        if (sCtx) {
          // Continuous frame pump copying source WebGL canvas to scaled offscreen canvas
          const pumpFrame = () => {
            if (!this.isRecording) return;
            try {
              sCtx.drawImage(srcCanvas, 0, 0, targetW, targetH);
            } catch {}
            this.animFrameId = requestAnimationFrame(pumpFrame);
          };
          // Initial draw
          sCtx.drawImage(srcCanvas, 0, 0, targetW, targetH);
          this.animFrameId = requestAnimationFrame(pumpFrame);
        }

        captureCanvas = this.scaleCanvas;
      }

      // Capture video stream from the appropriate canvas at target FPS
      const canvasStream = captureCanvas.captureStream(fps);
      const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

      // Attach audio tracks if provided
      if (options.audioStream) {
        options.audioStream.getAudioTracks().forEach((track) => {
          tracks.push(track);
        });
      }

      this.combinedStream = new MediaStream(tracks);

      // Prioritize codecs: VP8 is much faster/lighter in real-time software encoding than VP9, preventing dropped frames
      const mimeTypes = [
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm',
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
      ];

      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      // 6 Mbps default: optimal sweet spot between crystal-sharp particles and butter-smooth realtime encoding
      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: options.bitrate || 6_000_000,
      };

      if (selectedMimeType) {
        recorderOptions.mimeType = selectedMimeType;
      }

      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(this.combinedStream, recorderOptions);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        clearInterval(this.timerInterval);
        this.timerInterval = null;

        if (this.animFrameId !== null) {
          cancelAnimationFrame(this.animFrameId);
          this.animFrameId = null;
        }
        this.scaleCanvas = null;
        this.scaleCtx = null;

        const blobType = selectedMimeType || 'video/webm';
        const blob = new Blob(this.recordedChunks, { type: blobType });
        const url = URL.createObjectURL(blob);

        if (options.onStop) {
          options.onStop(blob, url);
        }

        // Release stream tracks
        this.combinedStream?.getTracks().forEach((track) => track.stop());
        this.combinedStream = null;
      };

      this.mediaRecorder.onerror = (e: any) => {
        this.isRecording = false;
        clearInterval(this.timerInterval);
        this.timerInterval = null;

        if (this.animFrameId !== null) {
          cancelAnimationFrame(this.animFrameId);
          this.animFrameId = null;
        }
        this.scaleCanvas = null;
        this.scaleCtx = null;

        if (options.onError) {
          options.onError(e.error || new Error('MediaRecorder encountered an error'));
        }
      };

      // Timeslice of 500ms flushes chunks smoothly to avoid buffer memory spikes
      this.mediaRecorder.start(500);
      this.isRecording = true;
      this.startTimeMs = performance.now();

      this.timerInterval = setInterval(() => {
        if (options.onTimeUpdate) {
          options.onTimeUpdate(this.getElapsedSeconds());
        }
      }, 250);

      return true;
    } catch (err: any) {
      if (options.onError) {
        options.onError(err);
      }
      return false;
    }
  }

  public stop(): void {
    if (!this.isRecording || !this.mediaRecorder) return;

    try {
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    } catch {}
  }
}
