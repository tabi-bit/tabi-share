import { cn } from '@/lib/utils';

/**
 * 矢印形の「NOW」バッジ。ラインと組み合わせて使う `NowIndicator` からも、
 * ブロックコーナー用の `BlockNowBadge` からも共有される。
 */
export const NowBadge = ({ className }: { className?: string }) => (
  <div
    className={cn(
      'select-none rounded-l-sm bg-red-500 py-0.5 pr-2 pl-1.5 font-bold text-10px text-white [clip-path:polygon(0_0,calc(100%_-_6px)_0,100%_50%,calc(100%_-_6px)_100%,0_100%)]',
      className
    )}
  >
    NOW
  </div>
);

const clampRatio = (r: number): number => Math.min(1, Math.max(0, r));

interface NowIndicatorProps {
  /** 縦方向の位置比率 (0=上端 / 1=下端)。undefined なら中央固定。 */
  ratio?: number;
  /** ルートに追加するクラス。`col-span-2` (行モード) や `absolute inset-0` (オーバーレイモード) を指定する。 */
  className?: string;
}

/**
 * 現在時刻を示す赤いインジケータ。
 * 左端に矢印形の「NOW」バッジ、右側に赤ラインが伸びる。
 * `ratio` に応じて縦方向の高さ内で位置が変わる。
 */
export const NowIndicator = ({ ratio, className }: NowIndicatorProps) => {
  const clamped = clampRatio(ratio ?? 0.5);

  return (
    <div className={cn('flex h-8 flex-col', className)} data-testid='now-indicator'>
      <div style={{ flexGrow: clamped }} aria-hidden />
      <div className='flex items-center gap-1'>
        <NowBadge />
        <div className='h-0.5 flex-1 bg-red-500' />
      </div>
      <div style={{ flexGrow: 1 - clamped }} aria-hidden />
    </div>
  );
};

/** ブロックの左上角に貼り付けて「今このブロック中」を示す NOW バッジ。 */
export const BlockNowBadge = () => <NowBadge className='-top-2.5 -left-1 absolute z-10' />;
