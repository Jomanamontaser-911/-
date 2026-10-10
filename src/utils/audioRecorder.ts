export interface AudioRecordingResult {
  blob: Blob;
  audioUrl: string;
  mimeType: string;
  duration: number; // in seconds
  base64: string;
}

export function isAudioRecordingSupported(): boolean {
  return typeof window !== 'undefined' &&
    Boolean(navigator?.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined';
}

export function getSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  const candidateTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ];
  for (const t of candidateTypes) {
    if (MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return 'audio/webm';
}

export class VoiceRecorderController {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mimeType: string = 'audio/webm';
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private startTime: number = 0;
  private pausedDuration: number = 0;
  private pauseStartTime: number = 0;
  private onLevelCallback?: (level: number) => void;

  async start(onLevel?: (level: number) => void): Promise<void> {
    if (!isAudioRecordingSupported()) {
      throw new Error('متصفحك لا يدعم تسجيل الصوت عبر الميكروفون.');
    }

    this.onLevelCallback = onLevel;
    this.audioChunks = [];
    this.mimeType = getSupportedAudioMimeType();

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('تم رفض إذن الوصول إلى الميكروفون. يرجى تفعيل إذن الميكروفون من إعدادات المتصفح للتسجيل 🎤');
      }
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('لم يتم العثور على ميكروفون متصل بجهازك.');
      }
      throw new Error('تعذر بدء التسجيل الصوتي. تأكدي من صلاحيات الميكروفون.');
    }

    this.mediaRecorder = new MediaRecorder(this.mediaStream, {
      mimeType: this.mimeType,
    });

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    // Setup audio visualizer analyser
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 64;
        source.connect(this.analyserNode);

        const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
        const checkLevel = () => {
          if (!this.analyserNode) return;
          this.analyserNode.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = Math.min(1, avg / 128);
          this.onLevelCallback?.(normalized);
          this.animationFrameId = requestAnimationFrame(checkLevel);
        };
        checkLevel();
      }
    } catch (audioErr) {
      console.warn('AudioContext visualization setup notice:', audioErr);
    }

    this.startTime = Date.now();
    this.pausedDuration = 0;
    this.mediaRecorder.start(200); // 200ms slices
  }

  pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.pauseStartTime = Date.now();
    }
  }

  resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      if (this.pauseStartTime > 0) {
        this.pausedDuration += Date.now() - this.pauseStartTime;
        this.pauseStartTime = 0;
      }
    }
  }

  async stop(): Promise<AudioRecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('التسجيل غير نشط.'));
        return;
      }

      const totalDurationSec = Math.max(
        1,
        Math.round((Date.now() - this.startTime - this.pausedDuration) / 1000)
      );

      this.mediaRecorder.onstop = async () => {
        try {
          this.cleanup();
          const cleanMime = this.mimeType.split(';')[0];
          const blob = new Blob(this.audioChunks, { type: cleanMime });
          const audioUrl = URL.createObjectURL(blob);

          // Convert to base64
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64Index = result.indexOf(';base64,');
            const base64 = base64Index !== -1 ? result.substring(base64Index + 8) : '';
            resolve({
              blob,
              audioUrl,
              mimeType: cleanMime,
              duration: totalDurationSec,
              base64,
            });
          };
          reader.onerror = () => {
            reject(new Error('فشل في تحويل التسجيل الصوتي.'));
          };
          reader.readAsDataURL(blob);
        } catch (err) {
          reject(err);
        }
      };

      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      } else {
        reject(new Error('مسجل الصوت متوقف بالفعل.'));
      }
    });
  }

  cancel(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.mediaRecorder = null;
    this.analyserNode = null;
  }
}
