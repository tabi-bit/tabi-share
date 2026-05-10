import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFormatTripUrl } from '@/hooks/useTripUrls';
import { TRIP_URL_FORMAT_INTENT_MAX_LENGTH, TRIP_URL_FORMAT_SOURCE_MAX_LENGTH } from '@/types';

interface TripUrlFormatSectionProps {
  tripId: number;
  /** ダイアログの開閉状態。true → false → true で内部入力をリセット */
  open: boolean;
  /** 整形成功時に呼ばれるコールバック。markdown を memo の末尾に追記する想定 */
  onAppend: (markdown: string) => void;
}

export const TripUrlFormatSection = ({ tripId, open, onAppend }: TripUrlFormatSectionProps) => {
  const [sourceText, setSourceText] = useState('');
  const [intent, setIntent] = useState('');
  const { formatTripUrl, isFormatting } = useFormatTripUrl(tripId);

  // ダイアログが開き直されたタイミングで入力をリセット
  useEffect(() => {
    if (open) {
      setSourceText('');
      setIntent('');
    }
  }, [open]);

  const handleFormat = async () => {
    const trimmedSource = sourceText.trim();
    if (!trimmedSource) {
      toast.error('整形対象テキストを入力してください');
      return;
    }
    const result = await formatTripUrl({
      sourceText,
      intent: intent.trim() || null,
    });
    if (result?.markdown) {
      onAppend(result.markdown);
      // 連続整形しやすいように整形対象だけクリア（指示は残す）
      setSourceText('');
      toast.success('AI 整形をメモに追記しました');
    }
  };

  return (
    <div className='space-y-3 rounded-md border border-muted-foreground/40 border-dashed p-3'>
      <div className='flex items-center justify-between'>
        <p className='font-medium text-12px text-muted-foreground sm:text-14px'>AI で整形（任意）</p>
        <p className='text-10px text-muted-foreground sm:text-12px'>結果はメモ末尾に追記されます</p>
      </div>

      <div className='space-y-1'>
        <Label htmlFor='trip-url-format-source'>整形対象テキスト</Label>
        <Textarea
          id='trip-url-format-source'
          value={sourceText}
          onChange={e => setSourceText(e.target.value)}
          placeholder='ページから料金表など整形したい部分をコピペ'
          rows={4}
          maxLength={TRIP_URL_FORMAT_SOURCE_MAX_LENGTH}
        />
      </div>

      <div className='space-y-1'>
        <Label htmlFor='trip-url-format-intent'>指示（任意）</Label>
        <Input
          id='trip-url-format-intent'
          value={intent}
          onChange={e => setIntent(e.target.value)}
          placeholder='例: 朝食付きと素泊まりで価格表に / 空欄ならサマリ'
          maxLength={TRIP_URL_FORMAT_INTENT_MAX_LENGTH}
        />
      </div>

      <div className='flex justify-end'>
        <Button
          type='button'
          variant='secondary'
          onClick={handleFormat}
          loading={isFormatting}
          disabled={!sourceText.trim() || isFormatting}
        >
          AI で整形
        </Button>
      </div>
    </div>
  );
};
