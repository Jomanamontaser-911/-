export type Language = 'ar' | 'en';

export type AppTab = 'chat' | 'study' | 'summarize' | 'mindmap' | 'quiz' | 'srs' | 'planner' | 'progress';

export interface MindMapSubtopic {
  title: string;
  points: string[];
}

export interface MindMapBranch {
  id: string;
  title: string;
  icon: string;
  colorTheme: string; // 'pink' | 'purple' | 'blue' | 'emerald' | 'amber' | 'rose'
  subtopics: MindMapSubtopic[];
}

export interface MindMapData {
  centralTopic: string;
  centralIcon?: string;
  centralSummary?: string;
  subject?: string;
  branches: MindMapBranch[];
}

export interface QuizHistoryRecord {
  id: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  date: number;
}

export interface Subject {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  color: string;
  bgPastel: string;
  borderPastel: string;
  popularTopics: { ar: string; en: string }[];
}

export interface VoiceAttachment {
  audioUrl?: string;
  duration: number; // seconds
  mimeType: string;
  data: string; // base64
  transcription?: string;
}

export interface ExtractedPdfDoc {
  name: string;
  size: number;
  pageCount: number;
  extractedText: string;
  isScanned: boolean;
  base64Data?: string;
  previewSample?: string;
}

export interface FileAttachment {
  name: string;
  size: number;
  mimeType: string;
  data: string; // base64 string
  previewUrl?: string; // data URL for preview
  pdfMeta?: {
    pageCount: number;
    isScanned: boolean;
    extractedText?: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  subject?: string;
  attachment?: {
    name: string;
    mimeType: string;
    previewUrl?: string;
    isPdf?: boolean;
    pageCount?: number;
    isScanned?: boolean;
  };
  voice?: VoiceAttachment;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  subjectId: string;
}

export interface StudyStep {
  stepNumber: number;
  title: string;
  intuition: string;
  explanation: string;
  proTip?: string;
}

export interface StudyExplanation {
  title: string;
  subject: string;
  egyptianIntro: string;
  steps: StudyStep[];
  goldenRules: string[];
  commonExamPitfall: string;
  quickCheckQuestion?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  bestieEncouragement: string;
}

export interface SummaryResult {
  title: string;
  overview: string;
  formatType: 'bullet_points' | 'mindmap' | 'formulas_definitions' | 'exam_qa';
  sections: {
    heading: string;
    items: string[];
  }[];
  highlightNotes: string[];
  examSummaryPunchline: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint?: string;
}

export interface QuizData {
  title: string;
  subject: string;
  topic: string;
  questions: QuizQuestion[];
}

export interface ScheduleSlot {
  time: string;
  activity: string;
  durationMinutes: number;
  isBreak?: boolean;
}

export interface DailyScheduleDay {
  dayNumber: number;
  dayTitle: string;
  focusSubject: string;
  slots: ScheduleSlot[];
  dailyGoal: string;
}

export interface StudyPlanData {
  planTitle: string;
  bestieIntro: string;
  dailySchedule: DailyScheduleDay[];
  bestieTips: string[];
}

export interface StudyTask {
  id: string;
  text: string;
  subjectId: string;
  estimatedMinutes: number;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

// Spaced Repetition System (SRS) types
export type SRSGrade = 'again' | 'hard' | 'good' | 'easy'; // SM-2 mapping: again=1, hard=2, good=4, easy=5

export interface SRSReviewHistoryItem {
  date: number;
  grade: SRSGrade;
  interval: number;
  easeFactor: number;
}

export interface SRSCard {
  id: string;
  userId: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  front: string; // The question or concept to recall
  back: string; // The full explanation and answer
  keyRule?: string; // Memory trick or golden formula
  repetitions: number; // Consecutive successful repetitions
  interval: number; // In days until next review
  easeFactor: number; // SM-2 ease factor (default 2.5)
  box: number; // Leitner box 1 to 5
  dueDate: number; // Timestamp when due for review
  lastReviewedAt?: number;
  history: SRSReviewHistoryItem[];
  source: 'quiz' | 'study_mode' | 'summary' | 'custom' | 'ai';
}

// User Profile & Authentication types
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  gradeLevel: string; // e.g. "ثانوية عامة"
  track: 'علمي علوم' | 'علمي رياضة' | 'أدبي' | 'أخرى';
  dreamCollege?: string; // e.g. "كلية الطب البشري", "كلية الهندسة"
  avatarEmoji: string;
  studyStreak: number;
  lastStudyDate?: string;
  totalStudyPoints: number;
  createdAt: number;
}
