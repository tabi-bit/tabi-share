import paperPlaneIcon from '@/assets/icons/paper-plane.svg';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'medium' | 'small';
  className?: string;
}

export function Logo({ size = 'medium', className }: LogoProps) {
  return (
    <div data-component='Logo' className={cn('flex flex-row items-center justify-center gap-1', className)}>
      <img
        src={paperPlaneIcon}
        alt=''
        className={cn(size === 'medium' ? 'h-8 w-8' : 'h-5 w-5', 'transition-all duration-300 ease-in-out')}
      />
      <div className={cn(size === 'medium' ? 'text-24px' : 'text-16px', 'transition-all duration-300 ease-in-out')}>
        たびしぇあ
      </div>
    </div>
  );
}
