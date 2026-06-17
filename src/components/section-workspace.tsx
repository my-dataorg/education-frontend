"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SectionWorkspace({
  instituteId,
  sectionId,
  role,
  assignments,
  notes,
}: {
  instituteId: string;
  sectionId: string;
  role: string;
  assignments: { id: string; title: string; description: string }[];
  notes: { id: string; content: string; noteDate: string }[];
}) {
  const router = useRouter();
  const isTeacher = ["owner", "admin", "teacher"].includes(role);
  const isStudent = role === "student";

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [submission, setSubmission] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState("");

  async function createAssignment() {
    await fetch(`/api/institutes/${instituteId}/sections/${sectionId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: "" }),
    });
    setTitle("");
    router.refresh();
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
    router.refresh();
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <div>
        <h2 className="font-medium">Assignments</h2>
        <ul className="mt-3 space-y-2">
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
            <button
              type="button"
              onClick={createAssignment}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
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
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
            <textarea
              value={submission}
              onChange={(e) => setSubmission(e.target.value)}
              placeholder="Your submission"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              rows={3}
            />
            <button
              type="button"
              onClick={submitWork}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Submit
            </button>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-medium">Daily notes</h2>
        <ul className="mt-3 space-y-2">
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
            <button
              type="button"
              onClick={createNote}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Post note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
