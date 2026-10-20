import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type Phrase = { text: string; lang: string; caption?: string };

/** 旅のおともらしいひとこと */
const LINES: Phrase[] = [
  { text: '旅行コンサルタントです', lang: 'ja' },
  { text: 'おともしていいですか', lang: 'ja' },
  { text: 'どんな旅にしましょう', lang: 'ja' },
  { text: '寄り道、得意です', lang: 'ja' },
  { text: 'いい景色、探してきます', lang: 'ja' },
  { text: '地元の人みたいに回りましょう', lang: 'ja' },
];

/** 世界の観光地を、その土地の言葉で */
const PLACES: Phrase[] = [
  { text: 'Paris', lang: 'fr', caption: 'パリ' },
  { text: 'Roma', lang: 'it', caption: 'ローマ' },
  { text: 'Firenze', lang: 'it', caption: 'フィレンツェ' },
  { text: 'กรุงเทพฯ', lang: 'th', caption: 'バンコク' },
  { text: '서울', lang: 'ko', caption: 'ソウル' },
  { text: 'Αθήνα', lang: 'el', caption: 'アテネ' },
  { text: 'مراكش', lang: 'ar', caption: 'マラケシュ' },
  { text: 'القاهرة', lang: 'ar', caption: 'カイロ' },
  { text: 'काठमाडौं', lang: 'ne', caption: 'カトマンズ' },
  { text: 'Reykjavík', lang: 'is', caption: 'レイキャビク' },
  { text: 'Praha', lang: 'cs', caption: 'プラハ' },
  { text: 'Lisboa', lang: 'pt', caption: 'リスボン' },
  { text: 'İstanbul', lang: 'tr', caption: 'イスタンブール' },
  { text: 'Hà Nội', lang: 'vi', caption: 'ハノイ' },
  { text: '臺北', lang: 'zh-TW', caption: '台北' },
  { text: 'Москва', lang: 'ru', caption: 'モスクワ' },
  { text: 'Ciudad de México', lang: 'es', caption: 'メキシコシティ' },
  { text: 'Kraków', lang: 'pl', caption: 'クラクフ' },
];

const INTERVAL_MS = 2600;

const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/** ひとことと観光地を交互に、ランダムな順で入れ替えて出す */
const buildSequence = (): Phrase[] => {
  const lines = shuffle(LINES);
  const places = shuffle(PLACES);
  return places.flatMap((place, i) => (i % 2 === 0 && lines[i / 2] ? [lines[i / 2], place] : [place]));
};

/** 仮: AI の球の下に、旅のおともらしいひとことや世界の地名をランダムに流す */
export function RotatingPhrase({ className }: { className?: string }) {
  const [sequence] = useState(buildSequence);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => setIndex(i => (i + 1) % sequence.length), INTERVAL_MS);
    return () => clearInterval(timer);
  }, [sequence.length]);

  const phrase = sequence[index];

  return (
    <div className={cn('flex h-12 flex-col items-center justify-center text-center', className)} aria-hidden='true'>
      <span
        key={index}
        lang={phrase.lang}
        dir='auto'
        className='fade-in-0 slide-in-from-bottom-1 animate-in font-medium text-18px text-gray-700 tracking-wide duration-700'
      >
        {phrase.text}
      </span>
      {phrase.caption && (
        <span key={`${index}-caption`} className='fade-in-0 animate-in text-12px text-neutral-500 duration-1000'>
          {phrase.caption}
        </span>
      )}
    </div>
  );
}
