import { SummaryRow } from '@mock/stepFlow/SummaryRow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { formatTripRangeMD } from '@/lib/date';
import { DatesField } from './DatesField';
import { DestinationField } from './DestinationField';
import { NotesFields } from './NotesFields';

interface ConfirmStepProps {
  idPrefix: string;
  title: string;
  onTitleChange: (value: string) => void;
  start: Date | null;
  end: Date | null;
  onDatesChange: (start: Date | null, end: Date | null) => void;
  detail: string;
  onDetailChange: (value: string) => void;
  walicaUrl: string;
  onWalicaUrlChange: (value: string) => void;
  isWalicaUrlInvalid: boolean;
}

/** マークダウンの記号を落として 1 行目だけを要約表示に使う */
const firstLine = (markdown: string): string =>
  markdown
    .split('\n')
    .map(l => l.replace(/^[#>*\-\d.\s]+/, '').trim())
    .find(Boolean) ?? '';

/** 最後に入力内容を一覧し、行を開いてその場で直せる確認画面 */
export const ConfirmStep = ({
  idPrefix,
  title,
  onTitleChange,
  start,
  end,
  onDatesChange,
  detail,
  onDetailChange,
  walicaUrl,
  onWalicaUrlChange,
  isWalicaUrlInvalid,
}: ConfirmStepProps) => {
  const trimmedTitle = title.trim();
  const rangeText = formatTripRangeMD(start, end);
  const detailLine = firstLine(detail);
  const trimmedWalica = walicaUrl.trim();

  return (
    <Accordion
      type='single'
      collapsible
      defaultValue={trimmedTitle ? undefined : 'destination'}
      className='rounded-lg border px-3'
    >
      <AccordionItem value='destination'>
        <AccordionTrigger className='min-w-0 items-center py-3.5 hover:no-underline'>
          <SummaryRow
            label='名前'
            value={trimmedTitle || '入力してください'}
            empty={!trimmedTitle}
            invalid={!trimmedTitle}
          />
        </AccordionTrigger>
        <AccordionContent>
          <DestinationField id={`${idPrefix}-title`} value={title} onChange={onTitleChange} size='default' />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='dates'>
        <AccordionTrigger className='min-w-0 items-center py-3.5 hover:no-underline'>
          <SummaryRow label='期間' value={rangeText ?? '未定'} empty={!rangeText} />
        </AccordionTrigger>
        <AccordionContent>
          <DatesField start={start} end={end} onChange={onDatesChange} clearable />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='detail'>
        <AccordionTrigger className='min-w-0 items-center py-3.5 hover:no-underline'>
          <SummaryRow label='メモ' value={detailLine || 'なし'} empty={!detailLine} />
        </AccordionTrigger>
        <AccordionContent>
          <NotesFields
            idPrefix={`${idPrefix}-confirm`}
            detail={detail}
            onDetailChange={onDetailChange}
            walicaUrl={walicaUrl}
            onWalicaUrlChange={onWalicaUrlChange}
            isWalicaUrlInvalid={isWalicaUrlInvalid}
            show='detail'
          />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='walica'>
        <AccordionTrigger className='min-w-0 items-center py-3.5 hover:no-underline'>
          <SummaryRow
            label='Walica'
            value={trimmedWalica || 'なし'}
            empty={!trimmedWalica}
            invalid={isWalicaUrlInvalid}
          />
        </AccordionTrigger>
        <AccordionContent>
          <NotesFields
            idPrefix={`${idPrefix}-confirm`}
            detail={detail}
            onDetailChange={onDetailChange}
            walicaUrl={walicaUrl}
            onWalicaUrlChange={onWalicaUrlChange}
            isWalicaUrlInvalid={isWalicaUrlInvalid}
            show='walica'
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
