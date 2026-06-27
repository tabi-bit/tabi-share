import type { DateSelectArg, EventClickArg, EventContentArg, EventDropArg, ViewMountArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BlockScheduleEdit } from '@/components/blocks/edit/BlockScheduleEdit';
import { BlockTransportationEdit } from '@/components/blocks/edit/BlockTransportationEdit';
import { AddBlockDialog, EditBlockDialog } from '@/dialogs';
import { useBlocks, useCreateBlock, useDeleteBlock, useUpdateBlock } from '@/hooks/useBlocks';
import { useCalendarDragDetection } from '@/hooks/useCalendarDragDetection';
import type { Block, Page } from '@/types';

interface EditTripLayoutProps {
  selectedPageId: Page['id'];
  onDragStart?: (isTouch: boolean) => void;
  onDragEnd?: () => void;
  refreshInterval?: number;
}

export const EditTripLayout = ({ selectedPageId, onDragStart, onDragEnd, refreshInterval }: EditTripLayoutProps) => {
  const { blocks } = useBlocks(selectedPageId, { refreshInterval });
  const { createBlock } = useCreateBlock(selectedPageId);
  const { updateBlock } = useUpdateBlock(selectedPageId);
  const { deleteBlock } = useDeleteBlock(selectedPageId);
  const calendarRef = useRef<FullCalendar>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  // ページごとに初回スクロールが完了したか。実際にスクロールが実行されるまでfalseのまま維持する
  const hasScrolledToFirstEvent = useRef(false);
  // 初回スクロール用に予約したrequestAnimationFrameのID（クリーンアップ用）
  const scrollRafId = useRef<number | null>(null);

  // AddBlockDialog用のstate
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogSelectInfo, setAddDialogSelectInfo] = useState<DateSelectArg | null>(null);

  // EditBlockDialog用のstate
  // editingBlockIdだけ保持し、blockデータはblocks（SWRキャッシュ）から毎回引き直す。
  // 場所設定などでキャッシュが更新された際にダイアログへ即座に反映させるため。
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<Block['id'] | null>(null);
  const editingBlock = editingBlockId != null ? (blocks?.find(b => b.id === editingBlockId) ?? null) : null;

  // ドラッグ操作検出（マウスpointer + MutationObserver + FCコールバック）
  const { handleEventDragStart, handleEventDragStop, onBeforeSelect } = useCalendarDragDetection(
    calendarContainerRef,
    onDragStart,
    onDragEnd
  );

  // --- カレンダーイベント変換 ---

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

  // --- カレンダー初期化・同期 ---

  useEffect(() => {
    if (blocks && blocks.length > 0 && calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(blocks[0].startTime);
    }
  }, [blocks]);

  // selectedPageId変更時にスクロールフラグをリセット
  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedPageId変更を検知してrefをリセットするための意図的な依存配列
  useEffect(() => {
    hasScrolledToFirstEvent.current = false;
  }, [selectedPageId]);

  // アンマウント時に予約済みのスクロールrAFをクリーンアップする
  useEffect(() => {
    return () => {
      if (scrollRafId.current != null) {
        cancelAnimationFrame(scrollRafId.current);
        scrollRafId.current = null;
      }
    };
  }, []);

  // 初回イベントマウント時にタイムラインを最初のイベントへスクロールする。
  // blocksのロード完了後の最初のマウントを確実なトリガーにし、rAFで1フレーム待ってから
  // 実行することでレイアウト未確定によるスクロール失敗を防ぐ（ページごとに1度だけ実行）。
  const handleEventMount = (arg: ViewMountArg) => {
    if (hasScrolledToFirstEvent.current || scrollRafId.current != null) return;
    const eventEl = arg.el;
    scrollRafId.current = requestAnimationFrame(() => {
      scrollRafId.current = null;
      eventEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      hasScrolledToFirstEvent.current = true;
    });
  };

  // Date参照の安定化（親re-renderで新しいDateが生成されないようにする）
  const addDialogTimes = useMemo(
    () =>
      addDialogSelectInfo
        ? { start: new Date(addDialogSelectInfo.startStr), end: new Date(addDialogSelectInfo.endStr) }
        : null,
    [addDialogSelectInfo]
  );

  // --- ブロック追加ダイアログ ---

  const handleSelect = (selectInfo: DateSelectArg) => {
    onBeforeSelect();
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
    await createBlock({ block });
  };

  // --- ブロック編集ダイアログ ---

  // FC内部のeventSelection状態を解除する（公開APIが存在しないため内部dispatch使用）
  const unselectEvent = () => {
    const calendarApi = calendarRef.current?.getApi();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentData = (calendarApi as any)?.getCurrentData?.();
    if (currentData?.eventSelection) {
      currentData.dispatch({ type: 'UNSELECT_EVENT' });
      return true;
    }
    return false;
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    if (unselectEvent()) return;
    const blockData = clickInfo.event.extendedProps.blockData as Block;
    setEditingBlockId(blockData.id);
    setEditDialogOpen(true);
  };

  const handleEditDialogOpenChange = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      setEditingBlockId(null);
    }
  };

  const handleEditDialogSubmit = async (block: Block) => {
    await updateBlock({ id: block.id, data: block });
  };

  const handleEditDialogDelete = async (blockId: number) => {
    await deleteBlock(blockId);
  };

  // --- ドラッグ&ドロップ・リサイズ操作 ---

  const SNAP_MINUTES = 15;

  const snapToSlot = useCallback((date: Date): Date => {
    const snapped = new Date(date);
    const minutes = snapped.getMinutes();
    snapped.setMinutes(Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES, 0, 0);
    return snapped;
  }, []);

  const updateBlockTime = useCallback(
    async (event: EventDropArg['event'] | EventResizeDoneArg['event']) => {
      const blockData = event.extendedProps.blockData as Block;
      const startTime = event.start ? snapToSlot(event.start) : blockData.startTime;
      const endTime = event.end ? snapToSlot(event.end) : blockData.endTime;
      await updateBlock({
        id: blockData.id,
        data: {
          ...blockData,
          startTime,
          endTime,
        },
      });
    },
    [updateBlock, snapToSlot]
  );

  const handleEventDrop = useCallback(
    async (dropInfo: EventDropArg) => updateBlockTime(dropInfo.event),
    [updateBlockTime]
  );

  const handleEventResize = useCallback(
    async (resizeInfo: EventResizeDoneArg) => updateBlockTime(resizeInfo.event),
    [updateBlockTime]
  );

  // --- カレンダーイベント表示 ---

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

  return (
    <main className='flex w-full flex-row justify-center py-2'>
      <div ref={calendarContainerRef}>
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
          longPressDelay={300}
          unselectAuto={false}
          // 重なるブロックはかぶさず、きれいに横並びの列に分割する
          slotEventOverlap={false}
          // データとイベントハンドラ
          events={events}
          select={handleSelect}
          eventClick={handleEventClick}
          eventDragStart={handleEventDragStart}
          eventDrop={handleEventDrop}
          eventDragStop={handleEventDragStop}
          eventResizeStart={handleEventDragStart}
          eventResize={handleEventResize}
          eventResizeStop={handleEventDragStop}
          eventContent={renderEventContent}
          eventDidMount={handleEventMount}
          // スロットと時間軸の設定
          allDaySlot={false}
          snapDuration={'00:15:00'}
          slotDuration={'00:15:00'}
          slotMinTime={'00:00:00'}
          slotLabelInterval={'01:00:00'}
          slotMaxTime={'28:00:00'}
          // スタイリング
          viewClassNames={'h-full w-full max-w-3xl px-2'}
          slotLabelClassNames={'-translate-y-1/2 text-14px sm:text-16px'}
          // Ref
          ref={calendarRef}
        />
      </div>

      {addDialogSelectInfo && addDialogTimes && (
        <AddBlockDialog
          open={addDialogOpen}
          onOpenChange={handleAddDialogOpenChange}
          initialStartTime={addDialogTimes.start}
          initialEndTime={addDialogTimes.end}
          pageId={selectedPageId}
          onSubmit={handleDialogSubmit}
        />
      )}

      {editingBlock && (
        <EditBlockDialog
          open={editDialogOpen}
          onOpenChange={handleEditDialogOpenChange}
          block={editingBlock}
          onSubmit={handleEditDialogSubmit}
          onDelete={handleEditDialogDelete}
        />
      )}
    </main>
  );
};
