import { type ClassValue, clsx } from 'clsx';
import dayjs from 'dayjs';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * プロジェクト固有のピクセル指定フォントサイズクラス（`text-10px` 等）を
 * 正しくマージできるようカスタマイズした `tailwind-merge` インスタンス。
 */
const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            '10px',
            '11px',
            '12px',
            '13px',
            '14px',
            '15px',
            '16px',
            '18px',
            '20px',
            '24px',
            '28px',
            '32px',
            '40px',
            '48px',
            '56px',
            '64px',
            '128px',
          ],
        },
      ],
    },
  },
});

/**
 * 複数のクラス名を結合し、Tailwind CSS のクラス競合を自動解決する。
 *
 * @param inputs - クラス名、配列、オブジェクト等（{@link ClassValue} 形式）
 * @returns マージ済みのクラス名文字列
 *
 * @example
 * ```ts
 * cn('px-4 py-2', isActive && 'bg-blue-500', 'bg-red-500');
 * // => 'px-4 py-2 bg-red-500'（後勝ちでマージ）
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs));
}

/**
 * 開始時刻と所要時間から終了時刻の文字列を算出する。
 *
 * @param startTimeStr - 開始時刻（`"HH:mm"` 形式）
 * @param durationH - 所要時間の「時」部分（数値文字列）
 * @param durationM - 所要時間の「分」部分（数値文字列）
 * @returns 終了時刻の文字列（`"HH:mm"` 形式）。所要時間が 0 または開始時刻が不正な場合は `null`
 *
 * @example
 * ```ts
 * calculateEndTimeStr('09:00', '1', '30');
 * // => '10:30'
 *
 * calculateEndTimeStr('09:00', '0', '0');
 * // => null
 * ```
 */
export const calculateEndTimeStr = (startTimeStr: string, durationH: string, durationM: string): string | null => {
  const h = Number.parseInt(durationH) || 0;
  const m = Number.parseInt(durationM) || 0;
  if (h === 0 && m === 0) return null;
  const start = dayjs(`2000-01-01 ${startTimeStr}`);
  if (!start.isValid()) return null;
  return start.add(h, 'hour').add(m, 'minute').format('HH:mm');
};
