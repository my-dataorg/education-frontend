"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DrawingBoard } from "@/components/drawing-board";
import type { DailyNoteAttachment, DailyNoteSheet } from "@/lib/daily-notes-types";
import { todayIsoDate } from "@/lib/daily-notes-types";

type Props = {
  instituteId: string;
  sectionId: string;
  canEdit: boolean;
};

function emptySheet(noteDate: string, editable: boolean): DailyNoteSheet {
  return {
    id: null,
    content: "",
    noteDate,
    drawingJson: "",
    attachments: [],
    editable,
  };
}

export function SectionDailyNotesPanel({ instituteId, sectionId, canEdit }: Props) {
  const today = todayIsoDate();
  const [noteDate, setNoteDate] = useState(today);
  const [sheet, setSheet] = useState<DailyNoteSheet>(() => emptySheet(today, canEdit));
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editable = canEdit && noteDate === today && sheet.editable;

  const loadList = useCallback(async () => {
    const res = await fetch(`/api/institutes/${instituteId}/sections/${sectionId}/notes`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const rows: { noteDate: string }[] = await res.json();
    const dates = rows.map((row) => row.noteDate).filter(Boolean);
    if (!dates.includes(today)) dates.unshift(today);
    setAvailableDates([...new Set(dates)].sort().reverse());
  }, [instituteId, sectionId, today]);

  const loadSheet = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/institutes/${instituteId}/sections/${sectionId}/notes/${noteDate}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Could not load daily note");
      const data: DailyNoteSheet = await res.json();
      setSheet(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setSheet(emptySheet(noteDate, canEdit && noteDate === today));
    } finally {
      setLoading(false);
    }
  }, [instituteId, sectionId, noteDate, canEdit, today]);

  useEffect(() => {
    loadList().catch(() => undefined);
  }, [loadList]);

  useEffect(() => {
    loadSheet().catch(() => undefined);
  }, [loadSheet]);

  const persist = useCallback(
    async (next: DailyNoteSheet) => {
      if (!editable) return;
      setSaving(true);
      setError("");
      try {
        const res = await fetch(
          `/api/institutes/${instituteId}/sections/${sectionId}/notes/${noteDate}`,
          {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: next.content,
              drawingJson: next.drawingJson,
              attachments: next.attachments,
            }),
          }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || body.error || "Could not save");
        }
        const saved: DailyNoteSheet = await res.json();
        setSheet(saved);
        await loadList();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [editable, instituteId, sectionId, noteDate, loadList]
  );

  const scheduleSave = (next: DailyNoteSheet) => {
    setSheet(next);
    if (!editable) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persist(next).catch(() => undefined);
    }, 900);
  };

  const onUpload = async (file: File) => {
    if (!editable) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image uploads are supported");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
    const attachment: DailyNoteAttachment = {
      id: crypto.randomUUID(),
      name: file.name,
      contentType: file.type,
      dataUrl,
    };
    scheduleSave({ ...sheet, attachments: [...sheet.attachments, attachment] });
  };

  const dateOptions = useMemo(() => {
    const set = new Set(availableDates);
    set.add(today);
    set.add(noteDate);
    return [...set].sort().reverse();
  }, [availableDates, noteDate, today]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Daily note</p>
          <p className="text-xs text-muted-foreground">
            {editable
              ? "Today’s board — draw, type, or upload a photo. Saves automatically."
              : noteDate === today
                ? "Read-only for your role. Only the class teacher can edit today’s note."
                : "Past notes are read-only."}
          </p>
        </div>
        <label className="text-xs font-semibold text-muted-foreground">
          Date
          <select
            value={noteDate}
            onChange={(e) => setNoteDate(e.target.value)}
            className="mt-1 block min-w-[10rem] rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {dateOptions.map((d) => (
              <option key={d} value={d}>
                {d === today ? `Today (${d})` : d}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {saving && <p className="text-xs text-muted-foreground">Saving…</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <DrawingBoard
              value={sheet.drawingJson}
              onChange={(drawingJson) => scheduleSave({ ...sheet, drawingJson })}
              readOnly={!editable}
            />
            <div className="flex min-h-[280px] flex-col rounded-xl border border-border bg-card">
              <div className="border-b border-border px-3 py-2">
                <p className="text-xs font-semibold text-muted-foreground">Written notes</p>
              </div>
              <textarea
                value={sheet.content}
                onChange={(e) => scheduleSave({ ...sheet, content: e.target.value })}
                readOnly={!editable}
                placeholder="Type today’s summary for parents and staff…"
                className="min-h-[240px] flex-1 resize-none rounded-b-xl bg-transparent px-3 py-3 text-sm outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold text-muted-foreground">Board photos</p>
              {editable && (
                <label className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                  Upload photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUpload(file).catch(() => undefined);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            {sheet.attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No photos yet.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sheet.attachments.map((item) => (
                  <li key={item.id} className="overflow-hidden rounded-xl border border-border">
                    <img src={item.dataUrl} alt={item.name} className="h-40 w-full object-cover" />
                    <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                      <span className="truncate">{item.name}</span>
                      {editable && (
                        <button
                          type="button"
                          className="text-red-600 hover:underline"
                          onClick={() =>
                            scheduleSave({
                              ...sheet,
                              attachments: sheet.attachments.filter((a) => a.id !== item.id),
                            })
                          }
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
