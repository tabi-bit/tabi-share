import dayjs from 'dayjs';

/** 今日から n 日後を YYYY-MM-DD で返す。モックの日付を閲覧日に追従させるため */
export const daysFromToday = (n: number): string => dayjs().startOf('day').add(n, 'day').format('YYYY-MM-DD');
