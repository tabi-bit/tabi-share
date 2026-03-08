import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LazyMarkdownEditor } from '@/components/ui/markdown/LazyMarkdownEditor';
import { Separator } from '@/components/ui/separator';
import { useDeletePage, useUpdatePage } from '@/hooks/usePages';
import { useUpdateTrip } from '@/hooks/useTrips';
import type { Page } from '@/types';
import type { Trip } from '@/types/trip';

interface EditPageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: Page;
  trip: Trip;
  onDeleted?: (pageId: number) => void;
}

export const EditPageDialog = ({ open, onOpenChange, page, trip, onDeleted }: EditPageDialogProps) => {
  const [title, setTitle] = useState(page.title);
  const [tripTitle, setTripTitle] = useState(trip.title);
  const [tripDetail, setTripDetail] = useState(trip.detail ?? '');
  const { updatePage } = useUpdatePage(page.tripId);
  const { deletePage } = useDeletePage(page.tripId);
  const { updateTrip } = useUpdateTrip();

  // ダイアログが開いたときにフォームを初期化
  useEffect(() => {
    if (open) {
      setTitle(page.title);
      setTripTitle(trip.title);
      setTripDetail(trip.detail ?? '');
    }
  }, [open, page, trip]);

  // 削除処理
  const handleDelete = async () => {
    await deletePage(page.id);
    onDeleted?.(page.id);
    onOpenChange(false);
  };

  // サブミット処理
  const handleSubmit = async () => {
    if (!title.trim()) {
      return;
    }

    const promises: Promise<unknown>[] = [];

    // ページ: タイトルが変更されていれば更新
    if (title.trim() !== page.title) {
      promises.push(
        updatePage({ id: page.id, data: { title: title.trim(), detail: page.detail, tripId: page.tripId } })
      );
    }

    // 旅程: タイトルまたは詳細が変更されていれば更新
    const trimmedTripTitle = tripTitle.trim();
    const trimmedTripDetail = tripDetail.trim();
    if (trimmedTripTitle && (trimmedTripTitle !== trip.title || trimmedTripDetail !== (trip.detail ?? ''))) {
      promises.push(
        updateTrip({
          id: trip.id,
          data: { title: trimmedTripTitle, detail: trimmedTripDetail || undefined, peopleNum: trip.peopleNum },
        })
      );
    }

    await Promise.all(promises);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ページ情報の編集</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className='space-y-4'>
            {/* ページ情報編集セクション */}
            <div className='space-y-2'>
              <h3 className='font-semibold text-sm'>ページ情報編集</h3>
              <div className='space-y-2'>
                <Label htmlFor='edit-page-title'>タイトル</Label>
                <Input
                  id='edit-page-title'
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder='ページのタイトル'
                />
              </div>
            </div>
            <Separator />
            {/* 旅程情報編集セクション */}
            <div className='space-y-2'>
              <h3 className='font-semibold text-sm'>旅程情報編集</h3>
              <div className='space-y-2'>
                <Label htmlFor='edit-trip-title'>旅程タイトル</Label>
                <Input
                  id='edit-trip-title'
                  value={tripTitle}
                  onChange={e => setTripTitle(e.target.value)}
                  placeholder='旅程のタイトル'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='edit-trip-detail'>旅程全体メモ</Label>
                <LazyMarkdownEditor
                  className='max-h-72'
                  id='edit-trip-detail'
                  value={tripDetail}
                  onChange={setTripDetail}
                  placeholder='旅程の詳細や目的など'
                />
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooter className='flex justify-between'>
          {/* 左側: 削除ボタン */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant='destructive' className='mr-0 sm:mr-auto'>
                削除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ページを削除しますか?</AlertDialogTitle>
                <AlertDialogDescription>
                  この操作は取り消せません。ページ「{page.title}」を削除します。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction variant='destructive' onClick={handleDelete}>
                  削除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant='outline' onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit}>更新</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
