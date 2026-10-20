import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NewTripButtonProps {
  onClick: () => void;
  disabled: boolean;
  variant: 'button' | 'card';
  className?: string;
}

/** 「新しい旅をつくる」。スマホは大きなボタン、PC はメイン領域の大きなカード */
export const NewTripButton = ({ onClick, disabled, variant, className }: NewTripButtonProps) => {
  if (variant === 'card') {
    return (
      <Button
        variant='outline'
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'group h-auto w-full justify-start gap-5 whitespace-normal rounded-2xl border-2 border-teal-300 border-dashed px-8 py-10 text-left hover:border-primary hover:bg-teal-50',
          className
        )}
      >
        <span className='inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-105'>
          <Plus className='size-8' />
        </span>
        <span className='flex flex-col gap-1'>
          <span className='font-bold text-24px text-gray-900'>新しい旅をつくる</span>
          <span className='font-normal text-14px text-gray-500'>
            行きたい所をみんなで持ち寄って、投票で決めて、旅程にします
          </span>
        </span>
      </Button>
    );
  }

  return (
    <Button
      size='lg'
      onClick={onClick}
      disabled={disabled}
      className={cn('h-14 w-full rounded-xl font-bold text-16px shadow-md sm:h-14', className)}
    >
      <Plus className='size-5' />
      新しい旅をつくる
    </Button>
  );
};
