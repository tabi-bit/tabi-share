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

interface TransferTokenOut {
  custom_token: string;
}

type Status = 'loading' | 'ready' | 'error';

/**
 * 認証済み (メール認証済み) user のための「他デバイスへ引き継ぐ」ダイアログ。
 *
 * サーバーの `POST /pair/transfer-token` から Firebase Custom Token を取得し、
 * QR コードと textarea + コピーボタンで表示する。受信側デバイスで
 * `signInWithCustomToken` に渡すことで認証状態が移送される。
 * Custom Token は Firebase 仕様上 1 時間有効。
 */
export const PairTransferDialog = ({ open, onOpenChange }: PairTransferDialogProps) => {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!open) {
      setToken(null);
      setStatus('loading');
      return;
    }
    let cancelled = false;
    apiClient
      .post<TransferTokenOut>('/pair/transfer-token')
      .then(res => {
        if (cancelled) return;
        setToken(res.data.custom_token);
        setStatus('ready');
      })
      .catch(err => {
        if (cancelled) return;
        console.error('failed to fetch transfer token', err);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleCopy = async (): Promise<void> => {
    if (token == null) return;
    try {
      await navigator.clipboard.writeText(token);
      toast.success('引き継ぎコードをコピーしました');
    } catch {
      toast.error('コピーに失敗しました');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          {status === 'ready' && token != null && (
            <div className='flex flex-col gap-4'>
              <p className='text-12px text-gray-600 sm:text-14px'>
                他のデバイス・PWA の「引き継ぎコードで受け取る」に貼り付けるか、下記の QR コードを読み取ってください。
              </p>
              <div className='flex justify-center'>
                <QRCodeCanvas size={192} value={token} />
              </div>
              <textarea
                className='h-24 w-full resize-none rounded border border-gray-300 p-2 font-mono text-10px sm:text-12px'
                readOnly
                value={token}
              />
              <div className='flex flex-col gap-1 text-10px text-gray-500 sm:text-12px'>
                <span>⏱ 1 時間のみ有効です</span>
                <span>⚠ 他人と共有しないでください</span>
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          {status === 'ready' && token != null && (
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
