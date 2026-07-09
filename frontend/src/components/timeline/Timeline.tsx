import type { Block } from '@/types/block';
import { ViewTimeline } from './ViewTimeline';

interface TimelineProps {
  blocks: Block[];
  type: 'view' | 'edit';
  pageDate?: Date | null;
  now?: Date | null;
  className?: string;
}

export function Timeline({ blocks, type, pageDate, now, className }: TimelineProps) {
  switch (type) {
    case 'view':
      return <ViewTimeline blocks={blocks} pageDate={pageDate} now={now} className={className} />;
    default:
      return null;
  }
}
