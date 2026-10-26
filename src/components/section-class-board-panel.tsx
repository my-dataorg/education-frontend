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
    const x = e.clientX - rect.left;
    const pct = (x / rect.width) * 100;
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

  const desktopFill = fillHeight;

  const rootClass = desktopFill
    ? "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden max-md:space-y-3 max-md:overflow-visible"
    : "space-y-3 md:space-y-4";

  const splitClass = desktopFill
    ? "hidden min-h-0 flex-1 w-full md:flex"
    : "hidden h-[min(70vh,32rem)] min-h-[18rem] w-full md:flex";

  const mobileBoardClass = "h-[min(48dvh,20rem)] min-h-[12rem]";
  const mobileNotesClass = "min-h-[9rem] h-[min(36dvh,14rem)]";

  return (
    <div className={rootClass}>
      <div
        className={`flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${
          desktopFill ? "sm:items-center" : ""
        }`}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{subjectLabel} — class board</p>
          {!desktopFill && (
            <p className="text-xs text-muted-foreground">
              {editable
                ? "Draft saves on this device. Server backup every 15 minutes. Submit when students and families should see it."
                : awaitingPublish
                  ? "The teacher has not shared today’s board yet."
                  : noteDate === calendarToday
                    ? teachesSubject
                      ? "Read-only. Confirm today’s date matches the server, or refresh the page."
                      : "Read-only. You are not assigned to teach this subject in this class—pick a subject you teach or ask an admin to assign you under Subjects."
                    : "Past boards are read-only."}
            </p>
          )}
          {editable && (
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground md:truncate">
              <span className="font-medium">{isPublished ? "Published" : "Draft"}</span>
              {draftDirty ? " · unsynced" : ""}
              <span className="hidden sm:inline">
                {lastLocalSave ? ` · Device ${formatTime(lastLocalSave)}` : ""}
                {lastServerSave ? ` · Server ${formatTime(lastServerSave)}` : ""}
              </span>
            </p>
          )}
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:max-w-md sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted-foreground">
            Subject
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
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
          </label>
          <label className="text-xs font-semibold text-muted-foreground sm:col-span-2 md:col-span-1">
            Date
            <select
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              {dateOptions.map((d) => (
                <option key={d} value={d}>
                  {d === calendarToday ? `Today (${d})` : d}
                </option>
              ))}
            </select>
          </label>
          {editable && (
            <div className="grid grid-cols-2 gap-2 sm:col-span-2">
              <button
                type="button"
                disabled={saving || publishing}
                onClick={() => saveDraftToServer().catch(() => undefined)}
                className="rounded-lg border border-border px-3 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Save draft
              </button>
              <button
                type="button"
                disabled={saving || publishing}
                onClick={() => publishBoard().catch(() => undefined)}
                className="rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {publishing ? "Submitting…" : isPublished ? "Submit updates" : "Submit to class"}
              </button>
            </div>
          )}
        </div>
      </div>

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
        <div
          className={
            desktopFill
              ? "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden max-md:space-y-3 max-md:overflow-visible"
              : "space-y-3"
          }
        >
          <div ref={splitRef} className={splitClass}>
            <div className="flex min-h-0 min-w-0 flex-col" style={{ width: `${drawPct}%` }}>
              <DrawingBoard
                value={sheet.drawingJson}
                onChange={(drawingJson) => applyChange({ ...sheet, drawingJson })}
                readOnly={!editable}
              />
            </div>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize drawing and written notes"
              className="mx-1 w-2 shrink-0 cursor-col-resize rounded-full bg-border hover:bg-primary/40 active:bg-primary/60"
              onPointerDown={onSplitPointerDown}
              onPointerMove={onSplitPointerMove}
              onPointerUp={onSplitPointerUp}
              onPointerCancel={onSplitPointerUp}
            />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card shadow-sm">
                <div className="shrink-0 border-b border-border px-3 py-2">
                  <p className="text-xs font-semibold text-muted-foreground">Written notes</p>
                  <p className="text-[11px] text-muted-foreground/80">Type homework, reminders, or lesson points.</p>
                </div>
                <textarea
                  value={sheet.content}
                  onChange={(e) => applyChange({ ...sheet, content: e.target.value })}
                  readOnly={!editable}
                  placeholder={`Notes for ${subjectLabel} today…`}
                  className="min-h-0 flex-1 resize-none overflow-y-auto rounded-b-xl bg-muted/20 px-3 py-3 text-sm leading-relaxed outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            <DrawingBoard
              value={sheet.drawingJson}
              onChange={(drawingJson) => applyChange({ ...sheet, drawingJson })}
              readOnly={!editable}
              className={mobileBoardClass}
            />
            <div
              className={`flex flex-col rounded-xl border border-border bg-card shadow-sm ${mobileNotesClass}`}
            >
              <div className="border-b border-border px-3 py-2">
                <p className="text-xs font-semibold text-muted-foreground">Written notes</p>
              </div>
              <textarea
                value={sheet.content}
                onChange={(e) => applyChange({ ...sheet, content: e.target.value })}
                readOnly={!editable}
                placeholder={`Notes for ${subjectLabel} today…`}
                className="min-h-0 flex-1 resize-none overflow-y-auto rounded-b-xl bg-transparent px-3 py-3 text-sm outline-none"
              />
            </div>
          </div>

          <div className="shrink-0 space-y-2 border-t border-border pt-3">
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
