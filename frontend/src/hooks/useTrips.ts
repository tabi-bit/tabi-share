import type { AxiosError } from 'axios';
import { useCallback } from 'react';
import useSWR, { type SWRConfiguration, useSWRConfig } from 'swr';
import useSWRMutation from 'swr/mutation';
import z from 'zod';
import { apiClient, fetcher } from '@/lib/apiClient';
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
  const createTrip = useCallback(async (url: string, { arg: tripData }: { arg: CreateTripArg }) => {
    const apiData = tripMutationToApi.parse(tripData);
    const response = await apiClient.post(url, apiData);
    const newTrip = createTripFromApi.parse(response.data);

    // デフォルトPageを作成（遷移後にSWRが自動fetchするためキャッシュ管理不要）
    const pageData = pageMutationToApi.parse({ title: '1日目', tripId: newTrip.id });
    const pageRes = await apiClient.post(`${TRIPS_BASE_PATH}/${newTrip.id}/pages`, pageData);
    const newPage = pageFromApi.parse(pageRes.data);

    const blockFullData = blockToApi.parse({
      id: 0, // idは仮値
      title: 'サンプルスケジュール',
      detail: '編集モードから旅程を編集できます',
      type: 'schedule',
      startTime: new Date(),
      endTime: new Date(),
      pageId: newPage.id,
    });
    const { id: _, ...blockPayload } = blockFullData; // API送信用にidを除外
    await apiClient.post(`/pages/${newPage.id}/blocks`, blockPayload);

    return newTrip;
  }, []);

  const { trigger, isMutating, error, data } = useSWRMutation<CreateTripFromApi, AxiosError, string, CreateTripArg>(
    TRIPS_BASE_PATH,
    createTrip
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
  const { mutate } = useSWRConfig();

  const updateTripFetcher = useCallback(async (_key: string | null, { arg }: { arg: UpdateTripArg }) => {
    const { id, data } = arg;
    const apiData = tripMutationToApi.parse(data);
    const response = await apiClient.put(`${TRIPS_BASE_PATH}/${id}`, apiData);
    return tripFromApi.parse(response.data);
  }, []);

  const { trigger, isMutating, error, data } = useSWRMutation(
    TRIPS_BASE_PATH, // リストの再検証トリガーとして利用
    updateTripFetcher,
    {
      // 更新成功時、APIレスポンスを使ってキャッシュを操作
      onSuccess: (updatedTrip: Trip) => {
        // 個別IDのキャッシュを更新 (populate)
        mutate(
          `${TRIPS_BASE_PATH}/${updatedTrip.id}`,
          updatedTrip,
          false // 再検証はしない
        );
      },
      // リスト自体のキャッシュ更新
      populateCache: (updatedTrip, currentTrips: Trip[] | undefined) => {
        if (!currentTrips) return [];
        return currentTrips.map(t => (t.id === updatedTrip.id ? updatedTrip : t));
      },
      revalidate: false, // populateCacheで更新したのでリストの再取得は防ぐ
    }
  );

  return {
    updateTrip: trigger,
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

  const deleteTripFetcher = useCallback(async (_: string | null, { arg: id }: { arg: DeleteTripArg }) => {
    z.number().parse(id);
    await apiClient.delete(`${TRIPS_BASE_PATH}/${id}`);
    return undefined;
  }, []);

  const { trigger, isMutating, error } = useSWRMutation(
    TRIPS_BASE_PATH, // リストのキー（削除完了後のリスト自動再検証のため）
    deleteTripFetcher
  );

  const deleteTrip = useCallback(
    async (id: DeleteTripArg) => {
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
    },
    [trigger, mutate]
  );

  return {
    deleteTrip,
    isDeleting: isMutating,
    error,
  };
};
