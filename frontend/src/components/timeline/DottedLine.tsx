import { cn } from '@/lib/utils';

export const DottedLine = ({ className, ...rest }: React.ComponentProps<'div'>) => {
  return (
    <div className={cn('flex h-8 flex-row pe-2.5 sm:pe-3.5', className)} {...rest}>
      <div className='grow border-neutral-600 border-r-2 border-dashed' />
      <div className='border-neutral-600 border-l-2 border-dashed'></div>
    </div>
  );
};
