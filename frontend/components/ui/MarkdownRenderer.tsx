import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          img: ({node, ...props}) => (
            <img {...props} className="max-w-full rounded-md mt-2 mb-4" loading="lazy" />
          ),
          p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
