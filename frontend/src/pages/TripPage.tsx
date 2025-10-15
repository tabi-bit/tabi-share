import { useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { Timeline } from '@/components/timeline/Timeline';
import { demoBlocks1, demoBlocks2, demoPages, demoTrip } from './test-data';

const TripPage = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedPageId, setSelectedPageId] = useState(demoPages[0]?.id);

  return (
    <div
      ref={scrollContainerRef}
      className='flex h-screen w-full flex-col items-center justify-between gap-4 overflow-auto'
    >
      <Header
        selectedPageId={selectedPageId}
        pages={demoPages}
        onSelectPage={setSelectedPageId}
        trip={demoTrip}
        mode='view'
        scrollContainerRef={scrollContainerRef}
      />
      <div className='flex h-full w-full max-w-3xl grow flex-col items-center'>
        <Timeline blocks={selectedPageId === 'page1' ? demoBlocks1 : demoBlocks2} type='view' className='pb-4' />
      </div>
    </div>
  );
};

export { TripPage };
