import type { Meta, StoryObj } from '@storybook/react';
import { DebugLogPanel } from './DebugLogPanel';

const meta = {
  title: 'Components/DebugLogPanel',
  component: DebugLogPanel,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DebugLogPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// 実アプリでは ?debug=1 の gate 越しに画面右下へ fixed 表示される
export const Default: Story = {};

export const Mobile: Story = {
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
};
