import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDismissible } from '@/hooks/useDismissible';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { cn } from '@/lib/utils';

/**
 * PWA としてホーム画面へのインストール可能な環境で表示されるバナー。
 *
 * - `usePWAInstall().isReady` が false なら非表示 (Android Chrome の
 *   `beforeinstallprompt` が来ていない、iOS など)
 * - 閉じるボタンで dismiss (IndexedDB 永続化)。dismiss しても Header
 *   メニューの「アプリとしてインストール」から同じ動線を辿れる
 */
const PwaInstallBanner = ({ className, ...props }: React.ComponentProps<'div'>) => {
  const { isReady, installApp } = usePWAInstall();
  const dismissible = useDismissible('pwaInstallBanner.dismissed');

  if (!isReady) return null;
  if (!dismissible.isLoaded || dismissible.dismissed) return null;

  return (
    <div
      className={cn('flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50 p-3', className)}
      {...props}
    >
      <span className='text-14px text-gray-700'>アプリとしてインストールできます</span>
      <div className='flex items-center gap-2'>
        <Button className='gap-1.5' onClick={installApp} size='sm' variant='outline'>
          <Download className='size-4' />
          インストール
        </Button>
        <button
          aria-label='閉じる'
          className='text-gray-400 hover:text-gray-600'
          onClick={dismissible.dismiss}
          type='button'
        >
          <X className='size-4' />
        </button>
      </div>
    </div>
  );
};

export { PwaInstallBanner };
