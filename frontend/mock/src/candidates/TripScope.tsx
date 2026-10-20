import { useSetAtom } from 'jotai';
import { type ReactNode, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { tripAtom } from '@/atoms/tripPage';
import { FetchErrorView } from '@/components/FetchErrorView';
import { HeaderSkeleton } from '@/components/HeaderSkeleton';
import { NoIndex } from '@/components/NoIndex';
import { Title } from '@/components/Title';
import { TimelineSkeleton } from '@/components/timeline';
import { useTripByUrlId } from '@/hooks/useTrips';
import type { Trip } from '@/types/trip';

/** URL の urlId から Trip を取得し、tripAtom に入れてから子を描画する */
export function TripScope({ title, children }: { title: string; children: (trip: Trip) => ReactNode }) {
  const { urlId } = useParams<{ urlId: string }>();
  const { trip, error } = useTripByUrlId(urlId ?? null);
  const setTrip = useSetAtom(tripAtom);

  useEffect(() => {
    if (trip) setTrip(trip);
  }, [trip, setTrip]);

  if (error) return <FetchErrorView error={error} className='w-full max-w-3xl p-4' />;
  if (!trip) {
    return (
      <div className='flex h-dvh w-full flex-col'>
        <HeaderSkeleton />
        <TimelineSkeleton className='w-full max-w-3xl p-4' />
      </div>
    );
  }

  return (
    <>
      <NoIndex />
      <Title>{`${title} - ${trip.title}`}</Title>
      {/* PC ではスマホ幅のカラムに収める (なんちゃってレスポンシブ) */}
      <div className='min-h-dvh bg-neutral-100'>
        <div className='relative mx-auto w-full max-w-2xl bg-white md:border-x md:shadow-sm'>{children(trip)}</div>
      </div>
    </>
  );
}
