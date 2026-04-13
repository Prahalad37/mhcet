"use client";

import dynamic from "next/dynamic";
import { contentNeedsMathMarkdown } from "@/lib/markdownMathDetection";
import { MarkdownRendererLight } from "./MarkdownRendererLight";

const MarkdownMathBody = dynamic(() => import("./MarkdownRendererMath"), {
  ssr: false,
  loading: () => (
    <div
      className="min-h-[3rem] animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
      aria-busy
      aria-label="Loading formatted content"
    />
  ),
});

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({
  content,
  className = "prose prose-sm max-w-none dark:prose-invert",
}: MarkdownRendererProps) {
  if (!contentNeedsMathMarkdown(content)) {
    return <MarkdownRendererLight content={content} className={className} />;
  }
  return (
    <div className={className}>
      <MarkdownMathBody content={content} />
    </div>
  );
}
