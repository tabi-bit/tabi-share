import { cn } from '@/lib/utils';
import type { Trip } from '@/types/trip';
import { splitTrips, tripLinkOf } from '../status';
import type { TripPlanningSummary } from '../types';
import { HomeTripListItem } from './HomeTripListItem';

interface TripSectionsProps {
  trips: Trip[];
  summaryOf: (tripId: number) => TripPlanningSummary | null;
  leavingTripId: Trip['id'] | null;
  disabled: boolean;
  compact?: boolean;
  onToggleArchive: (trip: Trip) => void;
}

/** 「これからの旅」「これまでの旅」の 2 セクションに分けた旅一覧 */
export const TripSections = ({
  trips,
  summaryOf,
  leavingTripId,
  disabled,
  compact,
  onToggleArchive,
}: TripSectionsProps) => {
  const { upcoming, past } = splitTrips(trips);
  const sections = [
    { key: 'upcoming', title: 'これからの旅', trips: upcoming },
    { key: 'past', title: 'これまでの旅', trips: past },
  ].filter(s => s.trips.length > 0);

  return (
    <div className={cn('flex flex-col', compact ? 'gap-4' : 'gap-6')}>
      {sections.map(section => (
        <section key={section.key} aria-labelledby={`trip-section-${section.key}`}>
          <h2
            id={`trip-section-${section.key}`}
            className={cn('mb-2 font-bold text-gray-700', compact ? 'px-1 text-12px' : 'text-16px')}
          >
            {section.title}
          </h2>
          <ul>
            {section.trips.map(trip => {
              const summary = summaryOf(trip.id);
              return (
                <HomeTripListItem
                  key={trip.id}
                  trip={trip}
                  to={tripLinkOf(trip, summary)}
                  archived={false}
                  leaving={leavingTripId === trip.id}
                  disabled={disabled}
                  compact={compact}
                  onToggleArchive={onToggleArchive}
                />
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};
