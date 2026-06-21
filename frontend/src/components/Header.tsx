import { useAtom, useAtomValue } from 'jotai';
import { Pencil, Share2 } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import editScheduleIcon from '@/assets/icons/edit-schedule-white.svg';
import eyeSolidIcon from '@/assets/icons/eye-solid-white.svg';
import penToSquareSolidIcon from '@/assets/icons/pen-to-square-solid-white.svg';
import { isOfflineReadAtom } from '@/atoms/network';
import { selectedPageAtom, selectedPageIdAtom, tripAtom, tripModeAtom, tripPagesAtom } from '@/atoms/tripPage';
import { AddPageDialog } from '@/dialogs/AddPageDialog';
import { EditPageDialog } from '@/dialogs/EditPageDialog';
import { EditTripDialog } from '@/dialogs/EditTripDialog';
import { formatDateMDWithDow, formatTripRangeMD } from '@/lib/date';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import { NetworkStatusButton } from './NetworkStatusButton';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type HeaderBaseProps = React.ComponentProps<'div'>;

type HeaderLogoOnlyProps = HeaderBaseProps & {
  variant: 'logoOnly';
};

type HeaderFullProps = HeaderBaseProps & {
  variant: 'full';
  /** スクロール監視対象。state で渡すことで、要素が差し替わったときに listener を再 attach する */
  scrollContainer: HTMLDivElement | null;
  isDraggingRef: React.RefObject<boolean>;
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
  const pages = useAtomValue(tripPagesAtom);
  const [selectedPageId, setSelectedPageId] = useAtom(selectedPageIdAtom);
  const mode = useAtomValue(tripModeAtom);
  const selectedPage = useAtomValue(selectedPageAtom);
  const tripRangeText = formatTripRangeMD(trip?.startDate, trip?.endDate);

  const [isScrolled, setIsScrolled] = useState(false);
  const [editPageDialogOpen, setEditPageDialogOpen] = useState(false);
  const [editTripDialogOpen, setEditTripDialogOpen] = useState(false);
  const [addPageDialogOpen, setAddPageDialogOpen] = useState(false);
  const navigate = useNavigate();
  const scrollY = useRef(0);

  const handleHeaderClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, select, [role="combobox"], [role="option"], [role="listbox"]')) return;
    setIsScrolled(false);
  }, []);

  const handleScroll = useCallback(() => {
    const container = scrollContainer;
    if (!container) return;

    const scrollTop = container.scrollTop;

    // ドラッグ中は自動スクロールを誤検知しないよう、基準だけ更新して判定はスキップ
    if (isDraggingRef.current) {
      scrollY.current = scrollTop;
      return;
    }

    const deltaY = scrollTop - scrollY.current;
    let nextIsScrolled = isScrolled;

    const TOP_JITTER_PX = 30;
    const BOTTOM_BOUNCE_PX = 40; // iOS ラバーバンドでの誤展開を防ぐ末端マージン

    // deltaY <= 0 条件: compact のままコンテナ切替(scrollTop=0始まり)→下スクロール開始時に
    // 一瞬 expanded へ戻るちらつきを防ぐ（下スクロール中は最上部判定を効かせない）
    if (scrollTop < TOP_JITTER_PX && deltaY <= 0) {
      nextIsScrolled = false;
    }

    const maxScroll = container.scrollHeight - container.clientHeight;
    const isNearBottom = maxScroll - scrollTop < BOTTOM_BOUNCE_PX;

    if (isNearBottom && isScrolled && deltaY < 0) {
      // 最下部バウンスでの誤展開を無視（基準も更新しない）
      return;
    }

    if (scrollTop >= TOP_JITTER_PX && Math.abs(deltaY) > 10) {
      if (deltaY < 0 && isScrolled) {
        nextIsScrolled = false;
      } else if (deltaY > 0 && !isScrolled) {
        nextIsScrolled = true;
      }
    }

    if (nextIsScrolled !== isScrolled) {
      setIsScrolled(nextIsScrolled);
    } else {
      // 状態が変わらない時だけ基準更新（レイアウトシフトでの誤作動防止）
      scrollY.current = scrollTop;
    }
  }, [isScrolled, scrollContainer, isDraggingRef]);

  // コンテナ切替時に基準を同期しないと、初回 deltaY が前コンテナとの差分になり誤判定する
  useEffect(() => {
    scrollY.current = scrollContainer?.scrollTop ?? 0;
  }, [scrollContainer]);

  useEffect(() => {
    if (!scrollContainer) return;

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [handleScroll, scrollContainer]);

  if (!trip) return null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: ヘッダー領域クリックでスクロール縮小状態を解除するためのイベント委譲
    <header
      data-component='header'
      className={cn(
        'z-10 flex w-full flex-col justify-center gap-1 bg-teal-50/80 px-2 py-2 backdrop-blur-sm',
        className
      )}
      onClick={handleHeaderClick}
      {...props}
    >
      <div className='relative flex w-full flex-row justify-center'>
        <Logo size={isScrolled ? 'small' : 'medium'} />
        <NetworkStatusButton className='-translate-y-1/2 absolute top-1/2 right-2' />
      </div>
      <div className='grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center'>
        {/* 左カラム */}
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

        {/* 中央カラム */}
        {isScrolled ? (
          selectedPage && (
            <Badge variant='outline' className='max-w-[90vw] justify-start bg-white sm:max-w-[30vw]'>
              {selectedPage.title}
            </Badge>
          )
        ) : (
          <Select
            value={selectedPageId != null ? String(selectedPageId) : undefined}
            onValueChange={v => {
              if (v === 'add-new') {
                setAddPageDialogOpen(true);
              } else {
                setSelectedPageId(Number(v));
              }
            }}
          >
            <SelectTrigger className='min-h-9 max-w-[90vw] bg-white data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:flex-wrap *:data-[slot=select-value]:gap-x-2 sm:max-w-[30vw]'>
              <SelectValue placeholder='ページ選択' />
            </SelectTrigger>
            <SelectContent className='max-w-[90vw]'>
              {pages.map(page => (
                <SelectItem
                  key={page.id}
                  value={String(page.id)}
                  // ItemText span (shadcn の `*:[span]:last:*` で flex化される) に flex-1 + min-w-0 を当てて PageLabel 側の truncate を有効化
                  className='*:[span]:last:min-w-0 *:[span]:last:flex-1'
                >
                  <PageLabel page={page} />
                </SelectItem>
              ))}
              {mode === 'edit' && (
                <SelectItem value='add-new' className='text-nowrap text-primary'>
                  + ページを追加
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        )}
        {/* 右カラム */}
        <div className={cn('flex flex-row justify-start', isScrolled ? 'gap-x-2' : 'gap-x-2 sm:gap-x-4')}>
          {mode === 'edit' ? (
            <>
              <ViewModeButton isScrolled={isScrolled} />
              <PageInfoEditButton isScrolled={isScrolled} onClick={() => setEditPageDialogOpen(true)} />
            </>
          ) : (
            <EditModeButton isScrolled={isScrolled} disabled={isOffline} />
          )}
          <ShareButton />
        </div>
      </div>

      {/* ページ追加ダイアログ */}
      <AddPageDialog
        open={addPageDialogOpen}
        onOpenChange={setAddPageDialogOpen}
        trip={trip}
        onCreated={page => {
          setSelectedPageId(page.id);
        }}
      />

      {/* ページ編集ダイアログ */}
      {selectedPage && (
        <EditPageDialog
          open={editPageDialogOpen}
          onOpenChange={setEditPageDialogOpen}
          page={selectedPage}
          trip={trip}
          onDeleted={pageId => {
            const remainingPages = pages.filter(p => p.id !== pageId);
            if (remainingPages.length > 0) {
              setSelectedPageId(remainingPages[0].id);
            }
          }}
        />
      )}

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
  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.canShare?.({ url })) {
      await navigator.share({ url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('URLをコピーしました');
    }
  }, []);

  return (
    <Button variant='default' size='icon' className='size-7 sm:size-9' onClick={handleShare}>
      <Share2 className='size-4 sm:size-5' />
    </Button>
  );
};

const PageLabel = ({ page }: { page: { title: string; date?: Date | null } }) => (
  // flex-wrap で長すぎたら 2 行折り返し、items-center で日付（小フォント）と title の縦位置を揃える
  <span className='flex min-w-0 flex-1 flex-wrap items-center gap-x-2'>
    {page.date && (
      <span className='shrink-0 whitespace-nowrap font-mono text-12px text-slate-500'>
        {formatDateMDWithDow(page.date)}
      </span>
    )}
    <span className='min-w-0 truncate'>{page.title}</span>
  </span>
);

const PageInfoEditButton = ({ isScrolled, onClick }: { isScrolled: boolean; onClick?: () => void }) => (
  <HeaderButtonBase
    variant='secondary'
    isScrolled={isScrolled}
    iconSrc={penToSquareSolidIcon}
    iconAlt='ページ編集'
    onClick={onClick}
  >
    ページ編集
  </HeaderButtonBase>
);
