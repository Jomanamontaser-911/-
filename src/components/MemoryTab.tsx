import React, { useState } from 'react';
import { Language, SRSCard, SRSGrade } from '../types';
import { translations } from '../constants/translations';
import { SUBJECTS } from '../constants/subjects';
import { useSRS } from '../context/SRSContext';
import { BestieMascot } from './BestieMascot';
import confetti from 'canvas-confetti';
import {
  Brain,
  Sparkles,
  RotateCw,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Award,
  BookOpen,
  Volume2,
  VolumeX,
  ChevronRight,
  Flame,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface MemoryTabProps {
  language: Language;
  selectedSubject: string;
}

export const MemoryTab: React.FC<MemoryTabProps> = ({
  language,
  selectedSubject,
}) => {
  const t = translations[language];
  const { cards, dueCards, reviewCard, addCard, deleteCard, retentionRate, stats } = useSRS();

  // Active review session state
  const [activeReviewCards, setActiveReviewCards] = useState<SRSCard[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // New card modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newKeyRule, setNewKeyRule] = useState('');
  const [newSubjectId, setNewSubjectId] = useState(selectedSubject === 'all' ? 'physics' : selectedSubject);
  const [newTopic, setNewTopic] = useState('');

  // AI Flashcard generator state
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiTopicInput, setAiTopicInput] = useState('');

  // Voice speech state
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Filtered card list
  const filteredCards = cards.filter((c) =>
    selectedSubject === 'all' ? true : c.subjectId === selectedSubject
  );

  const startReviewSession = (cardsToReview = dueCards) => {
    if (cardsToReview.length === 0) return;
    setActiveReviewCards([...cardsToReview]);
    setCurrentReviewIndex(0);
    setIsFlipped(false);
    setIsReviewing(true);
    setSessionCompleted(false);
  };

  const handleGrade = (grade: SRSGrade) => {
    const currentCard = activeReviewCards[currentReviewIndex];
    if (!currentCard) return;

    reviewCard(currentCard.id, grade);
    setIsFlipped(false);

    if (currentReviewIndex + 1 < activeReviewCards.length) {
      setCurrentReviewIndex((prev) => prev + 1);
    } else {
      // Session finished!
      setIsReviewing(false);
      setSessionCompleted(true);
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ec4899', '#8b5cf6', '#f472b6', '#3b82f6', '#fbbf24'],
      });
    }
  };

  const handleSpeech = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_]/g, ''));
    utterance.lang = language === 'ar' ? 'ar-EG' : 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleCreateCustomCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;

    const sub = SUBJECTS.find((s) => s.id === newSubjectId);
    addCard({
      subjectId: newSubjectId,
      subjectName: sub ? (language === 'ar' ? sub.nameAr : sub.nameEn) : 'عام',
      topic: newTopic || 'مفهوم أساسي',
      front: newFront.trim(),
      back: newBack.trim(),
      keyRule: newKeyRule.trim() || undefined,
      source: 'custom',
    });

    setNewFront('');
    setNewBack('');
    setNewKeyRule('');
    setNewTopic('');
    setShowAddModal(false);
    alert(language === 'ar' ? 'تمت إضافة البطاقة بنجاح لجدول التكرار المتباعد! 🌸' : 'Card added to SRS! 🌸');
  };

  const handleGenerateAIFlashcards = async () => {
    if (!aiTopicInput.trim() || isGeneratingAI) return;
    setIsGeneratingAI(true);
    try {
      const sub = SUBJECTS.find((s) => s.id === (selectedSubject === 'all' ? 'chemistry' : selectedSubject));
      const res = await fetch('/api/study-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: sub ? (language === 'ar' ? sub.nameAr : sub.nameEn) : 'الكيمياء',
          topic: aiTopicInput,
          language,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate cards');
      const data = await res.json();

      // Convert generated steps & golden rules into high-yield SRS cards
      if (data.steps && data.steps.length > 0) {
        data.steps.slice(0, 3).forEach((st: any) => {
          addCard({
            subjectId: sub ? sub.id : 'general',
            subjectName: sub ? (language === 'ar' ? sub.nameAr : sub.nameEn) : 'عام',
            topic: data.title || aiTopicInput,
            front: `ما هي الفكرة الأساسية لـ: ${st.title}؟`,
            back: `${st.intuition}\n\nالشرح:\n${st.explanation}`,
            keyRule: st.proTip || data.commonExamPitfall,
            source: 'ai',
          });
        });
      }

      setAiTopicInput('');
      alert(language === 'ar' ? 'تم توليد وحفظ 3 بطاقات ذكية في جدول الذاكرة! 🧠✨' : 'Generated and saved 3 smart cards! 🧠✨');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'حدث خطأ في توليد البطاقات');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const currentCard = activeReviewCards[currentReviewIndex];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 sm:pb-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-100/90 via-pink-100/70 to-rose-100/80 rounded-3xl p-4 sm:p-6 border border-purple-200/90 shadow-xs flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <BestieMascot mood="studying" size="lg" className="shrink-0 animate-float" />
        <div className="text-center sm:text-start flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 text-purple-700 text-xs font-bold border border-purple-200 mb-2 shadow-xs">
            <Brain className="w-3.5 h-3.5 text-purple-500" />
            <span>نظام التكرار المتباعد (SRS - Spaced Repetition)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 mb-1">
            {language === 'ar'
              ? 'تثبيت المعلومات في الذاكرة طويلة المدى بلا نسيان 🧠'
              : 'Lock Knowledge in Long-Term Memory with Spaced Repetition 🧠'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {language === 'ar'
              ? 'مبني على خوارزمية سوبر ميمو (SM-2) ومنحنى النسيان لإبنجهاوس. بنفكرك بكل قاعدة ومسألة في الوقت المثالي قبل ما تنسيها بالظبط!'
              : 'Based on SM-2 algorithm & Ebbinghaus forgetting curve. Reviews each formula and rule just as you are about to forget it!'}
          </p>
        </div>
      </div>

      {/* Memory Health & Stats Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Retention Meter */}
        <div className="bg-white rounded-3xl p-4 border border-purple-200/80 shadow-xs flex flex-col items-center text-center">
          <span className="text-[11px] font-bold text-slate-500 mb-1">صحة الذاكرة والاحتفاظ</span>
          <span className="text-2xl sm:text-3xl font-black text-purple-600 font-mono">
            {retentionRate}%
          </span>
          <span className="text-[10px] text-purple-700 font-semibold mt-0.5">
            {retentionRate >= 80 ? 'ممتازة وثابتة 🌟' : 'محتاجة مراجعة سريعة 💪'}
          </span>
        </div>

        {/* Due Today */}
        <div className="bg-white rounded-3xl p-4 border border-pink-200/80 shadow-xs flex flex-col items-center text-center">
          <span className="text-[11px] font-bold text-slate-500 mb-1">مستحق المراجعة اليوم</span>
          <span className="text-2xl sm:text-3xl font-black text-pink-600 font-mono">
            {stats.dueToday}
          </span>
          <span className="text-[10px] text-pink-700 font-semibold mt-0.5">
            {stats.dueToday > 0 ? 'يلا نراجعهم سوا! 🚀' : 'أنجزتي كل مراجعات اليوم! 🌸'}
          </span>
        </div>

        {/* Learning Cards (Boxes 1-3) */}
        <div className="bg-white rounded-3xl p-4 border border-rose-200/80 shadow-xs flex flex-col items-center text-center">
          <span className="text-[11px] font-bold text-slate-500 mb-1">قيد التثبيت (مراحل 1-3)</span>
          <span className="text-2xl sm:text-3xl font-black text-rose-600 font-mono">
            {stats.learning}
          </span>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5">تكرار قصير المدى</span>
        </div>

        {/* Mastered Cards (Boxes 4-5) */}
        <div className="bg-white rounded-3xl p-4 border border-emerald-200/80 shadow-xs flex flex-col items-center text-center">
          <span className="text-[11px] font-bold text-slate-500 mb-1">متقنة ومحفوظة صم ✨</span>
          <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
            {stats.mastered}
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold mt-0.5">تكرار طويل المدى (30+ يوم)</span>
        </div>
      </div>

      {/* Leitner Box Progress Visualizer */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-pink-200/80 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-pink-500" />
            <span>مراحل صناديق لايتنر (Leitner Boxes)</span>
          </span>
          <span className="text-[11px] text-slate-400">إجمالي {cards.length} بطاقة</span>
        </div>

        <div className="grid grid-cols-5 gap-2 text-center">
          {[
            { box: 1, label: 'صندوق 1', interval: 'يومياً', count: cards.filter((c) => c.box === 1).length, color: 'bg-rose-100 text-rose-800 border-rose-200' },
            { box: 2, label: 'صندوق 2', interval: 'كل 3 أيام', count: cards.filter((c) => c.box === 2).length, color: 'bg-amber-100 text-amber-800 border-amber-200' },
            { box: 3, label: 'صندوق 3', interval: 'أسبوعياً', count: cards.filter((c) => c.box === 3).length, color: 'bg-purple-100 text-purple-800 border-purple-200' },
            { box: 4, label: 'صندوق 4', interval: 'كل أسبوعين', count: cards.filter((c) => c.box === 4).length, color: 'bg-blue-100 text-blue-800 border-blue-200' },
            { box: 5, label: 'صندوق 5', interval: 'شهرياً ✨', count: cards.filter((c) => c.box === 5).length, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
          ].map((b) => (
            <div key={b.box} className={`p-2 rounded-2xl border ${b.color}`}>
              <span className="block text-xs sm:text-sm font-black">{b.count}</span>
              <span className="block text-[10px] font-bold mt-0.5 leading-tight">{b.label}</span>
              <span className="block text-[9px] opacity-75">{b.interval}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Review Arena or Start Review Prompt */}
      {isReviewing && currentCard ? (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border-2 border-purple-200 shadow-md space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span className="text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              بطاقة {currentReviewIndex + 1} من {activeReviewCards.length}
            </span>
            <span className="text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full">
              {currentCard.subjectName} • {currentCard.topic}
            </span>
          </div>

          {/* Interactive Flashcard with Flip */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="min-h-56 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-pink-50/60 via-purple-50/40 to-white border-2 border-pink-200/90 shadow-sm flex flex-col justify-between cursor-pointer hover:border-pink-300 transition-all select-none relative group"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold text-pink-600">
                {isFlipped ? 'الإجابة والحل النموذجي 📝' : 'السؤال / المفهوم 🎯'}
              </span>
              <span className="text-[11px] text-slate-400 group-hover:text-pink-600 transition-colors">
                (اضغطي هنا لقلب البطاقة 🔄)
              </span>
            </div>

            <div className="my-4">
              <p className="text-base sm:text-lg font-black text-slate-800 leading-relaxed whitespace-pre-wrap">
                {isFlipped ? currentCard.back : currentCard.front}
              </p>

              {isFlipped && currentCard.keyRule && (
                <div className="mt-4 p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 font-bold leading-relaxed flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{currentCard.keyRule}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-pink-100 text-[11px] text-slate-400">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeech(isFlipped ? currentCard.back : currentCard.front);
                }}
                className="flex items-center gap-1 text-purple-700 hover:text-purple-800 font-bold cursor-pointer"
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>استمع للشرح</span>
              </button>

              <span className="text-pink-500 font-semibold">
                الصندوق الحالي: {currentCard.box} • الفاصل: {currentCard.interval} يوم
              </span>
            </div>
          </div>

          {/* SM-2 Recall Feedback Buttons (Visible after flip) */}
          {isFlipped ? (
            <div className="space-y-2">
              <span className="block text-center text-xs font-bold text-slate-600">
                كيف كان استرجاعك للمعلومة؟ (خوارزمية SM-2 هتحسب الفاصل المناسب):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  onClick={() => handleGrade('again')}
                  className="p-3 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 font-bold text-xs flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all active:scale-95 shadow-xs"
                >
                  <span>❌ نسيتها تماماً</span>
                  <span className="text-[10px] text-rose-600 font-normal">إعادة غداً (1 يوم)</span>
                </button>

                <button
                  onClick={() => handleGrade('hard')}
                  className="p-3 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-bold text-xs flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all active:scale-95 shadow-xs"
                >
                  <span>⚠️ صعبة شوية</span>
                  <span className="text-[10px] text-amber-600 font-normal">بعد يومين</span>
                </button>

                <button
                  onClick={() => handleGrade('good')}
                  className="p-3 rounded-2xl bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 font-bold text-xs flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all active:scale-95 shadow-xs"
                >
                  <span>👍 كويسة وافتكرتها</span>
                  <span className="text-[10px] text-purple-600 font-normal">بعد {Math.max(3, Math.round(currentCard.interval * currentCard.easeFactor))} أيام</span>
                </button>

                <button
                  onClick={() => handleGrade('easy')}
                  className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all active:scale-95 shadow-xs"
                >
                  <span>🌟 سهلة جداً وحافظاها</span>
                  <span className="text-[10px] text-emerald-600 font-normal">بعد {Math.max(6, Math.round(currentCard.interval * currentCard.easeFactor * 1.3))} يوماً</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={() => setIsFlipped(true)}
                className="py-3 px-8 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black text-sm shadow-md hover:opacity-95 transition-all cursor-pointer"
              >
                أظهري الإجابة والتحقق 💡
              </button>
            </div>
          )}
        </div>
      ) : sessionCompleted ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-200 text-center space-y-4 animate-fade-in shadow-xs">
          <BestieMascot mood="cheering" size="xl" className="mx-auto" />
          <h3 className="text-xl sm:text-2xl font-black text-slate-800">
            عاش يا بطلة المذاكرة! 🎉
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            خلصتي كل بطاقات جلسة اليوم بنجاح وثبتي المعلومات في الذاكرة طويلة المدى. كدة تقدري تدخلي الامتحان وإنتي واثقة في نفسك! 🌸
          </p>
          <div className="pt-2">
            <button
              onClick={() => setSessionCompleted(false)}
              className="py-2.5 px-6 rounded-2xl bg-pink-500 text-white font-bold text-xs sm:text-sm shadow-xs hover:bg-pink-600 cursor-pointer"
            >
              العودة لقائمة البطاقات
            </button>
          </div>
        </div>
      ) : (
        /* Action Launcher when not reviewing */
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-pink-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-start">
            <h3 className="text-base sm:text-lg font-black text-slate-800">
              {stats.dueToday > 0
                ? `جاهزة لمراجعة ${stats.dueToday} بطاقة مستحقة اليوم؟ 🚀`
                : 'مفيش بطاقات مستحقة الآن! حابة تراجعي الكل أو تضيفي جديد؟ ✨'}
            </h3>
            <p className="text-xs text-slate-500">
              المراجعة اليومية المنتظمة بتوفر 80% من وقت المذاكرة ليلة الامتحان!
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {stats.dueToday > 0 ? (
              <button
                onClick={() => startReviewSession(dueCards)}
                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-xs sm:text-sm shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center gap-2"
              >
                <Brain className="w-4 h-4" />
                <span>ابدأي مراجعة اليوم ({stats.dueToday})</span>
              </button>
            ) : (
              <button
                onClick={() => startReviewSession(cards)}
                disabled={cards.length === 0}
                className="py-2.5 px-5 rounded-2xl bg-purple-600 text-white font-bold text-xs sm:text-sm shadow-sm hover:bg-purple-700 transition-all cursor-pointer flex items-center gap-2"
              >
                <RotateCw className="w-4 h-4" />
                <span>مراجعة شاملة للكل ({cards.length})</span>
              </button>
            )}

            <button
              onClick={() => setShowAddModal(true)}
              className="py-2.5 px-4 rounded-2xl bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200 font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة بطاقة</span>
            </button>
          </div>
        </div>
      )}

      {/* AI Smart Flashcard Generator Card */}
      <div className="bg-gradient-to-r from-purple-50/70 via-pink-50/60 to-white rounded-3xl p-4 sm:p-5 border border-purple-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>توليد بطاقات تكرار متباعد ذكية بالذكاء الاصطناعي 🪄</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          اكتبي أي درس أو فكرة صعبة، وبيستي هتحولها لـ 3 بطاقات ذكية وتضيفها فوراً لجدول المذاكرة والتكرار!
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={aiTopicInput}
            onChange={(e) => setAiTopicInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerateAIFlashcards()}
            placeholder="مثلاً: قاعدة لينز، إعراب الأفعال الخمسة، تخليق البروتين..."
            className="flex-1 text-xs sm:text-sm py-2 px-3 rounded-2xl border border-purple-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
          <button
            onClick={handleGenerateAIFlashcards}
            disabled={!aiTopicInput.trim() || isGeneratingAI}
            className={`px-4 py-2 rounded-2xl font-bold text-xs text-white transition-all cursor-pointer shrink-0 ${
              aiTopicInput.trim() && !isGeneratingAI
                ? 'bg-purple-600 hover:bg-purple-700 shadow-sm'
                : 'bg-purple-200 cursor-not-allowed'
            }`}
          >
            {isGeneratingAI ? 'جاري التوليد...' : 'توليد وحفظ ✨'}
          </button>
        </div>
      </div>

      {/* Cards Deck Inventory List */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-pink-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-pink-100">
          <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-pink-500" />
            <span>بطاقات الذاكرة الخاصة بكي ({filteredCards.length})</span>
          </h3>
          <span className="text-xs text-slate-400">
            {selectedSubject === 'all' ? 'كل المواد' : selectedSubject}
          </span>
        </div>

        <div className="space-y-2.5 max-h-96 overflow-y-auto no-scrollbar pr-0.5">
          {filteredCards.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">
              مفيش بطاقات في هذه المادة بعد، اضغطي على "إضافة بطاقة" أو جربي الذكاء الاصطناعي! 🌸
            </p>
          ) : (
            filteredCards.map((card) => {
              const isDue = card.dueDate <= Date.now();
              return (
                <div
                  key={card.id}
                  className={`p-3 sm:p-3.5 rounded-2xl border text-xs transition-all space-y-1.5 ${
                    isDue
                      ? 'bg-pink-50/60 border-pink-200'
                      : 'bg-slate-50/50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-pink-500" />
                      <span>{card.subjectName} • {card.topic}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isDue
                            ? 'bg-rose-100 text-rose-700 animate-pulse'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isDue ? 'مستحقة اليوم ⏳' : `بعد ${card.interval} يوم`}
                      </span>

                      <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 font-bold">
                        صندوق {card.box}
                      </span>

                      <button
                        onClick={() => deleteCard(card.id)}
                        className="text-slate-300 hover:text-rose-500 p-1 rounded-md transition-colors cursor-pointer"
                        title="حذف البطاقة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-slate-700 font-semibold line-clamp-1">{card.front}</p>
                  <p className="text-slate-500 text-[11px] line-clamp-1">{card.back}</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Custom Flashcard Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full border border-pink-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-pink-100">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Brain className="w-5 h-5 text-pink-500" />
                <span>إضافة بطاقة تكرار متباعد جديدة 🧠</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomCard} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">المادة</label>
                  <select
                    value={newSubjectId}
                    onChange={(e) => setNewSubjectId(e.target.value)}
                    className="w-full text-xs font-semibold py-2 px-2.5 rounded-xl border border-pink-200 bg-pink-50/30"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.icon} {language === 'ar' ? s.nameAr : s.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الدرس أو الموضوع</label>
                  <input
                    type="text"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="مثلاً: كيرشوف، العضوية..."
                    className="w-full text-xs py-2 px-2.5 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  وجه البطاقة (السؤال أو المفهوم المطلوب تذكره) 🎯
                </label>
                <textarea
                  required
                  rows={2}
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  placeholder="مثلاً: ما هي شروط عمل كان وأخواتها؟"
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ظهر البطاقة (الإجابة النموذجية والتوضيح) 💡
                </label>
                <textarea
                  required
                  rows={3}
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  placeholder="الإجابة الكاملة والتفسير خطوة بخطوة..."
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  القانون الذهبي أو سر الحفظ (اختياري) 🌟
                </label>
                <input
                  type="text"
                  value={newKeyRule}
                  onChange={(e) => setNewKeyRule(e.target.value)}
                  placeholder="مثلاً: Σ I_in = Σ I_out"
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-pink-500 text-white hover:bg-pink-600 shadow-xs cursor-pointer"
                >
                  حفظ في الذاكرة 🌸
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
