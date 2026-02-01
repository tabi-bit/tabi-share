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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDeletePage, useUpdatePage } from '@/hooks/usePages';
import type { Page } from '@/types';

interface EditPageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: Page;
  onDeleted?: (pageId: number) => void;
}

export const EditPageDialog = ({ open, onOpenChange, page, onDeleted }: EditPageDialogProps) => {
  const [title, setTitle] = useState(page.title);
  const { updatePage } = useUpdatePage(page.tripId);
  const { deletePage } = useDeletePage(page.tripId);

  // ダイアログが開いたときにフォームを初期化
  useEffect(() => {
    if (open) {
      setTitle(page.title);
    }
  }, [open, page]);

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

    await updatePage({ id: page.id, data: { title: title.trim(), detail: page.detail, tripId: page.tripId } });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>ページ情報の編集</DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
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

        <DialogFooter className='flex justify-between'>
          {/* 左側: 削除ボタン */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant='destructive'>削除</Button>
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

          {/* 右側: キャンセル・更新ボタン */}
          <div className='flex gap-2'>
            <Button variant='outline' onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit}>更新</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
