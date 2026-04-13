import type { HTMLAttributes, ImgHTMLAttributes } from "react";

/** Shared react-markdown `components` map (GFM + math pipelines). */
export const markdownComponents = {
  img: (raw: unknown) => {
    const { node, ...props } = raw as {
      node?: unknown;
    } & ImgHTMLAttributes<HTMLImageElement>;
    void node;
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary markdown image URLs; dimensions unknown
      <img
        {...props}
        alt={props.alt ?? ""}
        className="mb-4 mt-2 max-w-full rounded-md"
        loading="lazy"
      />
    );
  },
  p: (raw: unknown) => {
    const { node, ...props } = raw as {
      node?: unknown;
    } & HTMLAttributes<HTMLParagraphElement>;
    void node;
    return <p className="mb-2 last:mb-0" {...props} />;
  },
};
