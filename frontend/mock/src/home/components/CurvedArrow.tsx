import type React from 'react';
import { useId } from 'react';
import { cn } from '@/lib/utils';

/** 既存 HomePage の空状態で使っている点線カーブ矢印 (HomePage 内で非公開のため複製) */
export const CurvedArrow = ({ className, ...props }: React.ComponentProps<'svg'>) => {
  const markerId = useId();
  const ARROW_HEAD_SIZE = 30;
  const ARROW_LINE_SIZE = 150;
  const ARROW_CP = Math.round((ARROW_LINE_SIZE * 4) / 7);

  return (
    <svg
      className={cn('pointer-events-none text-gray-400', className)}
      viewBox={`${-ARROW_HEAD_SIZE} ${-ARROW_HEAD_SIZE} ${ARROW_LINE_SIZE + ARROW_HEAD_SIZE * 2} ${ARROW_LINE_SIZE + ARROW_HEAD_SIZE * 2}`}
      role='img'
      aria-label='ボタンへの誘導矢印'
      {...props}
    >
      <defs>
        <marker
          id={markerId}
          markerUnits='userSpaceOnUse'
          markerWidth={ARROW_HEAD_SIZE}
          markerHeight={ARROW_HEAD_SIZE}
          refX={ARROW_HEAD_SIZE}
          refY={ARROW_HEAD_SIZE / 2}
          orient='auto'
        >
          <polygon
            points={`0 0, ${ARROW_HEAD_SIZE} ${ARROW_HEAD_SIZE / 2}, 0 ${ARROW_HEAD_SIZE}`}
            fill='currentColor'
          />
        </marker>
      </defs>
      <path
        d={`M0,${ARROW_LINE_SIZE} C${ARROW_CP},${ARROW_LINE_SIZE} ${ARROW_LINE_SIZE},${ARROW_CP} ${ARROW_LINE_SIZE},0`}
        fill='none'
        stroke='currentColor'
        strokeWidth='3'
        strokeDasharray='20 10'
        strokeLinecap='round'
        markerEnd={`url(#${markerId})`}
      />
    </svg>
  );
};
