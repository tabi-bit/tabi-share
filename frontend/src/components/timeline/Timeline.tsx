import type { Block } from '@/types/block';
import { ViewTimeline } from './ViewTimeline';

interface TimelineProps {
  blocks: Block[];
  type: 'view' | 'edit';
  className?: string;
}

export function Timeline({ blocks, type, className }: TimelineProps) {
  switch (type) {
    case 'view':
      return <ViewTimeline blocks={blocks} className={className} />;
    default:
      return null;
  }
}
