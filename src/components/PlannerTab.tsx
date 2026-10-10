import React, { useState, useEffect } from 'react';
import { DailyScheduleDay, Language, StudyPlanData, StudyTask } from '../types';
import { translations } from '../constants/translations';
import { BestieMascot } from './BestieMascot';
import { ThinkingIndicator } from './ThinkingIndicator';
import {
  CalendarDays,
  Sparkles,
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Plus,
  Trash2,
  Coffee,
  BookOpen,
  Heart,
  ChevronDown,
} from 'lucide-react';

interface PlannerTabProps {
  language: Language;
}

export const PlannerTab: React.FC<PlannerTabProps> = ({ language }) => {
  const t = translations[language];

  // AI Plan Generator Form States
  const [studyTrack, setStudyTrack] = useState('علمي علوم');
  const [daysLeft, setDaysLeft] = useState(7);
  const [dailyHours, setDailyHours] = useState(6);
  const [studyGoal, setStudyGoal] = useState(
    'مراجعة الكيمياء العضوية وحل امتحانات فيزياء ونحو متراكم'
  );
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [studyPlan, setStudyPlan] = useState<StudyPlanData | null>(() => {
    const saved = localStorage.getItem('study_bestie_active_plan');
    return saved ? JSON.parse(saved) : null;
  });

  // Daily Tasks State
  const [tasks, setTasks] = useState<StudyTask[]>(() => {
    const saved = localStorage.getItem('study_bestie_tasks');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 't1',
        text: 'حل 20 مسألة على قوانين كيرشوف ⚡',
        subjectId: 'physics',
        estimatedMinutes: 45,
        completed: true,
        priority: 'high',
      },
      {
        id: 't2',
        text: 'مراجعة الممنوع من الصرف وحل تدريب النحو 📚',
        subjectId: 'arabic',
        estimatedMinutes: 30,
        completed: false,
        priority: 'high',
      },
      {
        id: 't3',
        text: 'تسميع معادلات الكيمياء العضوية (الألكانات) 🧪',
        subjectId: 'chemistry',
        estimatedMinutes: 40,
        completed: false,
        priority: 'medium',
      },
    ];
  });
  const [newTaskText, setNewTaskText] = useState('');

  // Pomodoro Focus Timer State
  const [timerMode, setTimerMode] = useState<'work' | 'break'>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 min default
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);

  // Motivational Bestie Quotes
  const bestieQuotes = [
    'كل خطوة صغيرة بتعمليها النهاردة هتقربك لحلمك بكرة! خليكي واثقة في نفسك 🌸',
    'امتحانات الثانوية خطوة في طريق نجاحك، مش نهاية العالم. ركزي واعملي اللي عليكي براحة وبذكاء ✨',
    'التركيز 25 دقيقة كنز حقيقي! مخك هيكون أهدى واستيعابك أعلى بكتير 💖',
    'مفيش مادة صعبة على اللي بيفهمها بالراحة ويحل عليها بإيده، هانت يا بطلة! 💪',
    'اشربي ماية، خدي نفس عميق، وابتسمي.. بيستي في ضهرك دايماً 🌸',
  ];
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  // Save tasks
  useEffect(() => {
    localStorage.setItem('study_bestie_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Save plan
  useEffect(() => {
    if (studyPlan) {
      localStorage.setItem('study_bestie_active_plan', JSON.stringify(studyPlan));
    }
  }, [studyPlan]);

  // Pomodoro Timer Effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      // Timer finished!
      setIsTimerRunning(false);
      if (timerMode === 'work') {
        setPomodoroCount((prev) => prev + 1);
        setTimerMode('break');
        setTimeLeft(5 * 60); // 5 min break
        alert(language === 'ar' ? 'عاش يا بطلة! خلصتي جلسة التركيز، خدي استراحة 5 دقايق ☕' : 'Great job! Take a 5 minute relaxing break ☕');
      } else {
        setTimerMode('work');
        setTimeLeft(25 * 60);
        alert(language === 'ar' ? 'الاستراحة خلصت، جاهزة لجلسة تركيز جديدة؟ 🚀' : 'Break over! Ready for next focus session? 🚀');
      }
      // Rotate quote
      setCurrentQuoteIndex((prev) => (prev + 1) % bestieQuotes.length);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, timerMode, language]);

  const handleToggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimeLeft(timerMode === 'work' ? 25 * 60 : 5 * 60);
  };

  const handleSwitchMode = (mode: 'work' | 'break') => {
    setIsTimerRunning(false);
    setTimerMode(mode);
    setTimeLeft(mode === 'work' ? 25 * 60 : 5 * 60);
  };

  const formatTimerTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    const newTask: StudyTask = {
      id: `task_${Date.now()}`,
      text: newTaskText.trim(),
      subjectId: 'general',
      estimatedMinutes: 30,
      completed: false,
      priority: 'high',
    };
    setTasks([newTask, ...tasks]);
    setNewTaskText('');
  };

  const handleToggleTask = (id: string) => {
    setTasks(
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const response = await fetch('/api/generate-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyTrack,
          daysLeft,
          dailyHours,
          targetGoal: studyGoal,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate study plan');
      }

      const data: StudyPlanData = await response.json();
      setStudyPlan(data);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'حدث خطأ في تنظيم الجدول، حاولي مرة أخرى');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const totalSeconds = timerMode === 'work' ? 25 * 60 : 5 * 60;
  const progressPercent = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 sm:pb-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-pink-100/90 via-purple-100/70 to-rose-100/80 rounded-3xl p-4 sm:p-6 border border-pink-200/90 shadow-xs flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <BestieMascot mood="cheering" size="lg" className="shrink-0 animate-float" />
        <div className="text-center sm:text-start flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 text-pink-700 text-xs font-bold border border-pink-200 mb-2 shadow-xs">
            <CalendarDays className="w-3.5 h-3.5 text-pink-500" />
            <span>{t.plannerTitle}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 mb-1">
            {language === 'ar'
              ? 'مؤقت بومودورو وجدول ذكي بلا ضغوط 🌸'
              : 'Smart Stress-Free Schedule & Focus Pomodoro 🌸'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t.plannerDesc}
          </p>
        </div>
      </div>

      {/* Grid: Pomodoro Focus Timer & Today's Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Cute Pomodoro Timer Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-pink-200/80 shadow-xs flex flex-col items-center justify-between text-center relative overflow-hidden">
          <div className="w-full flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-pink-600 bg-pink-50 px-3 py-1 rounded-full border border-pink-200 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-pink-500" />
              <span>{t.pomodoroTimer}</span>
            </span>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
              🍅 {pomodoroCount} جلسات اليوم
            </span>
          </div>

          {/* Mode switch */}
          <div className="flex items-center gap-2 bg-pink-50 p-1 rounded-2xl mb-4 border border-pink-100">
            <button
              onClick={() => handleSwitchMode('work')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timerMode === 'work'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-pink-600'
              }`}
            >
              {t.pomoWork}
            </button>
            <button
              onClick={() => handleSwitchMode('break')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timerMode === 'break'
                  ? 'bg-purple-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-purple-600'
              }`}
            >
              {t.pomoBreak}
            </button>
          </div>

          {/* Big Progress Circle & Digits */}
          <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center my-2">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#fce7f3"
                strokeWidth="7"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={timerMode === 'work' ? '#ec4899' : '#a855f7'}
                strokeWidth="7"
                strokeDasharray="264"
                strokeDashoffset={264 - (264 * progressPercent) / 100}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>

            <div className="absolute flex flex-col items-center">
              <span className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight font-mono">
                {formatTimerTime(timeLeft)}
              </span>
              <span className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                {timerMode === 'work' ? 'Deep Focus' : 'Short Break'}
              </span>
            </div>
          </div>

          {/* Timer controls */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleToggleTimer}
              className={`px-6 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                isTimerRunning
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:opacity-95'
              }`}
            >
              {isTimerRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>{t.pauseTimer}</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>{t.startTimer}</span>
                </>
              )}
            </button>

            <button
              onClick={handleResetTimer}
              className="p-2.5 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              title={t.resetTimer}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Motivational Quote pill */}
          <div className="mt-4 p-2.5 rounded-2xl bg-rose-50/70 border border-rose-100 text-[11px] text-rose-800 font-medium leading-relaxed">
            <Heart className="w-3 h-3 text-rose-500 inline mr-1 fill-rose-500" />
            {bestieQuotes[currentQuoteIndex]}
          </div>
        </div>

        {/* Daily Study Checklist Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-pink-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>{t.myTasks}</span>
              </span>
              <span className="text-xs text-pink-600 font-bold">
                {tasks.filter((x) => x.completed).length} / {tasks.length} منجز
              </span>
            </div>

            {/* Add Task input */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder={t.taskPlaceholder}
                className="flex-1 text-xs py-2 px-3 rounded-2xl border border-pink-200 bg-pink-50/30 text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
              <button
                onClick={handleAddTask}
                disabled={!newTaskText.trim()}
                className="p-2 rounded-2xl bg-pink-500 text-white disabled:opacity-40 cursor-pointer shadow-xs hover:bg-pink-600"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Tasks list */}
            <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pr-0.5">
              {tasks.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">{t.noTasks}</p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border text-xs transition-all ${
                      task.completed
                        ? 'bg-emerald-50/50 border-emerald-200 text-slate-400 line-through'
                        : 'bg-white border-pink-100 text-slate-800 shadow-xs'
                    }`}
                  >
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      className="flex items-center gap-2.5 flex-1 text-start cursor-pointer"
                    >
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          task.completed
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-pink-300 bg-pink-50'
                        }`}
                      >
                        {task.completed && <CheckCircle className="w-3 h-3" />}
                      </span>
                      <span className="font-medium">{task.text}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-slate-300 hover:text-rose-500 p-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 text-[11px] text-slate-400 text-center">
            {language === 'ar'
              ? 'خلصتي مهمة؟ علمي عليها واحتفلي بإنجازك الصغير! 🌟'
              : 'Finished a task? Check it off and celebrate progress! 🌟'}
          </div>
        </div>
      </div>

      {/* AI Smart Schedule Generator Section */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-pink-200/90 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pink-500" />
            <h3 className="text-sm sm:text-base font-black text-slate-800">
              {language === 'ar'
                ? 'تصميم خطة وجدول مذاكرة ذكي بالذكاء الاصطناعي 🪄'
                : 'AI-Generated Customized Study Schedule 🪄'}
            </h3>
          </div>
          <span className="text-[11px] bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full font-bold border border-purple-200">
            {studyTrack}
          </span>
        </div>

        {/* Form Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Track */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t.studyTrack}
            </label>
            <select
              value={studyTrack}
              onChange={(e) => setStudyTrack(e.target.value)}
              className="w-full text-xs font-semibold py-2.5 px-3 rounded-2xl border border-pink-200 bg-pink-50/40 text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
            >
              <option value="علمي علوم">{t.trackScience}</option>
              <option value="علمي رياضة">{t.trackMath}</option>
              <option value="أدبي">{t.trackLiterature}</option>
            </select>
          </div>

          {/* Days Left */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t.daysLeft}
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={daysLeft}
              onChange={(e) => setDaysLeft(Number(e.target.value))}
              className="w-full text-xs font-semibold py-2 px-3 rounded-2xl border border-pink-200 bg-pink-50/40 text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>

          {/* Daily hours */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t.dailyHours}
            </label>
            <input
              type="number"
              min={1}
              max={16}
              value={dailyHours}
              onChange={(e) => setDailyHours(Number(e.target.value))}
              className="w-full text-xs font-semibold py-2 px-3 rounded-2xl border border-pink-200 bg-pink-50/40 text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>
        </div>

        {/* Specific Goal */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {t.studyGoal}
          </label>
          <input
            type="text"
            value={studyGoal}
            onChange={(e) => setStudyGoal(e.target.value)}
            placeholder="مثلاً: مراجعة العضوية والكهربية وحل امتحانات شاملة..."
            className="w-full text-xs sm:text-sm font-medium py-2.5 px-3 rounded-2xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
        </div>

        {/* Generate button */}
        <button
          onClick={handleGeneratePlan}
          disabled={isGeneratingPlan}
          className="w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          {isGeneratingPlan ? (
            <div className="flex items-center gap-2">
              <ThinkingIndicator label={language === 'ar' ? 'بيفكر...' : 'Thinking...'} />
            </div>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{t.generatePlan}</span>
            </>
          )}
        </button>

        {/* Generated Schedule Display */}
        {studyPlan && (
          <div className="pt-4 border-t border-pink-100 space-y-4 animate-fade-in">
            <div className="bg-pink-50/70 p-4 rounded-2xl border border-pink-200/80">
              <h4 className="text-sm sm:text-base font-black text-pink-900 mb-1">
                {studyPlan.planTitle} 🌸
              </h4>
              <p className="text-xs sm:text-sm text-pink-800 font-medium leading-relaxed">
                {studyPlan.bestieIntro}
              </p>
            </div>

            {/* Daily breakdown slots */}
            <div className="space-y-3">
              {studyPlan.dailySchedule?.map((day) => (
                <div
                  key={day.dayNumber}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-700 text-xs flex items-center justify-center font-bold">
                        {day.dayNumber}
                      </span>
                      <span>{day.dayTitle}</span>
                    </span>
                    <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                      {day.focusSubject}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium">
                    🎯 الهدف اليومي: {day.dailyGoal}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {day.slots?.map((slot, sIdx) => (
                      <div
                        key={sIdx}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                          slot.isBreak
                            ? 'bg-amber-50/50 border-amber-200 text-amber-900'
                            : 'bg-pink-50/40 border-pink-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {slot.isBreak ? (
                            <Coffee className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <BookOpen className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                          )}
                          <span className="font-semibold">{slot.activity}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-white/70 px-1.5 py-0.5 rounded-md">
                          {slot.time} ({slot.durationMinutes} د)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Bestie Tips */}
            {studyPlan.bestieTips?.length > 0 && (
              <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 space-y-2">
                <span className="text-xs font-bold text-purple-900 block">
                  نصائح ذهبية من بيستي للحفاظ على طاقتك وراحتك النفسية 💖:
                </span>
                <ul className="space-y-1">
                  {studyPlan.bestieTips.map((tip, i) => (
                    <li key={i} className="text-xs text-purple-800 flex items-start gap-1.5">
                      <span className="text-pink-500">✦</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
