"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Save } from "lucide-react";
import { buildInstitutePathFromSearch } from "@/lib/embed-href";

type MatrixColumn = { subjectId: string; name: string; offeredIn?: string[] };
type MatrixCell = {
  subjectId: string;
  teacherId?: string | null;
  teacherName?: string | null;
  sectionLabels?: string[] | null;
};
type MatrixRow = {
  sectionId?: string | null;
  teacherId?: string | null;
  label: string;
  cells: MatrixCell[];
};

type MatrixPayload = { columns: MatrixColumn[]; rows: MatrixRow[] };

type ChecksPayload = {
  unassignedCount: number;
  overLimitCount: number;
  noClassCount: number;
  unassignedCells: { sectionLabel?: string; subjectName?: string }[];
  overLimitTeachers: string[];
  noClassTeachers: string[];
};

type TeacherOption = { userId: string; name: string };

type Props = {
  instituteId: string;
  branchId: string | null;
};

export function SubjectTeachersTab({ instituteId, branchId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const show = searchParams.get("show") === "teacher" ? "teacher" : "class";

  const [matrix, setMatrix] = useState<MatrixPayload | null>(null);
  const [checks, setChecks] = useState<ChecksPayload | null>(null);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [draft, setDraft] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const campusQuery = branchId ? `&branch=${encodeURIComponent(branchId)}` : "";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [matrixRes, checksRes, staffRes] = await Promise.all([
        fetch(`/api/institutes/${instituteId}/subject-teachers?show=${show}${campusQuery}`, {
          credentials: "include",
        }),
        fetch(`/api/institutes/${instituteId}/subject-teachers/checks?${branchId ? `branch=${branchId}` : ""}`, {
          credentials: "include",
        }),
        fetch(`/api/institutes/${instituteId}/members?group=staff`, { credentials: "include" }),
      ]);
      if (!matrixRes.ok || !checksRes.ok) throw new Error("Could not load subject teachers.");
      const matrixJson = (await matrixRes.json()) as MatrixPayload;
      setMatrix(matrixJson);
      setChecks((await checksRes.json()) as ChecksPayload);
      const staff = staffRes.ok ? await staffRes.json() : [];
      setTeachers(
        (staff as { userId: string; role: string; displayName?: string; username?: string }[])
          .filter((m) => ["teacher", "lecturer", "professor", "principal"].includes(m.role))
          .map((m) => ({
            userId: m.userId,
            name: m.displayName || m.username || m.userId,
          }))
      );
      const nextDraft: Record<string, string | null> = {};
      for (const row of matrixJson.rows) {
        if (!row.sectionId) continue;
        for (const cell of row.cells) {
          nextDraft[`${row.sectionId}:${cell.subjectId}`] = cell.teacherId || null;
        }
      }
      setDraft(nextDraft);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load subject teachers.");
    } finally {
      setLoading(false);
    }
  }, [campusQuery, instituteId, show, branchId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const dirty = useMemo(() => {
    if (!matrix || show !== "class") return false;
    for (const row of matrix.rows) {
      if (!row.sectionId) continue;
      for (const cell of row.cells) {
        const key = `${row.sectionId}:${cell.subjectId}`;
        const current = draft[key] ?? cell.teacherId ?? null;
        const original = cell.teacherId ?? null;
        if (current !== original) return true;
      }
    }
    return false;
  }, [draft, matrix, show]);

  function setShow(next: "class" | "teacher") {
    router.replace(
      buildInstitutePathFromSearch(instituteId, searchParams, {
        tab: "subject-teachers",
        show: next,
        branch: branchId,
      })
    );
  }

  function setCell(sectionId: string, subjectId: string, teacherId: string | null) {
    setDraft((prev) => ({ ...prev, [`${sectionId}:${subjectId}`]: teacherId || null }));
  }

  async function save() {
    if (!matrix || show !== "class") return;
    setSaving(true);
    setError("");
    try {
      const assignments: { sectionId: string; subjectId: string; teacherId: string | null }[] = [];
      for (const row of matrix.rows) {
        if (!row.sectionId) continue;
        for (const cell of row.cells) {
          const key = `${row.sectionId}:${cell.subjectId}`;
          const original = cell.teacherId ?? null;
          const current = draft[key] ?? original;
          if (current !== original) {
            assignments.push({
              sectionId: row.sectionId,
              subjectId: cell.subjectId,
              teacherId: current,
            });
          }
        }
      }
      const res = await fetch(`/api/institutes/${instituteId}/subject-teachers/assignments`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Could not save assignments.");
      }
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save assignments.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="mt-6 text-sm text-muted-foreground">Loading subject teachers...</p>;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Owner workspace</p>
          <h1 className="mt-1 text-2xl font-semibold">Subject teachers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign teachers to subjects per class. Fix gaps using the checks panel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle show={show} onChange={setShow} />
          <button
            type="button"
            disabled={!dirty || saving || show !== "class"}
            onClick={() => void save()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save assignments"}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          {matrix && matrix.rows.length > 0 ? (
            <table className="min-w-full text-xs">
              <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 font-medium">
                    {show === "class" ? "Class" : "Teacher"}
                  </th>
                  {matrix.columns.map((col) => (
                    <th key={col.subjectId} className="px-3 py-2 font-medium whitespace-nowrap">
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.rows.map((row) => (
                  <tr key={row.sectionId || row.teacherId || row.label} className="border-t border-border/80">
                    <td className="sticky left-0 z-10 bg-card px-3 py-2 font-medium whitespace-nowrap">
                      {row.label}
                    </td>
                    {row.cells.map((cell) => (
                      <td key={cell.subjectId} className="px-2 py-2 align-top">
                        {show === "class" && row.sectionId ? (
                          <select
                            value={draft[`${row.sectionId}:${cell.subjectId}`] ?? cell.teacherId ?? ""}
                            onChange={(event) =>
                              setCell(row.sectionId!, cell.subjectId, event.target.value || null)
                            }
                            className="w-full min-w-[120px] rounded-md border border-border bg-background px-2 py-1"
                          >
                            <option value="">Unassigned</option>
                            {teachers.map((teacher) => (
                              <option key={teacher.userId} value={teacher.userId}>
                                {teacher.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-muted-foreground">
                            {(cell.sectionLabels && cell.sectionLabels.length > 0
                              ? cell.sectionLabels.join(", ")
                              : cell.teacherName) || "—"}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-8 text-center text-sm text-muted-foreground">No classes or teachers to display.</p>
          )}
        </div>

        <ChecksPanel checks={checks} />
      </div>
    </section>
  );
}

function ViewToggle({
  show,
  onChange,
}: {
  show: "class" | "teacher";
  onChange: (value: "class" | "teacher") => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs">
      <button
        type="button"
        onClick={() => onChange("class")}
        className={`rounded-md px-3 py-1.5 ${show === "class" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
      >
        By class
      </button>
      <button
        type="button"
        onClick={() => onChange("teacher")}
        className={`rounded-md px-3 py-1.5 ${show === "teacher" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
      >
        By teacher
      </button>
    </div>
  );
}

function ChecksPanel({ checks }: { checks: ChecksPayload | null }) {
  if (!checks) {
    return (
      <aside className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
        Loading checks…
      </aside>
    );
  }

  return (
    <aside className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <h2 className="text-sm font-semibold">Checks</h2>
      </div>
      <ul className="space-y-2 text-xs text-muted-foreground">
        <li>
          <span className="font-medium text-foreground">{checks.unassignedCount}</span> subject slots without a teacher
        </li>
        <li>
          <span className="font-medium text-foreground">{checks.noClassCount}</span> teachers not enrolled in the class they teach
        </li>
        <li>
          <span className="font-medium text-foreground">{checks.overLimitCount}</span> teachers over weekly period limit
        </li>
      </ul>
      {checks.unassignedCells.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Unassigned</p>
          <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-xs">
            {checks.unassignedCells.slice(0, 12).map((cell, index) => (
              <li key={index}>
                {cell.sectionLabel} · {cell.subjectName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
