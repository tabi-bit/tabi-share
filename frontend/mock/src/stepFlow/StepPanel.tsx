import { ChevronLeft } from 'lucide-react';
import { type ComponentType, type FormEvent, type PointerEvent, type ReactNode, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StepDirection } from './useStepNavigation';

const SWIPE_MIN_PX = 60;

type TextComponent = ComponentType<{ className?: string; children: ReactNode }>;

interface StepPanelProps {
  stepCount: number;
  index: number;
  direction: StepDirection;
  /** 「1 / 3」などタイトル上の小さな文字 */
  eyebrow: ReactNode;
  title: ReactNode;
  hint: ReactNode;
  /** Dialog 内では DialogTitle / DialogDescription を渡して読み上げと紐付ける */
  TitleComponent?: TextComponent;
  DescriptionComponent?: TextComponent;
  /** 前のステップへ。undefined なら戻るボタンを出さない */
  onBack?: () => void;
  /** 左スワイプで進める先。undefined ならスワイプでは進まない */
  onSwipeNext?: () => void;
  /** 右上に置くボタン (閉じるなど) */
  trailing?: ReactNode;
  /** Enter での送信 */
  onSubmit?: () => void;
  footer: ReactNode;
  children: ReactNode;
  className?: string;
}

const DefaultTitle: TextComponent = ({ className, children }) => <h2 className={className}>{children}</h2>;
const DefaultDescription: TextComponent = ({ className, children }) => <p className={className}>{children}</p>;

/**
 * 1 問ずつ進むステップ式 UI の共通の枠。旅程の追加と AI 提案で使う。
 * - スマホは画面下に寄せた固定の高さ (620px)。全ステップで高さを揃え、主ボタンを常にいちばん下に置く
 * - 横スワイプで進む / 戻る。入力欄や横スクロール (data-no-swipe) の上で始めたスワイプは取り合うため無視する
 */
export function StepPanel({
  stepCount,
  index,
  direction,
  eyebrow,
  title,
  hint,
  TitleComponent = DefaultTitle,
  DescriptionComponent = DefaultDescription,
  onBack,
  onSwipeNext,
  trailing,
  onSubmit,
  footer,
  children,
  className,
}: StepPanelProps) {
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleSwipeStart = (e: PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    swipeStartRef.current = target.closest('input, textarea, [contenteditable=true], [data-no-swipe]')
      ? null
      : { x: e.clientX, y: e.clientY };
  };
  const handleSwipeEnd = (e: PointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) onSwipeNext?.();
    if (dx > 0) onBack?.();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit?.();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex min-h-0 flex-col bg-background max-sm:h-[min(620px,100dvh)] max-sm:shrink-0 max-sm:rounded-t-2xl max-sm:shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.2)]',
        className
      )}
    >
      <div className='flex items-center gap-2 px-2 pt-2 pb-1'>
        {onBack ? (
          <Button type='button' variant='ghost' size='icon' aria-label='前の質問へ' onClick={onBack}>
            <ChevronLeft className='size-5' />
          </Button>
        ) : (
          <span className='size-9' />
        )}
        <div className='flex flex-1 justify-center gap-1.5' aria-hidden='true'>
          {Array.from({ length: stepCount }, (_, i) => `step-${i}`).map((key, i) => (
            <span
              key={key}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === index ? 'w-6 bg-primary' : i < index ? 'w-1.5 bg-teal-300' : 'w-1.5 bg-neutral-300'
              )}
            />
          ))}
        </div>
        {trailing ?? <span className='size-9' />}
      </div>

      <div
        key={index}
        onPointerDown={handleSwipeStart}
        onPointerUp={handleSwipeEnd}
        onPointerCancel={() => {
          swipeStartRef.current = null;
        }}
        className={cn(
          'fade-in-0 flex min-h-0 flex-1 animate-in touch-pan-y flex-col gap-3 overflow-y-auto px-6 pt-2 pb-2 duration-200 motion-reduce:animate-none',
          direction === 'forward' ? 'slide-in-from-right-8' : 'slide-in-from-left-8'
        )}
      >
        <div className='flex flex-col gap-1'>
          <span className='text-12px text-neutral-500'>{eyebrow}</span>
          <TitleComponent className='font-bold text-24px'>{title}</TitleComponent>
          <DescriptionComponent className='text-14px text-muted-foreground'>{hint}</DescriptionComponent>
        </div>
        {children}
      </div>

      {/* ボタン 2 つ分の高さで固定し、主ボタンを常にいちばん下 (親指の位置) に置く */}
      <div className='flex min-h-[calc(8.25rem+env(safe-area-inset-bottom))] flex-col justify-end gap-2 border-t px-6 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:min-h-[8.25rem] sm:pb-4'>
        {footer}
      </div>
    </form>
  );
}
