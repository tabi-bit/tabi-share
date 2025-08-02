import type { Meta, StoryObj } from '@storybook/react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion';

const meta: Meta = {
  title: 'UI/Accordion',
  component: Accordion,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

// biome-ignore lint/style/noDefaultExport: Storybook requires default export for meta
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Accordion type='single' collapsible className='w-[400px]'>
      <AccordionItem value='item-1'>
        <AccordionTrigger>旅程の作成方法</AccordionTrigger>
        <AccordionContent>
          新しい旅程を作成するには、画面右上の「旅程を作成」ボタンをクリックします。
          旅行名と期間を設定して、スポットを追加していきましょう。
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const Multiple: Story = {
  render: () => (
    <Accordion type='single' collapsible className='w-[500px]'>
      <AccordionItem value='item-1'>
        <AccordionTrigger>旅程の作成</AccordionTrigger>
        <AccordionContent>
          新しい旅程を作成するには、画面右上の「旅程を作成」ボタンをクリックします。
          旅行名、期間、参加者を設定して、旅程の詳細を入力していきましょう。
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-2'>
        <AccordionTrigger>スポットの追加</AccordionTrigger>
        <AccordionContent>
          ドラッグ&ドロップで簡単にスポットを追加できます。
          地図検索機能を使って観光地や温泉地を検索し、滞在時間や移動時間を設定します。
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-3'>
        <AccordionTrigger>共有機能</AccordionTrigger>
        <AccordionContent>
          作成した旅程は友人や家族と簡単に共有できます。
          共有URLを送信すると、リアルタイムで一緒に編集することができます。
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const Collapsible: Story = {
  render: () => (
    <Accordion type='multiple' className='w-[500px]'>
      <AccordionItem value='item-1'>
        <AccordionTrigger>移動時間の設定</AccordionTrigger>
        <AccordionContent>
          スポット間の移動時間は、Google Maps APIから自動取得することができます。
          手動での調整も可能で、交通手段（車・電車・徒歩）に応じて時間を設定できます。
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-2'>
        <AccordionTrigger>バッファ時間の管理</AccordionTrigger>
        <AccordionContent>
          予期しない遅延に対応するため、バッファ時間を設定することをお勧めします。
          温泉地では特に、入浴時間の延長や混雑による遅延を考慮しましょう。
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-3'>
        <AccordionTrigger>複数ルートの比較</AccordionTrigger>
        <AccordionContent>
          同じ旅行で複数のルート案を作成し、比較検討することができます。
          効率重視ルート、景色重視ルート、グルメ重視ルートなど、目的に応じた旅程を作成しましょう。
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const SingleExpanded: Story = {
  render: () => (
    <Accordion type='single' defaultValue='item-2' className='w-[500px]'>
      <AccordionItem value='item-1'>
        <AccordionTrigger>温泉地の選び方</AccordionTrigger>
        <AccordionContent>
          温泉地を選ぶ際は、泉質、効能、周辺の観光スポット、アクセスの良さを考慮しましょう。
          事前に温泉の営業時間や料金も確認しておくと安心です。
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-2'>
        <AccordionTrigger>宿泊施設の予約</AccordionTrigger>
        <AccordionContent>
          人気の温泉地は早めの予約が必要です。旅程アプリで候補をリストアップし、
          各施設の特徴や料金を比較して最適な宿を選びましょう。 予約確認メールやURLは旅程に直接保存できます。
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-3'>
        <AccordionTrigger>グルメスポット</AccordionTrigger>
        <AccordionContent>
          温泉地周辺の名物料理や地元グルメを事前にリサーチしておきましょう。
          営業時間や定休日を確認し、旅程に組み込んでおくと効率的です。
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const WithLongContent: Story = {
  render: () => (
    <Accordion type='single' collapsible className='w-[600px]'>
      <AccordionItem value='item-1'>
        <AccordionTrigger>車旅行の準備チェックリスト</AccordionTrigger>
        <AccordionContent>
          <div className='space-y-3'>
            <h4 className='font-medium'>出発前の確認事項</h4>
            <ul className='space-y-1 text-sm'>
              <li>• 車両点検（タイヤ、エンジンオイル、燃料）</li>
              <li>• ETCカードの確認</li>
              <li>• カーナビの地図更新</li>
              <li>• 高速道路料金の準備</li>
              <li>• 宿泊施設の駐車場確認</li>
            </ul>

            <h4 className='font-medium'>持ち物チェック</h4>
            <ul className='space-y-1 text-sm'>
              <li>• 運転免許証</li>
              <li>• 車検証・自賠責保険証</li>
              <li>• 応急処置キット</li>
              <li>• モバイルバッテリー</li>
              <li>• 雨具（山間部の温泉地では特に重要）</li>
              <li>• 常備薬</li>
            </ul>

            <h4 className='font-medium'>温泉旅行の特別な準備</h4>
            <ul className='space-y-1 text-sm'>
              <li>• タオル（レンタルの有無を確認）</li>
              <li>• 着替え（温泉後のさっぱりした服装）</li>
              <li>• ビニール袋（濡れたタオルの収納用）</li>
              <li>• 入浴剤（温泉気分を自宅でも楽しむ）</li>
            </ul>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const NestedContent: Story = {
  render: () => (
    <Accordion type='single' collapsible className='w-[600px]'>
      <AccordionItem value='item-1'>
        <AccordionTrigger>旅程の詳細設定</AccordionTrigger>
        <AccordionContent>
          <div className='space-y-4'>
            <div className='rounded-md border p-3'>
              <h4 className='font-medium text-sm'>基本設定</h4>
              <div className='mt-2 grid grid-cols-2 gap-4 text-sm'>
                <div>
                  <span className='text-muted-foreground'>旅行名</span>
                  <div className='font-medium'>箱根温泉巡りの旅</div>
                </div>
                <div>
                  <span className='text-muted-foreground'>期間</span>
                  <div className='font-medium'>2024年3月15日〜17日</div>
                </div>
              </div>
            </div>

            <div className='rounded-md border p-3'>
              <h4 className='font-medium text-sm'>参加者情報</h4>
              <div className='mt-2 space-y-2'>
                <div className='flex items-center gap-2 text-sm'>
                  <div className='size-6 rounded-full bg-blue-100 dark:bg-blue-900'></div>
                  <span>田中太郎（幹事）</span>
                </div>
                <div className='flex items-center gap-2 text-sm'>
                  <div className='size-6 rounded-full bg-green-100 dark:bg-green-900'></div>
                  <span>佐藤花子</span>
                </div>
                <div className='flex items-center gap-2 text-sm'>
                  <div className='size-6 rounded-full bg-yellow-100 dark:bg-yellow-900'></div>
                  <span>山田次郎</span>
                </div>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const FAQ: Story = {
  render: () => (
    <div className='w-[700px]'>
      <h3 className='mb-4 font-semibold text-lg'>よくある質問</h3>
      <Accordion type='single' collapsible>
        <AccordionItem value='faq-1'>
          <AccordionTrigger>旅程の編集権限は何人まで共有できますか？</AccordionTrigger>
          <AccordionContent>
            編集権限に人数制限はありません。共有URLを知っている方であれば、
            Firebase認証を通じて誰でも編集に参加できます。
            ただし、大人数での同時編集は混乱を避けるため、事前に役割分担を決めることをお勧めします。
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value='faq-2'>
          <AccordionTrigger>Google Maps APIの使用料金はかかりますか？</AccordionTrigger>
          <AccordionContent>
            基本的な使用は無料枠内で運用されています。 ただし、短時間に大量の検索を行うと制限がかかる場合があります。
            効率的に使用するため、必要な時にのみ「移動時間を取得」ボタンをご利用ください。
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value='faq-3'>
          <AccordionTrigger>オフラインでも旅程を確認できますか？</AccordionTrigger>
          <AccordionContent>
            現在のバージョンではオフライン機能には対応していません。
            旅行中はスマートフォンの画面キャプチャ機能を使って、 重要な情報を保存しておくことをお勧めします。
            将来のアップデートでオフライン機能の追加を検討中です。
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value='faq-4'>
          <AccordionTrigger>旅程を削除したらどうなりますか？</AccordionTrigger>
          <AccordionContent>
            旅程の削除は旅程作成者のみが実行できます。削除すると、
            共有されている全てのユーザーがアクセスできなくなります。
            削除後のデータ復旧はできませんので、慎重にご検討ください。
            重要な旅程は複数のルート案として保存しておくことをお勧めします。
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value='faq-5'>
          <AccordionTrigger>予約情報はどのように管理すればよいですか？</AccordionTrigger>
          <AccordionContent>
            現在は各スポットのメモ欄に予約確認番号や連絡先を記載することができます。
            将来のアップデートでは、予約情報の専用管理機能や、 外部予約サイトとの連携機能を追加予定です。
            宿泊施設の予約は特に重要なので、電話番号と確認番号は必ず記録しておきましょう。
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  ),
};
