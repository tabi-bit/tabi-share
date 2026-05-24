import { ChevronRightIcon } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-picker';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LazyMarkdownEditor } from '@/components/ui/markdown';
import { useCreateTrip } from '@/hooks/useTrips';
import { type CreateTripFromApi, TRIP_TITLE_MAX_LENGTH } from '@/types/trip';

interface AddTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (trip: CreateTripFromApi) => void;
}

export const AddTripDialog = ({ open, onOpenChange, onCreated }: AddTripDialogProps) => {
  const titleId = useId();
  const dateId = useId();
  const detailId = useId();
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { createTrip, isCreating } = useCreateTrip();

  // ダイアログが開いたときにフォームを初期化
  useEffect(() => {
    if (open && !isCreating) {
      setTitle('');
      setDetail('');
      setStartDate(null);
      setEndDate(null);
      setDetailOpen(false);
    }
  }, [open, isCreating]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      return;
    }

    const newTrip = await createTrip({
      title: title.trim(),
      detail: detail.trim() || undefined,
      peopleNum: undefined,
      startDate,
      endDate,
    });

    if (newTrip) {
      onCreated?.(newTrip);
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
          <DialogTitle>旅程を追加</DialogTitle>
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
                placeholder='例: 箱根温泉旅行'
                required
                maxLength={TRIP_TITLE_MAX_LENGTH}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor={dateId}>
                期間
                <span className='ml-1 text-muted-foreground text-xs'>（任意）</span>
              </Label>
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

            <button
              type='button'
              onClick={() => setDetailOpen(prev => !prev)}
              className='flex w-full items-center gap-1 rounded border border-input px-3 py-2 text-left text-muted-foreground text-sm hover:bg-accent'
              aria-expanded={detailOpen}
              aria-controls={detailId}
            >
              <ChevronRightIcon className={`size-4 transition-transform ${detailOpen ? 'rotate-90' : ''}`} />
              <span>詳細を追加（任意）</span>
            </button>
            {detailOpen && (
              <div id={detailId} className='space-y-2'>
                <LazyMarkdownEditor
                  className='max-h-72'
                  id={`${detailId}-editor`}
                  value={detail}
                  onChange={setDetail}
                  placeholder='旅程の詳細や目的など（省略可）'
                />
              </div>
            )}
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
