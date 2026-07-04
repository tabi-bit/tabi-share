import type { Meta, StoryObj } from '@storybook/react';
import { createStore, Provider } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import type { ReactNode } from 'react';
import { useState } from 'react';
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
  updatedAt: DEMO_TS,
};

const demoPages: Page[] = [
  { id: 1, title: '1日目', tripId: 1 },
  { id: 2, title: '2日目', tripId: 1 },
  { id: 3, title: '3日目', tripId: 1 },
];

const singlePage: Page[] = [{ id: 1, title: '日帰り旅行', tripId: 1 }];

const demoTripWithDates: Trip = {
  id: 1,
  title: '北海道旅行',
  urlId: 'trip1',
  startDate: new Date(2026, 4, 24),
  endDate: new Date(2026, 4, 26),
  createdAt: DEMO_TS,
  updatedAt: DEMO_TS,
};

const demoTripStartOnly: Trip = {
  id: 1,
  title: '北海道旅行',
  urlId: 'trip1',
  startDate: new Date(2026, 4, 24),
  createdAt: DEMO_TS,
  updatedAt: DEMO_TS,
};

const pagesWithDates: Page[] = [
  { id: 1, title: '札幌観光', tripId: 1, date: new Date(2026, 4, 24) },
  { id: 2, title: '小樽散策', tripId: 1, date: new Date(2026, 4, 25) },
  { id: 3, title: '函館見学', tripId: 1, date: new Date(2026, 4, 26) },
];

const mixedDatePages: Page[] = [
  { id: 1, title: '札幌観光', tripId: 1, date: new Date(2026, 4, 24) },
  { id: 2, title: '札幌観光（B案）', tripId: 1, date: new Date(2026, 4, 24) },
  { id: 3, title: '小樽散策', tripId: 1, date: new Date(2026, 4, 25) },
  { id: 4, title: '予備プラン', tripId: 1, date: null },
];

const longTitlePages: Page[] = [
  { id: 1, title: '北海道満喫ガッツリ堪能プラン', tripId: 1, date: new Date(2026, 4, 24) },
  { id: 2, title: '小樽運河と寿司めぐり', tripId: 1, date: new Date(2026, 4, 25) },
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
          'アプリケーションのヘッダーコンポーネント。旅行タイトル、ページ選択、モード切り替えボタンを含みます。',
      },
    },
  },
  decorators: [
    Story => (
      <MemoryRouter>
        <Story />
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
        story: 'ロゴのみを表示するシンプルなヘッダー。ホーム画面などで使用されます。',
      },
    },
  },
};

export const Default: Story = {
  args: {
    variant: 'full',
    scrollContainer: null,
    isDraggingRef: { current: false },
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
        story: 'デフォルトの閲覧モード表示。基本的な旅行情報とページ選択が可能です。',
      },
    },
  },
};

export const EditMode: Story = {
  args: {
    variant: 'full',
    scrollContainer: null,
    isDraggingRef: { current: false },
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
        story: '編集モード表示。ページ情報編集ボタンが表示されます。',
      },
    },
  },
};

export const SinglePage: Story = {
  args: {
    variant: 'full',
    scrollContainer: null,
    isDraggingRef: { current: false },
  },
  decorators: [
    Story => {
      const store = createStore();
      return (
        <Provider store={store}>
          <AtomHydrator
            trip={{ id: 1, title: '日帰り温泉ツアー', urlId: 'trip1', createdAt: DEMO_TS, updatedAt: DEMO_TS }}
            pages={singlePage}
            mode='view'
          >
            <Story />
          </AtomHydrator>
        </Provider>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'ページが1つだけの日帰り旅行の例です。',
      },
    },
  },
};

export const EmptyPages: Story = {
  args: {
    variant: 'full',
    scrollContainer: null,
    isDraggingRef: { current: false },
  },
  decorators: [
    Story => {
      const store = createStore();
      return (
        <Provider store={store}>
          <AtomHydrator
            trip={{ id: 1, title: '新しい旅行計画', urlId: 'trip1', createdAt: DEMO_TS, updatedAt: DEMO_TS }}
            pages={[]}
            mode='edit'
          >
            <Story />
          </AtomHydrator>
        </Provider>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'ページが未作成の状態。新規旅行作成時の表示例です。',
      },
    },
  },
};

