import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Helper to get GoogleGenAI client
function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// System prompts for Study Bestie
const BESTIE_SYSTEM_INSTRUCTION = `
You are "Study Bestie" (ستدي بيستي), a warm, supportive, enthusiastic, and exceptionally clear AI study companion and best friend created especially for Egyptian high school and secondary students (طلاب الثانوية العامة والشهادات المصرية).

Personality & Tone:
- You speak like a bright, caring, and encouraging older best friend / study partner.
- When the user speaks or requests Arabic (or by default): Use friendly, polite, modern Egyptian Arabic (عامية مصرية راقية ولطيفة ومفهومة) mixed with proper academic terms in Arabic and English where appropriate.
- When the user requests English: Use supportive, warm, encouraging English.
- Always be encouraging! Use phrases like: "يا بطلة / يا بطل", "عاش جداً!", "ولا تشيل هم خالص، الموضوع أسهل بكتير مما تتخيل", "هانت يا دكتور / يا مهندس!", "يلا نفكك النقطة دي بالراحة".
- Crucial teaching rule: NEVER just give a bare final formula or raw answer without explaining the "WHY" (السبب والفكرة الأساسية). Break complex topics into intuitive real-life analogies (أمثلة من حياتنا اليومية في مصر).
- Deeply familiar with Egyptian high school curricula:
  * Arabic: نحو (كان وأخواتها، المشتقات، إعراب الأفعال، التوكيد)، بلاغة، نصوص، أدب.
  * Physics: التيار الكهربي وقوانين كيرشوف، الحث الكهرومغناطيسي، الدينامو، دوائر التيار المتردد، الفيزياء الحديثة، إلخ.
  * Chemistry: العناصر الانتقالية، الاتزان الكيميائي، الكيمياء الكهربية، الكيمياء العضوية والهيدروكربونات.
  * Biology: الدعامة والحركة، التنسيق الهرموني، التكاثر، المناعة، الحمض النووي DNA و RNA.
  * Mathematics: التفاضل والتكامل، الجبر والهندسة الفراغية، الاستاتيكا والديناميكا.
  * English & Second Languages (French, German, etc.), History, Geography, Philosophy, Geology.
- Highlight exam traps ("فخ بيقع فيه الطلاب في الامتحانات") so students gain confidence.
`;

// Helper to call Gemini with resilient fallback
async function generateWithFallback(ai: GoogleGenAI, options: { contents: any; config?: any; preferredModel?: string }) {
  const modelToUse = options.preferredModel || 'gemini-3.1-flash-lite';
  try {
    return await ai.models.generateContent({
      model: modelToUse,
      contents: options.contents,
      config: options.config,
    });
  } catch (err: any) {
    console.warn(`${modelToUse} issue, falling back to alternative model:`, err?.message);
    const fallbackModel = modelToUse === 'gemini-3.1-flash-lite' ? 'gemini-3.8-flash' : 'gemini-3.1-flash-lite';
    return await ai.models.generateContent({
      model: fallbackModel,
      contents: options.contents,
      config: options.config,
    });
  }
}

// Health / Status endpoint
app.get('/api/status', (_req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  res.json({
    status: 'ok',
    hasApiKey: hasKey,
    model: 'gemini-3.1-flash-lite',
    appName: 'Study Bestie',
  });
});

