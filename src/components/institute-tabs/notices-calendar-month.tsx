"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";

export type CalendarDayEvent = {
  id: string;
  title: string;
  eventDate: string;
};

type Props = {
  events: CalendarDayEvent[];
  month: Date;
  onMonthChange: (next: Date) => void;
  onAddEvent: () => void;
};

function isHoliday(title: string) {
  return /holiday|duessehra|diwali|independence|republic/i.test(title);
}

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function NoticesCalendarMonth({ events, month, onMonthChange, onAddEvent }: Props) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const monthLabel = month.toLocaleString(undefined, { month: "long", year: "numeric" });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarDayEvent[]>();
    for (const event of events) {
      const key = event.eventDate.slice(0, 10);
      const list = map.get(key) || [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const weeks = useMemo(() => {
    const first = new Date(year, monthIndex, 1);
    const start = new Date(first);
    const offset = (first.getDay() + 6) % 7;
    start.setDate(first.getDate() - offset);
    const rows: Date[][] = [];
    let cursor = new Date(start);
    for (let w = 0; w < 6; w++) {
      const row: Date[] = [];
      for (let d = 0; d < 7; d++) {
        row.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      rows.push(row);
    }
    return rows;
  }, [monthIndex, year]);

  const todayKey = dateKey(new Date());

  function shiftMonth(delta: number) {
    onMonthChange(new Date(year, monthIndex + delta, 1));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => shiftMonth(-1)} className="rounded-lg border border-border p-1.5 hover:bg-muted/50" aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-semibold">{monthLabel}</p>
        <button type="button" onClick={() => shiftMonth(1)} className="rounded-lg border border-border p-1.5 hover:bg-muted/50" aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
        {["M", "T", "W", "T", "F", "S", "S"].map((label, i) => (
          <span key={`${label}-${i}`}>{label}</span>
        ))}
      </div>
      <div className="mt-1 flex-1 space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day) => {
              const inMonth = day.getMonth() === monthIndex;
              const key = dateKey(day);
              const dayEvents = eventsByDay.get(key) || [];
              const sunday = day.getDay() === 0;
              const isToday = key === todayKey;
              const holiday = dayEvents.some((e) => isHoliday(e.title));
              const hasEvent = dayEvents.length > 0 && !holiday;
              return (
                <div
                  key={key}
                  className={`min-h-[52px] rounded-md border px-0.5 py-1 text-[10px] ${
                    !inMonth ? "border-transparent text-muted-foreground/40" : "border-border/60"
                  } ${sunday && inMonth ? "bg-amber-50/80" : "bg-background"} ${
                    holiday && inMonth ? "bg-amber-100/90" : ""
                  } ${hasEvent && inMonth ? "bg-primary/5" : ""} ${isToday ? "ring-2 ring-primary" : ""}`}
                >
                  <span className={`block font-medium ${isToday ? "text-primary" : ""}`}>{day.getDate()}</span>
                  {inMonth && dayEvents.slice(0, 2).map((ev) => (
                    <span key={ev.id} className="mt-0.5 block truncate text-[9px] leading-tight text-muted-foreground">
                      {ev.title}
                    </span>
                  ))}
                  {isToday && inMonth && (
                    <span className="mt-0.5 block text-[9px] font-medium text-primary">Today</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-200" /> Holiday
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary/30" /> Event / exam
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAddEvent}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
        >
          + Add event
        </button>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="rounded-lg border border-border px-3 py-2 text-xs font-medium opacity-50"
        >
          Import holiday list
        </button>
      </div>
    </div>
  );
}
