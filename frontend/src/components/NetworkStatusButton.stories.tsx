import type { Meta, StoryObj } from '@storybook/react';
import { NetworkStatusButtonView } from './NetworkStatusButton';

const meta = {
  title: 'Components/NetworkStatusButton',
  component: NetworkStatusButtonView,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof NetworkStatusButtonView>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Offline ---

export const Offline: Story = {
  args: {
    isOffline: true,
    isRefreshing: false,
    onRefresh: () => console.log('refresh clicked'),
  },
};

export const OfflineReconnecting: Story = {
  args: {
    isOffline: true,
    isRefreshing: true,
    onRefresh: () => console.log('refresh clicked'),
  },
};

export const MobileOffline: Story = {
  args: {
    isOffline: true,
    isRefreshing: false,
    onRefresh: () => console.log('refresh clicked'),
  },
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
};

// --- Online ---

export const Online: Story = {
  args: {
    isOffline: false,
    isRefreshing: false,
    onRefresh: () => console.log('refresh clicked'),
  },
};

export const OnlineRefreshing: Story = {
  args: {
    isOffline: false,
    isRefreshing: true,
    onRefresh: () => console.log('refresh clicked'),
  },
};

export const MobileOnline: Story = {
  args: {
    isOffline: false,
    isRefreshing: false,
    onRefresh: () => console.log('refresh clicked'),
  },
  globals: {
    viewport: { value: 'mobile1', isRotated: false },
  },
};
