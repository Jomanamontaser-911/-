import React, { useState, useEffect } from 'react';
import { AppTab, Language } from './types';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { ChatTab } from './components/ChatTab';
import { StudyModeTab } from './components/StudyModeTab';
import { SummarizerTab } from './components/SummarizerTab';
import { MindMapTab } from './components/MindMapTab';
import { QuizTab } from './components/QuizTab';
import { MemoryTab } from './components/MemoryTab';
import { ProgressTab } from './components/ProgressTab';
import { PlannerTab } from './components/PlannerTab';
import { AuthModal } from './components/AuthModal';
import { BestieMascot } from './components/BestieMascot';
import { translations } from './constants/translations';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SRSProvider } from './context/SRSContext';

function MainAppContent() {
  const [language, setLanguage] = useState<Language>('ar');
  const [activeTab, setActiveTab] = useState<AppTab>('chat');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [aiConnected, setAiConnected] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user } = useAuth();

  const t = translations[language];

  // Sync RTL / LTR on root html element
  useEffect(() => {
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  // Check real AI backend status
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        setAiConnected(Boolean(data.hasApiKey));
      })
      .catch((err) => {
        console.warn('API status check error:', err);
        setAiConnected(false);
      });
  }, []);

  const handleScoreEarned = (points: number) => {
    console.log(`Earned ${points} study points!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/70 via-purple-50/40 to-pink-50/60 text-slate-800 flex flex-col font-sans selection:bg-pink-200 selection:text-pink-900">
      {/* Background Decorative Pastel Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-40">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-pink-200/50 blur-3xl animate-pulse-subtle" />
        <div className="absolute top-1/3 -left-24 w-80 h-80 rounded-full bg-purple-200/50 blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 w-96 h-96 rounded-full bg-rose-200/40 blur-3xl" />
      </div>

      {/* Main Header with User Profile and Auth trigger */}
      <Header
        language={language}
        onLanguageChange={setLanguage}
        selectedSubject={selectedSubject}
        onSubjectChange={setSelectedSubject}
        streak={user?.studyStreak || 5}
        aiConnected={aiConnected}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Navigation tabs */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        language={language}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 pt-1 sm:pt-3 relative z-10">
        {activeTab === 'chat' && (
          <ChatTab
            language={language}
            selectedSubject={selectedSubject}
          />
        )}

        {activeTab === 'study' && (
          <StudyModeTab
            language={language}
            selectedSubject={selectedSubject}
            onSubjectChange={setSelectedSubject}
          />
        )}

        {activeTab === 'summarize' && (
          <SummarizerTab
            language={language}
            selectedSubject={selectedSubject}
          />
        )}

        {activeTab === 'mindmap' && (
          <MindMapTab
            language={language}
            selectedSubject={selectedSubject}
            onSubjectChange={setSelectedSubject}
          />
        )}

        {activeTab === 'quiz' && (
          <QuizTab
            language={language}
            selectedSubject={selectedSubject}
            onSubjectChange={setSelectedSubject}
            onScoreEarned={handleScoreEarned}
          />
        )}

        {activeTab === 'srs' && (
          <MemoryTab
            language={language}
            selectedSubject={selectedSubject}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressTab language={language} />
        )}

        {activeTab === 'planner' && (
          <PlannerTab language={language} />
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        language={language}
      />

      {/* Cute Floating Cheer Mascot on Desktop */}
      <div className="hidden lg:block fixed bottom-6 left-6 z-30">
        <div className="group relative">
          <div className="bg-white/90 backdrop-blur-md p-2 rounded-full border border-pink-200 shadow-md cursor-pointer hover:scale-110 transition-transform">
            <BestieMascot mood="happy" size="md" />
          </div>
          {/* Tooltip bubble */}
          <div className="absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-white text-pink-900 rounded-2xl border border-pink-200 shadow-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center">
            {t.tagline}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SRSProvider>
        <MainAppContent />
      </SRSProvider>
    </AuthProvider>
  );
}
