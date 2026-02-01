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
        'sticky top-0 right-0 left-0 z-10 flex w-full flex-col justify-center gap-1 bg-teal-50/80 px-6 py-2 backdrop-blur-sm',
        className
      )}
    >
      {/* Logo */}
      <div className='pointer-events-none'>
        <Logo size='medium' />
      </div>

      {/* グリッドレイアウト */}
      <div className='grid grid-cols-[1fr_auto_1fr] items-center gap-4'>
        {/* 左カラム: trip.title */}
        <div className='flex justify-end'>
          <Skeleton className='h-7 w-32' />
        </div>

        {/* 中央カラム: ページセレクト */}
        <Skeleton className='h-10 w-40' />

        {/* 右カラム: ボタン */}
        <div className='flex flex-row justify-start gap-x-4'>
          <Skeleton className='h-10 w-32' />
        </div>
      </div>
    </div>
  );
}
