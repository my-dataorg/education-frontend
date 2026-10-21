"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Assignment, Attendance, InstitutePost, Member, Section } from "@/lib/api";
import { EducationNavSidebar } from "@/components/education-nav-sidebar";
import { EducationContextReporter } from "@/components/education-context-reporter";
import { ClassesBrowseTab } from "@/components/classes-browse-tab";
import { StudentModuleTab, type CalendarEvent, type Exam } from "@/components/student-module-tab";
import { StudentTimetableTab } from "@/components/student-timetable-tab";
import { getEducationNavItems, type EducationNavId } from "@/lib/education-nav";

export type StudentTab = EducationNavId;

type Schedule = {
  publishedAt?: string | null;
  settings: { weekdays: number[] };
  slots: Array<{ id: string; label: string; kind: string; start: string; end: string }>;
  entries: Array<{ dayOfWeek: number; slotId: string; sectionId: string; subjectId: string }>;
};

type SectionData = {
  studentCount: number;
  assignments: Array<Assignment & { submitted?: boolean }>;
  teachers?: Member[];
};

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function StudentWorkspace({
  instituteId,
  instituteName,
  sections,
  studentId,
  studentName,
  initialTab = "overview",
}: {
  instituteId: string;
  instituteName: string;
  sections: Section[];
  studentId: string;
  studentName: string;
  initialTab?: StudentTab;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<EducationNavId>(initialTab);
  const navItems = getEducationNavItems("student");
  const [selectedSectionId, setSelectedSectionId] = useState(sections[0]?.id || "");
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [sectionData, setSectionData] = useState<Record<string, SectionData>>({});
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [submission, setSubmission] = useState("");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [posts, setPosts] = useState<InstitutePost[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [teachers, setTeachers] = useState<Member[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  function changeTab(next: EducationNavId) {
    setTab(next);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", next);
    router.replace(`/institutes/${instituteId}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    Promise.all([
      fetch(`/api/institutes/${instituteId}/schedule`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/subjects`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/exams`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/posts`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/calendar-events`, { credentials: "include" }),
      ...sections.map((section) => fetch(`/api/sections/${section.id}`, { credentials: "include" })),
    ])
      .then(async ([scheduleResponse, subjectsResponse, examsResponse, postsResponse, eventsResponse, ...sectionResponses]) => {
        if (!scheduleResponse.ok || !subjectsResponse.ok) throw new Error("Could not load student workspace");
        const nextSchedule = (await scheduleResponse.json()) as Schedule;
        const nextSubjects = (await subjectsResponse.json()) as Array<{ id: string; name: string }>;
        const nextExams = examsResponse.ok ? ((await examsResponse.json()) as Exam[]) : [];
        const nextPosts = postsResponse.ok ? ((await postsResponse.json()) as InstitutePost[]) : [];
        const nextEvents = eventsResponse.ok ? ((await eventsResponse.json()) as CalendarEvent[]) : [];
        const nextData = await Promise.all(
          sectionResponses.map(async (response) => (response.ok ? response.json() : null))
        );
        setSchedule(nextSchedule);
        setSubjects(Object.fromEntries(nextSubjects.map((subject) => [subject.id, subject.name])));
        setExams(nextExams);
        setPosts(nextPosts);
        setEvents(nextEvents);
        const bySection = Object.fromEntries(
          sections.map((section, index) => [
            section.id,
            nextData[index] || { studentCount: 0, assignments: [], teachers: [] },
          ])
        );
        setSectionData(bySection);
        const teacherMap = new Map<string, Member>();
        for (const row of nextData) {
          if (row?.teachers) {
            for (const teacher of row.teachers as Member[]) {
              teacherMap.set(teacher.userId, teacher);
            }
          }
        }
        setTeachers([...teacherMap.values()]);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load student workspace"));
  }, [instituteId, sections]);

  useEffect(() => {
    if (!selectedSectionId) return;
    fetch(
      `/api/sections/${selectedSectionId}/students/${studentId}/attendance?attendanceDate=${attendanceDate}`,
      { credentials: "include" }
    )
      .then((response) => (response.ok ? response.json() : []))
      .then((rows: Attendance[]) => setAttendance(rows[0] || null))
      .catch(() => setAttendance(null));
  }, [attendanceDate, selectedSectionId, studentId]);

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
  const schedulePublished = Boolean(schedule?.publishedAt);

  return (
    <>
      <EducationContextReporter instituteName={instituteName} role="student" />
      <EducationNavSidebar items={navItems} activeTab={tab} onTabChange={changeTab}>
          <header className="mt-0 md:mt-0">
            <p className="text-sm text-muted-foreground">Welcome back, {studentName}</p>
            <h1 className="mt-1 text-2xl font-semibold">{instituteName}</h1>
          </header>

          {error && (
            <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          {tab === "classes" && (
            <ClassesBrowseTab
              instituteId={instituteId}
              sections={sections}
              workspaceRole="student"
            />
          )}

          {tab === "overview" && (
            <div className="mt-6 space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="My classes" value={sections.length} />
                <Stat label="Today’s periods" value={todaySchedule.length} />
                <Stat label="Assignments" value={allAssignments.length} />
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <Card title="Today’s timetable">
                  {!schedulePublished && (
                    <p className="mb-2 text-sm text-muted-foreground">The timetable has not been published yet.</p>
                  )}
                  <ScheduleList entries={todaySchedule} subjects={subjects} />
                </Card>
                <Card title="Upcoming assignments">
                  <AssignmentList assignments={allAssignments.slice(0, 5)} />
                </Card>
              </div>
            </div>
          )}

          {tab === "timetable" && (
            <StudentTimetableTab
              instituteId={instituteId}
              studentId={studentId}
              enrolledSections={sections}
            />
          )}

          {tab === "assignments" && (
            <Card title="Assignments and tests">
              <AssignmentList assignments={allAssignments} />
              {allAssignments.length > 0 && (
                <div className="mt-5 space-y-3">
                  <select
                    value={selectedAssignmentId}
                    onChange={(event) => setSelectedAssignmentId(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select an assignment to submit</option>
                    {allAssignments.map((assignment) => (
                      <option key={assignment.id} value={assignment.id}>{assignment.title}</option>
                    ))}
                  </select>
                  <textarea
                    value={submission}
                    onChange={(event) => setSubmission(event.target.value)}
                    placeholder="Write your submission"
                    rows={4}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={!selectedAssignmentId || !submission.trim()}
                    onClick={async () => {
                      setSubmissionMessage("");
                      const response = await fetch(`/api/assignments/${selectedAssignmentId}/submissions`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
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
                <select
                  value={selectedSectionId}
                  onChange={(event) => setSelectedSectionId(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>{section.className} · {section.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(event) => setAttendanceDate(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <p className="mt-5 rounded-lg bg-muted/40 px-4 py-3 text-sm">
                {attendance
                  ? `You were marked ${attendance.status} on ${attendance.attendanceDate}.`
                  : "No attendance record has been marked for this date."}
              </p>
            </Card>
          )}

          {tab === "fees" && (
            <Card title="Fees">
              <p className="text-sm text-muted-foreground">
                Fee balances and receipts will appear here when your school enables online fee viewing.
              </p>
            </Card>
          )}

          {(["exams", "calendar", "profile"] as const).includes(tab as "exams" | "calendar" | "profile") && (
            <StudentModuleTab
              module={
                tab === "exams" ? "results" : tab === "calendar" ? "notices" : "profile"
              }
              exams={exams}
              posts={posts}
              events={events}
              studentName={studentName}
              sections={sections}
              teachers={teachers}
            />
          )}
      </EducationNavSidebar>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ScheduleList({
  entries,
  subjects,
}: {
  entries: Array<{ slot: { start: string; end: string; label: string }; subjectId: string }>;
  subjects: Record<string, string>;
}) {
  if (!entries.length) return <p className="text-sm text-muted-foreground">No periods scheduled.</p>;
  return (
    <div className="space-y-2">
      {entries.map((entry, index) => (
        <div key={`${entry.slot.start}-${index}`} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
          <span className="font-medium">{formatTime(entry.slot.start)}–{formatTime(entry.slot.end)}</span>
          <span className="text-muted-foreground">{subjects[entry.subjectId] || entry.slot.label}</span>
        </div>
      ))}
    </div>
  );
}

function AssignmentList({ assignments }: { assignments: Assignment[] }) {
  if (!assignments.length) return <p className="text-sm text-muted-foreground">No assignments yet.</p>;
  return (
    <div className="space-y-2">
      {assignments.map((assignment) => (
        <div key={assignment.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
          <span>
            <span className="font-medium">{assignment.title}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {assignment.assignmentType === "test" ? "Test" : "Assignment"}
            </span>
          </span>
          <span className="text-xs text-muted-foreground">{assignment.dueDate || "No due date"}</span>
        </div>
      ))}
    </div>
  );
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}
