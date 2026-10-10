import { ExtractedPdfDoc } from '../types';

export type PdfStage = 'uploading' | 'reading' | 'preparing';

export interface PdfProgressEvent {
  stage: PdfStage;
  stageLabel: string;
  percent: number;
  details?: string;
}

// In-memory session cache to prevent reprocessing same PDF
const PDF_SESSION_CACHE = new Map<string, ExtractedPdfDoc>();

const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB limit
const MAX_PROCESS_PAGES = 30; // Limit per single extraction for responsiveness

let pdfjsWorkerInitialized = false;

async function initPdfWorker() {
  if (pdfjsWorkerInitialized) return;
  try {
    const pdfjs = await import('pdfjs-dist');
    // Set standard CDN or bundled worker
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    pdfjsWorkerInitialized = true;
  } catch (err) {
    console.warn('PDF worker initialization notice:', err);
  }
}

export function getCachedPdf(file: File): ExtractedPdfDoc | null {
  const cacheKey = `${file.name}_${file.size}_${file.lastModified}`;
  return PDF_SESSION_CACHE.get(cacheKey) || null;
}

export async function processPdfWithStages(
  file: File,
  onProgress?: (event: PdfProgressEvent) => void
): Promise<ExtractedPdfDoc> {
  const cacheKey = `${file.name}_${file.size}_${file.lastModified}`;
  const cached = PDF_SESSION_CACHE.get(cacheKey);
  if (cached) {
    onProgress?.({
      stage: 'preparing',
      stageLabel: 'جاري تجهيز الإجابة من الذاكرة المؤقتة... ⚡',
      percent: 100,
      details: `${cached.pageCount} صفحة محفوظة`,
    });
    return cached;
  }

  // 1. Validation
  if (file.size > MAX_PDF_SIZE) {
    throw new Error('حجم ملف PDF يتجاوز الحد المسموح (20 ميجابايت). يرجى اختيار ملف أصغر لسرعة المعالجة 🌸');
  }

  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    throw new Error('الملف المختار ليس بصيغة PDF صحيحة.');
  }

  // Stage 1: Uploading / Reading buffer
  onProgress?.({
    stage: 'uploading',
    stageLabel: 'جاري رفع الملف والتحقق منه... 📤',
    percent: 25,
    details: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
  });

  // ArrayBuffer read with timeout
  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    const timeout = setTimeout(() => {
      reader.abort();
      reject(new Error('استغرقت قراءة الملف من جهازك وقتاً طويلاً. يرجى إعادة المحاولة'));
    }, 20000);

    reader.onload = () => {
      clearTimeout(timeout);
      resolve(reader.result as ArrayBuffer);
    };
    reader.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('تعذر قراءة بيانات ملف PDF من جهازك'));
    };
    reader.readAsArrayBuffer(file);
  });

  // Convert to Base64 for vision/multimodal fallback
  const base64Data = await new Promise<string>((resolve) => {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    resolve(btoa(binary));
  });

  // Stage 2: Reading content
  onProgress?.({
    stage: 'reading',
    stageLabel: 'جاري قراءة المحتوى واستخراج النصوص والمعادلات... 📖',
    percent: 50,
  });

  await initPdfWorker();

  let extractedText = '';
  let pageCount = 0;
  let isScanned = false;

  try {
    const pdfjs = await import('pdfjs-dist');
    const loadingTask = pdfjs.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + pdfjs.version + '/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + pdfjs.version + '/standard_fonts/',
    });

    const pdf = await loadingTask.promise;
    pageCount = pdf.numPages;

    const pagesToExtract = Math.min(pageCount, MAX_PROCESS_PAGES);
    const textPieces: string[] = [];

    for (let i = 1; i <= pagesToExtract; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean);

      const pageText = pageStrings.join(' ').trim();
      if (pageText) {
        textPieces.push(`\n--- [صفحة ${i}] ---\n${pageText}`);
      }

      const currentPercent = 50 + Math.round((i / pagesToExtract) * 35);
      onProgress?.({
        stage: 'reading',
        stageLabel: `جاري قراءة الصفحة ${i} من ${pagesToExtract}... 🔍`,
        percent: currentPercent,
      });
    }

    extractedText = textPieces.join('\n').trim();

    // Check if scanned (very little text extracted compared to page count)
    const averageCharsPerPage = extractedText.length / Math.max(pagesToExtract, 1);
    if (averageCharsPerPage < 50) {
      isScanned = true;
    }
  } catch (pdfErr) {
    console.warn('PDF.js extraction warning, falling back to Gemini multimodal:', pdfErr);
    // If text extraction failed (e.g. worker error or encrypted PDF), mark as scanned to use Gemini native vision
    isScanned = true;
    pageCount = 1;
    extractedText = '';
  }

  // Stage 3: Preparing response
  onProgress?.({
    stage: 'preparing',
    stageLabel: isScanned
      ? 'تم رصد مستند ممسوح ضوئياً (صور) - جاري التجهيز لنموذج الرؤية والـ OCR الذكي 👁️'
      : `تم استخراج نصوص ${pageCount} صفحة بنجاح! جاري تجهيز الشرح الذكي... ✨`,
    percent: 100,
  });

  const result: ExtractedPdfDoc = {
    name: file.name,
    size: file.size,
    pageCount: pageCount || 1,
    extractedText,
    isScanned,
    base64Data,
    previewSample: extractedText ? extractedText.slice(0, 300) : undefined,
  };

  // Save in cache
  PDF_SESSION_CACHE.set(cacheKey, result);

  return result;
}