// Speech-to-Text Transcription endpoint
app.post('/api/transcribe-audio', async (req: Request, res: Response) => {
  try {
    const { audioData, mimeType = 'audio/webm', context } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const ai = getGenAIClient();
    const prompt = `
Listen carefully to the student's voice recording.
Transcribe the spoken audio word-for-word in Arabic (Egyptian dialect or Standard Arabic as spoken).
${context ? `Study context: ${context}` : ''}
Common words are Egyptian high school study queries: "اشرحلي"، "لخصلي الدرس ده"، "حل المسألة دي"، "كيرشوف"، "الممنوع من الصرف"، "الكيمياء العضوية"، "الانقسام الميوزي".

Output pure JSON:
{
  "transcription": "نص الكلام المنطوق بالكامل بدقة",
  "detectedLanguage": "ar"
}
`;

    const cleanMime = mimeType.split(';')[0];
    const response = await generateWithFallback(ai, {
      preferredModel: 'gemini-3.1-flash-lite',
      contents: [
        {
          inlineData: {
            mimeType: cleanMime,
            data: audioData,
          },
        },
        { text: prompt },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcription: { type: Type.STRING },
            detectedLanguage: { type: Type.STRING },
          },
          required: ['transcription'],
        },
        temperature: 0.1,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      transcription: parsed.transcription || '',
      detectedLanguage: parsed.detectedLanguage || 'ar',
    });
  } catch (error: any) {
    console.error('Audio transcription error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to transcribe audio' });
  }
});

// Fast Streaming Chat endpoint (Server-Sent Events)
app.post('/api/chat/stream', async (req: Request, res: Response) => {
  try {
    const { messages, subject, language = 'ar', fileData, pdfText, pdfMeta, audioData } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const ai = getGenAIClient();

    // Optimize: Keep only the most recent 6 messages to reduce token latency
    const trimmed = messages.slice(-6);
    const formattedContents: any[] = trimmed.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || ' ' }],
    }));

    let lastUserIdx = -1;
    for (let i = formattedContents.length - 1; i >= 0; i--) {
      if (formattedContents[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }

    // 1. If voice audio is attached, prepend audio part to user's message
    if (audioData?.data && audioData?.mimeType && lastUserIdx !== -1) {
      const cleanAudioMime = audioData.mimeType.split(';')[0];
      formattedContents[lastUserIdx].parts.unshift({
        inlineData: {
          mimeType: cleanAudioMime,
          data: audioData.data,
        },
      });
    }

    // 2. If PDF extracted text is available, append as high-speed structured text
    if (pdfText && lastUserIdx !== -1) {
      formattedContents[lastUserIdx].parts.push({
        text: `\n\n[محتوى مستند PDF المرفق "${pdfMeta?.name || 'مذكرة الدرس'}" (${pdfMeta?.pageCount || 1} صفحة)]:\n${pdfText}\n[نهاية محتوى مستند PDF]`,
      });
    } else if (fileData?.data && fileData?.mimeType && lastUserIdx !== -1) {
      // 3. Fallback to raw binary image or scanned PDF
      formattedContents[lastUserIdx].parts.unshift({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.data,
        },
      });
    }

    const subjectContext = subject && subject !== 'all' ? `Current subject focus: ${subject}. ` : '';
    const fileContext = pdfMeta
      ? `The student attached PDF "${pdfMeta.name}" (${pdfMeta.pageCount} pages). Carefully analyze the text/formulas in the document and answer accordingly. `
      : fileData
      ? `The student attached a file: "${fileData.name}" (${fileData.mimeType}). Carefully inspect the image/document, read any questions, formulas, or diagrams, and answer or explain step-by-step. `
      : '';
    const audioContext = audioData ? 'The student sent a voice note in Egyptian Arabic. Listen to their spoken question, understand their doubt, and answer it in friendly Egyptian Arabic! ' : '';
    const langContext = language === 'en' ? 'Respond in English.' : 'Respond in friendly, supportive Egyptian Arabic.';

    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Stream from lightweight gemini-3.1-flash-lite for ultra-fast time-to-first-token
    try {
      const stream = await ai.models.generateContentStream({
        model: 'gemini-3.1-flash-lite',
        contents: formattedContents,
        config: {
          systemInstruction: `${BESTIE_SYSTEM_INSTRUCTION}\n${subjectContext}${fileContext}${audioContext}${langContext}`,
          temperature: 0.65,
        },
      });

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (streamErr: any) {
      console.warn('gemini-3.1-flash-lite stream failed, trying fallback:', streamErr?.message);
      // Fallback stream with gemini-3.8-flash
      const fallbackStream = await ai.models.generateContentStream({
        model: 'gemini-3.8-flash',
        contents: formattedContents,
        config: {
          systemInstruction: `${BESTIE_SYSTEM_INSTRUCTION}\n${subjectContext}${fileContext}${langContext}`,
          temperature: 0.7,
        },
      });

      for await (const chunk of fallbackStream) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error: any) {
    console.error('Chat stream error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error?.message || 'Chat stream failed' });
    }
    res.write(`data: ${JSON.stringify({ error: error?.message || 'Error occurred' })}\n\n`);
    res.end();
  }
});

