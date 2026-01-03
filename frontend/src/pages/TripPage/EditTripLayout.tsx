import type { DateSelectArg, EventContentArg, EventInput, EventMountArg, ViewMountArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BlockScheduleEdit } from '@/components/blocks/edit/BlockScheduleEdit';
import { BlockTransportationEdit } from '@/components/blocks/edit/BlockTransportationEdit';
import { useBlocks } from '@/hooks/useBlocks';
import type { Block, Page } from '@/types';

interface EditTripLayoutProps {
  selectedPageId: Page['id'];
}

export const EditTripLayout = ({ selectedPageId }: EditTripLayoutProps) => {
  const { blocks } = useBlocks(selectedPageId);
  const calendarRef = useRef<FullCalendar>(null);
  const isFirstEventMount = useRef(true);
  const [events, setEvents] = useState<EventInput[]>([]);

  const createEvent = useCallback((block: Block) => {
    return {
      id: block.id.toString(),
      title: block.title,
      start: block.startTime,
      end: block.endTime ?? undefined,
      extendedProps: {
        blockData: block,
      },
      // eventContentで背景色を指定するため、デフォルトの背景は透明にする
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    };
  }, []);

  const initialEvents = useMemo(() => {
    if (!blocks) return [];

    return blocks.map(block => createEvent(block));
  }, [blocks, createEvent]);

  useEffect(() => {
    if (initialEvents.length > 0 && calendarRef.current) {
      setEvents(initialEvents);
      const calendarApi = calendarRef.current?.getApi();
      calendarApi?.gotoDate(initialEvents[0].start);
    }
  }, [initialEvents]);

  const handleSelect = (selectInfo: DateSelectArg) => {
    const title = prompt('イベントのタイトルを入力してください');
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect(); // 選択をクリア

    if (title) {
      const newBlock: Block = {
        id: 0,
        type: 'schedule',
        title: title,
        startTime: new Date(selectInfo.startStr),
        endTime: new Date(selectInfo.endStr),
        pageId: selectedPageId,
      };
      const newEvent = createEvent(newBlock);
      setEvents(prev => [...prev, newEvent]);
    }
  };

  /**
   * カレンダーのイベント表示をカスタマイズする関数
   */
  const renderEventContent = (eventInfo: EventContentArg) => {
    const blockData = eventInfo.event.extendedProps.blockData as Block;

    if (blockData.type === 'transportation') {
      return <BlockTransportationEdit block={blockData} />;
    }

    if (blockData.type === 'schedule') {
      return <BlockScheduleEdit block={blockData} />;
    }

    // デフォルトのフォールバック
    return <div className='p-1'>{eventInfo.event.title}</div>;
  };

  const handleEventMount = (arg: ViewMountArg) => {
    if (!isFirstEventMount.current) return;
    arg.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    isFirstEventMount.current = false;
  };

  return (
    <main className='flex h-full w-full flex-row justify-center'>
      <FullCalendar
        // プラグインとビュー設定
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView='timeGridDay'
        headerToolbar={false}
        dayHeaders={false}
        height={'auto'}
        expandRows
        // 地域化と言語
        locale='ja'
        // インタラクション設定
        selectable
        editable
        longPressDelay={100}
        // データとイベントハンドラ
        events={events}
        select={handleSelect}
        eventContent={renderEventContent}
        eventDidMount={handleEventMount}
        // スロットと時間軸の設定
        allDaySlot={false}
        slotDuration={'00:15:00'}
        slotLabelInterval={'01:00:00'}
        // スタイリング
        viewClassNames={'h-full w-full max-w-3xl px-8'}
        slotLabelClassNames={'-translate-y-1/2'}
        // Ref
        ref={calendarRef}
      />
    </main>
  );
};
