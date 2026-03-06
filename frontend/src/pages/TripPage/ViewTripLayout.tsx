import { Timeline } from '@/components/timeline/Timeline';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MarkdownViewer } from '@/components/ui/markdown';
import { useBlocks } from '@/hooks/useBlocks';
import type { Page } from '@/types';

type ViewTripLayoutProps = {
  selectedPageId: Page['id'];
  tripDetail: string | null;
  isFirstPage: boolean;
};

const ViewTripLayout = ({ selectedPageId, tripDetail, isFirstPage }: ViewTripLayoutProps) => {
  const { blocks, error: blocksError, isLoading: isBlocksLoading } = useBlocks(selectedPageId ?? null);

  return (
    <>
      {isBlocksLoading && <div>Loading Blocks ...</div>}
      {!isBlocksLoading && blocks && (
        <div className='flex h-full w-full max-w-3xl grow flex-col items-center px-2'>
          {tripDetail && (
            <Accordion
              type='single'
              collapsible
              defaultValue={isFirstPage ? 'trip-detail' : undefined}
              key={selectedPageId}
              className='mb-4 w-full rounded-lg border'
            >
              <AccordionItem value='trip-detail' className='px-3'>
                <AccordionTrigger>旅程全体メモ</AccordionTrigger>
                <AccordionContent>
                  <MarkdownViewer content={tripDetail} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
          <Timeline blocks={blocks} type='view' className='pb-4' />
        </div>
      )}
      {blocksError && <div>Blocks Loading Error: {String(blocksError)}</div>}
    </>
  );
};

export { ViewTripLayout };
