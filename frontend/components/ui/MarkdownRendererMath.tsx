"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { markdownComponents } from "./markdownShared";

interface MarkdownRendererMathBodyProps {
  content: string;
}

/**
 * GFM + math + KaTeX. Parent supplies `prose` wrapper — keeps one wrapper for light/heavy parity.
 */
export default function MarkdownRendererMath({ content }: MarkdownRendererMathBodyProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
}
