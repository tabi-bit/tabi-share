import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { cn } from '@/lib/utils';

const PwaInstallBanner = ({ className, ...props }: React.ComponentProps<'div'>) => {
  const { isReady, installApp } = usePWAInstall();

  if (!isReady) return null;

  return (
    <div
      className={cn('flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50 p-3', className)}
      {...props}
    >
      <span className='text-14px text-gray-700'>アプリとしてインストールできます</span>
      <Button onClick={installApp} variant='outline' size='sm' className='gap-1.5'>
        <Download className='size-4' />
        インストール
      </Button>
    </div>
  );
};

export { PwaInstallBanner };
