import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDuration, formatHours, likersOf, sourceShortLabel } from '../format';
import type { Member, SpotCandidate, Vote } from '../types';
import { CategoryThumb } from './CategoryThumb';

interface SpotCandidateCardProps {
  candidate: SpotCandidate;
  members: Member[];
  myVote: Vote | undefined;
  selected?: boolean;
  onOpen: () => void;
  onVote: (vote: Vote | null) => void;
}

/** 仮: 行きたい所の候補カード。比べるための情報 (評価・滞在・営業時間・距離・理由) は一覧に出し、パス・削除はタップで開く詳細に置く */
export function SpotCandidateCard({ candidate: c, members, myVote, selected, onOpen, onVote }: SpotCandidateCardProps) {
  const liked = myVote === 'like';
  const facts = [
    c.rating != null && `★${c.rating}`,
    `滞在 ${formatDuration(c.durationMin)}`,
    formatHours(c.hours),
    c.distanceKm != null && `宿から ${c.distanceKm}km`,
    !c.location && '場所なし',
  ].filter(Boolean);

  return (
    <article
      id={`candidate-${c.id}`}
      className={cn(
        'relative flex items-start gap-3 rounded-xl border bg-white p-2.5 transition-colors',
        selected ? 'border-primary ring-1 ring-primary/40' : 'border-neutral-200'
      )}
    >
      <Button
        variant='ghost'
        aria-label={`${c.name}の詳細`}
        onClick={onOpen}
        className='absolute inset-0 h-auto rounded-xl sm:h-auto'
      />
      <CategoryThumb category={c.category} size='sm' className='pointer-events-none relative' />
      <div className='pointer-events-none relative flex min-w-0 flex-1 flex-col gap-0.5'>
        <span className='flex min-w-0 items-baseline gap-2'>
          <span className='truncate font-bold text-14px'>{c.name}</span>
          <span className='shrink-0 text-10px text-neutral-500'>
            {c.category} ・ {sourceShortLabel(c, members)}
          </span>
        </span>
        <span className='text-12px text-neutral-700 tabular-nums'>{facts.join(' ・ ')}</span>
        {c.reason && <p className='line-clamp-1 text-12px text-neutral-500 leading-normal'>{c.reason}</p>}
        {c.placement && <span className='text-12px text-primary'>{c.placement.pageTitle}に入れました</span>}
      </div>
      <Button
        variant='outline'
        size='sm'
        aria-label='行きたい'
        aria-pressed={liked}
        onClick={() => onVote(liked ? null : 'like')}
        className={cn('relative h-9 shrink-0 gap-1 rounded-full px-3 sm:h-9', liked && 'border-primary bg-teal-50')}
      >
        <Heart className={liked ? 'fill-primary text-primary' : 'text-neutral-500'} />
        <span className={liked ? 'text-primary' : 'text-neutral-600'}>{likersOf(c).length}</span>
      </Button>
    </article>
  );
}
