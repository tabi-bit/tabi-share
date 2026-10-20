import { highlightedBlockIdAtom } from '@mock/candidates/atoms';
import { BlockCandidateMarks } from '@mock/candidates/components/BlockCandidateMarks';
import { useAtomValue } from 'jotai';
import { Globe, MapPin } from 'lucide-react';
import { useRef, useState } from 'react';
import angleDownIcon from '@/assets/icons/angle-down-white.svg';
import { tripAtom } from '@/atoms/tripPage';
import type { ScheduleBlockComponentProps } from '@/components/blocks/types';
import { BlockNowBadge } from '@/components/timeline/NowIndicator';
import { MarkdownViewer } from '@/components/ui/markdown';
import { useResizeObserver } from '@/hooks/useResizeObserver';
import { cn, getDomain } from '@/lib/utils';

interface BlockScheduleViewProps extends ScheduleBlockComponentProps {}

const MAX_DETAIL_HEIGHT = 72;

const buildGoogleMapsUrl = (location: {
  googlePlaceId: string | null;
  latitude: number | null;
  longitude: number | null;
}): string | null => {
  const query =
    location.latitude != null && location.longitude != null ? `${location.latitude},${location.longitude}` : '';
  const placeIdParam = location.googlePlaceId ? `&query_place_id=${location.googlePlaceId}` : '';
  if (!(query || placeIdParam)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${query}${placeIdParam}`;
};

export function BlockScheduleView({ block, isNow, className }: BlockScheduleViewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isOverflowDetail, setIsOverflowDetail] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const detailDivRef = useRef<HTMLDivElement>(null);
  // [mock] 営業時間の警告・地図からの強調
  const trip = useAtomValue(tripAtom);
  const isHighlighted = useAtomValue(highlightedBlockIdAtom) === block.id;

  const onResize = () => {
    const scrollHeight = detailDivRef.current?.scrollHeight ?? 0;
    if (scrollHeight > MAX_DETAIL_HEIGHT) {
      setIsOverflowDetail(true);
    } else {
      setIsOverflowDetail(false);
    }
  };
  const resizeRef = useResizeObserver(onResize);

  const onClickExpand = () => {
    if (isExpanded) {
      detailDivRef.current?.style.setProperty('overflow', 'hidden');
      setIsExpanded(false);
    } else {
      setTimeout(() => {
        detailDivRef.current?.style.setProperty('overflow', 'auto');
      }, 300);
      setIsExpanded(true);
    }
    setIsHovered(false);
  };

  return (
    <div
      ref={resizeRef}
      data-block-id={block.id}
      className={cn(
        'relative flex w-full flex-col gap-2 rounded-lg bg-linear-to-r from-teal-400 px-4 py-2',
        isHovered ? 'to-teal-400' : 'to-teal-500',
        isHovered ? 'drop-shadow-xl' : 'drop-shadow-lg',
        isNow && 'ring-2 ring-red-500',
        isHighlighted && 'ring-2 ring-orange-500 ring-offset-2',
        className
      )}
    >
      {isNow && <BlockNowBadge />}
      <div className='flex items-center gap-1.5'>
        <div className='flex-1 font-bold text-14px text-white sm:text-16px'>{block.title}</div>
        {trip && <BlockCandidateMarks tripId={trip.id} block={block} />}
      </div>
      {block.location && (
        <div className='flex flex-col gap-0.5'>
          {(() => {
            const url = buildGoogleMapsUrl(block.location);
            return url ? (
              <a
                href={url}
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center gap-1 text-white/90 hover:text-white'
              >
                <MapPin className='h-3 w-3 shrink-0' />
                <span className='truncate text-10px sm:text-12px'>{block.location.name}</span>
              </a>
            ) : (
              <div className='flex items-center gap-1 text-white/90'>
                <MapPin className='h-3 w-3 shrink-0' />
                <span className='truncate text-10px sm:text-12px'>{block.location.name}</span>
              </div>
            );
          })()}
          {block.location.websiteUri && (
            <a
              href={block.location.websiteUri}
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center gap-1 text-white/80 hover:text-white'
            >
              <Globe className='h-3 w-3 shrink-0' />
              <span className='truncate text-10px sm:text-12px'>{getDomain(block.location.websiteUri)}</span>
            </a>
          )}
        </div>
      )}
      {block.detail && (
        <div
          className={cn(
            'ml-2 overflow-hidden text-12px transition-[max-height] duration-300 sm:text-16px',
            isExpanded ? 'max-h-[80vh]' : 'max-h-18'
          )}
          ref={detailDivRef}
        >
          <MarkdownViewer content={block.detail} variant='light-on-dark' />
        </div>
      )}
      {block.detail && isOverflowDetail && (
        <button
          type='button'
          className='flex items-center self-end text-white hover:cursor-pointer'
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={onClickExpand}
        >
          <span className='text-12px'>{isExpanded ? '閉じる' : '開く'}</span>
          <img
            src={angleDownIcon}
            className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')}
            alt='angle-down'
          />
        </button>
      )}
    </div>
  );
}
