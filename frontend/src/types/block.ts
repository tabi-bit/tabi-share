export type Block = {
  id: string;
  type: 'schedule' | 'transportation';
  title: string;
  startTime: Date;
  endTime: Date;
  details?: string;
};

export type ScheduleBlock = Block & {
  type: 'schedule';
};

export type TransportationBlock = Block & {
  type: 'transportation';
  transportationType: 'car' | 'bus' | 'train' | 'flight';
};
