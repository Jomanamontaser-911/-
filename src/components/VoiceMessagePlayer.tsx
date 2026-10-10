import React, { useState, useRef, useEffect } from 'react';
import { VoiceAttachment } from '../types';
import { Play, Pause, Volume2, Mic, ChevronDown, ChevronUp } from 'lucide-react';

interface VoiceMessagePlayerProps {
  voice: VoiceAttachment;
  sender?: 'user' | 'assistant';
  className?: string;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  voice,
  sender = 'user',
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showTranscription, setShowTranscription] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const duration = voice.duration || 1;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Pseudo-waveform bar heights
  const bars = [40, 70, 95, 60, 80, 50, 90, 75, 45, 85, 65, 90, 55, 75, 40];

  return (
    <div className={`space-y-1.5 ${className}`}>
      <audio
        ref={audioRef}
        src={voice.audioUrl || (voice.data ? `data:${voice.mimeType};base64,${voice.data}` : '')}
        preload="metadata"
      />

      {/* Audio Playback Pill */}
      <div
        className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all ${
          sender === 'user'
            ? 'bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 border-pink-200'
            : 'bg-white/90 border-pink-200 shadow-xs'
        }`}
      >
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-95"
          title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل التسجيل'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ms-0.5" />}
        </button>

        {/* Waveform Visualization */}
        <div className="flex-1 flex items-center gap-0.5 sm:gap-1 h-6 px-1">
          {bars.map((h, idx) => {
            const progressRatio = currentTime / Math.max(duration, 0.1);
            const isPlayed = idx / bars.length <= progressRatio;
            return (
              <div
                key={idx}
                style={{ height: `${Math.max(20, h)}%` }}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isPlayed
                    ? 'bg-pink-600'
                    : isPlaying
                    ? 'bg-pink-300'
                    : 'bg-pink-200'
                }`}
              />
            );
          })}
        </div>

        {/* Duration / Timer display */}
        <span className="text-[11px] font-bold text-pink-900/70 shrink-0 tabular-nums">
          {isPlaying ? formatTime(currentTime) : formatTime(duration)}
        </span>
      </div>

      {/* Transcription snippet if available */}
      {voice.transcription && (
        <div className="bg-white/80 rounded-xl p-2 border border-pink-100 text-xs">
          <button
            type="button"
            onClick={() => setShowTranscription(!showTranscription)}
            className="w-full flex items-center justify-between text-[11px] font-bold text-pink-700 hover:text-pink-800 transition-colors"
          >
            <span className="flex items-center gap-1">
              <Mic className="w-3 h-3 text-pink-500" />
              <span>نص التسجيل المفهوم من بيستي:</span>
            </span>
            {showTranscription ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
          {showTranscription && (
            <p className="mt-1 text-slate-800 font-medium leading-relaxed ps-4 border-s-2 border-pink-300 text-[11px]">
              "{voice.transcription}"
            </p>
          )}
        </div>
      )}
    </div>
  );
};
