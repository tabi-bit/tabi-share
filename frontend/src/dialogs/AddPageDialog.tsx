import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePage } from '@/hooks/usePages';
import { PAGE_TITLE_MAX_LENGTH, type Page } from '@/types';

interface AddPageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: number;
  onCreated?: (page: Page) => void;
}

export const AddPageDialog = ({ open, onOpenChange, tripId, onCreated }: AddPageDialogProps) => {
  const [title, setTitle] = useState('');
  const { createPage, isCreating } = useCreatePage(tripId);

  // ダイアログが開いたときにフォームを初期化
  useEffect(() => {
    if (open && !isCreating) {
      setTitle('');
    }
  }, [open, isCreating]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      return;
    }

    const newPage = await createPage({ title: title.trim(), detail: '', tripId });
    if (newPage) {
      onCreated?.(newPage);
      onOpenChange(false);
    }
  };

  // 作成中はダイアログを閉じない
  const handleOpenChange = (open: boolean) => {
    if (!open && isCreating) return;
    onOpenChange(open);
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
              <Label htmlFor='add-page-title'>
                タイトル<span className='text-red-500'>*</span>
              </Label>
              <Input
                id='add-page-title'
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder='ページのタイトル'
                required
                maxLength={PAGE_TITLE_MAX_LENGTH}
              />
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
