import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StepScreenProps {
  /** 操作パネルの上の空き。地図や AI の球など、そのフローの「今」を見せる */
  top?: ReactNode;
  topClassName?: string;
  /** StepPanel (className に STEP_PAGE_PANEL_CLASS を付ける) */
  children: ReactNode;
  className?: string;
}

/** ページとして出すステップ式画面の外枠。上は見せる場所、下に操作パネルを寄せる */
export function StepScreen({ top, topClassName, children, className }: StepScreenProps) {
  return (
    <div className={cn('flex h-dvh w-full flex-col bg-teal-50', className)}>
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 pt-[env(safe-area-inset-top)]',
          topClassName
        )}
      >
        {top}
      </div>
      {children}
    </div>
  );
}
