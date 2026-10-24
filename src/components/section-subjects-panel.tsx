"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SectionSubject, Subject } from "@/lib/api";
import { SectionSubjectPickerDialog } from "@/components/section-subject-picker-dialog";

export function SectionSubjectsPanel({
  instituteId,
  sectionId,
  sectionLabel,
  canManage,
  fillHeight = false,
}: {
  instituteId: string;
  sectionId: string;
  sectionLabel: string;
  canManage: boolean;
  fillHeight?: boolean;
}) {
  const [catalog, setCatalog] = useState<Subject[]>([]);
  const [linked, setLinked] = useState<SectionSubject[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [subjectRes, sectionSubjectsRes] = await Promise.all([
      fetch(`/api/institutes/${instituteId}/subjects`, { credentials: "include" }),
      fetch(`/api/sections/${sectionId}/subjects`, { credentials: "include", cache: "no-store" }),
    ]);
    setCatalog(subjectRes.ok ? await subjectRes.json() : []);
    if (sectionSubjectsRes.ok) {
      setLinked(await sectionSubjectsRes.json());
    } else {
      const body = await sectionSubjectsRes.json().catch(() => ({}));
      setLinked([]);
      setError(body.detail || body.error || "Could not load subjects for this class.");
    }
  }, [instituteId, sectionId]);

  useEffect(() => {
    load().catch(() => setError("Could not load subjects"));
  }, [load]);

  const linkedIds = useMemo(() => new Set(linked.map((s) => s.id)), [linked]);

  async function bulkLink(subjectIds: string[]) {
    let ok = 0;
    let lastError = "";
    for (const subjectId of subjectIds) {
      const res = await fetch(`/api/sections/${sectionId}/subjects`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId }),
      });
      if (res.ok) ok += 1;
      else {
        const body = await res.json().catch(() => ({}));
        lastError = body.detail || "Could not add subject";
      }
    }
    if (!ok) throw new Error(lastError || "Could not add selected subjects.");
    if (ok < subjectIds.length) {
      throw new Error(`Linked ${ok} of ${subjectIds.length}. ${lastError}`);
    }
    await load();
  }

  async function unlink(subjectId: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/sections/${sectionId}/subjects/${subjectId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Could not remove subject");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove subject");
    } finally {
      setBusy(false);
    }
  }

  const listScrollClass = fillHeight
    ? "min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
    : "max-h-[calc(100dvh-18rem)] overflow-y-auto overscroll-y-contain";

  const cardClass = fillHeight
    ? "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm"
    : "max-w-3xl rounded-xl border border-border bg-card p-4 shadow-sm";

  return (
    <div className={fillHeight ? "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden" : "space-y-3"}>
      {error && (
        <p className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className={cardClass}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <h3 className="text-sm font-semibold">Subjects in this class</h3>
            <span className="text-xs text-muted-foreground tabular-nums">{linked.length}</span>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              Add subjects
            </button>
          )}
        </div>

        <div className={`${listScrollClass} pt-3`}>
          {linked.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No subjects linked yet. {canManage ? "Use Add subjects to link from the institute catalog." : ""}
            </p>
          ) : (
            <ul className="space-y-2 pr-0.5">
              {linked.map((subject) => (
                  <li
                    key={subject.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2.5"
                  >
                    <p className="min-w-0 text-sm font-medium">{subject.name}</p>
                    {canManage && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void unlink(subject.id)}
                        className="shrink-0 text-xs font-medium text-destructive hover:underline disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {canManage && (
        <SectionSubjectPickerDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          sectionLabel={sectionLabel}
          catalog={catalog}
          linkedIds={linkedIds}
          onConfirm={bulkLink}
        />
      )}
    </div>
  );
}
