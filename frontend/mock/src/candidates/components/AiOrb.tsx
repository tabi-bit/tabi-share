import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import '../ai.css';

/** まわりを回る光の粒。半径 (球の大きさに対する %)・周期・開始位置をずらして並べる */
const PARTICLES = [
  { r: 0.62, t: 4.5, delay: 0, size: 6 },
  { r: 0.72, t: 6.5, delay: -2.1, size: 4 },
  { r: 0.56, t: 3.6, delay: -1.2, size: 5 },
  { r: 0.8, t: 8, delay: -5, size: 3 },
];

/**
 * 仮: AI を表す球。色の塊が形を変えながら回り、光の粒がまわりを周回する。busy で全体が速くなる。
 * size は px。粒の軌道半径を計算するため数値で受け取る。
 */
export function AiOrb({ busy = false, size = 96, className }: { busy?: boolean; size?: number; className?: string }) {
  return (
    <div
      aria-hidden='true'
      data-busy={busy}
      className={cn('ai-orb-root relative shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <div className='ai-orb-glow absolute inset-[-20%]' />
      <div className='ai-orb-blob ai-orb-blob-1 absolute inset-0' />
      <div className='ai-orb-blob ai-orb-blob-2 absolute inset-[8%]' />
      <div className='ai-orb-blob ai-orb-blob-3 absolute inset-[4%]' />
      {PARTICLES.map(p => (
        <span
          key={`${p.r}-${p.t}`}
          className='ai-orb-particle absolute top-1/2 left-1/2 rounded-full bg-white shadow-[0_0_8px_2px_rgba(167,139,250,0.8)]'
          style={
            {
              width: p.size,
              height: p.size,
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
              '--orbit-r': `${size * p.r}px`,
              '--orbit-t': `${p.t}s`,
              animationDelay: `${p.delay}s, ${p.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
