import { Link } from 'react-router-dom';
import paperPlaneIcon from '@/assets/icons/paper-plane.svg';
import { getEnvLabel } from '@/lib/envBranding';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'medium' | 'small';
  className?: string;
}

const envLabel = getEnvLabel();
const logoIcon = envLabel ? `/favicon-${envLabel.env === 'staging' ? 'stg' : envLabel.env}.svg` : paperPlaneIcon;

export function Logo({ size = 'medium', className }: LogoProps) {
  return (
    <Link
      to='/'
      data-component='Logo'
      className={cn('flex w-fit flex-row items-center justify-center gap-1', className)}
    >
      <img
        src={logoIcon}
        alt=''
        className={cn(size === 'medium' ? 'h-8 w-8' : 'h-5 w-5', 'transition-all duration-300 ease-in-out')}
      />
      <div className={cn(size === 'medium' ? 'text-24px' : 'text-16px', 'transition-all duration-300 ease-in-out')}>
        たびしぇあ
      </div>
    </Link>
  );
}
