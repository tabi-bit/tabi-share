/** 共有画像に載せる予定 1 行 */
export type ShareImageSchedule = { time: string; title: string };

export type ShareImageInput = {
  title: string;
  period: string | null;
  dayLabel: string | null;
  schedules: ShareImageSchedule[];
  host: string;
};

const WIDTH = 1200;
const HEIGHT = 630;
const FONT = '"Noto Sans JP Variable", "Noto Sans JP", "Hiragino Sans", sans-serif';
const MAX_SCHEDULES = 5;

/** 幅に収まるよう末尾を「…」で切る */
const fitText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 0 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
};

/**
 * 仮: 共有用の画像 (1200x630、OGP と同じ比率) を canvas で作る。
 * 旅程名・期間・その日の予定を載せ、チャットに貼ったときに中身が分かるようにする
 */
export const buildShareImage = async (input: ShareImageInput): Promise<File> => {
  // canvas は読み込み済みのフォントしか使えないため、先に読み込ませる
  await Promise.allSettled([document.fonts.load(`700 64px ${FONT}`), document.fonts.load(`400 32px ${FONT}`)]);

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas を使えません');

  // 背景: アプリのヘッダーと同じ teal-50 から白へ
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, '#f0fdfa');
  bg.addColorStop(1, '#ffffff');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 左の帯
  ctx.fillStyle = '#14b8a6';
  ctx.fillRect(0, 0, 16, HEIGHT);

  const left = 80;
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = '#0f766e';
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText('たびしぇあ', left, 84);

  ctx.fillStyle = '#111827';
  ctx.font = `700 64px ${FONT}`;
  ctx.fillText(fitText(ctx, input.title, WIDTH - left * 2), left, 178);

  if (input.period) {
    ctx.fillStyle = '#64748b';
    ctx.font = `400 32px ${FONT}`;
    ctx.fillText(input.period, left, 232);
  }

  // 予定のカード
  const cardTop = 272;
  const cardHeight = 270;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ccfbf1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(left, cardTop, WIDTH - left * 2, cardHeight, 24);
  ctx.fill();
  ctx.stroke();

  const schedules = input.schedules.slice(0, MAX_SCHEDULES);
  const rowLeft = left + 40;
  let y = cardTop + 58;
  if (input.dayLabel) {
    ctx.fillStyle = '#0f766e';
    ctx.font = `700 26px ${FONT}`;
    ctx.fillText(input.dayLabel, rowLeft, y);
    y += 46;
  }
  if (schedules.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = `400 30px ${FONT}`;
    ctx.fillText('まだ予定は入っていません', rowLeft, y);
  }
  const rest = input.schedules.length - schedules.length;
  for (const [i, s] of schedules.entries()) {
    const isLastRow = i === schedules.length - 1 && rest > 0;
    ctx.fillStyle = '#0d9488';
    ctx.font = `700 28px ${FONT}`;
    ctx.fillText(s.time, rowLeft, y);
    ctx.fillStyle = '#1f2937';
    ctx.font = `400 30px ${FONT}`;
    const label = isLastRow ? `${s.title}　ほか ${rest} 件` : s.title;
    ctx.fillText(fitText(ctx, label, WIDTH - rowLeft - 140 - left - 40), rowLeft + 120, y);
    y += 42;
    if (y > cardTop + cardHeight - 20) break;
  }

  ctx.fillStyle = '#64748b';
  ctx.font = `400 26px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(`${input.host} で旅程を見る`, WIDTH - left, HEIGHT - 42);
  ctx.textAlign = 'left';

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('画像を作れませんでした');
  return new File([blob], 'tabishare-trip.png', { type: 'image/png' });
};
