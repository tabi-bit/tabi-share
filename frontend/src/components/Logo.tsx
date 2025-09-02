import paperPlaneIcon from '@/assets/icons/paper-plane.svg';
import { cn } from '@/lib/utils';

export function Logo(props: { size?: 'medium' | 'small' }) {
  const { size = 'medium' } = props;

  return (
    <div data-component='Logo' className='flex flex-row items-center justify-center gap-1'>
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
