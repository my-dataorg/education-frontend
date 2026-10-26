"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionDailyNotesPanel } from "@/components/section-daily-notes-panel";
import type { Section } from "@/lib/api";

type Props = { instituteId: string };

export function DailyNotesTab({ instituteId }: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadSections = useCallback(async () => {
    const res = await fetch(`/api/institutes/${instituteId}/sections`, { credentials: "include" });
    if (!res.ok) throw new Error("Could not load classes");
    const rows: Section[] = await res.json();
    setSections(rows);
    setSectionId((current) => current || rows[0]?.id || "");
  }, [instituteId]);

  useEffect(() => {
    loadSections()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [loadSections]);

  const sectionLabel = (s: Section) =>
    s.className ? `${s.className}-${s.name}` : s.name;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Daily notes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Class teachers edit today&apos;s board from <strong>Classes → Daily notes</strong>. Owners review
          past days here (read-only).
        </p>
      </div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Classes</p>
          <ul className="max-h-[28rem] space-y-1 overflow-y-auto">
            {sections.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => setSectionId(section.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    section.id === sectionId ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  {sectionLabel(section)}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          {loading || !sectionId ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <SectionDailyNotesPanel instituteId={instituteId} sectionId={sectionId} canEdit={false} />
          )}
        </div>
      </div>
    </div>
  );
}
