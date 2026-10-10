import React from 'react';

interface ThinkingIndicatorProps {
  label?: string;
  className?: string;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  label = 'بيفكر...',
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-50/90 border border-pink-200/70 shadow-2xs ${className}`}>
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-pink-300 animate-bounce" />
      </div>
      <span className="text-[11px] font-medium text-pink-700/90 tracking-wide select-none">
        {label}
      </span>
    </div>
  );
};
