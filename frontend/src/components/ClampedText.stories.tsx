import type { Meta, StoryObj } from '@storybook/react';
import { ClampedText } from './ClampedText';

const meta: Meta<typeof ClampedText> = {
  title: 'Components/ClampedText',
  component: ClampedText,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// 利用可能高さは「外側ラッパーの高さ」から算出されるため、高さ固定の親に flex で伸ばして配置する。
const withBox = (height: number) => [
  (Story: () => React.ReactElement) => (
    <div style={{ display: 'flex', width: 220, height }} className='rounded bg-teal-500 p-2'>
      <Story />
    </div>
  ),
];

const longTitle = '草津温泉街散策と湯畑見学、お土産購入とカフェタイム、そして地元グルメの食べ歩き';

const titleClassName = 'w-full self-stretch font-bold text-14px text-white leading-snug';

export const ShortText: Story = {
  args: {
    className: titleClassName,
    children: '草津温泉入浴',
  },
  decorators: withBox(80),
};

export const ClampedToHeight: Story = {
  args: {
    className: titleClassName,
    children: longTitle,
  },
  decorators: withBox(48),
};

export const TallShowsMoreLines: Story = {
  args: {
    className: titleClassName,
    children: longTitle,
  },
  decorators: withBox(160),
};
