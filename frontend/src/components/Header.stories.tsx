import type { Meta, StoryObj } from '@storybook/react';
import { createStore, Provider } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { selectedPageIdAtom, tripAtom, tripModeAtom, tripPagesAtom } from '@/atoms/tripPage';
import type { Page } from '@/types';
import type { Trip } from '@/types/trip';
import { Header } from './Header';

const DEMO_TS = new Date('2026-01-01T00:00:00Z');

const demoTrip: Trip = {
  id: 1,
  title: '北海道旅行',
  urlId: 'trip1',
  createdAt: DEMO_TS,
  lastEditedAt: DEMO_TS,
};

const demoTripWithDates: Trip = {
  id: 1,
  title: '北海道旅行',
  urlId: 'trip1',
  startDate: new Date(2026, 4, 24),
  endDate: new Date(2026, 4, 26),
  createdAt: DEMO_TS,
  lastEditedAt: DEMO_TS,
};

const demoTripStartOnly: Trip = {
  id: 1,
  title: '北海道旅行',
  urlId: 'trip1',
  startDate: new Date(2026, 4, 24),
  createdAt: DEMO_TS,
  lastEditedAt: DEMO_TS,
};

const demoTripLongTitle: Trip = {
  id: 1,
  title: '北海道満喫グルメと絶景を巡る大冒険ツアー',
  urlId: 'trip1',
  startDate: new Date(2026, 4, 24),
  endDate: new Date(2026, 4, 26),
  createdAt: DEMO_TS,
  lastEditedAt: DEMO_TS,
};

const demoPages: Page[] = [
  { id: 1, title: '1日目', tripId: 1 },
  { id: 2, title: '2日目', tripId: 1 },
  { id: 3, title: '3日目', tripId: 1 },
];

/** Storybook 用に atom を初期化するラッパー */
const AtomHydrator = ({
  trip,
  pages,
  selectedPageId,
  mode,
  children,
}: {
  trip: Trip;
  pages: Page[];
  selectedPageId?: Page['id'];
  mode?: 'view' | 'edit';
  children: ReactNode;
}) => {
  useHydrateAtoms([
    [tripAtom, trip],
    [tripPagesAtom, pages],
    [selectedPageIdAtom, selectedPageId],
    [tripModeAtom, mode ?? 'view'],
  ]);
  return <>{children}</>;
};

const meta = {
  title: 'Components/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'アプリケーションのヘッダー。旅行タイトル・期間・モード切替・共有を担当。ページ選択UI (pill) は子コンポーネント PageSelector に委譲。',
      },
    },
  },
  decorators: [
    Story => (
      <MemoryRouter>
        {/* Header 直下に浮遊する DesktopPill の表示余白を確保 */}
        <div style={{ height: 400, background: '#F4F2EC' }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['full', 'logoOnly'],
      description: '表示バリアント（full: 全機能表示 / logoOnly: ロゴのみ）',
    },
    className: {
      control: { type: 'text' },
      description: '追加のCSSクラス',
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof Header>;

export const LogoOnly: Story = {
  args: {
    variant: 'logoOnly',
  },
  parameters: {
    docs: {
      description: {
        story: 'ロゴのみを表示するシンプルなヘッダー。ホーム画面などで使用。',
      },
    },
  },
};

export const Default: Story = {
  args: {
    variant: 'full',
  },
  decorators: [
    Story => {
      const store = createStore();
      return (
        <Provider store={store}>
          <AtomHydrator trip={demoTrip} pages={demoPages} selectedPageId={1} mode='view'>
            <Story />
          </AtomHydrator>
        </Provider>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'デフォルトの閲覧モード。旅行タイトルとモード切替・共有ボタンが並ぶ。',
      },
    },
  },
};

export const EditMode: Story = {
  args: {
    variant: 'full',
  },
  decorators: [
    Story => {
      const store = createStore();
      return (
        <Provider store={store}>
          <AtomHydrator trip={demoTrip} pages={demoPages} selectedPageId={2} mode='edit'>
            <Story />
          </AtomHydrator>
        </Provider>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: '編集モード。Trip タイトル横のペンで Trip 編集ダイアログを起動できる。',
      },
    },
  },
};

export const WithDateRange: Story = {
  args: {
    variant: 'full',
  },
  decorators: [
    Story => {
      const store = createStore();
      return (
        <Provider store={store}>
          <AtomHydrator trip={demoTripWithDates} pages={demoPages} selectedPageId={1} mode='view'>
            <Story />
          </AtomHydrator>
        </Provider>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Trip 期間ありの基本ケース。タイトル下に期間サブタイトル（M/D(曜) 〜 M/D(曜)）が表示される。',
      },
    },
  },
};

export const PartialDateRange: Story = {
  args: {
    variant: 'full',
  },
  decorators: [
    Story => {
      const store = createStore();
      return (
        <Provider store={store}>
          <AtomHydrator trip={demoTripStartOnly} pages={demoPages} selectedPageId={1} mode='view'>
            <Story />
          </AtomHydrator>
        </Provider>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Trip 期間が片方のみ（開始日のみ）設定されている場合。サブタイトルは `M/D(曜) 〜` のみ。',
      },
    },
  },
};

export const LongTripTitle: Story = {
  args: {
    variant: 'full',
  },
  decorators: [
    Story => {
      const store = createStore();
      return (
        <Provider store={store}>
          <AtomHydrator trip={demoTripLongTitle} pages={demoPages} selectedPageId={1} mode='edit'>
            <Story />
          </AtomHydrator>
        </Provider>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: '長い Trip タイトルの折り返しと編集ペンの表示を確認する。',
      },
    },
  },
};

export const WithCustomClass: Story = {
  args: {
    variant: 'full',
    className: 'border-b-2 border-blue-500',
  },
  decorators: [
    Story => {
      const store = createStore();
      return (
        <Provider store={store}>
          <AtomHydrator trip={demoTrip} pages={demoPages} selectedPageId={2} mode='view'>
            <Story />
          </AtomHydrator>
        </Provider>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'カスタムCSSクラスを適用した例。',
      },
    },
  },
};
