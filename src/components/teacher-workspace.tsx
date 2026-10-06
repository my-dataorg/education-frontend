"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionWorkspace } from "@/components/section-workspace";
import { TeacherShell, type TeacherTab } from "@/components/teacher-shell";
import type { Assignment, Member, Note, Section } from "@/lib/api";

type SectionOverview = {
  sectionId: string;
  sectionName: string;
  className: string;
  studentCount: number;
  teacherCount: number;
  notesCount: number;
  averageCompletionPercent: number | null;
  assignments: Array<Assignment & {
    submittedCount: number;
    enrolledStudents: number;
    completionPercent: number;
  }>;
  students?: Member[];
  teachers?: Member[];
};

type Schedule = {
  settings: { schoolStart: string; schoolEnd: string; weekdays: number[] };
  slots: Array<{ id: string; label: string; kind: string; start: string; end: string }>;
  entries: Array<{
    dayOfWeek: number;
    slotId: string;
    sectionId: string;
    subjectId: string;
    teacherId: string | null;
  }>;
};

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("Could not load teacher workspace");
  return response.json();
}

export function TeacherWorkspace({
  instituteId,
  instituteName,
  sections,
}: {
  instituteId: string;
  instituteName: string;
  sections: Section[];
}) {
  const [tab, setTab] = useState<TeacherTab>("overview");
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [allSections, setAllSections] = useState<Section[]>(sections);
  const [staff, setStaff] = useState<Member[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [overviews, setOverviews] = useState<Record<string, SectionOverview>>({});
  const [selectedSectionId, setSelectedSectionId] = useState(sections[0]?.id || "");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      loadJson<Schedule>(`/api/institutes/${instituteId}/schedule`),
      loadJson<Section[]>(`/api/institutes/${instituteId}/sections`),
      loadJson<Member[]>(`/api/institutes/${instituteId}/members?group=staff`),
      loadJson<{ id: string; name: string }[]>(`/api/institutes/${instituteId}/subjects`),
      ...sections.map((section) => loadJson<SectionOverview>(`/api/sections/${section.id}`)),
    ])
      .then(([nextSchedule, nextSections, nextStaff, nextSubjects, ...nextOverviews]) => {
        setSchedule(nextSchedule);
        setAllSections(nextSections);
        setStaff(nextStaff);
        setSubjects(nextSubjects);
        setOverviews(
          Object.fromEntries(
            sections.map((section, index) => [section.id, nextOverviews[index] as SectionOverview])
          )
        );
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load workspace"));
  }, [instituteId, sections]);

  const selectedSection = sections.find((section) => section.id === selectedSectionId);
  const selectedOverview = selectedSectionId ? overviews[selectedSectionId] : undefined;
  const totalStudents = Object.values(overviews).reduce((total, item) => total + item.studentCount, 0);
  const completionValues = Object.values(overviews)
    .map((item) => item.averageCompletionPercent)
    .filter((value): value is number => value != null);
  const averageCompletion = completionValues.length
    ? Math.round(completionValues.reduce((sum, value) => sum + value, 0) / completionValues.length)
    : null;
  const upcomingWork = Object.values(overviews)
    .flatMap((item) => item.assignments.map((assignment) => ({ ...assignment, sectionName: item.sectionName })))
    .filter((assignment) => assignment.dueDate)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
    .slice(0, 6);

  return (
    <TeacherShell instituteName={instituteName} activeTab={tab} onTabChange={setTab}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Teacher workspace</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold">{instituteName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your classes, schedule, and student progress</p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
        </div>
      </header>

      {error && <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {tab === "overview" && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Assigned classes" value={sections.length} />
            <Stat label="Students" value={totalStudents} />
            <Stat label="Average performance" value={averageCompletion == null ? "—" : `${averageCompletion}%`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <WorkList title="Upcoming tests and assignments" items={upcomingWork} />
            <ScheduleCard schedule={schedule} sections={allSections} subjects={subjects} staff={staff} />
          </div>
        </div>
      )}

      {tab === "schedule" && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold">School schedule</h2>
          <p className="mt-1 text-sm text-muted-foreground">Read-only timetable for the whole institute.</p>
          <ScheduleCard schedule={schedule} sections={allSections} subjects={subjects} staff={staff} expanded />
        </div>
      )}

      {tab === "classes" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <section>
            <h2 className="text-xl font-semibold">My classes</h2>
            <div className="mt-3 space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSelectedSectionId(section.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedSectionId === section.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <p className="font-medium">{section.className || "Class"} · {section.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {overviews[section.id]?.studentCount ?? "—"} students
                  </p>
                </button>
              ))}
              {!sections.length && <p className="text-sm text-muted-foreground">No classes assigned.</p>}
            </div>
          </section>
          {selectedSection && selectedOverview ? (
            <SectionWorkspace
              instituteId={instituteId}
              sectionId={selectedSection.id}
              role="teacher"
              overview={selectedOverview}
              assignments={selectedOverview.assignments}
              notes={[] as Note[]}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">
              Select a class to view its workspace.
            </div>
          )}
        </div>
      )}
    </TeacherShell>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function WorkList({ title, items }: { title: string; items: Array<Assignment & { sectionName: string }> }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <span><span className="font-medium">{item.title}</span><span className="ml-2 text-xs text-muted-foreground">{item.sectionName}</span></span>
            <span className="text-xs text-primary">{item.assignmentType === "test" ? "Test" : "Due"} {item.dueDate}</span>
          </li>
        ))}
        {!items.length && <li className="text-sm text-muted-foreground">No upcoming work.</li>}
      </ul>
    </section>
  );
}

function ScheduleCard({
  schedule,
  sections,
  subjects,
  staff,
  expanded = false,
}: {
  schedule: Schedule | null;
  sections: Section[];
  subjects: { id: string; name: string }[];
  staff: Member[];
  expanded?: boolean;
}) {
  const today = new Date().getDay() || 7;
  const days = expanded ? schedule?.settings.weekdays ?? [] : [today];
  const sectionNames = useMemo(() => new Map(sections.map((section) => [section.id, `${section.className}-${section.name}`])), [sections]);
  const subjectNames = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject.name])), [subjects]);
  const staffNames = useMemo(() => new Map(staff.map((person) => [person.userId, person.displayName || person.username || "Teacher"])), [staff]);
  if (!schedule) return <section className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Loading schedule…</section>;

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="font-semibold">{expanded ? "Full timetable" : "Today’s schedule"}</h2>
      <div className="mt-3 space-y-4">
        {days.map((day) => (
          <div key={day}>
            {expanded && <h3 className="mb-2 text-sm font-medium">{DAYS[day]}</h3>}
            <div className="space-y-1">
              {schedule.slots.map((slot) => {
                const entries = schedule.entries.filter((entry) => entry.dayOfWeek === day && entry.slotId === slot.id);
                if (!entries.length && slot.kind === "instruction") return null;
                return (
                  <div key={`${day}-${slot.id}`} className="flex gap-3 rounded-lg bg-muted/40 px-3 py-2 text-xs">
                    <span className="w-24 shrink-0 font-medium">{slot.start}–{slot.end}</span>
                    <span className="text-muted-foreground">
                      {slot.kind !== "instruction"
                        ? slot.label
                        : entries.map((entry) => `${sectionNames.get(entry.sectionId) || "Class"} · ${subjectNames.get(entry.subjectId) || "Subject"} · ${staffNames.get(entry.teacherId || "") || "Teacher"}`).join(" | ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

