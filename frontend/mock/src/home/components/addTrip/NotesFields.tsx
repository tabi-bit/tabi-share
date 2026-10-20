import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LazyMarkdownEditor } from '@/components/ui/markdown';

interface NotesFieldsProps {
  idPrefix: string;
  detail: string;
  onDetailChange: (value: string) => void;
  walicaUrl: string;
  onWalicaUrlChange: (value: string) => void;
  isWalicaUrlInvalid: boolean;
  /** 確認画面ではメモと Walica を別の行で編集するため、片方だけ出せるようにする */
  show?: 'both' | 'detail' | 'walica';
}

export const NotesFields = ({
  idPrefix,
  detail,
  onDetailChange,
  walicaUrl,
  onWalicaUrlChange,
  isWalicaUrlInvalid,
  show = 'both',
}: NotesFieldsProps) => {
  const walicaId = `${idPrefix}-walica`;
  return (
    <div className='flex flex-col gap-4'>
      {show !== 'walica' && (
        <LazyMarkdownEditor
          className='max-h-72'
          id={`${idPrefix}-detail`}
          value={detail}
          onChange={onDetailChange}
          placeholder='例: 温泉とおいしいごはんが目当て / 予算は 1 人 3 万円くらい'
        />
      )}
      {show !== 'detail' && (
        <div className='flex flex-col gap-2'>
          {show === 'both' && (
            <Label htmlFor={walicaId}>
              WalicaのURL<span className='ml-1 text-muted-foreground text-xs'>（任意）</span>
            </Label>
          )}
          <Input
            id={walicaId}
            type='url'
            aria-label={show === 'both' ? undefined : 'WalicaのURL'}
            value={walicaUrl}
            onChange={e => onWalicaUrlChange(e.target.value)}
            placeholder='https://walica.jp/...'
            aria-invalid={isWalicaUrlInvalid}
            aria-describedby={isWalicaUrlInvalid ? `${walicaId}-error` : undefined}
          />
          {isWalicaUrlInvalid && (
            <p id={`${walicaId}-error`} className='text-12px text-destructive'>
              walica.jp の URL を入力してください
            </p>
          )}
        </div>
      )}
    </div>
  );
};
