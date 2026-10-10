import React, { useState, useRef } from 'react';
import { Language, QuizData, QuizQuestion } from '../types';
import { translations } from '../constants/translations';
import { SUBJECTS } from '../constants/subjects';
import { useSRS } from '../context/SRSContext';
import { saveQuizAttempt } from '../utils/progress';
import { BestieMascot } from './BestieMascot';
import { ThinkingIndicator } from './ThinkingIndicator';
import { ParsedFile, processSelectedFile, formatFileSize } from '../utils/fileHelper';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Trophy,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Check,
  AlertCircle,
  Brain,
  Camera,
  Image as ImageIcon,
  FileText,
  X,
} from 'lucide-react';

interface QuizTabProps {
  language: Language;
  selectedSubject: string;
  onSubjectChange: (id: string) => void;
  onScoreEarned?: (points: number) => void;
}

export const QuizTab: React.FC<QuizTabProps> = ({
  language,
  selectedSubject,
  onSubjectChange,
  onScoreEarned,
}) => {
  const t = translations[language];
  const { addCardsFromQuiz, addCard } = useSRS();

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const currentSubjectObj =
    SUBJECTS.find((s) => s.id === selectedSubject) || SUBJECTS[0]; // Arabic default

  const [topic, setTopic] = useState(
    currentSubjectObj.popularTopics[0]?.ar || 'كان وأخواتها وكاد وأخواتها'
  );
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);

  const [attachedFile, setAttachedFile] = useState<ParsedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Active quiz session states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [showExplanation, setShowExplanation] = useState<Record<number, boolean>>({});
  const [showHint, setShowHint] = useState<Record<number, boolean>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [savedToSRS, setSavedToSRS] = useState<Record<number, boolean>>({});
  const [allMistakesSaved, setAllMistakesSaved] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    try {
      const parsed = await processSelectedFile(file);
      setAttachedFile(parsed);
      if (!topic || topic === currentSubjectObj.popularTopics[0]?.ar) {
        setTopic(parsed.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (err: any) {
      setFileError(err.message || 'حدث خطأ في قراءة الملف');
    } finally {
      e.target.value = '';
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    setFileError(null);
  };

  const handleGenerateQuiz = async (customTopic?: string) => {
    const topicToUse = customTopic || topic;
    if ((!topicToUse.trim() && !attachedFile) || isLoading) return;

    setIsLoading(true);
    setQuizData(null);
    setCurrentIndex(0);
    setUserAnswers({});
    setShowExplanation({});
    setShowHint({});
    setIsCompleted(false);

    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: language === 'ar' ? currentSubjectObj.nameAr : currentSubjectObj.nameEn,
          topic: topicToUse || attachedFile?.name || 'المستند المرفق',
          difficulty,
          count: questionCount,
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

      if (!response.ok) {
        throw new Error('Failed to generate quiz');
      }

      const data: QuizData = await response.json();
      setQuizData(data);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'حصل خطأ أثناء توليد الكويز، حاولي مرة أخرى');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (qIndex: number, optionIndex: number) => {
    if (userAnswers[qIndex] !== undefined) return; // already answered

    setUserAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }));
    setShowExplanation((prev) => ({ ...prev, [qIndex]: true }));

    // Check if this answer was correct
    if (quizData && quizData.questions[qIndex]?.correctIndex === optionIndex) {
      if (onScoreEarned) onScoreEarned(10);
    }
  };

  const calculateScore = () => {
    if (!quizData) return { correct: 0, total: 0, percent: 0 };
    let correct = 0;
    quizData.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctIndex) {
        correct++;
      }
    });
    return {
      correct,
      total: quizData.questions.length,
      percent: Math.round((correct / quizData.questions.length) * 100),
    };
  };

  const handleFinishQuiz = () => {
    setIsCompleted(true);
    const score = calculateScore();

    // Save quiz attempt for Progress tab tracking
    if (quizData) {
      saveQuizAttempt({
        subjectId: currentSubjectObj.id,
        subjectName: currentSubjectObj.nameAr,
        topic: quizData.topic,
        totalQuestions: score.total,
        correctAnswers: score.correct,
        percentage: score.percent,
      });
    }

    if (score.percent >= 60) {
      // Throw festive confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f472b6', '#c084fc', '#fb7185', '#38bdf8', '#facc15'],
      });
    }
  };

  const currentQ: QuizQuestion | undefined = quizData?.questions[currentIndex];
  const isAnswered = currentQ ? userAnswers[currentIndex] !== undefined : false;

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-24 sm:pb-8">
      {/* Intro Banner */}
      <div className="bg-gradient-to-r from-pink-100/90 via-rose-100/70 to-purple-100/80 rounded-3xl p-4 sm:p-6 border border-pink-200/90 shadow-xs flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <BestieMascot
          mood={isCompleted ? 'cheering' : 'studying'}
          size="lg"
          className="shrink-0 animate-float"
        />
        <div className="text-center sm:text-start flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 text-pink-700 text-xs font-bold border border-pink-200 mb-2 shadow-xs">
            <Trophy className="w-3.5 h-3.5 text-pink-500" />
            <span>{t.quizTitle}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 mb-1">
            {language === 'ar'
              ? 'تحدي الأسئلة الذكية بأسلوب الامتحانات 🎯'
              : 'Interactive Exam-Style MCQ Arena 🎯'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t.quizDesc}
          </p>
        </div>
      </div>

      {/* Quiz Generator Form if not currently testing */}
      {!quizData && (
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-pink-200/80 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Subject */}
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

            {/* Questions count */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t.questionCount}
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full text-xs sm:text-sm font-semibold py-2.5 px-3 rounded-2xl border border-pink-200 bg-pink-50/40 text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
              >
                <option value={3}>3 أسئلة سريعة (كويز خاطف)</option>
                <option value={5}>5 أسئلة نموذجية (تدريب متوازن)</option>
                <option value={10}>10 أسئلة شاملة (امتحان مصغر)</option>
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t.difficulty}
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full text-xs sm:text-sm font-semibold py-2.5 px-3 rounded-2xl border border-pink-200 bg-pink-50/40 text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
              >
                <option value="easy">{t.diffEasy}</option>
                <option value="medium">{t.diffMedium}</option>
                <option value="hard">{t.diffHard}</option>
              </select>
            </div>
          </div>

          {/* Topic Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {language === 'ar' ? 'موضوع الكويز أو الفصل' : 'Quiz Topic'}
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="اكتبي عنوان الدرس أو المفهوم..."
              className="w-full text-xs sm:text-sm font-semibold py-2.5 px-3 rounded-2xl border border-pink-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>

          {/* Attachment buttons for Quiz */}
          <div>
            <span className="block text-xs font-bold text-slate-700 mb-1.5">
              {language === 'ar' ? 'أو ارفعي صورة المسألة / مذكرة لتوليد كويز عليها:' : 'Or attach a photo / document to generate quiz:'}
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
                    {attachedFile.isPdf ? 'ملف PDF' : 'صورة'} • {formatFileSize(attachedFile.size)}
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

          {/* Quick topics chips */}
          {!attachedFile && (
            <div className="flex flex-wrap gap-1.5">
              {currentSubjectObj.popularTopics.map((top, idx) => {
                const label = language === 'ar' ? top.ar : top.en;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setTopic(label);
                      handleGenerateQuiz(label);
                    }}
                    className="text-xs px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100 transition-all cursor-pointer"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Start Quiz button */}
          <button
            onClick={() => handleGenerateQuiz()}
            disabled={(!topic.trim() && !attachedFile) || isLoading}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              (topic.trim() || attachedFile) && !isLoading
                ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white shadow-md hover:opacity-95'
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
                <span>{t.startQuiz}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Active Quiz Question Runner */}
      {quizData && !isCompleted && currentQ && (
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-pink-200 shadow-sm space-y-5 animate-fade-in">
          {/* Progress bar and tracker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span className="text-pink-600">
                {t.questionTracker} {currentIndex + 1} {t.of} {quizData.questions.length}
              </span>
              <span className="bg-pink-100 text-pink-800 px-2.5 py-0.5 rounded-full">
                {quizData.subject} • {quizData.topic}
              </span>
            </div>
            {/* Progress line */}
            <div className="w-full h-2.5 bg-pink-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
                style={{
                  width: `${((currentIndex + 1) / quizData.questions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Question text */}
          <div className="p-4 rounded-2xl bg-pink-50/50 border border-pink-100">
            <h3 className="text-sm sm:text-base font-bold text-slate-800 leading-relaxed">
              {currentQ.question}
            </h3>
          </div>

          {/* Options */}
          <div className="space-y-2.5">
            {currentQ.options.map((option, optIdx) => {
              const selectedOpt = userAnswers[currentIndex];
              const hasSelected = selectedOpt !== undefined;
              const isThisCorrect = currentQ.correctIndex === optIdx;
              const isThisSelected = selectedOpt === optIdx;

              let btnClass = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-pink-50/70 hover:border-pink-300';
              if (hasSelected) {
                if (isThisCorrect) {
                  btnClass = 'bg-emerald-100 border-emerald-400 text-emerald-900 font-bold shadow-xs';
                } else if (isThisSelected && !isThisCorrect) {
                  btnClass = 'bg-rose-100 border-rose-400 text-rose-900 font-bold';
                } else {
                  btnClass = 'bg-slate-50/50 border-slate-200 text-slate-400 opacity-60';
                }
              }

              return (
                <button
                  key={optIdx}
                  onClick={() => handleSelectOption(currentIndex, optIdx)}
                  disabled={hasSelected}
                  className={`w-full p-3.5 rounded-2xl border text-xs sm:text-sm text-start font-medium transition-all flex items-center justify-between cursor-pointer ${btnClass}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-white text-slate-600 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span>{option}</span>
                  </div>

                  {hasSelected && isThisCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  {hasSelected && isThisSelected && !isThisCorrect && (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Hint accordion */}
          {currentQ.hint && !isAnswered && (
            <div>
              <button
                onClick={() =>
                  setShowHint((prev) => ({ ...prev, [currentIndex]: !prev[currentIndex] }))
                }
                className="text-xs text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1.5 cursor-pointer bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>{t.showHint}</span>
              </button>
              {showHint[currentIndex] && (
                <div className="mt-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed font-medium">
                  💡 {currentQ.hint}
                </div>
              )}
            </div>
          )}

          {/* Answer Explanation once answered */}
          {isAnswered && (
            <div
              className={`p-4 rounded-2xl border text-xs sm:text-sm space-y-2.5 ${
                userAnswers[currentIndex] === currentQ.correctIndex
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-bold flex items-center gap-1.5">
                  {userAnswers[currentIndex] === currentQ.correctIndex ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{t.correctAnswer}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>{t.wrongAnswer}</span>
                    </>
                  )}
                </div>

                {/* Save to SRS flashcard button */}
                <button
                  type="button"
                  onClick={() => {
                    const isMistake = userAnswers[currentIndex] !== currentQ.correctIndex;
                    addCard({
                      subjectId: currentSubjectObj.id,
                      subjectName: currentSubjectObj.nameAr,
                      topic: quizData.topic,
                      front: currentQ.question,
                      back: `الإجابة الصحيحة: ${currentQ.options[currentQ.correctIndex]}\n\nالشرح:\n${currentQ.explanation}`,
                      keyRule: currentQ.hint || undefined,
                      source: 'quiz',
                    });
                    setSavedToSRS((prev) => ({ ...prev, [currentIndex]: true }));
                  }}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 transition-all cursor-pointer ${
                    savedToSRS[currentIndex]
                      ? 'bg-purple-200 text-purple-800'
                      : 'bg-white/80 hover:bg-white text-purple-700 border border-purple-200 shadow-2xs'
                  }`}
                >
                  <Brain className="w-3.5 h-3.5 text-purple-500" />
                  <span>
                    {savedToSRS[currentIndex] ? 'تم الحفظ في SRS 🧠' : 'حفظ في التكرار المتباعد 🧠'}
                  </span>
                </button>
              </div>

              <p className="text-slate-700 leading-relaxed">
                {currentQ.explanation}
              </p>
            </div>
          )}

          {/* Bottom navigation buttons */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentIndex > 0
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'opacity-40 text-slate-300 cursor-not-allowed'
              }`}
            >
              السابق
            </button>

            {currentIndex < quizData.questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                disabled={!isAnswered}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isAnswered
                    ? 'bg-pink-600 text-white shadow-md hover:bg-pink-700'
                    : 'bg-pink-100 text-pink-300 cursor-not-allowed'
                }`}
              >
                <span>{t.nextQuestion}</span>
              </button>
            ) : (
              <button
                onClick={handleFinishQuiz}
                disabled={!isAnswered}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isAnswered
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md hover:opacity-95'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>{t.finishQuiz}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quiz Completion & Score Card */}
      {isCompleted && quizData && (
        <div className="bg-white rounded-3xl p-5 sm:p-8 border border-pink-200/90 shadow-sm text-center space-y-6 animate-fade-in">
          <BestieMascot mood="cheering" size="xl" className="mx-auto" />

          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-1">
              {calculateScore().percent >= 80
                ? t.greatJob
                : calculateScore().percent >= 50
                ? t.goodJob
                : t.needsReview}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              {quizData.subject} • {quizData.topic}
            </p>
          </div>

          {/* Big Score Dial */}
          <div className="inline-flex flex-col items-center justify-center p-6 rounded-3xl bg-pink-50 border-2 border-pink-200 shadow-xs">
            <span className="text-3xl sm:text-5xl font-black text-pink-600">
              {calculateScore().percent}%
            </span>
            <span className="text-xs font-bold text-slate-600 mt-1">
              ({calculateScore().correct} / {calculateScore().total} صحيحة)
            </span>
          </div>

          {/* Review of questions */}
          <div className="space-y-3 text-start max-w-xl mx-auto">
            <h4 className="text-xs sm:text-sm font-bold text-slate-700">
              {t.reviewExplanations}:
            </h4>
            {quizData.questions.map((q, idx) => {
              const isRight = userAnswers[idx] === q.correctIndex;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border text-xs ${
                    isRight
                      ? 'bg-emerald-50/60 border-emerald-200 text-slate-800'
                      : 'bg-rose-50/60 border-rose-200 text-slate-800'
                  }`}
                >
                  <p className="font-bold flex items-center gap-1.5 mb-1">
                    {isRight ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    )}
                    <span>{q.question}</span>
                  </p>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    الإجابة الصحيحة: {q.options[q.correctIndex]}
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    💡 {q.explanation}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Reset / Try another quiz */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {calculateScore().correct < calculateScore().total && (
              <button
                type="button"
                onClick={() => {
                  const mistakeItems: any[] = [];
                  quizData.questions.forEach((q, idx) => {
                    if (userAnswers[idx] !== q.correctIndex) {
                      mistakeItems.push({
                        question: q.question,
                        answer: q.options[q.correctIndex],
                        explanation: q.explanation,
                        subjectId: currentSubjectObj.id,
                        subjectName: currentSubjectObj.nameAr,
                        topic: quizData.topic,
                        isMistake: true,
                      });
                    }
                  });
                  addCardsFromQuiz(mistakeItems);
                  setAllMistakesSaved(true);
                  alert(language === 'ar' ? `تم حفظ ${mistakeItems.length} أخطاء في جدول التكرار المتباعد لتثبيتها غداً! 🧠` : 'Saved mistakes to SRS! 🧠');
                }}
                disabled={allMistakesSaved}
                className={`py-3 px-5 rounded-2xl font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  allMistakesSaved
                    ? 'bg-purple-100 text-purple-700 cursor-default'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                <Brain className="w-4 h-4" />
                <span>
                  {allMistakesSaved
                    ? 'تم حفظ الأخطاء في التكرار المتباعد 🧠'
                    : `حفظ ${calculateScore().total - calculateScore().correct} أخطاء في الـ SRS للمراجعة 🧠`}
                </span>
              </button>
            )}

            <button
              onClick={() => {
                setQuizData(null);
                setIsCompleted(false);
              }}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs sm:text-sm shadow-md hover:opacity-95 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.tryAnotherQuiz}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
