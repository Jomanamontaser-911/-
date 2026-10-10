import React from 'react';
import { AppTab, Language } from '../types';
import { translations } from '../constants/translations';
import { useSRS } from '../context/SRSContext';
import {
  MessageSquareHeart,
  BookOpenCheck,
  FileText,
  CheckCircle2,
  CalendarDays,
  Brain,
  TrendingUp,
  Workflow,
} from 'lucide-react';

interface NavigationProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  language: Language;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  language,
}) => {
  const t = translations[language];
  const { stats } = useSRS();

  const tabs: { id: AppTab; label: string; icon: React.ReactNode; badgeCount?: number }[] = [
    {
      id: 'chat',
      label: t.navChat,
      icon: <MessageSquareHeart className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      id: 'study',
      label: t.navStudy,
      icon: <BookOpenCheck className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      id: 'summarize',
      label: t.navSummarize,
      icon: <FileText className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      id: 'mindmap',
      label: t.navMindMap,
      icon: <Workflow className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      id: 'quiz',
      label: t.navQuiz,
      icon: <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      id: 'srs',
      label: t.navSRS,
      icon: <Brain className="w-4 h-4 sm:w-5 sm:h-5" />,
      badgeCount: stats.dueToday,
    },
    {
      id: 'progress',
      label: t.navProgress,
      icon: <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      id: 'planner',
      label: t.navPlanner,
      icon: <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
  ];

  return (
    <>
      {/* Desktop & Tablet Top Navigation Tabs */}
      <nav className="hidden sm:block py-3 px-4 max-w-5xl mx-auto">
        <div className="bg-pink-100/60 p-1.5 rounded-2xl flex items-center justify-between gap-1 shadow-inner border border-pink-200/70">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer relative ${
                  isActive
                    ? 'bg-white text-pink-600 shadow-sm border border-pink-200/60 scale-[1.02]'
                    : 'text-slate-600 hover:text-pink-600 hover:bg-white/50'
                }`}
              >
                <span className={isActive ? 'text-pink-500 animate-bounce' : 'text-slate-400'}>
                  {tab.icon}
                </span>
                <span className="truncate">{tab.label}</span>

                {Boolean(tab.badgeCount && tab.badgeCount > 0) && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black shrink-0 animate-pulse">
                    {tab.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar (Fixed for mobile thumbs) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-pink-200 shadow-lg px-1 py-1.5 pb-safe">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center py-0.5 px-1 rounded-xl transition-all cursor-pointer relative ${
                  isActive ? 'text-pink-600 font-bold scale-105' : 'text-slate-500 font-medium'
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition-all relative ${
                    isActive ? 'bg-pink-100 text-pink-600 shadow-xs' : 'text-slate-400'
                  }`}
                >
                  {tab.icon}
                  {Boolean(tab.badgeCount && tab.badgeCount > 0) && (
                    <span className="absolute -top-1 -end-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                      {tab.badgeCount}
                    </span>
                  )}
                </div>
                <span className="text-[9px] mt-0.5 leading-tight truncate max-w-[50px]">{tab.label.split(' ')[0]}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500 absolute -bottom-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

