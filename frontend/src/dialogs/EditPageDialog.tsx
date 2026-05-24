import { AlertTriangleIcon } from 'lucide-react';
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
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDeletePage, useUpdatePage } from '@/hooks/usePages';
import { formatTripRangeYMD, isDateOutsideRange } from '@/lib/date';
import { PAGE_TITLE_MAX_LENGTH, type Page } from '@/types';
import type { Trip } from '@/types/trip';

interface EditPageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: Page;
  /** 親 Trip。日付範囲ハイライト・警告判定に使用 */
  trip: Trip;
  onDeleted?: (pageId: number) => void;
}

export const EditPageDialog = ({ open, onOpenChange, page, trip, onDeleted }: EditPageDialogProps) => {
  const titleId = useId();
  const dateId = useId();
  const [title, setTitle] = useState(page.title);
  const [date, setDate] = useState<Date | null>(page.date ?? null);
  const { updatePage } = useUpdatePage(page.tripId);
  const { deletePage } = useDeletePage(page.tripId);

  const isOutsideRange = isDateOutsideRange(date, trip.startDate, trip.endDate);
  const tripRangeText = formatTripRangeYMD(trip.startDate, trip.endDate);

  // ダイアログが開いたときにフォームを初期化
  useEffect(() => {
    if (open) {
      setTitle(page.title);
      setDate(page.date ?? null);
    }
  }, [open, page]);

  // 削除処理（楽観更新のためfire-and-forget）
  const handleDelete = () => {
    deletePage(page.id);
    onDeleted?.(page.id);
    onOpenChange(false);
  };

  // サブミット処理（楽観更新のためfire-and-forget）
  const handleSubmit = () => {
    if (!title.trim()) {
      return;
    }

    updatePage({
      id: page.id,
      data: { title: title.trim(), detail: page.detail, tripId: page.tripId, date },
    });

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
            <div className='space-y-2'>
              <Label htmlFor={titleId}>
                タイトル<span className='text-red-500'>*</span>
              </Label>
              <Input
                id={titleId}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder='ページのタイトル'
                required
                maxLength={PAGE_TITLE_MAX_LENGTH}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor={dateId}>日付</Label>
              <DatePicker
                id={dateId}
                value={date}
                onChange={setDate}
                highlightStart={trip.startDate}
                highlightEnd={trip.endDate}
                invalid={isOutsideRange}
              />
              {isOutsideRange && tripRangeText && (
                <p className='flex items-center gap-1 text-amber-600 text-xs'>
                  <AlertTriangleIcon className='size-3.5' />
                  旅行期間（{tripRangeText}）外の日付です
                </p>
              )}
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
