import React from 'react';
import { BestieMascot } from './BestieMascot';
import { UserProfileMenu } from './UserProfileMenu';
import { Language, Subject } from '../types';
import { translations } from '../constants/translations';
import { SUBJECTS } from '../constants/subjects';
import { Sparkles, Globe, Flame, BookOpen } from 'lucide-react';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  selectedSubject: string;
  onSubjectChange: (subId: string) => void;
  streak: number;
  aiConnected: boolean;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  selectedSubject,
  onSubjectChange,
  streak,
  aiConnected,
  onOpenAuth,
}) => {
  const t = translations[language];
  const activeSubjectObj = SUBJECTS.find((s) => s.id === selectedSubject);

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-pink-100 shadow-xs px-3 sm:px-6 py-2.5 sm:py-3 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left / Brand area */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <BestieMascot mood="happy" size="md" className="animate-float" />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg sm:text-2xl font-black bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 bg-clip-text text-transparent">
                {t.appTitle}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 font-semibold hidden sm:inline-flex items-center gap-1 border border-pink-200">
                <Sparkles className="w-3 h-3 text-pink-500" />
                AI
              </span>
            </div>
            <p className="text-xs text-pink-900/60 font-medium hidden sm:block">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Center: Subject Quick Selector */}
        <div className="flex-1 max-w-xs hidden md:block">
          <div className="relative">
            <select
              value={selectedSubject}
              onChange={(e) => onSubjectChange(e.target.value)}
              className="w-full text-xs sm:text-sm font-medium py-1.5 px-3 ps-8 rounded-full border border-pink-200 bg-pink-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:bg-white transition-all cursor-pointer shadow-xs"
            >
              <option value="all">{t.allSubjects} 📚</option>
              {SUBJECTS.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.icon} {language === 'ar' ? sub.nameAr : sub.nameEn}
                </option>
              ))}
            </select>
            <BookOpen className={`w-3.5 h-3.5 text-pink-400 absolute top-1/2 -translate-y-1/2 ${language === 'ar' ? 'right-2.5' : 'left-2.5'}`} />
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Streak Badge */}
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs sm:text-sm shadow-xs"
            title={`${streak} ${t.streakCount}`}
          >
            <Flame className="w-4 h-4 text-rose-500 fill-rose-500 animate-bounce" />
            <span>{streak}</span>
            <span className="hidden sm:inline font-normal text-xs text-rose-600/80">
              {language === 'ar' ? 'أيام' : 'days'}
            </span>
          </div>

          {/* AI Connection status pill */}
          <div
            className={`hidden lg:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
              aiConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                aiConnected ? 'bg-emerald-500 animate-ping' : 'bg-amber-400'
              }`}
            />
            <span className="font-medium">
              {aiConnected ? t.aiStatusReady : t.aiStatusChecking}
            </span>
          </div>

          {/* Language Toggle Button */}
          <button
            onClick={() => onLanguageChange(language === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Switch Language / تغيير اللغة"
          >
            <Globe className="w-3.5 h-3.5 text-purple-500" />
            <span>{t.switchLang}</span>
          </button>

          {/* User Profile & Auth Button */}
          <UserProfileMenu onOpenAuth={onOpenAuth} language={language} />
        </div>
      </div>

      {/* Mobile Subject chip selector bar */}
      <div className="md:hidden mt-2 pt-2 border-t border-pink-100/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        <button
          onClick={() => onSubjectChange('all')}
          className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
            selectedSubject === 'all'
              ? 'bg-pink-500 text-white shadow-xs'
              : 'bg-pink-50 text-pink-700 border border-pink-200'
          }`}
        >
          {t.allSubjects}
        </button>
        {SUBJECTS.map((sub) => {
          const isActive = selectedSubject === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => onSubjectChange(sub.id)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                isActive
                  ? 'bg-pink-500 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-700 border border-pink-100 hover:bg-pink-50'
              }`}
            >
              <span>{sub.icon}</span>
              <span>{language === 'ar' ? sub.nameAr.split(' ')[0] : sub.nameEn}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
