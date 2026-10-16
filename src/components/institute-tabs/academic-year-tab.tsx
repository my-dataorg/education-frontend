"use client";

import { useEffect, useState } from "react";
import { DataTable, LabeledInput, ModuleHeader, Panel } from "@/components/institute-tabs/module-tab-ui";

type AcademicYear = {
  label: string;
  startDate: string;
  endDate: string;
  board: string;
  termCount: number;
  gradingScale: string;
  medium: string;
};

type ClassRow = { id: string; name: string; className?: string };
type SubjectRow = { id: string; name: string };

export function AcademicYearTab({ instituteId }: { instituteId: string }) {
  const [sections, setSections] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [draft, setDraft] = useState<AcademicYear | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/institutes/${instituteId}/sections`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/subjects`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/academic-year`, { credentials: "include" }),
    ])
      .then(async ([sectionsResponse, subjectsResponse, yearResponse]) => {
        if (!sectionsResponse.ok || !subjectsResponse.ok || !yearResponse.ok) {
          throw new Error("Could not load academic year");
        }
        setSections(await sectionsResponse.json());
        setSubjects(await subjectsResponse.json());
        const nextYear = await yearResponse.json();
        setYear(nextYear);
        setDraft(nextYear);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load"));
  }, [instituteId]);

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError("");
    const response = await fetch(`/api/institutes/${instituteId}/academic-year`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(draft),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.detail || "Could not save academic year");
      setSaving(false);
      return;
    }
    const saved = await response.json();
    setYear(saved);
    setDraft(saved);
    setSaving(false);
  }

  return (
    <section className="space-y-5">
      <ModuleHeader
        eyebrow={`Owner · AY ${year?.label || "…"}`}
        title="Academic year & terms"
        description="Academic year, classes & subjects"
        action={
          <button
            type="button"
            onClick={() => void save()}
            disabled={!draft || saving}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        }
      />
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {!draft ? (
        <Panel title="Academic year">
          <p className="text-sm text-muted-foreground">Loading academic year…</p>
        </Panel>
      ) : (
        <div className="space-y-5">
          <Panel title="Academic year">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <LabeledInput label="Academic year" value={draft.label} onChange={(label) => setDraft({ ...draft, label })} />
              <LabeledInput label="Board" value={draft.board} onChange={(board) => setDraft({ ...draft, board })} />
              <LabeledInput
                label="Terms"
                type="number"
                value={String(draft.termCount)}
                onChange={(termCount) => setDraft({ ...draft, termCount: Number(termCount) })}
              />
              <LabeledInput
                label="Grading scale"
                value={draft.gradingScale}
                onChange={(gradingScale) => setDraft({ ...draft, gradingScale })}
              />
              <LabeledInput label="Medium" value={draft.medium} onChange={(medium) => setDraft({ ...draft, medium })} />
              <LabeledInput
                label="Start date"
                type="date"
                value={draft.startDate}
                onChange={(startDate) => setDraft({ ...draft, startDate })}
              />
              <LabeledInput
                label="End date"
                type="date"
                value={draft.endDate}
                onChange={(endDate) => setDraft({ ...draft, endDate })}
              />
            </div>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="mt-4 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save academic year"}
            </button>
          </Panel>
          <Panel title="Classes & sections">
            <DataTable
              headers={["Section", "Class teacher", "Room", "Strength"]}
              rows={
                sections.length
                  ? sections.map((section) => [
                      `${section.className || "Class"}-${section.name}`,
                      "—",
                      "—",
                      "—",
                    ])
                  : [["No classes yet", "—", "—", "—"]]
              }
            />
          </Panel>
          <Panel title="Subjects">
            <div className="flex flex-wrap gap-2">
              {subjects.length
                ? subjects.map((subject) => (
                    <span key={subject.id} className="rounded-full bg-muted px-3 py-1.5 text-xs">{subject.name}</span>
                  ))
                : <span className="text-sm text-muted-foreground">No subjects yet.</span>}
            </div>
          </Panel>
        </div>
      )}
    </section>
  );
}
