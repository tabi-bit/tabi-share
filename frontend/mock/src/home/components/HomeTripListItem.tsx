import { Archive, ArchiveRestore } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { formatTripRangeMD } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { Trip } from '@/types/trip';
import { isPastTrip } from '../status';

interface HomeTripListItemProps {
  trip: Trip;
  to: string;
  /** アーカイブ済み一覧に表示しているか。減光表示とボタンの向きが変わる */
  archived: boolean;
  /** 退出アニメーション中か */
  leaving: boolean;
  disabled: boolean;
  /** PC のサイドバー用の詰めた表示 */
  compact?: boolean;
  onToggleArchive: (trip: Trip) => void;
}

/**
 * ホーム一覧の 1 行。TripListItem と同じく、`<a>` と `<button>` を兄弟に置く。
 * 行全体のリンク先を旅の段階で変え、PC サイドバー用の詰めた表示を持つ。
 */
export const HomeTripListItem = ({
  trip,
  to,
  archived,
  leaving,
  disabled,
  compact = false,
  onToggleArchive,
}: HomeTripListItemProps) => {
  const rangeText = formatTripRangeMD(trip.startDate, trip.endDate) ?? '日程未定';

  return (
    <li
      className={cn(
        'grid transition-all duration-150 ease-out motion-reduce:transition-none',
        leaving ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]'
      )}
    >
      <div className='overflow-hidden'>
        <div
          className={cn(
            'flex items-stretch overflow-hidden rounded-lg transition-all duration-150 motion-reduce:transition-none',
            compact ? 'mb-1.5' : 'mb-3',
            archived || isPastTrip(trip) ? 'border border-gray-200 bg-white/60' : 'bg-white shadow-sm hover:shadow-md',
            leaving && 'translate-x-2'
          )}
        >
          <Link
            to={to}
            className={cn(
              'flex min-w-0 flex-1 flex-col justify-center gap-1',
              compact ? 'py-2 pr-1 pl-3' : 'py-3.5 pr-2 pl-4'
            )}
          >
            <div className='flex min-w-0 items-center gap-2'>
              <h3
                className={cn(
                  'truncate font-semibold',
                  compact ? 'text-14px' : 'text-16px',
                  archived ? 'text-gray-500' : 'text-gray-900'
                )}
              >
                {trip.title}
              </h3>
            </div>
            <p className={cn('whitespace-nowrap text-12px', archived ? 'text-gray-400' : 'text-gray-500')}>
              {rangeText}
            </p>
          </Link>
          <Button
            aria-label={`「${trip.title}」を${archived ? '旅程一覧に戻す' : 'アーカイブ'}`}
            className={cn(
              'h-auto shrink-0 self-stretch rounded-none text-gray-400 hover:bg-teal-500/10 hover:text-teal-700',
              compact ? 'w-9' : 'w-14'
            )}
            disabled={disabled}
            onClick={() => onToggleArchive(trip)}
            size='icon'
            variant='ghost'
          >
            {archived ? (
              <ArchiveRestore className={compact ? 'size-4' : 'size-5'} />
            ) : (
              <Archive className={compact ? 'size-4' : 'size-5'} />
            )}
          </Button>
        </div>
      </div>
    </li>
  );
};
