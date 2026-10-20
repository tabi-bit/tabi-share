import { ChevronRight, Heart, Search, Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Trip } from '@/types/trip';
import { AddFab } from '../components/AddFab';
import { PlaceholderMap } from '../components/PlaceholderMap';
import { SpotCandidateCard } from '../components/SpotCandidateCard';
import { SpotDetailDialog } from '../components/SpotDetailDialog';
import { isRejectedByAll, likersOf } from '../format';
import { ME, useCandidateMutations, useCandidates, useMembers, useStayDecisions } from '../hooks';
import { candidatePaths } from '../paths';
import type { SpotCandidate, Vote } from '../types';

const MAP_MAX = 190;
const MAP_MIN = 96;

const PIN_SHADES = ['bg-slate-400', 'bg-teal-300', 'bg-teal-500', 'bg-teal-700'];

/** 開いた時点の ♥ 数で並び順を固定する。投票のたびに行が動くと押し間違えるため */
const rankIds = (spots: SpotCandidate[]): number[] =>
  [...spots].sort((a, b) => likersOf(b).length - likersOf(a).length || b.id - a.id).map(s => s.id);

export function SpotsPanel({ trip }: { trip: Trip }) {
  const { spots, stays } = useCandidates(trip.id);
  const { members } = useMembers(trip.id);
  const { decisions } = useStayDecisions(trip.id);
  const { vote, remove, restore } = useCandidateMutations(trip.id);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const orderRef = useRef<number[] | null>(null);

  if (orderRef.current == null && spots.length > 0) orderRef.current = rankIds(spots);
  const order = orderRef.current ?? [];
  const position = (id: number) => {
    const i = order.indexOf(id);
    return i < 0 ? -1 : i;
  };

  const active = spots.filter(s => !isRejectedByAll(s, members)).sort((a, b) => position(a.id) - position(b.id));
  const unplaced = active.filter(s => s.placement == null);
  const placed = active.filter(s => s.placement != null);
  const rejected = spots.filter(s => isRejectedByAll(s, members));
  const unvotedCount = active.filter(s => s.votes[ME] == null).length;
  const detail = spots.find(s => s.id === detailId) ?? null;

  const firstNightStay = stays.find(s => s.id === decisions.find(d => d.night === 1)?.candidateId);
  const mapHeight = Math.max(MAP_MIN, MAP_MAX - scrollTop);

  const handleDelete = async (c: SpotCandidate) => {
    await remove(c.id);
    toast(`「${c.name}」を外しました`, {
      action: { label: '元に戻す', onClick: () => restore(c.id) },
      duration: 6000,
    });
  };

  const card = (c: SpotCandidate) => (
    <SpotCandidateCard
      key={c.id}
      candidate={c}
      members={members}
      myVote={c.votes[ME]}
      selected={detailId === c.id}
      onOpen={() => setDetailId(c.id)}
      onVote={(v: Vote | null) => vote(c, v)}
    />
  );

  return (
    <div className='relative flex min-h-0 flex-1 flex-col'>
      {active.length > 0 && (
        <div className={cn('shrink-0 px-4 pb-2', scrollTop > 0 && 'border-b')}>
          <PlaceholderMap
            style={{ height: mapHeight }}
            pins={[
              ...(firstNightStay
                ? [
                    {
                      id: 'stay',
                      position: firstNightStay.location,
                      label: '宿',
                      ariaLabel: firstNightStay.name,
                      className: 'size-5 rounded-md bg-slate-700 text-[9px]',
                    },
                  ]
                : []),
              ...active.map(s => {
                const likes = likersOf(s).length;
                return {
                  id: s.id,
                  position: s.location,
                  ariaLabel: `${s.name} ♥${likes}`,
                  callout: s.name,
                  selected: detailId === s.id,
                  // ♥ の多い所の名前を優先して残す
                  priority: -likes,
                  onClick: () => setDetailId(s.id),
                  className: cn('rounded-full', likes >= 2 ? 'size-4' : 'size-3', PIN_SHADES[Math.min(likes, 3)]),
                };
              }),
            ]}
          />
        </div>
      )}

      <div
        className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pt-2 pb-24'
        onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
      >
        {active.length === 0 && (
          <p className='py-10 text-center text-14px text-neutral-500'>
            まだ何もありません。
            <br />
            右下の ＋ から、行きたい所を入れてみましょう
          </p>
        )}
        {unvotedCount > 0 && (
          <Button
            asChild
            variant='outline'
            className='h-auto justify-between rounded-xl border-primary/40 bg-teal-50 px-3.5 py-3 font-normal hover:bg-teal-100 sm:h-auto'
          >
            <Link to={candidatePaths.vote(trip.urlId)}>
              <span className='flex items-center gap-2 text-14px'>
                <Heart className='fill-primary text-primary' />
                まだ見ていない所が {unvotedCount} か所あります
              </span>
              <span className='flex items-center font-medium text-14px text-primary'>
                選ぶ
                <ChevronRight />
              </span>
            </Link>
          </Button>
        )}
        {unplaced.map(card)}

        {(placed.length > 0 || rejected.length > 0) && (
          <Accordion type='multiple' className='mt-2'>
            {placed.length > 0 && (
              <AccordionItem value='placed'>
                <AccordionTrigger className='py-3 font-normal text-12px text-neutral-600'>
                  旅程に入れた所 {placed.length}
                </AccordionTrigger>
                <AccordionContent className='flex flex-col gap-2'>{placed.map(card)}</AccordionContent>
              </AccordionItem>
            )}
            {rejected.length > 0 && (
              <AccordionItem value='rejected'>
                <AccordionTrigger className='py-3 font-normal text-12px text-neutral-600'>
                  みんながパスした所 {rejected.length}
                </AccordionTrigger>
                <AccordionContent className='flex flex-col gap-2 opacity-60'>{rejected.map(card)}</AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        )}
      </div>

      <AddFab
        label='行きたい所を追加'
        choices={[
          {
            key: 'search',
            icon: <Search className='text-primary' />,
            label: '場所を探して追加',
            description: '名前や地図から選びます',
            to: candidatePaths.addPlace(trip.urlId),
          },
          {
            key: 'ai',
            icon: <Sparkles className='text-violet-600' />,
            label: 'AI に提案してもらう',
            description: 'エリアとやりたいことから探します',
            to: candidatePaths.suggest(trip.urlId),
          },
        ]}
      />
      <SpotDetailDialog
        spot={detail}
        members={members}
        myVote={detail?.votes[ME]}
        onOpenChange={open => !open && setDetailId(null)}
        onVote={v => detail && vote(detail, v)}
        onDelete={() => detail && handleDelete(detail)}
      />
    </div>
  );
}
