import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [peopleNum, setPeopleNum] = useState<number | undefined>(undefined);
  const { createTrip } = useCreateTrip();

  const handleSubmit = async () => {
    if (!title.trim()) {
      return;
    }

    const newTrip = await createTrip({
      title: title.trim(),
      detail: detail.trim() || undefined,
      peopleNum: peopleNum,
    });

    if (newTrip) {
      onCreated?.(newTrip);
      onOpenChange(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTitle('');
      setDetail('');
      setPeopleNum(undefined);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>旅程を追加</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='add-trip-title'>
                タイトル<span className='text-red-500'>*</span>
              </Label>
              <Input
                id='add-trip-title'
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder='例: 箱根温泉旅行'
                required
                maxLength={TRIP_TITLE_MAX_LENGTH}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='add-trip-detail'>詳細</Label>
              <LazyMarkdownEditor
                className='max-h-72'
                id='add-trip-detail'
                value={detail}
                onChange={setDetail}
                placeholder='旅程の詳細や目的など'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='add-trip-people-num'>人数</Label>
              <Input
                id='add-trip-people-num'
                type='number'
                min='1'
                value={peopleNum ?? ''}
                onChange={e => {
                  const parsed = parseInt(e.target.value, 10);
                  setPeopleNum(!Number.isNaN(parsed) && parsed >= 1 ? parsed : undefined);
                }}
                placeholder='例: 4'
              />
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant='outline' onClick={() => handleOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
