import type { Meta, StoryObj } from '@storybook/react';

import { Checkbox } from './checkbox';
import { Label } from './label';

const meta: Meta<typeof Checkbox> = {
  title: 'UI/Checkbox',
  component: Checkbox,
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

// biome-ignore lint/style/noDefaultExport: Storybook requires default export for meta
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
      <Checkbox id='terms' {...args} />
      <Label htmlFor='terms'>利用規約に同意する</Label>
    </div>
  ),
};

export const FormExample: Story = {
  render: () => (
    <form className='space-y-4'>
      <div className='flex items-center space-x-2'>
        <Checkbox id='newsletter' name='preferences' value='newsletter' />
        <Label htmlFor='newsletter'>ニュースレターを受け取る</Label>
      </div>
      <div className='flex items-center space-x-2'>
        <Checkbox id='marketing' name='preferences' value='marketing' />
        <Label htmlFor='marketing'>マーケティングメールを受け取る</Label>
      </div>
      <div className='flex items-center space-x-2'>
        <Checkbox id='updates' name='preferences' value='updates' disabled />
        <Label htmlFor='updates'>製品アップデート通知（現在利用不可）</Label>
      </div>
    </form>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div className='space-y-4'>
      <div className='flex items-center space-x-2'>
        <Checkbox id='unchecked' />
        <Label htmlFor='unchecked' className='text-sm'>
          未チェック
        </Label>
      </div>
      <div className='flex items-center space-x-2'>
        <Checkbox id='checked' checked />
        <Label htmlFor='checked' className='text-sm'>
          チェック済み
        </Label>
      </div>
      <div className='flex items-center space-x-2'>
        <Checkbox id='disabled' disabled />
        <Label htmlFor='disabled' className='text-sm'>
          無効（未チェック）
        </Label>
      </div>
      <div className='flex items-center space-x-2'>
        <Checkbox id='disabled-checked' disabled checked />
        <Label htmlFor='disabled-checked' className='text-sm'>
          無効（チェック済み）
        </Label>
      </div>
      <div className='flex items-center space-x-2'>
        <Checkbox id='required' required />
        <Label htmlFor='required' className='text-sm'>
          必須項目 <span className='text-red-500'>*</span>
        </Label>
      </div>
    </div>
  ),
};
