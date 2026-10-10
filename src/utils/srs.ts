import { SRSCard, SRSGrade } from '../types';

/**
 * SuperMemo SM-2 Spaced Repetition Algorithm
 */
export function calculateNextReview(
  card: SRSCard,
  grade: SRSGrade
): {
  interval: number;
  repetitions: number;
  easeFactor: number;
  box: number;
  dueDate: number;
} {
  let { interval, repetitions, easeFactor } = card;

  // Map grade to numerical quality (0-5)
  const qualityMap: Record<SRSGrade, number> = {
    again: 1,
    hard: 2,
    good: 4,
    easy: 5,
  };

  const q = qualityMap[grade];

  // Adjust Ease Factor (EF)
  let newEF = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (newEF < 1.3) newEF = 1.3;
  if (newEF > 3.0) newEF = 3.0;

  let newRepetitions = repetitions;
  let newInterval = interval;

  if (q < 3) {
    // Failure / Again
    newRepetitions = 0;
    newInterval = 1; // Due tomorrow
  } else {
    // Successful recall
    if (newRepetitions === 0) {
      newInterval = 1;
    } else if (newRepetitions === 1) {
      newInterval = 3;
    } else {
      const multiplier = grade === 'easy' ? 1.3 : 1.0;
      newInterval = Math.max(1, Math.round(newInterval * newEF * multiplier));
    }
    newRepetitions += 1;
  }

  // Determine Leitner Box (1 to 5)
  let box = 1;
  if (newInterval >= 30) box = 5; // Mastered
  else if (newInterval >= 14) box = 4;
  else if (newInterval >= 7) box = 3;
  else if (newInterval >= 3) box = 2;
  else box = 1;

  // Next due timestamp (in milliseconds)
  const oneDayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const dueDate = now + newInterval * oneDayMs;

  return {
    interval: newInterval,
    repetitions: newRepetitions,
    easeFactor: parseFloat(newEF.toFixed(2)),
    box,
    dueDate,
  };
}

/**
 * Calculates estimated memory retention (0 - 100%) based on Ebbinghaus forgetting curve
 */
export function calculateRetentionRate(cards: SRSCard[]): number {
  if (cards.length === 0) return 100;

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  let totalRetention = 0;

  cards.forEach((card) => {
    const elapsedDays = card.lastReviewedAt
      ? Math.max(0, (now - card.lastReviewedAt) / oneDayMs)
      : 0;
    const stability = Math.max(1, card.interval);
    // Ebbinghaus formula: R = e^(-t / S)
    const retention = Math.exp(-elapsedDays / (stability * 1.5)) * 100;
    totalRetention += Math.min(100, Math.max(15, retention));
  });

  return Math.round(totalRetention / cards.length);
}

/**
 * Pre-seeded high-yield Egyptian curriculum flashcards for instant practice
 */
