import type { Meta, StoryObj } from '@storybook/react';
import { MarkdownViewer } from './MarkdownViewer';

const meta: Meta<typeof MarkdownViewer> = {
  title: 'UI/MarkdownViewer',
  component: MarkdownViewer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'light-on-dark'],
      description: '表示バリアント',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleMarkdown = `# 見出し 1 (H1)
## 見出し 2 (H2)
### 見出し 3 (H3)
#### 見出し 4 (H4)

---

## 1. 文字の装飾

通常のテキストの中に、**太字（Bold）** や、*斜体（Italic）*、および ***太字かつ斜体*** を含めることができます。
環境によっては、~~取り消し線（Strikethrough）~~もサポートされています。

## 2. リスト表現

### 箇条書き（順序なしリスト）
* アイテム A
* アイテム B
  * ネストされたアイテム B-1
  * ネストされたアイテム B-2
* アイテム C

### 番号付きリスト（順序ありリスト）
1. 第一のステップ
2. 第二のステップ
   1. サブステップ 2-1
   2. サブステップ 2-2
3. 第三のステップ

## 3. リンクと画像

テキスト内に[リンク](https://example.com)を埋め込むことができます。

画像は以下のように表示されます。
![プレースホルダー画像](https://placehold.jp/150x150.png "画像タイトル")

## 4. 引用（Blockquote）

> これは引用ブロックです。
> 複数行にわたって記述することができます。
>
>> さらにネストして引用することも可能です。

## 5. コード表現

文章中に \`const message = "Hello";\` のようなインラインコードを含めることができます。

複数行のコードブロックは以下の通りです。

\`\`\`javascript
// JavaScriptのコードブロック例
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}
greet("World");`;

export const Default: Story = {
  args: {
    content: sampleMarkdown,
    variant: 'default',
  },
};

export const LightOnDark: Story = {
  args: {
    content: sampleMarkdown,
    variant: 'light-on-dark',
  },
  decorators: [
    Story => (
      <div className='rounded-lg bg-linear-to-r from-teal-400 to-teal-500 p-4 text-white'>
        <Story />
      </div>
    ),
  ],
};

export const PlainText: Story = {
  args: {
    content: '既存のプレーンテキストデータも正常に表示されます。改行なしのシンプルなテキスト。',
    variant: 'default',
  },
};
