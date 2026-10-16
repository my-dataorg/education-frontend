"use client";

import type { CalendarDayEvent } from "@/components/institute-tabs/notices-calendar-month";

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function eventsOnDay(events: CalendarDayEvent[], day: Date) {
  const key = dateKey(day);
  return events.filter((e) => e.eventDate.slice(0, 10) === key);
}

export function CalendarWeekView({
  events,
  anchor,
}: {
  events: CalendarDayEvent[];
  anchor: Date;
}) {
  const start = new Date(anchor);
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  return (
    <div className="grid grid-cols-7 gap-1 text-xs">
      {days.map((day) => {
        const dayEvents = eventsOnDay(events, day);
        return (
          <div key={day.toISOString()} className="min-h-24 rounded-lg border border-border bg-muted/10 p-2">
            <p className="font-semibold">
              {day.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
            </p>
            <ul className="mt-1 space-y-1">
              {dayEvents.map((ev) => (
                <li key={ev.id} className="truncate rounded bg-primary/10 px-1 py-0.5 text-[10px]">
                  {ev.title}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function CalendarDayView({
  events,
  day,
}: {
  events: CalendarDayEvent[];
  day: Date;
}) {
  const dayEvents = eventsOnDay(events, day);
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold">
        {day.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </h3>
      <ul className="mt-3 space-y-2 text-sm">
        {dayEvents.length === 0 && <li className="text-muted-foreground">No events on this day.</li>}
        {dayEvents.map((ev) => (
          <li key={ev.id} className="rounded-lg border border-border px-3 py-2">
            {ev.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CalendarYearView({
  events,
  year,
}: {
  events: CalendarDayEvent[];
  year: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 12 }, (_, month) => {
        const count = events.filter((e) => {
          const d = new Date(e.eventDate);
          return d.getFullYear() === year && d.getMonth() === month;
        }).length;
        const label = new Date(year, month, 1).toLocaleString(undefined, { month: "long" });
        return (
          <div key={month} className="rounded-lg border border-border bg-muted/10 p-3 text-sm">
            <p className="font-semibold">{label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{count} event{count === 1 ? "" : "s"}</p>
          </div>
        );
      })}
    </div>
  );
}
