import type { DateSelectArg, EventContentArg, EventDropArg, ViewMountArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { BlockScheduleEdit } from '@/components/blocks/edit/BlockScheduleEdit';
import { BlockTransportationEdit } from '@/components/blocks/edit/BlockTransportationEdit';
import { useBlocks, useCreateBlock, useUpdateBlock } from '@/hooks/useBlocks';
import type { Block, Page } from '@/types';

interface EditTripLayoutProps {
  selectedPageId: Page['id'];
}

export const EditTripLayout = ({ selectedPageId }: EditTripLayoutProps) => {
  const { blocks } = useBlocks(selectedPageId);
  const { createBlock } = useCreateBlock(selectedPageId);
  const { updateBlock } = useUpdateBlock(selectedPageId);
  const calendarRef = useRef<FullCalendar>(null);
  const isFirstEventMount = useRef(true);

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

  const events = useMemo(() => {
    if (!blocks) return [];
    return blocks.map(block => createEvent(block));
  }, [blocks, createEvent]);

  useEffect(() => {
    if (blocks && blocks.length > 0 && calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(blocks[0].startTime);
    }
  }, [blocks]);

  const handleSelect = async (selectInfo: DateSelectArg) => {
    const title = prompt('イベントのタイトルを入力してください');
    const type = prompt('イベントの種類を入力してください (schedule または transportation)', 'schedule');
    const detail = prompt('イベントの詳細を入力してください', '');
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect(); // 選択をクリア

    if (title && type && (type === 'schedule' || type === 'transportation')) {
      if (type === 'transportation') {
        const newBlock = {
          type: 'transportation' as const,
          transportationType: 'car',
          title,
          startTime: new Date(selectInfo.startStr),
          endTime: new Date(selectInfo.endStr),
          pageId: selectedPageId,
          detail: detail ?? '',
        };
        await createBlock(newBlock);
      } else {
        const newBlock = {
          type: 'schedule' as const,
          title,
          startTime: new Date(selectInfo.startStr),
          endTime: new Date(selectInfo.endStr),
          pageId: selectedPageId,
          detail: detail ?? '',
        };
        await createBlock(newBlock);
      }
      selectInfo.view.calendar.unselect();
    }
  };

  const handleEventDrop = async (dropInfo: EventDropArg) => {
    const blockData = dropInfo.event.extendedProps.blockData as Block;
    await updateBlock({
      id: blockData.id,
      data: {
        ...blockData,
        startTime: dropInfo.event.start ?? blockData.startTime,
        endTime: dropInfo.event.end ?? blockData.endTime,
      },
    });
  };

  const handleEventResize = async (resizeInfo: EventResizeDoneArg) => {
    const blockData = resizeInfo.event.extendedProps.blockData as Block;
    await updateBlock({
      id: blockData.id,
      data: {
        ...blockData,
        startTime: resizeInfo.event.start ?? blockData.startTime,
        endTime: resizeInfo.event.end ?? blockData.endTime,
      },
    });
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
    <main className='flex w-full flex-row justify-center py-2'>
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
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        eventContent={renderEventContent}
        eventDidMount={handleEventMount}
        // スロットと時間軸の設定
        allDaySlot={false}
        slotDuration={'00:15:00'}
        slotMinTime={'00:00:00'}
        slotLabelInterval={'01:00:00'}
        slotMaxTime={'28:00:00'}
        // スタイリング
        viewClassNames={'h-full w-full max-w-3xl px-8'}
        slotLabelClassNames={'-translate-y-1/2'}
        // Ref
        ref={calendarRef}
      />
    </main>
  );
};
