import { useRef, useState } from 'react';
import angleDownIcon from '@/assets/icons/angle-down.svg';
import { MarkdownViewer } from '@/components/ui/markdown';
import { useResizeObserver } from '@/hooks/useResizeObserver';
import { calculateDuration, cn } from '@/lib/utils';
import { TransportationIcon } from '../TransportationIcon';
import type { TransportationBlockComponentProps } from '../types';

interface BlockTransportationViewProps extends TransportationBlockComponentProps {}

const MAX_DETAIL_HEIGHT = 72;

export function BlockTransportationView({ block, className }: BlockTransportationViewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isOverflowDetail, setIsOverflowDetail] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const detailDivRef = useRef<HTMLDivElement>(null);

  const duration = block.startTime && block.endTime ? calculateDuration(block.startTime, block.endTime) : null;

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
        'flex w-full flex-col gap-2 rounded-lg bg-gradient-to-r from-sky-50 px-2 py-2 sm:px-4',
        isHovered ? 'to-sky-50' : 'to-sky-100',
        isHovered ? 'drop-shadow-xl' : 'drop-shadow-lg',
        className
      )}
    >
      <div className='flex items-center gap-2'>
        <TransportationIcon type={block.transportationType} />
        <div className='font-bold text-14px text-neutral-800 sm:text-16px'>{block.title}</div>
        {duration && (
          <div className='shrink-0 text-12px text-neutral-500'>
            ({duration.hours != null ? `${duration.hours}時間` : ''}
            {`${duration.minutes.toString().padStart(2, '0')}分`})
          </div>
        )}
      </div>
      {block.detail && (
        <div
          className={cn(
            'ml-2 overflow-hidden text-14px transition-[max-height] duration-300 sm:text-16px',
            isExpanded ? 'max-h-[80vh]' : 'max-h-18'
          )}
          ref={detailDivRef}
        >
          <MarkdownViewer content={block.detail} variant='default' />
        </div>
      )}
      {block.detail && isOverflowDetail && (
        <button
          type='button'
          className='flex items-center self-end text-neutral-800 hover:cursor-pointer'
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
