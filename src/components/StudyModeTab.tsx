import React, { useState, useRef } from 'react';
import { Language, ExtractedPdfDoc } from '../types';
import { translations } from '../constants/translations';
import { SUBJECTS } from '../constants/subjects';
import { useSRS } from '../context/SRSContext';
import { BestieMascot } from './BestieMascot';
import { ThinkingIndicator } from './ThinkingIndicator';
import { MarkdownView } from './MarkdownView';
import { ParsedFile, processSelectedFile, formatFileSize } from '../utils/fileHelper';
import { processPdfWithStages, PdfProgressEvent } from '../utils/pdfProcessor';
import { AudioRecordingResult } from '../utils/audioRecorder';
import { VoiceRecorderBar } from './VoiceRecorderBar';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { PdfProcessingBanner } from './PdfProcessingBanner';
import {
  Sparkles,
  Camera,
  Image as ImageIcon,
  FileText,
  X,
  Send,
  Brain,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  MessageSquare,
  Mic,
} from 'lucide-react';

interface StudyModeTabProps {
  language: Language;
  selectedSubject: string;
  onSubjectChange: (id: string) => void;
}

export const StudyModeTab: React.FC<StudyModeTabProps> = ({
  language,
  selectedSubject,
  onSubjectChange,
}) => {
  const t = translations[language];
  const { addCard } = useSRS();

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const currentSubjectObj =
    SUBJECTS.find((s) => s.id === selectedSubject) || SUBJECTS[3]; // Physics default

  const [topic, setTopic] = useState(
    currentSubjectObj.popularTopics[0]?.ar || 'قوانين كيرشوف للدوائر المغلقة'
  );
  const [gradeLevel, setGradeLevel] = useState(t.sec3);
  const [studentQuestion, setStudentQuestion] = useState('');
  const [attachedFile, setAttachedFile] = useState<ParsedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Voice recording & Fast PDF states
  const [isVoiceBarOpen, setIsVoiceBarOpen] = useState(false);
  const [voiceNote, setVoiceNote] = useState<AudioRecordingResult | null>(null);
  const [voiceTranscription, setVoiceTranscription] = useState<string | null>(null);
  const [pdfProgress, setPdfProgress] = useState<PdfProgressEvent | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [extractedPdf, setExtractedPdf] = useState<ExtractedPdfDoc | null>(null);
  const [rawPdfFile, setRawPdfFile] = useState<File | null>(null);

  // Streaming state
  const [isLoading, setIsLoading] = useState(false);
  const [streamedText, setStreamedText] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSavedToSRS, setIsSavedToSRS] = useState(false);

  // Follow-up state
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [followUpResponse, setFollowUpResponse] = useState('');
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setPdfError(null);
    setPdfProgress(null);

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      setRawPdfFile(file);
      try {
        const doc = await processPdfWithStages(file, (ev) => {
          setPdfProgress(ev);
        });
        setExtractedPdf(doc);
        setAttachedFile({
          name: doc.name,
          size: doc.size,
          mimeType: 'application/pdf',
          data: doc.base64Data || '',
          isPdf: true,
          isImage: false,
        });
        if (!topic || topic === currentSubjectObj.popularTopics[0]?.ar) {
          setTopic(doc.name.replace(/\.[^/.]+$/, ''));
        }
      } catch (err: any) {
        setPdfError(err.message || 'حدث خطأ في قراءة ملف PDF');
      } finally {
        e.target.value = '';
      }
      return;
    }

    try {
      const parsed = await processSelectedFile(file);
      setAttachedFile(parsed);
      setExtractedPdf(null);
      setRawPdfFile(null);
      if (!topic || topic === currentSubjectObj.popularTopics[0]?.ar) {
        setTopic(parsed.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (err: any) {
      setFileError(err.message || 'حدث خطأ في قراءة الملف');
    } finally {
      e.target.value = '';
    }
  };

  const handleRetryPdf = async () => {
    if (!rawPdfFile) return;
    setPdfError(null);
    try {
      const doc = await processPdfWithStages(rawPdfFile, (ev) => {
        setPdfProgress(ev);
      });
      setExtractedPdf(doc);
      setAttachedFile({
        name: doc.name,
        size: doc.size,
        mimeType: 'application/pdf',
        data: doc.base64Data || '',
        isPdf: true,
        isImage: false,
      });
    } catch (err: any) {
      setPdfError(err.message || 'فشلت إعادة قراءة الملف');
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    setExtractedPdf(null);
    setRawPdfFile(null);
    setPdfProgress(null);
    setPdfError(null);
    setFileError(null);
  };

  const handleSendVoice = (voiceResult: AudioRecordingResult, transcription?: string) => {
    setVoiceNote(voiceResult);
    if (transcription) {
      setVoiceTranscription(transcription);
      if (!studentQuestion) {
        setStudentQuestion(transcription);
      }
    }
  };

  const handleStartExplain = async (customTopic?: string) => {
    const topicToUse = customTopic || topic;
    if ((!topicToUse.trim() && !attachedFile && !voiceNote) || isLoading) return;

    setIsLoading(true);
    setStreamedText('');
    setIsCopied(false);
    setIsSavedToSRS(false);
    setFollowUpQuestion('');
    setFollowUpResponse('');

    try {
      const response = await fetch('/api/study-explain/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: language === 'ar' ? currentSubjectObj.nameAr : currentSubjectObj.nameEn,
          topic: topicToUse || attachedFile?.name || voiceTranscription || 'مسألة مرفقة',
          gradeLevel,
          studentQuestion: studentQuestion || voiceTranscription || undefined,
          language,
          audioData: voiceNote
            ? {
                data: voiceNote.base64,
                mimeType: voiceNote.mimeType,
              }
            : undefined,
          pdfText: extractedPdf && !extractedPdf.isScanned ? extractedPdf.extractedText : undefined,
          pdfMeta: extractedPdf
            ? { name: extractedPdf.name, pageCount: extractedPdf.pageCount, isScanned: extractedPdf.isScanned }
            : undefined,
          fileData: attachedFile && (!extractedPdf || extractedPdf.isScanned)
            ? {
                name: attachedFile.name,
                mimeType: attachedFile.mimeType,
                data: attachedFile.data,
              }
            : undefined,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('فشل بدء الشرح، جاري المحاولة مرة أخرى...');
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
                setStreamedText(accumulated);
              }
            } catch {
              // Ignore partial JSON splits
            }
          }
        }
      }

      if (!accumulated.trim()) {
        throw new Error('لم يتم استلام محتوى من الخادم');
      }
    } catch (err: any) {
      console.error(err);
      setStreamedText(
        language === 'ar'
          ? `معلش يا بطلة، حصل تعثر بسيط في الشبكة (${err.message || 'خطأ مؤقت'}). اضغطي على زر الشرح مرة تانية وهتشتغل فوراً!`
          : `A small network hiccup occurred (${err.message || 'error'}). Please click explain again!`
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
              content: `بخصوص درس "${topic}":\n\n${streamedText.slice(0, 1500)}\n\nسؤالي هو: ${followUpQuestion}`,
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
      setFollowUpResponse(language === 'ar' ? 'حصل خطأ بسيط في الرد، جربي تسألي تاني!' : 'Error occurred, try asking again.');
    } finally {
      setIsFollowUpLoading(false);
    }
  };

  const handleSaveToSRS = () => {
    if (!streamedText) return;

    addCard({
      subjectId: currentSubjectObj.id,
      subjectName: currentSubjectObj.nameAr,
      topic: topic || 'درس مذاكرة',
      front: language === 'ar' ? `مراجعة درس: ${topic}` : `Review concept: ${topic}`,
      back: streamedText.slice(0, 800) + '...',
      keyRule: language === 'ar' ? 'راجع هذا الدرس بتكرار متباعد لتثبيته في الذاكرة' : 'Spaced repetition concept',
      source: 'study_mode',
    });

    setIsSavedToSRS(true);
  };

  const handleCopyExplanation = () => {
    if (!streamedText) return;
    navigator.clipboard.writeText(streamedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
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

      {/* Intro Card */}
      <div className="bg-gradient-to-r from-pink-100/90 via-purple-100/70 to-rose-100/80 rounded-3xl p-4 sm:p-6 border border-pink-200/90 shadow-xs flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <BestieMascot mood="studying" size="lg" className="shrink-0 animate-float" />
        <div className="text-center sm:text-start flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 text-pink-700 text-xs font-bold border border-pink-200 mb-2 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-pink-500" />
            <span>{t.studyModeTitle}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 mb-1">
            {language === 'ar'
              ? 'هنفهم الدرس خطوة بخطوة وبأبسط طريقة 🌸'
              : 'Master Any Lesson Step-by-Step with Ease 🌸'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t.studyModeDesc}
          </p>
        </div>
      </div>

      {/* Input Configuration Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-pink-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Subject picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t.selectSubject}
            </label>
            <select
              value={selectedSubject === 'all' ? currentSubjectObj.id : selectedSubject}
              onChange={(e) => {
                onSubjectChange(e.target.value);
                const sub = SUBJECTS.find((s) => s.id === e.target.value);
                if (sub && sub.popularTopics[0]) {
                  setTopic(language === 'ar' ? sub.popularTopics[0].ar : sub.popularTopics[0].en);
                }
              }}
              className="w-full text-xs sm:text-sm font-semibold py-2.5 px-3 rounded-2xl border border-pink-200 bg-pink-50/40 text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
            >
              {SUBJECTS.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.icon} {language === 'ar' ? sub.nameAr : sub.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Grade level picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t.gradeLevel}
            </label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="w-full text-xs sm:text-sm font-semibold py-2.5 px-3 rounded-2xl border border-pink-200 bg-pink-50/40 text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
            >
              <option value={t.sec3}>{t.sec3}</option>
              <option value={t.sec2}>{t.sec2}</option>
              <option value={t.sec1}>{t.sec1}</option>
            </select>
          </div>
        </div>

        {/* Topic Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {language === 'ar' ? 'اسم الدرس أو الفكرة الصعبة 🎯' : 'Lesson / Concept Name 🎯'}
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t.topicPlaceholder}
            className="w-full text-xs sm:text-sm font-medium py-2.5 px-4 rounded-2xl border border-pink-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
        </div>

        {/* Attachment Options for Study Mode */}
        <div>
          <span className="block text-xs font-bold text-slate-700 mb-1.5">
            {language === 'ar' ? 'أو ارفعي صورة المسألة / ملف الدرس:' : 'Or attach a question photo / lesson PDF:'}
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
                  {attachedFile.isPdf ? 'ملف PDF' : 'صورة مسألة'} • {formatFileSize(attachedFile.size)}
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

        {/* Quick popular topic suggestions */}
        {!attachedFile && (
          <div>
            <span className="text-[11px] font-bold text-pink-700/80 mb-1.5 block">
              {language === 'ar' ? 'موضوعات شائعة للاختيار السريع:' : 'Popular Topics to Pick:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {currentSubjectObj.popularTopics.map((top, idx) => {
                const label = language === 'ar' ? top.ar : top.en;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setTopic(label);
                      handleStartExplain(label);
                    }}
                    className="text-xs px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100 hover:border-pink-300 transition-all cursor-pointer"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Optional student doubt */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {t.optionalDoubt}
          </label>
          <input
            type="text"
            value={studentQuestion}
            onChange={(e) => setStudentQuestion(e.target.value)}
            placeholder={
              language === 'ar'
                ? 'مثلاً: ليه في كيرشوف التيار بيتقسم؟ أو إزاي أعرف اتجاه القوة؟'
                : 'e.g. Why does current divide this way, or how to identify the sign?'
            }
            className="w-full text-xs sm:text-sm font-medium py-2 px-3 rounded-2xl border border-slate-200 bg-slate-50/60 text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
        </div>

        {/* Action Button */}
        <button
          onClick={() => handleStartExplain()}
          disabled={(!topic.trim() && !attachedFile) || isLoading}
          className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            (topic.trim() || attachedFile) && !isLoading
              ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 text-white shadow-md hover:opacity-95 active:scale-[0.99]'
              : 'bg-pink-100 text-pink-300 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <ThinkingIndicator label={language === 'ar' ? 'بيفكر...' : 'Thinking...'} />
            </div>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{t.startExplain}</span>
            </>
          )}
        </button>
      </div>

      {/* Streamed Explanation Results Display */}
      {(streamedText || isLoading) && (
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-pink-200/80 shadow-sm space-y-4 animate-fade-in">
          {/* Header Bar with Actions */}
          <div className="flex items-center justify-between pb-3 border-b border-pink-100 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <BestieMascot mood="cheering" size="sm" className="shrink-0" />
              <h3 className="text-base sm:text-lg font-black text-slate-800">
                {topic || 'شرح الدرس'} 🌸
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSaveToSRS}
                disabled={isSavedToSRS || !streamedText}
                className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 transition-all cursor-pointer ${
                  isSavedToSRS
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
                }`}
                title={t.addToSRS}
              >
                <Brain className="w-3.5 h-3.5 text-purple-500" />
                <span>{isSavedToSRS ? (language === 'ar' ? 'تم الحفظ في SRS 🧠' : 'Saved to SRS 🧠') : t.addToSRS}</span>
              </button>

              <button
                onClick={handleCopyExplanation}
                disabled={!streamedText}
                className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-pink-50 text-pink-700 hover:bg-pink-100 transition-colors cursor-pointer text-xs flex items-center gap-1 font-bold"
                title={t.copy}
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isCopied ? t.copied : t.copy}</span>
              </button>
            </div>
          </div>

          {/* Real-time Streamed Markdown Content */}
          <div className="py-2">
            <MarkdownView content={streamedText} />

            {isLoading && (
              <div className="mt-4 flex items-center gap-2">
                <ThinkingIndicator label={language === 'ar' ? 'بيفكر...' : 'Thinking...'} />
              </div>
            )}
          </div>

          {/* Interactive Follow-up Question Section */}
          {streamedText && !isLoading && (
            <div className="mt-6 pt-4 border-t border-pink-100 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-pink-700">
                <MessageSquare className="w-4 h-4 text-pink-500" />
                <span>{t.askFollowUp}</span>
              </div>

              <div className="flex items-center gap-2 bg-pink-50/50 p-1.5 rounded-2xl border border-pink-200">
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
                      ? 'bg-pink-500 text-white shadow-xs hover:bg-pink-600'
                      : 'bg-pink-200 text-white cursor-not-allowed'
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
                <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs sm:text-sm text-slate-800 space-y-2 animate-fade-in">
                  <div className="font-bold text-purple-900 flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
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
