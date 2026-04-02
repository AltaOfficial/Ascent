"use client";

import { CalEvent, EventType, SelectedDay, TYPE_COLOR, buildDateKey } from "@/components/dashboard/calendarTypes";

export function CalendarDayList({
  selectedDay,
  getEventsForDate,
  onEdit,
  onToggleDone,
  onDelete,
}: {
  selectedDay: SelectedDay;
  getEventsForDate: (dateKey: string) => CalEvent[];
  onEdit: (type: EventType, event: CalEvent) => void;
  onToggleDone: (eventId: string) => void;
  onDelete: (eventId: string) => void;
}) {
  const dateKey = buildDateKey(selectedDay.year, selectedDay.month, selectedDay.day);
  const dayEvents = getEventsForDate(dateKey);

  if (dayEvents.length === 0) {
    return (
      <p className="text-[13px] py-2 tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
        Nothing scheduled.
      </p>
    );
  }

  return (
    <>
      {dayEvents.map((event) => (
        <div
          key={event.id}
          className="flex items-start gap-3 py-3 border-b last:border-b-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="w-11 shrink-0 text-[11px] tracking-[0.02em] pt-0.5" style={{ color: "var(--text-secondary)" }}>
            {event.time || "—"}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[14px] tracking-[0.01em]"
              style={{
                color: "var(--text-primary)",
                textDecoration: event.done ? "line-through" : "none",
                opacity: event.done ? 0.45 : 1,
              }}
            >
              {event.title}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className="text-[9px] tracking-[0.07em] uppercase px-1.75 py-0.5 rounded-[3px]"
                style={{ background: TYPE_COLOR[event.type].bg, color: TYPE_COLOR[event.type].text }}
              >
                {event.type}
              </span>
              {event.project && (
                <span className="text-[11px] tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
                  {event.project}
                </span>
              )}
            </div>
            {event.notes && (
              <div className="text-[11px] mt-1.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {event.notes}
              </div>
            )}
            <div className="flex gap-1.5 mt-2.5">
              <button
                onClick={() => onEdit(event.type, event)}
                className="text-[11px] tracking-[0.04em] px-2.5 py-1 rounded-[5px] border transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--text-mid)", fontFamily: "var(--font-mono)", background: "none" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-mid)"; }}
              >
                Edit
              </button>
              {event.type === "task" && (
                <button
                  onClick={() => onToggleDone(event.id)}
                  className="text-[11px] tracking-[0.04em] px-2.5 py-1 rounded-[5px] border transition-colors"
                  style={{
                    borderColor: event.done ? "var(--border)" : "rgba(107,187,138,0.3)",
                    color: event.done ? "var(--text-secondary)" : "rgba(107,187,138,0.85)",
                    fontFamily: "var(--font-mono)",
                    background: "none",
                  }}
                >
                  {event.done ? "Mark incomplete" : "Mark complete"}
                </button>
              )}
              <button
                onClick={() => onDelete(event.id)}
                className="text-[11px] tracking-[0.04em] px-2.5 py-1 rounded-[5px] border transition-colors"
                style={{ borderColor: "rgba(217,107,107,0.2)", color: "rgba(217,107,107,0.6)", fontFamily: "var(--font-mono)", background: "none" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(217,107,107,0.9)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(217,107,107,0.6)"; }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
