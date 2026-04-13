"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "./markdownShared";

interface MarkdownRendererLightProps {
  content: string;
  className?: string;
}

/** GFM-only markdown (no KaTeX / remark-math). */
export function MarkdownRendererLight({
  content,
  className = "prose prose-sm max-w-none dark:prose-invert",
}: MarkdownRendererLightProps) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
