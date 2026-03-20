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
import { useDeleteTrip, useUpdateTrip } from '@/hooks/useTrips';
import { useVisitedTrips } from '@/hooks/useVisitedTrips';
import { TRIP_TITLE_MAX_LENGTH } from '@/types';
import type { Trip } from '@/types/trip';

interface EditTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip;
  onDeleted?: () => void;
}

export const EditTripDialog = ({ open, onOpenChange, trip, onDeleted }: EditTripDialogProps) => {
  const [tripTitle, setTripTitle] = useState(trip.title);
  const [tripDetail, setTripDetail] = useState(trip.detail ?? '');
  const { updateTrip } = useUpdateTrip();
  const { deleteTrip } = useDeleteTrip();
  const { removeVisitedTrip } = useVisitedTrips();

  // ダイアログが開いたときにフォームを初期化
  useEffect(() => {
    if (open) {
      setTripTitle(trip.title);
      setTripDetail(trip.detail ?? '');
    }
  }, [open, trip]);

  // 削除処理（楽観更新のためfire-and-forget）
  const handleDelete = () => {
    deleteTrip(trip.id);
    removeVisitedTrip(trip.urlId);
    onDeleted?.();
    onOpenChange(false);
  };

  // サブミット処理（楽観更新のためfire-and-forget）
  const handleSubmit = () => {
    const trimmedTitle = tripTitle.trim();
    const trimmedDetail = tripDetail.trim();

    if (!trimmedTitle) {
      return;
    }

    if (trimmedTitle !== trip.title || trimmedDetail !== (trip.detail ?? '')) {
      updateTrip({
        id: trip.id,
        data: { title: trimmedTitle, detail: trimmedDetail || undefined, peopleNum: trip.peopleNum },
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>旅程情報の編集</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='edit-trip-title'>
                旅程タイトル<span className='text-red-500'>*</span>
              </Label>
              <Input
                id='edit-trip-title'
                value={tripTitle}
                onChange={e => setTripTitle(e.target.value)}
                placeholder='旅程のタイトル'
                required
                maxLength={TRIP_TITLE_MAX_LENGTH}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='edit-trip-detail'>旅程全体メモ</Label>
              <LazyMarkdownEditor
                className='max-h-72'
                id='edit-trip-detail'
                value={tripDetail}
                onChange={setTripDetail}
                placeholder='旅程の詳細や目的など（任意）'
              />
            </div>
          </div>
        </DialogBody>

        <DialogFooter className='flex justify-between'>
          {/* 左側: 削除ボタン */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant='destructive' className='mr-auto'>
                削除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>旅程を削除しますか?</AlertDialogTitle>
                <AlertDialogDescription>
                  この操作は取り消せません。
                  <br />
                  旅程「{trip.title}」とすべてのページ・ブロックが削除されます。
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
