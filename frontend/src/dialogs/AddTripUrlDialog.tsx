import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { TripUrlFormatSection } from '@/components/tripUrl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LazyMarkdownEditor } from '@/components/ui/markdown';
import { useCreateTripUrl, usePreviewTripUrl } from '@/hooks/useTripUrls';
import { TRIP_URL_TITLE_MAX_LENGTH } from '@/types';

interface AddTripUrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: number;
}

const isValidHttpUrl = (value: string): boolean => {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const appendMarkdown = (existing: string, additional: string): string =>
  existing.trim() ? `${existing}\n\n${additional}` : additional;

export const AddTripUrlDialog = ({ open, onOpenChange, tripId }: AddTripUrlDialogProps) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [memo, setMemo] = useState('');

  const { previewTripUrl, isPreviewing } = usePreviewTripUrl(tripId);
  const { createTripUrl, isCreating } = useCreateTripUrl(tripId);

  // ダイアログが開いた時にフォームを初期化
  useEffect(() => {
    if (open && !isCreating) {
      setUrl('');
      setTitle('');
      setThumbnailUrl(null);
      setMemo('');
    }
  }, [open, isCreating]);

  const handleFetchMetadata = async () => {
    if (!isValidHttpUrl(url)) {
      toast.error('有効な URL を入力してください');
      return;
    }
    const preview = await previewTripUrl({ url });
    if (!preview) return;

    setTitle(preview.title ?? '');
    setThumbnailUrl(preview.thumbnailUrl ?? null);

    if (!(preview.title || preview.thumbnailUrl)) {
      toast.info('メタ情報を取得できませんでした。タイトルは手で入力できます。');
    }
  };

  const handleSubmit = async () => {
    if (!isValidHttpUrl(url)) {
      toast.error('有効な URL を入力してください');
      return;
    }
    const created = await createTripUrl({
      url,
      title: title.trim() ? title.trim() : null,
      thumbnailUrl,
      memo: memo.trim() ? memo : null,
    });
    if (created) {
      onOpenChange(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && (isCreating || isPreviewing)) return;
    onOpenChange(next);
  };

  const isBusy = isCreating || isPreviewing;
  const canSubmit = isValidHttpUrl(url) && !isBusy;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        size='large'
        onInteractOutside={e => {
          if (isBusy) e.preventDefault();
        }}
        onEscapeKeyDown={e => {
          if (isBusy) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>URL ストックを追加</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='add-trip-url-url'>
                URL<span className='text-red-500'>*</span>
              </Label>
              <div className='flex gap-2'>
                <Input
                  id='add-trip-url-url'
                  type='url'
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder='https://example.com/...'
                  required
                />
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleFetchMetadata}
                  loading={isPreviewing}
                  disabled={!isValidHttpUrl(url) || isBusy}
                >
                  メタ情報取得
                </Button>
              </div>
              <p className='text-12px text-muted-foreground'>
                「メタ情報取得」を押すとタイトル・サムネを自動で埋めます。スキップして手で入力しても OK です。
              </p>
            </div>

            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt=''
                className='max-h-48 w-full rounded-md border object-cover'
                onError={() => setThumbnailUrl(null)}
              />
            )}

            <div className='space-y-2'>
              <Label htmlFor='add-trip-url-title'>タイトル</Label>
              <Input
                id='add-trip-url-title'
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder='ページのタイトル'
                maxLength={TRIP_URL_TITLE_MAX_LENGTH}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='add-trip-url-memo'>メモ（markdown）</Label>
              <LazyMarkdownEditor
                id='add-trip-url-memo'
                value={memo}
                onChange={setMemo}
                placeholder='自由記述。下の「AI で整形」で生成した markdown が末尾に追記されます。'
              />
            </div>

            <TripUrlFormatSection
              tripId={tripId}
              open={open}
              onAppend={markdown => setMemo(prev => appendMarkdown(prev, markdown))}
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant='outline' onClick={() => handleOpenChange(false)} disabled={isBusy}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} loading={isCreating}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
