import type { ScheduleBlock, TransportationBlock } from '@/types';

// 共通で必須のpropsがあればここに追加
export interface TransportationBlockComponentProps {
  block: TransportationBlock;
  className?: string;
}

export interface ScheduleBlockComponentProps {
  block: ScheduleBlock;
  className?: string;
}
