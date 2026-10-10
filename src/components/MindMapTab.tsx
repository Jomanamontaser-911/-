import React, { useState, useRef, useEffect } from 'react';
import { Language, MindMapData } from '../types';
import { translations } from '../constants/translations';
import { SUBJECTS } from '../constants/subjects';
import { BestieMascot } from './BestieMascot';
import { ThinkingIndicator } from './ThinkingIndicator';
import { processSelectedFile, ParsedFile, formatFileSize } from '../utils/fileHelper';
import { renderMindMapToCanvas } from '../utils/mindmapRenderer';
import { useSRS } from '../context/SRSContext';
import kittenMascotImg from '../assets/kitten_mascot.jpg';
import {
  Download,
  Image as ImageIcon,
  Camera,
  FileText,
  X,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Printer,
  Brain,
  Share2,
  Workflow,
  Check,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface MindMapTabProps {
  language: Language;
  selectedSubject: string;
  onSubjectChange?: (subId: string) => void;
}

export const MindMapTab: React.FC<MindMapTabProps> = ({
  language,
  selectedSubject,
  onSubjectChange,
}) => {
  const t = translations[language];
  const { addCard } = useSRS();

  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [detailLevel, setDetailLevel] = useState<'simple' | 'detailed'>('detailed');
  const [activeSubject, setActiveSubject] = useState(
    selectedSubject && selectedSubject !== 'all' ? selectedSubject : 'biology'
  );

  const [attachedFile, setAttachedFile] = useState<ParsedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'image' | 'interactive'>('image');
  const [zoomScale, setZoomScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [srsSuccess, setSrsSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const kittenImgRef = useRef<HTMLImageElement | null>(null);

  // Pre-load kitten image for canvas watermark
  useEffect(() => {
    const img = new Image();
    img.src = kittenMascotImg;
    img.onload = () => {
      kittenImgRef.current = img;
    };
  }, []);

  useEffect(() => {
    if (selectedSubject && selectedSubject !== 'all') {
      setActiveSubject(selectedSubject);
    }
  }, [selectedSubject]);

  const currentSubjectObj = SUBJECTS.find((s) => s.id === activeSubject) || SUBJECTS[1];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    try {
      const parsed = await processSelectedFile(file);
      setAttachedFile(parsed);
      if (!topic && parsed.name) {
        const cleanName = parsed.name.replace(/\.[^/.]+$/, '');
        setTopic(cleanName);
      }
    } catch (err: any) {
      setFileError(err.message || 'تعذر قراءة الملف');
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    setFileError(null);
  };

  const handleGenerateMindMap = async (customTopic?: string) => {
    const targetTopic = customTopic || topic;
    if (!targetTopic.trim() && !content.trim() && !attachedFile) return;

    setIsLoading(true);
    setMindMapData(null);
    setPngDataUrl(null);
    setFileError(null);
    setZoomScale(1);

    try {
      const res = await fetch('/api/generate-mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: targetTopic,
          content,
          subject: currentSubjectObj.nameAr,
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

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'فشل في إنشاء الخريطة الذهنية');
      }

      const data: MindMapData = await res.json();
      setMindMapData(data);

      // Render into pristine high-res PNG image
      try {
        const pngUrl = await renderMindMapToCanvas(data, kittenImgRef.current);
        setPngDataUrl(pngUrl);
      } catch (canvasErr) {
        console.error('Canvas render error:', canvasErr);
      }
    } catch (err: any) {
      console.error('Mind map generation error:', err);
      setFileError(err.message || 'حدث خطأ أثناء إنشاء الخريطة الذهنية');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPng = async () => {
    if (!mindMapData) return;
    try {
      let downloadUrl = pngDataUrl;
      if (!downloadUrl) {
        downloadUrl = await renderMindMapToCanvas(mindMapData, kittenImgRef.current);
        setPngDataUrl(downloadUrl);
      }

      const link = document.createElement('a');
      const safeTitle = (mindMapData.centralTopic || 'study_bestie')
        .replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_')
        .slice(0, 40);
      link.download = `${safeTitle}_خريطة_ذهنية.png`;
      link.href = downloadUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download PNG:', err);
      window.alert?.('تعذر تحميل الصورة، يرجى المحاولة مرة أخرى');
    }
  };

  const handleSaveToSRS = () => {
    if (!mindMapData) return;
    // Add central topic and branches to SRS
    mindMapData.branches.forEach((br) => {
      const front = `ما هي أهم محاور: ${mindMapData.centralTopic} - فرع (${br.title})؟`;
      const back = br.subtopics
        .map((s) => `• ${s.title}:\n  ${s.points.join('\n  ')}`)
        .join('\n\n');

      addCard({
        subjectId: currentSubjectObj.id,
        subjectName: currentSubjectObj.nameAr,
        topic: `${mindMapData.centralTopic} - ${br.title}`,
        front,
        back,
        keyRule: `الفرع الرئيسي: ${br.title}`,
        source: 'custom',
      });
    });

    setSrsSuccess(true);
    setTimeout(() => setSrsSuccess(false), 3000);
  };

  const handlePrint = () => {
    if (!pngDataUrl) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>خريطة ذهنية - ${mindMapData?.centralTopic || 'Study Bestie'}</title>
            <style>
              body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; background: #fff; }
              img { max-width: 100%; height: auto; border-radius: 8px; }
            </style>
          </head>
          <body>
            <img src="${pngDataUrl}" onload="window.print();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Hero Card */}
      <div className="bg-gradient-to-r from-pink-100/90 via-purple-100/70 to-pink-50/90 rounded-3xl p-4 sm:p-6 border border-pink-200/80 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 relative z-10">
          <BestieMascot mood="studying" size="lg" className="shrink-0 animate-float" />
          <div className="text-center sm:text-start flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-pink-200 text-pink-700 text-xs font-bold mb-2 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
              <span>{t.mindmapTitle}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-pink-950 mb-1.5">
              {language === 'ar'
                ? 'حولي أي درس لخريطة ذهنية بصرية منظمة وجميلة 🌸'
                : 'Turn Any Lesson into an Aesthetic Mind Map 🌸'}
            </h2>
            <p className="text-xs sm:text-sm text-pink-900/80 leading-relaxed max-w-2xl">
              {t.mindmapDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Input Configuration Card */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-4 sm:p-6 border border-pink-100 shadow-sm space-y-4">
        {/* Subject & Detail Level Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Subject picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {language === 'ar' ? 'المادة الدراسية' : 'Subject'}
            </label>
            <select
              value={activeSubject}
              onChange={(e) => {
                setActiveSubject(e.target.value);
                onSubjectChange?.(e.target.value);
              }}
              className="w-full text-xs sm:text-sm font-medium py-2 px-3 rounded-2xl border border-pink-200 bg-pink-50/40 text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-300"
            >
              {SUBJECTS.filter((s) => s.id !== 'all').map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.icon} {language === 'ar' ? sub.nameAr : sub.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Simple vs Detailed toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {language === 'ar' ? 'درجة تفصيل الخريطة' : 'Mind Map Detail Level'}
            </label>
            <div className="grid grid-cols-2 gap-2 bg-pink-50/70 p-1 rounded-2xl border border-pink-200">
              <button
                type="button"
                onClick={() => setDetailLevel('simple')}
                className={`text-xs font-bold py-2 px-3 rounded-xl transition-all ${
                  detailLevel === 'simple'
                    ? 'bg-white text-pink-700 shadow-xs border border-pink-200'
                    : 'text-slate-600 hover:text-pink-600'
                }`}
              >
                {t.mindmapDetailSimple}
              </button>
              <button
                type="button"
                onClick={() => setDetailLevel('detailed')}
                className={`text-xs font-bold py-2 px-3 rounded-xl transition-all ${
                  detailLevel === 'detailed'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-pink-600'
                }`}
              >
                {t.mindmapDetailDetailed}
              </button>
            </div>
          </div>
        </div>

        {/* Lesson Topic Title */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {language === 'ar' ? 'عنوان الدرس أو الموضوع' : 'Lesson Topic'}
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={
              language === 'ar'
                ? 'مثلاً: الانقسام الميوزي والتكاثر، قانون فاراداي، الاتزان الكيميائي...'
                : 'e.g. Cell Division, Faraday’s Law, Chemical Equilibrium...'
            }
            className="w-full text-xs sm:text-sm py-2.5 px-4 rounded-2xl border border-pink-200 bg-pink-50/30 text-slate-800 placeholder:text-pink-900/40 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:bg-white transition-all shadow-xs"
          />
        </div>

        {/* Popular Topic Quick Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-pink-700">
            {language === 'ar' ? 'مواضيع شائعة:' : 'Quick Topics:'}
          </span>
          {currentSubjectObj.popularTopics.map((top, idx) => {
            const label = language === 'ar' ? top.ar : top.en;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setTopic(label);
                  handleGenerateMindMap(label);
                }}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-pink-100/60 hover:bg-pink-200/80 text-pink-800 border border-pink-200 transition-all hover:scale-105"
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Optional pasted notes / content */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {language === 'ar'
              ? 'ملاحظات الدرس أو النص المراد تلخيصه في الخريطة (اختياري)'
              : 'Lesson notes or text to structure into the mind map (Optional)'}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder={
              language === 'ar'
                ? 'الصقي هنا فقرات من كتاب الوزارة، أو تلخيص المستر، أو نقاط معقدة تريدي تنظيمها...'
                : 'Paste paragraphs from your textbook or lecture notes here...'
            }
            className="w-full text-xs sm:text-sm p-3 rounded-2xl border border-pink-200 bg-pink-50/20 text-slate-800 placeholder:text-pink-900/40 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:bg-white transition-all resize-none shadow-xs"
          />
        </div>

        {/* File Attachments (Camera, Image, PDF) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            {language === 'ar'
              ? 'أو ارفعي صورة المذكرة / صفحة الكتاب / ملف PDF لإنشاء الخريطة منه مباشرة 📸'
              : 'Or attach your notes photo / textbook page / PDF to generate map directly 📸'}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-200 text-xs font-bold transition-all shadow-xs"
            >
              <Camera className="w-4 h-4 text-pink-500" />
              <span>{t.captureQuestion || 'تصوير ورقة الدرس'}</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-200 text-xs font-bold transition-all shadow-xs"
            >
              <ImageIcon className="w-4 h-4 text-purple-500" />
              <span>{t.selectImage || 'اختيار صورة'}</span>
            </button>
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-200 text-xs font-bold transition-all shadow-xs"
            >
              <FileText className="w-4 h-4 text-rose-500" />
              <span>{t.uploadPdf || 'رفع ملف PDF'}</span>
            </button>
          </div>
        </div>

        {/* Attached file preview */}
        {attachedFile && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-pink-50/80 border border-pink-200">
            <div className="flex items-center gap-3">
              {attachedFile.previewUrl ? (
                <img
                  src={attachedFile.previewUrl}
                  alt={attachedFile.name}
                  className="w-12 h-12 rounded-xl object-cover border border-pink-200 shadow-xs"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs border border-purple-200">
                  PDF
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs">
                  {attachedFile.name}
                </p>
                <p className="text-[11px] text-pink-900/60 font-medium">
                  {formatFileSize(attachedFile.size)} • {attachedFile.isPdf ? 'مستند PDF' : 'صورة'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="p-1.5 rounded-full hover:bg-pink-200/70 text-slate-500 hover:text-rose-600 transition-colors"
              title={t.removeFile || 'حذف الملف'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {fileError && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {fileError}
          </div>
        )}

        {/* Generate Mind Map Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => handleGenerateMindMap()}
            disabled={isLoading || (!topic.trim() && !content.trim() && !attachedFile)}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 transform active:scale-98"
          >
            {isLoading ? (
              <ThinkingIndicator label={language === 'ar' ? 'بيستي بتصمم الخريطة الذهنية... 🎨' : 'Designing mind map... 🎨'} />
            ) : (
              <>
                <Workflow className="w-5 h-5" />
                <span>{t.generateMindMapBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mind Map Result Display */}
      {mindMapData && (
        <div
          ref={mapContainerRef}
          className={`bg-white/95 backdrop-blur-md rounded-3xl border border-pink-200 shadow-md p-4 sm:p-6 space-y-4 transition-all ${
            isFullscreen ? 'fixed inset-2 z-50 overflow-auto bg-white p-6 shadow-2xl' : ''
          }`}
        >
          {/* Top Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-pink-100">
            {/* Left: View mode toggles */}
            <div className="flex items-center gap-1.5 bg-pink-50/80 p-1 rounded-2xl border border-pink-200">
              <button
                type="button"
                onClick={() => setViewMode('image')}
                className={`text-xs font-bold py-1.5 px-3 rounded-xl transition-all flex items-center gap-1.5 ${
                  viewMode === 'image'
                    ? 'bg-white text-pink-700 shadow-xs border border-pink-200'
                    : 'text-slate-600 hover:text-pink-600'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{t.imageView}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('interactive')}
                className={`text-xs font-bold py-1.5 px-3 rounded-xl transition-all flex items-center gap-1.5 ${
                  viewMode === 'interactive'
                    ? 'bg-white text-pink-700 shadow-xs border border-pink-200'
                    : 'text-slate-600 hover:text-pink-600'
                }`}
              >
                <Workflow className="w-3.5 h-3.5" />
                <span>{t.interactiveView}</span>
              </button>
            </div>

            {/* Right: Download, Print, SRS, and Fullscreen Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Primary Download PNG Button */}
              <button
                type="button"
                onClick={handleDownloadPng}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all active:scale-95"
                title={t.downloadMindMapPng}
              >
                <Download className="w-4 h-4" />
                <span>{t.downloadMindMapPng}</span>
              </button>

              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="p-2 rounded-2xl bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-200 transition-all"
                title="طباعة الخريطة الذهنية"
              >
                <Printer className="w-4 h-4" />
              </button>

              {/* Save to SRS Button */}
              <button
                type="button"
                onClick={handleSaveToSRS}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-bold transition-all ${
                  srsSuccess
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                }`}
                title="حفظ نقاط الخريطة في بطاقات المراجعة الذكية"
              >
                {srsSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تم الحفظ في SRS! 🎉</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-3.5 h-3.5 text-purple-600" />
                    <span>{language === 'ar' ? 'حفظ في SRS 🧠' : 'Save to SRS'}</span>
                  </>
                )}
              </button>

              {/* Zoom controls */}
              <div className="hidden sm:flex items-center gap-1 bg-pink-50/80 p-1 rounded-2xl border border-pink-200">
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.max(0.6, z - 0.15))}
                  className="p-1 rounded-lg hover:bg-pink-100 text-slate-700"
                  title="تصغير"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-bold px-1 text-slate-600">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.min(2.0, z + 0.15))}
                  className="p-1 rounded-lg hover:bg-pink-100 text-slate-700"
                  title="تكبير"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-2xl bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-200 transition-all"
                title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Map Content View */}
          {viewMode === 'image' && pngDataUrl ? (
            <div className="overflow-auto max-h-[750px] rounded-2xl border border-pink-100 bg-white p-2 sm:p-4 text-center">
              <div
                style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top center' }}
                className="transition-transform duration-200 inline-block min-w-full"
              >
                <img
                  src={pngDataUrl}
                  alt={`Mind map of ${mindMapData.centralTopic}`}
                  className="mx-auto rounded-xl shadow-sm border border-pink-100 max-w-full h-auto object-contain cursor-zoom-in"
                  onClick={() => setZoomScale((z) => (z === 1 ? 1.4 : 1))}
                />
              </div>
            </div>
          ) : (
            /* Interactive Card Layout */
            <div className="space-y-6">
              {/* Central Topic Node */}
              <div className="max-w-md mx-auto text-center p-4 rounded-3xl bg-gradient-to-r from-pink-200/90 via-purple-200/80 to-pink-200/90 border-2 border-pink-400 shadow-sm">
                <span className="text-3xl block mb-1">{mindMapData.centralIcon || '🧠'}</span>
                <h3 className="text-lg sm:text-xl font-black text-pink-950">
                  {mindMapData.centralTopic}
                </h3>
                {mindMapData.centralSummary && (
                  <p className="text-xs text-pink-900/80 mt-1 font-medium">
                    {mindMapData.centralSummary}
                  </p>
                )}
              </div>

              {/* Radiating Branches Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mindMapData.branches.map((branch, idx) => (
                  <div
                    key={branch.id || idx}
                    className="p-4 rounded-3xl border shadow-xs transition-all hover:shadow-md bg-white/90 border-pink-200"
                  >
                    {/* Branch Header */}
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-pink-100">
                      <span className="text-2xl">{branch.icon || '📌'}</span>
                      <h4 className="font-bold text-sm text-slate-900 flex-1">
                        {branch.title}
                      </h4>
                    </div>

                    {/* Subtopics */}
                    <div className="space-y-2.5">
                      {branch.subtopics.map((sub, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-2.5 rounded-2xl bg-pink-50/50 border border-pink-100 text-xs"
                        >
                          <p className="font-bold text-pink-900 mb-1">
                            • {sub.title}
                          </p>
                          <ul className="space-y-1 text-slate-700 ps-2">
                            {sub.points.map((pt, pIdx) => (
                              <li key={pIdx} className="leading-relaxed flex items-start gap-1">
                                <span className="text-pink-400 text-[10px] mt-1 shrink-0">✦</span>
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
