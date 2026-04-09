import type { HTMLAttributes, ImgHTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

interface MarkdownRendererProps {
  content: string;
  /** Override prose sizing (default: compact body text). */
  className?: string;
}

export function MarkdownRenderer({
  content,
  className = "prose prose-sm max-w-none dark:prose-invert",
}: MarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          img: (raw) => {
            const { node, ...props } = raw as {
              node?: unknown;
            } & ImgHTMLAttributes<HTMLImageElement>;
            void node;
            return (
              <img
                {...props}
                alt={props.alt ?? ""}
                className="mb-4 mt-2 max-w-full rounded-md"
                loading="lazy"
              />
            );
          },
          p: (raw) => {
            const { node, ...props } = raw as {
              node?: unknown;
            } & HTMLAttributes<HTMLParagraphElement>;
            void node;
            return <p className="mb-2 last:mb-0" {...props} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
