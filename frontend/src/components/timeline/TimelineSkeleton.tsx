import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface TimelineSkeletonProps {
  className?: string;
  itemCount?: number;
}

export function TimelineSkeleton({ className, itemCount = 3 }: TimelineSkeletonProps) {
  const items = Array.from({ length: itemCount }, (_, i) => `skeleton-item-${Date.now()}-${i}`);
  return (
    <div className={cn('grid grid-cols-[auto_1fr] gap-x-4', className)}>
      {items.map((key, index) => (
        <TimelineSkeletonItem key={key} isLast={index === items.length - 1} />
      ))}
    </div>
  );
}

function TimelineSkeletonItem({ isLast = false }: { isLast?: boolean }) {
  return (
    <div className='contents'>
      {/* 時間軸(左) */}
      <div className='flex flex-row gap-2'>
        <div className='flex flex-col justify-between gap-2'>
          <Skeleton className='h-8 w-16' />
        </div>
        <div className='flex min-h-24 flex-col items-center justify-between'>
          <Skeleton className='h-8 w-8 shrink-0 rounded-full' />
          <Skeleton className='h-full w-2 rounded-none' />
          {isLast && <Skeleton className='h-8 w-8 shrink-0 rounded-full' />}
        </div>
      </div>

      {/* ブロック内容(右) */}
      <div className='pb-4'>
        <Skeleton className='h-24 w-full rounded-lg' />
      </div>
    </div>
  );
}
