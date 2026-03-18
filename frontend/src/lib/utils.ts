import { type ClassValue, clsx } from 'clsx';
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
