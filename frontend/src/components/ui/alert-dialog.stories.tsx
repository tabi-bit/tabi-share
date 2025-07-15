import type { Meta, StoryObj } from '@storybook/react';
import { action } from 'storybook/actions';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';
import { Button } from './button';

const onCancel = action('キャンセル');
const onDelete = action('削除');
const onAccountDeleteCancel = action('アカウント削除キャンセル');
const onAccountDeleteConfirm = action('アカウント削除実行');
const onSaveWithoutContinue = action('保存せずに続行');
const onSaveAndContinue = action('保存して続行');
const onTermsDecline = action('利用規約に同意しない');
const onTermsAccept = action('利用規約に同意する');
const onMaintenanceAccept = action('メンテナンス了解');
const onOperationCancel = action('操作キャンセル');
const onOperationExecute = action('操作実行');
const onDangerousCancel = action('危険な操作をキャンセル');
const onDangerousExecute = action('危険な操作を実行');

const meta: Meta<typeof AlertDialog> = {
  title: 'UI/AlertDialog',
  component: AlertDialog,
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
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant='outline'>削除</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            この操作は取り消すことができません。データが完全に削除されます。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>キャンセル</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete}>削除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

export const Destructive: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant='destructive'>アカウント削除</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>アカウントを削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            この操作により、あなたのアカウントとすべてのデータが完全に削除されます。
            この操作は取り消すことができません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onAccountDeleteCancel}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            onClick={onAccountDeleteConfirm}
          >
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

export const Confirmation: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button>保存</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>変更を保存しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            未保存の変更があります。このまま続行すると変更が失われる可能性があります。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onSaveWithoutContinue}>保存せずに続行</AlertDialogCancel>
          <AlertDialogAction onClick={onSaveAndContinue}>保存して続行</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

export const LongContent: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant='outline'>利用規約</Button>
      </AlertDialogTrigger>
      <AlertDialogContent className='max-h-[80vh] overflow-y-auto'>
        <AlertDialogHeader>
          <AlertDialogTitle>利用規約に同意しますか？</AlertDialogTitle>
          <AlertDialogDescription>以下の利用規約をお読みください。続行するには同意が必要です。</AlertDialogDescription>
        </AlertDialogHeader>
        <div className='my-4 text-sm'>
          <h4 className='mb-2 font-semibold'>第1条（目的）</h4>
          <p className='mb-4'>
            本規約は、当サービスの利用に関する条件を定めるものです。
            ユーザーは本規約に同意の上、当サービスを利用するものとします。
          </p>

          <h4 className='mb-2 font-semibold'>第2条（利用資格）</h4>
          <p className='mb-4'>
            当サービスは、18歳以上の方のみご利用いただけます。 未成年者が利用する場合は、保護者の同意が必要です。
          </p>

          <h4 className='mb-2 font-semibold'>第3条（禁止事項）</h4>
          <p>
            ユーザーは以下の行為を行ってはなりません：
            <br />• 法令に違反する行為
            <br />• 他者の権利を侵害する行為
            <br />• 当サービスの運営を妨害する行為
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onTermsDecline}>同意しない</AlertDialogCancel>
          <AlertDialogAction onClick={onTermsAccept}>同意する</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

export const SimpleAlert: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant='secondary'>お知らせ</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>システムメンテナンス</AlertDialogTitle>
          <AlertDialogDescription>
            2024年1月15日 2:00-4:00にシステムメンテナンスを実施します。 この時間帯はサービスがご利用いただけません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onMaintenanceAccept}>了解</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

export const WithActionsDemo: Story = {
  render: () => (
    <div className='flex flex-col gap-4'>
      <p className='text-muted-foreground text-sm'>
        各ボタンをクリックするとStorybookのActionsパネルでイベントを確認できます
      </p>
      <div className='flex gap-2'>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant='outline'>警告ダイアログ</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>本当に実行しますか？</AlertDialogTitle>
              <AlertDialogDescription>この操作により重要なデータが変更される可能性があります。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={onOperationCancel}>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={onOperationExecute}>実行</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant='destructive'>危険な操作</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>警告</AlertDialogTitle>
              <AlertDialogDescription>この操作は取り消すことができません。本当に続行しますか？</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={onDangerousCancel}>やめる</AlertDialogCancel>
              <AlertDialogAction
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                onClick={onDangerousExecute}
              >
                続行
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  ),
};
