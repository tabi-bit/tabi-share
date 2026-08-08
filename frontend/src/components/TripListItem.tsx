import { Archive, ArchiveRestore } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { formatTripRangeYMD } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { Trip } from '@/types/trip';

interface TripListItemProps {
  trip: Trip;
  /** アーカイブ済み一覧に表示しているか。減光表示とボタンの向きが変わる */
  archived: boolean;
  /** 退出アニメーション中か */
  leaving: boolean;
  disabled: boolean;
  onToggleArchive: (trip: Trip) => void;
}

/**
 * ホーム一覧の 1 行。左のリンクが行の高さ全体を占め、右にアーカイブ操作を並べる。
 * `<a>` に `<button>` を入れ子にできないため、両者を兄弟として配置している。
 */
export const TripListItem = ({ trip, archived, leaving, disabled, onToggleArchive }: TripListItemProps) => {
  const rangeText = formatTripRangeYMD(trip.startDate, trip.endDate);

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
            'mb-3 flex items-stretch overflow-hidden rounded-lg transition-all duration-150 motion-reduce:transition-none',
            archived ? 'border border-gray-300 bg-white/60' : 'bg-white shadow-sm hover:shadow-md',
            leaving && 'translate-x-2'
          )}
        >
          <Link
            to={`/trip/${trip.urlId}`}
            className='flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-4 pr-2 pl-4'
          >
            <h3 className={cn('truncate font-semibold text-16px', archived ? 'text-gray-500' : 'text-gray-900')}>
              {trip.title}
            </h3>
            {rangeText && <p className={cn('text-12px', archived ? 'text-gray-400' : 'text-gray-500')}>{rangeText}</p>}
          </Link>
          <Button
            aria-label={`「${trip.title}」を${archived ? '旅程一覧に戻す' : 'アーカイブ'}`}
            className='h-auto w-14 shrink-0 self-stretch rounded-none text-gray-400 hover:bg-teal-500/10 hover:text-teal-700'
            disabled={disabled}
            onClick={() => onToggleArchive(trip)}
            size='icon'
            variant='ghost'
          >
            {archived ? <ArchiveRestore className='size-5' /> : <Archive className='size-5' />}
          </Button>
        </div>
      </div>
    </li>
  );
};