export const WithCustomClass: Story = {
  args: {
    variant: 'full',
    scrollContainer: null,
    isDraggingRef: { current: false },
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
        story: 'カスタムCSSクラスを適用した例。下部に青い境界線が追加されます。',
      },
    },
  },
};

export const WithDateRange: Story = {
  args: {
    variant: 'full',
    scrollContainer: null,
    isDraggingRef: { current: false },
  },
  decorators: [
    Story => {
      const store = createStore();
      return (
        <Provider store={store}>
          <AtomHydrator trip={demoTripWithDates} pages={pagesWithDates} selectedPageId={1} mode='view'>
            <Story />
          </AtomHydrator>
        </Provider>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story:
          'Trip 期間あり・Page 日付ありの基本ケース。タイトル下に期間（M/D(曜)〜M/D(曜)）、Select に MM/DD(曜) · title。',
      },
    },
  },
};

export const PartialDateRange: Story = {
  args: {
    variant: 'full',
    scrollContainer: null,
    isDraggingRef: { current: false },
  },
  decorators: [
    Story => {
      const store = createStore();
      return (
        <Provider store={store}>
          <AtomHydrator trip={demoTripStartOnly} pages={pagesWithDates} selectedPageId={1} mode='view'>
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

export const MixedDatePages: Story = {
  args: {
    variant: 'full',
    scrollContainer: null,
    isDraggingRef: { current: false },
  },
  decorators: [
    Story => {
      const store = createStore();
      return (
        <Provider store={store}>
          <AtomHydrator trip={demoTripWithDates} pages={mixedDatePages} selectedPageId={1} mode='edit'>
            <Story />
          </AtomHydrator>
        </Provider>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story:
          'date 重複（同日に A案/B案 のような複数 Page）と date=null（予備プラン）が混在するケース。並び順: date 昇順 → id 昇順 → null 末尾。',
      },
    },
  },
};

export const LongPageTitle: Story = {
  args: {
    variant: 'full',
    scrollContainer: null,
    isDraggingRef: { current: false },
  },
  decorators: [
    Story => {
      const store = createStore();
      return (
        <Provider store={store}>
          <AtomHydrator trip={demoTripWithDates} pages={longTitlePages} selectedPageId={1} mode='view'>
            <Story />
          </AtomHydrator>
        </Provider>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story:
          '長いタイトルで Select トリガーが 2 行に折り返されるケース。狭いビューポートで顕著（max-w-[30vw] の制約による）。',
      },
    },
  },
};

export const ScrolledState: Story = {
  args: {
    variant: 'full',
    scrollContainer: null,
    isDraggingRef: { current: false },
  },
  decorators: [
    (Story, context) => {
      const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);
      const store = createStore();
      return (
        <Provider store={store}>
          <AtomHydrator trip={demoTrip} pages={demoPages} selectedPageId={1} mode='view'>
            <div ref={setScrollContainer} style={{ height: '200vh', overflow: 'auto' }}>
              <Story args={{ ...context.args, variant: 'full', scrollContainer }} />
              <div style={{ padding: '2rem', marginTop: '2rem' }}>
                <h2>スクロールしてヘッダーの変化を確認</h2>
                <p>
                  このページを下にスクロールすると、ヘッダーの文字サイズが小さくなり、SelectがBadgeに変わり、ボタンが非表示になります。
                </p>
                <div
                  style={{
                    height: '1000px',
                    background: 'linear-gradient(to bottom, #f0f9ff, #e0f2fe)',
                    padding: '2rem',
                    borderRadius: '8px',
                    marginTop: '1rem',
                  }}
                >
                  <h3>コンテンツエリア</h3>
                  <p>ここはメインコンテンツです。スクロールしてヘッダーの動作を確認してください。</p>
                </div>
              </div>
            </div>
          </AtomHydrator>
        </Provider>
      );
    },
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story:
          'スクロール状態をシミュレートした表示。文字サイズが小さくなり、SelectがBadgeに変わり、ボタンが非表示になります。スクロールして動作を確認してください。',
      },
    },
  },
};
