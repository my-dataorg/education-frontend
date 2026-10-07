"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserIdentity } from "@/components/user-identity";
import type { Attendance, Member } from "@/lib/api";
import type { SectionSubject } from "@/lib/api";

type Tab = "overview" | "students" | "assignments" | "notes" | "progress";

type Overview = {
  sectionName: string;
  className: string;
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
type StudentInsight = Member & {
  performancePercent: number | null;
  attendance: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    marked: number;
    attendancePercent: number | null;
  };
};
type Performance = {
  overallPercent: number | null;
  academicYears: string[];
  records: { assignmentId: string; title: string; type: string; academicYear: string; date: string | null; percentage: number; submitted: boolean }[];
};
type AttendanceHistory = {
  summary: Record<string, number>;
  records: { date: string; status: string }[];
};

export function SectionWorkspace({
  instituteId,
  sectionId,
  role,
  overview: initialOverview,
  assignments,
  notes,
}: {
  instituteId: string;
  sectionId: string;
  role: string;
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
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState(initialOverview);
  const [subjects, setSubjects] = useState<SectionSubject[]>([]);
  const [sectionAssignments, setSectionAssignments] = useState(assignments);
  const [sectionNotes, setSectionNotes] = useState(notes);
  const [attendance, setAttendance] = useState<Record<string, Attendance["status"]>>({});
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [studentInsights, setStudentInsights] = useState<StudentInsight[]>([]);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceHistory | null>(null);
  const [dialogStudent, setDialogStudent] = useState<Member | null>(null);
  const isTeacher = ["owner", "admin", "principal", "teacher", "lecturer", "professor"].includes(role);
  const isStudent = role === "student";

  useEffect(() => {
    if (!isTeacher) return;
    fetch(`/api/sections/${sectionId}/student-insights`, { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : []))
      .then(setStudentInsights)
      .catch(() => setStudentInsights([]));
  }, [isTeacher, sectionId]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/sections/${sectionId}/subjects`),
      fetch(`/api/institutes/${instituteId}/sections/${sectionId}/assignments`),
      fetch(`/api/institutes/${instituteId}/sections/${sectionId}/notes`),
      fetch(`/api/institutes/${instituteId}/sections/${sectionId}/attendance?attendanceDate=${attendanceDate}`),
    ])
      .then(async ([subjectsRes, assignmentsRes, notesRes, attendanceRes]) => {
        if (subjectsRes.ok) setSubjects(await subjectsRes.json());
        if (assignmentsRes.ok) setSectionAssignments(await assignmentsRes.json());
        if (notesRes.ok) setSectionNotes(await notesRes.json());
        if (attendanceRes.ok) {
          const rows: Attendance[] = await attendanceRes.json();
          setAttendance(Object.fromEntries(rows.map((row) => [row.studentId, row.status])));
        }
      })
      .catch(() => undefined);
  }, [attendanceDate, instituteId, sectionId]);

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "overview", label: "Overview", show: true },
    { id: "students", label: isTeacher ? "Students & attendance" : "Students", show: isTeacher },
    { id: "assignments", label: "Assignments", show: true },
    { id: "notes", label: "Daily notes", show: true },
    { id: "progress", label: "Progress", show: true },
  ];

  const [title, setTitle] = useState("");
  const [assignmentType, setAssignmentType] = useState<"assignment" | "test">("assignment");
  const [note, setNote] = useState("");
  const [submission, setSubmission] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState("");

  async function refreshOverview() {
    const res = await fetch(`/api/sections/${sectionId}`, { credentials: "include" });
    if (res.ok) setOverview(await res.json());
    router.refresh();
  }

  async function createAssignment() {
    const response = await fetch(`/api/institutes/${instituteId}/sections/${sectionId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: "", assignmentType }),
    });
    if (response.ok) {
      const created = await response.json();
      setSectionAssignments((current) => [...current, created]);
    }
    setTitle("");
    setAssignmentType("assignment");
    refreshOverview();
  }

  async function saveAttendance() {
    await fetch(`/api/institutes/${instituteId}/sections/${sectionId}/attendance`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendanceDate,
        records: Object.entries(attendance).map(([studentId, status]) => ({ studentId, status })),
      }),
    });
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

  async function submitWork() {
    if (!selectedAssignment) return;
    await fetch(`/api/assignments/${selectedAssignment}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: submission }),
    });
    setSubmission("");
    refreshOverview();
  }

  async function openProfile(student: Member) {
    setDialogStudent(student);
    setProfile(null);
    const response = await fetch(
      `/api/institutes/${instituteId}/members/${student.userId}/profile`,
      { credentials: "include" }
    );
    if (response.ok) setProfile(await response.json());
  }

  async function openPerformance(student: Member) {
    setDialogStudent(student);
    setPerformance(null);
    const response = await fetch(
      `/api/sections/${sectionId}/students/${student.userId}/performance`,
      { credentials: "include" }
    );
    if (response.ok) setPerformance(await response.json());
  }

  async function openAttendanceHistory(student: Member) {
    setDialogStudent(student);
    setAttendanceHistory(null);
    const response = await fetch(
      `/api/sections/${sectionId}/students/${student.userId}/attendance`,
      { credentials: "include" }
    );
    if (response.ok) setAttendanceHistory(await response.json());
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-1 border-b border-border">
        {tabs.filter((t) => t.show).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "overview" && (
          <div className="space-y-5">
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
                          ? `Teacher: ${subject.teachers.map((teacher) => teacherName(overview.teachers, teacher.userId)).join(", ")}`
                          : "No teacher assigned"}
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

        {tab === "students" && isTeacher && (
          <div>
            <div className="grid grid-cols-[minmax(0,1fr)_110px_120px_110px] gap-2 rounded-lg bg-muted/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Student</span><span>Performance</span><span>Attendance</span><span>Today</span>
            </div>
            <ul className="mt-2 space-y-2">
            {(overview.students || []).map((s) => {
              const insight = studentInsights.find((item) => item.userId === s.userId);
              return (
              <li key={s.userId} className="grid grid-cols-[minmax(0,1fr)_110px_120px_110px] items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm">
                <button type="button" onClick={() => void openProfile(s)} className="min-w-0 text-left hover:text-primary">
                  <UserIdentity user={s} role={s.role || "student"} />
                </button>
                <button type="button" onClick={() => void openPerformance(s)} className="text-left text-xs font-medium text-primary">
                  {insight?.performancePercent == null ? "—" : `${insight.performancePercent}%`}
                  <span className="block text-[10px] text-muted-foreground">History</span>
                </button>
                <button type="button" onClick={() => void openAttendanceHistory(s)} className="text-left text-xs font-medium text-primary">
                  {insight?.attendance.attendancePercent == null ? "—" : `${insight.attendance.attendancePercent}%`}
                  <span className="block text-[10px] text-muted-foreground">{insight?.attendance.marked ?? 0} marked</span>
                </button>
                <select
                  value={attendance[s.userId] || "present"}
                  onChange={(event) => setAttendance((current) => ({ ...current, [s.userId]: event.target.value as Attendance["status"] }))}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="excused">Excused</option>
                </select>
              </li>
              );
            })}
            </ul>
            {!overview.students?.length && (
              <p className="text-sm text-muted-foreground">No students enrolled yet.</p>
            )}
            {overview.students?.length ? (
              <div className="mt-3 flex items-center gap-2">
                <input type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} className="rounded-md border border-border px-2 py-1 text-xs" />
                <button type="button" onClick={saveAttendance} className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">
                  Save attendance
                </button>
              </div>
            ) : null}
          </div>
        )}

        {tab === "assignments" && (
          <div>
            <ul className="space-y-2">
              {sectionAssignments.map((a) => (
                <li key={a.id} className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
                  <span className="font-medium">{a.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {a.assignmentType === "test" ? "Test" : "Assignment"}
                  </span>
                </li>
              ))}
            </ul>
            {isTeacher && (
              <div className="mt-4 flex gap-2">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New assignment title" className="flex-1 rounded-lg border border-border px-3 py-2 text-sm" />
                <select value={assignmentType} onChange={(e) => setAssignmentType(e.target.value as "assignment" | "test")} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <option value="assignment">Assignment</option>
                  <option value="test">Test</option>
                </select>
                <button type="button" onClick={createAssignment} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
                  Add
                </button>
              </div>
            )}
            {isStudent && assignments.length > 0 && (
              <div className="mt-4 space-y-2">
                <select
                  value={selectedAssignment}
                  onChange={(e) => setSelectedAssignment(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <option value="">Select assignment</option>
                  {sectionAssignments.map((a) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
                <textarea
                  value={submission}
                  onChange={(e) => setSubmission(e.target.value)}
                  placeholder="Your submission"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  rows={3}
                />
                <button type="button" onClick={submitWork} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
                  Submit
                </button>
              </div>
            )}
          </div>
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
            {isTeacher && (
              <div className="mt-4 space-y-2">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Today's note"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  rows={3}
                />
                <button type="button" onClick={createNote} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
                  Post note
                </button>
              </div>
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
      {dialogStudent && profile && (
        <InsightModal title="Student profile" onClose={() => setDialogStudent(null)}>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <Info label="Name" value={studentName(dialogStudent)} />
            <Info label="Username" value={value(profile["username"])} />
            <Info label="Email" value={value(profile["email"])} />
            <Info label="Date of birth" value={value(profile["dateOfBirth"])} />
            <Info label="Gender" value={value(profile["gender"])} />
            <Info label="Contact" value={value(profile["contactNumber"])} />
          </div>
        </InsightModal>
      )}
      {dialogStudent && performance && (
        <PerformanceModal performance={performance} onClose={() => setDialogStudent(null)} />
      )}
      {dialogStudent && attendanceHistory && (
        <AttendanceModal attendance={attendanceHistory} onClose={() => setDialogStudent(null)} />
      )}
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
  return teacher?.displayName || teacher?.username || userId;
}

function studentName(student: Member) {
  return student.displayName || student.username || `${student.firstName || ""} ${student.lastName || ""}`.trim() || "Student";
}

function value(item: unknown) {
  return item == null || item === "" ? "Not provided" : String(item);
}

function InsightModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="text-xl text-muted-foreground">×</button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function Info({ label, value: item }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{item}</p></div>;
}

function PerformanceModal({ performance, onClose }: { performance: Performance; onClose: () => void }) {
  const [year, setYear] = useState(performance.academicYears[0] || "");
  const records = performance.records.filter((record) => !year || record.academicYear === year);
  return (
    <InsightModal title={`Performance · ${performance.overallPercent ?? "—"}%`} onClose={onClose}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Assignment and test submission performance</p>
        <select value={year} onChange={(event) => setYear(event.target.value)} className="rounded-lg border border-border bg-background px-2 py-1 text-xs">
          <option value="">All years</option>
          {performance.academicYears.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div className="mt-4 space-y-2">
        {records.map((record) => (
          <div key={record.assignmentId} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <span><span className="font-medium">{record.title}</span><span className="ml-2 text-xs text-muted-foreground">{record.type} · {record.academicYear}</span></span>
            <span className="font-semibold text-primary">{record.percentage}%</span>
          </div>
        ))}
        {!records.length && <p className="text-sm text-muted-foreground">No performance records yet.</p>}
      </div>
    </InsightModal>
  );
}

function AttendanceModal({ attendance, onClose }: { attendance: AttendanceHistory; onClose: () => void }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const recordByDate = new Map(attendance.records.map((record) => [record.date, record.status]));
  const days = Array.from({ length: new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate() }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, "0")}`;
    return { date, status: recordByDate.get(date) || "unknown" };
  });
  return (
    <InsightModal title="Attendance calendar" onClose={onClose}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Present, absent, late, and unmarked days</p>
        <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-lg border border-border px-2 py-1 text-xs" />
      </div>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div key={day.date} title={`${day.date}: ${day.status}`} className={`rounded-lg p-2 text-center text-xs ${attendanceColor(day.status)}`}>
            {Number(day.date.slice(-2))}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {["present", "absent", "late", "unknown"].map((status) => <span key={status} className="flex items-center gap-1"><i className={`h-3 w-3 rounded ${attendanceColor(status)}`} />{status}</span>)}
      </div>
    </InsightModal>
  );
}

function attendanceColor(status: string) {
  if (status === "present") return "bg-emerald-100 text-emerald-800";
  if (status === "absent") return "bg-red-100 text-red-800";
  if (status === "late") return "bg-amber-100 text-amber-800";
  return "bg-muted text-muted-foreground";
}
