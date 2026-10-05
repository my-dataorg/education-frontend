"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type Section = { id: string; name: string; className: string };
type Subject = { id: string; name: string; teachers: { userId: string }[]; linked?: boolean };
type Activity = { id: string; name: string };
type Teacher = { userId: string; displayName?: string; username?: string };
type TeacherProfile = { userId: string; sections: { sectionId: string; memberType: string | null }[] };
type Absence = { id: string; teacherId: string; absenceDate: string; substituteTeacherId: string | null; note: string };
type Slot = {
  id: string;
  label: string;
  kind: "instruction" | "activity" | "break";
  start: string;
  end: string;
  position: number;
  dayOfWeek: number | null;
  activityId: string | null;
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherSections, setTeacherSections] = useState<Record<string, string[]>>({});
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [coverageSectionId, setCoverageSectionId] = useState("");
  const [, setClock] = useState(0);
  const [day, setDay] = useState(1);
  const [detailSectionId, setDetailSectionId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [scheduleRes, sectionsRes, catalogRes, activitiesRes, membersRes, absencesRes] = await Promise.all([
      fetch(`/api/institutes/${instituteId}/schedule`),
      fetch(`/api/institutes/${instituteId}/sections`),
      fetch(`/api/institutes/${instituteId}/subjects`),
      fetch(`/api/institutes/${instituteId}/activities`),
      fetch(`/api/institutes/${instituteId}/members?group=teacher`),
      fetch(`/api/institutes/${instituteId}/teacher-absences?absence_date=${today}`),
    ]);
    if (!scheduleRes.ok || !sectionsRes.ok || !activitiesRes.ok || !membersRes.ok || !absencesRes.ok) throw new Error("Could not load schedule");
    const nextSchedule = await scheduleRes.json();
    const nextSections = await sectionsRes.json();
    const subjectRows = await Promise.all(nextSections.map(async (section: Section) => {
      const res = await fetch(`/api/sections/${section.id}/subjects`);
      return [section.id, res.ok ? await res.json() : []] as const;
    }));
    setSchedule(nextSchedule);
    setSections(nextSections);
    setSubjects(Object.fromEntries(subjectRows));
    if (catalogRes.ok) setCatalogSubjects(await catalogRes.json());
    setActivities(await activitiesRes.json());
    const nextTeachers = await membersRes.json();
    setTeachers(nextTeachers);
    setAbsences(await absencesRes.json());
    const profiles: (TeacherProfile | null)[] = await Promise.all(
      nextTeachers.map(async (teacher: Teacher) => {
        const response = await fetch(`/api/institutes/${instituteId}/members/${teacher.userId}/profile`);
        return response.ok ? await response.json() as TeacherProfile : null;
      })
    );
    setTeacherSections(Object.fromEntries(
      profiles.filter(Boolean).map((profile) => [
        profile!.userId,
        profile!.sections.filter((item) => item.memberType === "teacher").map((item) => item.sectionId),
      ])
    ));
    setDay(nextSchedule.settings.weekdays[0] ?? 1);
  }, [instituteId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load().catch((e) => setError(e instanceof Error ? e.message : "Could not load schedule"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const slots = useMemo(
    () => [...(schedule?.slots ?? [])].sort((a, b) => a.position - b.position),
    [schedule]
  );
  const orderedSections = useMemo(
    () => [...sections].sort(compareSections),
    [sections]
  );
  const detailSection = sections.find((section) => section.id === detailSectionId);

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
        { id: createId(), dayOfWeek: day, slotId, sectionId, subjectId, teacherId },
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

  async function save(nextSchedule = schedule) {
    if (!nextSchedule) return false;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/institutes/${instituteId}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSchedule),
      });
      if (res.status === 409) {
        setError("This schedule changed elsewhere. Reload it before saving again.");
        return false;
      }
      if (!res.ok) {
        setError((await res.json()).detail || "Could not save schedule");
        return false;
      }
      setSchedule(await res.json());
      setMessage("Schedule saved");
      return true;
    } catch {
      setError("Could not save schedule. Check your connection and try again.");
      return false;
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
        </div>
        <div className="mt-5 rounded-xl border border-border bg-background/70 p-4">
          <p className="text-sm font-semibold">Institute timetable settings</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
          <div className="mt-3 flex flex-wrap gap-2">
            {DAYS.map(([value, label]) => (
              <label key={value} className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={schedule.settings.weekdays.includes(Number(value))} onChange={(e) => updateSchedule((s) => ({ ...s, settings: { ...s.settings, weekdays: e.target.checked ? [...s.settings.weekdays, Number(value)].sort() : s.settings.weekdays.filter((item) => item !== Number(value)) } }))} />
                {label}
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            {message && <span className="text-xs text-primary">{message}</span>}
            <button type="button" onClick={() => void save()} disabled={saving} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {saving ? "Saving..." : "Save settings"}
            </button>
          </div>
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
          {orderedSections.map((section) => {
            const count = schedule.entries.filter((entry) => entry.sectionId === section.id).length;
            const current = getCurrentPeriod(schedule, section.id, catalogSubjects);
            const sectionTeacher = teachers.find((teacher) =>
              teacherSections[teacher.userId]?.includes(section.id)
            );
            const currentTeacherId = current?.entry.teacherId || sectionTeacher?.userId || "";
            const absence = absences.find((item) => item.teacherId === currentTeacherId);
            const currentTeacher = teachers.find((teacher) => teacher.userId === currentTeacherId);
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
                {current ? (
                  <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-2 text-xs">
                    <p className="font-medium">Now: {current.subjectName} · {current.slot.start}–{current.slot.end}</p>
                    <p className="mt-1 text-muted-foreground">
                      {absence?.substituteTeacherId
                        ? `Substitute: ${teacherName(teachers, absence.substituteTeacherId)}`
                        : `Teacher: ${teacherName(teachers, currentTeacherId)}`}
                    </p>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setCoverageSectionId(section.id);
                      }}
                      className="mt-2 rounded-md border border-primary/30 px-2 py-1 text-[11px] text-primary"
                    >
                      Manage coverage
                    </button>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">No active period right now</p>
                )}
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
          subjects={[...new Map(
            [...catalogSubjects, ...(subjects[detailSection.id] ?? [])].map((subject) => [subject.id, subject])
          ).values()].map((subject) => ({
            ...subject,
            linked: (subjects[detailSection.id] ?? []).some((item) => item.id === subject.id),
            teachers: subjects[detailSection.id]?.find((item) => item.id === subject.id)?.teachers ?? [],
          }))}
          activities={activities}
          updateSchedule={updateSchedule}
          save={save}
          saving={saving}
          message={message}
          error={error}
          onClose={() => setDetailSectionId("")}
        />
      )}
      {coverageSectionId && (
        <CoverageDialog
          instituteId={instituteId}
          section={sections.find((item) => item.id === coverageSectionId)!}
          teachers={teachers}
          teacherSections={teacherSections}
          absences={absences}
          onClose={() => setCoverageSectionId("")}
          onSaved={() => {
            setCoverageSectionId("");
            void load();
          }}
        />
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
            onClick={() => void save()}
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
        activities={activities}
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
  save: (nextSchedule?: Schedule) => Promise<boolean>;
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
      <SlotEditor schedule={schedule} subjects={subjects} activities={[]} sectionId={section.id} day={day} updateSchedule={updateSchedule} />
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted/40 p-1">
          {DAYS.filter(([value]) => schedule.settings.weekdays.includes(Number(value))).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setDay(Number(value))} className={`rounded-md px-3 py-1.5 text-xs font-medium ${day === Number(value) ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {message && <span className="text-xs text-primary">{message}</span>}
          <button type="button" onClick={() => void save()} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
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
  activities,
  updateSchedule,
  save,
  saving,
  message,
  error,
  onClose,
}: {
  section: Section;
  schedule: Schedule;
  slots: Slot[];
  subjects: Subject[];
  activities: Activity[];
  updateSchedule: (change: (current: Schedule) => Schedule) => void;
  save: (nextSchedule?: Schedule) => Promise<boolean>;
  saving: boolean;
  message: string;
  error: string;
  onClose: () => void;
}) {
  return (
    <Modal
      title={`Class / grade: ${section.className || "Not configured"} · Section: ${section.name}`}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-3">
          {message && <span className="text-xs text-primary">{message}</span>}
          <button type="button" onClick={() => void save()} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {saving ? "Saving..." : "Save schedule"}
          </button>
        </div>
      }
    >
      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {schedule.settings.schoolStart} – {schedule.settings.schoolEnd}
        </p>
      </div>
      <DayScheduleEditor
        schedule={schedule}
        section={section}
        subjects={subjects}
        activities={activities}
        slots={slots}
        updateSchedule={updateSchedule}
        save={save}
        saving={saving}
      />
    </Modal>
  );
}

function DayScheduleEditor({
  schedule,
  section,
  subjects,
  activities,
  slots,
  updateSchedule,
  save,
  saving,
}: {
  schedule: Schedule;
  section: Section;
  subjects: Subject[];
  activities: Activity[];
  slots: Slot[];
  updateSchedule: (change: (current: Schedule) => Schedule) => void;
  save: (nextSchedule?: Schedule) => Promise<boolean>;
  saving: boolean;
}) {
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [copySources, setCopySources] = useState<Record<number, number>>({});
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>(
    Object.fromEntries(DAYS.map(([value]) => [Number(value), Number(value) === 1]))
  );

  function copyDay(sourceDay: number, targetDay: number) {
    if (sourceDay === targetDay) return;
    if (!window.confirm("Replace this day's periods with the copied schedule?")) return;
    const sourceEntries = schedule.entries.filter(
      (entry) => entry.sectionId === section.id && entry.dayOfWeek === sourceDay
    );
    const sourceActivities = schedule.slots.filter(
      (slot) =>
        ["break", "activity"].includes(slot.kind) &&
        (slot.dayOfWeek === null || slot.dayOfWeek === sourceDay)
    );
    const nextActivities = sourceActivities.map((slot, index) => ({
      ...slot,
      id: createId(),
      dayOfWeek: targetDay,
      position: Math.max(-1, ...schedule.slots.map((item) => item.position)) + index + 1,
    }));
    updateSchedule((current) => ({
      ...current,
      slots: [
        ...current.slots.filter(
          (slot) =>
            !(
              ["break", "activity"].includes(slot.kind) &&
              slot.dayOfWeek === targetDay
            )
        ),
        ...nextActivities,
      ],
      entries: [
        ...current.entries.filter(
          (entry) => !(entry.sectionId === section.id && entry.dayOfWeek === targetDay)
        ),
        ...sourceEntries.map((entry) => ({
          ...entry,
          id: createId(),
          dayOfWeek: targetDay,
        })),
      ],
    }));
  }

  return (
    <div className="space-y-4">
      {DAYS.map(([value, label]) => {
        const currentDay = Number(value);
        const expanded = expandedDays[currentDay] ?? false;
        const entries = schedule.entries
          .filter((entry) => entry.sectionId === section.id && entry.dayOfWeek === currentDay)
          .sort((a, b) => (slots.find((slot) => slot.id === a.slotId)?.position ?? 0) - (slots.find((slot) => slot.id === b.slotId)?.position ?? 0));
        return (
          <section key={value} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpandedDays((current) => ({ ...current, [currentDay]: !expanded }))}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="font-semibold">{label}</span>
              <span className="text-xs text-muted-foreground">{expanded ? "Collapse" : "Expand"}</span>
            </button>
            {expanded && (
            <div className="mt-3">
            <div className="mt-3 space-y-2">
              {slots.filter((slot) => (
                (["break", "activity"].includes(slot.kind) &&
                  (slot.dayOfWeek === null || slot.dayOfWeek === currentDay)) ||
                entries.some((entry) => entry.slotId === slot.id)
              )).map((slot) => {
                const entry = entries.find((item) => item.slotId === slot.id);
                const subject = subjects.find((item) => item.id === entry?.subjectId);
                return (
                  <div key={slot.id} className={`grid gap-2 rounded-xl border px-3 py-2 sm:grid-cols-[130px_1fr_1fr_auto] sm:items-center ${slot.kind !== "instruction" ? "border-amber-200 bg-amber-50" : "border-border bg-muted/20"}`}>
                    <span className="text-sm font-medium">{slot.start} – {slot.end}</span>
                    <span className="text-sm">
                      {slot.kind === "break"
                        ? "Break"
                        : slot.kind === "activity"
                          ? activities.find((item) => item.id === slot.activityId)?.name || slot.label
                          : subject?.name || "Subject"}
                    </span>
                    {entry && <button type="button" onClick={() => updateSchedule((current) => ({ ...current, entries: current.entries.filter((item) => item.id !== entry.id) }))} className="text-xs text-destructive">
                      Remove
                    </button>}
                  </div>
                );
              })}
              {!entries.length &&
                !slots.some(
                  (slot) =>
                    ["break", "activity"].includes(slot.kind) &&
                    (slot.dayOfWeek === null || slot.dayOfWeek === currentDay)
                ) && <p className="text-sm text-muted-foreground">No periods scheduled.</p>}
            </div>
            {addingDay === currentDay ? (
              <SlotEditor
                schedule={schedule}
                subjects={subjects}
                activities={activities}
                sectionId={section.id}
                day={currentDay}
                updateSchedule={updateSchedule}
                showSlots={false}
                onSave={save}
                saving={saving}
                onCancel={() => setAddingDay(null)}
              />
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setAddingDay(currentDay)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary">
                  + Add period
                </button>
                <select
                  value={copySources[currentDay] ?? ""}
                  onChange={(e) => setCopySources((current) => ({ ...current, [currentDay]: Number(e.target.value) }))}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Copy from...</option>
                  {DAYS.filter(([source]) => Number(source) !== currentDay).map(([source, sourceLabel]) => (
                    <option key={source} value={source}>{sourceLabel}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!copySources[currentDay]}
                  onClick={() => {
                    const sourceDay = copySources[currentDay];
                    if (sourceDay) copyDay(sourceDay, currentDay);
                  }}
                  className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
                >
                  Copy
                </button>
              </div>
            )}
            </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function compareSections(a: Section, b: Section) {
  const gradeA = Number(a.className);
  const gradeB = Number(b.className);
  const numericA = Number.isFinite(gradeA) && a.className.trim() !== "";
  const numericB = Number.isFinite(gradeB) && b.className.trim() !== "";
  if (numericA && numericB && gradeA !== gradeB) return gradeA - gradeB;
  if (numericA !== numericB) return numericA ? -1 : 1;
  return `${a.className}-${a.name}`.localeCompare(`${b.className}-${b.name}`, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function teacherName(teachers: Teacher[], userId: string) {
  const teacher = teachers.find((item) => item.userId === userId);
  return teacher?.displayName || teacher?.username || "Not assigned";
}

function getCurrentPeriod(schedule: Schedule, sectionId: string, subjects: { id: string; name: string }[]) {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: schedule.settings.timezone,
    weekday: "long",
  }).format(now);
  const day = DAYS.find(([, label]) => label === weekday)?.[0];
  const currentTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: schedule.settings.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  if (!day) return null;
  const entry = schedule.entries.find((item) => {
    const slot = schedule.slots.find((candidate) => candidate.id === item.slotId);
    return item.sectionId === sectionId && item.dayOfWeek === Number(day) &&
      slot && slot.start <= currentTime && currentTime < slot.end;
  });
  if (!entry) return null;
  const slot = schedule.slots.find((item) => item.id === entry.slotId);
  if (!slot) return null;
  return {
    entry,
    slot,
    subjectName: subjects.find((item) => item.id === entry.subjectId)?.name || "Current subject",
  };
}

function CoverageDialog({
  instituteId,
  section,
  teachers,
  teacherSections,
  absences,
  onClose,
  onSaved,
}: {
  instituteId: string;
  section: Section;
  teachers: Teacher[];
  teacherSections: Record<string, string[]>;
  absences: Absence[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const sectionTeachers = teachers.filter((teacher) => teacherSections[teacher.userId]?.includes(section.id));
  const existing = absences.find((item) => sectionTeachers.some((teacher) => teacher.userId === item.teacherId));
  const [teacherId, setTeacherId] = useState(existing?.teacherId || sectionTeachers[0]?.userId || "");
  const [substituteTeacherId, setSubstituteTeacherId] = useState(existing?.substituteTeacherId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/institutes/${instituteId}/teacher-absences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, absenceDate: today, substituteTeacherId: substituteTeacherId || null }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Could not save coverage");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save coverage");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Teacher coverage · Class ${section.className}-${section.name}`} onClose={onClose}>
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="space-y-3">
        <label className="block text-sm">
          Absent teacher
          <select value={teacherId} onChange={(event) => setTeacherId(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2">
            {sectionTeachers.map((teacher) => <option key={teacher.userId} value={teacher.userId}>{teacherName(teachers, teacher.userId)}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          Substitute teacher
          <select value={substituteTeacherId} onChange={(event) => setSubstituteTeacherId(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2">
            <option value="">No substitute assigned</option>
            {teachers.filter((teacher) => teacher.userId !== teacherId).map((teacher) => <option key={teacher.userId} value={teacher.userId}>{teacherName(teachers, teacher.userId)}</option>)}
          </select>
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-sm">Cancel</button>
          <button type="button" onClick={() => void save()} disabled={!teacherId || saving} className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50">{saving ? "Saving..." : "Save coverage"}</button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, children, footer, onClose }: { title: string; children: ReactNode; footer?: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="flex flex-none items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xl text-muted-foreground hover:bg-muted" aria-label="Close dialog">×</button>
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="mt-4 flex-none border-t border-border pt-4">{footer}</div>}
      </div>
    </div>
  );
}

function SlotEditor({
  schedule,
  subjects,
  activities,
  sectionId,
  day,
  updateSchedule,
  showSlots = true,
  onSave,
  saving = false,
  onCancel,
}: {
  schedule: Schedule;
  subjects: Subject[];
  activities: Activity[];
  sectionId: string;
  day: number;
  updateSchedule: (change: (current: Schedule) => Schedule) => void;
  showSlots?: boolean;
  onSave?: (nextSchedule: Schedule) => Promise<boolean>;
  saving?: boolean;
  onCancel?: () => void;
}) {
  const [subjectId, setSubjectId] = useState("");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("08:45");
  const [validationError, setValidationError] = useState("");

  async function addSlot() {
    if (!subjectId || !start || !end) return;
    if (start >= end) {
      setValidationError("End time must be after start time.");
      return;
    }
    const activity = activities.find((item) => item.id === subjectId);
    const subject = subjects.find((item) => item.id === subjectId);
    if (!activity && !subject) return;
    const overlaps = schedule.slots.some((slot) => {
      if (slot.start >= end || start >= slot.end) return false;
      if (
        ["break", "activity"].includes(slot.kind) &&
        (slot.dayOfWeek === null || slot.dayOfWeek === day)
      ) return true;
      if (["break", "activity"].includes(slot.kind)) return false;
      return schedule.entries.some(
        (entry) =>
          entry.sectionId === sectionId &&
          entry.dayOfWeek === day &&
          entry.slotId === slot.id
      );
    });
    if (overlaps) {
      setValidationError("This time overlaps an existing period or break.");
      return;
    }
    const slotId = createId();
    const nextSchedule: Schedule = {
      ...schedule,
      slots: [
        ...schedule.slots,
        {
          id: slotId,
          label: activity?.name || subject?.name || "Period",
          kind: activity ? "activity" : "instruction",
          start,
          end,
          position: Math.max(-1, ...schedule.slots.map((slot) => slot.position)) + 1,
          dayOfWeek: activity ? day : null,
          activityId: activity?.id ?? null,
        },
      ],
      entries: activity
        ? schedule.entries
        : [
            ...schedule.entries,
            {
              id: createId(),
              dayOfWeek: day,
              slotId,
              sectionId,
              subjectId,
              teacherId: null,
            },
          ],
    };
    updateSchedule(() => nextSchedule);
    if (onSave && !(await onSave(nextSchedule))) return;
    setValidationError("");
    setSubjectId("");
    onCancel?.();
  }

  return (
    <section className="mt-3 rounded-xl border border-border bg-muted/20 p-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1.5fr_auto_auto] sm:items-end">
        <label className="text-xs font-semibold text-muted-foreground">
          Start time
          <input value={start} onChange={(e) => setStart(e.target.value)} type="time" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          End time
          <input value={end} onChange={(e) => setEnd(e.target.value)} type="time" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Subject
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">Select subject or activity</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
            {activities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={addSlot}
          disabled={!subjectId}
          className="rounded-lg border border-primary px-3 py-2 text-sm text-primary disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-3 py-2 text-sm">
          Cancel
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Choose an institute subject and set its period time.</p>
      {validationError && <p className="mt-2 text-xs text-destructive">{validationError}</p>}
      {showSlots && <div className="mt-3 space-y-2">
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
      </div>}
    </section>
  );
}
