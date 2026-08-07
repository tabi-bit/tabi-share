import { useAtomValue } from 'jotai';
import { Download, LogInIcon, MoreVerticalIcon, SendIcon, SmartphoneIcon } from 'lucide-react';
import { useState } from 'react';
import { authUserAtom } from '@/atoms/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PairReceiveDialog } from '@/dialogs/PairReceiveDialog';
import { PairTransferDialog } from '@/dialogs/PairTransferDialog';
import { signInWithGoogle } from '@/hooks/useAuth';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { cn } from '@/lib/utils';

/**
 * 旅程一覧ページのヘッダー右に置く「その他」メニュー。
 *
 * SyncSection / PwaInstallBanner を dismiss しても、ここから同じ動線を辿れるように
 * 隠し導線として集約する。認証状態に応じて項目を出し分ける。
 */
export const HomeMenu = ({ className }: { className?: string }) => {
  const authUser = useAtomValue(authUserAtom);
  const { isReady: pwaReady, installApp } = usePWAInstall();
  const [transferOpen, setTransferOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  // authUser が undefined (初期化前) の間はメニュー項目は仮描画 (Google 認証・受け取り経路として)
  const isAuthed = authUser != null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label='メニュー' className={cn('size-8', className)} size='icon' variant='ghost'>
            <MoreVerticalIcon className='size-5' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>同期</DropdownMenuLabel>
          {isAuthed ? (
            <DropdownMenuItem onSelect={() => setTransferOpen(true)}>
              <SendIcon className='size-4' />
              他のデバイスへ引き継ぐ
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => void signInWithGoogle()}>
                <LogInIcon className='size-4' />
                Google で同期する
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setReceiveOpen(true)}>
                <SmartphoneIcon className='size-4' />
                引き継ぎコードで受け取る
              </DropdownMenuItem>
            </>
          )}
          {pwaReady && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>アプリ</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => void installApp()}>
                <Download className='size-4' />
                アプリとしてインストール
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <PairTransferDialog onOpenChange={setTransferOpen} open={transferOpen} />
      <PairReceiveDialog onOpenChange={setReceiveOpen} open={receiveOpen} />
    </>
  );
};
