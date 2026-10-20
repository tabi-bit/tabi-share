import { Draggable } from '@fullcalendar/interaction';
import { ChevronRight, GripVertical, Heart, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Block } from '@/types/block';
import type { Trip } from '@/types/trip';
import { formatDuration, isRejectedByAll, likersOf } from '../format';
import { useCandidates, useMembers, useStayDecisions } from '../hooks';
import { candidatePaths } from '../paths';
import type { SpotCandidate, StayCandidate } from '../types';
import { TrayCarousel } from './TrayCarousel';

export type TrayItem =
  | { key: string; kind: 'spot'; title: string; durationMin: number; likes: number; candidate: SpotCandidate }
  | {
      key: string;
      kind: 'stay';
      title: string;
      durationMin: number;
      likes: number;
      stay: StayCandidate;
      checkIn: string;
    };

/** ドロップ時に FullCalendar の eventReceive で受け取るキー */
export const TRAY_ITEM_KEY = 'trayItemKey';

const toDurationStr = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** このページのトレイに並べる候補。泊まる日のページには決定済みの宿のチェックインを先頭に置く */
export const useTrayItems = (trip: Trip | null, pageIndex: number, blocks: Block[]): TrayItem[] => {
  const tripId = trip?.id ?? null;
  const { spots, stays } = useCandidates(tripId);
  const { members } = useMembers(tripId);
  const { decisions } = useStayDecisions(tripId);

  const night = pageIndex + 1;
  const stay = stays.find(s => s.id === decisions.find(d => d.night === night)?.candidateId);
  const checkIn = decisions.find(d => d.night === night)?.checkIn ?? stay?.checkIn ?? '15:00';
  const stayTitle = stay ? `チェックイン ${stay.name}` : '';
  const stayPlaced = blocks.some(b => b.title === stayTitle);

  const spotItems: TrayItem[] = spots
    .filter(s => s.placement == null && !isRejectedByAll(s, members))
    .sort((a, b) => likersOf(b).length - likersOf(a).length)
    .map(s => ({
      key: `spot-${s.id}`,
      kind: 'spot',
      title: s.name,
      durationMin: s.durationMin,
      likes: likersOf(s).length,
      candidate: s,
    }));

  return [
    ...(stay && !stayPlaced
      ? [
          {
            key: `stay-${stay.id}`,
            kind: 'stay' as const,
            title: stayTitle,
            durationMin: 30,
            likes: likersOf(stay).length,
            stay,
            checkIn,
          },
        ]
      : []),
    ...spotItems,
  ];
};

/** カレンダーの予定をトレイへ運んで候補に戻す操作の状態。over は指がトレイの上にある */
export type TrayReturnState = 'off' | 'dragging' | 'over';

/** カレンダー側から、指がトレイの上にあるかを判定するための目印 */
export const STOCK_TRAY_SELECTOR = '[data-stock-tray]';

interface StockTrayProps {
  trip: Trip;
  items: TrayItem[];
  onTapItem: (item: TrayItem) => void;
  returnState?: TrayReturnState;
}

type TrayLayout = 'grid' | 'carousel';

/** 比較用に選んだ並べ方を覚えておく (モック専用) */
const LAYOUT_KEY = 'mock-tray-layout';

const loadLayout = (): TrayLayout => {
  try {
    return localStorage.getItem(LAYOUT_KEY) === 'carousel' ? 'carousel' : 'grid';
  } catch {
    return 'grid';
  }
};

/** ドラッグ中、指がパネルの上端からこれだけ上に出たらパネルを縮める */
const SHRINK_MARGIN_PX = 12;

/**
 * 仮: 編集画面の下に出す候補ストックのトレイ。タップで追加ダイアログ、長押しでカレンダーへドラッグ。
 * ドラッグ中に指がパネルより上に出たらパネルを縮める。FullCalendar は指の位置が他の要素に覆われていると
 * ドロップを受け付けないため、縮めないとパネルの裏の時間帯に入れられない
 */
