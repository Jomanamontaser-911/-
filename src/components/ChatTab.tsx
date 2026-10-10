import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ChatSession, Language, VoiceAttachment, ExtractedPdfDoc } from '../types';
import { translations } from '../constants/translations';
import { SUBJECTS } from '../constants/subjects';
import { ThinkingIndicator } from './ThinkingIndicator';
import { ParsedFile, processSelectedFile, formatFileSize } from '../utils/fileHelper';
import { processPdfWithStages, PdfProgressEvent } from '../utils/pdfProcessor';
import { AudioRecordingResult } from '../utils/audioRecorder';
import { VoiceRecorderBar } from './VoiceRecorderBar';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { PdfProcessingBanner } from './PdfProcessingBanner';
import {
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  Plus,
  MessageCircle,
  Lightbulb,
  Camera,
  Image as ImageIcon,
  FileText,
  X,
  AlertCircle,
  Mic,
} from 'lucide-react';

interface ChatTabProps {
  language: Language;
  selectedSubject: string;
}

export const ChatTab: React.FC<ChatTabProps> = ({
  language,
  selectedSubject,
}) => {
  const t = translations[language];
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef<boolean>(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Suggested prompt ideas per subject
  const getSubjectPrompts = () => {
    const sub = SUBJECTS.find((s) => s.id === selectedSubject);
    if (!sub) {
      return language === 'ar'
        ? [
            'إزاي أنظم وقتي في زنقة امتحانات الثانوية؟',
            'اشرحلي إزاي أفرق بين كان التامة وكان الناقصة؟',
            'طريقة سهلة وبسيطة لحفظ قوانين الفيزياء',
            'نصيحة للتغلب على التوتر والخوف من الامتحانات 💖',
          ]
        : [
            'How can I organize my study schedule before exams?',
            'Explain the difference between Present Perfect and Past Simple',
            'Give me an easy mnemonic to memorize physics formulas',
            'How can I calm down exam stress and stay motivated? 💖',
          ];
    }

    if (language === 'ar') {
      return [
        `اشرحلي فكرة درس ${sub.popularTopics[0]?.ar || 'المادة'} في 3 خطوات`,
        `إيه أهم فخ بيجي في امتحانات ثانوية عامة على ${sub.popularTopics[1]?.ar || 'المادة'}؟`,
        `سؤال امتحاني ذكي ومهم في ${sub.popularTopics[2]?.ar || 'المادة'}`,
        `لخصلي قوانين وأسرار ${sub.popularTopics[3]?.ar || 'المادة'} بالمصري المبسط`,
      ];
    } else {
      return [
        `Explain the core concept of ${sub.popularTopics[0]?.en || 'the topic'} in 3 steps`,
        `What is the most common exam trap in ${sub.popularTopics[1]?.en || 'this subject'}?`,
        `Give me a high-yield practice question in ${sub.popularTopics[2]?.en || 'this subject'}`,
        `Summarize the key rules of ${sub.popularTopics[3]?.en || 'this topic'} clearly`,
      ];
    }
  };

  // State
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('study_bestie_chat_sessions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    const initialSession: ChatSession = {
      id: 'default',
      title: language === 'ar' ? 'محادثة ترحيبية 🌸' : 'Welcome Chat 🌸',
      subjectId: 'all',
      createdAt: Date.now(),
      messages: [
        {
          id: 'm1',
          role: 'assistant',
          content:
            language === 'ar'
              ? 'أهلاً يا بطلة المذاكرة! 🌸 أنا ستدي بيستي (Study Bestie) صاحبتك اللي هتسهل عليكي كل مواد الثانوية العامة.\n\nتقدري تسأليني عن أي درس، أو تصوري مسألة بالكاميرا 📸، أو ترفعي ملف PDF للمذكرة 📄 وهشرحهالك خطوة بخطوة بالعامية المصرية المبسطة! يلا نبدأ؟ ✨'
              : 'Welcome, dear student! 🌸 I am Study Bestie, your friendly AI companion for high school studies.\n\nAsk me anything, snap a photo of any tough problem 📸, or upload a lesson PDF 📄 and I will explain it step by step! Let’s ace this together! ✨',
          timestamp: Date.now(),
        },
      ],
    };
    return [initialSession];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>('default');
  const [inputMessage, setInputMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<ParsedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Voice recording & Fast PDF states
  const [isVoiceBarOpen, setIsVoiceBarOpen] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<PdfProgressEvent | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [extractedPdf, setExtractedPdf] = useState<ExtractedPdfDoc | null>(null);
  const [rawPdfFile, setRawPdfFile] = useState<File | null>(null);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('study_bestie_chat_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isLoading]);

  // Clean speech synthesis when unmounting
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setPdfError(null);
    setPdfProgress(null);

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      setRawPdfFile(file);
      try {
        const doc = await processPdfWithStages(file, (ev) => {
          setPdfProgress(ev);
        });
        setExtractedPdf(doc);
        setAttachedFile({
          name: doc.name,
          size: doc.size,
          mimeType: 'application/pdf',
          data: doc.base64Data || '',
          isPdf: true,
          isImage: false,
        });
      } catch (err: any) {
        setPdfError(err.message || 'حدث خطأ في قراءة ملف PDF');
      } finally {
        e.target.value = '';
      }
      return;
    }

    try {
      const parsed = await processSelectedFile(file);
      setAttachedFile(parsed);
      setExtractedPdf(null);
      setRawPdfFile(null);
    } catch (err: any) {
      setFileError(err.message || 'حدث خطأ في قراءة الملف');
    } finally {
      e.target.value = '';
    }
  };

  const handleRetryPdf = async () => {
    if (!rawPdfFile) return;
    setPdfError(null);
    try {
      const doc = await processPdfWithStages(rawPdfFile, (ev) => {
        setPdfProgress(ev);
      });
      setExtractedPdf(doc);
      setAttachedFile({
        name: doc.name,
        size: doc.size,
        mimeType: 'application/pdf',
        data: doc.base64Data || '',
        isPdf: true,
        isImage: false,
      });
    } catch (err: any) {
      setPdfError(err.message || 'فشلت إعادة قراءة الملف');
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    setExtractedPdf(null);
    setRawPdfFile(null);
    setPdfProgress(null);
    setPdfError(null);
    setFileError(null);
  };

  const handleSendVoice = async (voiceResult: AudioRecordingResult, transcription?: string) => {
    if (isLoading || isSendingRef.current) return;
    isSendingRef.current = true;

    const currentAttachment = attachedFile;
    const currentPdf = extractedPdf;

    const userMessageId = `u_${Date.now()}`;
    const messageContent =
      transcription ||
      (currentAttachment
        ? `سؤال صوتي حول ملف: ${currentAttachment.name} 🎙️`
        : 'رسالة صوتية 🎙️');

    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: messageContent,
      timestamp: Date.now(),
      subject: selectedSubject,
      attachment: currentAttachment
        ? {
            name: currentAttachment.name,
            mimeType: currentAttachment.mimeType,
            previewUrl: currentAttachment.previewUrl,
            isPdf: currentAttachment.isPdf,
            pageCount: currentPdf?.pageCount,
            isScanned: currentPdf?.isScanned,
          }
        : undefined,
      voice: {
        audioUrl: voiceResult.audioUrl,
        duration: voiceResult.duration,
        mimeType: voiceResult.mimeType,
        data: voiceResult.base64,
        transcription,
      },
    };

    const updatedMessagesWithUser = [...activeSession.messages, userMessage];
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? { ...s, messages: updatedMessagesWithUser }
          : s
      )
    );

    setIsLoading(true);
    setAttachedFile(null);
    setExtractedPdf(null);
    setPdfProgress(null);

    const assistantMessageId = `a_${Date.now()}`;

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessagesWithUser.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          subject: selectedSubject,
          language,
          audioData: {
            data: voiceResult.base64,
            mimeType: voiceResult.mimeType,
          },
          pdfText: currentPdf && !currentPdf.isScanned ? currentPdf.extractedText : undefined,
          pdfMeta: currentPdf
            ? { name: currentPdf.name, pageCount: currentPdf.pageCount, isScanned: currentPdf.isScanned }
            : undefined,
          fileData: currentAttachment && (!currentPdf || currentPdf.isScanned)
            ? {
                name: currentAttachment.name,
                mimeType: currentAttachment.mimeType,
                data: currentAttachment.data,
              }
            : undefined,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Streaming failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let isFirstChunk = true;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawData = line.slice(6).trim();
            if (rawData === '[DONE]') break;

            try {
              const parsed = JSON.parse(rawData);
              if (parsed.text) {
                accumulatedText += parsed.text;

                if (isFirstChunk) {
                  isFirstChunk = false;
                  setSessions((prev) =>
                    prev.map((s) =>
                      s.id === activeSession.id
                        ? {
                            ...s,
                            messages: [
                              ...updatedMessagesWithUser,
                              {
                                id: assistantMessageId,
                                role: 'assistant',
                                content: accumulatedText,
                                timestamp: Date.now(),
                                subject: selectedSubject,
                              },
                            ],
                          }
                        : s
                    )
                  );
                } else {
                  setSessions((prev) =>
                    prev.map((s) =>
                      s.id === activeSession.id
                        ? {
                            ...s,
                            messages: s.messages.map((m) =>
                              m.id === assistantMessageId
                                ? { ...m, content: accumulatedText }
                                : m
                            ),
                          }
                        : s
                    )
                  );
                }
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Voice chat stream error:', err);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? {
                ...s,
                messages: [
                  ...updatedMessagesWithUser,
                  {
                    id: assistantMessageId,
                    role: 'assistant',
                    content: 'معلش يا بيستي، حصل تعثر في الرد على التسجيل الصوتي، جربي تبعتي تاني 🌸',
                    timestamp: Date.now(),
                    subject: selectedSubject,
                  },
                ],
              }
            : s
        )
      );
    } finally {
      setIsLoading(false);
      isSendingRef.current = false;
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if ((!text && !attachedFile) || isLoading || isSendingRef.current) return;

    isSendingRef.current = true;
    const currentAttachment = attachedFile;

    const userMessageId = `u_${Date.now()}`;
    const messageContent =
      text ||
      (currentAttachment?.isPdf
        ? language === 'ar'
          ? `اشرحلي ولخصلي المحتوى الموجود في ملف: ${currentAttachment.name}`
          : `Explain and summarize the content of: ${currentAttachment.name}`
        : language === 'ar'
        ? 'اشرحلي وحل السؤال الموضح في الصورة خطوة بخطوة 🌸'
        : 'Please solve and explain the question shown in the photo step by step 🌸');

    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: messageContent,
      timestamp: Date.now(),
      subject: selectedSubject,
      attachment: currentAttachment
        ? {
            name: currentAttachment.name,
            mimeType: currentAttachment.mimeType,
            previewUrl: currentAttachment.previewUrl,
            isPdf: currentAttachment.isPdf,
          }
        : undefined,
    };

    // Show user's message immediately without delay
    const updatedMessagesWithUser = [...activeSession.messages, userMessage];

    // Update session title if first user message
    let sessionTitle = activeSession.title;
    if (activeSession.messages.length <= 1) {
      sessionTitle = messageContent.slice(0, 26) + (messageContent.length > 26 ? '...' : '');
    }

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? { ...s, title: sessionTitle, messages: updatedMessagesWithUser }
          : s
      )
    );

    setInputMessage('');
    setAttachedFile(null);
    setFileError(null);
    setIsLoading(true);

    const assistantMessageId = `a_${Date.now()}`;

    try {
      // Fast Streaming with lightweight model
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessagesWithUser.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          subject: selectedSubject,
          language,
          pdfText: extractedPdf && !extractedPdf.isScanned ? extractedPdf.extractedText : undefined,
          pdfMeta: extractedPdf
            ? { name: extractedPdf.name, pageCount: extractedPdf.pageCount, isScanned: extractedPdf.isScanned }
            : undefined,
          fileData: currentAttachment && (!extractedPdf || extractedPdf.isScanned)
            ? {
                name: currentAttachment.name,
                mimeType: currentAttachment.mimeType,
                data: currentAttachment.data,
              }
            : undefined,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Streaming failed, fallback to standard');
      }

      // Stream chunks as they arrive
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let isFirstChunk = true;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawData = line.slice(6).trim();
            if (rawData === '[DONE]') break;

            try {
              const parsed = JSON.parse(rawData);
              if (parsed.text) {
                accumulatedText += parsed.text;

                if (isFirstChunk) {
                  // Hide thinking indicator as soon as first token arrives
                  setIsLoading(false);
                  isFirstChunk = false;
                }

                // Update assistant message incrementally
                setSessions((prev) =>
                  prev.map((s) => {
                    if (s.id !== activeSession.id) return s;
                    const existingMsgIndex = s.messages.findIndex(
                      (m) => m.id === assistantMessageId
                    );
                    if (existingMsgIndex === -1) {
                      return {
                        ...s,
                        messages: [
                          ...s.messages,
                          {
                            id: assistantMessageId,
                            role: 'assistant',
                            content: accumulatedText,
                            timestamp: Date.now(),
                            subject: selectedSubject,
                          },
                        ],
                      };
                    } else {
                      const newMsgs = [...s.messages];
                      newMsgs[existingMsgIndex] = {
                        ...newMsgs[existingMsgIndex],
                        content: accumulatedText,
                      };
                      return { ...s, messages: newMsgs };
                    }
                  })
                );
              }
            } catch {
              // Ignore partial JSON split
            }
          }
        }
      }

      // If stream was empty or didn't append message, fallback to standard fetch
      if (!accumulatedText.trim()) {
        throw new Error('Empty stream output');
      }
    } catch (err: any) {
      console.warn('Stream fallback initiated:', err?.message);
      // Fallback to standard chat endpoint if stream was interrupted
      try {
        const fallbackRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessagesWithUser.slice(-6).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            subject: selectedSubject,
            language,
            fileData: currentAttachment
              ? {
                  name: currentAttachment.name,
                  mimeType: currentAttachment.mimeType,
                  data: currentAttachment.data,
                }
              : undefined,
          }),
        });
        const data = await fallbackRes.json();
        const fallbackMessage: ChatMessage = {
          id: assistantMessageId,
          role: 'assistant',
          content: data.reply || (language === 'ar' ? 'معلش يا بطلة، حصل تعثر بسيط، اسأليني تاني وهجاوبك فوراً!' : 'A brief hiccup occurred, please ask again!'),
          timestamp: Date.now(),
          subject: selectedSubject,
        };

        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== activeSession.id) return s;
            const filtered = s.messages.filter((m) => m.id !== assistantMessageId);
            return { ...s, messages: [...filtered, fallbackMessage] };
          })
        );
      } catch (fallbackErr: any) {
        console.error('Fatal chat error:', fallbackErr);
      }
    } finally {
      setIsLoading(false);
      isSendingRef.current = false;
    }
  };

  const handleCreateNewChat = () => {
    const newSession: ChatSession = {
      id: `sess_${Date.now()}`,
      title: language === 'ar' ? 'محادثة جديدة ✨' : 'New Chat ✨',
      subjectId: selectedSubject,
      createdAt: Date.now(),
      messages: [
        {
          id: `m_${Date.now()}`,
          role: 'assistant',
          content:
            language === 'ar'
              ? 'محادثة جديدة بدأناها مع بعض! 🌸 اسأليني أو صوري أي سؤال واقف معاكي.'
              : 'New session started! 🌸 Ask a question or snap a photo of any tough problem.',
          timestamp: Date.now(),
        },
      ],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleClearCurrentChat = () => {
    if (window.confirm(language === 'ar' ? 'هل تودين مسح رسائل هذه المحادثة؟' : 'Clear current chat history?')) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? {
                ...s,
                messages: [
                  {
                    id: `m_${Date.now()}`,
                    role: 'assistant',
                    content:
                      language === 'ar'
                        ? 'مسحنا المحادثة وجهزنا صفحة بيضاء جديدة للمذاكرة! اسأليني في أي وقت 🌸'
                        : 'Cleared! A fresh clean slate for studying. Ask away! 🌸',
                    timestamp: Date.now(),
                  },
                ],
              }
            : s
        )
      );
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingMessageId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language === 'ar' ? 'ar-EG' : 'en-US';
    utterance.rate = 0.95;

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(id);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)] sm:h-[calc(100vh-160px)] pb-20 sm:pb-4">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={pdfInputRef}
        accept="application/pdf,.pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Session & Prompt Bar */}
      <div className="bg-white/85 backdrop-blur-xs rounded-2xl p-2.5 sm:p-3 border border-pink-200/80 mb-3 shadow-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={handleCreateNewChat}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-pink-500 text-white hover:bg-pink-600 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.newChat}</span>
          </button>

          {sessions.slice(0, 4).map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all max-w-[130px] truncate cursor-pointer ${
                s.id === activeSessionId
                  ? 'bg-pink-100 text-pink-700 font-bold border border-pink-300'
                  : 'bg-slate-50 text-slate-600 hover:bg-pink-50 border border-slate-200'
              }`}
            >
              <MessageCircle className="w-3 h-3 shrink-0 text-pink-400" />
              <span className="truncate">{s.title}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleClearCurrentChat}
          className="shrink-0 text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
          title={t.clearChat}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div
        dir="rtl"
        className="flex-1 overflow-y-auto rounded-3xl bg-white/75 backdrop-blur-xs border border-pink-100 shadow-xs p-3.5 sm:p-5 space-y-4 text-start"
      >
        {activeSession.messages.map((message) => {
          const isAssistant = message.role === 'assistant';
          const isCopied = copiedId === message.id;
          const isSpeaking = speakingMessageId === message.id;

          return (
            <div
              key={message.id}
              className={`flex items-start gap-2.5 sm:gap-3 transition-opacity duration-300 ${
                isAssistant ? 'justify-start' : 'justify-end'
              }`}
            >
              {isAssistant && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-pink-200 via-rose-100 to-purple-200 border border-pink-300/80 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <span className="text-xs">🌸</span>
                </div>
              )}

              <div
                className={`max-w-[88%] sm:max-w-[78%] rounded-3xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-xs transition-all ${
                  isAssistant
                    ? 'bg-gradient-to-br from-white via-pink-50/30 to-purple-50/20 border border-pink-200/80 text-slate-800 rounded-tr-sm sm:rounded-tr-xs'
                    : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-tl-sm sm:rounded-tl-xs font-medium'
                }`}
              >
                {/* Voice Message player if present */}
                {message.voice && (
                  <VoiceMessagePlayer voice={message.voice} sender={message.role} className="mb-2" />
                )}

                {/* User Attachment preview if present */}
                {message.attachment && (
                  <div className="mb-2 p-2 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/30 text-white">
                    {message.attachment.previewUrl ? (
                      <div className="space-y-1.5">
                        <img
                          src={message.attachment.previewUrl}
                          alt="Attached"
                          className="max-h-44 rounded-xl object-contain bg-black/10 mx-auto"
                        />
                        <div className="flex items-center gap-1.5 text-[11px] opacity-90 truncate">
                          <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{message.attachment.name}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs">
                        <FileText className="w-4 h-4 shrink-0 text-pink-200" />
                        <span className="font-semibold truncate">{message.attachment.name}</span>
                        <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">PDF</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Message Content */}
                <div className="whitespace-pre-wrap font-sans space-y-1.5 leading-relaxed">
                  {message.content}
                </div>

                {/* Assistant actions: Copy and Listen */}
                {isAssistant && message.content && (
                  <div className="mt-2.5 pt-2 border-t border-pink-100/80 flex items-center justify-between text-[11px] text-pink-800/70">
                    <span className="font-semibold text-pink-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-pink-400" />
                      Study Bestie
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSpeak(message.id, message.content)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                          isSpeaking
                            ? 'bg-rose-100 text-rose-700 font-bold animate-pulse'
                            : 'hover:bg-pink-100 text-slate-500 hover:text-pink-700'
                        }`}
                        title={isSpeaking ? t.stopListen : t.listenAnswer}
                      >
                        {isSpeaking ? (
                          <>
                            <VolumeX className="w-3 h-3" />
                            <span>{t.stopListen}</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>{t.listenAnswer}</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleCopy(message.id, message.content)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-pink-100 text-slate-500 hover:text-pink-700 transition-all cursor-pointer"
                        title={t.copy}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">{t.copied}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{t.copy}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Elegant Animated Dots Thinking Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 px-1 py-1">
            <ThinkingIndicator label={language === 'ar' ? 'بيفكر...' : 'Thinking...'} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested quick prompt chips */}
      {activeSession.messages.length <= 2 && !attachedFile && (
        <div className="mt-2.5 px-1">
          <div className="flex items-center gap-1.5 text-xs text-pink-800/80 font-bold mb-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.quickQuestionsTitle}</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {getSubjectPrompts().map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-pink-50/90 text-pink-700 border border-pink-200 hover:bg-pink-100 hover:border-pink-300 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected File Preview Box */}
      {attachedFile && (
        <div className="mt-2.5 bg-pink-50/90 border border-pink-200 rounded-2xl p-2 sm:p-2.5 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {attachedFile.previewUrl ? (
              <img
                src={attachedFile.previewUrl}
                alt="Selected"
                className="w-10 h-10 rounded-xl object-cover border border-pink-200 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center shrink-0 text-purple-700">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 truncate">
                {attachedFile.name}
              </div>
              <div className="text-[11px] text-pink-700 font-medium">
                {attachedFile.isPdf ? 'ملف PDF' : 'صورة مسألة'} • {formatFileSize(attachedFile.size)}
              </div>
            </div>
          </div>

          <button
            onClick={handleRemoveFile}
            className="p-1.5 rounded-full bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors shadow-2xs shrink-0 cursor-pointer"
            title={t.removeFile}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* File error warning */}
      {fileError && (
        <div className="mt-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{fileError}</span>
        </div>
      )}

      {/* PDF Processing Stages Banner */}
      <PdfProcessingBanner
        progress={pdfProgress}
        error={pdfError}
        onRetry={handleRetryPdf}
        fileName={attachedFile?.name}
        className="mt-2"
      />

      {/* Voice Recorder Bar */}
      <VoiceRecorderBar
        isOpen={isVoiceBarOpen}
        onClose={() => setIsVoiceBarOpen(false)}
        onSendVoice={handleSendVoice}
        language={language}
        contextHint={selectedSubject}
        className="mt-2"
      />

      {/* Quick Attachment Action Bar */}
      <div className="mt-2 flex items-center gap-1.5 sm:gap-2 px-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold bg-white border border-pink-200 text-pink-700 hover:bg-pink-50 transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
        >
          <Camera className="w-3.5 h-3.5 text-pink-500" />
          <span>{t.captureQuestion}</span>
        </button>

        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold bg-white border border-pink-200 text-pink-700 hover:bg-pink-50 transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
        >
          <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
          <span>{t.selectImage}</span>
        </button>

        <button
          type="button"
          onClick={() => pdfInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold bg-white border border-pink-200 text-pink-700 hover:bg-pink-50 transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
        >
          <FileText className="w-3.5 h-3.5 text-rose-500" />
          <span>{t.uploadPdf}</span>
        </button>
      </div>

      {/* Chat Input Bar */}
      <div className="mt-2 bg-white rounded-3xl border border-pink-200 shadow-sm p-1.5 sm:p-2 flex items-center gap-2 focus-within:ring-2 focus-within:ring-pink-300 focus-within:border-pink-300 transition-all">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={attachedFile ? (language === 'ar' ? 'اكتبي سؤالك أو سجلي فويس عن هذا الملف...' : 'Type or record voice note about this file...') : t.chatPlaceholder}
          rows={1}
          className="flex-1 resize-none bg-transparent py-2 px-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none max-h-24 leading-relaxed"
        />

        {/* Mic voice note trigger button */}
        <button
          type="button"
          onClick={() => setIsVoiceBarOpen(!isVoiceBarOpen)}
          className={`p-2.5 sm:p-3 rounded-full transition-all cursor-pointer shrink-0 ${
            isVoiceBarOpen
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md animate-pulse'
              : 'bg-pink-100/90 hover:bg-pink-200 text-pink-700 active:scale-95'
          }`}
          title="تسجيل سؤال صوتي لبيستي 🎤"
        >
          <Mic className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleSendMessage()}
          disabled={(!inputMessage.trim() && !attachedFile) || isLoading}
          className={`p-2.5 sm:p-3 rounded-full transition-all cursor-pointer shrink-0 ${
            (inputMessage.trim() || attachedFile) && !isLoading
              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md hover:scale-105 active:scale-95'
              : 'bg-pink-100 text-pink-300 cursor-not-allowed'
          }`}
          title={t.send}
        >
          <Send className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
};
