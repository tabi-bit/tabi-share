import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-picker';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LazyMarkdownEditor } from '@/components/ui/markdown/LazyMarkdownEditor';
import { useDeleteTrip, useUpdateTrip } from '@/hooks/useTrips';
import { useConfirm } from '@/lib/confirm';
import { isValidWalicaUrl } from '@/lib/walica';
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
  const walicaUrlId = useId();
  const [tripTitle, setTripTitle] = useState(trip.title);
  const [tripDetail, setTripDetail] = useState(trip.detail ?? '');
  const [startDate, setStartDate] = useState<Date | null>(trip.startDate ?? null);
  const [endDate, setEndDate] = useState<Date | null>(trip.endDate ?? null);
  const [walicaUrl, setWalicaUrl] = useState(trip.walicaUrl ?? '');
  const { updateTrip } = useUpdateTrip();
  const { deleteTrip } = useDeleteTrip();
  const confirm = useConfirm();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // ダイアログが開いたときにフォームを初期化
  useEffect(() => {
    if (open) {
      setTripTitle(trip.title);
      setTripDetail(trip.detail ?? '');
      setStartDate(trip.startDate ?? null);
      setEndDate(trip.endDate ?? null);
      setWalicaUrl(trip.walicaUrl ?? '');
    }
  }, [open, trip]);

  const trimmedWalicaUrl = walicaUrl.trim();
  const isWalicaUrlInvalid = trimmedWalicaUrl !== '' && !isValidWalicaUrl(trimmedWalicaUrl);

  // 削除処理（楽観更新のためfire-and-forget）
  const handleDelete = async () => {
    if (isConfirmingDelete) return;
    setIsConfirmingDelete(true);
    try {
      const ok = await confirm({
        title: '旅程を削除しますか?',
        description: `この操作は取り消せません。旅程「${trip.title}」とすべてのページ・ブロックが削除されます。`,
        confirmText: '削除',
        variant: 'destructive',
      });
      if (!ok) return;
      deleteTrip({ id: trip.id, urlId: trip.urlId }).catch(() => {
        // エラーは useDeleteTrip の onError がトーストで通知するため握り潰す
      });
      onDeleted?.();
      onOpenChange(false);
    } finally {
      setIsConfirmingDelete(false);
    }
  };

  // サブミット処理（楽観更新のためfire-and-forget）
  const handleSubmit = () => {
    const trimmedTitle = tripTitle.trim();
    const trimmedDetail = tripDetail.trim();

    if (!trimmedTitle || isWalicaUrlInvalid) {
      return;
    }

    updateTrip({
      trip,
      data: {
        title: trimmedTitle,
        detail: trimmedDetail || undefined,
        peopleNum: trip.peopleNum,
        startDate,
        endDate,
        walicaUrl: trimmedWalicaUrl || null,
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
            <div className='space-y-2'>
              <Label htmlFor={walicaUrlId}>WalicaのURL</Label>
              <Input
                id={walicaUrlId}
                type='url'
                value={walicaUrl}
                onChange={e => setWalicaUrl(e.target.value)}
                placeholder='https://walica.jp/...'
                aria-invalid={isWalicaUrlInvalid}
                aria-describedby={isWalicaUrlInvalid ? `${walicaUrlId}-error` : undefined}
              />
              {isWalicaUrlInvalid && (
                <p id={`${walicaUrlId}-error`} className='text-12px text-destructive'>
                  walica.jp の URL を入力してください
                </p>
              )}
            </div>
          </div>
        </DialogBody>

        <DialogFooter className='flex justify-between'>
          <Button variant='destructive' className='mr-auto' onClick={handleDelete} disabled={isConfirmingDelete}>
            削除
          </Button>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isWalicaUrlInvalid}>
            更新
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
