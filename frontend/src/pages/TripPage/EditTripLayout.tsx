import type { DateSelectArg, EventContentArg, EventDropArg, ViewMountArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BlockScheduleEdit } from '@/components/blocks/edit/BlockScheduleEdit';
import { BlockTransportationEdit } from '@/components/blocks/edit/BlockTransportationEdit';
import { AddBlockDialog } from '@/dialogs';
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

  // AddBlockDialog用のstate
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogSelectInfo, setAddDialogSelectInfo] = useState<DateSelectArg | null>(null);

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

  // selectedPageId変更時にスクロールフラグをリセット
  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedPageId変更を検知してrefをリセットするための意図的な依存配列
  useEffect(() => {
    isFirstEventMount.current = true;
  }, [selectedPageId]);

  const handleSelect = (selectInfo: DateSelectArg) => {
    setAddDialogSelectInfo(selectInfo);
    setAddDialogOpen(true);
  };

  const handleAddDialogOpenChange = (open: boolean) => {
    setAddDialogOpen(open);
    // ダイアログが閉じられたときに選択を解除
    if (!open && addDialogSelectInfo) {
      addDialogSelectInfo.view.calendar.unselect();
    }
  };

  const handleDialogSubmit = async (block: Omit<Block, 'id'>) => {
    await createBlock(block);
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
        unselectAuto={false}
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

      {addDialogSelectInfo && (
        <AddBlockDialog
          open={addDialogOpen}
          onOpenChange={handleAddDialogOpenChange}
          initialStartTime={new Date(addDialogSelectInfo.startStr)}
          initialEndTime={new Date(addDialogSelectInfo.endStr)}
          pageId={selectedPageId}
          onSubmit={handleDialogSubmit}
        />
      )}
    </main>
  );
};
