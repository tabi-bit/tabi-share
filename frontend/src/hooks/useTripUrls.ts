/**
 * URL ストック関連フック群
 *
 * MVP 検証中は DB マイグレーションを避けるため、CRUD は **フロント側 IndexedDB**
 * のみで永続化する（サーバーには保存しない）。
 *
 * - `useTripUrls` / `useCreateTripUrl` / `useUpdateTripUrl` / `useDeleteTripUrl`:
 *   Dexie (`db.tripUrls`) を直接操作。SWR でリスト購読・楽観更新を行う
 * - `usePreviewTripUrl` / `useFormatTripUrl`: 引き続きサーバ API を呼ぶ
 *   （URL fetch / Gemini 呼び出しはサーバ側で実行する必要がある）
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import useSWR, { useSWRConfig } from 'swr';
import useSWRMutation from 'swr/mutation';
import { apiClient } from '@/lib/apiClient';
import { db, type TripUrlEntry } from '@/lib/db';
import { withDebugCache } from '@/lib/debugCache';
import { getErrorMessage } from '@/lib/errors';
import {
  type TripUrl,
  type TripUrlFormatResponse,
  type TripUrlMutation,
  TripUrlMutationSchema,
  type TripUrlPreview,
  tripUrlFormatResponseFromApi,
  tripUrlPreviewFromApi,
} from '@/types/tripUrl';

const TRIPS_BASE_PATH = '/trips';

const listKeyFor = (tripId: number | null) => (tripId ? (['indexeddb:tripUrls', tripId] as const) : null);

/**
 * Dexie のエントリは TripUrl と同じ shape なので素通しで返せる。
 * 念のため明示的に変換しておく（将来 schema が分岐したときに気付ける）。
 */
const entryToTripUrl = (entry: TripUrlEntry): TripUrl => ({
  id: entry.id,
  tripId: entry.tripId,
  url: entry.url,
  title: entry.title,
  thumbnailUrl: entry.thumbnailUrl,
  memo: entry.memo,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
});

const fetchTripUrlsByTripId = async (tripId: number): Promise<TripUrl[]> => {
  const entries = await db.tripUrls.where('tripId').equals(tripId).sortBy('createdAt');
  return entries.map(entryToTripUrl);
};

/**
 * trip 配下の TripUrl 一覧を取得するフック（IndexedDB 由来）
 */
export const useTripUrls = (tripId: number | null) => {
  const { data, error, isLoading } = useSWR<TripUrl[]>(listKeyFor(tripId), () =>
    tripId == null ? Promise.resolve([]) : fetchTripUrlsByTripId(tripId)
  );

  return {
    tripUrls: data,
    error,
    isLoading,
  };
};

type CreateTripUrlArg = TripUrlMutation;

/**
 * 新しい TripUrl を IndexedDB に作成するフック
 */
export const useCreateTripUrl = (tripId: number | null) => {
  const listKey = listKeyFor(tripId);
  const { mutate } = useSWRConfig();

  const createTripUrlFetcher = useCallback(
    async (_key: unknown, { arg }: { arg: CreateTripUrlArg }) => {
      if (tripId == null) throw new Error('tripId is required to create');
      const validated = TripUrlMutationSchema.parse(arg);
      const now = new Date().toISOString();
      const id = await db.tripUrls.add({
        tripId,
        url: validated.url,
        title: validated.title ?? null,
        thumbnailUrl: validated.thumbnailUrl ?? null,
        memo: validated.memo ?? null,
        createdAt: now,
        updatedAt: now,
      } as TripUrlEntry);
      const created = await db.tripUrls.get(id);
      if (!created) throw new Error('Failed to read created TripUrl');
      return entryToTripUrl(created);
    },
    [tripId]
  );

  const { trigger, isMutating, error, data } = useSWRMutation<TripUrl, Error, typeof listKey, CreateTripUrlArg>(
    listKey,
    createTripUrlFetcher,
    {
      onError: err => toast.error(getErrorMessage(err)),
      onSuccess: (newTripUrl: TripUrl) =>
        mutate(
          listKey,
          (current: TripUrl[] | undefined) => {
            if (current == null) return [newTripUrl];
            return [...current, newTripUrl];
          },
          { revalidate: false }
        ),
    }
  );

  return {
    createTripUrl: trigger,
    isCreating: isMutating,
    error,
    createdTripUrl: data,
  };
};

type UpdateTripUrlArg = { id: number; data: TripUrlMutation };

/**
 * TripUrl を IndexedDB 上で更新するフック（後勝ち全体置換）
 */
