"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Member } from "@/lib/api";

type Section = { id: string; name: string; className: string };
type Subject = { id: string; name: string; teachers: { userId: string }[]; linked?: boolean };
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
  const [schedule, setSchedule] = useState<Schedule>({
    revision: 1,
    settings: { timezone: "Asia/Kolkata", schoolStart: "08:00", schoolEnd: "15:00", weekdays: [1, 2, 3, 4, 5, 6] },
    slots: [],
    entries: [],
  });
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Record<string, Subject[]>>({});
  const [catalogSubjects, setCatalogSubjects] = useState<{ id: string; name: string }[]>([]);
  const [teachers, setTeachers] = useState<Member[]>([]);
  const [day, setDay] = useState(1);
  const [detailSectionId, setDetailSectionId] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedClassName, setSelectedClassName] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [scheduleRes, sectionsRes, teachersRes, catalogRes] = await Promise.all([
      fetch(`/api/institutes/${instituteId}/schedule`),
      fetch(`/api/institutes/${instituteId}/sections`),
      fetch(`/api/institutes/${instituteId}/members?group=staff`),
      fetch(`/api/institutes/${instituteId}/subjects`),
    ]);
    if (!scheduleRes.ok || !sectionsRes.ok) throw new Error("Could not load schedule");
    const nextSchedule = await scheduleRes.json();
    const nextSections = await sectionsRes.json();
    const subjectRows = await Promise.all(nextSections.map(async (section: Section) => {
      const res = await fetch(`/api/sections/${section.id}/subjects`);
      return [section.id, res.ok ? await res.json() : []] as const;
    }));
    const configuredSubjects: { id: string; name: string }[] = catalogRes.ok ? await catalogRes.json() : [];
    const linkedSubjects = subjectRows.flatMap(([, rows]) => rows as Subject[]);
    const subjectCatalog = [...new Map(
      [...configuredSubjects, ...linkedSubjects].map((subject) => [subject.id, subject])
    ).values()];
    setSchedule(nextSchedule);
    setSections(nextSections);
    setSubjects(Object.fromEntries(subjectRows));
    if (teachersRes.ok) setTeachers(await teachersRes.json());
    setCatalogSubjects(subjectCatalog);
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
  const detailSection = sections.find((section) => section.id === detailSectionId);
  const selectedSection = sections.find((section) => section.id === selectedSectionId);
  const classOptions = [...new Set(sections.map((section) => section.className || "__none__"))];
  const manageSections = sections.filter(
    (section) => !selectedClassName || (selectedClassName === "__none__" ? !section.className : section.className === selectedClassName)
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
    try {
      const res = await fetch(`/api/institutes/${instituteId}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schedule),
      });
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
    } catch {
      setError("Could not save schedule. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Institute schedule</p>
            <h2 className="mt-1 text-xl font-semibold">Class schedules</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a class to view its periods, or manage an existing timetable.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setManageOpen(true);
              setSelectedClassName("");
              setSelectedSectionId("");
            }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Manage schedule
          </button>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
            <p className="text-lg font-semibold">{schedule.settings.schoolStart}</p>
            <p className="text-[11px] text-muted-foreground">School starts</p>
          </div>
          <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
            <p className="text-lg font-semibold">{schedule.settings.schoolEnd}</p>
            <p className="text-[11px] text-muted-foreground">School ends</p>
          </div>
          <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
            <p className="text-lg font-semibold">{sections.length}</p>
            <p className="text-[11px] text-muted-foreground">Classes / sections</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => {
            const count = schedule.entries.filter((entry) => entry.sectionId === section.id).length;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setDetailSectionId(section.id)}
                className="rounded-xl border border-border bg-background/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">Class / grade: {section.className || "Not configured"}</p>
                    <p className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      Section: {section.name}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] text-primary">{count} periods</span>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  {schedule.settings.schoolStart} – {schedule.settings.schoolEnd}
                </p>
              </button>
            );
          })}
        </div>
        {!sections.length && <p className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Create a class and section before setting a schedule.</p>}
      </section>
      {detailSection && (
        <SectionScheduleDialog
          section={detailSection}
          schedule={schedule}
          slots={slots}
          subjects={subjects[detailSection.id] ?? []}
          teachers={teachers}
          onClose={() => setDetailSectionId("")}
        />
      )}
      {manageOpen && (
        <Modal title="Manage schedule" onClose={() => setManageOpen(false)}>
          {!selectedSectionId ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Choose the class/grade and section you want to schedule.</p>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Class / grade
                <select value={selectedClassName} onChange={(e) => { setSelectedClassName(e.target.value); setSelectedSectionId(""); }} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option value="">Select class / grade</option>
                  {classOptions.map((value) => <option key={value} value={value}>{value === "__none__" ? "No grade" : value}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Section
                <select value={selectedSectionId} onChange={(e) => setSelectedSectionId(e.target.value)} disabled={!selectedClassName} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-50">
                  <option value="">Select section</option>
                  {manageSections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
                </select>
              </label>
            </div>
          ) : (
            <button type="button" onClick={() => setSelectedSectionId("")} className="mb-4 text-xs text-primary hover:underline">
              ← Change class / section
            </button>
          )}
          {selectedSection && (
            <div className="mt-4">
              <div className="mb-4 rounded-xl bg-muted/30 px-3 py-2 text-sm">
                Class / grade: <span className="font-semibold">{selectedSection.className || "Not configured"}</span>
                <span className="mx-2 text-muted-foreground">·</span>
                Section: <span className="font-semibold">{selectedSection.name}</span>
              </div>
              <ScheduleEditor
                schedule={schedule}
                section={selectedSection}
                subjects={catalogSubjects.map((subject) => ({
                  ...subject,
                  linked: (subjects[selectedSection.id] ?? []).some((item) => item.id === subject.id),
                  teachers: subjects[selectedSection.id]?.find((item) => item.id === subject.id)?.teachers ?? [],
                }))}
                slots={slots}
                day={day}
                setDay={setDay}
                updateSchedule={updateSchedule}
                dropSubject={dropSubject}
                moveEntry={moveEntry}
                removeEntry={removeEntry}
                save={save}
                saving={saving}
                message={message}
              />
            </div>
          )}
        </Modal>
      )}
      {schedule && false && (
      <>
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

      <SlotEditor
        schedule={schedule}
        subjects={[]}
        sectionId=""
        day={day}
        updateSchedule={updateSchedule}
      />

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
      </>
      )}
    </div>
  );
}

function ScheduleEditor({
  schedule,
  section,
  subjects,
  slots,
  day,
  setDay,
  updateSchedule,
  dropSubject,
  moveEntry,
  removeEntry,
  save,
  saving,
  message,
}: {
  schedule: Schedule;
  section: Section;
  subjects: Subject[];
  slots: Slot[];
  day: number;
  setDay: (day: number) => void;
  updateSchedule: (change: (current: Schedule) => Schedule) => void;
  dropSubject: (sectionId: string, slotId: string, subjectId: string) => void;
  moveEntry: (entryId: string, slotId: string, sectionId: string) => void;
  removeEntry: (entryId: string) => void;
  save: () => void;
  saving: boolean;
  message: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
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
      <div className="flex flex-wrap gap-2">
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
      <SlotEditor schedule={schedule} subjects={[]} sectionId="" day={day} updateSchedule={updateSchedule} />
      <div className="flex items-center justify-between gap-3">
        <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          {DAYS.filter(([value]) => schedule.settings.weekdays.includes(Number(value))).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <div className="flex items-center gap-3">
          {message && <span className="text-xs text-primary">{message}</span>}
          <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {saving ? "Saving..." : "Save schedule"}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[150px_repeat(var(--slot-count),minmax(135px,1fr))] gap-2" style={{ "--slot-count": slots.length } as CSSProperties}>
            <div className="rounded-xl bg-muted/30 p-3 text-xs font-semibold">{section.name}</div>
            {slots.map((slot) => {
              const entry = schedule.entries.find((item) => item.dayOfWeek === day && item.slotId === slot.id && item.sectionId === section.id);
              const subject = subjects.find((item) => item.id === entry?.subjectId);
              return (
                <div key={slot.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
                  const subjectData = e.dataTransfer.getData("subject");
                  if (subjectData && slot.kind === "instruction") {
                    const dropped = JSON.parse(subjectData);
                    dropSubject(section.id, slot.id, dropped.subjectId);
                  }
                  const entryId = e.dataTransfer.getData("entry");
                  if (entryId && slot.kind === "instruction") moveEntry(entryId, slot.id, section.id);
                }} className={`min-h-24 rounded-xl border p-3 ${slot.kind === "break" ? "border-amber-200 bg-amber-50" : "border-border bg-background"}`}>
                  <p className="text-[10px] text-muted-foreground">{slot.label} · {slot.start}–{slot.end}</p>
                  {slot.kind === "break" ? <p className="mt-4 text-center text-xs font-medium text-amber-800">Break</p> : subject && entry ? (
                    <div draggable onDragStart={(e) => e.dataTransfer.setData("entry", entry.id)} className="mt-3 flex cursor-grab items-center justify-between gap-2 rounded-lg bg-primary px-2 py-2 text-xs text-primary-foreground">
                      <span>{subject.name}</span>
                      <button type="button" onClick={() => removeEntry(entry.id)} aria-label={`Remove ${subject.name}`}>×</button>
                    </div>
                  ) : <p className="mt-4 text-center text-[11px] text-muted-foreground">Drop subject</p>}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {subjects.filter((subject) => subject.linked).map((subject) => (
              <span key={subject.id} draggable onDragStart={(e) => e.dataTransfer.setData("subject", JSON.stringify({ sectionId: section.id, subjectId: subject.id }))} className="cursor-grab rounded-full bg-primary/10 px-3 py-1.5 text-xs text-primary">
                Drag {subject.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionScheduleDialog({
  section,
  schedule,
  slots,
  subjects,
  teachers,
  onClose,
}: {
  section: Section;
  schedule: Schedule;
  slots: Slot[];
  subjects: Subject[];
  teachers: Member[];
  onClose: () => void;
}) {
  return (
          <Modal title={`Class / grade: ${section.className || "Not configured"} · Section: ${section.name}`} onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        School hours: {schedule.settings.schoolStart} – {schedule.settings.schoolEnd}
      </p>
      <div className="mt-4 space-y-4">
        {DAYS.filter(([value]) => schedule.settings.weekdays.includes(Number(value))).map(([value, label]) => {
          const entries = schedule.entries
            .filter((entry) => entry.sectionId === section.id && entry.dayOfWeek === Number(value))
            .sort((a, b) => (slots.find((slot) => slot.id === a.slotId)?.position ?? 0) - (slots.find((slot) => slot.id === b.slotId)?.position ?? 0));
          return (
            <div key={value}>
              <h4 className="text-sm font-semibold">{label}</h4>
              {entries.length ? (
                <div className="mt-2 space-y-2">
                  {entries.map((entry) => {
                    const slot = slots.find((item) => item.id === entry.slotId);
                    const subject = subjects.find((item) => item.id === entry.subjectId);
                    return (
                      <div key={entry.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2">
                        <span className="text-sm font-medium">{slot?.start} – {slot?.end}</span>
                        <span className="text-sm">{subject?.name || "Subject"}</span>
                        <span className="text-xs text-muted-foreground">{teacherName(teachers, entry.teacherId)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="mt-2 text-xs text-muted-foreground">No periods scheduled.</p>}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function teacherName(teachers: Member[], id: string | null) {
  if (!id) return "Teacher not assigned";
  const teacher = teachers.find((member) => member.userId === id);
  return teacher?.displayName || teacher?.username || teacher?.email || "Teacher";
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xl text-muted-foreground hover:bg-muted" aria-label="Close dialog">×</button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function SlotEditor({
  schedule,
  subjects,
  sectionId,
  day,
  updateSchedule,
}: {
  schedule: Schedule;
  subjects: Subject[];
  sectionId: string;
  day: number;
  updateSchedule: (change: (current: Schedule) => Schedule) => void;
}) {
  const [subjectId, setSubjectId] = useState("");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("08:45");

  function addSlot() {
    if (!subjectId || !start || !end) return;
    const isBreak = subjectId === "break";
    const subject = subjects.find((item) => item.id === subjectId);
    if (!isBreak && !subject?.linked) return;
    const slotId = crypto.randomUUID();
    updateSchedule((current) => ({
      ...current,
      slots: [
        ...current.slots,
        {
          id: slotId,
          label: isBreak ? "Break" : subject?.name || "Period",
          kind: isBreak ? "break" : "instruction",
          start,
          end,
          position: Math.max(-1, ...current.slots.map((slot) => slot.position)) + 1,
        },
      ],
      entries: isBreak
        ? current.entries
        : [
            ...current.entries,
            {
              id: crypto.randomUUID(),
              dayOfWeek: day,
              slotId,
              sectionId,
              subjectId,
              teacherId: subject?.teachers[0]?.userId ?? null,
            },
          ],
    }));
    setSubjectId("");
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-52 flex-1 text-xs font-semibold text-muted-foreground">
          Subject
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
            <option value="">Select subject or break</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}{subject.linked ? "" : " (link in Enrollment first)"}
              </option>
            ))}
            <option value="break">Break</option>
          </select>
        </label>
        <input value={start} onChange={(e) => setStart(e.target.value)} type="time" className="rounded-lg border border-border px-3 py-2 text-sm" />
        <input value={end} onChange={(e) => setEnd(e.target.value)} type="time" className="rounded-lg border border-border px-3 py-2 text-sm" />
        <button
          type="button"
          onClick={addSlot}
          disabled={!subjectId || (subjectId !== "break" && !subjects.some((subject) => subject.id === subjectId && subject.linked))}
          className="rounded-lg border border-primary px-3 py-2 text-sm text-primary disabled:opacity-50"
        >
          Add slot
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Link a subject to this section in Enrollment before scheduling it.
      </p>
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
