import { useAtom, useAtomValue } from 'jotai';
import { Pencil, Share2 } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import editScheduleIcon from '@/assets/icons/edit-schedule-white.svg';
import eyeSolidIcon from '@/assets/icons/eye-solid-white.svg';
import { isOfflineReadAtom } from '@/atoms/network';
import { tripAtom, tripModeAtom } from '@/atoms/tripPage';
import { EditTripDialog } from '@/dialogs/EditTripDialog';
import { formatTripRangeMD } from '@/lib/date';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import { NetworkStatusButton } from './NetworkStatusButton';
import { PageSelector } from './pageSelector';
import { Button } from './ui/button';

type HeaderBaseProps = React.ComponentProps<'div'>;

type HeaderLogoOnlyProps = HeaderBaseProps & {
  variant: 'logoOnly';
};

type HeaderFullProps = HeaderBaseProps & {
  variant: 'full';
  /** スクロール監視対象。state で渡すことで、要素が差し替わったときに listener を再 attach する */
  scrollContainer?: HTMLDivElement | null;
  isDraggingRef?: React.RefObject<boolean>;
};

type HeaderProps = HeaderLogoOnlyProps | HeaderFullProps;

const transitionClassNames = 'duration-300 ease-in-out';

function HeaderLogoOnly({ className, ...props }: HeaderLogoOnlyProps) {
  return (
    <div
      data-component='header'
      className={cn(
        'relative z-10 flex w-full items-center justify-center bg-teal-50/80 px-6 py-3 backdrop-blur-sm',
        className
      )}
      {...props}
    >
      <Logo size='medium' className='mx-auto' />
      <NetworkStatusButton className='absolute right-4' />
    </div>
  );
}

function HeaderFull({ className, scrollContainer, isDraggingRef, ...props }: Omit<HeaderFullProps, 'variant'>) {
  const isOffline = useAtomValue(isOfflineReadAtom);
  const trip = useAtomValue(tripAtom);
  const mode = useAtomValue(tripModeAtom);
  const tripRangeText = formatTripRangeMD(trip?.startDate, trip?.endDate);

  const [editTripDialogOpen, setEditTripDialogOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollY = useRef(0);
  const navigate = useNavigate();

  const handleHeaderClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a')) return;
    setIsScrolled(false);
  };

  // 最新の isScrolled / isDraggingRef を ref 越しに参照し、listener の再 attach を避ける
  const isScrolledRef = useRef(false);
  isScrolledRef.current = isScrolled;
  const draggingRefRef = useRef(isDraggingRef);
  draggingRefRef.current = isDraggingRef;

  // コンテナ切替時に基準を同期しないと、初回 deltaY が前コンテナとの差分になり誤判定する
  useEffect(() => {
    scrollY.current = scrollContainer?.scrollTop ?? 0;
  }, [scrollContainer]);

  useEffect(() => {
    if (!scrollContainer) return;

    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const scrollTop = scrollContainer.scrollTop;

        // ドラッグ中は自動スクロールを誤検知しないよう、基準だけ更新して判定はスキップ
        if (draggingRefRef.current?.current) {
          scrollY.current = scrollTop;
          return;
        }

        const deltaY = scrollTop - scrollY.current;
        const current = isScrolledRef.current;
        let next = current;

        const TOP_JITTER_PX = 30;
        const BOTTOM_BOUNCE_PX = 40; // iOS ラバーバンドでの誤展開を防ぐ末端マージン

        // deltaY <= 0 条件: compact のままコンテナ切替(scrollTop=0始まり)→下スクロール開始時に
        // 一瞬 expanded へ戻るちらつきを防ぐ（下スクロール中は最上部判定を効かせない）
        if (scrollTop < TOP_JITTER_PX && deltaY <= 0) {
          next = false;
        }

        const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        const isNearBottom = maxScroll - scrollTop < BOTTOM_BOUNCE_PX;

        if (isNearBottom && current && deltaY < 0) {
          // 最下部バウンスでの誤展開を無視（基準も更新しない）
          return;
        }

        if (scrollTop >= TOP_JITTER_PX && Math.abs(deltaY) > 10) {
          if (deltaY < 0 && current) {
            next = false;
          } else if (deltaY > 0 && !current) {
            next = true;
          }
        }

        if (next !== current) {
          setIsScrolled(next);
        } else {
          // 状態が変わらない時だけ基準更新（レイアウトシフトでの誤作動防止）
          scrollY.current = scrollTop;
        }
      });
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [scrollContainer]);

  if (!trip) return null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: ヘッダー領域クリックでスクロール縮小状態を解除するためのイベント委譲
    <header
      data-component='header'
      className={cn(
        'relative z-10 flex w-full flex-col justify-center gap-1 bg-teal-50/80 px-2 py-2 backdrop-blur-sm',
        className
      )}
      onClick={handleHeaderClick}
      {...props}
    >
      <div className='relative flex w-full flex-row justify-center'>
        <Logo size={isScrolled ? 'small' : 'medium'} />
        <NetworkStatusButton className='-translate-y-1/2 absolute top-1/2 right-2' />
      </div>
      <div className='grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 sm:items-center'>
        {/* 左カラム: Trip タイトル + 期間 */}
        <div
          className={cn(
            'flex flex-col items-start transition-[font-size] sm:items-end',
            transitionClassNames,
            isScrolled ? 'text-14px sm:text-16px' : 'text-16px sm:text-20px'
          )}
        >
          {mode === 'edit' ? (
            <button
              type='button'
              className='inline-flex cursor-pointer items-center gap-1 underline decoration-dotted underline-offset-4 hover:decoration-solid'
              onClick={() => setEditTripDialogOpen(true)}
            >
              <div className='text-left'>{trip.title}</div>
              <Pencil className='size-3 shrink-0 opacity-60' />
            </button>
          ) : (
            <span>{trip.title}</span>
          )}
          {!isScrolled && tripRangeText && (
            <span className='text-12px text-slate-500 sm:text-14px'>{tripRangeText}</span>
          )}
        </div>

        {/* 右カラム: モード切替 + 共有 */}
        <div className={cn('flex flex-row justify-start', isScrolled ? 'gap-x-2' : 'gap-x-2 sm:gap-x-4')}>
          {mode === 'edit' ? (
            <ViewModeButton isScrolled={isScrolled} />
          ) : (
            <EditModeButton isScrolled={isScrolled} disabled={isOffline} />
          )}
          <ShareButton />
        </div>
      </div>

      {/* ページ選択 pill + 関連ダイアログ一式 */}
      <PageSelector />

      {/* 旅程情報編集ダイアログ */}
      <EditTripDialog
        open={editTripDialogOpen}
        onOpenChange={setEditTripDialogOpen}
        trip={trip}
        onDeleted={() => navigate('/')}
      />
    </header>
  );
}