export function StockTray({ trip, items, onTapItem, returnState = 'off' }: StockTrayProps) {
  const [open, setOpen] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [shrunk, setShrunk] = useState(false);
  // 予定を戻すときも、カレンダーを広く見せるため見出しだけにする
  const returning = returnState !== 'off';
  const compact = shrunk || returning;
  const [layout, setLayout] = useState<TrayLayout>(loadLayout);
  // カルーセルを横に回している間は Draggable を外す。付けたままだと長押しの時間を過ぎたスワイプがドラッグになる
  const [swiping, setSwiping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 並べ方を変えると listRef の要素が入れ替わるため付け直す
  useEffect(() => {
    if (!(open && listRef.current) || swiping) return;
    const draggable = new Draggable(listRef.current, {
      itemSelector: '[data-tray-item]',
      longPressDelay: 300,
      eventData: el => ({
        title: el.dataset.title,
        duration: el.dataset.duration,
        create: true,
        extendedProps: { [TRAY_ITEM_KEY]: el.dataset.key },
      }),
    });
    let panelTop = Number.POSITIVE_INFINITY;
    const { emitter } = draggable.dragging;
    emitter.on('dragstart', () => {
      panelTop = panelRef.current?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
      setDragging(true);
    });
    emitter.on('dragmove', (ev: { pageY: number }) => {
      if (ev.pageY - window.scrollY < panelTop - SHRINK_MARGIN_PX) setShrunk(true);
    });
    emitter.on('dragend', () => {
      setDragging(false);
      setShrunk(false);
    });
    return () => draggable.destroy();
  }, [open, layout, swiping]);

  const changeLayout = (next: TrayLayout) => {
    setLayout(next);
    try {
      localStorage.setItem(LAYOUT_KEY, next);
    } catch {
      // 覚えられなくても切り替えはできる
    }
  };

  return (
    <section
      ref={panelRef}
      data-stock-tray
      className={cn(
        'fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-3xl flex-col rounded-t-2xl border-t bg-white px-3 pt-2 pb-16 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.2)] transition-colors',
        returning && 'border-2 border-primary border-dashed',
        returnState === 'over' && 'bg-teal-50'
      )}
    >
      <Button
        variant='ghost'
        aria-label='トレイを開閉'
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className='h-4 w-16 self-center p-0 sm:h-4'
      >
        <span className='h-1.5 w-10 rounded-full bg-neutral-300' />
      </Button>
      <div className='flex items-center gap-2 pt-1 pb-2'>
        {returning ? (
          <span
            className={cn(
              'flex-1 text-center text-12px',
              returnState === 'over' ? 'font-bold text-teal-800' : 'text-neutral-600'
            )}
          >
            {returnState === 'over'
              ? '離すと、まだ入れていない所に戻します'
              : 'ここまで運ぶと、まだ入れていない所に戻せます'}
          </span>
        ) : shrunk ? (
          <span className='flex-1 text-center text-12px text-neutral-600'>入れたい時間の上で指を離してください</span>
        ) : (
          <>
            <span className='shrink-0 font-bold text-14px'>まだ入れていない所</span>
            <span className='text-12px text-neutral-500'>{items.length}</span>
            <span className='flex-1' />
            {!dragging && (
              // モック専用: グリッドと 3D カルーセルを見比べる切り替え
              <Tabs value={layout} onValueChange={v => changeLayout(v as TrayLayout)}>
                <TabsList className='h-7'>
                  <TabsTrigger value='grid' className='px-2 text-10px'>
                    グリッド
                  </TabsTrigger>
                  <TabsTrigger value='carousel' className='px-2 text-10px'>
                    3D
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            {!dragging && (
              <Button asChild variant='ghost' size='sm' className='font-normal text-12px text-neutral-600'>
                <Link to={candidatePaths.candidates(trip.urlId)}>
                  すべて見る
                  <ChevronRight />
                </Link>
              </Button>
            )}
          </>
        )}
      </div>
      {open && (
        // ドラッグ中も中身は消さない (ドラッグ元の要素が無くなると FullCalendar のドラッグが切れる)。高さだけ 0 にする
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-200',
            compact ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]'
          )}
        >
          <div className='min-h-0 overflow-hidden'>
            {layout === 'carousel' ? (
              <TrayCarousel
                urlId={trip.urlId}
                items={items}
                onTapItem={onTapItem}
                toDurationStr={toDurationStr}
                listRef={listRef}
                dragging={dragging}
                onSwipeChange={setSwiping}
              />
            ) : (
              <div ref={listRef} className='grid max-h-[42dvh] grid-cols-2 gap-2 overflow-y-auto pb-1 sm:grid-cols-3'>
                {items.length === 0 && (
                  <span className='col-span-full py-3 text-12px text-neutral-500'>ぜんぶ旅程に入りました</span>
                )}
                {items.map(item => (
                  <Button
                    key={item.key}
                    variant='outline'
                    data-tray-item
                    data-key={item.key}
                    data-title={item.title}
                    data-duration={toDurationStr(item.durationMin)}
                    onClick={() => onTapItem(item)}
                    className={cn(
                      'h-auto min-w-0 touch-pan-y flex-col items-stretch gap-1 rounded-lg p-2.5 text-left font-normal sm:h-auto sm:px-2.5',
                      item.kind === 'stay' && 'border-slate-700 bg-slate-50'
                    )}
                  >
                    <span className='flex items-start gap-1'>
                      <GripVertical className='mt-0.5 size-3.5 shrink-0 text-neutral-400' />
                      <span className='line-clamp-2 whitespace-normal font-bold text-14px leading-snug'>
                        {item.kind === 'stay' ? item.stay.name : item.title}
                      </span>
                    </span>
                    <span className='flex items-center gap-1 pl-4.5 text-12px text-neutral-500'>
                      {item.kind === 'stay' ? `宿 ・ IN ${item.checkIn}` : formatDuration(item.durationMin)}
                      {item.likes > 0 && (
                        <>
                          <Heart className='ml-0.5 size-3 fill-primary text-primary' />
                          {item.likes}
                        </>
                      )}
                    </span>
                  </Button>
                ))}
                <Button
                  asChild
                  variant='outline'
                  className='h-auto min-h-16 flex-col gap-1 rounded-lg border-dashed p-2 font-normal text-12px sm:h-auto'
                >
                  <Link to={candidatePaths.suggest(trip.urlId)}>
                    <Sparkles className='text-violet-600' />
                    AI に提案
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
