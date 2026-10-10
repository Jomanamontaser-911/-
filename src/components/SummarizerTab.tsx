import React, { useState, useRef } from 'react';
import { Language, SummaryResult } from '../types';
import { translations } from '../constants/translations';
import { SUBJECTS } from '../constants/subjects';
import { BestieMascot } from './BestieMascot';
import { ThinkingIndicator } from './ThinkingIndicator';
import { MarkdownView } from './MarkdownView';
import { ParsedFile, processSelectedFile, formatFileSize } from '../utils/fileHelper';
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  Bookmark,
  Camera,
  Image as ImageIcon,
  X,
  List,
  GitFork,
  Table,
  Target,
  Send,
  MessageSquare,
  AlertCircle,
  Zap,
  BookOpen,
} from 'lucide-react';

interface SummarizerTabProps {
  language: Language;
  selectedSubject: string;
}

export const SummarizerTab: React.FC<SummarizerTabProps> = ({
  language,
  selectedSubject,
}) => {
  const t = translations[language];

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const currentSubjectObj =
    SUBJECTS.find((s) => s.id === selectedSubject) || SUBJECTS[4]; // Chemistry default

  const [lessonText, setLessonText] = useState('');
  const [topicName, setTopicName] = useState(
    currentSubjectObj.popularTopics[4]?.ar || 'الكيمياء العضوية: الهيدروكربونات والألكانات'
  );
  const [formatType, setFormatType] = useState<
    'bullet_points' | 'mindmap' | 'formulas_definitions' | 'exam_qa'
  >('bullet_points');
  const [detailLevel, setDetailLevel] = useState<'short' | 'detailed'>('short');

  const [attachedFile, setAttachedFile] = useState<ParsedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Streaming summary state
  const [isLoading, setIsLoading] = useState(false);
  const [streamedSummary, setStreamedSummary] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Follow-up state
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [followUpResponse, setFollowUpResponse] = useState('');
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);

  const sampleTexts: Record<string, string> = {
    arabic:
      'كان وأخواتها أفعال ناسخة ناقصة تدخل على المبتدأ والخبر، فترفع المبتدأ ويسمى اسمها، وتنصب الخبر ويسمى خبرها. من أخواتها: أصبح، أضحى، ظل، أمسى، بات، صار، ليس، ما برح، ما انفك، ما زال، ما فتئ، ما دام. وقد تأتي كان تامة إذا اكتفت بمرفوعها فيعرب فاعلاً.',
    chemistry:
      'الألكانات هيدروكربونات أليفاتية مشبعة ذات سلسلة مفتوحة، صيغتها الجزيئية العامة CnH2n+2. تسمى بالبرافينات، وجميع الروابط بين ذرات الكربون أحادية من نوع سيجما القوية صعبة الكسر، لذلك هي خاملة كيميائياً نسبياً. أبسطها الميثان CH4 ويوجد في الغاز الطبيعي.',
    physics:
      'قانون أوم للدائرة المغلقة ينص على أن القوة الدافعة الكهربية للبطارية VB تساوي مجموع فروق الجهد الخارجية والداخلية: VB = I(R + r). وعند زيادة المقاومة الخارجية R يقل شدة التيار الكلي I، ويزداد فرق الجهد بين قطبي البطارية V = VB - Ir.',
  };

  const handleUseSample = () => {
    const key = selectedSubject in sampleTexts ? selectedSubject : 'chemistry';
    setLessonText(sampleTexts[key] || sampleTexts.chemistry);
    setTopicName(
      key === 'chemistry'
        ? 'الألكانات والهيدروكربونات'
        : key === 'physics'
        ? 'قانون أوم للدائرة المغلقة'
        : 'كان وأخواتها'
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    try {
      const parsed = await processSelectedFile(file);
      setAttachedFile(parsed);
      if (!topicName || topicName === currentSubjectObj.popularTopics[4]?.ar) {
        setTopicName(parsed.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (err: any) {
      setFileError(err.message || 'حدث خطأ أثناء قراءة الملف');
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    setFileError(null);
  };

  const handleSummarize = async () => {
    if ((!lessonText.trim() && !topicName.trim() && !attachedFile) || isLoading) return;

    setIsLoading(true);
    setStreamedSummary('');
    setIsCopied(false);
    setIsSaved(false);
    setFollowUpQuestion('');
    setFollowUpResponse('');

    try {
      const response = await fetch('/api/summarize/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: lessonText,
          subject: language === 'ar' ? currentSubjectObj.nameAr : currentSubjectObj.nameEn,
          topic: topicName || attachedFile?.name || 'ملخص عام',
          formatType,
          detailLevel,
          language,
          fileData: attachedFile
            ? {
                name: attachedFile.name,
                mimeType: attachedFile.mimeType,
                data: attachedFile.data,
              }
            : undefined,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('فشل بدء التلخيص، يرجى المحاولة مرة أخرى...');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulated = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawData = line.slice(6).trim();
            if (rawData === '[DONE]') break;

            try {
              const parsed = JSON.parse(rawData);
              if (parsed.text) {
                accumulated += parsed.text;
                setStreamedSummary(accumulated);
              }
            } catch {
              // Ignore partial JSON
            }
          }
        }
      }

      if (!accumulated.trim()) {
        throw new Error('لم يتم استلام نص التلخيص من الخادم');
      }
    } catch (err: any) {
      console.error(err);
      setStreamedSummary(
        language === 'ar'
          ? `معلش يا بطلة، حصل تعثر بسيط أثناء تجهيز الملخص (${err.message || 'خطأ مؤقت'}). اضغطي لخصيلي مرة تانية وهيشتغل على طول!`
          : `A small error occurred while generating summary. Please click Summarize again!`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUp = async () => {
    if (!followUpQuestion.trim() || isFollowUpLoading) return;

    setIsFollowUpLoading(true);
    setFollowUpResponse('');

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `بخصوص هذا الملخص لـ "${topicName}":\n\n${streamedSummary.slice(0, 1500)}\n\nسؤالي هو: ${followUpQuestion}`,
            },
          ],
          subject: currentSubjectObj.id,
          language,
          fileData: attachedFile
            ? {
                name: attachedFile.name,
                mimeType: attachedFile.mimeType,
                data: attachedFile.data,
              }
            : undefined,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('فشل إرسال سؤال المتابعة');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulated = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawData = line.slice(6).trim();
            if (rawData === '[DONE]') break;

            try {
              const parsed = JSON.parse(rawData);
              if (parsed.text) {
                accumulated += parsed.text;
                setFollowUpResponse(accumulated);
              }
            } catch {
              // Ignore
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setFollowUpResponse(language === 'ar' ? 'حصل خطأ في الإجابة، جربي تسألي تاني!' : 'Error occurred, please ask again.');
    } finally {
      setIsFollowUpLoading(false);
    }
  };

  const handleCopySummary = () => {
    if (!streamedSummary) return;
    navigator.clipboard.writeText(streamedSummary);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveSummary = () => {
    if (!streamedSummary) return;
    const saved = localStorage.getItem('study_bestie_saved_markdown_summaries');
    const existing = saved ? JSON.parse(saved) : [];
    const newEntry = {
      id: Date.now(),
      title: topicName || 'ملخص درس',
      content: streamedSummary,
      date: Date.now(),
    };
    localStorage.setItem(
      'study_bestie_saved_markdown_summaries',
      JSON.stringify([newEntry, ...existing])
    );
    setIsSaved(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-24 sm:pb-8">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={pdfInputRef}
        accept="application/pdf,.pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-100/90 via-pink-100/70 to-rose-100/80 rounded-3xl p-4 sm:p-6 border border-purple-200/90 shadow-xs flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <BestieMascot mood="happy" size="lg" className="shrink-0 animate-float" />
        <div className="text-center sm:text-start flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 text-purple-700 text-xs font-bold border border-purple-200 mb-2 shadow-xs">
            <FileText className="w-3.5 h-3.5 text-purple-500" />
            <span>{t.summarizerTitle}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 mb-1">
            {language === 'ar'
              ? 'لخصي صفحات المنهج في كبسولة سريعة 🌸'
              : 'Condense Lengthy Chapters into 5-Minute Capsules 🌸'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t.summarizerDesc}
          </p>
        </div>
      </div>

      {/* Configuration & Inputs Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-pink-200/80 shadow-xs space-y-4">
        {/* Detail Level Selector (Short vs Detailed) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            {t.summaryDetailLevel}:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDetailLevel('short')}
              className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                detailLevel === 'short'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-pink-500 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-pink-50/50'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>{t.shortSummary}</span>
            </button>

            <button
              type="button"
              onClick={() => setDetailLevel('detailed')}
              className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                detailLevel === 'detailed'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-purple-50/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>{t.detailedSummary}</span>
            </button>
          </div>
        </div>

        {/* Format Selection Cards */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            {t.summaryFormat}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'bullet_points', label: t.formatBullets, icon: <List className="w-4 h-4" /> },
              { id: 'mindmap', label: t.formatMindmap, icon: <GitFork className="w-4 h-4" /> },
              { id: 'formulas_definitions', label: t.formatFormulas, icon: <Table className="w-4 h-4" /> },
              { id: 'exam_qa', label: t.formatExamQA, icon: <Target className="w-4 h-4" /> },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFormatType(f.id as any)}
                className={`p-2.5 sm:p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  formatType === f.id
                    ? 'bg-purple-100 text-purple-800 border-purple-300 shadow-xs scale-102'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-pink-50/50'
                }`}
              >
                <span className={formatType === f.id ? 'text-purple-600' : 'text-slate-400'}>
                  {f.icon}
                </span>
                <span className="text-center text-[11px] leading-tight">{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Topic Title */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700">
              {language === 'ar' ? 'عنوان الدرس أو الموضوع' : 'Topic Name'}
            </label>
            <button
              onClick={handleUseSample}
              className="text-[11px] text-pink-600 hover:text-pink-700 font-semibold cursor-pointer underline"
            >
              {language === 'ar' ? '✨ جربي نص تجريبي جاهز' : '✨ Try sample text'}
            </button>
          </div>
          <input
            type="text"
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            placeholder="مثلاً: الكيمياء العضوية - الألكانات"
            className="w-full text-xs sm:text-sm font-semibold py-2 px-3 rounded-2xl border border-pink-200 bg-pink-50/30 text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
        </div>

        {/* Attachment Options for Summarizer */}
        <div>
          <span className="block text-xs font-bold text-slate-700 mb-1.5">
            {language === 'ar' ? 'أو ارفعي مذكرة / صفحة درس للتلخيص مباشرة:' : 'Or attach a photo / PDF document to summarize:'}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold bg-pink-50 border border-pink-200 text-pink-700 hover:bg-pink-100 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <Camera className="w-4 h-4 text-pink-500" />
              <span>{t.captureQuestion}</span>
            </button>

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <ImageIcon className="w-4 h-4 text-purple-500" />
              <span>{t.selectImage}</span>
            </button>

            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <FileText className="w-4 h-4 text-rose-500" />
              <span>{t.uploadPdf}</span>
            </button>
          </div>
        </div>

        {/* Attached File Preview */}
        {attachedFile && (
          <div className="bg-pink-50/90 border border-pink-200 rounded-2xl p-2.5 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              {attachedFile.previewUrl ? (
                <img
                  src={attachedFile.previewUrl}
                  alt="Preview"
                  className="w-12 h-12 rounded-xl object-cover border border-pink-200 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center shrink-0 text-purple-700">
                  <FileText className="w-6 h-6" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate">
                  {attachedFile.name}
                </div>
                <div className="text-[11px] text-pink-700 font-medium">
                  {attachedFile.isPdf ? 'ملف PDF' : 'صورة مذكرة'} • {formatFileSize(attachedFile.size)}
                </div>
              </div>
            </div>

            <button
              onClick={handleRemoveFile}
              className="p-1.5 rounded-full bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors shadow-2xs shrink-0 cursor-pointer"
              title={t.removeFile}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* File error */}
        {fileError && (
          <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{fileError}</span>
          </div>
        )}

        {/* Text Input (Optional if file uploaded) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {t.lessonTextPlaceholder}
          </label>
          <textarea
            value={lessonText}
            onChange={(e) => setLessonText(e.target.value)}
            rows={3}
            placeholder={
              attachedFile
                ? (language === 'ar' ? 'تم اختيار ملف. يمكنك كتابة ملاحظات إضافية هنا (اختياري)...' : 'File attached. You can write extra notes here (optional)...')
                : (language === 'ar' ? 'انسخي هنا نص الدرس أو صفحة من المذكرة أو اكتبي النقاط المهمة...' : 'Paste notes or text here...')
            }
            className="w-full text-xs sm:text-sm py-2 px-3 rounded-2xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300 leading-relaxed"
          />
        </div>

        {/* Action button */}
        <button
          onClick={handleSummarize}
          disabled={(!lessonText.trim() && !topicName.trim() && !attachedFile) || isLoading}
          className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            (lessonText.trim() || topicName.trim() || attachedFile) && !isLoading
              ? 'bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 text-white shadow-md hover:opacity-95 active:scale-[0.99]'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <ThinkingIndicator label={language === 'ar' ? 'بيفكر...' : 'Thinking...'} />
            </div>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{t.summarizeBtn}</span>
            </>
          )}
        </button>
      </div>

      {/* Streamed Summary Results Display */}
      {(streamedSummary || isLoading) && (
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-pink-200/80 shadow-sm space-y-4 animate-fade-in">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-pink-100 gap-2 flex-wrap">
            <div>
              <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                {detailLevel === 'short' ? t.shortSummary : t.detailedSummary}
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-800 mt-1">
                {topicName || 'ملخص الدرس'} 🌸
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopySummary}
                disabled={!streamedSummary}
                className="p-2 rounded-xl bg-pink-50 text-pink-700 hover:bg-pink-100 transition-colors cursor-pointer text-xs flex items-center gap-1 font-bold"
                title={t.copy}
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isCopied ? t.copied : t.copy}</span>
              </button>

              <button
                onClick={handleSaveSummary}
                disabled={!streamedSummary}
                className={`p-2 rounded-xl transition-colors cursor-pointer text-xs flex items-center gap-1 font-bold ${
                  isSaved
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
                title="حفظ في المفضلة"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isSaved ? 'تم الحفظ' : 'حفظ'}</span>
              </button>
            </div>
          </div>

          {/* Real-time Streamed Markdown Content */}
          <div className="py-2">
            <MarkdownView content={streamedSummary} />

            {isLoading && (
              <div className="mt-4 flex items-center gap-2">
                <ThinkingIndicator label={language === 'ar' ? 'بيفكر...' : 'Thinking...'} />
              </div>
            )}
          </div>

          {/* Interactive Follow-up Question Section */}
          {streamedSummary && !isLoading && (
            <div className="mt-6 pt-4 border-t border-pink-100 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-700">
                <MessageSquare className="w-4 h-4 text-purple-500" />
                <span>{t.askFollowUp}</span>
              </div>

              <div className="flex items-center gap-2 bg-purple-50/50 p-1.5 rounded-2xl border border-purple-200">
                <input
                  type="text"
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleFollowUp();
                    }
                  }}
                  placeholder={t.askFollowUpPlaceholder}
                  className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                <button
                  onClick={handleFollowUp}
                  disabled={!followUpQuestion.trim() || isFollowUpLoading}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    followUpQuestion.trim() && !isFollowUpLoading
                      ? 'bg-purple-600 text-white shadow-xs hover:bg-purple-700'
                      : 'bg-purple-200 text-white cursor-not-allowed'
                  }`}
                >
                  <Send className={`w-3.5 h-3.5 ${language === 'ar' ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {isFollowUpLoading && (
                <div className="py-2">
                  <ThinkingIndicator label={language === 'ar' ? 'بيفكر...' : 'Thinking...'} />
                </div>
              )}

              {followUpResponse && (
                <div className="p-3.5 rounded-2xl bg-pink-50/70 border border-pink-200 text-xs sm:text-sm text-slate-800 space-y-2 animate-fade-in">
                  <div className="font-bold text-pink-900 flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                    <span>توضيح بيستي للسؤال:</span>
                  </div>
                  <MarkdownView content={followUpResponse} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
