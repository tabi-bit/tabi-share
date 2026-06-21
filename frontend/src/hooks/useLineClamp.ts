import { useCallback, useState } from 'react';
import { useResizeObserver } from './useResizeObserver';

/**
 * 要素の利用可能な高さから表示可能な行数を算出し、-webkit-line-clamp 用の行数を返すフック。
 *
 * タイトルなどを「高さに収まる分だけ折り返して複数行表示し、あふれたら末尾に … 」で
 * 省略させたいが、-webkit-line-clamp は固定の行数を要求するため、
 * 利用可能高さ ÷ 行の高さ から行数を計算する。
 * ブロックのドラッグ/リサイズや画面回転で高さが変わるため ResizeObserver で再計算する
 * （監視・クリーンアップは共通の useResizeObserver に委譲）。
 *
 * 対象要素は align-self: stretch 等で利用可能領域いっぱいに伸ばしておくこと
 * （contentRect.height = 利用可能高さ となるようにするため）。
 */
export function useLineClamp() {
  const [lineClamp, setLineClamp] = useState(1);

  const handleResize = useCallback((entry: ResizeObserverEntry) => {
    const style = getComputedStyle(entry.target);
    const fontSize = Number.parseFloat(style.fontSize);
    let lineHeight = Number.parseFloat(style.lineHeight);
    // line-height が "normal" など px で取れない場合のフォールバック
    if (Number.isNaN(lineHeight) || lineHeight <= 0) {
      lineHeight = fontSize * 1.4;
    }
    const lines = Math.max(1, Math.floor(entry.contentRect.height / lineHeight));
    setLineClamp(lines);
  }, []);

  const ref = useResizeObserver(handleResize);

  return { ref, lineClamp };
}
