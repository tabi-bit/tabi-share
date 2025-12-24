import { z } from 'zod';

export const TripSchema = z.object({
  id: z.number(),
  title: z.string(),
  detail: z.string().nullish(),
  peopleNum: z.number().nullish(),
  urlId: z.string(),
});

export type Trip = z.infer<typeof TripSchema>;
