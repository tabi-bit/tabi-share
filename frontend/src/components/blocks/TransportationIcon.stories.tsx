import type { Meta, StoryObj } from '@storybook/react';
import { TransportationIcon } from './TransportationIcon';

const meta: Meta<typeof TransportationIcon> = {
  title: 'Components/Blocks/TransportationIcon',
  component: TransportationIcon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['car', 'bus', 'train', 'flight', 'ship', 'bicycle', 'walk'],
      description: '移動手段の種類',
    },
    className: {
      control: { type: 'text' },
      description: 'CSSクラス名（サイズやスタイルのカスタマイズ）',
    },
  },
  args: {
    type: 'car',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    type: 'car',
  },
};