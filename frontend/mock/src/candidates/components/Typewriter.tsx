import { useEffect, useState } from 'react';

const CHAR_INTERVAL_MS = 22;

/** 文字を 1 つずつ出す。AI が文章を書いている感じを出すための演出 */
export function Typewriter({ text, className }: { text: string; className?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(text.length);
      return;
    }
    setCount(0);
    const timer = setInterval(() => {
      setCount(c => {
        if (c >= text.length) clearInterval(timer);
        return Math.min(c + 1, text.length);
      });
    }, CHAR_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [text]);

  return (
    <p className={className}>
      <span className='sr-only'>{text}</span>
      <span aria-hidden='true'>{text.slice(0, count)}</span>
      {count < text.length && (
        <span aria-hidden='true' className='ml-px inline-block h-3.5 w-0.5 animate-pulse bg-violet-500 align-middle' />
      )}
    </p>
  );
}
