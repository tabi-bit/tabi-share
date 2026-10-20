import { ChevronLeft, ChevronRight, Heart, Sparkles } from 'lucide-react';
import { type MouseEvent, type PointerEvent, type Ref, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDuration } from '../format';
import { candidatePaths } from '../paths';
import { CategoryThumb } from './CategoryThumb';
import type { TrayItem } from './StockTray';

/** カード 1 枚ぶん回すのに必要な指の移動量 (px) */
const SPACING_PX = 92;
/** 中央の左右に描く枚数 (端は薄くなって消える) */
const VISIBLE_SIDE = 3.6;
/** 横か縦かを決めるまでの遊び (px) */
const AXIS_LOCK_PX = 6;
/** 離したときの勢いをどれだけ先まで流すか (ms 分の移動量) */
const MOMENTUM_MS = 260;

interface TrayCarouselProps {
  urlId: string;
  items: TrayItem[];
  onTapItem: (item: TrayItem) => void;
  toDurationStr: (min: number) => string;
  /** FullCalendar の Draggable を付ける要素 */
  listRef: Ref<HTMLDivElement>;
  /** カレンダーへのドラッグ中。カルーセルは回さない */
  dragging: boolean;
  /** 横スワイプの開始と終了。スワイプ中はカレンダーへのドラッグを始めさせない */
  onSwipeChange: (swiping: boolean) => void;
}

type Slide = { kind: 'item'; item: TrayItem } | { kind: 'ai' };

/** 環状に並べたときの、中央からのずれ (-n/2〜n/2)。pos は小数 (回している途中) もとる */
const ringOffset = (index: number, pos: number, count: number) => {
  const raw = (((index - pos) % count) + count) % count;
  return raw >= count / 2 ? raw - count : raw;
};

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * 仮 (比較用): トレイの 3D カルーセル表示 (カバーフロー風)。
 * 指に吸い付いて回り、離すと勢いで流れてから最寄りのカードに止まる。中央のカードはタップで追加・長押しでカレンダーへ
 */
