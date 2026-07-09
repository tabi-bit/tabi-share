import dayjs from 'dayjs';
import { toast } from 'sonner';
import useSWR, { type SWRConfiguration, useSWRConfig } from 'swr';
import useSWRMutation from 'swr/mutation';
import z from 'zod';
import { apiClient, fetcher } from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/errors';
import { blockToApi } from '@/types';
import { pageFromApi, pageMutationToApi } from '@/types/page';
import {
  type CreateTripFromApi,
  createTripFromApi,
  type Trip,
  type TripMutation,
  tripFromApi,
  tripMutationToApi,
} from '@/types/trip';
import { VISITED_TRIPS_CACHE_KEY } from './useVisitedTrips';

const TRIPS_BASE_PATH = '/trips';

/**
 * URLのIDを指定して単一のTripを取得するフック
 */
export const useTripByUrlId = (urlId: Trip['urlId'] | null, options?: Pick<SWRConfiguration, 'refreshInterval'>) => {
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR<Trip>(
    urlId ? `${TRIPS_BASE_PATH}/url/${urlId}` : null,
    async (url: string) => {
      const res = await fetcher(url);
      return tripFromApi.parse(res);
    },
    {
      ...options,
      onSuccess: trip => {
        if (trip) {
          // /trips/{id} のキャッシュを更新
          mutate(`${TRIPS_BASE_PATH}/${trip.id}`, trip, { revalidate: false });
        }
      },
    }
  );

  return {
    trip: data,
    error,
    isLoading,
  };
};

/**
 * IDを指定して単一のTripを取得するフック
 */
export const useTrip = (id: Trip['id'] | null) => {
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR<Trip>(
    id ? `${TRIPS_BASE_PATH}/${id}` : null,
    async (url: string) => {
      const res = await fetcher(url);
      return tripFromApi.parse(res);
    },
    {
      onSuccess: trip => {
        if (trip) {
          // /trips/url/{urlId} のキャッシュを更新
          mutate(`${TRIPS_BASE_PATH}/url/${trip.urlId}`, trip, { revalidate: false });
        }
      },
    }
  );

  return {
    trip: data,
    error,
    isLoading,
  };
};

type CreateTripArg = TripMutation;

/**
 * 新しいTripを作成する
 */
export const useCreateTrip = () => {
  const createTrip = async (url: string, { arg: tripData }: { arg: CreateTripArg }) => {
    const apiData = tripMutationToApi.parse(tripData);
    const response = await apiClient.post(url, apiData);
    const newTrip = createTripFromApi.parse(response.data);

    // デフォルトPageを作成（遷移後にSWRが自動fetchするためキャッシュ管理不要）
    const pageData = pageMutationToApi.parse({ title: '1日目', tripId: newTrip.id });
    const pageRes = await apiClient.post(`${TRIPS_BASE_PATH}/${newTrip.id}/pages`, pageData);
    const newPage = pageFromApi.parse(pageRes.data);

    const INITIAL_BLOCK_START_HOUR = 10;
    const blockFullData = blockToApi.parse({
      id: 0, // idは仮値
      title: 'サンプルスケジュール',
      detail: '編集モードから旅程を編集できます',
      type: 'schedule',
      startTime: dayjs().hour(10).minute(0).second(0).toDate(),
      endTime: dayjs()
        .hour(INITIAL_BLOCK_START_HOUR + 1)
        .minute(0)
        .second(0)
        .toDate(),
      pageId: newPage.id,
    });
    const { id: _, ...blockPayload } = blockFullData; // API送信用にidを除外
    await apiClient.post(`/pages/${newPage.id}/blocks`, blockPayload);

    return newTrip;
  };

  const { trigger, isMutating, error, data } = useSWRMutation<CreateTripFromApi, Error, string, CreateTripArg>(
    TRIPS_BASE_PATH,
    createTrip,
    {
      onError: err => toast.error(getErrorMessage(err)),
    }
  );

  return {
    createTrip: trigger,
    isCreating: isMutating,
    error,
    createdTrip: data,
  };
};

type UpdateTripArg = { id: Trip['id']; data: TripMutation };

/**
 * Tripを更新するためのフック
 */
