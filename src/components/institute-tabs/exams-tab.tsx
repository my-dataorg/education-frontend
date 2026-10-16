"use client";

import { useCallback, useEffect, useState } from "react";
import type { Section } from "@/lib/api";
import { ModuleHeader, Panel } from "@/components/institute-tabs/module-tab-ui";

type Exam = {
  id: string;
  name: string;
  status: string;
  maxMarks: number;
  sectionId: string | null;
  scheduledAt: string | null;
};

type MarkRow = {
  studentId: string;
  marksObtained: number | null;
};

export function ExamsTab({ instituteId }: { instituteId: string }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [marks, setMarks] = useState<MarkRow[]>([]);
  const [name, setName] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadExams = useCallback(async () => {
    const response = await fetch(`/api/institutes/${instituteId}/exams`, { credentials: "include" });
    if (!response.ok) throw new Error("Could not load exams");
    const rows = (await response.json()) as Exam[];
    setExams(rows);
    setSelectedId((current) => current || rows[0]?.id || "");
  }, [instituteId]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/institutes/${instituteId}/sections`, { credentials: "include" }),
      loadExams(),
    ])
      .then(async ([sectionsRes]) => {
        if (sectionsRes.ok) setSections(await sectionsRes.json());
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load"))
      .finally(() => setLoading(false));
  }, [instituteId, loadExams]);

  useEffect(() => {
    if (!selectedId) {
      setMarks([]);
      return;
    }
    fetch(`/api/exams/${selectedId}/marks`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return;
        setMarks(await response.json());
      })
      .catch(() => setMarks([]));
  }, [selectedId]);

  async function createExam() {
    if (!name.trim()) return;
    setError("");
    const response = await fetch(`/api/institutes/${instituteId}/exams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: name.trim(),
        sectionId: sectionId || null,
        maxMarks: Number(maxMarks) || 100,
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.detail || "Could not create exam");
      return;
    }
    setName("");
    setMessage("Exam created");
    await loadExams();
  }

  async function publishExam() {
    if (!selectedId) return;
    const response = await fetch(`/api/exams/${selectedId}/publish`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.detail || "Could not publish");
      return;
    }
    setMessage("Exam published");
    await loadExams();
  }

  async function saveMarks() {
    if (!selectedId) return;
    const response = await fetch(`/api/exams/${selectedId}/marks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ entries: marks }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.detail || "Could not save marks");
      return;
    }
    setMarks(await response.json());
    setMessage("Marks saved");
  }

  const selected = exams.find((exam) => exam.id === selectedId);
  const sectionLabel = (id: string | null) => {
    if (!id) return "All sections";
    const section = sections.find((row) => row.id === id);
    return section ? `${section.className}-${section.name}` : id;
  };

  return (
    <section className="space-y-5">
      <ModuleHeader
        title="Exams & results"
        description="Review marks progress and publish report cards"
        action={
          <button
            type="button"
            onClick={() => void createExam()}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
          >
            New exam
          </button>
        }
      />
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
      )}
      <Panel title="Create exam">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Exam name"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">All sections</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>{section.className} · {section.name}</option>
            ))}
          </select>
          <input
            value={maxMarks}
            onChange={(e) => setMaxMarks(e.target.value)}
            type="number"
            min={1}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Max marks"
          />
        </div>
      </Panel>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading exams…</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Exams">
            <div className="grid gap-3 sm:grid-cols-2">
              {exams.length === 0 && <p className="text-sm text-muted-foreground">No exams yet.</p>}
              {exams.map((exam) => (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => setSelectedId(exam.id)}
                  className={`rounded-lg border p-3 text-left text-sm ${
                    exam.id === selectedId ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <p className="font-medium">{exam.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {sectionLabel(exam.sectionId)} · {exam.status}
                  </p>
                </button>
              ))}
            </div>
          </Panel>
          <Panel title={selected ? `Marks · ${selected.name}` : "Marks entry"}>
            {!selected ? (
              <p className="text-sm text-muted-foreground">Select an exam to enter marks.</p>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={selected.status === "published"}
                    onClick={() => void publishExam()}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  >
                    Publish results
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveMarks()}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                  >
                    Save marks
                  </button>
                </div>
                {marks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No mark rows yet. Save marks after students are enrolled in the exam section.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {marks.map((row) => (
                      <label key={row.studentId} className="flex items-center justify-between gap-3 text-xs">
                        <span className="truncate">{row.studentId}</span>
                        <input
                          type="number"
                          min={0}
                          value={row.marksObtained ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setMarks((current) =>
                              current.map((entry) =>
                                entry.studentId === row.studentId
                                  ? { ...entry, marksObtained: value === "" ? null : Number(value) }
                                  : entry
                              )
                            );
                          }}
                          className="w-24 rounded-md border border-border bg-background px-2 py-1"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}
          </Panel>
        </div>
      )}
    </section>
  );
}
