import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { usePages } from '@/hooks/usePages';
import { useTripByUrlId } from '@/hooks/useTrips';
import type { Page } from '@/types';
import { EditTripLayout } from './TripPage/EditTripLayout';
import { ViewTripLayout } from './TripPage/ViewTripLayout';

const TripPage = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedPageId, setSelectedPageId] = useState<Page['id']>();
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const { urlId } = useParams<{ urlId: string }>();

  const { trip, error: tripError, isLoading: isTripLoading } = useTripByUrlId(urlId ?? null);
  const { pages, error: pagesError, isLoading: isPagesLoading } = usePages(trip?.id ?? null);

  const isLoading = isTripLoading || isPagesLoading || trip == null || pages == null;
  const isError = tripError || pagesError;

  useEffect(() => {
    if (selectedPageId == null && pages != null && pages.length > 0) {
      setSelectedPageId(pages[0].id);
    }
  }, [pages, selectedPageId]);

  useEffect(() => {
    if (mode === 'view') {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [mode]);

  if (isLoading) {
    return <div>Loading Trip ...</div>;
  }

  if (isError) {
    return (
      <div>
        {tripError && `Trip Loading Error: ${String(tripError)}`}
        {pagesError && `Pages Loading Error: ${String(pagesError)}`}
      </div>
    );
  }

  return (
    <>
      {trip && pages && (
        <div
          ref={scrollContainerRef}
          className='flex h-screen w-full flex-col items-center justify-between gap-4 overflow-auto'
        >
          {selectedPageId != null && (
            <Header
              selectedPageId={selectedPageId}
              pages={pages}
              onSelectPage={setSelectedPageId}
              setMode={setMode}
              trip={trip}
              mode={mode}
              scrollContainerRef={scrollContainerRef}
            />
          )}
          {selectedPageId != null && mode === 'view' && <ViewTripLayout selectedPageId={selectedPageId} />}
          {selectedPageId != null && mode === 'edit' && <EditTripLayout selectedPageId={selectedPageId} />}
        </div>
      )}
    </>
  );
};

export { TripPage };
