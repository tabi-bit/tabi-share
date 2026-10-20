import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPrice, likersOf, MEAL_LABELS, priceUnitSuffix, SITE_LABELS } from '../format';
import type { StayCandidate, StayDecision, Vote } from '../types';

interface StayCandidateCardProps {
  stay: StayCandidate;
  /** この泊の決定状況。null なら未決定 */
  decision: StayDecision | null;
  /** ♥ の付いた行きたい所までの距離の範囲 */
  rangeLabel: string | null;
  selected: boolean;
  onOpen: () => void;
  onVote: (vote: Vote | null) => void;
}

/** 仮: 宿の候補カード。比べるための料金 (サイトごと)・食事・距離・メモは一覧に出し、決定などの操作はタップで開く詳細に置く */
export function StayCandidateCard({ stay, decision, rangeLabel, selected, onOpen, onVote }: StayCandidateCardProps) {
  const decidedHere = decision?.candidateId === stay.id;
  const reservedSite = decidedHere ? decision.reservedSite : null;
  const priced = stay.links.filter(l => l.price != null).sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  const liked = stay.votes.me === 'like';

  return (
    <article
      className={cn(
        'relative flex items-start gap-3 rounded-xl border bg-white p-2.5',
        decidedHere
          ? 'border-2 border-primary'
          : selected
            ? 'border-primary ring-1 ring-primary/40'
            : 'border-neutral-200'
      )}
    >
      <Button
        variant='ghost'
        aria-label={`${stay.name}の詳細`}
        onClick={onOpen}
        className='absolute inset-0 h-auto rounded-xl sm:h-auto'
      />
      <div className='pointer-events-none relative flex size-14 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-center text-[9px] text-slate-500'>
        [OGP]
      </div>
      <div className='pointer-events-none relative flex min-w-0 flex-1 flex-col gap-0.5'>
        <span className='truncate font-bold text-14px'>{stay.name}</span>
        {decidedHere && (
          <span className='text-12px text-primary'>
            {reservedSite ? `${SITE_LABELS[reservedSite]}で予約済み` : 'ここに決めました'}
          </span>
        )}
        {priced.length > 0 ? (
          <span className='flex flex-col text-12px text-neutral-700 tabular-nums'>
            {priced.map(l => (
              <span key={l.site}>
                <span className='font-medium'>{formatPrice(l.price ?? 0)}</span>
                <span className='text-neutral-500'>
                  {' '}
                  {priceUnitSuffix(l.priceUnit)} ・ {SITE_LABELS[l.site]}
                  {l.meal && ` ・ ${MEAL_LABELS[l.meal]}`}
                </span>
              </span>
            ))}
          </span>
        ) : (
          <span className='text-12px text-neutral-500'>料金はまだ入っていません</span>
        )}
        {rangeLabel && <span className='text-12px text-neutral-500'>♥ の行きたい所まで {rangeLabel}</span>}
        {stay.memo && <p className='line-clamp-1 text-12px text-neutral-500'>{stay.memo}</p>}
      </div>
      {!decidedHere && (
        <Button
          variant='outline'
          size='sm'
          aria-label='行きたい'
          aria-pressed={liked}
          onClick={() => onVote(liked ? null : 'like')}
          className={cn('relative h-9 shrink-0 gap-1 rounded-full px-3 sm:h-9', liked && 'border-primary bg-teal-50')}
        >
          <Heart className={liked ? 'fill-primary text-primary' : 'text-neutral-500'} />
          <span className={liked ? 'text-primary' : 'text-neutral-600'}>{likersOf(stay).length}</span>
        </Button>
      )}
    </article>
  );
}
