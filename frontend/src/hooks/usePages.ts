import type { AxiosError } from 'axios';
import { useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import useSWRMutation from 'swr/mutation';
import { z } from 'zod';
import { apiClient, fetcher } from '@/lib/apiClient';
import { AppRequestPageSchema, AppResponsePageSchema, type Page, PageSchema } from '@/types/page';

const TRIPS_BASE_PATH = '/trips';
const PAGES_BASE_PATH = '/pages';

/**
 * tripId に紐づく Page をすべて取得するフック
 */
export const usePages = (tripId: number | null) => {
  const { data, error, isLoading } = useSWR<Page[]>(
    tripId ? `${TRIPS_BASE_PATH}/${tripId}/pages` : null,
    async (url: string) => {
      const res = await fetcher(url);
      return z.array(AppResponsePageSchema).parse(res);
    }
  );

  return {
    pages: data,
    error,
    isLoading,
  };
};

/**
 * IDを指定して単一のPageを取得するフック
 */
export const usePage = (id: number | null) => {
  const { data, error, isLoading } = useSWR<Page>(id ? `${PAGES_BASE_PATH}/${id}` : null, async (url: string) => {
    const res = await fetcher(url);
    return AppResponsePageSchema.parse(res);
  });

  return {
    page: data,
    error,
    isLoading,
  };
};

type CreatePageArg = Omit<Page, 'id'>;
const CreatePageSchema = PageSchema.omit({ id: true });

/**
 * 新しいPageを作成する
 */
export const useCreatePage = (tripId: number | null) => {
  const listKey = tripId ? `${TRIPS_BASE_PATH}/${tripId}/pages` : null;
  const { mutate } = useSWRConfig();

  const createPageFetcher = useCallback(
    async (_key: string | null, { arg: pageData }: { arg: CreatePageArg }) => {
      CreatePageSchema.parse(pageData);
      // アプリ層→API層に変換してからバリデーション・送信
      const apiData = AppRequestPageSchema.parse({ ...pageData, id: 0 }); // idは仮値
      const { id: _, ...payload } = apiData; // idを除外
      const response = await apiClient.post(`${TRIPS_BASE_PATH}/${tripId}/pages`, payload);
      return AppResponsePageSchema.parse(response.data);
    },
    [tripId]
  );

  const { trigger, isMutating, error, data } = useSWRMutation<Page, AxiosError, string | null, CreatePageArg>(
    listKey, // リストの更新
    createPageFetcher,
    {
      onSuccess: (newPage: Page) =>
        mutate(
          listKey,
          (currentPages: Page[] | undefined) => {
            if (currentPages == null) return [newPage];
            return [...currentPages, newPage];
          },
          { revalidate: false }
        ),
    }
  );

  return {
    createPage: trigger,
    isCreating: isMutating,
    error,
    createdPage: data,
  };
};

type UpdatePageArg = { id: number; data: Omit<Page, 'id'> };
const UpdatePageSchema = PageSchema.omit({ id: true });

/**
 * Pageを更新するためのフック
 */
export const useUpdatePage = (tripId: number | null) => {
  const listKey = tripId ? `${TRIPS_BASE_PATH}/${tripId}/pages` : null;
  const { mutate } = useSWRConfig();

  const updatePageFetcher = useCallback(async (_key: string | null, { arg }: { arg: UpdatePageArg }) => {
    const { id, data } = arg;
    UpdatePageSchema.parse(data);
    // アプリ層→API層に変換してからバリデーション・送信
    const apiData = AppRequestPageSchema.parse({ ...data, id });
    const { id: _, ...payload } = apiData; // idを除外（URLパスで指定）
    const response = await apiClient.put(`${PAGES_BASE_PATH}/${id}`, payload);
    return AppResponsePageSchema.parse(response.data);
  }, []);

  const { trigger, isMutating, error, data } = useSWRMutation(listKey, updatePageFetcher, {
    // API成功時の処理（サーバーからの正式なレスポンスで確定させる）
    onSuccess: updatedPage => {
      // 個別データのキャッシュを、APIのレスポンス（確実なデータ）で上書き保存
      mutate(`${PAGES_BASE_PATH}/${updatedPage.id}`, updatedPage, { revalidate: false });
    },
  });

  const updatePage = useCallback(
    async (arg: UpdatePageArg) => {
      const optimisticPage = { ...arg.data, id: arg.id } as Page;

      // 【個別データ】の楽観的更新
      const individualKey = `${PAGES_BASE_PATH}/${arg.id}`;
      mutate(individualKey, optimisticPage, { revalidate: false });

      // 【リストデータ】の楽観的更新
      return trigger(arg, {
        optimisticData: (currentPages: Page[] | undefined) => {
          if (!currentPages) return [];
          return currentPages.map(p => (p.id === arg.id ? { ...p, ...arg.data } : p));
        },
        revalidate: false,
        rollbackOnError: true,
        onError: () => mutate(`${PAGES_BASE_PATH}/${arg.id}`), // 個別データのロールバック
      });
    },
    [trigger, mutate]
  );

  return {
    updatePage,
    isUpdating: isMutating,
    error,
    updatedPage: data,
  };
};

type DeletePageArg = Page['id'];
const DeletePageSchema = PageSchema.shape.id;

/**
 * Pageを削除する
 */
export const useDeletePage = (tripId: number | null) => {
  const listKey = tripId ? `${TRIPS_BASE_PATH}/${tripId}/pages` : null;
  const { mutate } = useSWRConfig();

  const deletePageFetcher = useCallback(async (_: string | null, { arg: id }: { arg: DeletePageArg }) => {
    DeletePageSchema.parse(id);
    await apiClient.delete(`${PAGES_BASE_PATH}/${id}`);
    return id;
  }, []);

  const { trigger, isMutating, error } = useSWRMutation(listKey, deletePageFetcher, {
    onSuccess: deletedId => {
      if (!deletedId) return;
      // 個別キャッシュの削除を確定
      mutate(`${PAGES_BASE_PATH}/${deletedId}`, undefined, { revalidate: false });
    },
  });

  const deletePage = useCallback(
    (id: DeletePageArg) => {
      const individualKey = `${PAGES_BASE_PATH}/${id}`;
      // 【個別データ】を楽観的に削除
      mutate(individualKey, undefined, { revalidate: false });

      // 【リストデータ】の楽観的更新
      return trigger(id, {
        optimisticData: (currentPages: Page[] | undefined) => {
          if (!currentPages) return [];
          return currentPages.filter(p => p.id !== id);
        },
        revalidate: false,
        rollbackOnError: true,
        onError: () => mutate(individualKey), // エラー時に個別データを再検証して戻す
      });
    },
    [trigger, mutate]
  );

  return {
    deletePage,
    isDeleting: isMutating,
    error,
  };
};
