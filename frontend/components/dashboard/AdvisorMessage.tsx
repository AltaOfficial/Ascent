"use client";

import React, { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";

// Renders the small subset of markdown the advisor uses: paragraphs,
// - / 1. lists, # headings, **bold** and `code`. Built as React nodes, never
// as HTML, so model output can't inject markup.

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}-${index++}`} className="font-semibold" style={{ color: "var(--text-primary)" }}>
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <code
          key={`${keyPrefix}-${index++}`}
          className="px-1 py-0.5 rounded text-[12px]"
          style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type ListItem = { marker: string; text: string };

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ul" | "ol"; items: ListItem[] }
  | { kind: "h"; text: string };

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  // A blank line ends a paragraph but not a list: models often put blank
  // lines between list items.
  let blankSinceLast = false;
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      blankSinceLast = true;
      continue;
    }
    const last = blocks[blocks.length - 1];
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    if (bullet) {
      if (last?.kind === "ul") last.items.push({ marker: "–", text: bullet[1] });
      else blocks.push({ kind: "ul", items: [{ marker: "–", text: bullet[1] }] });
    } else if (numbered) {
      const item = { marker: `${numbered[1]}.`, text: numbered[2] };
      if (last?.kind === "ol") last.items.push(item);
      else blocks.push({ kind: "ol", items: [item] });
    } else if (heading) {
      blocks.push({ kind: "h", text: heading[1] });
    } else if (last?.kind === "p" && !blankSinceLast) {
      last.lines.push(line);
    } else if ((last?.kind === "ul" || last?.kind === "ol") && !blankSinceLast && /^\s+/.test(rawLine)) {
      // Indented continuation of the previous list item
      const item = last.items[last.items.length - 1];
      item.text += ` ${line.trim()}`;
    } else {
      blocks.push({ kind: "p", lines: [line] });
    }
    blankSinceLast = false;
  }
  return blocks;
}

export function AdvisorMarkdown({
  content,
  trailing,
}: {
  content: string;
  /** Rendered inline at the very end of the text (e.g. a typing caret) */
  trailing?: React.ReactNode;
}) {
  const blocks = parseBlocks(content);
  const lastIndex = blocks.length - 1;
  return (
    <div className="flex flex-col gap-3">
      {blocks.length === 0 && trailing}
      {blocks.map((block, i) => {
        const tail = i === lastIndex ? trailing : null;
        if (block.kind === "h") {
          return (
            <div
              key={i}
              className="text-[11px] tracking-[0.08em] uppercase pt-1"
              style={{ color: "var(--text-mid)" }}
            >
              {renderInline(block.text, `h${i}`)}
              {tail}
            </div>
          );
        }
        if (block.kind === "ul" || block.kind === "ol") {
          const List = block.kind === "ul" ? "ul" : "ol";
          return (
            <List key={i} className="flex flex-col gap-2">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className="shrink-0 min-w-4 text-right" style={{ color: "var(--text-secondary)" }}>
                    {item.marker}
                  </span>
                  <span>
                    {renderInline(item.text, `l${i}-${j}`)}
                    {j === block.items.length - 1 && tail}
                  </span>
                </li>
              ))}
            </List>
          );
        }
        if (block.kind !== "p") return null;
        return (
          <p key={i}>
            {block.lines.map((line, j) => (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                {renderInline(line, `p${i}-${j}`)}
              </React.Fragment>
            ))}
            {tail}
          </p>
        );
      })}
    </div>
  );
}

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
          className="text-[13px] leading-[1.8] tracking-[0.005em]"
          style={{ color: "var(--text-primary)" }}
        >
          <AdvisorMarkdown
            content={content}
            trailing={
              streaming ? (
                <span
                  className="inline-block w-1.5 h-3.5 align-[-2px] ml-1"
                  style={{ background: "var(--text-mid)", animation: "blink 1s step-end infinite" }}
                  aria-hidden
                />
              ) : null
            }
          />
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
