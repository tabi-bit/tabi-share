import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SummaryRowProps {
  label: string;
  value: ReactNode;
  empty: boolean;
  invalid?: boolean;
  /** 値の右に添える印 (AI が入れた値など) */
  mark?: ReactNode;
}

/** 「これでいい？」の Accordion の行。左に項目名、右に今の値 */
export function SummaryRow({ label, value, empty, invalid, mark }: SummaryRowProps) {
  return (
    <span className='flex min-w-0 flex-1 items-baseline gap-3'>
      <span className='w-16 shrink-0 font-normal text-12px text-neutral-500'>{label}</span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-14px',
          invalid ? 'text-destructive' : empty ? 'font-normal text-neutral-400' : 'font-medium text-gray-900'
        )}
      >
        {value}
      </span>
      {mark}
    </span>
  );
}