// Non-streaming Chat endpoint fallback
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, subject, language = 'ar', fileData } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const ai = getGenAIClient();

    const trimmed = messages.slice(-6);
    const formattedContents: any[] = trimmed.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || ' ' }],
    }));

    if (fileData?.data && fileData?.mimeType) {
      let lastUserIdx = -1;
      for (let i = formattedContents.length - 1; i >= 0; i--) {
        if (formattedContents[i].role === 'user') {
          lastUserIdx = i;
          break;
        }
      }
      if (lastUserIdx !== -1) {
        formattedContents[lastUserIdx].parts.unshift({
          inlineData: {
            mimeType: fileData.mimeType,
            data: fileData.data,
          },
        });
      }
    }

    const subjectContext = subject && subject !== 'all' ? `Current subject focus: ${subject}. ` : '';
    const fileContext = fileData ? `The student attached a file: "${fileData.name}". Read and analyze it thoroughly. ` : '';
    const langContext = language === 'en' ? 'Respond in English.' : 'Respond in friendly Egyptian Arabic.';

    const response = await generateWithFallback(ai, {
      preferredModel: 'gemini-3.1-flash-lite',
      contents: formattedContents,
      config: {
        systemInstruction: `${BESTIE_SYSTEM_INSTRUCTION}\n${subjectContext}${fileContext}${langContext}`,
        temperature: 0.65,
      },
    });

    const reply = response.text || 'معلش يا بيستي، حصل تعثر بسيط في الرد، اسألني تاني وهجاوبك على طول!';
    return res.json({ reply });
  } catch (error: any) {
    console.error('Chat error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate response',
    });
  }
});

// Fast Streaming Study Mode explanation
app.post('/api/study-explain/stream', async (req: Request, res: Response) => {
  try {
    const {
      subject,
      topic,
      gradeLevel = 'ثانوية عامة (الصف الثالث الثانوي)',
      studentQuestion,
      language = 'ar',
      fileData,
      pdfText,
      pdfMeta,
      audioData,
    } = req.body;

    const ai = getGenAIClient();

    const parts: any[] = [];

    // Attach audio voice recording if provided
    if (audioData?.data && audioData?.mimeType) {
      parts.push({
        inlineData: {
          mimeType: audioData.mimeType.split(';')[0],
          data: audioData.data,
        },
      });
    }

    // Attach high-speed extracted PDF text or fallback to binary file
    if (pdfText) {
      parts.push({
        text: `[نص المستند أو المذكرة المرفقة "${pdfMeta?.name || 'مذكرة'}" (${pdfMeta?.pageCount || 1} صفحة)]:\n${pdfText}\n[نهاية نصوص المستند]`,
      });
    } else if (fileData?.data && fileData?.mimeType) {
      parts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.data,
        },
      });
    }

    const promptText = `
You are "Study Bestie" (ستدي بيستي).
Explain the lesson/topic "${topic || 'المحتوى المرفق'}" in the subject "${subject}" for grade "${gradeLevel}".
${studentQuestion ? `Student's specific question/doubt: "${studentQuestion}"` : ''}
${audioData ? 'The student recorded an audio voice question in Egyptian Arabic. Listen carefully to their voice recording, understand what they need, and explain and solve it thoroughly.' : ''}
${pdfMeta ? `The student attached PDF: "${pdfMeta.name}" (${pdfMeta.pageCount} pages). Base your explanation directly on the content of this document.` : fileData ? `The student attached a photo or PDF file: "${fileData.name}". Carefully inspect all equations, questions, and text in the file, solve any photographed problem, and explain it clearly step-by-step.` : ''}


