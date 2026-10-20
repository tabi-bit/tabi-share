import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVisitedPlaces } from '../hooks';
import { VisitedGlobe } from './VisitedGlobe';

/** 仮: ホーム上部の「行った所」地球儀 */
export function VisitedGlobeCard({ className }: { className?: string }) {
  const { places } = useVisitedPlaces();

  return (
    <section aria-label='行った所' className={cn('relative', className)}>
      <VisitedGlobe places={places} className='h-full w-full rounded-2xl border border-teal-100 bg-teal-100' />
      <div className='pointer-events-none absolute top-2 left-2 flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-12px text-gray-700 shadow-sm'>
        <MapPin className='size-3.5 text-orange-500' />
        行った所 <span className='font-bold tabular-nums'>{places.length}</span> か所
      </div>
    </section>
  );
}
