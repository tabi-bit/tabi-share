import type { AxiosError } from 'axios';
import { useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import useSWRMutation from 'swr/mutation';
import { z } from 'zod';
import { apiClient, fetcher } from '@/lib/apiClient';
import { AppRequestBlockSchema, AppResponseBlockSchema, type Block, BlockSchema } from '@/types/block';

const PAGES_BASE_PATH = '/pages';
const BLOCKS_BASE_PATH = '/blocks';

/**
 * pageId に紐づく Block をすべて取得するフック
 */
export const useBlocks = (pageId: number | null) => {
  const { data, error, isLoading } = useSWR<Block[]>(
    pageId ? `${PAGES_BASE_PATH}/${pageId}/blocks` : null,
    async (url: string) => {
      const res = await fetcher(url);
      return z.array(AppResponseBlockSchema).parse(res);
    }
  );

  return {
    blocks: data,
    error,
    isLoading,
  };
};

/**
 * IDを指定して単一のBlockを取得するフック
 */
export const useBlock = (id: number | null) => {
  const { data, error, isLoading } = useSWR<Block>(id ? `${BLOCKS_BASE_PATH}/${id}` : null, async (url: string) => {
    const res = await fetcher(url);
    return AppResponseBlockSchema.parse(res);
  });

  return {
    block: data,
    error,
    isLoading,
  };
};

type CreateBlockArg = Omit<Block, 'id'>;

/**
 * 新しいBlockを作成する
 */
export const useCreateBlock = (pageId: number | null) => {
  const listKey = pageId ? `${PAGES_BASE_PATH}/${pageId}/blocks` : null;
  const { mutate } = useSWRConfig();

  const createBlockFetcher = useCallback(
    async (_key: string | null, { arg: blockData }: { arg: CreateBlockArg }) => {
      // アプリ層→API層に変換してからバリデーション・送信
      const apiData = AppRequestBlockSchema.parse({ ...blockData, id: 0 }); // idは仮値
      const { id: _, ...payload } = apiData; // idを除外
      const response = await apiClient.post<Block>(`${PAGES_BASE_PATH}/${pageId}/blocks`, payload);
      return AppResponseBlockSchema.parse(response.data);
    },
    [pageId]
  );

  const { trigger, isMutating, error, data } = useSWRMutation<Block, AxiosError, string | null, CreateBlockArg>(
    listKey, // リストの更新
    createBlockFetcher,
    {
      onSuccess: (newBlock: Block) =>
        mutate(
          listKey,
          (currentBlocks: Block[] | undefined) => {
            if (currentBlocks == null) return [newBlock];
            return [...currentBlocks, newBlock];
          },
          { revalidate: false }
        ),
    }
  );

  return {
    createBlock: trigger,
    isCreating: isMutating,
    error,
    createdBlock: data,
  };
};

type UpdateBlockArg = { id: number; data: Omit<Block, 'id'> };

/**
 * Blockを更新するためのフック
 */
export const useUpdateBlock = (pageId: number | null) => {
  const listKey = pageId ? `${PAGES_BASE_PATH}/${pageId}/blocks` : null;
  const { mutate } = useSWRConfig();

  const updateBlockFetcher = useCallback(async (_key: string | null, { arg }: { arg: UpdateBlockArg }) => {
    const { id, data } = arg;
    // アプリ層→API層に変換してからバリデーション・送信
    const apiData = AppRequestBlockSchema.parse({ ...data, id });
    const { id: _, ...payload } = apiData; // idを除外（URLパスで指定）
    const response = await apiClient.put<Block>(`${BLOCKS_BASE_PATH}/${id}`, payload);
    return AppResponseBlockSchema.parse(response.data);
  }, []);

  const { trigger, isMutating, error, data } = useSWRMutation(listKey, updateBlockFetcher, {
    // API成功時の処理（サーバーからの正式なレスポンスで確定させる）
    onSuccess: updatedBlock => {
      // 個別データのキャッシュを、APIのレスポンス（確実なデータ）で上書き保存
      mutate(`${BLOCKS_BASE_PATH}/${updatedBlock.id}`, updatedBlock, { revalidate: false });
    },
  });

  const updateBlock = useCallback(
    async (arg: UpdateBlockArg) => {
      const optimisticBlock = { ...arg.data, id: arg.id } as Block;

      // 【個別データ】の楽観的更新
      const individualKey = `${BLOCKS_BASE_PATH}/${arg.id}`;
      mutate(individualKey, optimisticBlock, { revalidate: false });

      // 【リストデータ】の楽観的更新
      return trigger(arg, {
        optimisticData: (currentBlocks: Block[] | undefined) => {
          if (!currentBlocks) return [];
          return currentBlocks.map(b => (b.id === arg.id ? { ...b, ...arg.data } : b)) as Block[];
        },
        revalidate: false,
        rollbackOnError: true,
        onError: () => mutate(`${BLOCKS_BASE_PATH}/${arg.id}`), // 個別データのロールバック
      });
    },
    [trigger, mutate]
  );

  return {
    updateBlock,
    isUpdating: isMutating,
    error,
    updatedBlock: data,
  };
};

type DeleteBlockArg = Block['id'];
const DeleteBlockSchema = BlockSchema.options[0].shape.id;

/**
 * Blockを削除する
 */
export const useDeleteBlock = (pageId: number | null) => {
  const listKey = pageId ? `${PAGES_BASE_PATH}/${pageId}/blocks` : null;
  const { mutate } = useSWRConfig();

  const deleteBlockFetcher = useCallback(async (_: string | null, { arg: id }: { arg: DeleteBlockArg }) => {
    DeleteBlockSchema.parse(id);
    await apiClient.delete(`${BLOCKS_BASE_PATH}/${id}`);
    return id;
  }, []);

  const { trigger, isMutating, error } = useSWRMutation(listKey, deleteBlockFetcher, {
    onSuccess: deletedId => {
      if (!deletedId) return;
      // 個別キャッシュの削除を確定
      mutate(`${BLOCKS_BASE_PATH}/${deletedId}`, undefined, { revalidate: false });
    },
  });

  const deleteBlock = useCallback(
    (id: DeleteBlockArg) => {
      const individualKey = `${BLOCKS_BASE_PATH}/${id}`;
      // 【個別データ】を楽観的に削除
      mutate(individualKey, undefined, { revalidate: false });

      // 【リストデータ】の楽観的更新
      return trigger(id, {
        optimisticData: (currentBlocks: Block[] | undefined) => {
          if (!currentBlocks) return [];
          return currentBlocks.filter(b => b.id !== id);
        },
        revalidate: false,
        rollbackOnError: true,
        onError: () => mutate(individualKey), // エラー時に個別データを再検証して戻す
      });
    },
    [trigger, mutate]
  );

  return {
    deleteBlock,
    isDeleting: isMutating,
    error,
  };
};
