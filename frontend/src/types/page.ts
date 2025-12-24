import { z } from 'zod';

export const PageSchema = z.object({
  id: z.string(),
  title: z.string(),
  details: z.string().optional(),
});

export type Page = z.infer<typeof PageSchema>;
