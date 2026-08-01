import { useAtomValue } from 'jotai';
import { MailIcon } from 'lucide-react';
import { useState } from 'react';
import { authUserAtom } from '@/atoms/auth';
import { Button } from '@/components/ui/button';
import { SyncSignInDialog } from '@/dialogs/SyncSignInDialog';

/**
 * 旅程一覧ページに常時配置される "同期" セクション。
 *
 * - 未認証時のみ表示 (認証済みなら非表示)
 * - CTA は「同期する」(バックアップ・追加機能の位置づけ、"登録" 感を出さない)
 * - iOS Safari の Cookie 7 日パージ制約は明示しない (ポジティブ訴求のみ)
 */
export const SyncSection = () => {
  const authUser = useAtomValue(authUserAtom);
  const [dialogOpen, setDialogOpen] = useState(false);

  // 認証済み・初期化前は表示しない
  if (authUser !== null) return null;

  return (
    <>
      <section className='mb-6 rounded-lg border border-teal-200 bg-white p-4 shadow-sm'>
        <div className='flex items-start justify-between gap-4'>
          <div className='flex flex-1 items-start gap-3'>
            <MailIcon className='mt-0.5 size-5 shrink-0 text-teal-600' />
            <div>
              <h3 className='mb-1 font-semibold text-14px text-teal-800 sm:text-16px'>デバイス間で旅程を同期</h3>
              <p className='text-12px text-gray-600 sm:text-14px'>
                メール認証で複数デバイスから同じ一覧にアクセス、機種変更でも消えません。
              </p>
            </div>
          </div>
          <Button className='shrink-0' onClick={() => setDialogOpen(true)} size='sm'>
            同期する
          </Button>
        </div>
      </section>
      <SyncSignInDialog onOpenChange={setDialogOpen} open={dialogOpen} />
    </>
  );
};
