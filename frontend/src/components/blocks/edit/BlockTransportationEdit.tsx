import dayjs from 'dayjs';
import circleInfoIcon from '@/assets/icons/circle-info.svg';
import { TransportationIcon } from '@/components/blocks/TransportationIcon';
import { cn } from '@/lib/utils';
import type { TransportationBlockComponentProps } from '../types';
import './BlockTransportationEdit.css';

interface BlockTransportationEditProps extends TransportationBlockComponentProps {}

export function BlockTransportationEdit({ block, className }: BlockTransportationEditProps) {
  return (
    <div
      className={cn(
        'BlockTransportationEdit flex h-full w-full flex-row items-center gap-2 rounded-lg bg-linear-to-r from-neutral-400 to-neutral-500 px-2 py-2 [container-type:size] sm:px-4',
        className
      )}
    >
      <div className='transport-time-wrapper flex items-center justify-center rounded-lg bg-neutral-100 px-4 py-1 text-16px sm:text-18px'>
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

      {block.transportationType && (
        <TransportationIcon type={block.transportationType} className='h-5 w-5 shrink-0 brightness-0 invert' />
      )}
      <div className='min-w-0 flex-1 truncate font-bold text-14px text-white sm:text-16px'>
        {block.title || 'タイトル未設定'}
      </div>

      <button
        type='button'
        className='ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-black/10 sm:h-6 sm:w-6'
        aria-label='info'
      >
        <img src={circleInfoIcon} alt='info' className='h-4 w-4 shrink-0 sm:h-5 sm:w-5' />
      </button>
    </div>
  );
}
