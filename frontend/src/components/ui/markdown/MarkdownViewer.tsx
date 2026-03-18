import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { cn } from '@/lib/utils';
import './markdown-viewer.css';

const AnchorTag = ({ node, children, ...props }: any) => {
  try {
    new URL(props.href ?? '');
    props.target = '_blank';
    props.rel = 'noopener noreferrer';
  } catch (_: any) {
    // if failed to parse URL, ignore and render as normal anchor tag without target="_blank"
  }
  return <a {...props}>{children}</a>;
};

export interface MarkdownViewerProps {
  content: string;
  className?: string;
  variant?: 'default' | 'light-on-dark';
}

export const MarkdownViewer = ({ content, className, variant = 'default' }: MarkdownViewerProps) => {
  return (
    <div className={cn('markdown-body', variant === 'light-on-dark' && '[&_a]:text-inherit', className)}>
      <ReactMarkdown
        components={{
          a: AnchorTag,
        }}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
