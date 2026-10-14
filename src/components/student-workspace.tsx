"use client";

import { useEffect, useMemo, useState } from "react";
import type { Assignment, Attendance, Section } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EducationContextReporter } from "@/components/education-context-reporter";
import { StudentModuleTab } from "@/components/student-module-tab";

type Schedule = {
  settings: { weekdays: number[] };
  slots: Array<{ id: string; label: string; kind: string; start: string; end: string }>;
  entries: Array<{ dayOfWeek: number; slotId: string; sectionId: string; subjectId: string }>;
};

type SectionData = {
  studentCount: number;
  assignments: Array<Assignment & { submitted?: boolean }>;
};

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function StudentWorkspace({
  instituteId,
  instituteName,
  sections,
  studentId,
  studentName,
}: {
  instituteId: string;
  instituteName: string;
  sections: Section[];
  studentId: string;
  studentName: string;
}) {
  const [tab, setTab] = useState<"overview" | "schedule" | "assignments" | "attendance" | "results" | "notices" | "teachers" | "profile">("overview");
  const [selectedSectionId, setSelectedSectionId] = useState(sections[0]?.id || "");
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [sectionData, setSectionData] = useState<Record<string, SectionData>>({});
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [submission, setSubmission] = useState("");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/institutes/${instituteId}/schedule`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/subjects`, { credentials: "include" }),
      ...sections.map((section) =>
        fetch(`/api/sections/${section.id}`, { credentials: "include" })
      ),
    ])
      .then(async ([scheduleResponse, subjectsResponse, ...sectionResponses]) => {
        if (!scheduleResponse.ok || !subjectsResponse.ok) throw new Error("Could not load student workspace");
        const nextSchedule = (await scheduleResponse.json()) as Schedule;
        const nextSubjects = (await subjectsResponse.json()) as Array<{ id: string; name: string }>;
        const nextData = await Promise.all(
          sectionResponses.map(async (response) => (response.ok ? response.json() : null))
        );
        setSchedule(nextSchedule);
        setSubjects(Object.fromEntries(nextSubjects.map((subject) => [subject.id, subject.name])));
        setSectionData(
          Object.fromEntries(
            sections.map((section, index) => [section.id, nextData[index] || { studentCount: 0, assignments: [] }])
          )
        );
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load student workspace"));
  }, [instituteId, sections]);

  useEffect(() => {
    if (!selectedSectionId) return;
    fetch(`/api/sections/${selectedSectionId}/students/${studentId}/attendance?attendanceDate=${attendanceDate}`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : []))
      .then((rows: Attendance[]) => setAttendance(rows[0] || null))
      .catch(() => setAttendance(null));
  }, [attendanceDate, instituteId, selectedSectionId, studentId]);

  const today = new Date().getDay() || 7;
  const todaySchedule = useMemo(() => {
    if (!schedule || !selectedSectionId) return [];
    return schedule.entries
      .filter((entry) => entry.dayOfWeek === today && entry.sectionId === selectedSectionId)
      .map((entry) => {
        const slot = schedule.slots.find((item) => item.id === entry.slotId);
        return slot ? { ...entry, slot } : null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [schedule, selectedSectionId, today]);

  const allAssignments = Object.values(sectionData).flatMap((data) => data.assignments);

  return (
    <>
      <EducationContextReporter instituteName={instituteName} role="student" />
      <div className="flex min-h-[calc(100vh-3.5rem)] w-full bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:block">
        <div className="sticky top-0 p-4">
          <p className="font-serif text-base font-semibold">Education</p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">{instituteName}</p>
          <nav className="mt-6 space-y-1">
            {[
              ["overview", "Overview"],
              ["schedule", "Timetable"],
              ["assignments", "Assignments"],
              ["attendance", "Attendance"],
              ["results", "Results & report card"],
              ["notices", "Notices & calendar"],
              ["teachers", "Teachers"],
              ["profile", "Profile & documents"],
            ].map(([id, label]) => (
                <button
                key={id}
                type="button"
                onClick={() => setTab(id as typeof tab)}
                  aria-current={tab === id ? "page" : undefined}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left text-sm",
                  tab === id ? "bg-sidebar-active font-medium text-primary-foreground" : "text-muted-foreground hover:bg-muted/60"
                )}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">
        <div className="md:hidden">
          <label className="sr-only" htmlFor="student-tab">Student workspace section</label>
          <select id="student-tab" value={tab} onChange={(event) => setTab(event.target.value as typeof tab)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="overview">Overview</option>
            <option value="schedule">Timetable</option>
            <option value="assignments">Assignments</option>
            <option value="attendance">Attendance</option>
            <option value="results">Results & report card</option>
            <option value="notices">Notices & calendar</option>
            <option value="teachers">Teachers</option>
            <option value="profile">Profile & documents</option>
          </select>
        </div>
        <header className="mt-5">
          <p className="text-sm text-muted-foreground">Welcome back, {studentName}</p>
          <h1 className="mt-1 text-2xl font-semibold">{instituteName}</h1>
        </header>

        {error && <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {tab === "overview" && (
          <div className="mt-6 space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="My classes" value={sections.length} />
              <Stat label="Today’s periods" value={todaySchedule.length} />
              <Stat label="Assignments" value={allAssignments.length} />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <Card title="Today’s timetable">
                <ScheduleList entries={todaySchedule} subjects={subjects} />
              </Card>
              <Card title="Upcoming assignments">
                <AssignmentList assignments={allAssignments.slice(0, 5)} />
              </Card>
            </div>
          </div>
        )}

        {tab === "schedule" && (
          <Card title="Timetable">
            <div className="space-y-5">
              {schedule?.settings.weekdays.map((day) => {
                const entries = (schedule.entries || [])
                  .filter((entry) => entry.dayOfWeek === day && entry.sectionId === selectedSectionId)
                  .map((entry) => ({ ...entry, slot: schedule.slots.find((slot) => slot.id === entry.slotId) }))
                  .filter((entry): entry is typeof entry & { slot: NonNullable<typeof entry.slot> } => Boolean(entry.slot));
                return (
                  <div key={day}>
                    <h2 className="mb-2 text-sm font-semibold">{DAYS[day]}</h2>
                    <ScheduleList entries={entries} subjects={subjects} />
                  </div>
                );
              })}
              {!schedule && <p className="text-sm text-muted-foreground">Loading timetable…</p>}
            </div>
          </Card>
        )}

        {tab === "assignments" && (
          <Card title="Assignments and tests">
            <AssignmentList assignments={allAssignments} />
            {allAssignments.length > 0 && (
              <div className="mt-5 space-y-3">
                <select value={selectedAssignmentId} onChange={(event) => setSelectedAssignmentId(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option value="">Select an assignment to submit</option>
                  {allAssignments.map((assignment) => <option key={assignment.id} value={assignment.id}>{assignment.title}</option>)}
                </select>
                <textarea value={submission} onChange={(event) => setSubmission(event.target.value)} placeholder="Write your submission" rows={4} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                <button
                  type="button"
                  disabled={!selectedAssignmentId || !submission.trim()}
                  onClick={async () => {
                    setSubmissionMessage("");
                    const response = await fetch(`/api/assignments/${selectedAssignmentId}/submissions`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ content: submission }),
                    });
                    setSubmissionMessage(response.ok ? "Submission saved" : "Could not save submission");
                    if (response.ok) setSubmission("");
                  }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Submit work
                </button>
                {submissionMessage && <p className="text-xs text-muted-foreground">{submissionMessage}</p>}
              </div>
            )}
          </Card>
        )}

        {tab === "attendance" && (
          <Card title="Attendance">
            <div className="flex flex-wrap items-center gap-3">
              <select value={selectedSectionId} onChange={(event) => setSelectedSectionId(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                {sections.map((section) => <option key={section.id} value={section.id}>{section.className} · {section.name}</option>)}
              </select>
              <input type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <p className="mt-5 rounded-lg bg-muted/40 px-4 py-3 text-sm">
              {attendance ? `You were marked ${attendance.status} on ${attendance.attendanceDate}.` : "No attendance record has been marked for this date."}
            </p>
          </Card>
        )}

        {(["results", "notices", "teachers", "profile"] as const).includes(tab as "results" | "notices" | "teachers" | "profile") && (
          <StudentModuleTab module={tab as "results" | "notices" | "teachers" | "profile"} />
        )}
      </main>
      </div>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-4 shadow-sm"><h2 className="font-semibold">{title}</h2><div className="mt-3">{children}</div></section>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-border bg-card p-4 shadow-sm"><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>;
}

function ScheduleList({ entries, subjects }: { entries: Array<{ slot: { start: string; end: string; label: string }; subjectId: string }>; subjects: Record<string, string> }) {
  if (!entries.length) return <p className="text-sm text-muted-foreground">No periods scheduled.</p>;
  return <div className="space-y-2">{entries.map((entry, index) => <div key={`${entry.slot.start}-${index}`} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"><span className="font-medium">{formatTime(entry.slot.start)}–{formatTime(entry.slot.end)}</span><span className="text-muted-foreground">{subjects[entry.subjectId] || entry.slot.label}</span></div>)}</div>;
}

function AssignmentList({ assignments }: { assignments: Assignment[] }) {
  if (!assignments.length) return <p className="text-sm text-muted-foreground">No assignments yet.</p>;
  return <div className="space-y-2">{assignments.map((assignment) => <div key={assignment.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"><span><span className="font-medium">{assignment.title}</span><span className="ml-2 text-xs text-muted-foreground">{assignment.assignmentType === "test" ? "Test" : "Assignment"}</span></span><span className="text-xs text-muted-foreground">{assignment.dueDate || "No due date"}</span></div>)}</div>;
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}
