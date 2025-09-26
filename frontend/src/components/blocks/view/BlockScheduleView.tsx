import { useRef, useState } from 'react';
import angleDownIcon from '@/assets/icons/angle-down-white.svg';
import { useResizeObserver } from '@/hooks/useResizeObserver';
import { cn } from '@/lib/utils';
import type { ScheduleBlockComponentProps } from '../types';

interface BlockScheduleViewProps extends ScheduleBlockComponentProps {}

const MAX_DETAIL_HEIGHT = 72;

export function BlockScheduleView({ block }: BlockScheduleViewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isOverflowDetail, setIsOverflowDetail] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const detailDivRef = useRef<HTMLDivElement>(null);

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
      className={cn(
        'flex w-full flex-col gap-2 rounded-lg bg-linear-to-r from-teal-400 px-4 py-2',
        isHovered ? 'to-teal-400' : 'to-teal-500',
        isHovered ? 'drop-shadow-xl' : 'drop-shadow-lg'
      )}
    >
      <div className='font-bold text-16px text-white'>{block.title}</div>
      {block.details && (
        <div
          className={cn(
            'transition-[max-height] duration-300',
            isExpanded ? 'max-h-[80vh] overflow-auto' : 'max-h-18 overflow-hidden'
          )}
          ref={detailDivRef}
        >
          {block.details}
        </div>
      )}
      {block.details && isOverflowDetail && (
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