export function Header(props: HeaderProps) {
  if (props.variant === 'logoOnly') {
    return <HeaderLogoOnly {...props} />;
  }
  return <HeaderFull {...props} />;
}

type HeaderButtonBaseProps = React.ComponentProps<typeof Button> & {
  isScrolled: boolean;
  iconSrc: string;
  iconAlt?: string;
};

const HeaderButtonBase = ({
  isScrolled,
  iconSrc,
  iconAlt,
  className,
  children,
  ...buttonProps
}: HeaderButtonBaseProps) => {
  return (
    <Button
      className={cn('gap-0 transition-[padding]', transitionClassNames, isScrolled ? 'sm:px-2' : 'px-3', className)}
      {...buttonProps}
    >
      <img src={iconSrc} alt={iconAlt ?? ''} className='size-4 sm:size-5' />
      <span
        className={cn(
          'overflow-hidden transition-[width,opacity]',
          transitionClassNames,
          isScrolled ? 'w-0 opacity-0' : 'ml-2 w-auto opacity-100'
        )}
      >
        {children}
      </span>
    </Button>
  );
};

const EditModeButton = ({ isScrolled, disabled }: { isScrolled: boolean; disabled?: boolean }) => {
  const [, setMode] = useAtom(tripModeAtom);
  return (
    <HeaderButtonBase
      variant='default'
      isScrolled={isScrolled}
      iconSrc={editScheduleIcon}
      iconAlt='編集モード'
      onClick={() => setMode('edit')}
      disabled={disabled}
    >
      編集モード
    </HeaderButtonBase>
  );
};

const ViewModeButton = ({ isScrolled }: { isScrolled: boolean }) => {
  const [, setMode] = useAtom(tripModeAtom);
  return (
    <HeaderButtonBase
      variant='default'
      isScrolled={isScrolled}
      iconSrc={eyeSolidIcon}
      iconAlt='閲覧モード'
      onClick={() => setMode('view')}
    >
      閲覧モード
    </HeaderButtonBase>
  );
};

const ShareButton = () => {
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.canShare?.({ url })) {
      await navigator.share({ url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('URLをコピーしました');
    }
  };

  return (
    <Button variant='default' size='icon' className='size-7 sm:size-9' onClick={handleShare}>
      <Share2 className='size-4 sm:size-5' />
    </Button>
  );
};
