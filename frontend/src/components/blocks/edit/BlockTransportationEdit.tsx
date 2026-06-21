import circleInfoIcon from '@/assets/icons/circle-info.svg';
import { TransportationIcon } from '@/components/blocks/TransportationIcon';
import { ClampedText } from '@/components/ClampedText';
import { cn } from '@/lib/utils';
import type { TransportationBlockComponentProps } from '../types';
import { BlockTimeLabel } from './BlockTimeLabel';
import './BlockTransportationEdit.css';

interface BlockTransportationEditProps extends TransportationBlockComponentProps {}

export function BlockTransportationEdit({ block, className }: BlockTransportationEditProps) {
  return (
    <div
      className={cn(
        'BlockTransportationEdit h-full w-full overflow-hidden rounded-lg bg-linear-to-r from-neutral-400 to-neutral-500 px-2 py-2 [container-type:size] sm:px-4',
        className
      )}
    >
      <div className='transport-layout flex h-full w-full flex-row items-center gap-1 sm:gap-2'>
        <div className='transport-time-wrapper flex shrink-0 items-center justify-center rounded bg-neutral-100 px-1 py-0.5 text-16px sm:px-4 sm:py-1 sm:text-18px'>
          <BlockTimeLabel startTime={block.startTime} endTime={block.endTime} />
        </div>

        {block.transportationType && (
          <TransportationIcon
            type={block.transportationType}
            className='transport-icon h-5 w-5 shrink-0 brightness-0 invert'
          />
        )}
        <ClampedText className='transport-title flex min-w-0 flex-1 items-center self-stretch font-bold text-14px text-white leading-snug sm:text-16px'>
          {block.title || 'タイトル未設定'}
        </ClampedText>

        <button
          type='button'
          className='transport-info-btn ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-black/10 sm:h-6 sm:w-6'
          aria-label='詳細'
        >
          <img src={circleInfoIcon} alt='' aria-hidden='true' className='h-4 w-4 shrink-0 sm:h-5 sm:w-5' />
        </button>
      </div>
    </div>
  );
}
