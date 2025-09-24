import type { Block } from '@/types/block';
import { ViewTimeline } from './ViewTimeline';

interface TimelineProps {
  blocks: Block[];
  type: 'view' | 'edit';
}

export function Timeline({ blocks, type }: TimelineProps) {
  switch (type) {
    case 'view':
      return <ViewTimeline blocks={blocks} />;
    case 'edit':
      // 将来の編集モード実装のためのプレースホルダー
      // 現在は ViewTimeline を表示
      return <ViewTimeline blocks={blocks} />;
    default:
      return null;
  }
}
