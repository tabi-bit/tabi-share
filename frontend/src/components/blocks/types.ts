import type { ScheduleBlock, TransportationBlock } from '@/types';

export interface TransportationBlockComponentProps {
  block: TransportationBlock;
  isNow?: boolean;
  className?: string;
}

export interface ScheduleBlockComponentProps {
  block: ScheduleBlock;
  isNow?: boolean;
  className?: string;
}
