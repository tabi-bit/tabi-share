import type { BookingSite, BusinessHours, Candidate, Meal, Member, MemberId, PriceUnit } from './types';

/**
 * 仮デザインの見た目定義をここに集約する。デザイン確定時はここを差し替える。
 */

export const formatDuration = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}分`;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
};

export const formatHours = (hours: BusinessHours): string =>
  hours ? `${hours.open.replace(/^0/, '')}–${hours.close.replace(/^0/, '')}` : '終日';

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** 予定の時間帯が営業時間から外れるか。営業時間不明なら判定しない */
export const isOutsideHours = (hours: BusinessHours, start: Date, end: Date | null): boolean => {
  if (!hours) return false;
  const s = start.getHours() * 60 + start.getMinutes();
  const e = end ? end.getHours() * 60 + end.getMinutes() : s;
  return s < toMinutes(hours.open) || e > toMinutes(hours.close);
};

export const memberLabel = (member: Member | undefined): string => {
  if (!member) return '誰か';
  if (member.isMe) return '自分';
  return member.name ?? 'メンバー';
};

type CategoryStyle = { glyph: string; className: string };

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  ごはん: { glyph: '食', className: 'bg-orange-100 text-orange-900/50' },
  体験: { glyph: '体', className: 'bg-indigo-100 text-indigo-900/50' },
  湯: { glyph: '湯', className: 'bg-sky-100 text-sky-900/50' },
  寺社: { glyph: '社', className: 'bg-rose-100 text-rose-900/50' },
  カフェ: { glyph: '茶', className: 'bg-amber-100 text-amber-900/50' },
  景色: { glyph: '景', className: 'bg-lime-100 text-lime-900/50' },
  宿: { glyph: '宿', className: 'bg-slate-200 text-slate-600' },
};

export const categoryStyle = (category: string): CategoryStyle =>
  CATEGORY_STYLES[category] ?? { glyph: category.slice(0, 1) || '?', className: 'bg-neutral-100 text-neutral-500' };

export const CATEGORIES = Object.keys(CATEGORY_STYLES).filter(c => c !== '宿');

export const SITE_LABELS: Record<BookingSite, string> = {
  rakuten: '楽天',
  jalan: 'じゃらん',
  booking: 'Booking.com',
  official: '公式',
};

export const MEAL_LABELS: Record<Meal, string> = {
  none: '食事なし',
  breakfast: '朝のみ',
  dinner: '夕のみ',
  both: '朝夕',
};

export const formatPrice = (price: number): string => `¥${price.toLocaleString('ja-JP')}`;

export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = { person: '1人', room: '1室' };

export const priceUnitSuffix = (unit: PriceUnit | undefined): string => (unit === 'room' ? '/室' : '/人');

export const likersOf = (c: Candidate): MemberId[] =>
  Object.entries(c.votes)
    .filter(([, v]) => v === 'like')
    .map(([id]) => id);

/** 全員がパスした候補（見送り） */
export const isRejectedByAll = (c: Candidate, members: Member[]): boolean =>
  members.length > 0 && members.every(m => c.votes[m.id] === 'pass');

export const sourceLabel = (c: Candidate, members: Member[]): string => {
  if (c.source.type === 'ai') return c.source.basis ? `AI 提案（${c.source.basis}）` : 'AI 提案';
  const { memberId, note } = c.source;
  const who = memberLabel(members.find(m => m.id === memberId));
  return note ? `${who}が追加「${note}」` : `${who}が追加`;
};

/** 一覧に出す短い出典。ひとことは詳細でだけ見せる */
export const sourceShortLabel = (c: Candidate, members: Member[]): string =>
  c.source.type === 'ai'
    ? 'AI の提案'
    : `${memberLabel(members.find(m => c.source.type === 'member' && m.id === c.source.memberId))}が追加`;

/** ♥ を付けた人の名前を「けん・ゆうこ」の形で */
export const likerNames = (c: Candidate, members: Member[]): string =>
  likersOf(c)
    .map(id => memberLabel(members.find(m => m.id === id)))
    .join('・');

export const formatDeadline = (deadline: string | null): string | null => {
  if (!deadline) return null;
  const d = new Date(deadline);
  const w = '日月火水木金土'[d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${w})`;
};
