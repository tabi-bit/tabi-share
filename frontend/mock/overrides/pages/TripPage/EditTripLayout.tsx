import type { DateSelectArg, EventClickArg, EventContentArg, EventDropArg, ViewMountArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import type {
  EventDragStartArg,
  EventDragStopArg,
  EventReceiveArg,
  EventResizeDoneArg,
} from '@fullcalendar/interaction';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import {
  STOCK_TRAY_SELECTOR,
  StockTray,
  TRAY_ITEM_KEY,
  type TrayItem,
  type TrayReturnState,
  useTrayItems,
} from '@mock/candidates/components/StockTray';
import { formatHours, isOutsideHours, likersOf, memberLabel } from '@mock/candidates/format';
import { useCandidateMutations, useCandidates, useMembers } from '@mock/candidates/hooks';
import { useAtomValue } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { tripAtom, tripPagesAtom } from '@/atoms/tripPage';
import { BlockScheduleEdit } from '@/components/blocks/edit/BlockScheduleEdit';
import { BlockTransportationEdit } from '@/components/blocks/edit/BlockTransportationEdit';
import { EditBlockDialog } from '@/dialogs';
import { useBlocks, useCreateBlock, useDeleteBlock, useUpdateBlock } from '@/hooks/useBlocks';
import { useCalendarDragDetection } from '@/hooks/useCalendarDragDetection';
import type { Block, Page, ScheduleBlock } from '@/types';
// 相対パスは実ファイル位置 (src/pages/TripPage) 基準で解決され、src/dialogs の差し替え版を読む
import { AddBlockDialog, type AddBlockPrefill } from '../../dialogs/AddBlockDialog';

// [mock] カレンダーの予定をトレイへ運ぶときの、指の位置とトレイの重なりの判定
const pointOf = (ev: MouseEvent | TouchEvent | PointerEvent): { x: number; y: number } | null => {
  if ('changedTouches' in ev) {
    const t = ev.changedTouches[0];
    return t ? { x: t.clientX, y: t.clientY } : null;
  }
  return { x: ev.clientX, y: ev.clientY };
};

const isOverTray = (point: { x: number; y: number } | null): boolean => {
  const rect = document.querySelector(STOCK_TRAY_SELECTOR)?.getBoundingClientRect();
  return !!(point && rect && point.y >= rect.top && point.x >= rect.left && point.x <= rect.right);
};

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
  const isFirstEventMount = useRef(true);

  // [mock] 候補ストックのトレイ
  const trip = useAtomValue(tripAtom);
  const pages = useAtomValue(tripPagesAtom);
  const pageIndex = Math.max(
    0,
    pages.findIndex(p => p.id === selectedPageId)
  );
  const trayItems = useTrayItems(trip, pageIndex, blocks ?? []);
  const { members } = useMembers(trip?.id ?? null);
  const { spots } = useCandidates(trip?.id ?? null);
  const {
    update: updateCandidate,
    create: createCandidate,
    refresh: refreshCandidates,
  } = useCandidateMutations(trip?.id ?? null);
  const [trayReturn, setTrayReturn] = useState<TrayReturnState>('off');
  const [trayItem, setTrayItem] = useState<TrayItem | null>(null);
  const [trayPrefill, setTrayPrefill] = useState<AddBlockPrefill | null>(null);
  const [trayTimes, setTrayTimes] = useState<{ start: Date; end: Date } | null>(null);

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

  const createEvent = (block: Block) => {
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
  };

  const events = blocks ? blocks.map(block => createEvent(block)) : [];

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
    isFirstEventMount.current = true;
  }, [selectedPageId]);

  const handleEventMount = (arg: ViewMountArg) => {
    if (!isFirstEventMount.current) return;
    arg.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    isFirstEventMount.current = false;
  };

  // Date参照の安定化（親re-renderで新しいDateが生成されないよう React Compiler が addDialogSelectInfo 変化時のみ再生成）
  const addDialogTimes = addDialogSelectInfo
    ? { start: new Date(addDialogSelectInfo.startStr), end: new Date(addDialogSelectInfo.endStr) }
    : null;

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

  const snapToSlot = (date: Date): Date => {
    const snapped = new Date(date);
    const minutes = snapped.getMinutes();
    snapped.setMinutes(Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES, 0, 0);
    return snapped;
  };

  const updateBlockTime = async (event: EventDropArg['event'] | EventResizeDoneArg['event']) => {
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
  };

  const handleEventDrop = async (dropInfo: EventDropArg) => updateBlockTime(dropInfo.event);

  const handleEventResize = async (resizeInfo: EventResizeDoneArg) => updateBlockTime(resizeInfo.event);

  // --- [mock] 候補ストックからの配置 ---

  // ブロックの年月日は anchor でしかないため、既存ブロックの日付に時刻を載せる (types/block.ts 参照)
  const atTime = (hhmm: string): Date => {
    const date = new Date(blocks?.[0]?.startTime ?? new Date());
    const [h, m] = hhmm.split(':').map(Number);
    date.setHours(h, m, 0, 0);
    return date;
  };

  const trayBlock = (item: TrayItem, start: Date): Omit<ScheduleBlock, 'id'> => {
    const place = item.kind === 'spot' ? item.candidate.location : item.stay.location;
    return {
      type: 'schedule',
      title: item.title,
      startTime: start,
      endTime: item.kind === 'stay' ? null : new Date(start.getTime() + item.durationMin * 60 * 1000),
      detail: item.kind === 'spot' ? trayDetail(item) : null,
      pageId: selectedPageId,
      location: place ? { ...place, googlePlaceId: null, websiteUri: null } : null,
    };
  };

  const trayDetail = (item: Extract<TrayItem, { kind: 'spot' }>): string => {
    const likers = likersOf(item.candidate).map(id => memberLabel(members.find(m => m.id === id)));
    return [item.candidate.reason, likers.length > 0 ? `♥ ${likers.join('・')}` : ''].filter(Boolean).join('\n');
  };

  const afterTrayPlaced = async (item: TrayItem, created: Block) => {
    if (item.kind !== 'spot') return;
    await updateCandidate(item.candidate.id, { placedBlockId: created.id });
    // 営業時間は Places の値。外れていても配置は止めず「可能性」として知らせるだけ
    if (isOutsideHours(item.candidate.hours, created.startTime, created.endTime)) {
      toast.warning(`${item.title} は営業時間外の可能性があります（${formatHours(item.candidate.hours)}）`);
    }
  };

  const handleTrayTap = (item: TrayItem) => {
    const start = atTime(item.kind === 'stay' ? item.checkIn : '13:00');
    const block = trayBlock(item, start);
    setTrayItem(item);
    setTrayTimes({ start, end: block.endTime ?? new Date(start.getTime() + 30 * 60 * 1000) });
    setTrayPrefill({
      title: block.title,
      detail: block.detail ?? '',
      location: block.location,
      isEstimatedDuration: item.kind === 'spot',
    });
  };

  const handleTraySubmit = async (block: Omit<Block, 'id'>) => {
    const created = await createBlock({ block });
    if (created && trayItem) await afterTrayPlaced(trayItem, created);
  };

  const handleEventReceive = async (info: EventReceiveArg) => {
    const key = info.event.extendedProps[TRAY_ITEM_KEY] as string | undefined;
    const start = info.event.start ? snapToSlot(info.event.start) : null;
    // FullCalendar 側の仮イベントは捨て、ブロック作成 → SWR 更新で描画し直す
    info.revert();
    const item = trayItems.find(i => i.key === key);
    if (!(item && start)) return;
    const created = await createBlock({ block: trayBlock(item, start) });
    if (created) await afterTrayPlaced(item, created);
  };

  // --- [mock] カレンダーの予定をトレイへ運んで候補に戻す ---

  const isReturnDragging = trayReturn !== 'off';
  useEffect(() => {
    if (!isReturnDragging) return;
    const onMove = (ev: PointerEvent | TouchEvent) => setTrayReturn(isOverTray(pointOf(ev)) ? 'over' : 'dragging');
    document.addEventListener('pointermove', onMove);
    document.addEventListener('touchmove', onMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('touchmove', onMove);
    };
  }, [isReturnDragging]);

  /** 候補から入れた予定は候補を未配置に戻すだけ。手で作った予定は、その内容で新しく候補を作ってから消す (場所がなくても戻せる) */
  const returnToCandidates = async (block: ScheduleBlock) => {
    const fromCandidate = spots.some(s => s.placedBlockId === block.id);
    if (!fromCandidate) {
      const minutes = block.endTime ? Math.round((block.endTime.getTime() - block.startTime.getTime()) / 60000) : 60;
      const { location } = block;
      await createCandidate({
        kind: 'spot',
        name: block.title,
        category: 'その他',
        rating: null,
        // 場所のない予定はそのまま場所なしの候補にする (地図には出ない)
        location:
          location?.latitude != null && location.longitude != null
            ? {
                name: location.name,
                address: location.address ?? null,
                latitude: location.latitude,
                longitude: location.longitude,
              }
            : null,
        durationMin: Math.max(15, minutes),
        hours: null,
        reason: block.detail ?? '',
        source: { type: 'member', memberId: 'me', note: null },
      });
    }
    await deleteBlock(block.id);
    await refreshCandidates();
    toast.success(`「${block.title}」をまだ入れていない所に戻しました`);
  };

  const handleCalendarEventDragStart = (info: EventDragStartArg) => {
    handleEventDragStart();
    const blockData = info.event.extendedProps.blockData as Block | undefined;
    if (blockData?.type === 'schedule') setTrayReturn('dragging');
  };

  // トレイの上で離した予定は、FullCalendar 側では置き場所なしで元に戻り、こちらで候補に戻す
  const handleCalendarEventDragStop = (info: EventDragStopArg) => {
    handleEventDragStop();
    setTrayReturn('off');
    const blockData = info.event.extendedProps.blockData as Block | undefined;
    if (blockData?.type === 'schedule' && isOverTray(pointOf(info.jsEvent))) void returnToCandidates(blockData);
  };

  // --- カレンダーイベント表示 ---

  const renderEventContent = (eventInfo: EventContentArg) => {
    const blockData = eventInfo.event.extendedProps.blockData as Block | undefined;

    // [mock] トレイからドラッグ中のプレビュー (まだブロックになっていない)
    if (!blockData) {
      return (
        <div className='h-full rounded-md border-2 border-teal-600 border-dashed bg-teal-50/90 px-2 py-1 font-medium text-12px text-teal-800'>
          {eventInfo.timeText} {eventInfo.event.title}
        </div>
      );
    }

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
          droppable
          eventReceive={handleEventReceive}
          longPressDelay={300}
          unselectAuto={false}
          // 重なるブロックはかぶさず、きれいに横並びの列に分割する
          slotEventOverlap={false}
          // データとイベントハンドラ
          events={events}
          select={handleSelect}
          eventClick={handleEventClick}
          eventDragStart={handleCalendarEventDragStart}
          eventDrop={handleEventDrop}
          eventDragStop={handleCalendarEventDragStop}
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
        {/* [mock] トレイに隠れないよう、カレンダー末尾に余白を足す */}
        <div className='h-[56dvh]' />
      </div>

      {trip && <StockTray trip={trip} items={trayItems} onTapItem={handleTrayTap} returnState={trayReturn} />}
      {trayItem && trayTimes && (
        <AddBlockDialog
          open={trayPrefill != null}
          onOpenChange={open => !open && setTrayPrefill(null)}
          initialStartTime={trayTimes.start}
          initialEndTime={trayTimes.end}
          pageId={selectedPageId}
          onSubmit={handleTraySubmit}
          prefill={trayPrefill ?? undefined}
        />
      )}

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
