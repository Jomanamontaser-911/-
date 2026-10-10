import React from 'react';

interface MarkdownViewProps {
  content: string;
  className?: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Split lines and parse basic markdown structures cleanly
  const lines = content.split('\n');

  return (
    <div className={`space-y-3 font-sans leading-relaxed text-slate-800 ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Heading 1
        if (trimmed.startsWith('# ')) {
          return (
            <h1
              key={idx}
              className="text-lg sm:text-xl font-black text-pink-900 border-b border-pink-100 pb-2 mt-3 flex items-center gap-2"
            >
              <span>{formatInline(trimmed.slice(2))}</span>
            </h1>
          );
        }

        // Heading 2
        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className="text-base sm:text-lg font-black text-purple-900 mt-4 mb-1.5 flex items-center gap-1.5"
            >
              <span>{formatInline(trimmed.slice(3))}</span>
            </h2>
          );
        }

        // Heading 3
        if (trimmed.startsWith('### ')) {
          return (
            <h3
              key={idx}
              className="text-sm sm:text-base font-bold text-slate-900 mt-2.5"
            >
              {formatInline(trimmed.slice(4))}
            </h3>
          );
        }

        // Bullet point
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div
              key={idx}
              className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 ps-2"
            >
              <span className="text-pink-500 font-bold text-base leading-none select-none mt-0.5">•</span>
              <div className="flex-1">{formatInline(trimmed.slice(2))}</div>
            </div>
          );
        }

        // Numbered list (e.g. 1. )
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div
              key={idx}
              className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 ps-2"
            >
              <span className="font-bold text-purple-600 bg-purple-50 text-[11px] px-1.5 py-0.5 rounded-full border border-purple-200 shrink-0">
                {numMatch[1]}
              </span>
              <div className="flex-1">{formatInline(numMatch[2])}</div>
            </div>
          );
        }

        // Blockquote
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={idx}
              className="border-r-4 border-pink-400 bg-pink-50/70 p-3 rounded-2xl text-xs sm:text-sm text-pink-900 font-medium italic"
            >
              {formatInline(trimmed.slice(2))}
            </blockquote>
          );
        }

        // Regular paragraph
        return (
          <p key={idx} className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {formatInline(line)}
          </p>
        );
      })}
    </div>
  );
};

// Helper for inline bold, italic, code
function formatInline(text: string): React.ReactNode {
  // Regex for bold **text** or __text__
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="bg-pink-100 text-pink-800 px-1.5 py-0.5 rounded text-[11px] font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
