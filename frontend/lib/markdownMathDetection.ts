/**
 * Heuristic: treat content as needing KaTeX only when typical math delimiters appear.
 * Most exam copy is plain text / GFM — avoids loading remark-math + rehype-katex on every render.
 */
export function contentNeedsMathMarkdown(content: string): boolean {
  if (!content.trim()) return false;
  if (content.includes("$$")) return true;
  if (content.includes("\\(") || content.includes("\\[")) return true;
  // Inline $...$ (not $$); allow reasonable length to avoid pathological regex cost
  if (/\$(?!\s)[^$\n]{1,4000}\$/.test(content)) return true;
  return false;
}