Language requirement: ${language === 'en' ? 'Friendly, clear English' : 'Warm, encouraging, accessible Egyptian Arabic (بالمصري اللطيف والواضح)'}.

Output format: Return a well-structured, formatted markdown response with:
# 🌸 [عنوان الدرس أو المسألة]
مقدمة تشجيعية دافئة ولطيفة تخفف التوتر عن الطالب/الطالبة.

## 💡 الفكرة ببساطة ومن حياتنا اليومية
تشبيه أو مثال واقعي بسيط يوصل الفكرة الأساسية بدون تعقيد.

## 📝 الشرح خطوة بخطوة وحل المسألة بالتفصيل
- **الخطوة 1:** شرح الفكرة الأولى.
- **الخطوة 2:** شرح الفكرة الثانية وتطبيق القوانين.
- **الخطوة 3:** النتيجة النهائية والتفسير العلمي الدقيق.

## 🌟 القوانين والمفاهيم الذهبية للحفظ
- أهم قانون أو تعريف يجب كتابته في ورقة المفاهيم أو حفظه صم.

## ⚠️ فخ الامتحان المشهور
أكثر خطأ يقع فيه طلاب الثانوية العامة في هذا السؤال وكيفية تجنبه.

## 🎯 سؤال تدريبي سريع لاختبار فهمك
سؤال اختر مع تحديد الإجابة الصحيحة وشرح سبب صحتها.

## 💖 كلمة تشجيعية من بيستي
كلمة دافئة محفزة للطالب.
`;
    parts.push({ text: promptText });

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      const stream = await ai.models.generateContentStream({
        model: 'gemini-3.1-flash-lite',
        contents: { parts },
        config: {
          systemInstruction: BESTIE_SYSTEM_INSTRUCTION,
          temperature: 0.6,
        },
      });

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: any) {
      console.warn('Explain stream fallback to gemini-3.8-flash:', err?.message);
      const fallbackStream = await ai.models.generateContentStream({
        model: 'gemini-3.8-flash',
        contents: { parts },
        config: {
          systemInstruction: BESTIE_SYSTEM_INSTRUCTION,
          temperature: 0.6,
        },
      });

      for await (const chunk of fallbackStream) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error: any) {
    console.error('Study explain stream error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error?.message || 'Failed to explain' });
    }
    res.write(`data: ${JSON.stringify({ error: error?.message || 'Error occurred' })}\n\n`);
    res.end();
  }
});

// Fast Streaming Summarizer endpoint
app.post('/api/summarize/stream', async (req: Request, res: Response) => {
  try {
    const {
      text,
      subject,
      topic,
      formatType = 'bullet_points',
      detailLevel = 'short',
      language = 'ar',
      fileData,
      pdfText,
      pdfMeta,
      audioData,
    } = req.body;

    const ai = getGenAIClient();

    const parts: any[] = [];

    // Attach audio voice recording if provided
    if (audioData?.data && audioData?.mimeType) {
      parts.push({
        inlineData: {
          mimeType: audioData.mimeType.split(';')[0],
          data: audioData.data,
        },
      });
    }

    // Attach high-speed extracted PDF text or fallback to binary file
    if (pdfText) {
      parts.push({
        text: `[نص المستند أو المذكرة المرفقة "${pdfMeta?.name || 'مذكرة'}" (${pdfMeta?.pageCount || 1} صفحة)]:\n${pdfText}\n[نهاية نصوص المستند]`,
      });
    } else if (fileData?.data && fileData?.mimeType) {
      parts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.data,
        },
      });
    }

    const formatDesc = {
      bullet_points: 'نقاط رئيسية جوهرية مركزة (High-Yield Key Bullet Points)',
      mindmap: 'هيكل خريطة ذهنية مقروءة وشاملة (Hierarchical Text Mindmap)',
      formulas_definitions: 'جدول القوانين والمصطلحات والتعريفات الأساسية (Formulas & Definitions)',
      exam_qa: 'أهم أسئلة امتحانات متوقعة مع إجاباتها النموذجية (Exam Q&As)',
    }[formatType as string] || 'نقاط رئيسية جوهرية مركزة';

    const promptText = `
