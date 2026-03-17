import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Label } from './label';
import { Switch } from './switch';

const meta: Meta<typeof Switch> = {
  title: 'UI/Switch',
  component: Switch,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    required: {
      control: 'boolean',
    },
    name: {
      control: 'text',
    },
    value: {
      control: 'text',
    },
  },
  args: {
    disabled: false,
    required: false,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Checked: Story = {
  args: {
    checked: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    disabled: true,
    checked: true,
  },
};

export const Required: Story = {
  args: {
    required: true,
  },
};

export const WithLabel: Story = {
  render: args => (
    <div className='flex items-center space-x-2'>
      <Switch id='notifications' {...args} />
      <Label htmlFor='notifications'>プッシュ通知を有効にする</Label>
    </div>
  ),
};

const InteractiveExample = () => {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <div className='flex items-center space-x-2'>
      <Switch id='interactive' checked={isChecked} onCheckedChange={setIsChecked} />
      <Label htmlFor='interactive'>{isChecked ? 'オン' : 'オフ'}</Label>
    </div>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveExample />,
};

export const FormExample: Story = {
  render: () => (
    <form className='space-y-4'>
      <div className='flex items-center justify-between'>
        <Label htmlFor='marketing' className='font-medium text-sm'>
          マーケティングメール
        </Label>
        <Switch id='marketing' name='preferences' value='marketing' />
      </div>
      <div className='flex items-center justify-between'>
        <Label htmlFor='newsletter' className='font-medium text-sm'>
          ニュースレター
        </Label>
        <Switch id='newsletter' name='preferences' value='newsletter' />
      </div>
      <div className='flex items-center justify-between'>
        <Label htmlFor='updates' className='font-medium text-muted-foreground text-sm'>
          製品アップデート（現在利用不可）
        </Label>
        <Switch id='updates' name='preferences' value='updates' disabled />
      </div>
    </form>
  ),
};

export const SettingsPanel: Story = {
  render: () => (
    <div className='w-80 space-y-6 rounded-lg border p-6'>
      <div>
        <h3 className='font-medium text-lg'>通知設定</h3>
        <p className='text-muted-foreground text-sm'>アプリケーションの通知設定を管理します</p>
      </div>

      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div className='space-y-0.5'>
            <Label className='text-base'>プッシュ通知</Label>
            <div className='text-muted-foreground text-sm'>重要な更新をリアルタイムで受け取る</div>
          </div>
          <Switch />
        </div>

        <div className='flex items-center justify-between'>
          <div className='space-y-0.5'>
            <Label className='text-base'>メール通知</Label>
            <div className='text-muted-foreground text-sm'>週次サマリーとニュースレター</div>
          </div>
          <Switch defaultChecked />
        </div>

        <div className='flex items-center justify-between'>
          <div className='space-y-0.5'>
            <Label className='text-base text-muted-foreground'>SMS通知</Label>
            <div className='text-muted-foreground text-sm'>現在この機能は利用できません</div>
          </div>
          <Switch disabled />
        </div>
      </div>
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div className='space-y-4'>
      <div className='flex items-center space-x-2'>
        <Switch id='unchecked' />
        <Label htmlFor='unchecked' className='text-sm'>
          オフ
        </Label>
      </div>
      <div className='flex items-center space-x-2'>
        <Switch id='checked' checked />
        <Label htmlFor='checked' className='text-sm'>
          オン
        </Label>
      </div>
      <div className='flex items-center space-x-2'>
        <Switch id='disabled' disabled />
        <Label htmlFor='disabled' className='text-sm'>
          無効（オフ）
        </Label>
      </div>
      <div className='flex items-center space-x-2'>
        <Switch id='disabled-checked' disabled checked />
        <Label htmlFor='disabled-checked' className='text-sm'>
          無効（オン）
        </Label>
      </div>
      <div className='flex items-center space-x-2'>
        <Switch id='required' required />
        <Label htmlFor='required' className='text-sm'>
          必須項目 <span className='text-red-500'>*</span>
        </Label>
      </div>
    </div>
  ),
};
