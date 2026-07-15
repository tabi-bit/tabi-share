import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useState } from 'react';
import { selectedPageAtom, selectedPageIdAtom, tripAtom, tripPagesAtom } from '@/atoms/tripPage';
import { AddPageDialog } from '@/dialogs/AddPageDialog';
import { EditPageDialog } from '@/dialogs/EditPageDialog';
import { addPageDialogOpenAtom } from './atoms';
import { DesktopPill } from './DesktopPill';
import { MobilePill } from './MobilePill';
import { useAdjacentPageKeys } from './useAdjacentPageKeys';

/**
 * ページ選択UI一式のコンテナ。
 *
 * - モバイル下部フローティング pill + デスクトップ上部フローティング pill
 * - ページ編集ダイアログ / ページ追加ダイアログの状態管理
 * - キーボード ←/→ の隣接ページ切替 (useAdjacentPageKeys)
 *
 * DesktopPill は `absolute top-full` で Header の下端に張り付くため、
 * このコンテナは Header (position: relative) の子として配置する必要がある。
 * MobilePill は `document.body` へ Portal されるため配置場所を問わない。
 */
export const PageSelector = () => {
  const trip = useAtomValue(tripAtom);
  const pages = useAtomValue(tripPagesAtom);
  const setSelectedPageId = useSetAtom(selectedPageIdAtom);
  const selectedPage = useAtomValue(selectedPageAtom);

  const [editPageDialogOpen, setEditPageDialogOpen] = useState(false);
  const [addPageDialogOpen, setAddPageDialogOpen] = useAtom(addPageDialogOpenAtom);

  useAdjacentPageKeys();

  if (!trip) return null;

  return (
    <>
      <MobilePill onEditPage={() => setEditPageDialogOpen(true)} onAddPage={() => setAddPageDialogOpen(true)} />
      <DesktopPill onEditPage={() => setEditPageDialogOpen(true)} onAddPage={() => setAddPageDialogOpen(true)} />

      <AddPageDialog
        open={addPageDialogOpen}
        onOpenChange={setAddPageDialogOpen}
        trip={trip}
        onCreated={page => setSelectedPageId(page.id)}
      />

      {selectedPage && (
        <EditPageDialog
          open={editPageDialogOpen}
          onOpenChange={setEditPageDialogOpen}
          page={selectedPage}
          trip={trip}
          onDeleted={pageId => {
            const remainingPages = pages.filter(p => p.id !== pageId);
            if (remainingPages.length > 0) {
              setSelectedPageId(remainingPages[0].id);
            }
          }}
        />
      )}
    </>
  );
};
