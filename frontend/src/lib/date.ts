import dayjs from 'dayjs';

/**
 * `YYYY-MM-DD` 形式の日付文字列を、ローカル時刻 00:00 の `Date` に変換する。
 * （`new Date('YYYY-MM-DD')` は UTC 解釈で日付がずれる場合があるため、dayjs 経由で正規化する）
 */
export const parseDateOnly = (value: string): Date => dayjs(value).startOf('day').toDate();

/**
 * `Date` を `YYYY-MM-DD` 形式（ローカル日付）の文字列に変換する。
 */
export const formatDateOnly = (value: Date): string => dayjs(value).format('YYYY-MM-DD');

/**
 * `Date` を `YYYY/MM/DD` 形式の表示用文字列に変換する。
 */
export const formatDateDisplay = (value: Date): string => dayjs(value).format('YYYY/MM/DD');

/**
 * `Date` を `M/D(曜)` 形式に変換する。Header の Page Select や Trip 期間サブタイトルなど省スペース用途向け。
 */
export const formatDateMDWithDow = (value: Date): string => dayjs(value).format('M/D(dd)');

/**
 * `Date` を `YYYY/MM/DD(曜)` 形式に変換する。HomePage 旅程カードや EditTripDialog などフル表示向け。
 */
export const formatDateYMDWithDow = (value: Date): string => dayjs(value).format('YYYY/MM/DD(dd)');

const formatRange = (
  start: Date | null | undefined,
  end: Date | null | undefined,
  formatter: (d: Date) => string
): string | null => {
  if (!(start || end)) return null;
  const startStr = start ? formatter(start) : '';
  const endStr = end ? formatter(end) : '';
  return `${startStr} 〜 ${endStr}`;
};

/**
 * Trip 期間を `M/D(曜) 〜 M/D(曜)` 形式に整形する。片方のみ設定時は片側を省略 (`M/D(曜) 〜` / `〜 M/D(曜)`)。
 * 両方未設定の場合は `null` を返す。
 */
export const formatTripRangeMD = (start: Date | null | undefined, end: Date | null | undefined): string | null =>
  formatRange(start, end, formatDateMDWithDow);

/**
 * Trip 期間を `YYYY/MM/DD(曜) 〜 YYYY/MM/DD(曜)` 形式に整形する。片方のみ設定時は片側を省略。
 * 両方未設定の場合は `null` を返す。
 */
export const formatTripRangeYMD = (start: Date | null | undefined, end: Date | null | undefined): string | null =>
  formatRange(start, end, formatDateYMDWithDow);

/**
 * `date` が `[start, end]` の範囲外かを判定する。`start` / `end` が未指定（`null` / `undefined`）の場合はその境界はチェックしない。
 * `date` が `null` のときは常に `false`（未設定は範囲外とみなさない）。
 */
export const isDateOutsideRange = (date: Date | null, start?: Date | null, end?: Date | null): boolean => {
  if (!date) return false;
  if (start && date < start) return true;
  if (end && date > end) return true;
  return false;
};

/**
 * 2 つの `Date` がローカル時刻で同じ年月日か判定する。
 */
export const isSameLocalDate = (a: Date, b: Date): boolean => dayjs(a).isSame(b, 'day');
