"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { format, parseISO } from "date-fns";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type PaginationState,
} from "@tanstack/react-table";
import { apiFetch } from "@/lib/api";

const TEXT_FIELD_MAX_LENGTH = 200;
const PAGE_SIZE = 10;

interface Rule {
  id: string;
  name: string;
}

interface UrgeLog {
  id: string;
  ruleId: string;
  occurredAt: string;
  intensity: number;
  durationSeconds: number | null;
  trigger: string;
  whoWhere: string | null;
  copingNotes: string | null;
  nextTimeIdea: string | null;
  reflection: string | null;
}

type DurationUnit = "sec" | "min";

type EditableUrgeLog = UrgeLog & { durationUnit: DurationUnit };

function defaultUnitFor(durationSeconds: number | null): DurationUnit {
  if (durationSeconds === null) return "min";
  return durationSeconds < 60 ? "sec" : "min";
}

function toEditable(log: UrgeLog): EditableUrgeLog {
  return { ...log, durationUnit: defaultUnitFor(log.durationSeconds) };
}

function secondsToDisplayValue(
  seconds: number | null,
  unit: DurationUnit,
): string {
  if (seconds === null) return "";
  return unit === "sec" ? String(seconds) : String(Math.round(seconds / 60));
}

function displayValueToSeconds(
  value: string,
  unit: DurationUnit,
): number | null {
  if (value.trim() === "") return null;
  const parsed = Math.max(0, Math.round(Number(value)));
  if (Number.isNaN(parsed)) return null;
  return unit === "sec" ? parsed : parsed * 60;
}

const inputStyle: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border-mid)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-mono)",
};

const headerCellClass =
  "text-left pb-3.5 text-[10px] tracking-[0.06em] uppercase font-normal whitespace-nowrap";

const columnHelper = createColumnHelper<EditableUrgeLog>();