export const useUpdateTrip = () => {
  const { mutate, cache } = useSWRConfig();

  const updateTripFetcher = async (_key: string | null, { arg }: { arg: UpdateTripArg }) => {
    const { id, data } = arg;
    const apiData = tripMutationToApi.parse(data);
    const response = await apiClient.put(`${TRIPS_BASE_PATH}/${id}`, apiData);
    return tripFromApi.parse(response.data);
  };

  // useVisitedTrips の SWR cache (`[VISITED_TRIPS_CACHE_KEY, ...urlIds]`) は個別 /trips/url/:urlId とは別キーで
  // 自動追従しない。HomePage の期間バッジ等が古いまま残らないよう、ここから明示的に置換する
  const updateVisitedTripsCache = (trip: Trip) => {
    mutate(
      key => Array.isArray(key) && key[0] === VISITED_TRIPS_CACHE_KEY,
      (currentTrips: Trip[] | undefined) => {
        if (!currentTrips) return currentTrips;
        return currentTrips.map(t => (t.id === trip.id ? trip : t));
      },
      { revalidate: false }
    );
  };

  const { trigger, isMutating, error, data } = useSWRMutation(TRIPS_BASE_PATH, updateTripFetcher, {
    // サーバーレスポンスで個別キャッシュ（id ベース・urlId ベース）を確定
    onSuccess: (updatedTrip: Trip) => {
      mutate(`${TRIPS_BASE_PATH}/${updatedTrip.id}`, updatedTrip, { revalidate: false });
      mutate(`${TRIPS_BASE_PATH}/url/${updatedTrip.urlId}`, updatedTrip, { revalidate: false });
      updateVisitedTripsCache(updatedTrip);
    },
  });

  const updateTrip = async (arg: UpdateTripArg) => {
    const idKey = `${TRIPS_BASE_PATH}/${arg.id}`;
    // 既存キャッシュから urlId を引いて、id ベースと urlId ベース両方の個別キャッシュを楽観更新する
    const cachedTrip = (cache.get(idKey)?.data ?? null) as Trip | null;
    const urlKey = cachedTrip?.urlId ? `${TRIPS_BASE_PATH}/url/${cachedTrip.urlId}` : null;
    const optimisticTrip = { ...(cachedTrip ?? {}), ...arg.data, id: arg.id } as Trip;

    // 個別キャッシュの楽観的更新（リスト /trips は未使用のため対象外）
    mutate(idKey, optimisticTrip, { revalidate: false });
    if (urlKey) mutate(urlKey, optimisticTrip, { revalidate: false });
    updateVisitedTripsCache(optimisticTrip);

    return trigger(arg, {
      revalidate: false,
      onError: (err: unknown) => {
        toast.error(getErrorMessage(err));
        mutate(idKey); // 個別データのロールバック（再検証）
        if (urlKey) mutate(urlKey);
        // visitedTrips は revalidate して同期（fetcher が urlIds 全件を取得するので失敗時のみ）
        mutate(key => Array.isArray(key) && key[0] === VISITED_TRIPS_CACHE_KEY);
      },
    });
  };

  return {
    updateTrip,
    isUpdating: isMutating,
    error,
    updatedTrip: data,
  };
};

type DeleteTripArg = Trip['id'];

/**
 * Tripを削除する
 */
export const useDeleteTrip = () => {
  const { mutate } = useSWRConfig();

  const deleteTripFetcher = async (_: string | null, { arg: id }: { arg: DeleteTripArg }) => {
    z.number().parse(id);
    await apiClient.delete(`${TRIPS_BASE_PATH}/${id}`);
    return undefined;
  };

  const { trigger, isMutating, error } = useSWRMutation(
    TRIPS_BASE_PATH, // リストのキー（削除完了後のリスト自動再検証のため）
    deleteTripFetcher,
    {
      onError: (err: unknown) => toast.error(getErrorMessage(err)),
    }
  );

  const deleteTrip = async (id: DeleteTripArg) => {
    // リスト側の楽観的更新
    await trigger(id, {
      optimisticData: (currentTrips: Trip[] | undefined) => {
        if (!currentTrips) return [];
        return currentTrips.filter(trip => trip.id !== id);
      },
      revalidate: true, // 念のためリストをサーバーと同期する（不要ならfalse）
      rollbackOnError: true,
    });

    // 個別キャッシュ（/trips/:id）の削除
    mutate(`${TRIPS_BASE_PATH}/${id}`, undefined, false);
  };

  return {
    deleteTrip,
    isDeleting: isMutating,
    error,
  };
};
