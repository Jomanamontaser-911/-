export interface ParsedFile {
  name: string;
  size: number;
  mimeType: string;
  data: string; // base64 string without data:mime;base64, prefix
  previewUrl?: string; // full data URL for img src
  isPdf: boolean;
  isImage: boolean;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export async function processSelectedFile(file: File): Promise<ParsedFile> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('حجم الملف كبير (أكبر من 15 ميجابايت). يرجى اختيار ملف أصغر لسرعة المعالجة 🌸');
  }

  const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
  const isPdf = mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImage = mimeType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name);

  if (!isPdf && !isImage) {
    throw new Error('نوع الملف غير مدعوم. يرجى اختيار صورة واضحة (JPG/PNG) أو ملف PDF 📄');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      const base64Index = result.indexOf(';base64,');
      if (base64Index === -1) {
        reject(new Error('تعذر قراءة بيانات الملف'));
        return;
      }
      const base64Data = result.substring(base64Index + 8);

      resolve({
        name: file.name,
        size: file.size,
        mimeType: isPdf ? 'application/pdf' : mimeType,
        data: base64Data,
        previewUrl: isImage ? result : undefined,
        isPdf,
        isImage,
      });
    };

    reader.onerror = () => {
      reject(new Error('حدث خطأ أثناء قراءة الملف من الجهاز'));
    };

    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
