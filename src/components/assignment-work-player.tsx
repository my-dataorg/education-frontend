"use client";

import { useCallback, useEffect, useState } from "react";

type SnapshotQuestion = {
  questionId: string;
  type: string;
  stem: string;
  points: number;
  required: boolean;
  options?: { key: string; label: string }[];
  metadata?: Record<string, unknown>;
};

type AttemptPayload = {
  attemptId: string;
  status: string;
  snapshot: { questions: SnapshotQuestion[] };
  responses: Record<string, unknown>;
  score?: number | null;
  maxScore?: number | null;
  scoresVisible?: boolean;
};

export function AssignmentWorkPlayer({
  assignmentId,
  title,
  onClose,
  onSubmitted,
}: {
  assignmentId: string;
  title: string;
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const [data, setData] = useState<AttemptPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/assignment-works/${assignmentId}/attempts/me`, { credentials: "include", cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Could not load assignment");
        return res.json() as Promise<AttemptPayload>;
      })
      .then((payload) => {
        setData(payload);
        setAnswers(payload.responses || {});
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load"));
  }, [assignmentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveResponses() {
    setSaving(true);
    try {
      const res = await fetch(`/api/assignment-works/${assignmentId}/attempts/me/responses`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error("Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    await saveResponses();
    const res = await fetch(`/api/assignment-works/${assignmentId}/attempts/me/submit`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      setError("Could not submit");
      return;
    }
    onSubmitted?.();
    load();
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const readOnly = data.status !== "in_progress";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <button type="button" onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
          Close
        </button>
      </div>
      {data.scoresVisible && data.score != null && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Score: {data.score} / {data.maxScore}
        </p>
      )}
      {data.snapshot.questions.map((q) => (
        <div key={q.questionId} className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium">{q.stem}</p>
          <p className="text-xs text-muted-foreground">{q.points} pt · {q.type}</p>
          <div className="mt-2">
            <QuestionInput
              question={q}
              value={answers[q.questionId]}
              disabled={readOnly}
              onChange={(val) => setAnswers((prev) => ({ ...prev, [q.questionId]: val }))}
            />
          </div>
        </div>
      ))}
      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveResponses()}
            className="rounded-lg border border-border px-4 py-2 text-sm"
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Submit
          </button>
        </div>
      )}
      {readOnly && data.status === "submitted" && (
        <p className="text-sm text-amber-800">Submitted — waiting for teacher grading.</p>
      )}
    </div>
  );
}

function QuestionInput({
  question,
  value,
  disabled,
  onChange,
}: {
  question: SnapshotQuestion;
  value: unknown;
  disabled: boolean;
  onChange: (v: unknown) => void;
}) {
  if (question.type === "single_choice") {
    return (
      <div className="space-y-2">
        {(question.options || []).map((opt) => (
          <label key={opt.key} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={question.questionId}
              disabled={disabled}
              checked={value === opt.key}
              onChange={() => onChange(opt.key)}
            />
            {opt.label}
          </label>
        ))}
      </div>
    );
  }
  if (question.type === "essay") {
    return (
      <textarea
        className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
        rows={4}
        disabled={disabled}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (question.type === "fill_blank") {
    const blanks = (question.metadata?.blanks as { id: string }[]) || [];
    return (
      <div className="space-y-2">
        {blanks.map((b) => (
          <input
            key={b.id}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            disabled={disabled}
            placeholder={`Answer for ${b.id}`}
            value={typeof value === "object" && value && b.id in (value as object) ? String((value as Record<string, string>)[b.id]) : ""}
            onChange={(e) =>
              onChange({ ...(typeof value === "object" ? (value as object) : {}), [b.id]: e.target.value })
            }
          />
        ))}
      </div>
    );
  }
  if (question.type === "match_pairs") {
    const pairs = (question.metadata?.pairs as { left: string; right: string }[]) || [];
    const rights = [...new Set(pairs.map((p) => p.right))];
    return (
      <div className="space-y-2">
        {pairs.map((p) => (
          <div key={p.left} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{p.left}</span>
            <select
              disabled={disabled}
              className="rounded border border-border px-2 py-1"
              value={typeof value === "object" && value ? String((value as Record<string, string>)[p.left] || "") : ""}
              onChange={(e) =>
                onChange({ ...(typeof value === "object" ? (value as object) : {}), [p.left]: e.target.value })
              }
            >
              <option value="">—</option>
              {rights.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }
  if (question.type === "order_items") {
    const items = (question.metadata?.items as string[]) || [];
    const order = Array.isArray(value) ? (value as string[]) : items;
    return (
      <ul className="space-y-1 text-sm">
        {order.map((item, idx) => (
          <li key={item} className="flex items-center gap-2">
            <span className="text-muted-foreground">{idx + 1}.</span>
            <span>{item}</span>
            {!disabled && (
              <>
                <button
                  type="button"
                  className="text-xs text-primary"
                  onClick={() => {
                    if (idx === 0) return;
                    const next = [...order];
                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                    onChange(next);
                  }}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="text-xs text-primary"
                  onClick={() => {
                    if (idx >= order.length - 1) return;
                    const next = [...order];
                    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                    onChange(next);
                  }}
                >
                  Down
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <input
      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
      disabled={disabled}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
