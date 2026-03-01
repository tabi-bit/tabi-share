import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePage } from '@/hooks/usePages';
import type { Page } from '@/types';

interface AddPageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: number;
  onCreated?: (page: Page) => void;
}

export const AddPageDialog = ({ open, onOpenChange, tripId, onCreated }: AddPageDialogProps) => {
  const [title, setTitle] = useState('');
  const { createPage } = useCreatePage(tripId);

  const handleSubmit = async () => {
    if (!title.trim()) {
      return;
    }

    const newPage = await createPage({ title: title.trim(), detail: '', tripId });
    if (newPage) {
      onCreated?.(newPage);
      setTitle('');
      onOpenChange(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTitle('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>ページを追加</DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='add-page-title'>タイトル</Label>
            <Input
              id='add-page-title'
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder='ページのタイトル'
            />
          </div>
        </div>

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
