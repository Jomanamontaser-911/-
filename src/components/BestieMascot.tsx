import React from 'react';
import kittenMascotImg from '../assets/kitten_mascot.jpg';

interface BestieMascotProps {
  mood?: 'happy' | 'studying' | 'cheering' | 'thinking';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const BestieMascot: React.FC<BestieMascotProps> = ({
  mood = 'happy',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28',
  };

  const badgeSizeClasses = {
    sm: 'text-xs -bottom-1 -right-1 p-0.5',
    md: 'text-sm -bottom-1 -right-1 p-0.5',
    lg: 'text-base -bottom-1.5 -right-1.5 p-1',
    xl: 'text-lg -bottom-2 -right-2 p-1.5',
  };

  const moodBadges = {
    studying: '📚',
    cheering: '✨',
    thinking: '💭',
    happy: '💖',
  };

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${sizeClasses[size]} ${className}`}>
      {/* Soft pastel aura glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-300 via-rose-200 to-purple-300 blur-sm opacity-60 animate-pulse-subtle" />

      {/* Illustrated White Kitten Mascot Card */}
      <div className="relative w-full h-full rounded-2xl overflow-hidden bg-white/95 p-1 shadow-sm border border-pink-100 flex items-center justify-center transition-transform hover:scale-105 duration-300">
        <img
          src={kittenMascotImg}
          alt="Study Bestie Kitten 🐱💗"
          className="w-full h-full object-contain filter drop-shadow-sm select-none"
          draggable={false}
        />
      </div>

      {/* Cute mood badge */}
      <span
        className={`absolute rounded-full bg-white/95 shadow-sm border border-pink-200 flex items-center justify-center leading-none ${badgeSizeClasses[size]}`}
        title={`Bestie mood: ${mood}`}
      >
        {moodBadges[mood]}
      </span>
    </div>
  );
};

