import { useAtomValue } from 'jotai';
import { RefreshCw, WifiOff } from 'lucide-react';
import { isOfflineReadAtom } from '@/atoms/network';
import { useRefresh } from '@/hooks/useRefresh';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

type NetworkStatusButtonViewProps = {
  isOffline: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  className?: string;
};

export const NetworkStatusButtonView = ({
  isOffline,
  isRefreshing,
  onRefresh,
  className,
}: NetworkStatusButtonViewProps) => {
  if (isOffline) {
    return (
      <div className={cn('flex items-center gap-1.5 text-12px text-gray-500 sm:text-14px', className)}>
        <WifiOff className='size-4' />
        <span className='hidden text-nowrap sm:inline'>オフラインモード</span>
        <Button
          variant='ghost'
          size='sm'
          className='h-7 gap-1 px-2 text-10px sm:text-12px'
          onClick={onRefresh}
          loading={isRefreshing}
        >
          {!isRefreshing && <RefreshCw className='size-3.5' />}
          <span className='hidden sm:inline'>再接続</span>
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant='ghost'
      size='sm'
      className={cn('h-7 gap-1 px-2 text-10px text-gray-500 sm:text-12px', className)}
      onClick={onRefresh}
      loading={isRefreshing}
    >
      {!isRefreshing && <RefreshCw className='size-3.5' />}
      <span className='hidden sm:inline'>更新</span>
    </Button>
  );
};

export const NetworkStatusButton = ({ className }: { className?: string }) => {
  const isOffline = useAtomValue(isOfflineReadAtom);
  const { isRefreshing, refresh } = useRefresh();

  return (
    <NetworkStatusButtonView
      isOffline={isOffline}
      isRefreshing={isRefreshing}
      onRefresh={refresh}
      className={className}
    />
  );
};
