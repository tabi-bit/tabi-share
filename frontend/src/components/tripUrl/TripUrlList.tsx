import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AddTripUrlDialog, EditTripUrlDialog } from '@/dialogs';
import { useTripUrls } from '@/hooks/useTripUrls';
import type { TripUrl } from '@/types';
import { TripUrlListItem } from './TripUrlListItem';

interface TripUrlListProps {
  tripId: number;
}

export const TripUrlList = ({ tripId }: TripUrlListProps) => {
  const { tripUrls, isLoading } = useTripUrls(tripId);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<TripUrl['id'] | null>(null);

  const editingTripUrl = editingId != null ? (tripUrls?.find(u => u.id === editingId) ?? null) : null;

  const count = tripUrls?.length ?? 0;

  return (
    <>
      <Accordion type='single' collapsible className='w-full max-w-3xl rounded-lg border bg-white'>
        <AccordionItem value='trip-urls' className='px-3'>
          <AccordionTrigger>
            <span className='flex items-center gap-2'>
              URL ストック
              {count > 0 && (
                <span className='rounded-full bg-muted px-2 py-0.5 text-12px text-muted-foreground'>{count}</span>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className='flex flex-col gap-2 pb-2'>
              <div className='flex justify-end'>
                <Button type='button' size='sm' variant='outline' onClick={() => setAddOpen(true)}>
                  <Plus className='h-4 w-4' />
                  追加
                </Button>
              </div>

              {isLoading && (
                <>
                  <Skeleton className='h-20 w-full' />
                  <Skeleton className='h-20 w-full' />
                </>
              )}

              {!isLoading && count === 0 && (
                <p className='py-4 text-center text-14px text-muted-foreground'>まだ URL がストックされていません</p>
              )}

              {!isLoading &&
                tripUrls?.map(tripUrl => (
                  <TripUrlListItem key={tripUrl.id} tripUrl={tripUrl} onEdit={u => setEditingId(u.id)} />
                ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <AddTripUrlDialog open={addOpen} onOpenChange={setAddOpen} tripId={tripId} />

      {editingTripUrl && (
        <EditTripUrlDialog
          open={editingId != null}
          onOpenChange={next => {
            if (!next) setEditingId(null);
          }}
          tripUrl={editingTripUrl}
        />
      )}
    </>
  );
};