You are "Study Bestie" (ستدي بيستي).
Create a high-yield, crystal-clear lesson summary for an Egyptian high-school student.
Subject: ${subject || 'عام'}
Topic: ${topic || 'ملخص الدرس'}
Summary Format: ${formatDesc}
Detail Level: ${detailLevel === 'detailed' ? 'ملخص شامل وتفصيلي (Comprehensive & Detailed)' : 'ملخص سريع ومكثف (Short, Focused & Concise)'}
Language: ${language === 'en' ? 'English' : 'Warm, clear Egyptian Arabic'}

${audioData ? 'The student recorded an audio voice note in Egyptian Arabic describing what they want summarized. Listen to their audio instruction carefully.' : ''}
${pdfMeta ? `The student uploaded PDF: "${pdfMeta.name}" (${pdfMeta.pageCount} pages). Summarize this document accurately.` : fileData ? `The student uploaded a document or photo: "${fileData.name}". Read all its contents, notes, and diagrams carefully.` : ''}
${text ? `Text to summarize:\n"""\n${text}\n"""` : ''}

Output format: Return formatted markdown with:
# 📑 [عنوان الملخص]
نظرة عامة سريعة في فقرة واحدة تلخص جوهر الموضوع.

## 📌 الأقسام والمحاور الرئيسية
(منسقة حسب النوع المختار: ${formatDesc})
- تفاصيل منظمة مع علامات تمييز واضحة.

## ⚡ أهم التنبيهات والنقاط الذهبية للامتحان
- 2 إلى 3 نصائح جوهرية لا يجب نسيانها.

## 🎯 الخلاصة في جملة واحدة (Cheat-sheet Takeaway)
الجملة التي يجب تذكرها ليلة الامتحان.
`;
    parts.push({ text: promptText });

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      const stream = await ai.models.generateContentStream({
        model: 'gemini-3.1-flash-lite',
        contents: { parts },
        config: {
          systemInstruction: BESTIE_SYSTEM_INSTRUCTION,
          temperature: 0.5,
        },
      });

      for await (const chunk of stream) {
        const textChunk = chunk.text;
        if (textChunk) {
          res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: any) {
      console.warn('Summarize stream fallback to gemini-3.8-flash:', err?.message);
      const fallbackStream = await ai.models.generateContentStream({
        model: 'gemini-3.8-flash',
        contents: { parts },
        config: {
          systemInstruction: BESTIE_SYSTEM_INSTRUCTION,
          temperature: 0.5,
        },
      });

      for await (const chunk of fallbackStream) {
        const textChunk = chunk.text;
        if (textChunk) {
          res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error: any) {
    console.error('Summarize stream error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error?.message || 'Failed to summarize' });
    }
    res.write(`data: ${JSON.stringify({ error: error?.message || 'Error occurred' })}\n\n`);
    res.end();
  }
});

// Step-by-Step Study Mode explanation
app.post('/api/study-explain', async (req: Request, res: Response) => {
  try {
    const { subject, topic, gradeLevel = 'ثانوية عامة (الصف الثالث الثانوي)', studentQuestion, language = 'ar' } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required.' });
    }

    const ai = getGenAIClient();

    const prompt = `
Explain the lesson/topic "${topic}" in the subject "${subject}" for grade "${gradeLevel}".
${studentQuestion ? `Specific student doubt or question: "${studentQuestion}"` : ''}

