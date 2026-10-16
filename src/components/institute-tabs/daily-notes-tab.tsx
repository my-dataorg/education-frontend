"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Section } from "@/lib/api";

type Note = {
  id: string;
  content: string;
  noteDate: string;
  teacherId?: string;
};

type Props = { instituteId: string };

export function DailyNotesTab({ instituteId }: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadSections = useCallback(async () => {
    const res = await fetch(`/api/institutes/${instituteId}/sections`, { credentials: "include" });
    if (!res.ok) throw new Error("Could not load classes");
    const rows: Section[] = await res.json();
    setSections(rows);
    setSectionId((current) => current || rows[0]?.id || "");
  }, [instituteId]);

  const loadNotes = useCallback(async () => {
    if (!sectionId) {
      setNotes([]);
      return;
    }
    const res = await fetch(`/api/institutes/${instituteId}/sections/${sectionId}/notes`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Could not load daily notes");
    setNotes(await res.json());
  }, [instituteId, sectionId]);

  useEffect(() => {
    loadSections()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [loadSections]);

  useEffect(() => {
    loadNotes().catch((e) => setError(e instanceof Error ? e.message : "Failed to load notes"));
  }, [loadNotes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => n.content.toLowerCase().includes(q));
  }, [notes, search]);

  const sectionLabel = (s: Section) =>
    s.className ? `${s.className}-${s.name}` : s.name;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Daily notes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Notes shared with each class — read-only for owners and principals.
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
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes"
            className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="space-y-3">
              {filtered.length === 0 && (
                <li className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No daily notes for this class yet.
                </li>
              )}
              {filtered.map((note) => (
                <li key={note.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground">{note.noteDate}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{note.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
