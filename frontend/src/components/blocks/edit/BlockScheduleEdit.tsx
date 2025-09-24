import dayjs from 'dayjs';
import circleInfoIcon from '@/assets/icons/circle-info.svg';
import gripVerticalIcon from '@/assets/icons/grip-vertical-white.svg';
import type { ScheduleBlock } from '@/types';

interface BlockScheduleEditProps {
  block: ScheduleBlock;
}

export function BlockScheduleEdit({ block }: BlockScheduleEditProps) {
  return (
    <div className='flex w-full flex-row items-center gap-2 rounded-lg bg-linear-to-r from-teal-400 to-teal-500 px-4 py-2'>
      <div className='flex h-12 shrink-0 flex-col justify-center hover:cursor-grab'>
        <img src={gripVerticalIcon} alt='test' className='h-6 w-6' />
      </div>
      <div className='flex min-h-12 flex-col items-center justify-center rounded-lg bg-teal-50 px-4 py-1 text-18px'>
        {block.endTime ? (
          <>
            <div className='font-medium'>{String(dayjs(block.startTime).format('HH:mm'))}</div>
            <div className='-my-1 text-center text-gray-400 text-xs leading-none'>|</div>
            <div className='font-medium'>{String(dayjs(block.endTime).format('HH:mm'))}</div>
          </>
        ) : (
          <div className='font-medium'>{dayjs(block.startTime).format('HH:mm')}</div>
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
