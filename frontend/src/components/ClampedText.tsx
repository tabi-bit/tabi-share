import type { ComponentPropsWithoutRef, CSSProperties } from 'react';
import { useLineClamp } from '@/hooks/useLineClamp';

interface ClampedTextProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  children: string;
}

/**
 * 利用可能な高さに収まる行数だけ折り返して表示し、あふれたら末尾に … で省略するテキスト。
 * 行数は useLineClamp が外側ラッパーの高さから算出するため、外側ラッパーは
 * className 等で利用可能高さいっぱいに伸ばすこと(self-stretch 等)。
 * className を含む div の属性はそのまま外側ラッパーに渡る。
 */
export function ClampedText({ children, ...divProps }: ClampedTextProps) {
  const { ref, lineClamp } = useLineClamp();
  const clampStyle: CSSProperties = {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: lineClamp,
  };

  return (
    <div ref={ref} {...divProps}>
      <div className='overflow-hidden' style={clampStyle}>
        {children}
      </div>
    </div>
  );
}
