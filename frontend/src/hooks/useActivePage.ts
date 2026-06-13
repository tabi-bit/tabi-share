import { useCallback, useEffect, useState } from 'react';
import { db } from '@/lib/db';
import type { Page } from '@/types/page';

/** IndexedDB の userSettings キープレフィックス（Trip ごとにアクティブページを保持） */
const ACTIVE_PAGE_KEY_PREFIX = 'activePageId_';

/** tripId からアクティブページ保存用のキーを生成 */
const buildActivePageKey = (tripId: number): string => `${ACTIVE_PAGE_KEY_PREFIX}${tripId}`;

/** IndexedDB から Trip のアクティブページ ID を取得 */
const getActivePageIdFromDB = async (tripId: number): Promise<Page['id'] | null> => {
  const entry = await db.userSettings.get(buildActivePageKey(tripId));
  return typeof entry?.value === 'number' ? entry.value : null;
};

/** IndexedDB に Trip のアクティブページ ID を保存 */
const saveActivePageIdToDB = async (tripId: number, pageId: Page['id']): Promise<void> => {
  await db.userSettings.put({ key: buildActivePageKey(tripId), value: pageId });
};

/**
 * Trip ごとに最後に表示していたページ（アクティブページ）を IndexedDB で永続化し、
 * 再訪時に復帰できるようにするフック。
 */
export const useActivePage = (tripId: number | null) => {
  const [storedPageId, setStoredPageId] = useState<Page['id'] | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // tripId 確定時に IndexedDB から保存済みのアクティブページ ID を読み込む
  useEffect(() => {
    if (tripId == null) {
      setStoredPageId(null);
      setIsInitialized(false);
      return;
    }

    let cancelled = false;
    const init = async () => {
      const id = await getActivePageIdFromDB(tripId);
      if (cancelled) return;
      setStoredPageId(id);
      setIsInitialized(true);
    };
    init().catch(() => {
      if (!cancelled) setIsInitialized(true);
    });

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  // アクティブページ ID を IndexedDB に永続化（fire-and-forget）
  const saveActivePageId = useCallback(
    (pageId: Page['id']) => {
      if (tripId == null) return;
      saveActivePageIdToDB(tripId, pageId).catch(() => {
        // fire-and-forget
      });
    },
    [tripId]
  );

  return {
    storedPageId,
    isActivePageInitialized: isInitialized,
    saveActivePageId,
  };
};
