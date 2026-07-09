import { useEffect, useState } from 'react';
import { FetchErrorView } from '@/components/FetchErrorView';
import { TimelineSkeleton } from '@/components/timeline';
import { Timeline } from '@/components/timeline/Timeline';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MarkdownViewer } from '@/components/ui/markdown';
import { useBlocks } from '@/hooks/useBlocks';
import { useCurrentTime } from '@/hooks/useCurrentTime';
import { isSameLocalDate } from '@/lib/date';
import type { Page } from '@/types';

type ViewTripLayoutProps = {
  selectedPageId: Page['id'];
  pageDate: Page['date'];
  tripDetail: string | null;
  isFirstPage: boolean;
};

const ViewTripLayout = ({ selectedPageId, pageDate, tripDetail, isFirstPage }: ViewTripLayoutProps) => {
  const { blocks, error: blocksError, isLoading: isBlocksLoading } = useBlocks(selectedPageId ?? null);
  const [accordionValue, setAccordionValue] = useState(isFirstPage ? 'trip-detail' : '');
  // pageDate が今日と一致するページだけ tick を回して、非該当ページの毎分再レンダーを避ける
  const isToday = pageDate != null && isSameLocalDate(pageDate, new Date());
  const now = useCurrentTime({ enabled: isToday });

  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedPageId変更時にAccordionの開閉状態を切り替えるための意図的な依存
  useEffect(() => {
    setAccordionValue(isFirstPage ? 'trip-detail' : '');
  }, [selectedPageId, isFirstPage]);

  if (blocksError) {
    return <FetchErrorView error={blocksError} className='h-full w-full' />;
  }

  if (isBlocksLoading) {
    return (
      <div className='flex h-full w-full flex-row items-start justify-center'>
        <TimelineSkeleton className='w-full max-w-3xl p-4' />
      </div>
    );
  }

  return (
    <>
      {blocks && (
        <div className='flex h-full w-full max-w-3xl grow flex-col items-center px-2'>
          {tripDetail && (
            <Accordion
              type='single'
              collapsible
              value={accordionValue}
              onValueChange={setAccordionValue}
              className='mb-4 w-full rounded-lg border bg-white'
            >
              <AccordionItem value='trip-detail' className='px-3'>
                <AccordionTrigger>旅程全体メモ</AccordionTrigger>
                <AccordionContent>
                  <MarkdownViewer content={tripDetail} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
          <Timeline blocks={blocks} type='view' pageDate={pageDate} now={now} className='pb-4' />
        </div>
      )}
    </>
  );
};

export { ViewTripLayout };
