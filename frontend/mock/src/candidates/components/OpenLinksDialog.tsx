import { BOTTOM_DIALOG_CLASS } from '@mock/stepFlow/stepDialog';
import { ExternalLink, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatPrice, MEAL_LABELS, priceUnitSuffix, SITE_LABELS } from '../format';
import type { StayCandidate } from '../types';

interface OpenLinksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  stays: StayCandidate[];
}

/**
 * 仮: 同じ泊の宿のページをまとめて開く。
 * ブラウザは 1 回のタップで複数のタブを開くのを止めることがあるため、全部開くボタンと 1 件ずつのリンクを両方置く
 */
const GUIDE_SEEN_KEY = 'mock-open-links-guide-seen';

const loadGuideSeen = () => {
  try {
    return localStorage.getItem(GUIDE_SEEN_KEY) === '1';
  } catch {
    return false;
  }
};

const saveGuideSeen = () => {
  try {
    localStorage.setItem(GUIDE_SEEN_KEY, '1');
  } catch {
    // 保存できなくても毎回案内が出るだけ
  }
};

/** 案内を出す理由。first は初回、blocked は実際に止められたあと */
type Guide = 'first' | 'blocked';

export function OpenLinksDialog({ open, onOpenChange, title, stays }: OpenLinksDialogProps) {
  const links = stays.flatMap(stay => stay.links.filter(l => l.url).map(link => ({ stay, link })));
  const [guide, setGuide] = useState<Guide | null>(null);
  const [blockedCount, setBlockedCount] = useState(0);

  useEffect(() => {
    if (open) setGuide(null);
  }, [open]);

  const openAll = () => {
    // noopener を付けると成功しても null が返り止められたか分からないため、開いた後に opener を切る
    const blocked = links.filter(({ link }) => {
      const tab = window.open(link.url, '_blank');
      if (tab) tab.opener = null;
      return tab == null;
    }).length;
    setBlockedCount(blocked);
    setGuide(blocked > 0 ? 'blocked' : null);
  };

  /** 初回はブラウザの許可の案内を先に見せる。案内の「開く」も同じタップの扱いになるので、そこから開ける */
  const handleOpenAll = () => {
    if (!loadGuideSeen()) {
      setGuide('first');
      return;
    }
    openAll();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={BOTTOM_DIALOG_CLASS}>
        <DialogHeader className='text-left'>
          <DialogTitle className='text-18px'>{title}</DialogTitle>
          <DialogDescription className='text-12px'>開いたページは、このアプリのタブとは別に開きます</DialogDescription>
        </DialogHeader>
        <ul className='flex flex-col'>
          {links.map(({ stay, link }) => (
            <li key={`${stay.id}-${link.site}`}>
              <Button
                asChild
                variant='ghost'
                className='h-auto w-full justify-between gap-3 rounded-lg px-2 py-2.5 font-normal sm:h-auto'
              >
                <a href={link.url} target='_blank' rel='noopener noreferrer'>
                  <span className='flex min-w-0 flex-col'>
                    <span className='truncate font-medium text-14px'>{stay.name}</span>
                    <span className='text-12px text-neutral-500'>
                      {SITE_LABELS[link.site]}
                      {link.price != null && ` ・ ${formatPrice(link.price)}${priceUnitSuffix(link.priceUnit)}`}
                      {link.meal && ` ・ ${MEAL_LABELS[link.meal]}`}
                    </span>
                  </span>
                  <ExternalLink className='text-neutral-400' />
                </a>
              </Button>
            </li>
          ))}
        </ul>
        {guide && (
          <div className='fade-in-0 flex animate-in gap-3 rounded-xl bg-amber-50 p-3.5 text-amber-950'>
            <ShieldAlert className='mt-0.5 size-5 shrink-0 text-amber-700' />
            <div className='flex flex-col gap-1 text-12px leading-relaxed'>
              <span className='font-bold text-14px'>
                {guide === 'first' ? 'ブラウザが止めることがあります' : `${blockedCount} 件がブラウザに止められました`}
              </span>
              {guide === 'first' ? (
                <span>
                  一度にいくつもページを開くと、ブラウザが「ポップアップをブロックしました」と表示することがあります。表示が出たら「許可」を選んでください。次からはまとめて開けます。
                </span>
              ) : (
                <span>
                  アドレスバーなどに出ているブロックの表示から「常に許可」を選んで、もう一度押してください。上のリストから
                  1 件ずつ開くこともできます。
                </span>
              )}
            </div>
          </div>
        )}
        <Button
          size='lg'
          className='h-12 sm:h-12'
          onClick={() => {
            if (guide === 'first') {
              saveGuideSeen();
              openAll();
              return;
            }
            handleOpenAll();
          }}
          disabled={links.length === 0}
        >
          <ExternalLink />
          {guide === 'first'
            ? 'わかった、開く'
            : guide === 'blocked'
              ? 'もう一度まとめて開く'
              : `${links.length} 件をまとめて開く`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
