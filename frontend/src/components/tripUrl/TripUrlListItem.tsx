import { ExternalLink, Globe, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownViewer } from '@/components/ui/markdown';
import { getDomain } from '@/lib/utils';
import type { TripUrl } from '@/types';

interface TripUrlListItemProps {
  tripUrl: TripUrl;
  onEdit: (tripUrl: TripUrl) => void;
}

export const TripUrlListItem = ({ tripUrl, onEdit }: TripUrlListItemProps) => {
  const displayTitle = tripUrl.title?.trim() || tripUrl.url;

  return (
    <div className='flex gap-3 rounded-md border bg-white p-3'>
      {tripUrl.thumbnailUrl ? (
        <img
          src={tripUrl.thumbnailUrl}
          alt=''
          className='h-16 w-16 shrink-0 rounded-md border object-cover sm:h-20 sm:w-20'
          loading='lazy'
        />
      ) : (
        <div className='flex h-16 w-16 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground sm:h-20 sm:w-20'>
          <Globe className='h-6 w-6' />
        </div>
      )}

      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <a
          href={tripUrl.url}
          target='_blank'
          rel='noopener noreferrer'
          className='flex items-center gap-1 font-semibold text-14px sm:text-16px'
        >
          <span className='truncate'>{displayTitle}</span>
          <ExternalLink className='h-3 w-3 shrink-0 text-muted-foreground' />
        </a>
        <span className='truncate text-12px text-muted-foreground sm:text-14px'>{getDomain(tripUrl.url)}</span>
        {tripUrl.memo && (
          <div className='mt-1 line-clamp-3 text-12px text-foreground sm:text-14px'>
            <MarkdownViewer content={tripUrl.memo} />
          </div>
        )}
      </div>

      <Button
        type='button'
        variant='ghost'
        size='icon'
        aria-label='編集'
        onClick={() => onEdit(tripUrl)}
        className='shrink-0'
      >
        <Pencil className='h-4 w-4' />
      </Button>
    </div>
  );
};
