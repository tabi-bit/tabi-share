import type { Meta, StoryObj } from '@storybook/react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    required: {
      control: 'boolean',
    },
    name: {
      control: 'text',
    },
    defaultValue: {
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
  render: args => (
    <Select {...args}>
      <SelectTrigger className='w-[180px]'>
        <SelectValue placeholder='選択してください' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='apple'>りんご</SelectItem>
        <SelectItem value='banana'>バナナ</SelectItem>
        <SelectItem value='orange'>オレンジ</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithDefaultValue: Story = {
  render: args => (
    <Select {...args} defaultValue='banana'>
      <SelectTrigger className='w-[180px]'>
        <SelectValue placeholder='選択してください' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='apple'>りんご</SelectItem>
        <SelectItem value='banana'>バナナ</SelectItem>
        <SelectItem value='orange'>オレンジ</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithGroups: Story = {
  render: args => (
    <Select {...args}>
      <SelectTrigger className='w-[200px]'>
        <SelectValue placeholder='食べ物を選択' />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>果物</SelectLabel>
          <SelectItem value='apple'>りんご</SelectItem>
          <SelectItem value='banana'>バナナ</SelectItem>
          <SelectItem value='orange'>オレンジ</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>野菜</SelectLabel>
          <SelectItem value='carrot'>にんじん</SelectItem>
          <SelectItem value='potato'>じゃがいも</SelectItem>
          <SelectItem value='onion'>たまねぎ</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const SmallSize: Story = {
  render: args => (
    <Select {...args}>
      <SelectTrigger className='w-[140px]' size='sm'>
        <SelectValue placeholder='選択' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='xs'>XS</SelectItem>
        <SelectItem value='s'>S</SelectItem>
        <SelectItem value='m'>M</SelectItem>
        <SelectItem value='l'>L</SelectItem>
        <SelectItem value='xl'>XL</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: args => (
    <Select {...args} disabled>
      <SelectTrigger className='w-[180px]'>
        <SelectValue placeholder='無効な選択' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='option1'>オプション1</SelectItem>
        <SelectItem value='option2'>オプション2</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithDisabledItems: Story = {
  render: args => (
    <Select {...args}>
      <SelectTrigger className='w-[180px]'>
        <SelectValue placeholder='プランを選択' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='free'>無料プラン</SelectItem>
        <SelectItem value='basic'>ベーシックプラン</SelectItem>
        <SelectItem value='premium' disabled>
          プレミアムプラン（準備中）
        </SelectItem>
        <SelectItem value='enterprise' disabled>
          エンタープライズプラン（準備中）
        </SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const LongOptions: Story = {
  render: args => (
    <Select {...args}>
      <SelectTrigger className='w-[280px]'>
        <SelectValue placeholder='県を選択してください' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='tokyo'>東京都</SelectItem>
        <SelectItem value='osaka'>大阪府</SelectItem>
        <SelectItem value='kyoto'>京都府</SelectItem>
        <SelectItem value='kanagawa'>神奈川県</SelectItem>
        <SelectItem value='saitama'>埼玉県</SelectItem>
        <SelectItem value='chiba'>千葉県</SelectItem>
        <SelectItem value='aichi'>愛知県</SelectItem>
        <SelectItem value='hokkaido'>北海道</SelectItem>
        <SelectItem value='fukuoka'>福岡県</SelectItem>
        <SelectItem value='hyogo'>兵庫県</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className='flex flex-col gap-6 p-4'>
      <div className='space-y-2'>
        <h3 className='font-medium text-sm'>基本的な選択</h3>
        <div className='flex gap-4'>
          <Select>
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='選択してください' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='option1'>オプション1</SelectItem>
              <SelectItem value='option2'>オプション2</SelectItem>
              <SelectItem value='option3'>オプション3</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue='option2'>
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='デフォルト値付き' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='option1'>オプション1</SelectItem>
              <SelectItem value='option2'>オプション2</SelectItem>
              <SelectItem value='option3'>オプション3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='space-y-2'>
        <h3 className='font-medium text-sm'>サイズ</h3>
        <div className='flex items-center gap-4'>
          <Select>
            <SelectTrigger className='w-[140px]' size='sm'>
              <SelectValue placeholder='小さい' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='s'>Small</SelectItem>
              <SelectItem value='m'>Medium</SelectItem>
              <SelectItem value='l'>Large</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='標準' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='s'>Small</SelectItem>
              <SelectItem value='m'>Medium</SelectItem>
              <SelectItem value='l'>Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='space-y-2'>
        <h3 className='font-medium text-sm'>グループ化</h3>
        <Select>
          <SelectTrigger className='w-[200px]'>
            <SelectValue placeholder='カテゴリ選択' />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>果物</SelectLabel>
              <SelectItem value='apple'>りんご</SelectItem>
              <SelectItem value='banana'>バナナ</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>野菜</SelectLabel>
              <SelectItem value='carrot'>にんじん</SelectItem>
              <SelectItem value='onion'>たまねぎ</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className='space-y-2'>
        <h3 className='font-medium text-sm'>状態</h3>
        <div className='flex gap-4'>
          <Select disabled>
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='無効' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='option1'>オプション1</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='一部無効' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='enabled'>有効</SelectItem>
              <SelectItem value='disabled' disabled>
                無効アイテム
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  ),
};