export const INITIAL_SRS_CARDS: Omit<SRSCard, 'userId'>[] = [
  {
    id: 'srs_1',
    subjectId: 'physics',
    subjectName: 'الفيزياء',
    topic: 'قوانين كيرشوف للدوائر المغلقة',
    front: 'ما هو نص قانون كيرشوف الأول (قانون النقطة)؟ وما الأساس العلمي الفيزيائي الذي يبنى عليه؟',
    back: 'المجموع الجبري للتيارات الكهربية الداخلة عند أي نقطة تفرع في دائرة مغلقة يساوي المجموع الجبري للتيارات الخارجة منها: Σ I(in) = Σ I(out).\n\nالأساس العلمي: مبني على قانون بقاء الشحنة الكهربية (Charge Conservation).',
    keyRule: 'قانون كيرشوف الأول = قانون العقدة = حفظ الشحنة الكهربية ⚡',
    repetitions: 1,
    interval: 1,
    easeFactor: 2.5,
    box: 1,
    dueDate: Date.now() - 1000, // Due today
    history: [],
    source: 'custom',
  },
  {
    id: 'srs_2',
    subjectId: 'chemistry',
    subjectName: 'الكيمياء',
    topic: 'الكيمياء العضوية - الألكانات',
    front: 'لماذا تعتبر الألكانات (البرافينات) خاملة كيميائياً نسبياً في الظروف العادية؟',
    back: 'لأن جميع الروابط بين ذرات الكربون في جزيئاتها روابط أحادية من نوع سيجما (σ) القوية جداً، والتي يصعب كسرها في درجات الحرارة العادية وتحتاج إلى طاقة تنشيط عالية.',
    keyRule: 'روابط سيجما الأحادية σ = تداخل رأسي قوي = خمول نسبي 🧪',
    repetitions: 2,
    interval: 3,
    easeFactor: 2.6,
    box: 2,
    dueDate: Date.now() + 86400000,
    history: [],
    source: 'custom',
  },
  {
    id: 'srs_3',
    subjectId: 'arabic',
    subjectName: 'اللغة العربية',
    topic: 'النحو - كان التامة وأخواتها',
    front: 'متى تأتي "كان" وأخواتها تامة؟ وما إعراب الاسم الواقع بعدها في هذه الحالة؟',
    back: 'تأتي "كان" وأخواتها تامة إذا اكتفت بمرفوعها فقط للدلالة على الحدوث والوجود، ولم تحتاج إلى خبر يتمم معناها.\n\nإعراب الاسم بعدها: يعرب "فاعلاً مرفوعاً" وليس اسماً لكان. مثال: "اتقِ الله حيثما كنتَ" (التاء فاعل).',
    keyRule: 'كان التامة تكتفي بالفاعل ولا تحتاج لخبر (تفيد الحدوث والوجود) 📚',
    repetitions: 0,
    interval: 1,
    easeFactor: 2.5,
    box: 1,
    dueDate: Date.now() - 5000, // Due today
    history: [],
    source: 'custom',
  },
  {
    id: 'srs_4',
    subjectId: 'biology',
    subjectName: 'الأحياء',
    topic: 'المناعة في الإنسان',
    front: 'ما هي الخلايا اللمفاوية التائية القاتلة (Tc)؟ وما هي المواد الكيميائية التي تفرزها للقضاء على الخلايا المصابة؟',
    back: 'خلايا لمفاوية تائية تهاجم الخلايا السرطانية والأعضاء المزروعة والخلايا المصابة بالفيروسات.\n\nالمواد التي تفرزها:\n1. بروتين البيرفورين (البروتين صانع الثقوب) لتثقيب غشاء الخلية المصابة.\n2. السموم اللمفاوية (Lymphotoxins) التي تنشط جينات محددة داخل النواة تؤدي لتفتيت الـ DNA وموت الخلية ذاتياً.',
    keyRule: 'الخلايا التائية القاتلة Tc = بيرفورين ثاقب + سموم لمفاوية قاتلة 🧬',
    repetitions: 3,
    interval: 7,
    easeFactor: 2.7,
    box: 3,
    dueDate: Date.now() + 2 * 86400000,
    history: [],
    source: 'custom',
  },
  {
    id: 'srs_5',
    subjectId: 'math',
    subjectName: 'الرياضيات',
    topic: 'التفاضل والتكامل - مشتقات الدوال المثلثية',
    front: 'ما هي مشتقة دالة الظل (tan x) ودالة القاطع (sec x)؟',
    back: 'مشتقة ظا س [d/dx (tan x)] = قا² س (sec² x).\n\nمشتقة قا س [d/dx (sec x)] = قا س ظا س (sec x tan x).',
    keyRule: 'd/dx (tan) = sec² ، و d/dx (sec) = sec · tan 📐',
    repetitions: 4,
    interval: 16,
    easeFactor: 2.8,
    box: 4,
    dueDate: Date.now() + 10 * 86400000,
    history: [],
    source: 'custom',
  },
];
