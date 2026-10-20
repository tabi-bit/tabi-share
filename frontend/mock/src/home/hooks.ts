import useSWR from 'swr';
import { apiClient, fetcher } from '@/lib/apiClient';
import type { PlanningPhase, TripPlanningSummary, VisitedPlace } from './types';

const PLANNING_KEY = '/me/trips/planning';

/** 旅ごとの段階と投票の進み具合。tripId で引けるようにして返す */
export const useTripPlanningSummaries = () => {
  const { data, isLoading } = useSWR<TripPlanningSummary[]>(PLANNING_KEY, fetcher);
  const byTripId = new Map((data ?? []).map(s => [s.tripId, s]));
  return { summaryOf: (tripId: number) => byTripId.get(tripId) ?? null, isLoading };
};

// 読み込み中に毎回新しい配列を返すと、地球儀の再構築が走るため固定する
const NO_PLACES: VisitedPlace[] = [];

export const useVisitedPlaces = () => {
  const { data } = useSWR<VisitedPlace[]>('/me/visited-places', fetcher);
  return { places: data ?? NO_PLACES };
};

export const updatePlanningPhase = (tripId: number, phase: PlanningPhase) =>
  apiClient.put(`/trips/${tripId}/planning`, { phase });
