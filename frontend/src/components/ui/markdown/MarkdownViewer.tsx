import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { cn } from '@/lib/utils';
import './markdown-viewer.css';

export interface MarkdownViewerProps {
  content: string;
  className?: string;
  variant?: 'default' | 'light-on-dark';
}

export const MarkdownViewer = ({ content, className, variant = 'default' }: MarkdownViewerProps) => {
  return (
    <div className={cn('markdown-body', variant === 'light-on-dark' && '[&_a]:text-inherit', className)}>
      <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>{content}</ReactMarkdown>
    </div>
  );
};
