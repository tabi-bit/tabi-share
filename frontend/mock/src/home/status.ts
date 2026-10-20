import dayjs from 'dayjs';
import type { Trip } from '@/types/trip';
import { candidatePaths } from '../candidates/paths';
import type { TripPlanningSummary } from './types';

/** 終了日が今日より前の旅。日程未定は「これから」に入れる */
export const isPastTrip = (trip: Trip, today: Date = new Date()): boolean => {
  const end = trip.endDate ?? trip.startDate;
  return end != null && dayjs(end).isBefore(dayjs(today), 'day');
};

/** 行をタップしたときの遷移先。従来の旅は旅程、新フローの旅は今の段階の画面を開く */
export const tripLinkOf = (trip: Trip, summary: TripPlanningSummary | null): string => {
  switch (summary?.planningPhase) {
    case 'collecting':
      return summary.myVoteCount < summary.candidateCount
        ? candidatePaths.vote(trip.urlId)
        : candidatePaths.candidates(trip.urlId);
    case 'deciding':
      return candidatePaths.candidates(trip.urlId);
    default:
      return candidatePaths.trip(trip.urlId);
  }
};

/** これからの旅: 開始日が近い順 (日程未定は最後)。これまでの旅: 新しい順 */
export const splitTrips = (trips: Trip[], today: Date = new Date()) => {
  const upcoming = trips
    .filter(t => !isPastTrip(t, today))
    .sort((a, b) => {
      if (!(a.startDate || b.startDate)) return b.id - a.id;
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return a.startDate.getTime() - b.startDate.getTime();
    });
  const past = trips
    .filter(t => isPastTrip(t, today))
    .sort(
      (a, b) =>
        (b.endDate ?? b.startDate ?? new Date(0)).getTime() - (a.endDate ?? a.startDate ?? new Date(0)).getTime()
    );
  return { upcoming, past };
};
