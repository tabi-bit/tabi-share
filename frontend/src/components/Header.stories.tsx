import type { Meta, StoryObj } from '@storybook/react';
import { useRef } from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { Page } from '@/types';
import type { Trip } from '@/types/trip';
import { Header } from './Header';

const onSelectPage = (pageId: Page['id']) => {
  console.log('Selected page ID:', pageId);
};

const demoTrip: Trip = {
  id: 1,
  title: '北海道旅行',
  urlId: 'trip1',
};

const demoPages: Page[] = [
  {
    id: 1,
    title: '1日目',
    tripId: 1,
  },
  {
    id: 2,
    title: '2日目',
    tripId: 1,
  },
  {
    id: 3,
    title: '3日目',
    tripId: 1,
  },
];

const singlePage: Page[] = [
  {
    id: 1,
    title: '日帰り旅行',
    tripId: 1,
  },
];

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
    mode: {
      control: { type: 'radio' },
      options: ['view', 'edit'],
      description: '表示モード（閲覧モード / 編集モード）',
    },
    trip: {
      description: '旅行情報オブジェクト',
    },
    pages: {
      description: 'ページ一覧配列',
    },
    selectedPageId: {
      control: { type: 'text' },
      description: '選択中ページID（スクロール時のBadge表示用）',
    },
    className: {
      control: { type: 'text' },
      description: '追加のCSSクラス',
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    trip: demoTrip,
    pages: demoPages,
    mode: 'view',
    selectedPageId: 1,
    onSelectPage,
    scrollContainerRef: { current: null },
    setMode: () => {
      /* noop */
    },
  },
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
    trip: demoTrip,
    pages: demoPages,
    mode: 'edit',
    selectedPageId: 2,
    onSelectPage,
    scrollContainerRef: { current: null },
    setMode: () => {
      /* noop */
    },
  },
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
    trip: {
      id: 1,
      title: '日帰り温泉ツアー',
      urlId: 'trip1',
    },
    pages: singlePage,
    mode: 'view',
    onSelectPage,
    scrollContainerRef: { current: null },
    setMode: () => {
      /* noop */
    },
  },
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
    trip: {
      id: 1,
      title: '新しい旅行計画',
      urlId: 'trip1',
    },
    pages: [],
    mode: 'edit',
    onSelectPage,
    scrollContainerRef: { current: null },
    setMode: () => {
      /* noop */
    },
  },
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
    trip: demoTrip,
    pages: demoPages,
    mode: 'view',
    selectedPageId: 2,
    className: 'border-b-2 border-blue-500',
    onSelectPage,
    scrollContainerRef: { current: null },
    setMode: () => {
      /* noop */
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'カスタムCSSクラスを適用した例。下部に青い境界線が追加されます。',
      },
    },
  },
};

export const ScrolledState: Story = {
  args: {
    trip: demoTrip,
    pages: demoPages,
    mode: 'view',
    selectedPageId: 1,
    onSelectPage,
    scrollContainerRef: { current: null },
    setMode: () => {
      /* noop */
    },
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story:
          'スクロール状態をシミュレートした表示。文字サイズが小さくなり、SelectがBadgeに変わり、ボタンが非表示になります。スクロールして動作を確認してください。',
      },
    },
  },
  decorators: [
    Story => {
      const scrollContainerRef = useRef<HTMLDivElement>(null);
      return (
        <div ref={scrollContainerRef} style={{ height: '200vh', overflow: 'auto' }}>
          <Story args={{ scrollContainerRef }} />
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
      );
    },
  ],
};
