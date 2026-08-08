import { toast } from 'sonner';
import useSWR, { useSWRConfig } from 'swr';
import z from 'zod';
import { apiClient, fetcher } from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/errors';
import { migrateVisitedTripUrlIds } from '@/lib/migrateVisitedTrips';
import { applyTripArchived, MY_ARCHIVED_TRIPS_KEY, MY_TRIPS_KEY } from '@/lib/tripCache';
import { type Trip, tripFromApi } from '@/types/trip';

const myTripsFromApi = z.array(tripFromApi);

/**
 * 自分がアクセスできる旅程の一覧。ホーム一覧の唯一の取得元。
 *
 * `archived` は user_trip_access の属性なので Trip 本体には載らず、
 * どちらのリストから取得したかで状態が決まる。
 */
export const useMyTrips = (archived = false) => {
  const { data, error, isLoading } = useSWR<Trip[]>(
    archived ? MY_ARCHIVED_TRIPS_KEY : MY_TRIPS_KEY,
    async (url: string) => {
      await migrateVisitedTripUrlIds();
      return myTripsFromApi.parse(await fetcher(url));
    }
  );

  return { trips: data, error, isLoading };
};

/**
 * 旅程のアーカイブ状態を切り替える。楽観更新のみで、失敗時は元のリストへ戻す。
 */
export const useArchiveTrip = () => {
  const { mutate } = useSWRConfig();

  const setArchived = async (trip: Trip, archived: boolean): Promise<void> => {
    applyTripArchived(mutate, trip, archived);
    try {
      await apiClient.patch(`/me/trips/${trip.id}`, { archived });
    } catch (err) {
      applyTripArchived(mutate, trip, !archived);
      toast.error(getErrorMessage(err));
    }
  };

  return { setArchived };
};
