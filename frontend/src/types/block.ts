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
  transportationType: TransportationType;
};

export type TransportationType = 'car' | 'bicycle' | 'walk' | 'ship' | 'train' | 'bus' | 'flight';
