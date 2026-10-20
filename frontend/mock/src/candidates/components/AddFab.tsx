import { Plus } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type AddChoice = {
  key: string;
  icon: ReactNode;
  label: string;
  description: string;
  to: string;
};

interface AddFabProps {
  label: string;
  choices: AddChoice[];
}

/**
 * 仮: 一覧の右下に固定する追加ボタン。押すとボタンの真上に選択肢が広がる (指をほとんど動かさずに選べる)。
 * 親要素に relative を付けて置く
 */
export function AddFab({ label, choices }: AddFabProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {open && (
        <Button
          variant='ghost'
          aria-label='閉じる'
          onClick={() => setOpen(false)}
          className='fade-in-0 absolute inset-0 z-20 h-auto animate-in rounded-none bg-white/70 backdrop-blur-[1px] hover:bg-white/70 sm:h-auto'
        />
      )}
      <div className='absolute right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 flex flex-col items-end gap-2.5'>
        {open &&
          choices.map((c, i) => (
            <Button
              key={c.key}
              asChild
              variant='outline'
              className='fade-in-0 slide-in-from-bottom-2 h-auto animate-in gap-3 rounded-full py-2 pr-2 pl-4 font-normal shadow-md sm:h-auto'
              style={{ animationDelay: `${(choices.length - 1 - i) * 40}ms` }}
            >
              <Link to={c.to}>
                <span className='flex flex-col items-end'>
                  <span className='font-medium text-14px'>{c.label}</span>
                  <span className='text-10px text-neutral-500'>{c.description}</span>
                </span>
                <span className='flex size-9 items-center justify-center rounded-full bg-teal-50 [&_svg]:size-4.5'>
                  {c.icon}
                </span>
              </Link>
            </Button>
          ))}
        <Button
          size='icon'
          aria-label={open ? '閉じる' : label}
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
          className='size-14 rounded-full shadow-lg sm:size-14'
        >
          <Plus className={cn('size-6 transition-transform', open && 'rotate-45')} />
        </Button>
      </div>
    </>
  );
}
