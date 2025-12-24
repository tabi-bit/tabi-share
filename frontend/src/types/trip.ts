import { z } from 'zod';

export const TripSchema = z.object({
  id: z.string(),
  title: z.string(),
  peopleNum: z.number().optional(),
});

export type Trip = z.infer<typeof TripSchema>;
