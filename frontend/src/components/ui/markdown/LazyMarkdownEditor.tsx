import { lazy, Suspense } from 'react';
import type { MarkdownEditorProps } from './MarkdownEditor';

const MarkdownEditorLazy = lazy(() => import('./MarkdownEditor'));

export const LazyMarkdownEditor = (props: MarkdownEditorProps) => (
  <Suspense
    fallback={
      <div className='min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-muted-foreground'>
        読み込み中...
      </div>
    }
  >
    <MarkdownEditorLazy {...props} />
  </Suspense>
);
