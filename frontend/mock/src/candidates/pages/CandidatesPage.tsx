import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatTripRangeMD } from '@/lib/date';
import type { Trip } from '@/types/trip';
import { RecruitSettingsDialog } from '../components/RecruitSettingsDialog';
import { SubPageHeader } from '../components/SubPageHeader';
import { formatDeadline, isRejectedByAll } from '../format';
import { useCandidates, useMembers, useRecruitment, useUpdateRecruitment } from '../hooks';
import { candidatePaths } from '../paths';
import { SpotsPanel } from './SpotsPanel';
import { StaysPanel } from './StaysPanel';

/** 候補ページ。行きたい所と宿をタブで切り替える */
export function CandidatesPage({ trip }: { trip: Trip }) {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'stays' ? 'stays' : 'spots';
  const { spots, stays } = useCandidates(trip.id);
  const { recruitment } = useRecruitment(trip.id);
  const updateRecruitment = useUpdateRecruitment(trip.id);
  const { members } = useMembers(trip.id);
  const [recruitOpen, setRecruitOpen] = useState(false);
  const activeSpotCount = spots.filter(s => !isRejectedByAll(s, members)).length;
  const deadline = formatDeadline(recruitment?.deadline ?? null);

  return (
    <div className='flex h-dvh w-full flex-col'>
      <SubPageHeader
        backTo={candidatePaths.trip(trip.urlId)}
        backLabel='旅程に戻る'
        title={
          <div className='flex flex-col'>
            <span className='font-normal text-14px'>{trip.title}</span>
            <span className='font-normal text-12px text-slate-500'>
              {formatTripRangeMD(trip.startDate, trip.endDate)}
            </span>
          </div>
        }
        right={
          recruitment && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setRecruitOpen(true)}
              className='h-auto flex-col items-end gap-0 py-1 font-normal text-12px text-neutral-600 sm:h-auto'
            >
              {recruitment.active ? 'みんなから集めています' : 'みんなから集める'}
              {recruitment.active && deadline && <span className='text-10px text-neutral-500'>{deadline} まで</span>}
            </Button>
          )
        }
      />
      <Tabs
        value={tab}
        onValueChange={v => setParams(v === 'stays' ? { tab: 'stays' } : {}, { replace: true })}
        className='min-h-0 flex-1 gap-0 pt-3'
      >
        <div className='px-4 pb-2.5'>
          <TabsList className='w-full'>
            <TabsTrigger value='spots'>
              行きたい所 <span className='font-normal text-neutral-500'>{activeSpotCount}</span>
            </TabsTrigger>
            <TabsTrigger value='stays'>
              宿 <span className='font-normal text-neutral-500'>{stays.length}</span>
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value='spots' className='flex min-h-0 flex-col'>
          <SpotsPanel trip={trip} />
        </TabsContent>
        <TabsContent value='stays' className='flex min-h-0 flex-col'>
          <StaysPanel trip={trip} />
        </TabsContent>
      </Tabs>
      {recruitment && (
        <RecruitSettingsDialog
          open={recruitOpen}
          onOpenChange={setRecruitOpen}
          recruitment={recruitment}
          voteUrl={`${window.location.origin}${candidatePaths.vote(trip.urlId)}`}
          onSubmit={updateRecruitment}
        />
      )}
    </div>
  );
}
