import dayjs from 'dayjs';
import { ChevronDown, ExternalLink, Link2, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Trip } from '@/types/trip';
import { AddFab } from '../components/AddFab';
import { OpenLinksDialog } from '../components/OpenLinksDialog';
import { PlaceholderMap } from '../components/PlaceholderMap';
import { type ReserveInput, ReserveStayDialog } from '../components/ReserveStayDialog';
import { StayCandidateCard } from '../components/StayCandidateCard';
import { StayDetailDialog } from '../components/StayDetailDialog';
import { likersOf } from '../format';
import { distanceKm, formatKm } from '../geo';
import { useCandidateMutations, useCandidates, useMembers, useStayDecisions, useUpdateStayDecision } from '../hooks';
import { candidatePaths } from '../paths';
import type { BookingLink, StayCandidate } from '../types';

const nightsOf = (trip: Trip, stays: StayCandidate[]): number => {
  if (trip.startDate && trip.endDate) return Math.max(1, dayjs(trip.endDate).diff(trip.startDate, 'day'));
  return Math.max(1, ...stays.flatMap(s => s.nights));
};

export function StaysPanel({ trip }: { trip: Trip }) {
  const { spots, stays } = useCandidates(trip.id);
  const { members } = useMembers(trip.id);
  const { decisions } = useStayDecisions(trip.id);
  const { vote, update } = useCandidateMutations(trip.id);
  const updateDecision = useUpdateStayDecision(trip.id);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [openNights, setOpenNights] = useState<number[]>([]);
  const [linksNight, setLinksNight] = useState<number | null>(null);
  const [reserveTarget, setReserveTarget] = useState<{ stay: StayCandidate; night: number } | null>(null);
  const [detail, setDetail] = useState<{ id: number; night: number } | null>(null);

  const totalNights = nightsOf(trip, stays);
  const likedSpots = spots.filter(s => likersOf(s).length > 0);
  const decidedIds = decisions.map(d => d.candidateId);
  const detailStay = stays.find(s => s.id === detail?.id) ?? null;

  const rangeOf = (stay: StayCandidate): string | null => {
    const from = stay.location;
    const targets = likedSpots.flatMap(s => (s.location ? [s.location] : []));
    if (!from || targets.length === 0) return null;
    const ds = targets.map(to => distanceKm(from, to));
    return `${formatKm(Math.min(...ds))}〜${formatKm(Math.max(...ds))}`;
  };

  const handleReserve = async (input: ReserveInput) => {
    if (!reserveTarget) return;
    const { stay, night } = reserveTarget;
    const hasLink = stay.links.some(l => l.site === input.site);
    const links = hasLink
      ? stay.links.map(l =>
          l.site === input.site ? { ...l, price: l.price ?? input.price, meal: l.meal ?? input.meal } : l
        )
      : [...stay.links, { site: input.site, url: '', price: input.price, meal: input.meal }];
    await update(stay.id, {
      links,
      memo: input.memo ? [stay.memo, input.memo].filter(Boolean).join('\n') : stay.memo,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
    });
    await updateDecision(night, {
      candidateId: stay.id,
      reservedSite: input.site,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
    });
    setReserveTarget(null);
    toast.success(`${night}泊目を予約済みにしました`);
  };

  const updateLink = (stay: StayCandidate, link: BookingLink) =>
    update(stay.id, { links: stay.links.map(l => (l.site === link.site ? link : l)) });

  return (
    <div className='relative flex min-h-0 flex-1 flex-col'>
      <div className='flex shrink-0 flex-col border-b px-4 pb-2'>
        {stays.length > 0 && (
          <PlaceholderMap
            className='h-48 shrink-0'
            pins={[
              ...likedSpots.map(s => ({
                id: `spot-${s.id}`,
                position: s.location,
                ariaLabel: s.name,
                className: 'size-2.5 rounded-full bg-teal-500',
              })),
              ...stays.map(s => ({
                id: s.id,
                position: s.location,
                ariaLabel: s.name,
                callout: s.name,
                selected: selectedId === s.id,
                // 決めた宿の名前を優先して残す
                priority: decidedIds.includes(s.id) ? 0 : 1,
                onClick: () => {
                  setSelectedId(s.id);
                  const night = s.nights[0] ?? 1;
                  setDetail({ id: s.id, night });
                },
                className: cn('size-3.5 rounded-sm', decidedIds.includes(s.id) ? 'bg-primary' : 'bg-slate-600'),
              })),
            ]}
          />
        )}
      </div>

      <div className='flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pt-2 pb-24'>
        {Array.from({ length: totalNights }, (_, i) => i + 1).map(night => {
          const all = stays.filter(s => s.nights.includes(night));
          const decision = decisions.find(d => d.night === night) ?? null;
          const decided = decision ? all.find(s => s.id === decision.candidateId) : undefined;
          const others = decided ? all.filter(s => s.id !== decided.id) : [];
          const isOpen = openNights.includes(night);
          const shown = decided ? [decided, ...(isOpen ? others : [])] : all;

          return (
            <section key={night} className='flex flex-col gap-2'>
              <div className='flex items-baseline justify-between gap-2 pt-2'>
                <span className='font-bold text-16px'>{night}泊目</span>
                {all.filter(s => s.links.some(l => l.url)).length >= 2 && (
                  <Button
                    variant='ghost'
                    size='sm'
                    className='mr-auto h-auto px-1.5 py-0.5 font-normal text-12px text-neutral-600 sm:h-auto'
                    onClick={() => setLinksNight(night)}
                  >
                    <ExternalLink className='size-3.5' />
                    ページをまとめて開く
                  </Button>
                )}
                {decision && decided && !decision.reservedSite ? (
                  <Button
                    variant='link'
                    size='sm'
                    className='h-auto p-0 text-12px sm:h-auto sm:text-12px'
                    onClick={() => setReserveTarget({ stay: decided, night })}
                  >
                    予約済みにする
                  </Button>
                ) : (
                  <span className='text-12px text-neutral-500'>
                    {decision ? '予約済み' : all.length > 0 ? `${all.length} 件から選ぶ` : ''}
                  </span>
                )}
              </div>
              {all.length === 0 && (
                <p className='rounded-lg border border-dashed px-3 py-4 text-center text-12px text-neutral-500'>
                  まだありません。右下の ＋ から入れられます
                </p>
              )}
              {shown.map(stay => (
                <StayCandidateCard
                  key={stay.id}
                  stay={stay}
                  decision={decision}
                  rangeLabel={rangeOf(stay)}
                  selected={selectedId === stay.id}
                  onOpen={() => {
                    setSelectedId(stay.id);
                    setDetail({ id: stay.id, night });
                  }}
                  onVote={v => vote(stay, v)}
                />
              ))}
              {others.length > 0 && (
                <Button
                  variant='ghost'
                  aria-expanded={isOpen}
                  onClick={() => setOpenNights(o => (isOpen ? o.filter(n => n !== night) : [...o, night]))}
                  className='w-full justify-between bg-neutral-100 font-normal text-12px text-neutral-600 sm:text-12px'
                >
                  ほかの候補 {others.length} 件
                  <ChevronDown className={cn('transition-transform', isOpen && 'rotate-180')} />
                </Button>
              )}
            </section>
          );
        })}
      </div>

      <AddFab
        label='宿を追加'
        choices={[
          {
            key: 'url',
            icon: <Link2 className='text-primary' />,
            label: '宿のページの URL から',
            description: '宿名と写真を読み込みます',
            to: candidatePaths.addStayUrls(trip.urlId),
          },
          {
            key: 'search',
            icon: <Search className='text-primary' />,
            label: '場所を探して追加',
            description: '宿の名前や地図から選びます',
            to: candidatePaths.addPlace(trip.urlId, 'stay'),
          },
        ]}
      />
      {detailStay && detail && (
        <StayDetailDialog
          stay={detailStay}
          night={detail.night}
          totalNights={totalNights}
          members={members}
          decision={decisions.find(d => d.night === detail.night) ?? null}
          rangeLabel={rangeOf(detailStay)}
          onOpenChange={open => !open && setDetail(null)}
          onDecide={() => {
            updateDecision(detail.night, {
              candidateId: detailStay.id,
              reservedSite: null,
              checkIn: detailStay.checkIn,
              checkOut: detailStay.checkOut,
            });
            setDetail(null);
          }}
          onReserve={() => {
            setReserveTarget({ stay: detailStay, night: detail.night });
            setDetail(null);
          }}
          onUndoDecision={() => {
            updateDecision(detail.night, null);
            setDetail(null);
          }}
          onUpdateLink={link => updateLink(detailStay, link)}
          onUpdateNights={nights => update(detailStay.id, { nights })}
        />
      )}
      <OpenLinksDialog
        open={linksNight != null}
        onOpenChange={open => !open && setLinksNight(null)}
        title={`${linksNight ?? ''}泊目の宿のページ`}
        stays={stays.filter(s => linksNight != null && s.nights.includes(linksNight))}
      />
      {reserveTarget && (
        <ReserveStayDialog
          open
          onOpenChange={open => !open && setReserveTarget(null)}
          stay={reserveTarget.stay}
          night={reserveTarget.night}
          onSubmit={handleReserve}
        />
      )}
    </div>
  );
}
