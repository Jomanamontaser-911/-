import React, { useState, useEffect } from 'react';
import { Language, QuizHistoryRecord } from '../types';
import { translations } from '../constants/translations';
import { SUBJECTS } from '../constants/subjects';
import { getQuizHistory } from '../utils/progress';
import { useSRS } from '../context/SRSContext';
import { useAuth } from '../context/AuthContext';
import { BestieMascot } from './BestieMascot';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  Flame,
  Brain,
  Target,
  BarChart3,
  Calendar,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface ProgressTabProps {
  language: Language;
}

export const ProgressTab: React.FC<ProgressTabProps> = ({ language }) => {
  const t = translations[language];
  const { user } = useAuth();
  const { cards, stats, retentionRate } = useSRS();

  const [quizHistory, setQuizHistory] = useState<QuizHistoryRecord[]>([]);
  const [activeChartType, setActiveChartType] = useState<'radar' | 'bar'>('radar');

  useEffect(() => {
    setQuizHistory(getQuizHistory());
  }, []);

  // Compute stats per subject
  const subjectStats = SUBJECTS.map((sub) => {
    const subjectQuizzes = quizHistory.filter((q) => q.subjectId === sub.id);
    const totalQ = subjectQuizzes.reduce((acc, q) => acc + q.totalQuestions, 0);
    const correctQ = subjectQuizzes.reduce((acc, q) => acc + q.correctAnswers, 0);
    const quizAccuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 75;

    // SRS cards in this subject
    const subjectCards = cards.filter((c) => c.subjectId === sub.id);
    const masteredCards = subjectCards.filter((c) => c.box >= 3).length;
    const srsScore = subjectCards.length > 0 ? Math.round((masteredCards / subjectCards.length) * 100) : 70;

    // Overall subject mastery (0-100)
    const masteryLevel = Math.min(100, Math.round(quizAccuracy * 0.6 + srsScore * 0.4));

    return {
      id: sub.id,
      name: language === 'ar' ? sub.nameAr.split(' ')[0] : sub.nameEn,
      fullName: language === 'ar' ? sub.nameAr : sub.nameEn,
      icon: sub.icon,
      color: sub.color,
      mastery: masteryLevel,
      quizAccuracy,
      quizzesTaken: subjectQuizzes.length,
      correctQuestions: correctQ,
      totalQuestions: totalQ,
    };
  });

  // Calculate overall statistics
  const totalQuizzes = quizHistory.length;
  const totalQuestionsAnswered = quizHistory.reduce((acc, q) => acc + q.totalQuestions, 0);
  const totalCorrectQuestions = quizHistory.reduce((acc, q) => acc + q.correctAnswers, 0);
  const overallAccuracy =
    totalQuestionsAnswered > 0
      ? Math.round((totalCorrectQuestions / totalQuestionsAnswered) * 100)
      : 84;

  // Estimated Thanaweya exam readiness score
  const readinessScore = Math.min(
    98,
    Math.round(overallAccuracy * 0.5 + retentionRate * 0.3 + (user?.studyStreak || 5) * 2)
  );

  // Weekly study history mock data (active week)
  const weeklyActivity = [
    { day: language === 'ar' ? 'السبت' : 'Sat', hours: 4.5, quizzes: 3 },
    { day: language === 'ar' ? 'الأحد' : 'Sun', hours: 5.0, quizzes: 4 },
    { day: language === 'ar' ? 'الاثنين' : 'Mon', hours: 6.2, quizzes: 5 },
    { day: language === 'ar' ? 'الثلاثاء' : 'Tue', hours: 4.0, quizzes: 2 },
    { day: language === 'ar' ? 'الأربعاء' : 'Wed', hours: 5.5, quizzes: 4 },
    { day: language === 'ar' ? 'الخميس' : 'Thu', hours: 7.0, quizzes: 6 },
    { day: language === 'ar' ? 'الجمعة' : 'Fri', hours: 3.5, quizzes: 2 },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 sm:pb-8">
      {/* Intro Banner */}
      <div className="bg-gradient-to-r from-pink-100/90 via-purple-100/70 to-rose-100/80 rounded-3xl p-4 sm:p-6 border border-pink-200/90 shadow-xs flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <BestieMascot mood="cheering" size="lg" className="shrink-0 animate-float" />
        <div className="text-center sm:text-start flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 text-purple-700 text-xs font-bold border border-purple-200 mb-2 shadow-xs">
            <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
            <span>لوحة التقدم ومستوى الإتقان 📊</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 mb-1">
            {language === 'ar'
              ? 'متابعة أدائك ونقاط قوتك في كل مادة 🌸'
              : 'Track Your Performance & Mastery by Subject 🌸'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {language === 'ar'
              ? 'رسوم بيانية تفاعلية بتوضح مدى إتقانك لكل مادة، دقة حل الكويزات، وجاهزيتك لامتحانات الثانوية العامة!'
              : 'Interactive radar and bar charts tracking mastery level, quiz accuracy, and exam readiness!'}
          </p>
        </div>
      </div>

      {/* High-Level Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Readiness Index */}
        <div className="bg-white rounded-3xl p-4 border border-pink-200 shadow-xs flex flex-col items-center text-center">
          <span className="text-[11px] font-bold text-slate-500 mb-1">مؤشر الجاهزية للامتحان</span>
          <span className="text-2xl sm:text-3xl font-black text-pink-600 font-mono">
            {readinessScore}%
          </span>
          <span className="text-[10px] text-pink-700 font-semibold mt-0.5">
            {readinessScore >= 85 ? 'ممتاز، فخورين بيكي! 🩺' : 'ماشيين بخطى ثابتة 💪'}
          </span>
        </div>

        {/* Overall Quiz Accuracy */}
        <div className="bg-white rounded-3xl p-4 border border-purple-200 shadow-xs flex flex-col items-center text-center">
          <span className="text-[11px] font-bold text-slate-500 mb-1">متوسط دقة الكويزات</span>
          <span className="text-2xl sm:text-3xl font-black text-purple-600 font-mono">
            {overallAccuracy}%
          </span>
          <span className="text-[10px] text-purple-700 font-semibold mt-0.5">
            {totalQuizzes} كويز تم إنجازه
          </span>
        </div>

        {/* Memory Retention */}
        <div className="bg-white rounded-3xl p-4 border border-rose-200 shadow-xs flex flex-col items-center text-center">
          <span className="text-[11px] font-bold text-slate-500 mb-1">ثبات الذاكرة (SRS)</span>
          <span className="text-2xl sm:text-3xl font-black text-rose-600 font-mono">
            {retentionRate}%
          </span>
          <span className="text-[10px] text-rose-700 font-semibold mt-0.5">
            {stats.total} بطاقة مراجعة
          </span>
        </div>

        {/* Study Streak */}
        <div className="bg-white rounded-3xl p-4 border border-emerald-200 shadow-xs flex flex-col items-center text-center">
          <span className="text-[11px] font-bold text-slate-500 mb-1">أيام الالتزام المستمر</span>
          <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
            {user?.studyStreak || 5} أيام
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold mt-0.5">
            عاش الاستمرار 🔥
          </span>
        </div>
      </div>

      {/* Main Visualizations: Radar & Bar Charts */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-pink-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-pink-100">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-pink-500" />
              <span>
                {activeChartType === 'radar'
                  ? 'مخطط توازن الإتقان بين المواد (Radar Chart) 🎯'
                  : 'مقارنة دقة الأسئلة وإتقان المواد (Bar Chart) 📊'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              يوضح المواد التي تحتاج لمراجعة إضافية قبل موسم الامتحانات
            </p>
          </div>

          {/* Chart Type Toggle Buttons */}
          <div className="flex items-center gap-1 bg-pink-50 p-1 rounded-2xl border border-pink-200/60">
            <button
              onClick={() => setActiveChartType('radar')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeChartType === 'radar'
                  ? 'bg-white text-pink-600 shadow-xs'
                  : 'text-slate-600 hover:text-pink-600'
              }`}
            >
              مخطط الرادار 🎯
            </button>
            <button
              onClick={() => setActiveChartType('bar')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeChartType === 'bar'
                  ? 'bg-white text-pink-600 shadow-xs'
                  : 'text-slate-600 hover:text-pink-600'
              }`}
            >
              أعمدة بيانية 📊
            </button>
          </div>
        </div>

        {/* Chart View Container */}
        <div className="w-full h-72 sm:h-84 py-2">
          {activeChartType === 'radar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={subjectStats} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="#fbcfe8" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="name"
                  tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />
                <Radar
                  name="مستوى الإتقان (%)"
                  dataKey="mastery"
                  stroke="#db2777"
                  fill="#f472b6"
                  fillOpacity={0.4}
                />
                <Tooltip
                  formatter={(value: any) => [`${value}%`, 'نسبة الإتقان']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    borderColor: '#fbcfe8',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(236,72,153,0.1)',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectStats} margin={{ top: 15, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                  interval={0}
                />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `${value}%`,
                    name === 'mastery' ? 'مستوى الإتقان' : 'دقة الكويزات',
                  ]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    borderColor: '#fbcfe8',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                />
                <Legend
                  formatter={(value) => (value === 'mastery' ? 'مستوى الإتقان العام' : 'دقة حل الكويزات')}
                  wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="mastery" fill="#ec4899" radius={[8, 8, 0, 0]} name="mastery" />
                <Bar dataKey="quizAccuracy" fill="#a855f7" radius={[8, 8, 0, 0]} name="quizAccuracy" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Weekly Study Activity History */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-pink-200/80 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-pink-100">
          <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-pink-500" />
            <span>نشاط المذاكرة الأسبوعي (Weekly Study Log) 📅</span>
          </h3>
          <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-200">
            إجمالي 35.7 ساعة مذاكرة هذا الأسبوع
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center pt-1">
          {weeklyActivity.map((day, idx) => (
            <div
              key={idx}
              className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-b from-pink-50/60 to-purple-50/40 border border-pink-100 flex flex-col items-center justify-between"
            >
              <span className="text-[11px] font-bold text-slate-500">{day.day}</span>
              <div className="w-full bg-pink-100 rounded-full h-1.5 my-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-pink-500 to-purple-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, (day.hours / 8) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-black text-slate-800 font-mono">{day.hours} س</span>
              <span className="text-[9px] text-pink-600 font-bold mt-0.5">{day.quizzes} كويز</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subject-by-Subject Mastery Breakdown */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-pink-200/80 shadow-xs space-y-4">
        <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5 pb-2 border-b border-pink-100">
          <BookOpen className="w-4 h-4 text-pink-500" />
          <span>تفاصيل إتقان المواد ونقاط القوة 📚</span>
        </h3>

        <div className="space-y-3">
          {subjectStats.map((sub) => (
            <div
              key={sub.id}
              className="p-3 sm:p-3.5 rounded-2xl border border-pink-100/90 hover:border-pink-300 transition-all bg-gradient-to-r from-white via-pink-50/20 to-purple-50/20 shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{sub.icon}</span>
                  <span className="font-bold text-xs sm:text-sm text-slate-800">
                    {sub.fullName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      sub.mastery >= 85
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : sub.mastery >= 70
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {sub.mastery >= 85 ? 'متقن تماماً ✨' : sub.mastery >= 70 ? 'متقدم ⭐' : 'يحتاج مراجعة 📖'}
                  </span>
                  <span className="font-mono font-black text-xs sm:text-sm text-pink-600">
                    {sub.mastery}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 via-rose-400 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${sub.mastery}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>الكويزات المنجزة: {sub.quizzesTaken} كويز</span>
                <span>دقة الإجابات: {sub.quizAccuracy}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Quiz History Logs */}
      {quizHistory.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-pink-200/80 shadow-xs space-y-3">
          <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5 pb-2 border-b border-pink-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>سجل الكويزات الأخيرة (Quiz History Log) 📝</span>
          </h3>

          <div className="space-y-2">
            {quizHistory.slice(0, 5).map((q) => (
              <div
                key={q.id}
                className="p-3 rounded-2xl border border-slate-200/70 bg-slate-50/50 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800 block">{q.topic}</span>
                  <span className="text-[10px] text-slate-500">
                    {q.subjectName} • {new Date(q.date).toLocaleDateString('ar-EG')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-medium text-[11px]">
                    {q.correctAnswers} / {q.totalQuestions} صحيحة
                  </span>
                  <span
                    className={`font-black font-mono px-2 py-0.5 rounded-lg text-xs ${
                      q.percentage >= 80
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {q.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
