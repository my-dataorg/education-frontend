"use client";

import { useEffect, useState } from "react";

type Question = {
  type: string;
  sortOrder: number;
  points: number;
  required: boolean;
  variants: {
    stem: string;
    metadata: Record<string, unknown>;
    options: { key: string; label: string; isCorrect: boolean }[];
  }[];
};

const QUESTION_TYPES = [
  { value: "single_choice", label: "Choose answer" },
  { value: "short_text", label: "Short text" },
  { value: "essay", label: "Essay" },
  { value: "fill_blank", label: "Fill blanks" },
  { value: "match_pairs", label: "Match pairs" },
  { value: "order_items", label: "Order items" },
];

export function AssignmentWorkEditor({
  assignmentId,
  onClose,
  onDraftSaved,
  onPublished,
}: {
  assignmentId: string;
  onClose: () => void;
  onDraftSaved?: () => void;
  onPublished?: () => void;
}) {
  const [meta, setMeta] = useState({
    title: "",
    instructions: "",
    audienceType: "section",
    dueAt: "",
    publishAt: "",
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/assignment-works/${assignmentId}`, { credentials: "include" }),
      fetch(`/api/assignment-works/${assignmentId}/questions`, { credentials: "include" }),
    ])
      .then(async ([metaRes, qRes]) => {
        if (metaRes.ok) {
          const m = await metaRes.json();
          setMeta({
            title: m.title || "",
            instructions: m.instructions || "",
            audienceType: m.audienceType || "section",
            dueAt: m.dueAt ? m.dueAt.slice(0, 16) : "",
            publishAt: m.publishAt ? m.publishAt.slice(0, 16) : "",
          });
        }
        if (qRes.ok) {
          const qs = await qRes.json();
          setQuestions(
            (qs as Question[]).map((q, i) => ({
              type: q.type,
              sortOrder: q.sortOrder ?? i,
              points: q.points ?? 1,
              required: q.required ?? true,
              variants: q.variants?.length
                ? q.variants.map((v) => ({
                    stem: v.stem || "",
                    metadata: v.metadata || {},
                    options: v.options || [],
                  }))
                : [{ stem: "", metadata: {}, options: [] }],
            }))
          );
        }
      })
      .catch(() => setError("Could not load assignment"));
  }, [assignmentId]);

  async function apiError(res: Response, fallback: string) {
    try {
      const body = await res.json();
      const detail = body?.detail;
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail)) return detail.map((d: { msg?: string }) => d.msg).join(", ");
    } catch {
      /* ignore */
    }
    return fallback;
  }

  async function patchMeta() {
    const res = await fetch(`/api/assignment-works/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: meta.title,
        instructions: meta.instructions,
        audienceType: meta.audienceType,
        dueAt: meta.dueAt ? new Date(meta.dueAt).toISOString() : null,
        publishAt: meta.publishAt ? new Date(meta.publishAt).toISOString() : null,
      }),
    });
    if (!res.ok) throw new Error(await apiError(res, "Could not save details"));
  }

  async function saveQuestions() {
    const res = await fetch(`/api/assignment-works/${assignmentId}/questions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ questions }),
    });
    if (!res.ok) throw new Error(await apiError(res, "Could not save questions"));
  }

  async function saveDraft() {
    setMessage("");
    setError("");
    try {
      await patchMeta();
      await saveQuestions();
      setMessage("Draft saved — see it under the Draft tab in the list.");
      onDraftSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function publish(now: boolean) {
    setMessage("");
    setError("");
    try {
      await patchMeta();
      await saveQuestions();
      const res = await fetch(`/api/assignment-works/${assignmentId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          publishAt: now ? null : meta.publishAt ? new Date(meta.publishAt).toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error(await apiError(res, "Publish failed"));
      setMessage(now ? "Published" : "Scheduled");
      onPublished?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    }
  }

  function addQuestion() {
    setQuestions((q) => [
      ...q,
      {
        type: "single_choice",
        sortOrder: q.length,
        points: 1,
        required: true,
        variants: [
          {
            stem: "",
            metadata: {},
            options: [
              { key: "a", label: "Option A", isCorrect: true },
              { key: "b", label: "Option B", isCorrect: false },
            ],
          },
        ],
      },
    ]);
  }

  return (
    <div className="space-y-4 max-h-[85vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Edit assignment</h3>
        <button type="button" onClick={onClose} className="text-sm text-muted-foreground">Close</button>
      </div>
      <input
        className="w-full rounded-lg border border-border px-3 py-2 text-sm"
        value={meta.title}
        onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
        placeholder="Title"
      />
      <textarea
        className="w-full rounded-lg border border-border px-3 py-2 text-sm"
        rows={2}
        value={meta.instructions}
        onChange={(e) => setMeta((m) => ({ ...m, instructions: e.target.value }))}
        placeholder="Instructions for students"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          Due
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm"
            value={meta.dueAt}
            onChange={(e) => setMeta((m) => ({ ...m, dueAt: e.target.value }))}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Schedule publish (optional)
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm"
            value={meta.publishAt}
            onChange={(e) => setMeta((m) => ({ ...m, publishAt: e.target.value }))}
          />
        </label>
      </div>
      <select
        className="rounded-lg border border-border px-3 py-2 text-sm"
        value={meta.audienceType}
        onChange={(e) => setMeta((m) => ({ ...m, audienceType: e.target.value }))}
      >
        <option value="section">Entire class</option>
        <option value="students">Selected students (set via API later)</option>
      </select>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Questions</h4>
          <button type="button" onClick={addQuestion} className="text-sm text-primary">+ Add</button>
        </div>
        {questions.map((q, qi) => (
          <div key={qi} className="rounded-xl border border-border p-3 space-y-2">
            <select
              className="rounded border border-border px-2 py-1 text-sm"
              value={q.type}
              onChange={(e) =>
                setQuestions((all) =>
                  all.map((item, i) => (i === qi ? { ...item, type: e.target.value } : item))
                )
              }
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <textarea
              className="w-full rounded-lg border border-border px-2 py-1.5 text-sm"
              rows={2}
              placeholder="Question stem (variant 1)"
              value={q.variants[0]?.stem || ""}
              onChange={(e) =>
                setQuestions((all) =>
                  all.map((item, i) =>
                    i === qi
                      ? {
                          ...item,
                          variants: [{ ...item.variants[0], stem: e.target.value }],
                        }
                      : item
                  )
                )
              }
            />
            {q.type === "short_text" && (
              <input
                className="w-full rounded border border-border px-2 py-1 text-xs"
                placeholder="Acceptable answer (comma-separated)"
                onChange={(e) => {
                  const acceptable = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                  setQuestions((all) =>
                    all.map((item, i) =>
                      i === qi
                        ? {
                            ...item,
                            variants: [
                              {
                                ...item.variants[0],
                                metadata: { acceptable },
                              },
                            ],
                          }
                        : item
                    )
                  );
                }}
              />
            )}
            {q.type === "single_choice" &&
              (q.variants[0]?.options || []).map((opt, oi) => (
                <div key={oi} className="flex gap-2 text-sm">
                  <input
                    value={opt.label}
                    onChange={(e) =>
                      setQuestions((all) =>
                        all.map((item, i) => {
                          if (i !== qi) return item;
                          const options = [...(item.variants[0]?.options || [])];
                          options[oi] = { ...options[oi], label: e.target.value };
                          return { ...item, variants: [{ ...item.variants[0], options }] };
                        })
                      )
                    }
                    className="flex-1 rounded border border-border px-2 py-1"
                  />
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="radio"
                      name={`correct-${qi}`}
                      checked={opt.isCorrect}
                      onChange={() =>
                        setQuestions((all) =>
                          all.map((item, i) => {
                            if (i !== qi) return item;
                            const options = (item.variants[0]?.options || []).map((o, j) => ({
                              ...o,
                              isCorrect: j === oi,
                            }));
                            return { ...item, variants: [{ ...item.variants[0], options }] };
                          })
                        )
                      }
                    />
                    Correct
                  </label>
                </div>
              ))}
          </div>
        ))}
      </div>

      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void saveDraft()} className="rounded-lg border border-border px-3 py-2 text-sm">
          Save draft
        </button>
        <button type="button" onClick={() => void publish(true)} className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
          Publish now
        </button>
        {meta.publishAt && (
          <button type="button" onClick={() => void publish(false)} className="rounded-lg bg-amber-700 px-3 py-2 text-sm text-white">
            Schedule publish
          </button>
        )}
      </div>
    </div>
  );
}
