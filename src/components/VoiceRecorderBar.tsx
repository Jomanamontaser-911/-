import React, { useState, useEffect, useRef } from 'react';
import { VoiceRecorderController, AudioRecordingResult } from '../utils/audioRecorder';
import { Language } from '../types';
import {
  Mic,
  Square,
  Pause,
  Play,
  Trash2,
  Send,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Loader2,
  FileText,
  Volume2,
} from 'lucide-react';

interface VoiceRecorderBarProps {
  isOpen: boolean;
  onClose: () => void;
  onSendVoice: (voiceResult: AudioRecordingResult, transcription?: string) => Promise<void> | void;
  language?: Language;
  contextHint?: string;
  className?: string;
}

export const VoiceRecorderBar: React.FC<VoiceRecorderBarProps> = ({
  isOpen,
  onClose,
  onSendVoice,
  language = 'ar',
  contextHint,
  className = '',
}) => {
  const [recordState, setRecordState] = useState<
    'idle' | 'recording' | 'paused' | 'preview' | 'transcribing' | 'sending'
  >('idle');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioResult, setAudioResult] = useState<AudioRecordingResult | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);

  const controllerRef = useRef<VoiceRecorderController | null>(null);
  const timerRef = useRef<any>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      handleCancel();
    }
  }, [isOpen]);

  // Handle timer
  useEffect(() => {
    if (recordState === 'recording') {
      timerRef.current = setInterval(() => {
        setRecordSeconds((sec) => sec + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recordState]);

  // Audio preview element events
  useEffect(() => {
    const audio = audioPreviewRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setPreviewCurrentTime(audio.currentTime);
    const onEnded = () => {
      setIsPlayingPreview(false);
      setPreviewCurrentTime(0);
    };
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioResult]);

  const handleStartRecording = async () => {
    setErrorMessage(null);
    setAudioResult(null);
    setTranscription(null);
    setRecordSeconds(0);
    setAudioLevel(0);

    try {
      const controller = new VoiceRecorderController();
      controllerRef.current = controller;
      await controller.start((level) => {
        setAudioLevel(level);
      });
      setRecordState('recording');
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      setErrorMessage(err.message || 'تعذر تشغيل الميكروفون.');
      setRecordState('idle');
    }
  };

  const handlePause = () => {
    if (controllerRef.current && recordState === 'recording') {
      controllerRef.current.pause();
      setRecordState('paused');
    }
  };

  const handleResume = () => {
    if (controllerRef.current && recordState === 'paused') {
      controllerRef.current.resume();
      setRecordState('recording');
    }
  };

  const handleStopAndPreview = async () => {
    if (!controllerRef.current) return;
    try {
      const res = await controllerRef.current.stop();
      setAudioResult(res);
      setRecordState('preview');
      controllerRef.current = null;
    } catch (err: any) {
      console.error('Failed to stop recording:', err);
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ التسجيل.');
      setRecordState('idle');
    }
  };

  const handleCancel = () => {
    if (controllerRef.current) {
      controllerRef.current.cancel();
      controllerRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecordState('idle');
    setRecordSeconds(0);
    setAudioLevel(0);
    setAudioResult(null);
    setTranscription(null);
    setErrorMessage(null);
    setIsPlayingPreview(false);
    onClose();
  };

  const togglePreviewPlay = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play().catch(console.error);
      setIsPlayingPreview(true);
    }
  };

  const handleTranscribeAndCheck = async () => {
    if (!audioResult) return;
    setRecordState('transcribing');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: audioResult.base64,
          mimeType: audioResult.mimeType,
          context: contextHint,
        }),
      });

      if (!res.ok) {
        throw new Error('فشل في تحويل الصوت إلى نص');
      }

      const data = await res.json();
      setTranscription(data.transcription || '');
      setRecordState('preview');
    } catch (err: any) {
      console.error('Transcription error:', err);
      setErrorMessage('تعذر تحويل الصوت لنص، لكن يمكنكِ إرسال التسجيل الصوتي مباشرة لبيستي!');
      setRecordState('preview');
    }
  };

  const handleSend = async () => {
    if (!audioResult) return;
    setRecordState('sending');
    try {
      await onSendVoice(audioResult, transcription || undefined);
      handleCancel();
    } catch (err: any) {
      console.error('Send voice note error:', err);
      setErrorMessage(err.message || 'فشل في إرسال التسجيل الصوتي');
      setRecordState('preview');
    }
  };

  if (!isOpen) return null;

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div
      className={`rounded-3xl p-3 sm:p-4 bg-gradient-to-r from-pink-100/95 via-purple-100/90 to-pink-100/95 border-2 border-pink-300 shadow-lg text-slate-800 transition-all ${className}`}
    >
      {audioResult?.audioUrl && (
        <audio ref={audioPreviewRef} src={audioResult.audioUrl} preload="auto" />
      )}

      {/* Error display */}
      {errorMessage && (
        <div className="mb-2.5 p-2 rounded-xl bg-rose-100/90 border border-rose-300 text-rose-800 text-xs flex items-center gap-1.5 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="flex-1">{errorMessage}</span>
        </div>
      )}

      {/* State 1: Idle (Ready to record) */}
      {recordState === 'idle' && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-pink-200 text-pink-700">
              <Mic className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <p className="text-xs font-bold text-pink-950">
                تسجيل سؤال صوتي لبيستي 🎤
              </p>
              <p className="text-[11px] text-pink-800/70">
                اسألي بالمصري أو الفصحى، وبيستي هتفهم سؤالك وتجاوبك بالراحة
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-pink-200/60 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleStartRecording}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs shadow-xs transition-transform active:scale-95"
            >
              <Mic className="w-4 h-4" />
              <span>بدء التسجيل</span>
            </button>
          </div>
        </div>
      )}

      {/* State 2: Recording or Paused */}
      {(recordState === 'recording' || recordState === 'paused') && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Waveform & Timer */}
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              {recordState === 'recording' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              )}
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
            </span>

            <span className="font-mono text-sm sm:text-base font-black text-rose-700 tracking-wider">
              {formatTimer(recordSeconds)}
            </span>

            {/* Dynamic pulsating waves */}
            <div className="flex items-center gap-1 h-7 px-2 bg-white/70 rounded-xl border border-pink-200">
              {[0.2, 0.5, 0.8, 0.4, 0.9, 0.6, 0.3, 0.7].map((base, idx) => {
                const dynamicHeight = Math.min(
                  100,
                  Math.max(15, base * 100 * (0.3 + audioLevel * 1.5))
                );
                return (
                  <div
                    key={idx}
                    style={{ height: `${recordState === 'recording' ? dynamicHeight : 25}%` }}
                    className="w-1 bg-gradient-to-t from-pink-500 to-purple-500 rounded-full transition-all duration-75"
                  />
                );
              })}
            </div>

            <span className="text-xs font-bold text-pink-900 hidden sm:inline">
              {recordState === 'recording' ? 'بيستي بتسمعك...' : 'التسجيل متوقف مؤقتاً'}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Trash / Cancel */}
            <button
              type="button"
              onClick={handleCancel}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-100 transition-colors"
              title="إلغاء وحذف"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Pause / Resume */}
            {recordState === 'recording' ? (
              <button
                type="button"
                onClick={handlePause}
                className="p-2 rounded-xl bg-white hover:bg-pink-100 text-pink-700 border border-pink-200 transition-colors"
                title="إيقاف مؤقت"
              >
                <Pause className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResume}
                className="p-2 rounded-xl bg-pink-500 text-white transition-colors"
                title="استئناف التسجيل"
              >
                <Play className="w-4 h-4" />
              </button>
            )}

            {/* Finish recording & preview */}
            <button
              type="button"
              onClick={handleStopAndPreview}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 text-white font-bold text-xs shadow-xs transition-transform active:scale-95"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>إنهاء ومعاينة</span>
            </button>
          </div>
        </div>
      )}

      {/* State 3: Preview (listen, transcribe, send) */}
      {(recordState === 'preview' || recordState === 'transcribing' || recordState === 'sending') &&
        audioResult && (
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
              {/* Play preview bar */}
              <div className="flex items-center gap-2.5 bg-white/90 p-2 rounded-2xl border border-pink-200 w-full sm:w-auto flex-1">
                <button
                  type="button"
                  onClick={togglePreviewPlay}
                  className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs"
                >
                  {isPlayingPreview ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5 ms-0.5" />
                  )}
                </button>

                <div className="flex-1 flex items-center gap-1">
                  <div className="h-1.5 flex-1 bg-pink-100 rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${(previewCurrentTime / (audioResult.duration || 1)) * 100}%`,
                      }}
                      className="h-full bg-pink-500 transition-all duration-100"
                    />
                  </div>
                </div>

                <span className="text-xs font-bold text-pink-900 tabular-nums shrink-0">
                  {formatTimer(
                    isPlayingPreview ? Math.floor(previewCurrentTime) : audioResult.duration
                  )}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {/* Delete and re-record */}
                <button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={recordState === 'transcribing' || recordState === 'sending'}
                  className="p-2 rounded-2xl bg-white hover:bg-pink-100 text-slate-700 border border-pink-200 text-xs font-bold transition-all"
                  title="إعادة التسجيل"
                >
                  <RotateCcw className="w-4 h-4 text-pink-600" />
                </button>

                {/* Transcribe check button */}
                {!transcription && (
                  <button
                    type="button"
                    onClick={handleTranscribeAndCheck}
                    disabled={recordState === 'transcribing' || recordState === 'sending'}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition-all"
                  >
                    {recordState === 'transcribing' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-purple-600" />
                    )}
                    <span>فحص النص</span>
                  </button>
                )}

                {/* Send Voice Note */}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={recordState === 'sending' || recordState === 'transcribing'}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 text-white font-bold text-xs shadow-xs transition-transform active:scale-95 disabled:opacity-50"
                >
                  {recordState === 'sending' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الإرسال...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 rotate-180" />
                      <span>إرسال التسجيل 🚀</span>
                    </>
                  )}
                </button>

                {/* Close/Discard */}
                <button
                  type="button"
                  onClick={handleCancel}
                  className="p-2 rounded-2xl text-slate-500 hover:text-rose-600"
                  title="إلغاء"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Display transcription if available */}
            {transcription && (
              <div className="bg-white/95 rounded-2xl p-2.5 border border-pink-200 text-xs shadow-xs animate-fade-in">
                <p className="font-bold text-pink-700 mb-0.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-pink-500" />
                  <span>النص المفهوم من تسجيلك:</span>
                </p>
                <p className="text-slate-800 font-medium leading-relaxed ps-3 border-s-2 border-pink-400">
                  "{transcription}"
                </p>
              </div>
            )}
          </div>
        )}
    </div>
  );
};
