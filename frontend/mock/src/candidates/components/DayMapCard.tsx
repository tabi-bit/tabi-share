import { useSetAtom } from 'jotai';
import { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import type { Block } from '@/types/block';
import { highlightedBlockIdAtom } from '../atoms';
import { PlaceholderMap } from './PlaceholderMap';

type LocatedBlock = Block & { location: { latitude: number; longitude: number; name: string } };

/** 地図に載せる予定 (場所に座標がある schedule ブロック) */
export const locatedSchedules = (blocks: Block[]): LocatedBlock[] =>
  blocks.filter(
    (b): b is LocatedBlock => b.type === 'schedule' && b.location?.latitude != null && b.location?.longitude != null
  );

const formatTime = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

/**
 * 仮: 閲覧画面の「N日目の地図」。順番は下の予定一覧が示すので、地図は名前の吹き出しで「どこに何があるか」だけを見せる。
 * ピンをタップすると吹き出しに時刻が付き、もう一度タップするとタイムラインの該当予定へスクロールする
 */
export function DayMapCard({ title, blocks }: { title: string; blocks: Block[] }) {
  const setHighlighted = useSetAtom(highlightedBlockIdAtom);
  const [picked, setPicked] = useState<number | null>(null);
  const located = locatedSchedules(blocks);
  if (located.length === 0) return null;
  const now = Date.now();
  const nextId = located.find(b => b.startTime.getTime() > now)?.id ?? null;

  // 1 回目のタップは吹き出しを広げるだけ。地図を見ている途中で画面が動かないよう、スクロールは同じピンの 2 回目のタップで行う
  const pick = (id: number) => {
    if (picked !== id) {
      setPicked(id);
      return;
    }
    setHighlighted(id);
    // scrollIntoView だとページスワイプ用の横スクロールまで動いてしまうため、縦方向だけ動かす
    const el = document.querySelector<HTMLElement>(`[data-block-id="${id}"]`);
    const scroller = el?.closest<HTMLElement>('.overflow-y-auto');
    if (!(el && scroller)) return;
    const offset = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    scroller.scrollTo({
      top: scroller.scrollTop + offset - scroller.clientHeight / 2 + el.clientHeight / 2,
      behavior: 'smooth',
    });
  };

  return (
    <Accordion
      type='single'
      collapsible
      defaultValue='map'
      className='mb-4 w-full overflow-hidden rounded-xl border bg-white'
    >
      <AccordionItem value='map'>
        <AccordionTrigger className='rounded-none bg-neutral-50 px-2.5 py-1.5 font-normal text-12px text-neutral-600'>
          {title}の地図 ・ {located.length} か所
        </AccordionTrigger>
        <AccordionContent className='pb-0'>
          <PlaceholderMap
            className='h-44 rounded-none border-0 border-t'
            pins={located.map((b, i) => ({
              id: b.id,
              position: b.location,
              ariaLabel: `${formatTime(b.startTime)} ${b.title}`,
              callout: b.title,
              calloutExpanded: `${formatTime(b.startTime)} ${b.title}`,
              selected: picked === b.id,
              // 次の予定の名前を優先して残し、あとは時刻順
              priority: b.id === nextId ? -1 : i,
              onClick: () => pick(b.id),
              className: cn('rounded-full bg-teal-600', picked === b.id ? 'size-4' : 'size-3'),
            }))}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
