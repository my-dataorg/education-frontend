"use client";

import { useCallback, useEffect, useState } from "react";
import { AssignmentWorkEditor } from "@/components/assignment-work-editor";
import { AssignmentWorkPlayer } from "@/components/assignment-work-player";

type Work = {
  id: string;
  title: string;
  publishState: string;
  dueAt?: string | null;
  submittedCount?: number;
  attemptStatus?: string | null;
  dueClosed?: boolean;
};

type SubmissionRow = {
  studentId: string;
  displayName?: string;
  attemptId?: string | null;
  status: string;
  score?: number | null;
  maxScore?: number | null;
};

const BUCKETS = [
  { id: "draft", label: "Draft" },
  { id: "scheduled", label: "Scheduled" },
  { id: "live", label: "Live" },
  { id: "closed", label: "Closed" },
] as const;

export function SectionAssignmentsTab({
  sectionId,
  isTeacher,
}: {
  sectionId: string;
  isTeacher: boolean;
}) {
  const [bucket, setBucket] = useState<string>("draft");
  const [works, setWorks] = useState<Work[]>([]);
  const [assigned, setAssigned] = useState<Work[]>([]);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [playId, setPlayId] = useState<{ id: string; title: string } | null>(null);
  const [gradeId, setGradeId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);

  const loadTeacher = useCallback((bucketOverride?: string) => {
    if (!isTeacher) return;
    const activeBucket = bucketOverride ?? bucket;
    fetch(`/api/sections/${sectionId}/assignment-works?bucket=${activeBucket}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not load assignments");
        return res.json() as Promise<Work[]>;
      })
      .then(setWorks)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [sectionId, bucket, isTeacher]);

  const loadStudent = useCallback(() => {
    if (isTeacher) return;
    fetch(`/api/sections/${sectionId}/assignment-works/assigned`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not load assignments");
        return res.json() as Promise<Work[]>;
      })
      .then(setAssigned)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [sectionId, isTeacher]);

  useEffect(() => {
    loadTeacher();
    loadStudent();
  }, [loadTeacher, loadStudent]);

  async function createWork() {
    const res = await fetch(`/api/sections/${sectionId}/assignment-works`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: "New assignment" }),
    });
    if (!res.ok) {
      setError("Could not create assignment. Restart education-backend if this is a new install.");
      return;
    }
    const row = await res.json();
    setBucket("draft");
    setEditId(row.id);
  }

  function openSubmissions(assignmentId: string) {
    setGradeId(assignmentId);
    fetch(`/api/assignment-works/${assignmentId}/submissions`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => setSubmissions(Array.isArray(rows) ? rows : []));
  }

  async function releaseScores(assignmentId: string, attemptId: string) {
    await fetch(`/api/assignment-works/${assignmentId}/attempts/${attemptId}/grade`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ scoresVisible: true, responses: [] }),
    });
    openSubmissions(assignmentId);
  }

  if (editId) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <AssignmentWorkEditor
          assignmentId={editId}
          onClose={() => {
            setEditId(null);
            loadTeacher();
          }}
          onDraftSaved={() => {
            setBucket("draft");
            setEditId(null);
            loadTeacher("draft");
          }}
          onPublished={() => {
            setBucket("live");
            setEditId(null);
            loadTeacher("live");
          }}
        />
      </div>
    );
  }

  if (playId) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <AssignmentWorkPlayer
          assignmentId={playId.id}
          title={playId.title}
          onClose={() => setPlayId(null)}
          onSubmitted={loadStudent}
        />
      </div>
    );
  }

  if (gradeId) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Submissions</h3>
          <button type="button" className="text-sm text-muted-foreground" onClick={() => setGradeId(null)}>
            Back
          </button>
        </div>
        <ul className="space-y-2 text-sm">
          {submissions.map((row) => (
            <li key={row.studentId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
              <span>{row.displayName || row.studentId}</span>
              <span className="text-muted-foreground">{row.status}</span>
              {row.score != null && <span>{row.score}/{row.maxScore}</span>}
              {row.attemptId && row.status === "submitted" && (
                <button
                  type="button"
                  className="text-xs text-primary"
                  onClick={() => void releaseScores(gradeId, row.attemptId!)}
                >
                  Mark graded & show score
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Assignments</h2>
        {isTeacher && (
          <button
            type="button"
            onClick={() => void createWork()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            New assignment
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}

      {isTeacher && (
        <div className="flex flex-wrap gap-2">
          {BUCKETS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBucket(b.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                bucket === b.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}

      <ul className="space-y-2">
        {(isTeacher ? works : assigned).map((w) => (
          <li
            key={w.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm"
          >
            <div>
              <span className="font-medium">{w.title}</span>
              {isTeacher && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {w.publishState}
                  {w.submittedCount != null ? ` · ${w.submittedCount} submitted` : ""}
                </span>
              )}
              {!isTeacher && w.attemptStatus && (
                <span className="ml-2 text-xs text-muted-foreground">{w.attemptStatus}</span>
              )}
            </div>
            <div className="flex gap-2">
              {isTeacher && (
                <>
                  <button type="button" className="text-primary" onClick={() => setEditId(w.id)}>Edit</button>
                  <button type="button" className="text-primary" onClick={() => openSubmissions(w.id)}>
                    Submissions
                  </button>
                </>
              )}
              {!isTeacher && !w.dueClosed && (
                <button
                  type="button"
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground"
                  onClick={() => setPlayId({ id: w.id, title: w.title })}
                >
                  {w.attemptStatus === "in_progress" ? "Continue" : "Start"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!works.length && isTeacher && !error && (
        <p className="text-sm text-muted-foreground">
          {bucket === "draft" && "No drafts yet. Create an assignment and use Save draft."}
          {bucket === "scheduled" && "No scheduled assignments."}
          {bucket === "live" && "No live assignments. Publish a draft to show it here."}
          {bucket === "closed" && "No closed assignments (past due date)."}
        </p>
      )}
      {!assigned.length && !isTeacher && !error && (
        <p className="text-sm text-muted-foreground">No published assignments right now.</p>
      )}
    </div>
  );
}
