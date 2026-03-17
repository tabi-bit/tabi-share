import { TransportationIcon } from '@/components/blocks/TransportationIcon';
import type { TransportationBlock } from '@/types/block';

interface BlockTransportationEditProps {
  block: TransportationBlock;
}

export function BlockTransportationEdit({ block }: BlockTransportationEditProps) {
  return (
    <div className='flex h-full items-center gap-1 overflow-hidden rounded-sm bg-blue-100 p-1 text-blue-800'>
      {block.transportationType && (
        <TransportationIcon type={block.transportationType} className='h-4 w-4 flex-shrink-0' />
      )}
      <span className='flex-grow truncate whitespace-nowrap font-medium text-sm'>{block.title}</span>
    </div>
  );
}
