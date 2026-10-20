import { Check, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiOrb } from './AiOrb';

interface GeneratingViewProps {
  /** AI がやっていることを順に並べたもの */
  tasks: string[];
  /** 終わったタスクの数。次のタスクを実行中として表示する */
  doneCount: number;
  title?: string;
  subtitle?: string;
}

/** 仮: AI が考えている・読み取っている間の画面。やっていることを 1 行ずつ流して、待ち時間に意味を持たせる */
export function GeneratingView({
  tasks,
  doneCount,
  title = '候補を考えています',
  subtitle = '見つかった順に表示します',
}: GeneratingViewProps) {
  return (
    <div
      className='flex flex-1 flex-col items-center justify-center gap-8 px-8 pb-[env(safe-area-inset-bottom)]'
      aria-live='polite'
    >
      <AiOrb busy size={112} />
      <div className='flex flex-col items-center gap-1'>
        <span className='font-bold text-18px text-gray-800'>{title}</span>
        <span className='text-12px text-neutral-500'>{subtitle}</span>
      </div>
      <ol className='flex w-full max-w-sm flex-col gap-2.5'>
        {tasks.map((task, i) => {
          const state = i < doneCount ? 'done' : i === doneCount ? 'running' : 'pending';
          return (
            <li
              key={task}
              className={cn(
                'fade-in-0 slide-in-from-bottom-1 flex animate-in items-start gap-2.5 text-14px duration-300',
                state === 'pending' && 'invisible'
              )}
            >
              <span className='mt-0.5 inline-flex size-4.5 shrink-0 items-center justify-center'>
                {state === 'done' ? (
                  <Check className='size-4 text-teal-600' strokeWidth={3} />
                ) : (
                  <LoaderCircle className='size-4 animate-spin text-violet-600' />
                )}
              </span>
              <span className={state === 'done' ? 'text-neutral-500' : 'font-medium text-gray-900'}>{task}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
