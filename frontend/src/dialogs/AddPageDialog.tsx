import { AlertTriangleIcon } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePage } from '@/hooks/usePages';
import { formatTripRangeYMD, isDateOutsideRange } from '@/lib/date';
import { PAGE_TITLE_MAX_LENGTH, type Page } from '@/types';
import type { Trip } from '@/types/trip';

interface AddPageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 親 Trip。tripId と日付範囲ハイライト・警告判定に使用 */
  trip: Trip;
  onCreated?: (page: Page) => void;
}

export const AddPageDialog = ({ open, onOpenChange, trip, onCreated }: AddPageDialogProps) => {
  const titleId = useId();
  const dateId = useId();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const { createPage, isCreating } = useCreatePage(trip.id);

  const isOutsideRange = isDateOutsideRange(date, trip.startDate, trip.endDate);
  const tripRangeText = formatTripRangeYMD(trip.startDate, trip.endDate);

  // ダイアログが開いたときにフォームを初期化
  useEffect(() => {
    if (open && !isCreating) {
      setTitle('');
      setDate(null);
    }
  }, [open, isCreating]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      return;
    }

    const newPage = await createPage({ title: title.trim(), detail: '', tripId: trip.id, date });
    if (newPage) {
      onCreated?.(newPage);
      onOpenChange(false);
    }
  };

  // 作成中はダイアログを閉じない
  const handleOpenChange = (next: boolean) => {
    if (!next && isCreating) return;
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onInteractOutside={e => {
          if (isCreating) e.preventDefault();
        }}
        onEscapeKeyDown={e => {
          if (isCreating) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>ページを追加</DialogTitle>
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
              <Label htmlFor={dateId}>
                日付
                <span className='ml-1 text-muted-foreground text-xs'>（任意）</span>
              </Label>
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

        <DialogFooter>
          <Button variant='outline' onClick={() => handleOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()} loading={isCreating}>
            追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
