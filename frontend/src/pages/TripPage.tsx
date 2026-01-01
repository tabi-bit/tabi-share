import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Timeline } from '@/components/timeline/Timeline';
import { useBlocks } from '@/hooks/useBlocks';
import { usePages } from '@/hooks/usePages';
import { useTripByUrlId } from '@/hooks/useTrips';
import type { Page } from '@/types';

const TripPage = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedPageId, setSelectedPageId] = useState<Page['id']>();
  const { urlId } = useParams<{ urlId: string }>();

  const { trip, error: tripError, isLoading: isTripLoading } = useTripByUrlId(urlId ?? null);
  const { pages, error: pagesError, isLoading: isPagesLoading } = usePages(trip?.id ?? null);
  const { blocks, error: blocksError, isLoading: isBlocksLoading } = useBlocks(selectedPageId ?? null);

  const isLoading = isTripLoading || isPagesLoading || trip == null || pages == null;
  const isError = pagesError || trip == null;

  useEffect(() => {
    if (selectedPageId == null && pages != null) {
      setSelectedPageId(pages[0].id);
    }
  }, [pages, selectedPageId]);

  return (
    <>
      {isLoading && <div>Loading Trip ...</div>}
      {!(isLoading || isError) && (
        <div
          ref={scrollContainerRef}
          className='flex h-screen w-full flex-col items-center justify-between gap-4 overflow-auto'
        >
          {selectedPageId != null && (
            <>
              <Header
                selectedPageId={selectedPageId}
                pages={pages}
                onSelectPage={setSelectedPageId}
                trip={trip}
                mode='view'
                scrollContainerRef={scrollContainerRef}
              />
              <div className='flex h-full w-full max-w-3xl grow flex-col items-center'>
                {!isBlocksLoading && blocks && <Timeline blocks={blocks} type='view' className='pb-4' />}
              </div>
            </>
          )}
        </div>
      )}
      {tripError && <div>Trip Loading Error: {String(tripError)}</div>}
      {pagesError && <div>Trip Loading Error: {String(pagesError)}</div>}
      {blocksError && <div>Trip Loading Error: {String(blocksError)}</div>}
    </>
  );
};

export { TripPage };
