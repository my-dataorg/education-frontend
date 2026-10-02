"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type Section = { id: string; name: string; className: string };
type Subject = { id: string; name: string; teachers: { userId: string }[] };
type Slot = {
  id: string;
  label: string;
  kind: "instruction" | "break";
  start: string;
  end: string;
  position: number;
};
type Entry = {
  id: string;
  dayOfWeek: number;
  slotId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string | null;
};
type Schedule = {
  revision: number;
  settings: {
    timezone: string;
    schoolStart: string;
    schoolEnd: string;
    weekdays: number[];
  };
  slots: Slot[];
  entries: Entry[];
};

const DAYS = [
  ["1", "Monday"],
  ["2", "Tuesday"],
  ["3", "Wednesday"],
  ["4", "Thursday"],
  ["5", "Friday"],
  ["6", "Saturday"],
  ["7", "Sunday"],
] as const;

export function ScheduleTab({ instituteId }: { instituteId: string }) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Record<string, Subject[]>>({});
  const [day, setDay] = useState(1);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [scheduleRes, sectionsRes] = await Promise.all([
      fetch(`/api/institutes/${instituteId}/schedule`),
      fetch(`/api/institutes/${instituteId}/sections`),
    ]);
    if (!scheduleRes.ok || !sectionsRes.ok) throw new Error("Could not load schedule");
    const nextSchedule = await scheduleRes.json();
    const nextSections = await sectionsRes.json();
    const subjectRows = await Promise.all(nextSections.map(async (section: Section) => {
      const res = await fetch(`/api/sections/${section.id}/subjects`);
      return [section.id, res.ok ? await res.json() : []] as const;
    }));
    setSchedule(nextSchedule);
    setSections(nextSections);
    setSubjects(Object.fromEntries(subjectRows));
    setDay(nextSchedule.settings.weekdays[0] ?? 1);
  }, [instituteId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load().catch((e) => setError(e instanceof Error ? e.message : "Could not load schedule"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const slots = useMemo(
    () => [...(schedule?.slots ?? [])].sort((a, b) => a.position - b.position),
    [schedule]
  );

  function updateSchedule(change: (current: Schedule) => Schedule) {
    setSchedule((current) => (current ? change(current) : current));
    setMessage("Unsaved changes");
  }

  function dropSubject(sectionId: string, slotId: string, subjectId: string) {
    const subject = (subjects[sectionId] ?? []).find((item) => item.id === subjectId);
    const teacherId = subject?.teachers[0]?.userId ?? null;
    updateSchedule((current) => ({
      ...current,
      entries: [
        ...current.entries.filter(
          (entry) => !(entry.dayOfWeek === day && entry.slotId === slotId && entry.sectionId === sectionId)
        ),
        { id: crypto.randomUUID(), dayOfWeek: day, slotId, sectionId, subjectId, teacherId },
      ],
    }));
  }

  function moveEntry(entryId: string, slotId: string, sectionId: string) {
    const currentEntry = schedule?.entries.find((entry) => entry.id === entryId);
    if (!currentEntry || currentEntry.sectionId !== sectionId) return;
    updateSchedule((current) => ({
      ...current,
      entries: [
        ...current.entries.filter(
          (entry) => entry.id !== entryId && !(
            entry.dayOfWeek === day && entry.slotId === slotId && entry.sectionId === sectionId
          )
        ),
        { ...currentEntry, dayOfWeek: day, slotId },
      ],
    }));
  }

  function removeEntry(entryId: string) {
    updateSchedule((current) => ({
      ...current,
      entries: current.entries.filter((entry) => entry.id !== entryId),
    }));
  }

  async function save() {
    if (!schedule) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/institutes/${instituteId}/schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(schedule),
    });
    setSaving(false);
    if (res.status === 409) {
      setError("This schedule changed elsewhere. Reload it before saving again.");
      return;
    }
    if (!res.ok) {
      setError((await res.json()).detail || "Could not save schedule");
      return;
    }
    setSchedule(await res.json());
    setMessage("Schedule saved");
  }

  if (!schedule) {
    return <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading schedule...</p>;
  }

  return (
    <div className="space-y-5">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Institute schedule</p>
            <h2 className="mt-1 text-xl font-semibold">Build the weekly timetable</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Set school hours, breaks, and drag subjects into each section&apos;s periods.
            </p>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save schedule"}
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            School starts
            <input value={schedule.settings.schoolStart} onChange={(e) => updateSchedule((s) => ({ ...s, settings: { ...s.settings, schoolStart: e.target.value } }))} type="time" className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            School ends
            <input value={schedule.settings.schoolEnd} onChange={(e) => updateSchedule((s) => ({ ...s, settings: { ...s.settings, schoolEnd: e.target.value } }))} type="time" className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Timezone
            <input value={schedule.settings.timezone} onChange={(e) => updateSchedule((s) => ({ ...s, settings: { ...s.settings, timezone: e.target.value } }))} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {DAYS.map(([value, label]) => (
            <label key={value} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={schedule.settings.weekdays.includes(Number(value))}
                onChange={(e) => updateSchedule((s) => ({
                  ...s,
                  settings: {
                    ...s.settings,
                    weekdays: e.target.checked
                      ? [...s.settings.weekdays, Number(value)].sort()
                      : s.settings.weekdays.filter((item) => item !== Number(value)),
                  },
                }))}
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      <SlotEditor schedule={schedule} updateSchedule={updateSchedule} />

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Weekly timetable</h3>
            <p className="text-xs text-muted-foreground">Drag a subject chip into a period, or move an existing entry.</p>
          </div>
          <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {DAYS.filter(([value]) => schedule.settings.weekdays.includes(Number(value))).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        {message && <p className="mt-2 text-xs text-primary">{message}</p>}
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[900px] space-y-2">
            {sections.map((section) => (
              <div key={section.id} className="grid grid-cols-[150px_repeat(var(--slot-count),minmax(135px,1fr))] gap-2" style={{ "--slot-count": slots.length } as CSSProperties}>
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="font-medium">{section.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{section.className || "No grade"}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(subjects[section.id] ?? []).map((subject) => (
                      <span key={subject.id} draggable onDragStart={(e) => e.dataTransfer.setData("subject", JSON.stringify({ sectionId: section.id, subjectId: subject.id }))} className="cursor-grab rounded-full bg-primary/10 px-2 py-1 text-[10px] text-primary">
                        {subject.name}
                      </span>
                    ))}
                  </div>
                </div>
                {slots.map((slot) => {
                  const entry = schedule.entries.find((item) => item.dayOfWeek === day && item.slotId === slot.id && item.sectionId === section.id);
                  const subject = (subjects[section.id] ?? []).find((item) => item.id === entry?.subjectId);
                  return (
                    <div
                      key={slot.id}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        const data = e.dataTransfer.getData("subject");
                        if (data) {
                          const dropped = JSON.parse(data);
                          if (dropped.sectionId === section.id && slot.kind === "instruction") dropSubject(section.id, slot.id, dropped.subjectId);
                        }
                        const entryId = e.dataTransfer.getData("entry");
                        if (entryId && slot.kind === "instruction") moveEntry(entryId, slot.id, section.id);
                      }}
                      className={`min-h-24 rounded-xl border p-3 ${slot.kind === "break" ? "border-amber-200 bg-amber-50" : "border-border bg-background"}`}
                    >
                      <p className="text-[10px] text-muted-foreground">{slot.label} · {slot.start}–{slot.end}</p>
                      {slot.kind === "break" ? <p className="mt-4 text-center text-xs font-medium text-amber-800">Break</p> : subject && entry ? (
                        <div draggable onDragStart={(e) => e.dataTransfer.setData("entry", entry.id)} className="mt-3 cursor-grab rounded-lg bg-primary px-2 py-2 text-xs text-primary-foreground">
                          <div className="flex items-center justify-between gap-2">
                            <span>{subject.name}</span>
                            <button type="button" onClick={() => removeEntry(entry.id)} className="text-primary-foreground/70 hover:text-primary-foreground" aria-label={`Remove ${subject.name}`}>
                              ×
                            </button>
                          </div>
                        </div>
                      ) : <p className="mt-4 text-center text-[11px] text-muted-foreground">Drop subject</p>}
                    </div>
                  );
                })}
              </div>
            ))}
            {!sections.length && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Create a class and section first.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function SlotEditor({ schedule, updateSchedule }: { schedule: Schedule; updateSchedule: (change: (current: Schedule) => Schedule) => void }) {
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<"instruction" | "break">("instruction");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("08:45");

  function addSlot() {
    if (!label || !start || !end) return;
    updateSchedule((current) => ({
      ...current,
      slots: [...current.slots, { id: crypto.randomUUID(), label, kind, start, end, position: current.slots.length }],
    }));
    setLabel("");
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 text-xs font-semibold text-muted-foreground">Period or break<input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Period 1 / Lunch" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" /></label>
        <select value={kind} onChange={(e) => setKind(e.target.value as "instruction" | "break")} className="rounded-lg border border-border px-3 py-2 text-sm"><option value="instruction">Period</option><option value="break">Break</option></select>
        <input value={start} onChange={(e) => setStart(e.target.value)} type="time" className="rounded-lg border border-border px-3 py-2 text-sm" />
        <input value={end} onChange={(e) => setEnd(e.target.value)} type="time" className="rounded-lg border border-border px-3 py-2 text-sm" />
        <button type="button" onClick={addSlot} className="rounded-lg border border-primary px-3 py-2 text-sm text-primary">Add slot</button>
      </div>
      <div className="mt-3 space-y-2">
        {schedule.slots.map((slot) => (
          <div key={slot.id} className="grid gap-2 rounded-xl border border-border bg-muted/20 p-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
            <input
              value={slot.label}
              onChange={(e) => updateSchedule((current) => ({
                ...current,
                slots: current.slots.map((item) => item.id === slot.id ? { ...item, label: e.target.value } : item),
              }))}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            />
            <select
              value={slot.kind}
              onChange={(e) => updateSchedule((current) => ({
                ...current,
                slots: current.slots.map((item) => item.id === slot.id ? { ...item, kind: e.target.value as Slot["kind"] } : item),
              }))}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="instruction">Period</option>
              <option value="break">Break</option>
            </select>
            <input
              type="time"
              value={slot.start}
              onChange={(e) => updateSchedule((current) => ({
                ...current,
                slots: current.slots.map((item) => item.id === slot.id ? { ...item, start: e.target.value } : item),
              }))}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            />
            <input
              type="time"
              value={slot.end}
              onChange={(e) => updateSchedule((current) => ({
                ...current,
                slots: current.slots.map((item) => item.id === slot.id ? { ...item, end: e.target.value } : item),
              }))}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => updateSchedule((current) => ({
                ...current,
                slots: current.slots.filter((item) => item.id !== slot.id),
                entries: current.entries.filter((entry) => entry.slotId !== slot.id),
              }))}
              className="rounded-lg px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
