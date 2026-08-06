import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiClient } from '@/lib/apiClient';

interface PairTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreatePairingOut {
  code: string;
  expires_at: string;
}

type Status = 'loading' | 'ready' | 'error';

/**
 * 認証済み (Google 認証済み) user のための「他のデバイスへ引き継ぐ」ダイアログ。
 *
 * サーバー `POST /pair/create` から 8 桁コードを受け取り、QR コード + 大きな数字表示 +
 * コピーボタンで見せる。実体の Firebase Custom Token は Firestore にサーバー側で保存されており、
 * 受信側の /pair/redeem で交換される。有効期限 5 分・one-time consume。
 */
export const PairTransferDialog = ({ open, onOpenChange }: PairTransferDialogProps) => {
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!open) {
      setCode(null);
      setStatus('loading');
      return;
    }
    let cancelled = false;
    apiClient
      .post<CreatePairingOut>('/pair/create')
      .then(res => {
        if (cancelled) return;
        setCode(res.data.code);
        setStatus('ready');
      })
      .catch(err => {
        if (cancelled) return;
        console.error('failed to create pairing code', err);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleCopy = async (): Promise<void> => {
    if (code == null) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success('コードをコピーしました');
    } catch {
      toast.error('コピーに失敗しました');
    }
  };

  const formatCode = (value: string): string => {
    // "A9K3P2Q7" → "A9K3-P2Q7" のように 4 桁ごとに区切って読みやすく
    return value.length === 8 ? `${value.slice(0, 4)}-${value.slice(4)}` : value;
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>他のデバイスへ引き継ぐ</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {status === 'loading' && (
            <p className='text-14px text-gray-600 sm:text-16px'>引き継ぎコードを生成しています...</p>
          )}
          {status === 'error' && (
            <p className='text-14px text-red-600 sm:text-16px'>
              引き継ぎコードの発行に失敗しました。時間をおいて再度お試しください。
            </p>
          )}
          {status === 'ready' && code != null && (
            <div className='flex flex-col items-center gap-4'>
              <p className='w-full text-12px text-gray-600 sm:text-14px'>
                他のデバイス・PWA の「引き継ぎコードで受け取る」に入力するか、下記の QR コードを読み取ってください。
              </p>
              <div className='rounded bg-white p-2'>
                <QRCodeCanvas size={192} value={code} />
              </div>
              <p className='select-all font-mono text-24px font-semibold tracking-wider text-teal-800'>
                {formatCode(code)}
              </p>
              <div className='flex w-full flex-col gap-1 text-10px text-gray-500 sm:text-12px'>
                <span>⏱ 5 分間のみ有効です</span>
                <span>⚠ 他人と共有しないでください</span>
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          {status === 'ready' && code != null && (
            <Button onClick={handleCopy} type='button'>
              コピー
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)} type='button' variant='outline'>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
