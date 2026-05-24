import { describe, expect, it } from 'vitest';
import {
  formatDateDisplay,
  formatDateMDWithDow,
  formatDateOnly,
  formatDateYMDWithDow,
  formatTripRangeMD,
  formatTripRangeYMD,
  isDateOutsideRange,
  parseDateOnly,
} from './date';

describe('parseDateOnly', () => {
  it('YYYY-MM-DD をローカル 00:00 の Date に変換する', () => {
    const d = parseDateOnly('2026-05-24');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4); // 0-indexed
    expect(d.getDate()).toBe(24);
    expect(d.getHours()).toBe(0);
  });
});

describe('formatDateOnly', () => {
  it('Date を YYYY-MM-DD にフォーマットする', () => {
    expect(formatDateOnly(new Date(2026, 4, 24))).toBe('2026-05-24');
  });
});

describe('formatDateDisplay', () => {
  it('Date を YYYY/MM/DD にフォーマットする', () => {
    expect(formatDateDisplay(new Date(2026, 4, 24))).toBe('2026/05/24');
  });
});

describe('formatDateMDWithDow', () => {
  it('Date を M/D(曜) 形式にフォーマットする', () => {
    // 2026-05-24 は日曜日
    expect(formatDateMDWithDow(new Date(2026, 4, 24))).toBe('5/24(日)');
    // 2026-05-26 は火曜日
    expect(formatDateMDWithDow(new Date(2026, 4, 26))).toBe('5/26(火)');
  });
});

describe('formatDateYMDWithDow', () => {
  it('Date を YYYY/MM/DD(曜) 形式にフォーマットする', () => {
    expect(formatDateYMDWithDow(new Date(2026, 4, 24))).toBe('2026/05/24(日)');
  });
});

describe('formatTripRangeMD', () => {
  const start = new Date(2026, 4, 24);
  const end = new Date(2026, 4, 26);

  it('両方ある場合は連結する', () => {
    expect(formatTripRangeMD(start, end)).toBe('5/24(日) 〜 5/26(火)');
  });

  it('start のみの場合は右側を省略する', () => {
    expect(formatTripRangeMD(start, null)).toBe('5/24(日) 〜 ');
  });

  it('end のみの場合は左側を省略する', () => {
    expect(formatTripRangeMD(null, end)).toBe(' 〜 5/26(火)');
  });

  it('両方 null の場合は null を返す', () => {
    expect(formatTripRangeMD(null, null)).toBeNull();
    expect(formatTripRangeMD(undefined, undefined)).toBeNull();
  });
});

describe('formatTripRangeYMD', () => {
  const start = new Date(2026, 4, 24);
  const end = new Date(2026, 4, 26);

  it('両方ある場合は連結する', () => {
    expect(formatTripRangeYMD(start, end)).toBe('2026/05/24(日) 〜 2026/05/26(火)');
  });

  it('start のみの場合', () => {
    expect(formatTripRangeYMD(start, null)).toBe('2026/05/24(日) 〜 ');
  });

  it('end のみの場合', () => {
    expect(formatTripRangeYMD(null, end)).toBe(' 〜 2026/05/26(火)');
  });

  it('両方 null の場合は null を返す', () => {
    expect(formatTripRangeYMD(null, null)).toBeNull();
  });
});

describe('isDateOutsideRange', () => {
  const start = new Date(2026, 4, 24);
  const end = new Date(2026, 4, 26);

  it('範囲内は false', () => {
    expect(isDateOutsideRange(new Date(2026, 4, 25), start, end)).toBe(false);
  });

  it('範囲の端は範囲内', () => {
    expect(isDateOutsideRange(start, start, end)).toBe(false);
    expect(isDateOutsideRange(end, start, end)).toBe(false);
  });

  it('範囲より前は true', () => {
    expect(isDateOutsideRange(new Date(2026, 4, 23), start, end)).toBe(true);
  });

  it('範囲より後は true', () => {
    expect(isDateOutsideRange(new Date(2026, 4, 27), start, end)).toBe(true);
  });

  it('date が null のときは false', () => {
    expect(isDateOutsideRange(null, start, end)).toBe(false);
  });

  it('start のみ指定で前は true / 後は false', () => {
    expect(isDateOutsideRange(new Date(2026, 4, 23), start, null)).toBe(true);
    expect(isDateOutsideRange(new Date(2026, 4, 30), start, null)).toBe(false);
  });

  it('end のみ指定で後は true / 前は false', () => {
    expect(isDateOutsideRange(new Date(2026, 4, 27), null, end)).toBe(true);
    expect(isDateOutsideRange(new Date(2026, 4, 1), null, end)).toBe(false);
  });
});
