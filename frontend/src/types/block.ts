type BaseBlock = {
  id: string;
  type: 'schedule' | 'transportation';
  title: string;
  startTime: Date;
  endTime: Date;
  details?: string;
};

export type Block = ScheduleBlock | TransportationBlock;

export type ScheduleBlock = BaseBlock & {
  type: 'schedule';
};

export type TransportationBlock = BaseBlock & {
  type: 'transportation';
  transportationType: TransportationType;
};

export type TransportationType = 'car' | 'bicycle' | 'walk' | 'ship' | 'train' | 'bus' | 'flight';
