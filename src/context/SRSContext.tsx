import React, { createContext, useContext, useState, useEffect } from 'react';
import { SRSCard, SRSGrade } from '../types';
import { calculateNextReview, calculateRetentionRate, INITIAL_SRS_CARDS } from '../utils/srs';
import { useAuth } from './AuthContext';

interface SRSContextType {
  cards: SRSCard[];
  dueCards: SRSCard[];
  addCard: (card: Omit<SRSCard, 'id' | 'userId' | 'repetitions' | 'interval' | 'easeFactor' | 'box' | 'dueDate' | 'history'>) => SRSCard;
  addCardsFromQuiz: (
    items: {
      question: string;
      answer: string;
      explanation: string;
      subjectId: string;
      subjectName: string;
      topic: string;
      isMistake: boolean;
    }[]
  ) => void;
  reviewCard: (cardId: string, grade: SRSGrade) => void;
  deleteCard: (cardId: string) => void;
  retentionRate: number;
  stats: {
    total: number;
    dueToday: number;
    learning: number; // Box 1-3
    mastered: number; // Box 4-5
  };
}

const SRSContext = createContext<SRSContextType | undefined>(undefined);

export const SRSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, addStudyPoints } = useAuth();
  const userId = user?.id || 'guest_user';

  const [cards, setCards] = useState<SRSCard[]>(() => {
    const storageKey = `study_bestie_srs_cards_${userId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse SRS cards:', e);
      }
    }
    // Pre-populate with initial curriculum cards for this user
    return INITIAL_SRS_CARDS.map((c) => ({
      ...c,
      userId,
    }));
  });

  // Switch cards whenever user changes
  useEffect(() => {
    const storageKey = `study_bestie_srs_cards_${userId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setCards(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      const defaultCards = INITIAL_SRS_CARDS.map((c) => ({
        ...c,
        userId,
      }));
      setCards(defaultCards);
      localStorage.setItem(storageKey, JSON.stringify(defaultCards));
    }
  }, [userId]);

  // Save cards whenever updated
  useEffect(() => {
    const storageKey = `study_bestie_srs_cards_${userId}`;
    localStorage.setItem(storageKey, JSON.stringify(cards));
  }, [cards, userId]);

  const now = Date.now();
  const dueCards = cards.filter((c) => c.dueDate <= now);

  const addCard = (
    cardData: Omit<
      SRSCard,
      'id' | 'userId' | 'repetitions' | 'interval' | 'easeFactor' | 'box' | 'dueDate' | 'history'
    >
  ): SRSCard => {
    const newCard: SRSCard = {
      ...cardData,
      id: `srs_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      repetitions: 0,
      interval: 1,
      easeFactor: 2.5,
      box: 1,
      dueDate: Date.now(), // Due immediately for initial learning
      history: [],
    };

    setCards((prev) => [newCard, ...prev]);
    addStudyPoints(10);
    return newCard;
  };

  const addCardsFromQuiz = (
    items: {
      question: string;
      answer: string;
      explanation: string;
      subjectId: string;
      subjectName: string;
      topic: string;
      isMistake: boolean;
    }[]
  ) => {
    const newCards: SRSCard[] = items.map((item, index) => ({
      id: `srs_quiz_${Date.now()}_${index}`,
      userId,
      subjectId: item.subjectId,
      subjectName: item.subjectName,
      topic: item.topic,
      front: item.question,
      back: `الإجابة النموذجية:\n${item.answer}\n\nتفسير بيستي:\n${item.explanation}`,
      keyRule: `سؤال امتحاني مهم في ${item.topic} 🎯`,
      repetitions: item.isMistake ? 0 : 1,
      interval: item.isMistake ? 1 : 2,
      easeFactor: item.isMistake ? 2.3 : 2.5,
      box: item.isMistake ? 1 : 2,
      dueDate: item.isMistake ? Date.now() : Date.now() + 86400000,
      history: [],
      source: 'quiz',
    }));

    setCards((prev) => [...newCards, ...prev]);
    addStudyPoints(items.length * 5);
  };

  const reviewCard = (cardId: string, grade: SRSGrade) => {
    setCards((prevCards) =>
      prevCards.map((card) => {
        if (card.id !== cardId) return card;

        const next = calculateNextReview(card, grade);
        const historyItem = {
          date: Date.now(),
          grade,
          interval: next.interval,
          easeFactor: next.easeFactor,
        };

        return {
          ...card,
          ...next,
          lastReviewedAt: Date.now(),
          history: [historyItem, ...(card.history || [])],
        };
      })
    );

    // Award study points based on effort
    const pointMap: Record<SRSGrade, number> = {
      again: 5,
      hard: 10,
      good: 15,
      easy: 20,
    };
    addStudyPoints(pointMap[grade]);
  };

  const deleteCard = (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  const retentionRate = calculateRetentionRate(cards);

  const stats = {
    total: cards.length,
    dueToday: dueCards.length,
    learning: cards.filter((c) => c.box < 4).length,
    mastered: cards.filter((c) => c.box >= 4).length,
  };

  return (
    <SRSContext.Provider
      value={{
        cards,
        dueCards,
        addCard,
        addCardsFromQuiz,
        reviewCard,
        deleteCard,
        retentionRate,
        stats,
      }}
    >
      {children}
    </SRSContext.Provider>
  );
};

export const useSRS = () => {
  const context = useContext(SRSContext);
  if (!context) {
    throw new Error('useSRS must be used within an SRSProvider');
  }
  return context;
};
