import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (
    name: string,
    email: string,
    password: string,
    track: 'علمي علوم' | 'علمي رياضة' | 'أدبي' | 'أخرى',
    dreamCollege?: string,
    gradeLevel?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  addStudyPoints: (points: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = 'study_bestie_users_db';
const ACTIVE_USER_ID_KEY = 'study_bestie_active_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const activeId = localStorage.getItem(ACTIVE_USER_ID_KEY);
    const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
    if (activeId && usersJson) {
      try {
        const users: Record<string, { profile: UserProfile }> = JSON.parse(usersJson);
        if (users[activeId]) {
          return users[activeId].profile;
        }
      } catch (e) {
        console.error('Failed to load user:', e);
      }
    }
    // Default friendly Egyptian high-school student demo profile
    const defaultProfile: UserProfile = {
      id: 'student_demo_1',
      name: 'جمانة منتصر',
      email: 'jomanamontaser911@gmail.com',
      gradeLevel: 'ثانوية عامة (الصف الثالث الثانوي)',
      track: 'علمي علوم',
      dreamCollege: 'كلية الطب البشري 🩺',
      avatarEmoji: '🌸',
      studyStreak: 5,
      totalStudyPoints: 480,
      createdAt: Date.now() - 5 * 86400000,
    };
    return defaultProfile;
  });

  // Save changes to active user
  useEffect(() => {
    if (user) {
      localStorage.setItem(ACTIVE_USER_ID_KEY, user.id);
      const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
      const users = usersJson ? JSON.parse(usersJson) : {};
      users[user.id] = {
        ...users[user.id],
        profile: user,
      };
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } else {
      localStorage.removeItem(ACTIVE_USER_ID_KEY);
    }
  }, [user]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
    const users = usersJson ? JSON.parse(usersJson) : {};

    // Check demo user
    if (trimmedEmail === 'jomanamontaser911@gmail.com') {
      const demoProfile: UserProfile = {
        id: 'student_demo_1',
        name: 'جمانة منتصر',
        email: 'jomanamontaser911@gmail.com',
        gradeLevel: 'ثانوية عامة (الصف الثالث الثانوي)',
        track: 'علمي علوم',
        dreamCollege: 'كلية الطب البشري 🩺',
        avatarEmoji: '🌸',
        studyStreak: 5,
        totalStudyPoints: 480,
        createdAt: Date.now() - 5 * 86400000,
      };
      setUser(demoProfile);
      return { success: true };
    }

    const foundEntry = Object.values(users).find(
      (entry: any) => entry.profile?.email?.toLowerCase() === trimmedEmail
    ) as any;

    if (!foundEntry) {
      return { success: false, error: 'البريد الإلكتروني غير مسجل، يمكنك إنشاء حساب جديد!' };
    }

    if (foundEntry.password !== password) {
      return { success: false, error: 'كلمة المرور غير صحيحة، يرجى المحاولة ثانية.' };
    }

    setUser(foundEntry.profile);
    return { success: true };
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    track: 'علمي علوم' | 'علمي رياضة' | 'أدبي' | 'أخرى',
    dreamCollege?: string,
    gradeLevel = 'الصف الثالث الثانوي (ثانوية عامة)'
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
    const users = usersJson ? JSON.parse(usersJson) : {};

    const existing = Object.values(users).find(
      (entry: any) => entry.profile?.email?.toLowerCase() === trimmedEmail
    );

    if (existing) {
      return { success: false, error: 'هذا البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول.' };
    }

    const newId = `usr_${Date.now()}`;
    const newProfile: UserProfile = {
      id: newId,
      name: name.trim(),
      email: trimmedEmail,
      gradeLevel,
      track,
      dreamCollege: dreamCollege || 'كلية أحلامي ✨',
      avatarEmoji: track === 'علمي علوم' ? '🧬' : track === 'علمي رياضة' ? '📐' : '📜',
      studyStreak: 1,
      totalStudyPoints: 50,
      createdAt: Date.now(),
    };

    users[newId] = {
      profile: newProfile,
      password,
    };

    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    setUser(newProfile);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(ACTIVE_USER_ID_KEY);
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!user) return;
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const addStudyPoints = (points: number) => {
    if (!user) return;
    setUser((prev) =>
      prev ? { ...prev, totalStudyPoints: prev.totalStudyPoints + points } : null
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        login,
        signup,
        logout,
        updateProfile,
        addStudyPoints,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
