import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface SubPageHeaderProps {
  title: ReactNode;
  backTo: string;
  backLabel: string;
  right?: ReactNode;
}

/** 仮: 投票・AI 提案など、旅程から 1 段降りた画面のヘッダー。実 Header と同じ teal-50 の帯に揃える */
export function SubPageHeader({ title, backTo, backLabel, right }: SubPageHeaderProps) {
  return (
    <header className='relative z-10 flex items-center gap-2 bg-teal-50/80 px-3 py-2.5 backdrop-blur-sm'>
      <Link
        to={backTo}
        aria-label={backLabel}
        className='inline-flex size-9 items-center justify-center rounded-md text-teal-700 hover:bg-teal-100'
      >
        <ChevronLeft className='size-5' />
      </Link>
      <div className='min-w-0 flex-1 font-bold text-14px'>{title}</div>
      {right}
    </header>
  );
}
