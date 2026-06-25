"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

export function UserMessage({ text }: { text: string }) {
  return (
    <div className="aria-slide-up max-w-[74%] self-end rounded-[18px_18px_4px_18px] bg-linear-[135deg,#7C3AED,#6d28d9] px-[15px] py-2.5 text-sm leading-normal text-white shadow-[0_4px_16px_rgba(124,58,237,0.25)]">
      {text}
    </div>
  );
}

export function AssistantMessage({
  text,
  isStreamingPlaceholder,
}: {
  text: string;
  isStreamingPlaceholder?: boolean;
}) {
  if (!text && isStreamingPlaceholder) {
    return <span className="text-aria-text-muted">…</span>;
  }

  if (!text) return null;

  return (
    <div
      className={cn(
        "prose prose-invert prose-sm max-w-none text-sm leading-relaxed text-aria-text",
        "prose-p:my-1 prose-headings:my-2 prose-headings:font-heading prose-headings:text-aria-text",
        "prose-a:text-aria-primary-light prose-code:rounded prose-code:bg-aria-subtle prose-code:px-1 prose-code:py-0.5 prose-code:text-aria-primary-light",
        "prose-pre:overflow-x-auto prose-pre:rounded-lg prose-pre:border prose-pre:border-aria-border prose-pre:bg-[#0d0d12] prose-pre:p-3",
        "prose-ul:my-1 prose-ol:my-1 prose-li:my-0"
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
