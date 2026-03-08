import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            '10px',
            '11px',
            '12px',
            '13px',
            '14px',
            '15px',
            '16px',
            '18px',
            '20px',
            '24px',
            '28px',
            '32px',
            '40px',
            '48px',
            '56px',
            '64px',
            '128px',
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs));
}
