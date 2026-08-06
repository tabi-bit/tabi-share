import { useAtomValue } from 'jotai';
import { LogInIcon, SmartphoneIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { authUserAtom } from '@/atoms/auth';
import { Button } from '@/components/ui/button';
import { PairReceiveDialog } from '@/dialogs/PairReceiveDialog';
import { PairTransferDialog } from '@/dialogs/PairTransferDialog';
import { signInWithGoogle } from '@/hooks/useAuth';

/**
 * 旅程一覧ページに配置される "同期" セクション。
 *
 * - 未認証時: Google 認証 (`signInWithGoogle`) と引き継ぎ受け取り (`PairReceiveDialog`) の 2 導線
 *   - Google 認証は Safari 通常ブラウザで動作 (redirect 経由)。iOS PWA では機能しないため、
 *     iOS PWA ユーザーは Safari で認証したデバイスから引き継ぎコードを受け取る
 * - 認証済み時: 他デバイスへ引き継ぐ (`PairTransferDialog`) 導線
 */
export const SyncSection = () => {
  const authUser = useAtomValue(authUserAtom);
  const [transferOpen, setTransferOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  // 初期化前 (onAuthStateChanged 未発火) は表示しない
  if (authUser === undefined) return null;

  const handleGoogleSignIn = async (): Promise<void> => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('failed to start Google sign-in', err);
      toast.error('Google 認証を開始できませんでした');
    }
  };

  if (authUser !== null) {
    return (
      <>
        <section className='mb-6 rounded-lg border border-teal-200 bg-white p-4 shadow-sm'>
          <div className='flex items-start justify-between gap-4'>
            <div className='flex flex-1 items-start gap-3'>
              <SmartphoneIcon className='mt-0.5 size-5 shrink-0 text-teal-600' />
              <div>
                <h3 className='mb-1 font-semibold text-14px text-teal-800 sm:text-16px'>他のデバイスへ引き継ぐ</h3>
                <p className='text-12px text-gray-600 sm:text-14px'>
                  引き継ぎコードを発行して、iOS PWA など別のデバイスで同期を有効化します。
                </p>
              </div>
            </div>
            <Button className='shrink-0' onClick={() => setTransferOpen(true)} size='sm'>
              コードを発行
            </Button>
          </div>
        </section>
        <PairTransferDialog onOpenChange={setTransferOpen} open={transferOpen} />
      </>
    );
  }

  return (
    <>
      <section className='mb-6 rounded-lg border border-teal-200 bg-white p-4 shadow-sm'>
        <div className='flex flex-col gap-4'>
          <div className='flex items-start gap-3'>
            <LogInIcon className='mt-0.5 size-5 shrink-0 text-teal-600' />
            <div className='flex-1'>
              <h3 className='mb-1 font-semibold text-14px text-teal-800 sm:text-16px'>Google アカウントで同期</h3>
              <p className='text-12px text-gray-600 sm:text-14px'>
                Google 認証で複数デバイスから同じ一覧にアクセス、機種変更でも消えません。
              </p>
            </div>
          </div>
          <div className='flex flex-wrap justify-end gap-2'>
            <Button onClick={() => setReceiveOpen(true)} size='sm' variant='outline'>
              引き継ぎコードで受け取る
            </Button>
            <Button onClick={handleGoogleSignIn} size='sm'>
              Google で同期する
            </Button>
          </div>
        </div>
      </section>
      <PairReceiveDialog onOpenChange={setReceiveOpen} open={receiveOpen} />
    </>
  );
};
