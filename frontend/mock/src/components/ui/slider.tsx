import { Slider as SliderPrimitive } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * [mock] shadcn/ui の Slider。本体の components/ui に無いため仮に置く。
 * 採用するなら `create-shadcn-component` で src/components/ui に追加し、ここは削除する。
 */
function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const values = props.value ?? props.defaultValue ?? [props.min ?? 0];
  return (
    <SliderPrimitive.Root
      data-slot='slider'
      className={cn('relative flex w-full touch-none select-none items-center data-[disabled]:opacity-50', className)}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot='slider-track'
        className='relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted'
      >
        <SliderPrimitive.Range data-slot='slider-range' className='absolute h-full bg-primary' />
      </SliderPrimitive.Track>
      {values.map((_, i) => (
        <SliderPrimitive.Thumb
          // biome-ignore lint/suspicious/noArrayIndexKey: つまみは値の並び順でしか区別できない
          key={i}
          data-slot='slider-thumb'
          className='block size-5 shrink-0 rounded-full border-2 border-primary bg-white shadow-sm transition-[color,box-shadow] hover:ring-4 hover:ring-ring/50 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-ring/50'
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
