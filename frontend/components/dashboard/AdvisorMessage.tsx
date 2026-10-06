"use client";

import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { Check, Copy, Sparkles } from "lucide-react";

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>
      {children}
    </strong>
  ),
  ul: ({ children }) => <ul className="list-disc pl-5 mb-3 last:mb-0 flex flex-col gap-1.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 last:mb-0 flex flex-col gap-1.5">{children}</ol>,
  li: ({ children }) => <li className="pl-1 marker:text-(--text-secondary)">{children}</li>,
  h1: ({ children }) => <h3 className="text-[11px] tracking-[0.08em] uppercase mb-2" style={{ color: "var(--text-mid)" }}>{children}</h3>,
  h2: ({ children }) => <h3 className="text-[11px] tracking-[0.08em] uppercase mb-2" style={{ color: "var(--text-mid)" }}>{children}</h3>,
  h3: ({ children }) => <h3 className="text-[11px] tracking-[0.08em] uppercase mb-2" style={{ color: "var(--text-mid)" }}>{children}</h3>,
  code: ({ children }) => (
    <code
      className="px-1 py-0.5 rounded text-[12px]"
      style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
    >
      {children}
    </code>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2">
      {children}
    </a>
  ),
};

export function AdvisorAvatar() {
  return (
    <div
      className="w-7 h-7 rounded-lg border flex items-center justify-center shrink-0"
      style={{ background: "var(--surface-2)", borderColor: "var(--border-mid)", color: "var(--text-mid)" }}
      aria-hidden
    >
      <Sparkles size={13} strokeWidth={1.75} />
    </div>
  );
}

export function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[80%] rounded-2xl rounded-br-md border px-4 py-2.5 text-[13px] leading-[1.7] whitespace-pre-wrap"
        style={{ background: "var(--surface-raised)", borderColor: "var(--border)", color: "var(--text-primary)" }}
      >
        {content}
      </div>
    </div>
  );
}

export function AssistantMessage({
  content,
  streaming,
}: {
  content: string;
  streaming?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-3 group/msg">
      <AdvisorAvatar />
      <div className="flex-1 min-w-0 pt-0.5">
        <div
          className={`text-[13px] leading-[1.8] tracking-[0.005em]${streaming ? " advisor-streaming" : ""}`}
          style={{ color: "var(--text-primary)" }}
        >
          <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
        </div>
        {!streaming && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(content).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
            className="mt-2 flex items-center gap-1.5 text-[10px] tracking-[0.04em] opacity-0 group-hover/msg:opacity-100 focus-visible:opacity-100 transition-opacity"
            style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}

export function ThinkingMessage() {
  return (
    <div className="flex gap-3 items-center">
      <AdvisorAvatar />
      <div className="flex gap-1 items-center h-5">
        {[0, 1, 2].map((dotIndex) => (
          <span
            key={dotIndex}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "var(--text-secondary)",
              animation: `pulse 1.2s infinite ${dotIndex * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
