import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { Trip } from '@/types/trip';
import { formatDeadline, isRejectedByAll } from '../format';
import { ME, useCandidates, useMembers, useRecruitment } from '../hooks';
import { candidatePaths } from '../paths';

/** 仮: 閲覧画面の先頭に出す「行きたい所を募集中」バナー */
export function RecruitBanner({ trip }: { trip: Trip }) {
  const { recruitment } = useRecruitment(trip.id);
  const { spots } = useCandidates(trip.id);
  const { members } = useMembers(trip.id);
  if (!recruitment?.active) return null;

  const active = spots.filter(s => !isRejectedByAll(s, members));
  const unvoted = active.filter(s => s.votes[ME] == null).length;
  const deadline = formatDeadline(recruitment.deadline);

  return (
    <section className='mb-4 flex w-full flex-col gap-2.5 rounded-xl border border-teal-200 bg-teal-50 p-3'>
      <div className='flex items-center gap-2.5'>
        <span className='inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-500 text-white'>
          <Heart className='size-4 fill-current' />
        </span>
        <div className='flex min-w-0 flex-1 flex-col'>
          <span className='font-bold text-14px text-teal-900'>行きたい所を集めています</span>
          <span className='text-12px text-teal-700'>
            {deadline && `${deadline} まで ・ `}いま {active.length} か所
          </span>
        </div>
      </div>
      <Button asChild>
        <Link to={unvoted > 0 ? candidatePaths.vote(trip.urlId) : candidatePaths.candidates(trip.urlId)}>
          {unvoted > 0 ? `${unvoted} か所に ♥ を付ける` : 'みんなの結果を見る'}
        </Link>
      </Button>
    </section>
  );
}
