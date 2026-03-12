import { AlertCircle } from 'lucide-react';
import type React from 'react';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';

type FetchErrorViewProps = React.ComponentProps<'div'> & {
  error: unknown;
  className?: string;
};

const FetchErrorView = ({ error, className, ...props }: FetchErrorViewProps) => {
  const message = getErrorMessage(error);

  return (
    <div className={cn('flex flex-col items-center gap-2 py-12 text-muted-foreground', className)} {...props}>
      <AlertCircle className='size-6' />
      <p className='text-sm'>エラーが発生しました</p>
      <p className='text-xs'>エラーメッセージ：{message}</p>
    </div>
  );
};

export { FetchErrorView };
