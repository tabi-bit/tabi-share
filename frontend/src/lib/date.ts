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
 * `date` が `[start, end]` の範囲外かを判定する。`start` / `end` が未指定（`null` / `undefined`）の場合はその境界はチェックしない。
 * `date` が `null` のときは常に `false`（未設定は範囲外とみなさない）。
 */
export const isDateOutsideRange = (date: Date | null, start?: Date | null, end?: Date | null): boolean => {
  if (!date) return false;
  if (start && date < start) return true;
  if (end && date > end) return true;
  return false;
};