export function TrayCarousel({
  urlId,
  items,
  onTapItem,
  toDurationStr,
  listRef,
  dragging,
  onSwipeChange,
}: TrayCarouselProps) {
  const slides: Slide[] = [...items.map(item => ({ kind: 'item' as const, item })), { kind: 'ai' as const }];
  const count = slides.length;
  const [pos, setPos] = useState(0);
  const posRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    startPos: number;
    lastX: number;
    lastT: number;
    velocity: number;
    axis: 'x' | 'y' | null;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const updatePos = (next: number) => {
    posRef.current = next;
    setPos(next);
  };

  const stopAnimation = () => {
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  };

  useEffect(
    () => () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    },
    []
  );

  // カードが減ったら (カレンダーに入れたら) 範囲に収める
  if (pos > count - 1) updatePos(count - 1);

  const animateTo = (target: number) => {
    stopAnimation();
    const from = posRef.current;
    const distance = target - from;
    const duration = Math.min(700, 260 + Math.abs(distance) * 90);
    const startedAt = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration);
      updatePos(from + distance * easeOutCubic(t));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(step);
        return;
      }
      frameRef.current = null;
      updatePos(((Math.round(target) % count) + count) % count);
    };
    frameRef.current = requestAnimationFrame(step);
  };

  const move = (step: number) => animateTo(Math.round(posRef.current) + step);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging) return;
    stopAnimation();
    gestureRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPos: posRef.current,
      lastX: e.clientX,
      lastT: e.timeStamp,
      velocity: 0,
      axis: null,
    };
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g || dragging) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (g.axis == null) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (g.axis === 'x') {
        onSwipeChange(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }
    if (g.axis !== 'x') return;
    const dt = Math.max(1, e.timeStamp - g.lastT);
    // 直近の速さを少しなめらかにして使う (px/ms)
    g.velocity = g.velocity * 0.6 + ((e.clientX - g.lastX) / dt) * 0.4;
    g.lastX = e.clientX;
    g.lastT = e.timeStamp;
    updatePos(g.startPos - dx / SPACING_PX);
  };

  const handlePointerEnd = () => {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g || g.axis !== 'x') return;
    suppressClickRef.current = true;
    onSwipeChange(false);
    const projected = posRef.current - (g.velocity * MOMENTUM_MS) / SPACING_PX;
    animateTo(Math.round(projected));
  };

  // スワイプの直後に指を離した位置のカードがタップ扱いにならないようにする
  const handleClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  const centerIndex = ((Math.round(pos) % count) + count) % count;

  return (
    <div className='flex flex-col gap-1.5'>
      <div
        ref={listRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClickCapture={handleClickCapture}
        className='relative h-48 touch-pan-y select-none overflow-hidden [perspective:800px]'
      >
        {slides.map((slide, i) => {
          const offset = ringOffset(i, pos, count);
          const depth = Math.abs(offset);
          if (depth > VISIBLE_SIDE) return null;
          const isCenter = i === centerIndex;
          // 中央の隣までは間隔を広く、その先は詰めて重ねる (カバーフロー)
          const near = Math.min(depth, 1);
          const far = Math.max(depth - 1, 0);
          const x = Math.sign(offset) * (near * SPACING_PX * 1.15 + far * SPACING_PX * 0.5);
          const style = {
            transform: `translateX(calc(-50% + ${x}px)) translateZ(${-depth * 70}px) rotateY(${-Math.sign(offset) * near * 48}deg)`,
            zIndex: 100 - Math.round(depth * 10),
            opacity: depth > VISIBLE_SIDE - 1 ? Math.max(0, VISIBLE_SIDE - depth) : 1,
          };
          const cardClass =
            'absolute top-2 left-1/2 flex h-44 w-36 flex-col overflow-hidden rounded-2xl border bg-white text-left font-normal shadow-md will-change-transform sm:h-44';

          if (slide.kind === 'ai') {
            const content = (
              <>
                <Sparkles className='size-6 text-violet-600' />
                <span className='text-14px'>AI に提案</span>
              </>
            );
            return isCenter ? (
              <Button
                key='ai'
                asChild
                variant='outline'
                className={cn(cardClass, 'items-center justify-center gap-2 border-dashed')}
                style={style}
              >
                <Link to={candidatePaths.suggest(urlId)}>{content}</Link>
              </Button>
            ) : (
              <Button
                key='ai'
                variant='outline'
                onClick={() => animateTo(posRef.current + offset)}
                className={cn(cardClass, 'items-center justify-center gap-2 border-dashed')}
                style={style}
              >
                {content}
              </Button>
            );
          }

          const { item } = slide;
          return (
            <Button
              key={item.key}
              variant='outline'
              aria-label={isCenter ? `${item.title}を追加` : `${item.title}を中央に`}
              // 中央の 1 枚だけをカレンダーへドラッグできるようにする
              data-tray-item={isCenter ? '' : undefined}
              data-key={item.key}
              data-title={item.title}
              data-duration={toDurationStr(item.durationMin)}
              onClick={() => (isCenter ? onTapItem(item) : animateTo(posRef.current + offset))}
              className={cn(cardClass, 'items-stretch gap-0 p-0 sm:px-0', isCenter && 'border-primary/50')}
              style={style}
            >
              {item.kind === 'stay' ? (
                <span className='flex h-22 shrink-0 items-center justify-center bg-slate-200 font-bold text-18px text-slate-500'>
                  宿
                </span>
              ) : (
                <CategoryThumb
                  category={item.candidate.category}
                  size='sm'
                  className='h-22 w-full shrink-0 rounded-none'
                />
              )}
              <span className='flex min-h-0 flex-1 flex-col gap-1 px-2.5 py-2'>
                <span className='line-clamp-2 whitespace-normal font-bold text-14px leading-snug'>
                  {item.kind === 'stay' ? item.stay.name : item.title}
                </span>
                <span className='flex items-center gap-1 text-12px text-neutral-500'>
                  {item.kind === 'stay' ? `IN ${item.checkIn}` : formatDuration(item.durationMin)}
                  {item.likes > 0 && (
                    <>
                      <Heart className='ml-0.5 size-3 fill-primary text-primary' />
                      {item.likes}
                    </>
                  )}
                </span>
              </span>
            </Button>
          );
        })}
      </div>
      <div className='flex items-center justify-center gap-3'>
        <Button variant='ghost' size='icon' aria-label='前へ' onClick={() => move(-1)} className='size-8'>
          <ChevronLeft />
        </Button>
        <span className='w-12 text-center text-12px text-neutral-500 tabular-nums'>
          {centerIndex + 1} / {count}
        </span>
        <Button variant='ghost' size='icon' aria-label='次へ' onClick={() => move(1)} className='size-8'>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
