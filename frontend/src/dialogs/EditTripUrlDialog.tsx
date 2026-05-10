import { useEffect, useState } from 'react';
import { TripUrlFormatSection } from '@/components/tripUrl';
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
import { LazyMarkdownEditor } from '@/components/ui/markdown';
import { useDeleteTripUrl, useUpdateTripUrl } from '@/hooks/useTripUrls';
import { TRIP_URL_TITLE_MAX_LENGTH, type TripUrl } from '@/types';

interface EditTripUrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripUrl: TripUrl;
}

const appendMarkdown = (existing: string, additional: string): string =>
  existing.trim() ? `${existing}\n\n${additional}` : additional;

export const EditTripUrlDialog = ({ open, onOpenChange, tripUrl }: EditTripUrlDialogProps) => {
  const [title, setTitle] = useState(tripUrl.title ?? '');
  const [memo, setMemo] = useState(tripUrl.memo ?? '');
  const { updateTripUrl } = useUpdateTripUrl(tripUrl.tripId);
  const { deleteTripUrl } = useDeleteTripUrl(tripUrl.tripId);

  useEffect(() => {
    if (open) {
      setTitle(tripUrl.title ?? '');
      setMemo(tripUrl.memo ?? '');
    }
  }, [open, tripUrl]);

  // 削除（楽観更新で fire-and-forget）
  const handleDelete = () => {
    deleteTripUrl(tripUrl.id);
    onOpenChange(false);
  };

  // 更新（楽観更新で fire-and-forget）
  const handleSubmit = () => {
    const nextTitle = title.trim();
    const nextMemo = memo.trim();
    const titleChanged = (nextTitle || null) !== (tripUrl.title ?? null);
    const memoChanged = (nextMemo || null) !== (tripUrl.memo ?? null);

    if (titleChanged || memoChanged) {
      updateTripUrl({
        id: tripUrl.id,
        data: {
          url: tripUrl.url,
          title: nextTitle ? nextTitle : null,
          thumbnailUrl: tripUrl.thumbnailUrl ?? null,
          memo: nextMemo ? nextMemo : null,
        },
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='large'>
        <DialogHeader>
          <DialogTitle>URL ストックを編集</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>URL</Label>
              <a
                href={tripUrl.url}
                target='_blank'
                rel='noopener noreferrer'
                className='block truncate text-14px text-primary hover:underline'
              >
                {tripUrl.url}
              </a>
            </div>

            {tripUrl.thumbnailUrl && (
              <img src={tripUrl.thumbnailUrl} alt='' className='max-h-48 w-full rounded-md border object-cover' />
            )}

            <div className='space-y-2'>
              <Label htmlFor='edit-trip-url-title'>タイトル</Label>
              <Input
                id='edit-trip-url-title'
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={TRIP_URL_TITLE_MAX_LENGTH}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='edit-trip-url-memo'>メモ（markdown）</Label>
              <LazyMarkdownEditor id='edit-trip-url-memo' value={memo} onChange={setMemo} placeholder='メモを入力' />
            </div>

            <TripUrlFormatSection
              tripId={tripUrl.tripId}
              open={open}
              onAppend={markdown => setMemo(prev => appendMarkdown(prev, markdown))}
            />
          </div>
        </DialogBody>

        <DialogFooter className='flex justify-between'>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant='destructive' className='mr-auto'>
                削除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>URL ストックを削除しますか?</AlertDialogTitle>
                <AlertDialogDescription>
                  この操作は取り消せません。「{tripUrl.title || tripUrl.url}」を削除します。
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
