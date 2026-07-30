import { Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type IOSInstallInstructionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * iOS Safari で通知購読を試みた際、PWA 未 install なら表示する誘導ダイアログ。
 * iOS 16.4+ は「ホーム画面に追加」した状態でしか Web Push permission を取れないため、
 * ユーザに手順を明示する。
 */
export const IOSInstallInstructionDialog = ({ open, onOpenChange }: IOSInstallInstructionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>通知を受け取るにはインストールが必要です</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className='mb-3 text-14px text-slate-700 sm:text-16px'>
            iPhone / iPad で通知を受け取るには、Safari の共有メニューから「ホーム画面に追加」してください。
            追加後、ホーム画面のアイコンから起動して再度通知を有効化してください。
          </p>
          <ol className='list-decimal space-y-2 pl-6 text-12px text-slate-700 sm:text-14px'>
            <li className='flex items-center gap-2'>
              Safari 下部の共有ボタン
              <Share className='inline size-4' aria-label='共有ボタン' />
              をタップ
            </li>
            <li>メニューから「ホーム画面に追加」を選択</li>
            <li>右上の「追加」をタップ</li>
            <li>ホーム画面の「たびしぇあ」アイコンから起動</li>
            <li>再度この画面のベルアイコンをタップして通知を有効化</li>
          </ol>
        </DialogBody>
        <DialogFooter>
          <Button variant='default' onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
