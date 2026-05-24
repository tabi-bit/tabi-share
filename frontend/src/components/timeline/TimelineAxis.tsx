import { cn } from '@/lib/utils';
import { DottedLine } from './DottedLine';
import { formatTime } from './formatTime';

interface TimelineAxisProps {
  startTime: Date;
  endTime: Date | null;
  isConnectedWithNext: boolean;
  isLastItem: boolean;
  themeColor: string;
}

export function TimelineAxis({ startTime, endTime, isConnectedWithNext, isLastItem, themeColor }: TimelineAxisProps) {
  return (
    <div className='flex flex-row gap-2'>
      <div className='flex flex-col justify-between'>
        <div className='flex h-6 flex-row items-center font-medium text-14px text-gray-700 sm:h-8 sm:text-18px'>
          {formatTime(startTime)}
        </div>
        {!isConnectedWithNext && endTime && (
          <div className='flex h-6 flex-row items-center font-medium text-14px text-gray-700 sm:h-8 sm:text-18px'>
            {formatTime(endTime)}
          </div>
        )}
      </div>
      <div className='flex min-h-24 flex-col items-center justify-between'>
        <div className={cn('h-6 w-6 shrink-0 rounded-full sm:h-8 sm:w-8', themeColor)} />
        {endTime ? (
          <div className={cn('-my-4 h-full w-2', themeColor)}></div>
        ) : (
          !isLastItem && <DottedLine className='h-full self-end' />
        )}
        {!isConnectedWithNext && endTime && (
          <div className={cn('h-6 w-6 shrink-0 rounded-full sm:h-8 sm:w-8', themeColor)} />
        )}
      </div>
    </div>
  );
}
