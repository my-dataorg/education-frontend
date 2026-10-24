"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SectionAttendanceTab } from "@/components/section-attendance-tab";
import { SectionAssignmentsTab } from "@/components/section-assignments-tab";
import { SectionClassOverview } from "@/components/section-class-overview";
import { SectionRosterPanel } from "@/components/section-roster-panel";
import { SectionSubjectsPanel } from "@/components/section-subjects-panel";
import { SectionTimetablePanel } from "@/components/section-timetable-panel";
import { formatUserName } from "@/components/user-identity";
import type { Member } from "@/lib/api";
import type { SectionSubject } from "@/lib/api";
import { INSTITUTE_ADMIN_ROLES } from "@/lib/roles";
import { teacherUserId } from "@/lib/section-subject-teachers";

export type SectionWorkspaceTab =
  | "overview"
  | "roster"
  | "subjects"
  | "timetable"
  | "attendance"
  | "assignments"
  | "notes"
  | "progress"
  | "students";

type Tab = SectionWorkspaceTab;

type Overview = {
  sectionName: string;
  className: string;
  classTeacherUserId?: string | null;
  canEditDailyNotes?: boolean;
  studentCount: number;
  teacherCount: number;
  notesCount: number;
  averageCompletionPercent: number | null;
  assignments: {
    id: string;
    title: string;
    description: string;
    assignmentType: "assignment" | "test";
    completionPercent: number;
    submittedCount: number;
    enrolledStudents: number;
  }[];
  students?: Member[];
  teachers?: Member[];
};
export function SectionWorkspace({
  instituteId,
  sectionId,
  role,
  initialTab = "overview",
  overview: initialOverview,
  assignments,
  notes,
  onTabChange,
  fillTimetable = false,
  fillRoster = false,
  fillAttendance = false,
  fillSubjects = false,
}: {
  instituteId: string;
  sectionId: string;
  role: string;
  initialTab?: SectionWorkspaceTab;
  onTabChange?: (tab: SectionWorkspaceTab) => void;
  fillTimetable?: boolean;
  fillRoster?: boolean;
  fillAttendance?: boolean;
  fillSubjects?: boolean;
  overview: Overview;
  assignments: {
    id: string;
    title: string;
    description: string;
    assignmentType: "assignment" | "test";
    dueDate: string | null;
  }[];
  notes: { id: string; content: string; noteDate: string }[];
}) {
  const router = useRouter();
  const normalizedInitial: Tab =
    initialTab === "students" ? "attendance" : (initialTab as Tab);
  const [tab, setTab] = useState<Tab>(normalizedInitial);
  const [overview, setOverview] = useState(initialOverview);
  const [subjects, setSubjects] = useState<SectionSubject[]>([]);
  const [sectionAssignments, setSectionAssignments] = useState(assignments);
  const [sectionNotes, setSectionNotes] = useState(notes);
  const isTeacher = ["owner", "admin", "principal", "teacher", "lecturer", "professor"].includes(role);
  const canManage = INSTITUTE_ADMIN_ROLES.has(role);
  const canViewRosterSubjects = isTeacher || role === "student";
  const isStudent = role === "student";
  const canEditNotes = overview.canEditDailyNotes === true;
  const sectionLabel = `${overview.className || "Class"} · ${overview.sectionName}`;

  useEffect(() => {
    Promise.all([
      fetch(`/api/sections/${sectionId}/subjects`),
      fetch(`/api/institutes/${instituteId}/sections/${sectionId}/assignments`),
      fetch(`/api/institutes/${instituteId}/sections/${sectionId}/notes`),
    ])
      .then(async ([subjectsRes, assignmentsRes, notesRes]) => {
        if (subjectsRes.ok) setSubjects(await subjectsRes.json());
        if (assignmentsRes.ok) setSectionAssignments(await assignmentsRes.json());
        if (notesRes.ok) setSectionNotes(await notesRes.json());
      })
      .catch(() => undefined);
  }, [instituteId, sectionId]);

  const tabs: { id: Tab; label: string; shortLabel: string; show: boolean }[] = [
    { id: "overview", label: "Overview", shortLabel: "Overview", show: true },
    { id: "roster", label: "Teachers & students", shortLabel: "Roster", show: canViewRosterSubjects },
    { id: "subjects", label: "Subjects", shortLabel: "Subjects", show: canViewRosterSubjects },
    { id: "timetable", label: "Timetable", shortLabel: "Time", show: canManage },
    { id: "attendance", label: "Attendance", shortLabel: "Attend", show: isTeacher },
    { id: "assignments", label: "Assignments", shortLabel: "Tasks", show: true },
    { id: "notes", label: "Daily notes", shortLabel: "Notes", show: true },
    { id: "progress", label: "Progress", shortLabel: "Prog.", show: true },
  ];

  const [note, setNote] = useState("");

  async function refreshOverview() {
    const res = await fetch(`/api/sections/${sectionId}`, { credentials: "include" });
    if (res.ok) setOverview(await res.json());
    router.refresh();
  }

  async function createNote() {
    const response = await fetch(`/api/institutes/${instituteId}/sections/${sectionId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: note }),
    });
    if (response.ok) {
      const created = await response.json();
      setSectionNotes((current) => [created, ...current]);
    }
    setNote("");
    router.refresh();
  }

  const visibleTabs = tabs.filter((t) => t.show);
  const stretchTimetable = fillTimetable && tab === "timetable" && canManage;
  const stretchRoster = fillRoster && tab === "roster" && canViewRosterSubjects;
  const stretchAttendance = fillAttendance && tab === "attendance" && isTeacher;
  const stretchSubjects = fillSubjects && tab === "subjects" && canViewRosterSubjects;
  const stretchPanel = stretchTimetable || stretchRoster || stretchAttendance || stretchSubjects;

  return (
    <div
      className={
        stretchPanel ? "mt-0 flex min-h-0 flex-1 flex-col overflow-hidden md:mt-1" : "mt-0 md:mt-4"
      }
    >
      <div
        className="grid w-full shrink-0 border-b border-border md:flex md:flex-nowrap md:gap-0"
        style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
      >
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              onTabChange?.(t.id);
            }}
            className={`border-b-2 px-0.5 py-1 text-center text-[10px] font-medium leading-tight transition md:shrink-0 md:px-4 md:py-2 md:text-left md:text-sm ${
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="md:hidden">{t.shortLabel}</span>
            <span className="hidden md:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className={stretchPanel ? "mt-2 flex min-h-0 flex-1 flex-col overflow-hidden" : "mt-2 md:mt-6"}>
        {tab === "overview" && (
          <div className="space-y-5">
            {isTeacher && (
              <SectionClassOverview sectionId={sectionId} onOpenAttendance={() => setTab("attendance")} />
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Students" value={overview.studentCount} />
              <Stat label="Teachers" value={overview.teacherCount} />
              <Stat label="Avg completion" value={overview.averageCompletionPercent != null ? `${overview.averageCompletionPercent}%` : "—"} />
            </div>
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="font-semibold">Subjects</h2>
              {subjects.length ? (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {subjects.map((subject) => (
                    <li key={subject.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                      <span className="font-medium">{subject.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {subject.teachers.length
                          ? `Teacher: ${subject.teachers.map((teacher) => teacherName(overview.teachers, teacherUserId(teacher))).join(", ")}`
                          : "No teacher assigned yet"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No subjects linked yet.</p>
              )}
            </section>
          </div>
        )}

        {tab === "roster" && canViewRosterSubjects && (
          <SectionRosterPanel
            instituteId={instituteId}
            sectionId={sectionId}
            sectionLabel={sectionLabel}
            canManage={canManage}
            classTeacherUserId={overview.classTeacherUserId}
            onRosterChanged={() => void refreshOverview()}
            fillHeight={stretchRoster}
          />
        )}

        {tab === "subjects" && canViewRosterSubjects && (
          <SectionSubjectsPanel
            instituteId={instituteId}
            sectionId={sectionId}
            sectionLabel={sectionLabel}
            canManage={canManage}
            fillHeight={stretchSubjects}
          />
        )}

        {tab === "timetable" && canManage && (
          <SectionTimetablePanel instituteId={instituteId} sectionId={sectionId} />
        )}

        {tab === "attendance" && isTeacher && (
          <SectionAttendanceTab sectionId={sectionId} fillHeight={stretchAttendance} />
        )}

        {tab === "assignments" && (
          <SectionAssignmentsTab sectionId={sectionId} isTeacher={isTeacher} />
        )}

        {tab === "notes" && (
          <div>
            <ul className="space-y-2">
              {sectionNotes.map((n) => (
                <li key={n.id} className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
                  <p className="text-xs text-muted-foreground">{n.noteDate}</p>
                  {n.content}
                </li>
              ))}
            </ul>
            {canEditNotes && (
              <div className="mt-4 space-y-2">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Today's note for parents and staff"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  rows={3}
                />
                <button type="button" onClick={createNote} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
                  Post note
                </button>
              </div>
            )}
            {isTeacher && !canEditNotes && (
              <p className="mt-4 text-sm text-muted-foreground">
                Daily notes are read-only here. Only the class teacher can post updates for this class.
              </p>
            )}
          </div>
        )}

        {tab === "progress" && (
          <ul className="space-y-3">
            {overview.assignments.map((a) => (
              <li key={a.id}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{a.title}</span>
                  <span className="text-primary">{a.completionPercent}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${a.completionPercent}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.submittedCount}/{a.enrolledStudents} submitted
                </p>
              </li>
            ))}
            {!overview.assignments.length && (
              <p className="text-sm text-muted-foreground">No assignments yet.</p>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function teacherName(teachers: Member[] | undefined, userId: string) {
  const teacher = teachers?.find((item) => item.userId === userId);
  return teacher ? formatUserName(teacher) : userId;
}

