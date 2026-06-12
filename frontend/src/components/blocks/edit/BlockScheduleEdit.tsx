import circleInfoIcon from '@/assets/icons/circle-info.svg';
import { ClampedText } from '@/components/ClampedText';
import { cn } from '@/lib/utils';
import type { ScheduleBlockComponentProps } from '../types';
import { BlockTimeLabel } from './BlockTimeLabel';
import './BlockScheduleEdit.css';

interface BlockScheduleEditProps extends ScheduleBlockComponentProps {}

export function BlockScheduleEdit({ block, className }: BlockScheduleEditProps) {
  return (
    <div
      className={cn(
        'BlockScheduleEdit h-full w-full overflow-hidden rounded-lg bg-linear-to-r from-teal-400 to-teal-500 px-2 py-2 [container-type:size] sm:px-4',
        className
      )}
    >
      <div className='schedule-layout flex h-full w-full flex-row items-center gap-1 sm:gap-2'>
        <div className='schedule-time-wrapper flex shrink-0 items-center justify-center rounded bg-teal-50 px-1 py-0.5 text-16px sm:px-4 sm:py-1 sm:text-18px'>
          <BlockTimeLabel startTime={block.startTime} endTime={block.endTime} />
        </div>

        <ClampedText className='schedule-title flex min-w-0 flex-1 items-center self-stretch font-bold text-14px text-white leading-snug sm:text-16px'>
          {block.title || 'タイトル未設定'}
        </ClampedText>
        <button
          type='button'
          className='schedule-info-btn ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-black/10 sm:h-6 sm:w-6'
          aria-label='詳細'
        >
          <img src={circleInfoIcon} alt='' aria-hidden='true' className='h-4 w-4 shrink-0 sm:h-5 sm:w-5' />
        </button>
      </div>
    </div>
  );
}
