import { MindMapData, MindMapBranch } from '../types';

interface ColorThemePalette {
  bg: string;
  headerBg: string;
  border: string;
  line: string;
  text: string;
  subtopicBg: string;
}

const COLOR_PALETTES: Record<string, ColorThemePalette> = {
  pink: {
    bg: '#fff5f7',
    headerBg: '#fce7f3',
    border: '#f472b6',
    line: '#ec4899',
    text: '#831843',
    subtopicBg: '#ffffff',
  },
  purple: {
    bg: '#faf5ff',
    headerBg: '#f3e8ff',
    border: '#c084fc',
    line: '#a855f7',
    text: '#581c87',
    subtopicBg: '#ffffff',
  },
  blue: {
    bg: '#f0f9ff',
    headerBg: '#e0f2fe',
    border: '#60a5fa',
    line: '#3b82f6',
    text: '#0c4a6e',
    subtopicBg: '#ffffff',
  },
  emerald: {
    bg: '#f0fdf4',
    headerBg: '#dcfce7',
    border: '#34d399',
    line: '#10b981',
    text: '#064e3b',
    subtopicBg: '#ffffff',
  },
  amber: {
    bg: '#fffbeb',
    headerBg: '#fef3c7',
    border: '#fbbf24',
    line: '#f59e0b',
    text: '#78350f',
    subtopicBg: '#ffffff',
  },
  rose: {
    bg: '#fff1f2',
    headerBg: '#ffe4e6',
    border: '#fb7185',
    line: '#f43f5e',
    text: '#881337',
    subtopicBg: '#ffffff',
  },
};

