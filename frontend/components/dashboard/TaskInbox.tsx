"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TASKS = [
  { title: "PHYS-1250 Lab Report — Friction",          project: "School",     status: "progress", priority: "high" },
  { title: "Finish Ascent compliance page component",  project: "Ascent",     status: "progress", priority: "high" },
  { title: "ReachAI: fix WebSocket campaign runner",   project: "ReachAI",    status: "progress", priority: "mid" },
  { title: "Strive: Spring Boot endpoint for weekly stats", project: "Strive", status: "todo",    priority: "mid" },
  { title: "ENGR-1182 assignment 4",                   project: "School",     status: "progress", priority: "mid" },
  { title: "Apply to Google SWE internship",           project: "Job Search", status: "todo",     priority: "high" },
  { title: "Calculus: L'Hôpital's rule practice set",  project: "School",     status: "todo",     priority: "mid" },
  { title: "Set up Prometheus alerts on Raspberry Pi", project: "DevOps",     status: "todo",     priority: "low" },
  { title: "ReachAI: MongoDB change stream typing fix",project: "ReachAI",    status: "progress", priority: "mid" },
  { title: "Review Ascent rank system spec",           project: "Ascent",     status: "todo",     priority: "low" },
].sort((a, b) => ({ high: 0, mid: 1, low: 2 }[a.priority]! - ({ high: 0, mid: 1, low: 2 }[b.priority]!)));

const STATUS_COLORS: Record<string, string> = {
  progress: "rgba(91,141,217,0.8)",
  todo:     "rgba(200,200,210,0.4)",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "rgba(217,107,107,0.8)",
  mid:  "var(--text-secondary)",
  low:  "var(--text-secondary)",
};

export default function TaskInbox() {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <div
      className="rounded-[10px] border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-[18px] border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <span
          className="text-sm font-semibold tracking-[-0.01em]"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Inbox
        </span>
        <div className="flex gap-2">
          <button
            className="border rounded-md px-3 py-1.5 text-[10px] tracking-[0.04em] transition-colors"
            style={{
              background: "transparent",
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            View
          </button>
          <button
            className="border rounded-md px-3 py-1.5 text-[10px] tracking-[0.04em] transition-colors"
            style={{
              background: "transparent",
              borderColor: "var(--border-mid)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            + Add Task
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow style={{ borderColor: "var(--border)" }}>
            <TableHead className="w-7 pr-0" style={{ color: "var(--text-secondary)", fontSize: 10, letterSpacing: "0.07em" }} />
            <TableHead style={{ color: "var(--text-secondary)", fontSize: 10, letterSpacing: "0.07em" }}>Title</TableHead>
            <TableHead className="hidden sm:table-cell" style={{ color: "var(--text-secondary)", fontSize: 10, letterSpacing: "0.07em" }}>Project</TableHead>
            <TableHead className="hidden sm:table-cell" style={{ color: "var(--text-secondary)", fontSize: 10, letterSpacing: "0.07em" }}>Status</TableHead>
            <TableHead className="hidden md:table-cell" style={{ color: "var(--text-secondary)", fontSize: 10, letterSpacing: "0.07em" }}>Priority</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {TASKS.map((task, i) => (
            <TableRow
              key={i}
              className="group transition-colors"
              style={{ borderColor: "var(--border)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              {/* Checkbox */}
              <TableCell className="pr-0">
                <button
                  onClick={() => toggle(i)}
                  className="w-3.5 h-3.5 border rounded-[3px] flex items-center justify-center transition-colors"
                  style={{
                    borderColor: checked.has(i) ? "rgba(200,200,210,0.35)" : "var(--border-mid)",
                    background:  checked.has(i) ? "rgba(200,200,210,0.2)" : "transparent",
                  }}
                >
                  {checked.has(i) && (
                    <span style={{ fontSize: 8, color: "var(--text-primary)", lineHeight: 1 }}>✓</span>
                  )}
                </button>
              </TableCell>

              {/* Title */}
              <TableCell
                className="max-w-[380px] truncate text-[12px] tracking-[0.01em]"
                style={{ color: "var(--text-primary)" }}
              >
                {task.title}
              </TableCell>

              {/* Project */}
              <TableCell className="hidden sm:table-cell text-[11px]" style={{ color: "var(--text-secondary)" }}>
                {task.project}
              </TableCell>

              {/* Status */}
              <TableCell className="hidden sm:table-cell">
                <span className="flex items-center gap-1.5 text-[10px] tracking-[0.03em]" style={{ color: "var(--text-secondary)" }}>
                  <span className="w-1 h-1 rounded-full" style={{ background: STATUS_COLORS[task.status] }} />
                  {task.status === "progress" ? "In Progress" : "Todo"}
                </span>
              </TableCell>

              {/* Priority */}
              <TableCell
                className="hidden md:table-cell text-[10px] tracking-[0.04em]"
                style={{ color: PRIORITY_COLORS[task.priority] }}
              >
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </TableCell>

              {/* Actions */}
              <TableCell>
                <button
                  className="text-[14px] px-1 opacity-50 hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
                >
                  ···
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>

      {/* Footer */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-3 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="text-[11px] tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
          {checked.size} of {TASKS.length} row(s) selected
        </span>
        <div className="flex items-center gap-4">
          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            Rows per page
          </span>
          <select
            className="text-[11px] px-2 py-1 rounded-md border outline-none"
            style={{
              background: "var(--surface-2)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <option>10</option>
            <option>20</option>
            <option>50</option>
          </select>
          <div className="flex items-center gap-1.5">
            {["«", "‹", null, "›", "»"].map((btn, i) => (
              btn === null ? (
                <span key={i} className="text-[11px] px-1" style={{ color: "var(--text-secondary)" }}>
                  Page 1 of 2
                </span>
              ) : (
                <button
                  key={i}
                  className="w-6 h-6 flex items-center justify-center rounded-[5px] border text-[11px] transition-colors"
                  style={{
                    background: "transparent",
                    borderColor: "var(--border)",
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {btn}
                </button>
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
