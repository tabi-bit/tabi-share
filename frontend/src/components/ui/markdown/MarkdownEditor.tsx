import type {} from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { cva } from 'class-variance-authority';
import {
  Bold,
  Image as ImageIcon,
  Indent,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Outdent,
  SquareSplitVertical,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import ImageResize from 'tiptap-extension-resize-image';
import { Markdown, type MarkdownStorage } from 'tiptap-markdown';
import { cn } from '@/lib/utils';

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
}

const getMarkdown = (storage: any): string => (storage.markdown as MarkdownStorage).getMarkdown();

const editorButtonVariants = cva('rounded p-1 transition-colors', {
  variants: {
    context: {
      bubble: 'text-neutral-400',
      toolbar: 'text-neutral-700',
    },
    state: {
      default: 'hover:bg-neutral-600 hover:text-white',
      active: 'bg-neutral-700 text-white',
      disabled: 'cursor-not-allowed text-neutral-300',
    },
  },
  defaultVariants: {
    context: 'toolbar',
    state: 'default',
  },
});

const MarkdownEditor = ({ value, onChange, id, placeholder, className }: MarkdownEditorProps) => {
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        linkOnPaste: true,
      }),
      Placeholder.configure({
        placeholder: placeholder ?? '',
      }),
      ImageResize.configure({ inline: false }),
      Markdown,
    ],
    content: value,
    onUpdate: ({ editor: e }) => {
      isInternalUpdate.current = true;
      onChange(getMarkdown(e.storage));
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (getMarkdown(editor.storage) !== value) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  const editorState = useEditorState({
    editor,
    selector: ctx => ({
      isBulletList: ctx.editor.isActive('bulletList'),
      isOrderedList: ctx.editor.isActive('orderedList'),
      isListItem: ctx.editor.isActive('listItem'),
    }),
  });

  const insertImage = () => {
    if (!editor) return;
    const url = window.prompt('画像のURLを入力してください。（現在は画像のアップロードには対応していません）');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    if (!editor) return;
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt('URL を入力');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className={cn('flex h-full flex-col', className)} id={id}>
      {editor && (
        <BubbleMenu editor={editor} options={{ placement: 'bottom' }}>
          <div className='flex items-center gap-0.5 rounded-lg bg-neutral-800 p-1 shadow-lg'>
            <button
              type='button'
              className={editorButtonVariants({
                context: 'bubble',
                state: editor.isActive('bold') ? 'active' : 'default',
              })}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title='太字'
            >
              <Bold className='h-4 w-4' />
            </button>
            <button
              type='button'
              className={editorButtonVariants({
                context: 'bubble',
                state: editor.isActive('italic') ? 'active' : 'default',
              })}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title='斜体'
            >
              <Italic className='h-4 w-4' />
            </button>
            <button
              type='button'
              className={editorButtonVariants({
                context: 'bubble',
                state: editor.isActive('link') ? 'active' : 'default',
              })}
              onClick={setLink}
              title='リンク'
            >
              <LinkIcon className='h-4 w-4' />
            </button>
          </div>
        </BubbleMenu>
      )}
      {editor && (
        <div className='flex items-center gap-0.5 rounded-t-md border border-input border-b-0 bg-muted px-2 py-1'>
          <button
            type='button'
            className={editorButtonVariants({
              context: 'toolbar',
              state: editorState?.isBulletList ? 'active' : 'default',
            })}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title='箇条書きリスト'
          >
            <List className='h-4 w-4' />
          </button>
          <button
            type='button'
            className={editorButtonVariants({
              context: 'toolbar',
              state: editorState?.isOrderedList ? 'active' : 'default',
            })}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title='番号付きリスト'
          >
            <ListOrdered className='h-4 w-4' />
          </button>
          <div className='mx-0.5 h-4 w-px bg-border' />
          <button
            type='button'
            className={editorButtonVariants({
              context: 'toolbar',
              state: !(editorState?.isListItem ?? false) ? 'disabled' : 'default',
            })}
            onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
            disabled={!(editorState?.isListItem ?? false)}
            title='インデント'
          >
            <Indent className='h-4 w-4' />
          </button>
          <button
            type='button'
            className={editorButtonVariants({
              context: 'toolbar',
              state: !(editorState?.isListItem ?? false) ? 'disabled' : 'default',
            })}
            onClick={() => editor.chain().focus().liftListItem('listItem').run()}
            disabled={!(editorState?.isListItem ?? false)}
            title='アウトデント'
          >
            <Outdent className='h-4 w-4' />
          </button>
          <div className='mx-0.5 h-4 w-px bg-border' />
          <button
            type='button'
            className={editorButtonVariants({ context: 'toolbar', state: 'default' })}
            onClick={insertImage}
            title='画像挿入'
          >
            <ImageIcon className='h-4 w-4' />
          </button>
          <button
            type='button'
            className={editorButtonVariants({ context: 'toolbar', state: 'default' })}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title='区切り線'
          >
            <SquareSplitVertical className='h-4 w-4' />
          </button>
        </div>
      )}
      <EditorContent
        editor={editor}
        className='tiptap-editor max-w-none overflow-auto rounded-b-md border border-input px-3 py-2 text-14px [&_.tiptap]:min-h-[4.5rem] [&_.tiptap]:outline-none [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]'
      />
    </div>
  );
};

export default MarkdownEditor;