function getPalette(theme?: string): ColorThemePalette {
  if (theme && COLOR_PALETTES[theme.toLowerCase()]) {
    return COLOR_PALETTES[theme.toLowerCase()];
  }
  return COLOR_PALETTES.pink;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

export async function renderMindMapToCanvas(
  data: MindMapData,
  kittenImgElement?: HTMLImageElement | null
): Promise<string> {
  const branches = data.branches || [];
  const half = Math.ceil(branches.length / 2);
  const rightBranches = branches.slice(0, half);
  const leftBranches = branches.slice(half);

  // Dynamic canvas sizing
  const maxPerSide = Math.max(rightBranches.length, leftBranches.length, 2);
  const canvasWidth = 2200;
  // Estimate height based on number of subtopics
  const canvasHeight = Math.max(1300, 260 + maxPerSide * 280);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is not available');

  // Background - pristine soft white / cream
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Subtle pastel grid pattern
  ctx.fillStyle = '#fce7f325';
  for (let x = 30; x < canvasWidth; x += 40) {
    for (let y = 30; y < canvasHeight; y += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Outer decorative pastel border
  ctx.strokeStyle = '#fbcfe8';
  ctx.lineWidth = 3;
  roundRect(ctx, 24, 24, canvasWidth - 48, canvasHeight - 48, 28);
  ctx.stroke();

  // Top header banner
  ctx.fillStyle = '#fff5f7';
  roundRect(ctx, 40, 40, canvasWidth - 80, 100, 20);
  ctx.fill();
  ctx.strokeStyle = '#f472b6';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 40, 40, canvasWidth - 80, 100, 20);
  ctx.stroke();

  // Title in header
  ctx.font = 'bold 36px system-ui, -apple-system, Cairo, Tahoma, sans-serif';
  ctx.fillStyle = '#9d174d';
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillText(`خريطة ذهنية: ${data.centralTopic}`, canvasWidth - 80, 95);

  // Subtitle / Bestie branding
  ctx.font = '20px system-ui, -apple-system, Cairo, Tahoma, sans-serif';
  ctx.fillStyle = '#db2777';
  ctx.textAlign = 'left';
  ctx.direction = 'ltr';
  ctx.fillText('Study Bestie 🐱💗 | ملخص بصري منظم للحفظ السريع', 80, 95);

  // Center node coordinates
  const centerX = canvasWidth / 2;
  const centerY = (canvasHeight + 140) / 2;
  const centerNodeW = 380;
  const centerNodeH = 140;

  // Calculate layout positions for branches
  const colWidth = 420;
  const rightColX = canvasWidth - 60 - colWidth;
  const leftColX = 60;

  interface LayoutNode {
    branch: MindMapBranch;
    x: number;
    y: number;
    w: number;
    h: number;
    palette: ColorThemePalette;
    side: 'right' | 'left';
  }

  const layoutBranches: LayoutNode[] = [];

  const layoutSide = (list: MindMapBranch[], side: 'right' | 'left', colX: number) => {
    if (list.length === 0) return;
    const availableH = canvasHeight - 220;
    const stepY = availableH / list.length;
    list.forEach((br, i) => {
      // Estimate card height based on subtopics and points
      let linesCount = 0;
      br.subtopics.forEach((sub) => {
        linesCount += 1.5; // sub title
        sub.points.forEach((pt) => {
          linesCount += Math.ceil(pt.length / 32) + 0.3;
        });
      });
      const cardH = Math.min(270, Math.max(160, 60 + linesCount * 22));
      const cardY = 170 + i * stepY + (stepY - cardH) / 2;

      layoutBranches.push({
        branch: br,
        x: colX,
        y: cardY,
        w: colWidth,
        h: cardH,
        palette: getPalette(br.colorTheme),
        side,
      });
    });
  };

  layoutSide(rightBranches, 'right', rightColX);
  layoutSide(leftBranches, 'left', leftColX);

  // 1. Draw connecting bezier curves first so nodes sit on top
  layoutBranches.forEach((node) => {
    ctx.beginPath();
    ctx.strokeStyle = node.palette.line;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    const startX = node.side === 'right' ? centerX + centerNodeW / 2 : centerX - centerNodeW / 2;
    const startY = centerY;
    const endX = node.side === 'right' ? node.x : node.x + node.w;
    const endY = node.y + 40;

    const midX = (startX + endX) / 2;
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(midX, startY, midX, endY, endX, endY);
    ctx.stroke();

    // Small connector dot at junction
    ctx.fillStyle = node.palette.line;
    ctx.beginPath();
    ctx.arc(endX, endY, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // 2. Draw Branch Cards
  layoutBranches.forEach((node) => {
    const { branch, x, y, w, h, palette } = node;

    // Outer card shadow & box
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.06)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = palette.bg;
    roundRect(ctx, x, y, w, h, 18);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 18);
    ctx.stroke();

    // Branch Header bar
    const headerH = 46;
    ctx.fillStyle = palette.headerBg;
    roundRect(ctx, x, y, w, headerH, 18);
    ctx.fill();
    ctx.fillRect(x, y + 20, w, headerH - 20); // square off bottom corners of header

    // Branch Icon + Title
    ctx.font = 'bold 22px system-ui, -apple-system, Cairo, Tahoma, sans-serif';
    ctx.fillStyle = palette.text;
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    const headerTitle = `${branch.icon || '📌'} ${branch.title}`;
    ctx.fillText(headerTitle, x + w - 16, y + 31);

    // Subtopics and points
    let currentY = y + headerH + 18;
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';

    branch.subtopics.forEach((sub, subIdx) => {
      if (currentY > y + h - 25) return;

      // Subtopic title
      ctx.font = 'bold 16px system-ui, -apple-system, Cairo, Tahoma, sans-serif';
      ctx.fillStyle = palette.text;
      ctx.fillText(`• ${sub.title}`, x + w - 16, currentY);
      currentY += 22;

      // Points
      ctx.font = '14px system-ui, -apple-system, Cairo, Tahoma, sans-serif';
      ctx.fillStyle = '#374151';

      sub.points.forEach((pt) => {
        if (currentY > y + h - 18) return;
        const wrapped = wrapText(ctx, pt, w - 46);
        wrapped.forEach((line) => {
          if (currentY > y + h - 14) return;
          ctx.fillText(`- ${line}`, x + w - 28, currentY);
          currentY += 19;
        });
      });

      currentY += 6;
    });
  });

  // 3. Draw Central Node
  ctx.save();
  ctx.shadowColor = 'rgba(236, 72, 153, 0.25)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;

  // Central node gradient fill
  const grad = ctx.createLinearGradient(
    centerX - centerNodeW / 2,
    centerY - centerNodeH / 2,
    centerX + centerNodeW / 2,
    centerY + centerNodeH / 2
  );
  grad.addColorStop(0, '#fdf2f8');
  grad.addColorStop(0.5, '#fce7f3');
  grad.addColorStop(1, '#fbcfe8');

  ctx.fillStyle = grad;
  roundRect(ctx, centerX - centerNodeW / 2, centerY - centerNodeH / 2, centerNodeW, centerNodeH, 26);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#db2777';
  ctx.lineWidth = 3.5;
  roundRect(ctx, centerX - centerNodeW / 2, centerY - centerNodeH / 2, centerNodeW, centerNodeH, 26);
  ctx.stroke();

  // Central icon / kitten
  const icon = data.centralIcon || '🧠';
  ctx.font = '38px system-ui';
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.fillText(icon, centerX, centerY - centerNodeH / 2 + 45);

  // Central Topic Title
  ctx.font = 'bold 24px system-ui, -apple-system, Cairo, Tahoma, sans-serif';
  ctx.fillStyle = '#831843';
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  const wrappedCentral = wrapText(ctx, data.centralTopic, centerNodeW - 40);
  let cY = centerY - centerNodeH / 2 + 80;
  wrappedCentral.slice(0, 2).forEach((line) => {
    ctx.fillText(line, centerX, cY);
    cY += 26;
  });

  // Central Summary if space permits
  if (data.centralSummary && cY < centerY + centerNodeH / 2 - 8) {
    ctx.font = '13px system-ui, -apple-system, Cairo, Tahoma, sans-serif';
    ctx.fillStyle = '#9d174d';
    ctx.fillText(data.centralSummary.slice(0, 45), centerX, cY);
  }

  // Draw cute Kitten Mascot in bottom corner if provided
  if (kittenImgElement) {
    try {
      const imgSize = 80;
      ctx.drawImage(kittenImgElement, canvasWidth - 120, canvasHeight - 120, imgSize, imgSize);
    } catch {
      // ignore
    }
  }

  // Footer text
  ctx.font = 'bold 15px system-ui, -apple-system, Cairo, Tahoma, sans-serif';
  ctx.fillStyle = '#be185d';
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillText(
    '✨ تم الإنشاء بواسطة Study Bestie | رفيقة المذاكرة الذكية لطلاب الثانوية العامة 🌸',
    centerX,
    canvasHeight - 45
  );

  return canvas.toDataURL('image/png');
}
