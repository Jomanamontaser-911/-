import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Language } from '../types';
import { translations } from '../constants/translations';
import { BestieMascot } from './BestieMascot';
import { LogIn, UserPlus, Sparkles, Heart, CheckCircle2, Lock, Mail, User } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [track, setTrack] = useState<'علمي علوم' | 'علمي رياضة' | 'أدبي' | 'أخرى'>('علمي علوم');
  const [dreamCollege, setDreamCollege] = useState('كلية الطب البشري 🩺');
  const [gradeLevel, setGradeLevel] = useState('الصف الثالث الثانوي (ثانوية عامة)');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    if (mode === 'login') {
      const res = await login(email, password);
      setIsLoading(false);
      if (res.success) {
        onClose();
      } else {
        setErrorMessage(res.error || 'فشل تسجيل الدخول');
      }
    } else {
      if (!name.trim()) {
        setIsLoading(false);
        setErrorMessage('يرجى كتابة الاسم');
        return;
      }
      const res = await signup(name, email, password, track, dreamCollege, gradeLevel);
      setIsLoading(false);
      if (res.success) {
        onClose();
      } else {
        setErrorMessage(res.error || 'فشل إنشاء الحساب');
      }
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    await login('jomanamontaser911@gmail.com', 'demo123');
    setIsLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-md w-full border border-pink-200 shadow-2xl space-y-4 relative max-h-[95vh] overflow-y-auto no-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 sm:left-5 text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
        >
          ✕
        </button>

        {/* Mascot & Heading */}
        <div className="text-center space-y-1.5 pt-1">
          <BestieMascot mood="happy" size="md" className="mx-auto" />
          <h3 className="text-lg sm:text-xl font-black text-slate-800">
            {mode === 'login' ? 'مرحباً بيكي يا بطلة! 🌸' : 'انضمي لعائلة ستدي بيستي ✨'}
          </h3>
          <p className="text-xs text-slate-500">
            احفظي تقدمك وجدولك وبطاقات التكرار المتباعد في حسابك الآمن
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 bg-pink-50 p-1 rounded-2xl border border-pink-200/60">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-pink-600 shadow-xs'
                : 'text-slate-500 hover:text-pink-600'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-pink-600 shadow-xs'
                : 'text-slate-500 hover:text-pink-600'
            }`}
          >
            حساب جديد
          </button>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold text-center">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">اسمك الجميل 🌸</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثلاً: مريم، سلمى، أحمد..."
                  className="w-full text-xs py-2 px-3 ps-8 rounded-xl border border-slate-200 bg-white"
                />
                <User className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 start-2.5" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">البريد الإلكتروني 📧</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full text-xs py-2 px-3 ps-8 rounded-xl border border-slate-200 bg-white"
              />
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 start-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">كلمة المرور 🔒</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs py-2 px-3 ps-8 rounded-xl border border-slate-200 bg-white"
              />
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 start-2.5" />
            </div>
          </div>

          {mode === 'signup' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الشعبة الدراسية</label>
                  <select
                    value={track}
                    onChange={(e) => setTrack(e.target.value as any)}
                    className="w-full text-xs py-2 px-2.5 rounded-xl border border-pink-200 bg-pink-50/30"
                  >
                    <option value="علمي علوم">علمي علوم 🧬</option>
                    <option value="علمي رياضة">علمي رياضة 📐</option>
                    <option value="أدبي">أدبي 📜</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">المرحلة الدراسية</label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full text-xs py-2 px-2.5 rounded-xl border border-pink-200 bg-pink-50/30"
                  >
                    <option value="الصف الثالث الثانوي (ثانوية عامة)">3 ثانوي (ثانوية عامة)</option>
                    <option value="الصف الثاني الثانوي">2 ثانوي</option>
                    <option value="الصف الأول الثانوي">1 ثانوي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">كلية أحلامك أو هدفك 🎓</label>
                <input
                  type="text"
                  value={dreamCollege}
                  onChange={(e) => setDreamCollege(e.target.value)}
                  placeholder="مثلاً: كلية الطب البشري، كلية الهندسة..."
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-xs sm:text-sm shadow-md hover:opacity-95 transition-all cursor-pointer mt-2"
          >
            {isLoading ? 'جاري التحميل...' : mode === 'login' ? 'دخول لحسابي 🌸' : 'إنشاء حساب جديد 🚀'}
          </button>
        </form>

        {/* Demo Fast Login */}
        <div className="pt-2 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={handleDemoLogin}
            className="text-xs text-purple-700 hover:text-purple-800 font-bold underline cursor-pointer"
          >
            ✨ تجربة سريعة بحساب تجريبي مجهز (1-Click Demo)
          </button>
        </div>
      </div>
    </div>
  );
};
