import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Block } from '@/types/block';
import { formatHours, isOutsideHours } from '../format';
import { useCandidates } from '../hooks';

const pad = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

/** 仮: 候補から配置したブロックの営業時間外の警告。♥ の数は旅程を見る人には要らないため出さない */
export function BlockCandidateMarks({ tripId, block }: { tripId: number; block: Block }) {
  const { spots } = useCandidates(tripId);
  const candidate = spots.find(s => s.placedBlockId === block.id);
  if (!(candidate && isOutsideHours(candidate.hours, block.startTime, block.endTime))) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          aria-label='営業時間外の可能性'
          className='size-5.5 shrink-0 rounded-full bg-amber-100 hover:bg-amber-200'
        >
          <TriangleAlert className='size-3.5 text-amber-700' strokeWidth={2.2} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-72 border-amber-300 bg-amber-50 text-12px text-amber-950 leading-relaxed'>
        営業時間外の可能性があります。Google マップ上の営業時間は {formatHours(candidate.hours)} です。この予定は{' '}
        {pad(block.startTime)}–{block.endTime ? pad(block.endTime) : ''}。最新の情報は公式サイトで確認してください。
      </PopoverContent>
    </Popover>
  );
}
