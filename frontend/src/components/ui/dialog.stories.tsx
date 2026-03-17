import type { Meta, StoryObj } from '@storybook/react';
import { action } from 'storybook/actions';
import { Button } from './button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';

const onClose = action('ダイアログクローズ');
const onSave = action('保存');
const onCancel = action('キャンセル');
const onSubmit = action('送信');
const onEdit = action('編集');
const onDelete = action('削除');
const onConfirm = action('確認');

const meta: Meta<typeof Dialog> = {
  title: 'UI/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>ダイアログを開く</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>お知らせ</DialogTitle>
          <DialogDescription>新機能が追加されました！ぜひお試しください。</DialogDescription>
        </DialogHeader>
        <div className='py-4'>
          <p className='text-muted-foreground text-sm'>詳細な情報については、ヘルプページをご確認ください。</p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline' onClick={onClose}>
              閉じる
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const WithForm: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>プロフィール編集</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>プロフィール編集</DialogTitle>
          <DialogDescription>あなたのプロフィール情報を更新してください。</DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid grid-cols-4 items-center gap-4'>
            <label htmlFor='name' className='text-right font-medium text-sm'>
              名前
            </label>
            <input
              id='name'
              placeholder='山田太郎'
              className='col-span-3 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
            />
          </div>
          <div className='grid grid-cols-4 items-center gap-4'>
            <label htmlFor='email' className='text-right font-medium text-sm'>
              メール
            </label>
            <input
              id='email'
              type='email'
              placeholder='yamada@example.com'
              className='col-span-3 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
            />
          </div>
          <div className='grid grid-cols-4 items-center gap-4'>
            <label htmlFor='bio' className='text-right font-medium text-sm'>
              自己紹介
            </label>
            <textarea
              id='bio'
              placeholder='自己紹介を入力してください'
              className='col-span-3 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline' onClick={onCancel}>
              キャンセル
            </Button>
          </DialogClose>
          <Button onClick={onSave}>変更を保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const LongContent: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline'>利用規約</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>利用規約</DialogTitle>
          <DialogDescription>サービスをご利用いただく前に、以下の利用規約をお読みください。</DialogDescription>
        </DialogHeader>
        <div className='overflow-y-auto py-4'>
          <div className='space-y-4 text-sm'>
            <section>
              <h3 className='mb-2 font-semibold'>第1条（目的）</h3>
              <p>
                本規約は、当サービス「旅行旅程管理アプリケーション」（以下「本サービス」といいます）の利用に関する条件を定めるものです。
                ユーザーは本規約に同意の上、当サービスを利用するものとします。
              </p>
            </section>

            <section>
              <h3 className='mb-2 font-semibold'>第2条（利用資格）</h3>
              <p>本サービスは、以下の条件を満たす方にご利用いただけます：</p>
              <ul className='mt-2 list-disc pl-5'>
                <li>18歳以上の方</li>
                <li>有効なメールアドレスをお持ちの方</li>
                <li>本規約に同意いただける方</li>
              </ul>
            </section>

            <section>
              <h3 className='mb-2 font-semibold'>第3条（禁止事項）</h3>
              <p>ユーザーは以下の行為を行ってはなりません：</p>
              <ul className='mt-2 list-disc pl-5'>
                <li>法令に違反する行為</li>
                <li>他者の権利を侵害する行為</li>
                <li>当サービスの運営を妨害する行為</li>
                <li>虚偽の情報を登録する行為</li>
                <li>本サービスを商用目的で利用する行為</li>
              </ul>
            </section>

            <section>
              <h3 className='mb-2 font-semibold'>第4条（個人情報の取り扱い）</h3>
              <p>
                当社は、ユーザーの個人情報を適切に管理し、法令に基づき適正に取り扱います。
                詳細は、別途定めるプライバシーポリシーをご確認ください。
              </p>
            </section>

            <section>
              <h3 className='mb-2 font-semibold'>第5条（免責事項）</h3>
              <p>
                当社は、本サービスの利用によりユーザーに生じた損害について、
                当社に故意または重大な過失がある場合を除き、一切の責任を負いません。
              </p>
            </section>

            <section>
              <h3 className='mb-2 font-semibold'>第6条（規約の変更）</h3>
              <p>
                当社は、必要に応じて本規約を変更することがあります。
                変更後の規約は、本サービス上に掲載した時点から効力を発生するものとします。
              </p>
            </section>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline' onClick={onClose}>
              閉じる
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const NoCloseButton: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='secondary'>重要な通知</Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>重要なお知らせ</DialogTitle>
          <DialogDescription>システムの重要な更新が完了しました。必ずお読みください。</DialogDescription>
        </DialogHeader>
        <div className='py-4'>
          <div className='rounded-md bg-yellow-50 p-4 dark:bg-yellow-950'>
            <div className='flex'>
              <div className='text-sm text-yellow-800 dark:text-yellow-200'>
                <p className='font-medium'>セキュリティ更新</p>
                <p className='mt-1'>
                  お客様のアカウントのセキュリティを向上させるため、
                  次回ログイン時にパスワードの再設定をお願いいたします。
                </p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button onClick={onConfirm}>了解しました</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const CustomSized: Story = {
  render: () => (
    <div className='flex gap-4'>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant='outline' size='sm'>
            小さいダイアログ
          </Button>
        </DialogTrigger>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>確認</DialogTitle>
            <DialogDescription>この操作を実行しますか？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline' size='sm' onClick={onCancel}>
                いいえ
              </Button>
            </DialogClose>
            <Button size='sm' onClick={onConfirm}>
              はい
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant='outline'>大きいダイアログ</Button>
        </DialogTrigger>
        <DialogContent className='max-w-4xl'>
          <DialogHeader>
            <DialogTitle>詳細設定</DialogTitle>
            <DialogDescription>アプリケーションの詳細設定を変更できます。</DialogDescription>
          </DialogHeader>
          <div className='grid grid-cols-2 gap-6 py-4'>
            <div className='space-y-4'>
              <h4 className='font-medium'>表示設定</h4>
              <div className='space-y-2'>
                <label className='flex items-center gap-2'>
                  <input type='checkbox' className='rounded' />
                  <span className='text-sm'>ダークモード</span>
                </label>
                <label className='flex items-center gap-2'>
                  <input type='checkbox' className='rounded' />
                  <span className='text-sm'>コンパクト表示</span>
                </label>
              </div>
            </div>
            <div className='space-y-4'>
              <h4 className='font-medium'>通知設定</h4>
              <div className='space-y-2'>
                <label className='flex items-center gap-2'>
                  <input type='checkbox' className='rounded' />
                  <span className='text-sm'>メール通知</span>
                </label>
                <label className='flex items-center gap-2'>
                  <input type='checkbox' className='rounded' />
                  <span className='text-sm'>プッシュ通知</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline' onClick={onCancel}>
                キャンセル
              </Button>
            </DialogClose>
            <Button onClick={onSave}>設定を保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  ),
};

export const WithActions: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>旅程を管理</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>旅程管理</DialogTitle>
          <DialogDescription>「温泉巡りの旅」の管理操作を選択してください。</DialogDescription>
        </DialogHeader>
        <div className='py-4'>
          <div className='rounded-md border p-4'>
            <h4 className='font-medium'>温泉巡りの旅</h4>
            <p className='mt-1 text-muted-foreground text-sm'>2024年3月15日 - 3月17日 • 3名参加</p>
            <div className='mt-2 flex gap-2'>
              <span className='inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 font-medium text-green-800 text-xs dark:bg-green-900 dark:text-green-300'>
                公開中
              </span>
              <span className='inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 font-medium text-blue-800 text-xs dark:bg-blue-900 dark:text-blue-300'>
                編集可能
              </span>
            </div>
          </div>
        </div>
        <DialogFooter className='flex-col gap-2 sm:flex-row'>
          <DialogClose asChild>
            <Button variant='outline' onClick={onClose}>
              キャンセル
            </Button>
          </DialogClose>
          <Button variant='outline' onClick={onEdit}>
            編集
          </Button>
          <Button onClick={onSubmit}>共有リンクをコピー</Button>
          <Button variant='destructive' onClick={onDelete}>
            削除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
