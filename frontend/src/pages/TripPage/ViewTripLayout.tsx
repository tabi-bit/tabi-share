import { Timeline } from '@/components/timeline/Timeline';
import { useBlocks } from '@/hooks/useBlocks';
import type { Page } from '@/types';

type ViewTripLayoutProps = {
  selectedPageId: Page['id'];
};

const ViewTripLayout = ({ selectedPageId }: ViewTripLayoutProps) => {
  const { blocks, error: blocksError, isLoading: isBlocksLoading } = useBlocks(selectedPageId ?? null);

  return (
    <>
      {isBlocksLoading && <div>Loading Blocks ...</div>}
      {!isBlocksLoading && blocks && (
        <div className='flex h-full w-full max-w-3xl grow flex-col items-center px-2'>
          <Timeline blocks={blocks} type='view' className='pb-4' />
        </div>
      )}
      {blocksError && <div>Blocks Loading Error: {String(blocksError)}</div>}
    </>
  );
};

export { ViewTripLayout };
