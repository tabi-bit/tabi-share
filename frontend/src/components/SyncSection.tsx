import { useAtomValue } from 'jotai';
import { LogInIcon, SmartphoneIcon, X } from 'lucide-react';
import { useState } from 'react';
import { authUserAtom } from '@/atoms/auth';
import { Button } from '@/components/ui/button';
import { PairReceiveDialog } from '@/dialogs/PairReceiveDialog';
import { PairTransferDialog } from '@/dialogs/PairTransferDialog';
import { signInWithGoogle } from '@/hooks/useAuth';
import { useDismissible } from '@/hooks/useDismissible';

/**
 * 旅程一覧ページ (HomePage) 冒頭に配置される "同期" セクション。
 *
 * - 未認証時: Google 認証 (`signInWithGoogle`) と引き継ぎ受け取り (`PairReceiveDialog`) の 2 導線
 * - 認証済み時: 他デバイスへ引き継ぐ (`PairTransferDialog`) 導線
 * - 各状態ごとに閉じるボタンで dismiss (IndexedDB 永続化)。dismiss しても Header
 *   メニューから同じ動線にアクセス可能
 */
export const SyncSection = () => {
  const authUser = useAtomValue(authUserAtom);
  const [transferOpen, setTransferOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const signInDismiss = useDismissible('syncSection.signInDismissed');
  const transferDismiss = useDismissible('syncSection.transferDismissed');

  // 初期化前 (onAuthStateChanged 未発火) は表示しない
  if (authUser === undefined) return null;

  if (authUser !== null) {
    if (!transferDismiss.isLoaded || transferDismiss.dismissed) return null;
    return (
      <>
        <section className='mb-4 rounded-lg border border-teal-200 bg-white p-4 shadow-sm'>
          <div className='flex items-start justify-between gap-4'>
            <div className='flex flex-1 items-start gap-3'>
              <SmartphoneIcon className='mt-0.5 size-5 shrink-0 text-teal-600' />
              <div className='flex-1'>
                <h3 className='mb-1 font-semibold text-14px text-teal-800 sm:text-16px'>他のデバイスへ引き継ぐ</h3>
                <p className='text-12px text-gray-600 sm:text-14px'>
                  引き継ぎコードを発行して、他のデバイスやアプリでも同じ一覧を見られるようにします。
                </p>
              </div>
            </div>
            <button
              aria-label='閉じる'
              className='shrink-0 text-gray-400 hover:text-gray-600'
              onClick={transferDismiss.dismiss}
              type='button'
            >
              <X className='size-4' />
            </button>
          </div>
          <div className='mt-3 flex justify-end'>
            <Button onClick={() => setTransferOpen(true)} size='sm'>
              コードを発行
            </Button>
          </div>
        </section>
        <PairTransferDialog onOpenChange={setTransferOpen} open={transferOpen} />
      </>
    );
  }

  if (!signInDismiss.isLoaded || signInDismiss.dismissed) return null;
  return (
    <>
      <section className='mb-4 rounded-lg border border-teal-200 bg-white p-4 shadow-sm'>
        <div className='flex flex-col gap-4'>
          <div className='flex items-start gap-3'>
            <LogInIcon className='mt-0.5 size-5 shrink-0 text-teal-600' />
            <div className='flex-1'>
              <h3 className='mb-1 font-semibold text-14px text-teal-800 sm:text-16px'>Google アカウントで同期</h3>
              <p className='text-12px text-gray-600 sm:text-14px'>
                Google 認証で複数デバイスから同じ一覧にアクセス、機種変更でも消えません。
              </p>
            </div>
            <button
              aria-label='閉じる'
              className='shrink-0 text-gray-400 hover:text-gray-600'
              onClick={signInDismiss.dismiss}
              type='button'
            >
              <X className='size-4' />
            </button>
          </div>
          <div className='flex flex-wrap justify-end gap-2'>
            <Button onClick={() => setReceiveOpen(true)} size='sm' variant='outline'>
              引き継ぎコードで受け取る
            </Button>
            <Button onClick={() => void signInWithGoogle()} size='sm'>
              Google で同期する
            </Button>
          </div>
        </div>
      </section>
      <PairReceiveDialog onOpenChange={setReceiveOpen} open={receiveOpen} />
    </>
  );
};
