import React from 'react';
import { PdfProgressEvent } from '../utils/pdfProcessor';
import { FileText, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface PdfProcessingBannerProps {
  progress: PdfProgressEvent | null;
  error: string | null;
  onRetry?: () => void;
  fileName?: string;
  onCancel?: () => void;
  className?: string;
}

export const PdfProcessingBanner: React.FC<PdfProcessingBannerProps> = ({
  progress,
  error,
  onRetry,
  fileName,
  onCancel,
  className = '',
}) => {
  if (!progress && !error) return null;

  const stageSteps = [
    { id: 'uploading', label: 'رفع الملف' },
    { id: 'reading', label: 'قراءة المحتوى' },
    { id: 'preparing', label: 'تجهيز الإجابة' },
  ];

  const currentStageIndex = progress
    ? stageSteps.findIndex((s) => s.id === progress.stage)
    : -1;

  return (
    <div
      className={`rounded-2xl p-3.5 border transition-all text-xs ${
        error
          ? 'bg-rose-50 border-rose-200 text-rose-800'
          : 'bg-gradient-to-r from-pink-50/90 via-purple-50/80 to-pink-50/90 border-pink-200 text-slate-800 shadow-xs'
      } ${className}`}
    >
      {error ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="font-medium">{error}</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة المحاولة</span>
            </button>
          )}
        </div>
      ) : progress ? (
        <div className="space-y-2.5">
          {/* Header with filename & stage text */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1.5 rounded-xl bg-pink-100 text-pink-700 shrink-0">
                <FileText className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">
                  {fileName || 'ملف PDF'}
                </p>
                <p className="text-[11px] text-pink-700 font-medium">
                  {progress.stageLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-pink-700 bg-pink-100 px-2 py-0.5 rounded-full">
                {progress.percent}%
              </span>
              <Loader2 className="w-4 h-4 text-pink-600 animate-spin shrink-0" />
            </div>
          </div>

          {/* Stepper indicator: جاري رفع الملف -> جاري قراءة المحتوى -> جاري تجهيز الإجابة */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {stageSteps.map((step, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <div key={step.id} className="text-center">
                  <div
                    className={`h-1.5 rounded-full mb-1 transition-all ${
                      isPast
                        ? 'bg-emerald-500'
                        : isCurrent
                        ? 'bg-pink-500 animate-pulse'
                        : 'bg-pink-200/60'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-bold block truncate ${
                      isPast
                        ? 'text-emerald-700'
                        : isCurrent
                        ? 'text-pink-800 font-black'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};
