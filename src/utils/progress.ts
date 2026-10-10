import { QuizHistoryRecord } from '../types';

const QUIZ_HISTORY_KEY = 'study_bestie_quiz_history';

export const INITIAL_QUIZ_HISTORY: QuizHistoryRecord[] = [
  {
    id: 'qh_1',
    subjectId: 'physics',
    subjectName: 'الفيزياء',
    topic: 'قوانين كيرشوف وتوصيل المقاومات',
    totalQuestions: 5,
    correctAnswers: 5,
    percentage: 100,
    date: Date.now() - 86400000,
  },
  {
    id: 'qh_2',
    subjectId: 'chemistry',
    subjectName: 'الكيمياء',
    topic: 'الكيمياء العضوية والألكانات',
    totalQuestions: 5,
    correctAnswers: 4,
    percentage: 80,
    date: Date.now() - 2 * 86400000,
  },
  {
    id: 'qh_3',
    subjectId: 'arabic',
    subjectName: 'اللغة العربية',
    topic: 'كان وأخواتها والممنوع من الصرف',
    totalQuestions: 5,
    correctAnswers: 4,
    percentage: 80,
    date: Date.now() - 3 * 86400000,
  },
  {
    id: 'qh_4',
    subjectId: 'biology',
    subjectName: 'الأحياء',
    topic: 'المناعة والأجسام المضادة',
    totalQuestions: 5,
    correctAnswers: 5,
    percentage: 100,
    date: Date.now() - 4 * 86400000,
  },
  {
    id: 'qh_5',
    subjectId: 'english',
    subjectName: 'اللغة الإنجليزية',
    topic: 'Present & Past Perfect Tenses',
    totalQuestions: 5,
    correctAnswers: 3,
    percentage: 60,
    date: Date.now() - 5 * 86400000,
  },
];

export function getQuizHistory(): QuizHistoryRecord[] {
  const saved = localStorage.getItem(QUIZ_HISTORY_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
  }
  localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(INITIAL_QUIZ_HISTORY));
  return INITIAL_QUIZ_HISTORY;
}

export function saveQuizAttempt(record: Omit<QuizHistoryRecord, 'id' | 'date'>): QuizHistoryRecord {
  const history = getQuizHistory();
  const newRecord: QuizHistoryRecord = {
    ...record,
    id: `qh_${Date.now()}`,
    date: Date.now(),
  };
  const updated = [newRecord, ...history];
  localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(updated));
  return newRecord;
}