export const useUpdateTripUrl = (tripId: number | null) => {
  const listKey = listKeyFor(tripId);

  const updateTripUrlFetcher = useCallback(async (_key: unknown, { arg }: { arg: UpdateTripUrlArg }) => {
    const validated = TripUrlMutationSchema.parse(arg.data);
    const now = new Date().toISOString();
    await db.tripUrls.update(arg.id, {
      url: validated.url,
      title: validated.title ?? null,
      thumbnailUrl: validated.thumbnailUrl ?? null,
      memo: validated.memo ?? null,
      updatedAt: now,
    });
    const updated = await db.tripUrls.get(arg.id);
    if (!updated) throw new Error('Failed to read updated TripUrl');
    return entryToTripUrl(updated);
  }, []);

  const { trigger, isMutating, error, data } = useSWRMutation(listKey, updateTripUrlFetcher);

  const updateTripUrl = useCallback(
    (arg: UpdateTripUrlArg) =>
      trigger(arg, {
        optimisticData: (current: TripUrl[] | undefined) => {
          if (!current) return [];
          return current.map(u =>
            u.id === arg.id
              ? {
                  ...u,
                  url: arg.data.url,
                  title: arg.data.title ?? null,
                  thumbnailUrl: arg.data.thumbnailUrl ?? null,
                  memo: arg.data.memo ?? null,
                }
              : u
          );
        },
        revalidate: false,
        rollbackOnError: true,
        onError: (err: unknown) => {
          toast.error(getErrorMessage(err));
        },
      }),
    [trigger]
  );

  return {
    updateTripUrl,
    isUpdating: isMutating,
    error,
    updatedTripUrl: data,
  };
};

type DeleteTripUrlArg = TripUrl['id'];

/**
 * TripUrl を IndexedDB から削除するフック
 */
export const useDeleteTripUrl = (tripId: number | null) => {
  const listKey = listKeyFor(tripId);

  const deleteTripUrlFetcher = useCallback(async (_key: unknown, { arg: id }: { arg: DeleteTripUrlArg }) => {
    await db.tripUrls.delete(id);
    return id;
  }, []);

  const { trigger, isMutating, error } = useSWRMutation(listKey, deleteTripUrlFetcher);

  const deleteTripUrl = useCallback(
    (id: DeleteTripUrlArg) =>
      trigger(id, {
        optimisticData: (current: TripUrl[] | undefined) => {
          if (!current) return [];
          return current.filter(u => u.id !== id);
        },
        revalidate: false,
        rollbackOnError: true,
        onError: (err: unknown) => {
          toast.error(getErrorMessage(err));
        },
      }),
    [trigger]
  );

  return {
    deleteTripUrl,
    isDeleting: isMutating,
    error,
  };
};

type PreviewTripUrlArg = { url: string };

/**
 * URL からメタデータ（タイトル / og:image）を取得するフック。
 * AI 要約は別フック `useFormatTripUrl` で明示的にトリガーする。
 */
export const usePreviewTripUrl = (tripId: number | null) => {
  const previewFetcher = useCallback(
    async (_key: string | null, { arg }: { arg: PreviewTripUrlArg }) => {
      if (tripId == null) {
        throw new Error('tripId is required to preview');
      }
      const response = await apiClient.post(`${TRIPS_BASE_PATH}/${tripId}/urls/preview`, {
        url: arg.url,
      });
      return tripUrlPreviewFromApi.parse(response.data);
    },
    [tripId]
  );

  const { trigger, isMutating, error, data } = useSWRMutation<TripUrlPreview, Error, string | null, PreviewTripUrlArg>(
    tripId ? `${TRIPS_BASE_PATH}/${tripId}/urls/preview` : null,
    previewFetcher
  );

  return {
    previewTripUrl: trigger,
    isPreviewing: isMutating,
    error,
    preview: data,
  };
};

type FormatTripUrlArg = { sourceText: string; intent?: string | null };

/**
 * 貼付テキストを Gemini で markdown 整形するフック。
 * デバッグキャッシュで同一入力の再フェッチを抑える（local のみ ON、stg/prod は無効）。
 */
export const useFormatTripUrl = (tripId: number | null) => {
  const formatFetcher = useCallback(
    async (_key: string | null, { arg }: { arg: FormatTripUrlArg }) => {
      if (tripId == null) {
        throw new Error('tripId is required to format');
      }
      const intent = arg.intent?.trim() ? arg.intent.trim() : null;
      return withDebugCache('gemini:trip-url-format', { tripId, sourceText: arg.sourceText, intent }, async () => {
        const response = await apiClient.post(`${TRIPS_BASE_PATH}/${tripId}/urls/format`, {
          source_text: arg.sourceText,
          intent,
        });
        return tripUrlFormatResponseFromApi.parse(response.data);
      });
    },
    [tripId]
  );

  const { trigger, isMutating, error, data } = useSWRMutation<
    TripUrlFormatResponse,
    Error,
    string | null,
    FormatTripUrlArg
  >(tripId ? `${TRIPS_BASE_PATH}/${tripId}/urls/format` : null, formatFetcher, {
    onError: err => toast.error(getErrorMessage(err)),
  });

  return {
    formatTripUrl: trigger,
    isFormatting: isMutating,
    error,
    formatted: data,
  };
};
