import dayjs from 'dayjs';
import circleInfoIcon from '@/assets/icons/circle-info.svg';
import { cn } from '@/lib/utils';
import type { ScheduleBlockComponentProps } from '../types';
import './BlockScheduleEdit.css';

interface BlockScheduleEditProps extends ScheduleBlockComponentProps {}

export function BlockScheduleEdit({ block, className }: BlockScheduleEditProps) {
  return (
    <div
      className={cn(
        'BlockScheduleEdit flex h-full w-full flex-row items-center gap-2 rounded-lg bg-linear-to-r from-teal-400 to-teal-500 px-4 py-2 [container-type:size]',
        className
      )}
    >
      <div className='schedule-time-wrapper flex items-center justify-center rounded-lg bg-teal-50 px-4 py-1 text-18px'>
        {block.endTime ? (
          <>
            <div className='font-medium text-neutral-700'>{String(dayjs(block.startTime).format('HH:mm'))}</div>
            <div className='-my-1 horizontal-divider text-center text-gray-400 text-xs leading-none'>|</div>
            <div className='vertical-divider text-center text-gray-400 text-xs leading-none'>—</div>
            <div className='font-medium text-neutral-700'>{String(dayjs(block.endTime).format('HH:mm'))}</div>
          </>
        ) : (
          <div className='font-medium text-neutral-700'>{dayjs(block.startTime).format('HH:mm')}</div>
        )}
      </div>

      <div className='font-bold text-16px text-white'>{block.title || 'タイトル未設定'}</div>
      <button
        type='button'
        className='ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-black/10'
        aria-label='info'
      >
        <img src={circleInfoIcon} alt='info' className='h-5 w-5 shrink-0' />
      </button>
    </div>
  );
}
