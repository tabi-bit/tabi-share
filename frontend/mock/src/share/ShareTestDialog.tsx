import { BOTTOM_DIALOG_CLASS } from '@mock/stepFlow/stepDialog';
import { useAtomValue } from 'jotai';
import { Copy, Download, ImageIcon, LoaderCircle, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { selectedPageAtom, tripAtom, tripPagesAtom } from '@/atoms/tripPage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBlocks } from '@/hooks/useBlocks';
import { formatDateMDWithDow, formatTripRangeMD } from '@/lib/date';
import { cn } from '@/lib/utils';
import { buildShareImage } from './buildShareImage';

interface ShareTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type VariantKey = 'imageText' | 'imageTextUrl' | 'image' | 'textUrl';

type Variant = { key: VariantKey; label: string; description: string };

const VARIANTS: Variant[] = [
  { key: 'imageText', label: '画像 ＋ テキスト', description: 'URL はテキストの中に入れる' },
  {
    key: 'imageTextUrl',
    label: '画像 ＋ テキスト ＋ URL',
    description: 'URL を別の欄で渡す。アプリによっては捨てられる',
  },
  { key: 'image', label: '画像だけ', description: '' },
  { key: 'textUrl', label: 'テキスト ＋ URL（今の共有）', description: '' },
];

const formatTime = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

const describeError = (error: unknown): string => {
  if (error instanceof DOMException) {
    if (error.name === 'AbortError') return 'キャンセルされました';
    if (error.name === 'NotAllowedError') return '止められました（NotAllowedError。タップから時間が空きすぎた可能性）';
    return `${error.name}: ${error.message}`;
  }
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
};

/**
 * [mock] Web Share API で画像とテキストを一緒に共有する検証用のダイアログ。
 * 共有先のアプリによって、画像と一緒に渡したテキストや URL を捨てることがあるため、組み合わせを切り替えて試す。
 * share() はタップの直後に呼ばないと止められるので、画像はダイアログを開いた時点で作っておく
 */
export function ShareTestDialog({ open, onOpenChange }: ShareTestDialogProps) {
  const trip = useAtomValue(tripAtom);
  const pages = useAtomValue(tripPagesAtom);
  const selectedPage = useAtomValue(selectedPageAtom);
  const page = selectedPage ?? pages[0] ?? null;
  const { blocks } = useBlocks(open ? (page?.id ?? null) : null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ id: number; text: string }[]>([]);
  const addLog = (text: string) => setLogs(l => [{ id: Date.now() + Math.random(), text }, ...l]);

  const url = window.location.href;
  const period = trip ? formatTripRangeMD(trip.startDate, trip.endDate) : null;
  const text = [trip?.title, period].filter(Boolean).join('\n');
  const dayLabel = page
    ? [page.date ? formatDateMDWithDow(page.date) : null, page.title].filter(Boolean).join(' ')
    : null;
  const scheduleKey = (blocks ?? [])
    .filter(b => b.type === 'schedule')
    .map(b => `${b.id}:${b.title}:${b.startTime.getTime()}`)
    .join('|');

  // biome-ignore lint/correctness/useExhaustiveDependencies: 予定の中身が変わったときだけ作り直す (scheduleKey で代表させる)
  useEffect(() => {
    if (!(open && trip && blocks)) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setFile(null);
    buildShareImage({
      title: trip.title,
      period,
      dayLabel,
      schedules: blocks
        .filter(b => b.type === 'schedule')
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
        .map(b => ({ time: formatTime(b.startTime), title: b.title })),
      host: window.location.host,
    })
      .then(built => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(built);
        setFile(built);
        setPreviewUrl(objectUrl);
      })
      .catch(error => addLog(`画像を作れませんでした: ${describeError(error)}`));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, trip?.title, period, dayLabel, scheduleKey]);

  const dataOf = (key: VariantKey): ShareData | null => {
    if (key === 'textUrl') return { title: trip?.title, text, url };
    if (!file) return null;
    if (key === 'imageText') return { files: [file], text: `${text}\n${url}` };
    if (key === 'imageTextUrl') return { files: [file], title: trip?.title, text, url };
    return { files: [file] };
  };

  const canShare = (data: ShareData | null) => {
    if (!(data && 'share' in navigator)) return false;
    try {
      return navigator.canShare ? navigator.canShare(data) : !data.files;
    } catch {
      return false;
    }
  };

  const share = async (variant: Variant) => {
    const data = dataOf(variant.key);
    if (!data) return;
    try {
      await navigator.share(data);
      addLog(`${variant.label}: 共有しました`);
    } catch (error) {
      addLog(`${variant.label}: ${describeError(error)}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(BOTTOM_DIALOG_CLASS, 'max-sm:max-h-[94dvh]')}>
        <DialogHeader className='text-left'>
          <DialogTitle className='text-18px'>共有の試し</DialogTitle>
          <DialogDescription className='text-12px leading-relaxed'>
            画像とテキストをいっしょに共有できるかを試します。共有先のアプリで、何が届いたかを見てください。
          </DialogDescription>
        </DialogHeader>
        <div className='flex min-h-0 flex-col gap-3 overflow-y-auto'>
          <div className='relative aspect-[1200/630] w-full overflow-hidden rounded-lg border bg-neutral-50'>
            {previewUrl ? (
              <img src={previewUrl} alt='共有する画像のプレビュー' className='size-full object-cover' />
            ) : (
              <span className='absolute inset-0 flex items-center justify-center gap-2 text-12px text-neutral-500'>
                <LoaderCircle className='size-4 animate-spin' />
                画像を作っています
              </span>
            )}
          </div>
          <div className='flex flex-col gap-2'>
            {VARIANTS.map(variant => {
              const data = dataOf(variant.key);
              const supported = canShare(data);
              return (
                <Button
                  key={variant.key}
                  variant={variant.key === 'imageText' ? 'default' : 'outline'}
                  disabled={!supported}
                  onClick={() => share(variant)}
                  className='h-auto justify-start gap-3 whitespace-normal py-2.5 text-left sm:h-auto'
                >
                  {variant.key === 'textUrl' ? <Share2 /> : <ImageIcon />}
                  <span className='flex flex-col'>
                    <span className='font-medium text-14px'>{variant.label}</span>
                    <span className='font-normal text-12px opacity-80'>
                      {data == null
                        ? '画像を作っています…'
                        : !supported
                          ? 'この端末・ブラウザでは使えません'
                          : variant.description}
                    </span>
                  </span>
                </Button>
              );
            })}
            <div className='flex flex-wrap gap-1'>
              <Button
                variant='ghost'
                size='sm'
                className='text-neutral-600'
                onClick={async () => {
                  await navigator.clipboard.writeText(url);
                  toast.success('URLをコピーしました');
                }}
              >
                <Copy />
                URL をコピー
              </Button>
              {previewUrl && (
                <Button asChild variant='ghost' size='sm' className='text-neutral-600'>
                  <a href={previewUrl} download='tabishare-trip.png'>
                    <Download />
                    画像を保存する
                  </a>
                </Button>
              )}
            </div>
          </div>
          {logs.length > 0 && (
            <ol className='flex flex-col gap-1 rounded-lg bg-neutral-50 p-2.5 text-12px text-neutral-700'>
              {logs.slice(0, 6).map(log => (
                <li key={log.id}>{log.text}</li>
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
