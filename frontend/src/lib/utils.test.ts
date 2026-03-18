import { describe, expect, it } from 'vitest';
import { calculateDuration, calculateEndTimeStr, cn } from './utils';

describe('cn', () => {
  it('クラス名を結合する', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('競合するTailwindクラスは後勝ちでマージする', () => {
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });

  it('falsy値は無視する', () => {
    expect(cn('px-4', false, undefined, null)).toBe('px-4');
  });
});

describe('calculateEndTimeStr', () => {
  it('開始時刻に所要時間を加算した終了時刻を返す', () => {
    expect(calculateEndTimeStr('09:00', '1', '30')).toBe('10:30');
  });

  it('分のみの加算', () => {
    expect(calculateEndTimeStr('09:00', '0', '45')).toBe('09:45');
  });

  it('所要時間が0の場合はnullを返す', () => {
    expect(calculateEndTimeStr('09:00', '0', '0')).toBeNull();
  });

  it('不正な開始時刻の場合はnullを返す', () => {
    expect(calculateEndTimeStr('invalid', '1', '0')).toBeNull();
  });
});