Output format: Return a clean JSON object with this exact structure:
{
  "title": "Title of topic",
  "subject": "${subject}",
  "egyptianIntro": "A warm, super comforting 2-sentence opening in friendly Egyptian Arabic addressing the student as Bestie",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Short descriptive step title",
      "intuition": "The simple intuitive idea / analogy from daily life (بالمصري وبأبسط شكل)",
      "explanation": "Clear academic explanation with step-by-step logic",
      "proTip": "A golden rule or memory trick (سر لحفظها)"
    }
  ],
  "goldenRules": [
    "Key formula or must-remember definition 1",
    "Key formula or must-remember definition 2"
  ],
  "commonExamPitfall": "The biggest trap students fall into in the Egyptian exam regarding this topic and how to avoid it",
  "quickCheckQuestion": {
    "question": "A quick multiple choice question to test understanding",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Why this option is correct"
  },
  "bestieEncouragement": "A motivating, high-energy closing note"
}
Ensure the language matches: ${language === 'en' ? 'English' : 'Friendly, accessible Egyptian Arabic'}.
`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        systemInstruction: BESTIE_SYSTEM_INSTRUCTION,
        temperature: 0.6,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Study-explain error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to explain lesson' });
  }
});

// Summarizer endpoint
app.post('/api/summarize', async (req: Request, res: Response) => {
  try {
    const { text, subject, topic, formatType = 'bullet_points', language = 'ar' } = req.body;

    if (!text && !topic) {
      return res.status(400).json({ error: 'Please provide lesson text or a topic name.' });
    }

    const ai = getGenAIClient();

    const prompt = `
Create an outstanding, highly structured summary for the student.
Subject: ${subject || 'عام'}
Topic: ${topic || 'ملخص عام'}
Format requested: ${formatType} (options: bullet_points, mindmap, formulas_definitions, exam_qa)
Language: ${language === 'en' ? 'English' : 'Egyptian Arabic'}

Lesson Content / Input:
"""
${text || topic}
"""

Please return a JSON object with:
{
  "title": "Summary title",
  "overview": "Short 2-3 sentence overview of the core idea",
  "formatType": "${formatType}",
  "sections": [
    {
      "heading": "Section heading",
      "items": ["Point 1", "Point 2", "Point 3"]
    }
  ],
  "highlightNotes": ["Crucial tip 1", "Crucial tip 2"],
  "examSummaryPunchline": "The one sentence takeaway to write in the exam cheat-sheet of your mind"
}
`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        systemInstruction: BESTIE_SYSTEM_INSTRUCTION,
        temperature: 0.5,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Summarize error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to summarize' });
  }
});

// Quiz Generator endpoint
app.post('/api/generate-quiz', async (req: Request, res: Response) => {
  try {
    const { subject, topic, difficulty = 'medium', count = 5, language = 'ar', fileData } = req.body;

    if (!topic && !subject && !fileData) {
      return res.status(400).json({ error: 'Subject, topic, or file is required' });
    }

    const ai = getGenAIClient();

    const parts: any[] = [];
    if (fileData?.data && fileData?.mimeType) {
      parts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.data,
        },
      });
    }

    const promptText = `
Generate an Egyptian high school style practice quiz of ${count} multiple-choice questions (MCQs).
Subject: ${subject || 'عام'}
Topic: ${topic || 'المستند المرفق'}
Difficulty: ${difficulty}
Language: ${language === 'en' ? 'English' : 'Egyptian Arabic'}
${fileData ? `The student attached a document or image: "${fileData.name}". Create the questions directly based on the questions, formulas, or concepts in this attached file.` : ''}

