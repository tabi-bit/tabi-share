import dayjs from 'dayjs';
import { toast } from 'sonner';
import useSWR, { type SWRConfiguration, useSWRConfig } from 'swr';
import useSWRMutation from 'swr/mutation';
import { apiClient, fetcher } from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/errors';
import { removeTrip, revalidateTripLists, tripDetailKey, writeTrip } from '@/lib/tripCache';
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
  const { data, error, isLoading } = useSWR<Trip>(
    urlId ? tripDetailKey(urlId) : null,
    async (url: string) => {
      const res = await fetcher(url);
      return tripFromApi.parse(res);
    },
    options
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
  const { mutate } = useSWRConfig();

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
      onSuccess: () => revalidateTripLists(mutate),
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

type UpdateTripArg = { trip: Trip; data: TripMutation };

/**
 * Tripを更新するためのフック
 */
export const useUpdateTrip = () => {
  const { mutate } = useSWRConfig();

  const updateTripFetcher = async (_key: string | null, { arg }: { arg: UpdateTripArg }) => {
    const apiData = tripMutationToApi.parse(arg.data);
    const response = await apiClient.put(`${TRIPS_BASE_PATH}/${arg.trip.id}`, apiData);
    return tripFromApi.parse(response.data);
  };

  const { trigger, isMutating, error, data } = useSWRMutation(TRIPS_BASE_PATH, updateTripFetcher, {
    onSuccess: (updatedTrip: Trip) => writeTrip(mutate, updatedTrip),
  });

  const updateTrip = async (arg: UpdateTripArg) => {
    writeTrip(mutate, { ...arg.trip, ...arg.data });

    return trigger(arg, {
      revalidate: false,
      onError: (err: unknown) => {
        toast.error(getErrorMessage(err));
        writeTrip(mutate, arg.trip);
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

type DeleteTripArg = Pick<Trip, 'id' | 'urlId'>;

/**
 * Tripを削除する
 */
export const useDeleteTrip = () => {
  const { mutate, cache } = useSWRConfig();

  const deleteTripFetcher = async (_: string | null, { arg }: { arg: DeleteTripArg }) => {
    await apiClient.delete(`${TRIPS_BASE_PATH}/${arg.id}`);
  };

  const { trigger, isMutating, error } = useSWRMutation(TRIPS_BASE_PATH, deleteTripFetcher, {
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
      revalidateTripLists(mutate);
    },
  });

  const deleteTrip = async (trip: DeleteTripArg) => {
    removeTrip(mutate, cache, trip);
    await trigger(trip, { revalidate: false });
  };

  return {
    deleteTrip,
    isDeleting: isMutating,
    error,
  };
};
