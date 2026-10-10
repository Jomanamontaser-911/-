import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Language } from '../types';
import { User, LogOut, Award, Flame, Heart, Sparkles, ChevronDown } from 'lucide-react';

interface UserProfileMenuProps {
  onOpenAuth: () => void;
  language: Language;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  onOpenAuth,
  language,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!isAuthenticated || !user) {
    return (
      <button
        onClick={onOpenAuth}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-pink-500 text-white hover:bg-pink-600 transition-all cursor-pointer shadow-xs active:scale-95"
      >
        <User className="w-3.5 h-3.5" />
        <span>تسجيل الدخول</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-full bg-pink-50 border border-pink-200 hover:bg-pink-100 transition-all cursor-pointer shadow-xs"
      >
        <span className="w-6 h-6 rounded-full bg-pink-200 flex items-center justify-center text-xs shrink-0">
          {user.avatarEmoji}
        </span>
        <span className="text-xs font-bold text-slate-700 hidden sm:inline max-w-[90px] truncate">
          {user.name}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 end-0 z-50 w-64 bg-white rounded-3xl p-4 border border-pink-200 shadow-xl space-y-3 animate-fade-in text-start">
            {/* Header info */}
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-pink-100">
              <span className="w-10 h-10 rounded-2xl bg-pink-100 border border-pink-200 flex items-center justify-center text-lg shrink-0">
                {user.avatarEmoji}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs sm:text-sm font-black text-slate-800 truncate">
                  {user.name}
                </h4>
                <p className="text-[11px] text-pink-600 font-bold truncate">
                  {user.dreamCollege || user.track}
                </p>
                <span className="text-[10px] text-slate-400 block truncate">
                  {user.email}
                </span>
              </div>
            </div>

            {/* Badges / Points */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-purple-50 border border-purple-100">
                <span className="block font-black text-purple-700">{user.totalStudyPoints}</span>
                <span className="text-[10px] text-purple-600 font-medium">نقاط المذاكرة ⭐</span>
              </div>
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
                <span className="block font-black text-rose-700">{user.studyStreak} أيام</span>
                <span className="text-[10px] text-rose-600 font-medium">أيام الالتزام 🔥</span>
              </div>
            </div>

            {/* Track info */}
            <div className="p-2.5 rounded-xl bg-pink-50/70 border border-pink-100 text-[11px] space-y-1">
              <div className="flex items-center justify-between text-slate-600">
                <span>الشعبة:</span>
                <span className="font-bold text-pink-700">{user.track}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>المرحلة:</span>
                <span className="font-bold text-slate-800">{user.gradeLevel.split('(')[0]}</span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