export default function UrgeLogTable() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [logs, setLogs] = useState<EditableUrgeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [pickedRuleId, setPickedRuleId] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedRules, fetchedLogs] = await Promise.all([
          apiFetch<Rule[]>("/compliance/rules"),
          apiFetch<UrgeLog[]>("/compliance/urge-logs"),
        ]);
        setRules(fetchedRules);
        setLogs(fetchedLogs.map(toEditable));
      } catch {
        // not logged in or network error — show empty state
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!pickedRuleId && rules.length > 0) {
      setPickedRuleId(rules[0].id);
    }
  }, [rules, pickedRuleId]);

  const ruleNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const rule of rules) map[rule.id] = rule.name;
    return map;
  }, [rules]);

  function updateLog(id: string, patch: Partial<EditableUrgeLog>) {
    setLogs((prev) =>
      prev.map((log) => (log.id === id ? { ...log, ...patch } : log)),
    );
  }

  async function persistPatch(id: string, patch: Record<string, unknown>) {
    try {
      await apiFetch(`/compliance/urge-logs/${id}/update`, {
        method: "POST",
        body: JSON.stringify(patch),
      });
    } catch {
      // best-effort; the optimistic local edit stays as-is
    }
  }

  async function addUrge() {
    if (!pickedRuleId) return;
    try {
      const created = await apiFetch<UrgeLog>("/compliance/urge-logs", {
        method: "POST",
        body: JSON.stringify({ ruleId: pickedRuleId, intensity: 5 }),
      });
      setLogs((prev) => [toEditable(created), ...prev]);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      setShowAddPicker(false);
    } catch {
      // leave the picker open so the user can retry
    }
  }

  function deleteLog(id: string) {
    setLogs((prev) => prev.filter((log) => log.id !== id));
    apiFetch(`/compliance/urge-logs/${id}/delete`, { method: "POST" }).catch(
      () => {},
    );
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor("occurredAt", {
        header: "Time",
        cell: (info) => (
          <span
            className="text-[11px] whitespace-nowrap tracking-[0.01em]"
            style={{ color: "var(--text-secondary)" }}
          >
            {format(parseISO(info.getValue()), "MMM d, h:mm a")}
          </span>
        ),
      }),
      columnHelper.accessor((row) => ruleNameById[row.ruleId] ?? "—", {
        id: "rule",
        header: "Rule",
        cell: (info) => (
          <span
            className="text-[12px] whitespace-nowrap"
            style={{ color: "var(--text-primary)" }}
          >
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("intensity", {
        header: "Strength*",
        cell: (info) => {
          const log = info.row.original;
          return (
            <input
              type="number"
              min={1}
              max={10}
              step={1}
              value={log.intensity}
              onChange={(e) =>
                updateLog(log.id, {
                  intensity: Math.min(
                    10,
                    Math.max(1, Number(e.target.value) || 1),
                  ),
                })
              }
              onBlur={(e) =>
                persistPatch(log.id, {
                  intensity: Math.min(
                    10,
                    Math.max(1, Number(e.target.value) || 1),
                  ),
                })
              }
              className="w-12 rounded-[5px] px-1.5 py-1 text-[12px] outline-none"
              style={inputStyle}
            />
          );
        },
      }),
      columnHelper.display({
        id: "duration",
        header: "Duration",
        cell: (info) => {
          const log = info.row.original;
          return (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                step={1}
                value={secondsToDisplayValue(
                  log.durationSeconds,
                  log.durationUnit,
                )}
                onChange={(e) =>
                  updateLog(log.id, {
                    durationSeconds: displayValueToSeconds(
                      e.target.value,
                      log.durationUnit,
                    ),
                  })
                }
                onBlur={(e) =>
                  persistPatch(log.id, {
                    durationSeconds: displayValueToSeconds(
                      e.target.value,
                      log.durationUnit,
                    ),
                  })
                }
                placeholder="—"
                className="w-14 rounded-[5px] px-1.5 py-1 text-[12px] outline-none"
                style={inputStyle}
              />
              <select
                value={log.durationUnit}
                onChange={(e) =>
                  updateLog(log.id, {
                    durationUnit: e.target.value as DurationUnit,
                  })
                }
                className="rounded-[5px] px-1 py-1 text-[11px] outline-none"
                style={inputStyle}
              >
                <option value="sec">sec</option>
                <option value="min">min</option>
              </select>
            </div>
          );
        },
      }),
      columnHelper.accessor("trigger", {
        header: "Trigger*",
        cell: (info) => {
          const log = info.row.original;
          return (
            <input
              type="text"
              maxLength={TEXT_FIELD_MAX_LENGTH}
              value={log.trigger}
              onChange={(e) => updateLog(log.id, { trigger: e.target.value })}
              onBlur={(e) => persistPatch(log.id, { trigger: e.target.value })}
              placeholder="required"
              className="w-40 rounded-[5px] px-2 py-1 text-[12px] outline-none"
              style={inputStyle}
            />
          );
        },
      }),
      columnHelper.accessor("whoWhere", {
        header: "Who / Where",
        cell: (info) => {
          const log = info.row.original;
          return (
            <input
              type="text"
              maxLength={TEXT_FIELD_MAX_LENGTH}
              value={log.whoWhere ?? ""}
              onChange={(e) => updateLog(log.id, { whoWhere: e.target.value })}
              onBlur={(e) =>
                persistPatch(log.id, { whoWhere: e.target.value })
              }
              placeholder="—"
              className="w-32 rounded-[5px] px-2 py-1 text-[12px] outline-none"
              style={inputStyle}
            />
          );
        },
      }),
      columnHelper.accessor("copingNotes", {
        header: "Coping",
        cell: (info) => {
          const log = info.row.original;
          return (
            <input
              type="text"
              maxLength={TEXT_FIELD_MAX_LENGTH}
              value={log.copingNotes ?? ""}
              onChange={(e) =>
                updateLog(log.id, { copingNotes: e.target.value })
              }
              onBlur={(e) =>
                persistPatch(log.id, { copingNotes: e.target.value })
              }
              placeholder="—"
              className="w-40 rounded-[5px] px-2 py-1 text-[12px] outline-none"
              style={inputStyle}
            />
          );
        },
      }),
      columnHelper.accessor("nextTimeIdea", {
        header: "Next time",
        cell: (info) => {
          const log = info.row.original;
          return (
            <input
              type="text"
              maxLength={TEXT_FIELD_MAX_LENGTH}
              value={log.nextTimeIdea ?? ""}
              onChange={(e) =>
                updateLog(log.id, { nextTimeIdea: e.target.value })
              }
              onBlur={(e) =>
                persistPatch(log.id, { nextTimeIdea: e.target.value })
              }
              placeholder="—"
              className="w-40 rounded-[5px] px-2 py-1 text-[12px] outline-none"
              style={inputStyle}
            />
          );
        },
      }),
      columnHelper.accessor("reflection", {
        header: "Reflection",
        cell: (info) => {
          const log = info.row.original;
          return (
            <input
              type="text"
              maxLength={TEXT_FIELD_MAX_LENGTH}
              value={log.reflection ?? ""}
              onChange={(e) =>
                updateLog(log.id, { reflection: e.target.value })
              }
              onBlur={(e) =>
                persistPatch(log.id, { reflection: e.target.value })
              }
              placeholder="—"
              className="w-40 rounded-[5px] px-2 py-1 text-[12px] outline-none"
              style={inputStyle}
            />
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => (
          <button
            type="button"
            onClick={() => deleteLog(info.row.original.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] cursor-pointer"
            style={{
              color: "var(--text-secondary)",
              background: "none",
              border: "none",
            }}
            title="Delete urge log"
          >
            ✕
          </button>
        ),
      }),
    ],
    [ruleNameById],
  );

  const table = useReactTable({
    data: logs,
    columns,
    getRowId: (row) => row.id,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (loading) {
    return (
      <div>
        <div
          className="text-[10px] tracking-widest uppercase mb-4"
          style={{ color: "var(--text-secondary)" }}
        >
          Urge Log
        </div>
        <div
          className="py-10 text-center text-[12px] tracking-[0.04em] rounded-md border"
          style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}
        >
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div
          className="text-[10px] tracking-widest uppercase"
          style={{ color: "var(--text-secondary)" }}
        >
          Urge Log
        </div>
        <div className="relative">
          <button
            type="button"
            disabled={rules.length === 0}
            onClick={() => setShowAddPicker((prev) => !prev)}
            className="text-[10px] tracking-[0.06em] uppercase px-2.5 py-1 rounded-sm transition-colors"
            style={{
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              background: "none",
              opacity: rules.length === 0 ? 0.35 : 1,
              cursor: rules.length === 0 ? "default" : "pointer",
            }}
          >
            + Add urge
          </button>
          {showAddPicker && (
            <div
              className="absolute right-0 top-full mt-1.5 z-10 flex items-center gap-1.5 p-2 rounded-md"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-mid)",
              }}
            >
              <select
                value={pickedRuleId}
                onChange={(e) => setPickedRuleId(e.target.value)}
                className="text-[11px] rounded-[5px] px-2 py-1.5 outline-none"
                style={inputStyle}
              >
                {rules.map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    {rule.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addUrge}
                className="px-2.5 py-1.5 rounded-[5px] text-[11px] tracking-[0.04em] cursor-pointer whitespace-nowrap"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--bg)",
                  border: "none",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddPicker(false)}
                className="px-1.5 py-1.5 text-[11px] cursor-pointer"
                style={{
                  color: "var(--text-secondary)",
                  background: "none",
                  border: "none",
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {logs.length === 0 ? (
        <div
          className="py-10 text-center text-[12px] tracking-[0.04em] rounded-md border"
          style={{
            color: "var(--text-secondary)",
            borderColor: "var(--border)",
          }}
        >
          {rules.length === 0
            ? "Add a compliance rule to start tracking urges."
            : "No urges logged yet."}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
            <table className="border-collapse min-w-260 w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={
                          header.id === "actions" ? "w-6" : headerCellClass
                        }
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t last:border-b group align-top"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="py-2 pr-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <span
              className="text-[10px] tracking-[0.03em]"
              style={{ color: "var(--text-secondary)" }}
            >
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {Math.max(1, table.getPageCount())} · {logs.length}{" "}
              {logs.length === 1 ? "entry" : "entries"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="text-[10px] tracking-[0.06em] uppercase px-2.5 py-1 rounded-sm transition-colors"
                style={{
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                  background: "none",
                  opacity: table.getCanPreviousPage() ? 1 : 0.35,
                  cursor: table.getCanPreviousPage() ? "pointer" : "default",
                }}
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="text-[10px] tracking-[0.06em] uppercase px-2.5 py-1 rounded-sm transition-colors"
                style={{
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                  background: "none",
                  opacity: table.getCanNextPage() ? 1 : 0.35,
                  cursor: table.getCanNextPage() ? "pointer" : "default",
                }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      <div
        className="text-[10px] tracking-[0.03em] mt-2.5"
        style={{ color: "var(--text-secondary)" }}
      >
        * required. Every field stays editable — fill in coping notes and next-time ideas once you&apos;ve had a chance to reflect.
      </div>
    </div>
  );
}
