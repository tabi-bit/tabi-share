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

describe('calculateDuration', () => {
  it('時間と分を含む所要時間を返す', () => {
    expect(calculateDuration('09:00', '10:30')).toEqual({ hours: 1, minutes: 30 });
  });

  it('分のみの場合はhoursがnullになる', () => {
    expect(calculateDuration('09:00', '09:45')).toEqual({ hours: null, minutes: 45 });
  });

  it('ちょうど1時間の場合', () => {
    expect(calculateDuration('09:00', '10:00')).toEqual({ hours: 1, minutes: 0 });
  });

  it('Dateオブジェクトを受け付ける', () => {
    const start = new Date('2025-01-01T09:00:00');
    const end = new Date('2025-01-01T11:15:00');
    expect(calculateDuration(start, end)).toEqual({ hours: 2, minutes: 15 });
  });

  it('不正な値の場合はnullを返す', () => {
    expect(calculateDuration('invalid', '10:00')).toBeNull();
  });
});
