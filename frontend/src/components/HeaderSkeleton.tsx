import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import { Skeleton } from './ui/skeleton';

interface HeaderSkeletonProps {
  className?: string;
}

export function HeaderSkeleton({ className }: HeaderSkeletonProps) {
  return (
    <div
      data-component='header-skeleton'
      className={cn(
        'z-10 flex w-full flex-col justify-center gap-1 bg-teal-50/80 px-2 py-2 backdrop-blur-sm',
        className
      )}
    >
      {/* Logo */}
      <div className='pointer-events-none flex w-full flex-row justify-center'>
        <Logo size='medium' />
      </div>

      {/* グリッドレイアウト */}
      <div className='grid grid-cols-1 gap-4 gap-x-4 gap-y-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center'>
        {/* 左カラム: trip.title */}
        <div className='flex justify-start sm:justify-end'>
          <Skeleton className='h-6 w-32 sm:h-7' />
        </div>

        {/* 中央カラム: ページセレクト */}
        <Skeleton className='h-9 w-40' />
        {/* 右カラム: ボタン */}
        <div className='flex flex-row justify-start gap-x-4'>
          <Skeleton className='h-9 w-32' />
        </div>
      </div>
    </div>
  );
}
