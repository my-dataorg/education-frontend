"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserIdentity } from "@/components/user-identity";
import type { Member } from "@/lib/api";

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
  overview: initialOverview,
  assignments,
  notes,
}: {
  instituteId: string;
  sectionId: string;
  role: string;
  overview: Overview;
  assignments: { id: string; title: string; description: string }[];
  notes: { id: string; content: string; noteDate: string }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState(initialOverview);
  const isTeacher = ["owner", "admin", "principal", "teacher", "lecturer", "professor"].includes(role);
  const isStudent = role === "student";

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "overview", label: "Overview", show: true },
    { id: "students", label: "Students", show: isTeacher },
    { id: "assignments", label: "Assignments", show: true },
    { id: "notes", label: "Daily notes", show: true },
    { id: "progress", label: "Progress", show: true },
  ];

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [submission, setSubmission] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState("");

  async function refreshOverview() {
    const res = await fetch(`/api/sections/${sectionId}`, { credentials: "include" });
    if (res.ok) setOverview(await res.json());
    router.refresh();
  }

  async function createAssignment() {
    await fetch(`/api/institutes/${instituteId}/sections/${sectionId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: "" }),
    });
    setTitle("");
    refreshOverview();
  }

  async function createNote() {
    await fetch(`/api/institutes/${instituteId}/sections/${sectionId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: note }),
    });
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
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Students" value={overview.studentCount} />
            <Stat label="Teachers" value={overview.teacherCount} />
            <Stat label="Avg completion" value={overview.averageCompletionPercent != null ? `${overview.averageCompletionPercent}%` : "—"} />
          </div>
        )}

        {tab === "students" && isTeacher && (
          <ul className="space-y-2">
            {(overview.students || []).map((s) => (
              <li key={s.userId} className="rounded-lg border border-border bg-card px-4 py-2 text-sm">
                <UserIdentity user={s} role={s.role || "student"} />
              </li>
            ))}
            {!overview.students?.length && (
              <p className="text-sm text-muted-foreground">No students enrolled yet.</p>
            )}
          </ul>
        )}

        {tab === "assignments" && (
          <div>
            <ul className="space-y-2">
              {assignments.map((a) => (
                <li key={a.id} className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
                  {a.title}
                </li>
              ))}
            </ul>
            {isTeacher && (
              <div className="mt-4 flex gap-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="New assignment title"
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
                />
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
                  {assignments.map((a) => (
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
              {notes.map((n) => (
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
