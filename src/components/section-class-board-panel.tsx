"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DrawingBoard } from "@/components/drawing-board";
import type { ClassBoardAttachment, ClassBoardSheet } from "@/lib/class-board-types";
import { todayIsoDate } from "@/lib/class-board-types";
import {
  classBoardDraftKey,
  clearLocalDraft,
  mergeSheetWithLocalDraft,
  readLocalDraft,
  writeLocalDraft,
} from "@/lib/class-board-draft";
import type { SectionSubject } from "@/lib/api";

const AUTO_SAVE_MS = 15 * 60 * 1000;
const LOCAL_SAVE_MS = 400;

function sheetBody(sheet: ClassBoardSheet) {
  return {
    content: sheet.content,
    drawingJson: sheet.drawingJson,
    attachments: sheet.attachments,
  };
}

function formatTime(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

type Props = {
  instituteId: string;
  sectionId: string;
  canEdit?: boolean;
  fillHeight?: boolean;
};

function emptySheet(noteDate: string, subjectId: string, editable: boolean): ClassBoardSheet {
  return {
    id: null,
    subjectId,
    content: "",
    noteDate,
    drawingJson: "",
    attachments: [],
    editable,
  };
}

export function SectionClassBoardPanel({
  instituteId,
  sectionId,
  canEdit = false,
  fillHeight = false,
}: Props) {
  const today = todayIsoDate();
  const [serverToday, setServerToday] = useState(today);
  const [userId, setUserId] = useState("");
  const [subjects, setSubjects] = useState<SectionSubject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [noteDate, setNoteDate] = useState(today);
  const [sheet, setSheet] = useState<ClassBoardSheet>(() => emptySheet(today, "", false));
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [drawPct, setDrawPct] = useState(55);
  const [lastLocalSave, setLastLocalSave] = useState<number | null>(null);
  const [lastServerSave, setLastServerSave] = useState<number | null>(null);
  const [draftDirty, setDraftDirty] = useState(false);
  const localTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sheetRef = useRef(sheet);
  const splitRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  sheetRef.current = sheet;

  const draftKey = useMemo(
    () => (subjectId ? classBoardDraftKey(sectionId, subjectId, noteDate) : ""),
    [sectionId, subjectId, noteDate]
  );

  const editable = Boolean(subjectId) && sheet.editable;
  const calendarToday = serverToday || today;
  const isPublished = Boolean(sheet.publishedAt);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((session) => setUserId(session?.user?.id ?? ""))
      .catch(() => setUserId(""));
  }, []);

  useEffect(() => {
    fetch(`/api/sections/${sectionId}/subjects`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: SectionSubject[]) => {
        setSubjects(rows);
        setSubjectId((current) => {
          if (current) return current;
          if (userId) {
            const mine = rows.find((s) => s.teachers?.some((t) => t.userId === userId));
            if (mine) return mine.id;
          }
          return rows[0]?.id || "";
        });
      })
      .catch(() => setSubjects([]));
  }, [sectionId, userId]);

  const loadList = useCallback(async () => {
    if (!subjectId) {
      setAvailableDates([calendarToday]);
      return;
    }
    const res = await fetch(
      `/api/institutes/${instituteId}/sections/${sectionId}/notes?subjectId=${subjectId}`,
      { credentials: "include" }
    );
    if (!res.ok) return;
    const rows: { noteDate: string }[] = await res.json();
    const dates = rows.map((row) => row.noteDate).filter(Boolean);
    if (!dates.includes(calendarToday)) dates.unshift(calendarToday);
    setAvailableDates([...new Set(dates)].sort().reverse());
  }, [instituteId, sectionId, subjectId, calendarToday]);

  const loadSheet = useCallback(async () => {
    if (!subjectId) {
      setLoading(false);
      setSheet(emptySheet(noteDate, "", false));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/institutes/${instituteId}/sections/${sectionId}/subjects/${subjectId}/notes/${noteDate}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Could not load class board");
      const data: ClassBoardSheet = await res.json();
      if (data.instituteToday) {
        setServerToday(data.instituteToday);
        if (noteDate === today || noteDate === serverToday) {
          setNoteDate(data.instituteToday);
        }
      }
      const key = classBoardDraftKey(sectionId, subjectId, noteDate);
      const local = data.editable ? readLocalDraft(key) : null;
      const merged = data.editable ? mergeSheetWithLocalDraft(data, local) : data;
      setSheet(merged);
      setDraftDirty(Boolean(local && data.editable));
      setLastLocalSave(local?.savedAt ?? null);
      setLastServerSave(data.id ? Date.now() : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setSheet(emptySheet(noteDate, subjectId, canEdit && noteDate === today));
    } finally {
      setLoading(false);
    }
  }, [instituteId, sectionId, subjectId, noteDate, canEdit, today, serverToday]);

  useEffect(() => {
    loadList().catch(() => undefined);
  }, [loadList]);

  useEffect(() => {
    loadSheet().catch(() => undefined);
  }, [loadSheet]);

  const saveDraftToServer = useCallback(
    async (body = sheetRef.current) => {
      if (!body.editable || !subjectId) return;
      setSaving(true);
      setError("");
      try {
        const res = await fetch(
          `/api/institutes/${instituteId}/sections/${sectionId}/subjects/${subjectId}/notes/${noteDate}`,
          {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sheetBody(body)),
          }
        );
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.detail || payload.error || "Could not save draft");
        }
        const saved: ClassBoardSheet = await res.json();
        setSheet((current) => ({ ...saved, ...sheetBody(current), editable: saved.editable }));
        setLastServerSave(Date.now());
        setDraftDirty(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Draft save failed");
      } finally {
        setSaving(false);
      }
    },
    [instituteId, sectionId, subjectId, noteDate]
  );

  const publishBoard = useCallback(async () => {
    if (!editable || !subjectId) return;
    setPublishing(true);
    setError("");
    try {
      const body = sheetRef.current;
      const res = await fetch(
        `/api/institutes/${instituteId}/sections/${sectionId}/subjects/${subjectId}/notes/${noteDate}/publish`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sheetBody(body)),
        }
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.detail || payload.error || "Could not publish");
      }
      const saved: ClassBoardSheet = await res.json();
      setSheet(saved);
      clearLocalDraft(draftKey);
      setLastServerSave(Date.now());
      setDraftDirty(false);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }, [editable, instituteId, sectionId, subjectId, noteDate, draftKey, loadList]);

  useEffect(() => {
    if (!editable) return;
    const timer = setInterval(() => {
      saveDraftToServer().catch(() => undefined);
    }, AUTO_SAVE_MS);
    return () => clearInterval(timer);
  }, [editable, saveDraftToServer]);

  const applyChange = (next: ClassBoardSheet) => {
    setSheet(next);
    if (!editable || !draftKey) return;
    setDraftDirty(true);
    if (localTimer.current) clearTimeout(localTimer.current);
    localTimer.current = setTimeout(() => {
      writeLocalDraft(draftKey, sheetBody(next));
      setLastLocalSave(Date.now());
    }, LOCAL_SAVE_MS);
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
    const attachment: ClassBoardAttachment = {
      id: crypto.randomUUID(),
      name: file.name,
      contentType: file.type,
      dataUrl,
    };
    applyChange({ ...sheet, attachments: [...sheet.attachments, attachment] });
  };

  const onSplitPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onSplitPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !splitRef.current) return;
    const rect = splitRef.current.getBoundingClientRect();
    const vertical = window.matchMedia("(max-width: 767px)").matches;
    const pct = vertical
      ? ((e.clientY - rect.top) / rect.height) * 100
      : ((e.clientX - rect.left) / rect.width) * 100;
    setDrawPct(Math.min(78, Math.max(22, pct)));
  };

  const onSplitPointerUp = (e: React.PointerEvent) => {
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const dateOptions = useMemo(() => {
    const set = new Set(availableDates);
    set.add(calendarToday);
    set.add(noteDate);
    return [...set].sort().reverse();
  }, [availableDates, noteDate, calendarToday]);

  const subjectLabel = subjects.find((s) => s.id === subjectId)?.name ?? "Subject";
  const teachesSubject = Boolean(
    userId && subjects.find((s) => s.id === subjectId)?.teachers?.some((t) => t.userId === userId)
  );

  const boardHasContent =
    Boolean(sheet.content?.trim()) ||
    Boolean(sheet.drawingJson && sheet.drawingJson !== "[]") ||
    sheet.attachments.length > 0;

  const awaitingPublish =
    !editable && noteDate === calendarToday && !isPublished && !boardHasContent;

  if (!subjects.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Link subjects to this class under <strong>Subjects</strong>, then add a class board per subject.
      </p>
    );
  }

  const rootClass = fillHeight
    ? "flex min-h-0 flex-1 flex-col gap-1 overflow-hidden"
    : "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden md:max-h-none";

  const toolBtn =
    "shrink-0 whitespace-nowrap rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-muted disabled:opacity-50 md:text-xs";
  const toolBtnPrimary =
    "shrink-0 whitespace-nowrap rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 md:text-xs";
  const toolSelect =
    "shrink-0 max-w-[7.25rem] rounded-md border border-border bg-background px-1.5 py-1 text-[11px] font-medium md:max-w-[9rem] md:px-2 md:text-xs";

  return (
    <div className={rootClass}>
      <div
        className="flex shrink-0 items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <select
          aria-label="Subject"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className={toolSelect}
        >
          {subjects.map((subject) => {
            const mine = userId && subject.teachers?.some((t) => t.userId === userId);
            return (
              <option key={subject.id} value={subject.id}>
                {subject.name}
                {mine ? " (you teach)" : ""}
              </option>
            );
          })}
        </select>
        <select
          aria-label="Date"
          value={noteDate}
          onChange={(e) => setNoteDate(e.target.value)}
          className={toolSelect}
        >
          {dateOptions.map((d) => (
            <option key={d} value={d}>
              {d === calendarToday ? `Today (${d})` : d}
            </option>
          ))}
        </select>
        {editable && (
          <>
            <button
              type="button"
              disabled={saving || publishing}
              onClick={() => saveDraftToServer().catch(() => undefined)}
              className={toolBtn}
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={saving || publishing}
              onClick={() => publishBoard().catch(() => undefined)}
              className={toolBtnPrimary}
            >
              {publishing ? "…" : isPublished ? "Update" : "Submit"}
            </button>
          </>
        )}
      </div>
      {editable && (
        <p className="shrink-0 text-[10px] text-muted-foreground">
          {isPublished ? "Published" : "Draft"}
          {draftDirty ? " · unsynced" : ""}
        </p>
      )}

      {awaitingPublish && (
        <p className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Today&apos;s class board for {subjectLabel} is not shared yet. Check back after your teacher submits it.
        </p>
      )}

      {error && (
        <p className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {(saving || publishing) && (
        <p className="shrink-0 text-xs text-muted-foreground">
          {publishing ? "Submitting…" : "Saving draft to server…"}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : awaitingPublish ? null : (
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
          <div
            ref={splitRef}
            className="flex min-h-0 flex-1 flex-col md:min-h-[18rem] md:flex-row"
          >
            <div
              className="flex min-h-0 min-w-0 flex-col overflow-hidden"
              style={{ flex: `0 0 ${drawPct}%` }}
            >
              <DrawingBoard
                value={sheet.drawingJson}
                onChange={(drawingJson) => applyChange({ ...sheet, drawingJson })}
                readOnly={!editable}
                className="h-full min-h-0"
              />
            </div>
            <div
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize drawing and written notes"
              className="my-0.5 h-2 w-full shrink-0 cursor-row-resize rounded-full bg-border hover:bg-primary/40 active:bg-primary/60 md:my-0 md:mx-1 md:h-auto md:w-2 md:cursor-col-resize"
              onPointerDown={onSplitPointerDown}
              onPointerMove={onSplitPointerMove}
              onPointerUp={onSplitPointerUp}
              onPointerCancel={onSplitPointerUp}
            />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card shadow-sm">
                <div className="shrink-0 border-b border-border px-3 py-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">Written notes</p>
                </div>
                <textarea
                  value={sheet.content}
                  onChange={(e) => applyChange({ ...sheet, content: e.target.value })}
                  readOnly={!editable}
                  placeholder={`Notes for ${subjectLabel} today…`}
                  className="min-h-0 flex-1 resize-none overflow-y-auto rounded-b-xl bg-muted/20 px-3 py-2 text-sm leading-relaxed outline-none"
                />
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-border py-1.5">
            <div className="flex flex-wrap items-center gap-2">
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
              <p className="text-xs text-muted-foreground">No photos yet.</p>
            ) : (
              <ul className="flex gap-2 overflow-x-auto pb-1">
                {sheet.attachments.map((item) => (
                  <li key={item.id} className="w-28 shrink-0 overflow-hidden rounded-lg border border-border">
                    <img src={item.dataUrl} alt={item.name} className="h-16 w-full object-cover" />
                    <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                      <span className="truncate">{item.name}</span>
                      {editable && (
                        <button
                          type="button"
                          className="text-red-600 hover:underline"
                          onClick={() =>
                            applyChange({
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
        </div>
      )}
    </div>
  );
}
