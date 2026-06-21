import { useEffect, useId, useState } from 'react';
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
import { DateRangePicker } from '@/components/ui/date-picker';
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
  const titleId = useId();
  const dateId = useId();
  const detailId = useId();
  const [tripTitle, setTripTitle] = useState(trip.title);
  const [tripDetail, setTripDetail] = useState(trip.detail ?? '');
  const [startDate, setStartDate] = useState<Date | null>(trip.startDate ?? null);
  const [endDate, setEndDate] = useState<Date | null>(trip.endDate ?? null);
  const { updateTrip } = useUpdateTrip();
  const { deleteTrip } = useDeleteTrip();
  const { removeVisitedTrip } = useVisitedTrips();

  // ダイアログが開いたときにフォームを初期化
  useEffect(() => {
    if (open) {
      setTripTitle(trip.title);
      setTripDetail(trip.detail ?? '');
      setStartDate(trip.startDate ?? null);
      setEndDate(trip.endDate ?? null);
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

    updateTrip({
      id: trip.id,
      data: {
        title: trimmedTitle,
        detail: trimmedDetail || undefined,
        peopleNum: trip.peopleNum,
        startDate,
        endDate,
      },
    });

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
              <Label htmlFor={titleId}>
                旅程タイトル<span className='text-red-500'>*</span>
              </Label>
              <Input
                id={titleId}
                value={tripTitle}
                onChange={e => setTripTitle(e.target.value)}
                placeholder='旅程のタイトル'
                required
                maxLength={TRIP_TITLE_MAX_LENGTH}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor={dateId}>期間</Label>
              <DateRangePicker
                id={dateId}
                start={startDate}
                end={endDate}
                onChange={(s, e) => {
                  setStartDate(s);
                  setEndDate(e);
                }}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor={detailId}>旅程全体メモ</Label>
              <LazyMarkdownEditor
                className='max-h-72'
                id={detailId}
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
