import { z } from 'zod';

export const TransportationTypeEnum = z.enum(['car', 'bicycle', 'walk', 'ship', 'train', 'bus', 'flight']);

export const BaseBlockSchema = z.object({
  id: z.string(),
  type: z.enum(['schedule', 'transportation']),
  title: z.string(),
  startTime: z.date(),
  endTime: z.date(),
  details: z.string().optional(),
});

export const ScheduleBlockSchema = BaseBlockSchema.extend({
  type: z.literal('schedule'),
});

export const TransportationBlockSchema = BaseBlockSchema.extend({
  type: z.literal('transportation'),
  transportationType: TransportationTypeEnum,
});

export const BlockSchema = z.discriminatedUnion('type', [ScheduleBlockSchema, TransportationBlockSchema]);

export type BaseBlock = z.infer<typeof BaseBlockSchema>;
export type Block = z.infer<typeof BlockSchema>;
export type ScheduleBlock = z.infer<typeof ScheduleBlockSchema>;
export type TransportationBlock = z.infer<typeof TransportationBlockSchema>;
export type TransportationType = z.infer<typeof TransportationTypeEnum>;