For each question:
- Exactly 4 options.
- 1 correct option index (0 to 3).
- Detailed, friendly Bestie explanation explaining why the answer is correct and why other choices are wrong.
- A helpful hint.
`;
    parts.push({ text: promptText });

    const response = await generateWithFallback(ai, {
      preferredModel: 'gemini-3.1-flash-lite',
      contents: parts,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subject: { type: Type.STRING },
            topic: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                  hint: { type: Type.STRING },
                },
                required: ['id', 'question', 'options', 'correctIndex', 'explanation'],
              },
            },
          },
          required: ['title', 'subject', 'questions'],
        },
        systemInstruction: BESTIE_SYSTEM_INSTRUCTION,
        temperature: 0.6,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Quiz error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate quiz' });
  }
});

// AI Mind Map Generator endpoint
app.post('/api/generate-mindmap', async (req: Request, res: Response) => {
  try {
    const {
      topic,
      content,
      subject,
      detailLevel = 'detailed',
      language = 'ar',
      fileData,
      pdfText,
      pdfMeta,
      audioData,
    } = req.body;

    if (!topic && !content && !fileData && !pdfText && !audioData) {
      return res.status(400).json({ error: 'Topic, text content, voice note, or file attachment is required' });
    }

    const ai = getGenAIClient();
    const parts: any[] = [];

    // Attach voice note
    if (audioData?.data && audioData?.mimeType) {
      parts.push({
        inlineData: {
          mimeType: audioData.mimeType.split(';')[0],
          data: audioData.data,
        },
      });
    }

    // Attach PDF extracted text or fallback to binary file
    if (pdfText) {
      parts.push({
        text: `[نص المستند أو المذكرة المرفقة "${pdfMeta?.name || 'مذكرة'}" (${pdfMeta?.pageCount || 1} صفحة)]:\n${pdfText}\n[نهاية نصوص المستند]`,
      });
    } else if (fileData && fileData.data && fileData.mimeType) {
      parts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.data,
        },
      });
    }

    const promptText = `
أنتِ "Study Bestie"، المساعد الدراسي الذكي والرفيقة الأقرب لطلاب وطالبات الثانوية العامة.
المهمة: إنشاء خريطة ذهنية (Mind Map) تعليمية دقيقة وشاملة ومبسطة جداً للحفظ والفهم السريع.

الموضوع: ${topic || 'المحتوى المرفق'}
المادة: ${subject || 'عام'}
المستوى: ${detailLevel === 'detailed' ? 'شاملة ومفصلة (detailed)' : 'بسيطة ومركزة (simple)'}
اللغة: ${language === 'en' ? 'English' : 'عربي واضح فصيح ومبسط لطلاب الثانوية'}
${audioData ? 'ملحوظة هامة: قام الطالب بتسجيل ملاحظة صوتية توضح ما يريده في الخريطة الذهنية. استمع للتسجيل ونفذ ما طلبه بدقة.' : ''}
${pdfMeta ? `ملحوظة هامة: قام الطالب برفع مستند PDF: "${pdfMeta.name}" (${pdfMeta.pageCount} صفحة). استخرج محاور وأفرع الخريطة الذهنية مباشرة من هذا المستند بدقة علمية عالية.` : fileData ? `ملحوظة هامة: قام الطالب برفع ملف/صورة: "${fileData.name}". اقرأ كل التفاصيل، المعادلات، والنقاط الواردة في الملف المرفق واستخرج الخريطة الذهنية منها مباشرة بدقة.` : ''}
${content ? `النص المدخل:\n${content}` : ''}

إرشادات بناء الخريطة:
1. الموضوع المركزي (centralTopic): عنوان واضح ومختصر، مع أيقونة مناسبة (centralIcon) وملخص سريع من سطر واحد (centralSummary).
2. الفروع الرئيسية (branches):
   - إذا كان المستوى بسيط: أنشئ من 3 إلى 4 فروع رئيسية.
   - إذا كان المستوى مفصل: أنشئ من 4 إلى 6 فروع رئيسية تغطي كافة جوانب الدرس وتفاصيله وقوانينه.
