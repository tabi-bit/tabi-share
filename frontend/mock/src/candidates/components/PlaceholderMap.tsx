import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type LatLng = { latitude: number; longitude: number };

export type MapPin = {
  id: string | number;
  /** 場所のない候補は null。地図には置かない */
  position: LatLng | null;
  ariaLabel: string;
  /** ピンの中に置く文字。callout を使うピンでは使わない */
  label?: ReactNode;
  /** ピンの上に出す名前の吹き出し。重なるときは隠して点だけにする */
  callout?: string;
  /** 選択中に吹き出しへ出す文 (時刻つきなど)。省略時は callout */
  calloutExpanded?: string;
  selected?: boolean;
  /** 吹き出しを残す優先度。小さいほど優先。選択中は常に最優先 */
  priority?: number;
  /** ピン本体のクラス (色・形)。省略時は teal の丸 */
  className?: string;
  onClick?: () => void;
};

interface PlaceholderMapProps {
  pins: MapPin[];
  hint?: ReactNode;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const PADDING = 0.14;
const CALLOUT_HEIGHT = 22;
/** ピンの中心から吹き出しの下端まで */
const CALLOUT_GAP = 9;
const CALLOUT_MAX_CHARS = 8;

type Box = { left: number; top: number; right: number; bottom: number };

type Callout = {
  text: string;
  /** 上に置けないとき (上端に近い・重なる) は下に置く */
  below: boolean;
  /** 左右の端からはみ出さないようにずらした量 (px)。しっぽはピンの真上に残す */
  shift: number;
  width: number;
};

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text);

/** 12px の文字幅のおおよその見積もり。全角 12px、半角 7px */
const estimateWidth = (text: string) => [...text].reduce((w, ch) => w + (ch.charCodeAt(0) > 0xff ? 12 : 7), 16);

const overlaps = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * 仮: Google Maps の代わりに置く地図。緯度経度を枠内に正規化して配置するだけ。
 * 名前の吹き出しは優先度順に置き、先に置いたものと重なる・枠からはみ出すものは隠す。
 * 本実装では components/google-maps 配下の地図に差し替える。
 */
