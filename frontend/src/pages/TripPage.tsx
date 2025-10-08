import { useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { Timeline } from '@/components/timeline/Timeline';
import type { Block, Page } from '@/types';
import type { Trip } from '@/types/trip';

const demoBlocks: Block[] = [
  {
    id: '1',
    type: 'schedule',
    title: '予定のタイトル（テンプレート）',
    startTime: new Date(2024, 0, 1, 12, 0),
    endTime: new Date(2024, 0, 1, 14, 0),
    details: `detail detail
• detail detail
リンク`.repeat(20),
  },
  {
    id: '2',
    type: 'transportation',
    transportationType: 'car',
    title: '車移動',
    startTime: new Date(2024, 0, 1, 15, 0),
    endTime: new Date(2024, 0, 1, 16, 0),
  },
  {
    id: '3',
    type: 'schedule',
    title: '予定のタイトル（テンプレート）',
    startTime: new Date(2024, 0, 1, 17, 0),
    endTime: new Date(2024, 0, 1, 19, 0),
  },
  {
    id: '4',
    type: 'transportation',
    transportationType: 'car',
    title: '車移動',
    startTime: new Date(2024, 0, 1, 19, 0),
    endTime: new Date(2024, 0, 1, 20, 0),
    details: `detail detail
• detail detail
リンク`.repeat(20),
  },
];

const demoPages: Page[] = [
  {
    id: 'page1',
    title: '1日目',
  },
  {
    id: 'page2',
    title: '2日目',
  },
  {
    id: 'page3',
    title: '3日目',
  },
];

const demoTrip: Trip = {
  id: 'trip1',
  title: 'サンプル旅行',
};

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
        <Timeline blocks={demoBlocks} type='view' className='pb-4' />
      </div>
    </div>
  );
};

export { TripPage };
