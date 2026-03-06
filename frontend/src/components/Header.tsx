import React, { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import editScheduleIcon from '@/assets/icons/edit-schedule-white.svg';
import eyeSolidIcon from '@/assets/icons/eye-solid-white.svg';
import penToSquareSolidIcon from '@/assets/icons/pen-to-square-solid-white.svg';
import { AddPageDialog } from '@/dialogs/AddPageDialog';
import { EditPageDialog } from '@/dialogs/EditPageDialog';
import { cn } from '@/lib/utils';
import type { Page } from '@/types';
import type { Trip } from '@/types/trip';
import { Logo } from './Logo';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type HeaderBaseProps = React.ComponentProps<'div'>;

type HeaderLogoOnlyProps = HeaderBaseProps & {
  variant: 'logoOnly';
};

type HeaderFullProps = HeaderBaseProps & {
  variant: 'full';
  trip: Trip;
  pages: Page[];
  mode?: 'view' | 'edit';
  selectedPageId?: Page['id'];
  onSelectPage: (pageId: Page['id']) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  setMode: Dispatch<SetStateAction<'view' | 'edit'>>;
  isDraggingRef: React.RefObject<boolean>;
};

type HeaderProps = HeaderLogoOnlyProps | HeaderFullProps;

const transitionClassNames = 'duration-300 ease-in-out';

function HeaderLogoOnly({ className, ...props }: HeaderLogoOnlyProps) {
  return (
    <div
      data-component='header'
      className={cn(
        'sticky top-0 right-0 left-0 z-10 flex w-full flex-col items-center justify-center bg-teal-50/80 px-6 py-3 backdrop-blur-sm',
        className
      )}
      {...props}
    >
      <Logo size='medium' className='mx-auto' />
    </div>
  );
}

function HeaderFull({
  pages,
  trip,
  mode = 'view',
  selectedPageId,
  onSelectPage,
  setMode,
  className,
  scrollContainerRef,
  isDraggingRef,
  ...props
}: Omit<HeaderFullProps, 'variant'>) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [editPageDialogOpen, setEditPageDialogOpen] = useState(false);
  const [addPageDialogOpen, setAddPageDialogOpen] = useState(false);
  const scrollY = useRef(0);

  const handleHeaderClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, select, [role="combobox"], [role="option"], [role="listbox"]')) return;
    setIsScrolled(false);
  }, []);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;

    const scrollTop = container.scrollTop;

    // ドラッグ中はisScrolledの更新をスキップし、スクロール位置の基準だけ更新する
    if (isDraggingRef.current) {
      scrollY.current = scrollTop;
      return;
    }

    const deltaY = scrollTop - scrollY.current;

    // isScrolledの次の状態を計算する
    let nextIsScrolled = isScrolled;

    if (scrollTop < 50) {
      // ページ最上部では常に表示
      nextIsScrolled = false;
    } else if (Math.abs(deltaY) > 10) {
      if (deltaY < 0 && isScrolled) {
        // 上スクロール and ヘッダーが非表示中 -> 表示させる
        nextIsScrolled = false;
      } else if (deltaY > 0 && !isScrolled) {
        // 下スクロール and ヘッダーが表示中 -> 非表示にさせる
        nextIsScrolled = true;
      }
    }

    if (nextIsScrolled !== isScrolled) {
      setIsScrolled(nextIsScrolled);
    } else {
      // 状態が変化しなかった場合のみ、スクロール位置の基準を更新
      // レイアウトシフトによる誤作動を防ぐ
      scrollY.current = scrollTop;
    }
  }, [isScrolled, scrollContainerRef, isDraggingRef]);

  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll, scrollContainerRef]);

  const selectedPage = selectedPageId ? pages.find(page => page.id === selectedPageId) : (pages[0] ?? null);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: ヘッダー領域クリックでスクロール縮小状態を解除するためのイベント委譲
    <header
      data-component='header'
      className={cn(
        'sticky top-0 right-0 left-0 z-10 flex w-full flex-col justify-center gap-1 bg-teal-50/80 px-2 py-2 backdrop-blur-sm',
        className
      )}
      onClick={handleHeaderClick}
      {...props}
    >
      <div className='flex w-full flex-row justify-center'>
        <Logo size={isScrolled ? 'small' : 'medium'} />
      </div>
      <div className='grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center'>
        {/* 左カラム */}
        <div
          className={cn(
            'flex justify-start transition-[font-size] sm:justify-end',
            transitionClassNames,
            isScrolled ? 'text-14px sm:text-16px' : 'text-16px sm:text-20px'
          )}
        >
          {trip.title}
        </div>

        <div className='flex flex-row items-center justify-start gap-x-2 sm:contents'>
          {/* 中央カラム */}
          {isScrolled ? (
            selectedPage && (
              <Badge variant='outline' className='bg-white'>
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
                  onSelectPage(Number(v));
                }
              }}
            >
              <SelectTrigger className='bg-white'>
                <SelectValue placeholder='ページ選択' />
              </SelectTrigger>
              <SelectContent>
                {pages.map(page => (
                  <SelectItem key={page.id} value={String(page.id)}>
                    {page.title}
                  </SelectItem>
                ))}
                {mode === 'edit' && (
                  <SelectItem value='add-new' className='text-primary'>
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
                <ViewModeButton isScrolled={isScrolled} setMode={setMode} />
                <PageInfoEditButton isScrolled={isScrolled} onClick={() => setEditPageDialogOpen(true)} />
              </>
            ) : (
              <EditModeButton isScrolled={isScrolled} setMode={setMode} />
            )}
          </div>
        </div>
      </div>

      {/* ページ追加ダイアログ */}
      {trip && (
        <AddPageDialog
          open={addPageDialogOpen}
          onOpenChange={setAddPageDialogOpen}
          tripId={trip.id}
          onCreated={page => {
            onSelectPage(page.id);
          }}
        />
      )}

      {/* ページ情報編集ダイアログ */}
      {trip && selectedPage && (
        <EditPageDialog
          open={editPageDialogOpen}
          onOpenChange={setEditPageDialogOpen}
          page={selectedPage}
          onDeleted={pageId => {
            const remainingPages = pages.filter(p => p.id !== pageId);
            if (remainingPages.length > 0) {
              onSelectPage(remainingPages[0].id);
            }
          }}
        />
      )}
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

const EditModeButton = ({
  isScrolled,
  setMode,
}: {
  isScrolled: boolean;
  setMode: Dispatch<SetStateAction<'view' | 'edit'>>;
}) => (
  <HeaderButtonBase
    variant='default'
    isScrolled={isScrolled}
    iconSrc={editScheduleIcon}
    iconAlt='編集モード'
    onClick={() => setMode('edit')}
  >
    編集モード
  </HeaderButtonBase>
);

const ViewModeButton = ({
  isScrolled,
  setMode,
}: {
  isScrolled: boolean;
  setMode: Dispatch<SetStateAction<'view' | 'edit'>>;
}) => (
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

const PageInfoEditButton = ({ isScrolled, onClick }: { isScrolled: boolean; onClick?: () => void }) => (
  <HeaderButtonBase
    variant='secondary'
    isScrolled={isScrolled}
    iconSrc={penToSquareSolidIcon}
    iconAlt='ページ情報編集'
    onClick={onClick}
  >
    ページ情報編集
  </HeaderButtonBase>
);