export function PlaceholderMap({ pins: allPins, hint, className, style, children }: PlaceholderMapProps) {
  const pins = allPins.filter((p): p is MapPin & { position: LatLng } => p.position != null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const lats = pins.map(p => p.position.latitude);
  const lngs = pins.map(p => p.position.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 0.01;
  const spanLng = maxLng - minLng || 0.01;

  const project = (p: LatLng) => ({
    x: (PADDING + ((p.longitude - minLng) / spanLng) * (1 - PADDING * 2)) * 100,
    y: (PADDING + ((maxLat - p.latitude) / spanLat) * (1 - PADDING * 2)) * 100,
  });

  // 吹き出しを優先度順に置いていき、置けたものだけを表示する
  const shownCallouts = new Map<MapPin['id'], Callout>();
  if (size.width > 0) {
    const placed: Box[] = [];
    const ordered = pins
      .filter(p => p.callout)
      .sort((a, b) => Number(!!b.selected) - Number(!!a.selected) || (a.priority ?? 0) - (b.priority ?? 0));
    for (const pin of ordered) {
      const text = pin.selected
        ? (pin.calloutExpanded ?? pin.callout ?? '')
        : truncate(pin.callout ?? '', CALLOUT_MAX_CHARS);
      const { x, y } = project(pin.position);
      const cx = (x / 100) * size.width;
      const cy = (y / 100) * size.height;
      const width = estimateWidth(text);
      const overLeft = width / 2 - cx + 2;
      const overRight = cx + width / 2 - (size.width - 2);
      const shift = overLeft > 0 ? overLeft : overRight > 0 ? -overRight : 0;
      const left = cx - width / 2 + shift;
      const candidates = [false, true].map(below => ({
        below,
        box: {
          left,
          right: left + width,
          top: below ? cy + CALLOUT_GAP - 2 : cy - CALLOUT_GAP - CALLOUT_HEIGHT,
          bottom: below ? cy + CALLOUT_GAP + CALLOUT_HEIGHT : cy - CALLOUT_GAP + 2,
        },
      }));
      const fits = candidates.find(
        c => c.box.top >= 0 && c.box.bottom <= size.height && !placed.some(b => overlaps(b, c.box))
      );
      const chosen = fits ?? (pin.selected ? candidates[0] : null);
      if (chosen) {
        placed.push(chosen.box);
        shownCallouts.set(pin.id, { text, below: chosen.below, shift, width });
      }
    }
  }

  // 選択中のピンと吹き出しを最前面に置く
  const drawOrder = [...pins].sort((a, b) => Number(!!a.selected) - Number(!!b.selected));

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden rounded-xl border bg-[#eef2ee]', className)}
      style={style}
    >
      <svg
        aria-hidden='true'
        className='absolute inset-0 h-full w-full'
        viewBox='0 0 100 100'
        preserveAspectRatio='none'
      >
        <path d='M0 75 C 22 65, 34 80, 56 60 S 90 30, 100 35' stroke='#fff' strokeWidth='3' fill='none' />
        <path d='M17 0 C 25 30, 20 60, 31 100' stroke='#fff' strokeWidth='2.4' fill='none' />
        <path d='M64 100 C 67 75, 78 65, 84 0' stroke='#fff' strokeWidth='1.8' fill='none' />
        <ellipse cx='84' cy='86' rx='13' ry='9' fill='#cfe5f3' />
      </svg>
      {drawOrder.map(pin => {
        const { x, y } = project(pin.position);
        const callout = shownCallouts.get(pin.id);
        const Tag = pin.onClick ? 'button' : 'span';
        return (
          <Tag
            key={pin.id}
            type={pin.onClick ? 'button' : undefined}
            aria-label={pin.ariaLabel}
            aria-pressed={pin.onClick ? !!pin.selected : undefined}
            onClick={pin.onClick}
            className={cn(
              '-translate-x-1/2 -translate-y-1/2 absolute flex size-7 items-center justify-center',
              pin.onClick && 'hover:cursor-pointer'
            )}
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <span
              className={cn(
                'inline-flex shrink-0 items-center justify-center gap-0.5 border-2 border-white font-bold text-10px text-white shadow-md',
                pin.className ?? 'size-6 rounded-full bg-teal-600'
              )}
            >
              {pin.label}
            </span>
            {callout && (
              <span
                className={cn(
                  'absolute left-1/2 flex h-5.5 items-center justify-center whitespace-nowrap rounded-md font-medium text-12px shadow-sm',
                  "after:-translate-x-1/2 after:absolute after:left-(--tail) after:border-x-4 after:border-x-transparent after:content-['']",
                  callout.below ? 'after:bottom-full after:border-b-4' : 'after:top-full after:border-t-4',
                  pin.selected
                    ? 'bg-primary text-white after:border-t-primary after:border-b-primary'
                    : 'bg-white text-gray-800 after:border-t-white after:border-b-white'
                )}
                style={
                  {
                    width: callout.width,
                    marginLeft: callout.shift - callout.width / 2,
                    '--tail': `${callout.width / 2 - callout.shift}px`,
                    ...(callout.below
                      ? { top: `calc(50% + ${CALLOUT_GAP}px)` }
                      : { bottom: `calc(50% + ${CALLOUT_GAP}px)` }),
                  } as CSSProperties & { '--tail': string }
                }
              >
                {callout.text}
              </span>
            )}
          </Tag>
        );
      })}
      {hint && (
        <span className='absolute top-2 right-2 rounded bg-white/90 px-1.5 py-0.5 text-10px text-neutral-600'>
          {hint}
        </span>
      )}
      {children}
    </div>
  );
}
