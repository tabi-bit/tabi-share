import { z } from 'zod';

export const PageSchema = z.object({
  id: z.number(),
  title: z.string(),
  details: z.string().nullish(),
  tripId: z.number(),
});

export type Page = z.infer<typeof PageSchema>;
