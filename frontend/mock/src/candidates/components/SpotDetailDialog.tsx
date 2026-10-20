import { BOTTOM_DIALOG_CLASS } from '@mock/stepFlow/stepDialog';
import { Heart, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDuration, formatHours, likerNames, sourceLabel } from '../format';
import type { Member, SpotCandidate, Vote } from '../types';
import { CategoryThumb } from './CategoryThumb';

interface SpotDetailDialogProps {
  spot: SpotCandidate | null;
  members: Member[];
  myVote: Vote | undefined;
  onOpenChange: (open: boolean) => void;
  onVote: (vote: Vote | null) => void;
  onDelete: () => void;
}

/** 仮: 行きたい所の詳細。一覧のカードには出さない情報と、パス・削除をここに置く */
export function SpotDetailDialog({ spot, members, myVote, onOpenChange, onVote, onDelete }: SpotDetailDialogProps) {
  if (!spot) return null;
  const facts = [
    spot.rating != null && ['評価', `★ ${spot.rating}`],
    ['滞在の目安', formatDuration(spot.durationMin)],
    ['営業時間', formatHours(spot.hours)],
    spot.distanceKm != null && ['宿から', `${spot.distanceKm}km`],
  ].filter((f): f is [string, string] => Array.isArray(f));
  const likers = likerNames(spot, members);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className={BOTTOM_DIALOG_CLASS}>
        <DialogHeader className='flex-row items-center gap-3 text-left'>
          <CategoryThumb category={spot.category} size='sm' className='size-12' />
          <div className='flex min-w-0 flex-col gap-0.5'>
            <DialogTitle className='text-18px'>{spot.name}</DialogTitle>
            <DialogDescription className='text-12px'>{[spot.category, ...spot.tags].join(' ・ ')}</DialogDescription>
          </div>
        </DialogHeader>
        <div className='flex flex-col gap-3'>
          {spot.reason && <p className='text-14px text-neutral-800 leading-relaxed'>{spot.reason}</p>}
          <dl className='grid grid-cols-2 gap-x-4 gap-y-1.5 text-12px'>
            {facts.map(([k, v]) => (
              <div key={k} className='flex gap-2'>
                <dt className='text-neutral-500'>{k}</dt>
                <dd className='text-neutral-800'>{v}</dd>
              </div>
            ))}
          </dl>
          <div className='flex flex-col gap-0.5 text-12px text-neutral-600'>
            <span>{sourceLabel(spot, members)}</span>
            {likers && <span>行きたい: {likers}</span>}
            {spot.placement && <span className='text-primary'>{spot.placement.pageTitle}の旅程に入っています</span>}
          </div>
        </div>
        <div className='flex flex-col gap-2 pt-1'>
          <Button
            variant='ghost'
            size='sm'
            className='self-start px-0 text-neutral-500'
            onClick={() => {
              onDelete();
              onOpenChange(false);
            }}
          >
            <Trash2 />
            候補から外す
          </Button>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='lg'
              aria-pressed={myVote === 'pass'}
              className='h-12 flex-1 sm:h-12'
              onClick={() => onVote(myVote === 'pass' ? null : 'pass')}
            >
              <X />
              {myVote === 'pass' ? 'パスを取り消す' : 'パス'}
            </Button>
            <Button
              size='lg'
              variant={myVote === 'like' ? 'outline' : 'default'}
              aria-pressed={myVote === 'like'}
              className='h-12 flex-2 sm:h-12'
              onClick={() => onVote(myVote === 'like' ? null : 'like')}
            >
              <Heart className={myVote === 'like' ? 'fill-primary text-primary' : 'fill-current'} />
              {myVote === 'like' ? '行きたいを取り消す' : '行きたい'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
