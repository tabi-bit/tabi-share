import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import MarkdownEditor from './MarkdownEditor';

const meta: Meta<typeof MarkdownEditor> = {
  title: 'UI/MarkdownEditor',
  component: MarkdownEditor,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const ControlledEditor = (args: { placeholder?: string; maxHeight?: string }) => {
  const [value, setValue] = useState('');
  return <MarkdownEditor value={value} onChange={setValue} {...args} />;
};

export const Default: Story = {
  render: () => (
    <div className='h-screen p-4'>
      <ControlledEditor placeholder='詳細情報（任意）' />
    </div>
  ),
};

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

export const WithInitialValue: Story = {
  render: () => {
    const [value, setValue] = useState(sampleMarkdown);
    return (
      <div className='h-screen p-4'>
        <MarkdownEditor value={value} onChange={setValue} />
      </div>
    );
  },
};