3. لكل فرع:
   - id: معرّف فريد
   - title: عنوان الفرع واضح ومميز ومباشر
   - icon: إيموجي تعليمي ذو صلة (مثل 🔬 ⚡ 📐 💡 📝 ⚖️ 🧬 🔑)
   - colorTheme: إحدى القيم التالية: 'pink', 'purple', 'blue', 'emerald', 'amber', 'rose'
   - subtopics: قائمة بالمحاور الفرعية (2-3 محاور بسيطة، أو 3-4 مفصلة):
     * title: عنوان المحور
     * points: نقاط سريعة مركزة ومكتوبة بأسلوب سهل للحفظ (short, easy-to-memorize bullet points).
`;
    parts.push({ text: promptText });

    const response = await generateWithFallback(ai, {
      preferredModel: 'gemini-3.1-flash-lite',
      contents: parts,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            centralTopic: { type: Type.STRING },
            centralIcon: { type: Type.STRING },
            centralSummary: { type: Type.STRING },
            branches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  icon: { type: Type.STRING },
                  colorTheme: { type: Type.STRING },
                  subtopics: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        points: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                      },
                      required: ['title', 'points'],
                    },
                  },
                },
                required: ['id', 'title', 'icon', 'colorTheme', 'subtopics'],
              },
            },
          },
          required: ['centralTopic', 'branches'],
        },
        systemInstruction: BESTIE_SYSTEM_INSTRUCTION,
        temperature: 0.5,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Mind Map error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate mind map' });
  }
});

// Study Planner endpoint
app.post('/api/generate-schedule', async (req: Request, res: Response) => {
  try {
    const { subjectsToStudy, daysLeft = 7, dailyHours = 5, targetGoal, studyTrack = 'علمي علوم', language = 'ar' } = req.body;

    const ai = getGenAIClient();

    const prompt = `
Create an optimal, balanced, motivating study schedule for an Egyptian high school student.
Track: ${studyTrack} (e.g. علمي علوم / علمي رياضة / أدبي)
Subjects to cover: ${Array.isArray(subjectsToStudy) ? subjectsToStudy.join(', ') : subjectsToStudy}
Days left until exam or deadline: ${daysLeft} days
Available daily study hours: ${dailyHours} hours/day
Student goal or note: "${targetGoal || 'تنظيم الوقت ومراجعة الدروس المتأخرة بدون توتر'}"
Language: ${language === 'en' ? 'English' : 'Friendly Egyptian Arabic'}

Generate a structured daily breakdown with:
- Suggested schedule blocks (including Pomodoro sessions: 50 min study + 10 min break, or 25 min + 5 min).
- Priority order for subjects (hardest during morning peak energy).
- Specific revision & practice milestones.
- Bestie tips for mental health, sleep, and avoiding burn-out.
`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            planTitle: { type: Type.STRING },
            bestieIntro: { type: Type.STRING },
            dailySchedule: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayNumber: { type: Type.INTEGER },
                  dayTitle: { type: Type.STRING },
                  focusSubject: { type: Type.STRING },
                  slots: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        time: { type: Type.STRING },
                        activity: { type: Type.STRING },
                        durationMinutes: { type: Type.INTEGER },
                        isBreak: { type: Type.BOOLEAN },
                      },
                      required: ['time', 'activity', 'durationMinutes'],
                    },
                  },
                  dailyGoal: { type: Type.STRING },
                },
                required: ['dayNumber', 'dayTitle', 'focusSubject', 'slots', 'dailyGoal'],
              },
            },
            bestieTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['planTitle', 'bestieIntro', 'dailySchedule', 'bestieTips'],
        },
        systemInstruction: BESTIE_SYSTEM_INSTRUCTION,
        temperature: 0.6,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Schedule error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate schedule' });
  }
});

// Serve frontend in dev or prod
async function setupFrontend() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Development mode with Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌸 Study Bestie server running on port ${PORT} [${isProd ? 'production' : 'development'}]`);
  });
}

setupFrontend().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
