export type EventType = "task" | "exam" | "birthday" | "event";
export type Priority = "low" | "mid" | "high";

export type CalEvent = {
  id: string;
  type: EventType;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  notes: string;
  done: boolean;
  project?: string;
  priority?: Priority;
};

export type SelectedDay = { year: number; month: number; day: number };

export const TYPE_COLOR: Record<EventType, { text: string; bg: string; border: string }> = {
  task:     { text: "#5b8dd9", bg: "rgba(91,141,217,0.15)",   border: "rgba(91,141,217,0.5)" },
  exam:     { text: "#d96b6b", bg: "rgba(217,107,107,0.15)",  border: "rgba(217,107,107,0.5)" },
  birthday: { text: "#c47fd4", bg: "rgba(196,127,212,0.15)",  border: "rgba(196,127,212,0.5)" },
  event:    { text: "#6bbb8a", bg: "rgba(107,187,138,0.15)",  border: "rgba(107,187,138,0.5)" },
};

export function buildDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getTodayKey(): string {
  const today = new Date();
  return buildDateKey(today.getFullYear(), today.getMonth(), today.getDate());
}
