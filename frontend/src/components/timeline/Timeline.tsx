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
    case 'edit':
      // 将来の編集モード実装のためのプレースホルダー
      // 現在は ViewTimeline を表示
      return <ViewTimeline blocks={blocks} className={className} />;
    default:
      return null;
  }
}
