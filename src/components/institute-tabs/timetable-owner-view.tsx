"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Printer, Settings2 } from "lucide-react";
import { buildInstitutePathFromSearch } from "@/lib/embed-href";

type TimetableView = "class" | "teacher" | "room";

type TimetablePeriod = {
  period_no: number;
  start: string;
  end: string;
  kind: "class" | "break" | "lunch" | "play";
};

type TimetableDay = {
  day: number;
  is_working: boolean;
  half_day?: boolean;
};

type TimetableCell = {
  day: number;
  period_no: number;
  subject_id: string | null;
  subject_name?: string | null;
  teacher_id: string | null;
  teacher_name?: string | null;
  room: string | null;
  status: "ok" | "clash" | "empty" | "locked";
  clash_reason?: string | null;
  locked?: boolean;
};

type TimetablePayload = {
  periods: TimetablePeriod[];
  days: TimetableDay[];
  cells: TimetableCell[];
  draft_saved_at?: string | null;
  published_at?: string | null;
  changed_since_publish?: boolean;
  settings_summary?: string | null;
};

type ClashItem = {
  clash_id: string;
  day: number;
  period_no: number;
  message: string;
};

type TeacherLoadItem = {
  teacher_id: string;
  name: string;
  subject: string;
  periods_used: number;
  periods_needed: number;
};

type Section = { id: string; name: string; className: string };
type Teacher = { userId: string; displayName?: string; username?: string };
type SubjectOption = { id: string; name: string; teachers: { userId: string }[] };

type Absence = {
  id: string;
  teacherId: string;
  absenceDate: string;
  substituteTeacherId: string | null;
  note: string;
};

type SpecialDay = {
  specialDayId: string;
  date: string;
  name: string;
  replacesRegularSchedule: boolean;
};

type SubstitutionItem = {
  teacherId: string;
  note: string;
  periods: { sectionId: string; periodNo: number; substituteTeacherId: string | null }[];
};

type AutoFillPreview = {
  proposedCount: number;
  needsDecisionCount: number;
  proposed: {
    sectionId: string;
    dayOfWeek: number;
    subjectName: string;
    teacherId: string | null;
    selected: boolean;
  }[];
};

const DAY_LABELS: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

const VIEWS: TimetableView[] = ["class", "teacher", "room"];

function formatStatusTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" });
}

function sectionLabel(section: Section) {
  return `${section.className}-${section.name}`;
}

function teacherLabel(teacher: Teacher) {
  return teacher.displayName || teacher.username || teacher.userId;
}

function queryString(campusId: string | null, params: Record<string, string>) {
  const sp = new URLSearchParams(params);
  if (campusId) sp.set("campus_id", campusId);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function TimetableOwnerView({ instituteId }: { instituteId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campusId = searchParams.get("branch");
  const viewParam = searchParams.get("view");
  const view: TimetableView = VIEWS.includes(viewParam as TimetableView)
    ? (viewParam as TimetableView)
    : "class";
  const itemId = searchParams.get("id") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timetable, setTimetable] = useState<TimetablePayload | null>(null);
  const [clashes, setClashes] = useState<ClashItem[]>([]);
  const [teacherLoad, setTeacherLoad] = useState<TeacherLoadItem[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [substitutions, setSubstitutions] = useState<SubstitutionItem[]>([]);
  const [specialDays, setSpecialDays] = useState<SpecialDay[]>([]);
  const [autoFillOpen, setAutoFillOpen] = useState(false);
  const [autoFillPreview, setAutoFillPreview] = useState<AutoFillPreview | null>(null);
  const [autoFillBusy, setAutoFillBusy] = useState(false);
  const [highlightEmpty, setHighlightEmpty] = useState(false);
  const [clashPanelOpen, setClashPanelOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [focusedCell, setFocusedCell] = useState<{ day: number; period_no: number } | null>(null);
  const [editor, setEditor] = useState<{
    day: number;
    period_no: number;
    subject_id: string;
    teacher_id: string;
    room: string;
    locked: boolean;
  } | null>(null);
  const [cellMessage, setCellMessage] = useState("");
  const [savingCell, setSavingCell] = useState(false);

  const replaceQuery = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      router.replace(
        buildInstitutePathFromSearch(instituteId, searchParams, {
          tab: "timetable",
          ...patch,
        })
      );
    },
    [instituteId, router, searchParams]
  );

  const loadCatalog = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const campusQs = campusId ? `?branch=${encodeURIComponent(campusId)}` : "";
    const [sectionsRes, teachersRes, specialDaysRes, absencesRes, substitutionsRes] = await Promise.all([
      fetch(`/api/institutes/${instituteId}/sections`),
      fetch(`/api/institutes/${instituteId}/members?group=teacher`),
      fetch(`/api/institutes/${instituteId}/special-days${campusQs}`),
      fetch(`/api/institutes/${instituteId}/teacher-absences?absence_date=${today}`),
      fetch(`/api/institutes/${instituteId}/timetable/substitutions?substitution_date=${today}${campusId ? `&branch=${campusId}` : ""}`),
    ]);
    if (!sectionsRes.ok || !teachersRes.ok) throw new Error("Could not load timetable options");
    const nextSections = (await sectionsRes.json()) as Section[];
    setSections(nextSections.sort((a, b) => sectionLabel(a).localeCompare(sectionLabel(b))));
    setTeachers(await teachersRes.json());
    if (specialDaysRes.ok) {
      const payload = await specialDaysRes.json();
      setSpecialDays(payload.items ?? []);
    }
    if (absencesRes.ok) setAbsences(await absencesRes.json());
    if (substitutionsRes.ok) {
      const payload = await substitutionsRes.json();
      setSubstitutions(payload.items ?? []);
    }
    return nextSections;
  }, [campusId, instituteId]);

  const loadTimetableBundle = useCallback(
    async (activeView: TimetableView, activeId: string) => {
      if (!activeId) {
        setTimetable(null);
        setClashes([]);
        setTeacherLoad([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      const qs = queryString(campusId, { view: activeView, id: activeId, state: "draft" });
      const [timetableRes, clashesRes, loadRes] = await Promise.all([
        fetch(`/api/institutes/${instituteId}/timetable${qs}`),
        fetch(`/api/institutes/${instituteId}/timetable/clashes${campusId ? `?campus_id=${campusId}` : ""}`),
        fetch(
          `/api/institutes/${instituteId}/timetable/teacher-load${queryString(campusId, {
            view: activeView,
            id: activeId,
          })}`
        ),
      ]);
      if (!timetableRes.ok) {
        const body = await timetableRes.json().catch(() => ({}));
        throw new Error(body.detail || body.error || "Could not load timetable");
      }
      const payload = (await timetableRes.json()) as TimetablePayload;
      setTimetable(payload);
      const roomSet = new Set(
        payload.cells.map((cell) => cell.room).filter((room): room is string => Boolean(room?.trim()))
      );
      setRooms([...roomSet].sort());
      if (clashesRes.ok) {
        const clashPayload = await clashesRes.json();
        setClashes(clashPayload.items ?? []);
      } else {
        setClashes([]);
      }
      if (loadRes.ok) {
        const loadPayload = await loadRes.json();
        setTeacherLoad(loadPayload.items ?? []);
      } else {
        setTeacherLoad([]);
      }
      setLoading(false);
    },
    [campusId, instituteId]
  );

  useEffect(() => {
    loadCatalog()
      .then((nextSections) => {
        if (itemId) return;
        if (view === "class" && nextSections[0]) {
          replaceQuery({ view: "class", id: nextSections[0].id });
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load timetable"));
  }, [itemId, loadCatalog, replaceQuery, view]);

  useEffect(() => {
    if (itemId || view !== "teacher" || !teachers.length) return;
    replaceQuery({ view: "teacher", id: teachers[0].userId });
  }, [itemId, replaceQuery, teachers, view]);

  useEffect(() => {
    if (!itemId) return;
    loadTimetableBundle(view, itemId).catch((e) => {
      setError(e instanceof Error ? e.message : "Could not load timetable");
      setLoading(false);
    });
  }, [itemId, loadTimetableBundle, view]);

  useEffect(() => {
    if (view !== "class" || !itemId) {
      setSubjects([]);
      return;
    }
    fetch(`/api/sections/${itemId}/subjects`)
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: SubjectOption[]) => setSubjects(rows))
      .catch(() => setSubjects([]));
  }, [itemId, view]);

  const itemOptions = useMemo(() => {
    if (view === "class") return sections.map((s) => ({ id: s.id, label: sectionLabel(s) }));
    if (view === "teacher") return teachers.map((t) => ({ id: t.userId, label: teacherLabel(t) }));
    return rooms.map((room) => ({ id: room, label: room }));
  }, [rooms, sections, teachers, view]);

  const selectedItemLabel =
    itemOptions.find((item) => item.id === itemId)?.label || "Select item";

  const emptyCount = timetable?.cells.filter((cell) => cell.status === "empty").length ?? 0;
  const clashCount = clashes.length > 0 ? clashes.length : timetable?.cells.filter((c) => c.status === "clash").length ?? 0;

  const workingDays = useMemo(
    () => (timetable?.days ?? []).filter((day) => day.is_working),
    [timetable]
  );

  const settingsLine =
    timetable?.settings_summary ||
    "Open period settings in Advanced slot layout below";

  const statusPill = timetable?.published_at && !timetable.changed_since_publish
    ? `Published · ${formatStatusTime(timetable.published_at)}`
    : timetable?.draft_saved_at
      ? `Draft saved · ${formatStatusTime(timetable.draft_saved_at)}`
      : "Draft";

  async function previewAutoFill() {
    setAutoFillBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/institutes/${instituteId}/timetable/auto-fill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accept: false,
          campusId: campusId,
          sectionIds: view === "class" && itemId ? [itemId] : [],
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.detail || body.error || "Could not preview auto-fill");
        return;
      }
      setAutoFillPreview(body as AutoFillPreview);
      setAutoFillOpen(true);
    } catch {
      setError("Could not preview auto-fill");
    } finally {
      setAutoFillBusy(false);
    }
  }

  async function acceptAutoFill() {
    if (!autoFillPreview?.proposed.length) {
      setAutoFillOpen(false);
      return;
    }
    setAutoFillBusy(true);
    try {
      const res = await fetch(`/api/institutes/${instituteId}/timetable/auto-fill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accept: true,
          campusId: campusId,
          proposed: autoFillPreview.proposed,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.detail || body.error || "Could not apply auto-fill");
        return;
      }
      setAutoFillOpen(false);
      setAutoFillPreview(null);
      if (itemId) await loadTimetableBundle(view, itemId);
    } catch {
      setError("Could not apply auto-fill");
    } finally {
      setAutoFillBusy(false);
    }
  }

  async function publishTimetable() {
    setPublishing(true);
    setError("");
    try {
      const res = await fetch(`/api/institutes/${instituteId}/timetable/publish`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.detail || body.error || "Could not publish timetable");
        return;
      }
      setPublishOpen(false);
      await loadTimetableBundle(view, itemId);
    } catch {
      setError("Could not publish timetable");
    } finally {
      setPublishing(false);
    }
  }

  function openEditor(cell: TimetableCell) {
    setCellMessage("");
    setEditor({
      day: cell.day,
      period_no: cell.period_no,
      subject_id: cell.subject_id || "",
      teacher_id: cell.teacher_id || "",
      room: cell.room || "",
      locked: cell.locked ?? cell.status === "locked",
    });
  }

  async function saveCell(clear = false) {
    if (!editor || !itemId) return;
    setSavingCell(true);
    setCellMessage("");
    try {
      const res = await fetch(
        `/api/institutes/${instituteId}/timetable/cells${campusId ? `?campus_id=${campusId}` : ""}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            view,
            id: itemId,
            day: editor.day,
            period_no: editor.period_no,
            subject_id: clear ? null : editor.subject_id || null,
            teacher_id: clear ? null : editor.teacher_id || null,
            room: clear ? null : editor.room || null,
            locked: editor.locked,
            campus_id: campusId,
          }),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCellMessage(body.detail || body.message || "Could not save cell");
        return;
      }
      setEditor(null);
      await loadTimetableBundle(view, itemId);
    } catch {
      setCellMessage("Could not save cell");
    } finally {
      setSavingCell(false);
    }
  }

  const editorTeachers = useMemo(() => {
    if (!editor?.subject_id) return [];
    const subject = subjects.find((item) => item.id === editor.subject_id);
    if (!subject) return [];
    return subject.teachers
      .map((row) => teachers.find((t) => t.userId === row.userId))
      .filter(Boolean) as Teacher[];
  }, [editor?.subject_id, subjects, teachers]);

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Timetable</p>
          <h2 className="mt-1 text-xl font-semibold">Weekly timetable</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <a href="#advanced-slot-layout" className="inline-flex items-center gap-1 text-primary hover:underline">
              <Settings2 className="h-3.5 w-3.5" aria-hidden />
              Settings: {settingsLine}
            </a>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {statusPill}
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden />
            Print / PDF
          </button>
          <button
            type="button"
            disabled={autoFillBusy || view !== "class" || !itemId}
            onClick={() => void previewAutoFill()}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium disabled:opacity-50"
          >
            Auto-fill
          </button>
          <button
            type="button"
            disabled={clashCount > 0 || publishing}
            title={clashCount > 0 ? `Fix ${clashCount} clashes before you publish.` : undefined}
            onClick={() => setPublishOpen(true)}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </div>

      {!timetable?.published_at && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Staff and students only see this timetable after you tap <strong>Publish</strong>. Fix clashes first
          (for example subject period limits).
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">
          View by
          <select
            value={view}
            onChange={(e) => replaceQuery({ view: e.target.value, id: null })}
            className="ml-2 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="class">Class</option>
            <option value="teacher">Teacher</option>
            <option value="room">Room</option>
          </select>
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Item
          <select
            value={itemId}
            onChange={(e) => replaceQuery({ id: e.target.value })}
            className="ml-2 min-w-[10rem] rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          >
            {!itemOptions.length && <option value="">No items</option>}
            {itemOptions.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        {clashCount > 0 && (
          <button
            type="button"
            onClick={() => setClashPanelOpen((open) => !open)}
            className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
          >
            {clashCount} clash{clashCount === 1 ? "" : "es"}
          </button>
        )}
        {emptyCount > 0 && (
          <button
            type="button"
            onClick={() => setHighlightEmpty((on) => !on)}
            className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
          >
            {emptyCount} empty period{emptyCount === 1 ? "" : "s"}
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 overflow-x-auto">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="h-14 animate-pulse rounded-lg bg-muted/50" />
              ))}
            </div>
          ) : !timetable ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Choose a {view} to load the timetable.
            </p>
          ) : (
            <div className="min-w-[720px]">
              <div
                className="grid gap-px overflow-hidden rounded-lg border border-border bg-border"
                style={{ gridTemplateColumns: `100px repeat(${workingDays.length}, minmax(120px, 1fr))` }}
              >
                <div className="bg-muted/60 px-2 py-2 text-[11px] font-semibold uppercase text-muted-foreground">
                  {selectedItemLabel}
                </div>
                {workingDays.map((day) => (
                  <div key={day.day} className="bg-muted/60 px-2 py-2 text-center text-xs font-semibold">
                    {DAY_LABELS[day.day] ?? day.day}
                    {day.half_day ? " (½)" : ""}
                  </div>
                ))}
              </div>
              <div className="mt-1 space-y-1">
                {timetable.periods.map((period) => {
                  const isBreak = period.kind !== "class";
                  if (isBreak) {
                    return (
                      <div
                        key={period.period_no}
                        className="grid min-w-[720px] gap-1"
                        style={{ gridTemplateColumns: `100px repeat(${workingDays.length}, minmax(120px, 1fr))` }}
                      >
                        <div className="rounded-lg bg-amber-50 px-2 py-2 text-xs font-medium text-amber-900">
                          {period.start}–{period.end}
                          <p className="text-[10px] capitalize">{period.kind}</p>
                        </div>
                        <div
                          className="col-span-full rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-center text-xs font-medium text-amber-900"
                          style={{ gridColumn: `2 / span ${workingDays.length}` }}
                        >
                          {period.kind}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={period.period_no}
                      className="grid min-w-[720px] gap-1"
                      style={{ gridTemplateColumns: `100px repeat(${workingDays.length}, minmax(120px, 1fr))` }}
                    >
                      <div className="rounded-lg bg-muted/40 px-2 py-2 text-xs">
                        <p className="font-medium">{period.start}–{period.end}</p>
                        <p className="text-[10px] text-muted-foreground">P{period.period_no}</p>
                      </div>
                      {workingDays.map((day) => {
                        const cell = timetable.cells.find(
                          (item) => item.day === day.day && item.period_no === period.period_no
                        );
                        const status = cell?.status ?? "empty";
                        const highlighted =
                          (highlightEmpty && status === "empty") ||
                          (focusedCell?.day === day.day &&
                            focusedCell?.period_no === period.period_no);
                        return (
                          <button
                            key={`${day.day}-${period.period_no}`}
                            type="button"
                            disabled={!cell}
                            onClick={() => cell && openEditor(cell)}
                            className={`min-h-[68px] rounded-lg border p-2 text-left text-xs transition hover:border-primary disabled:cursor-default disabled:opacity-70 ${
                              status === "clash"
                                ? "border-red-300 bg-red-50"
                                : status === "empty"
                                  ? highlightEmpty
                                    ? "border-amber-400 bg-amber-50"
                                    : "border-dashed border-border bg-background"
                                  : "border-border bg-background"
                            } ${highlighted ? "ring-2 ring-primary/40" : ""}`}
                          >
                            {cell?.subject_name ? (
                              <>
                                <span className="block font-semibold">{cell.subject_name}</span>
                                {cell.teacher_name && (
                                  <span className="mt-0.5 block text-[10px] text-muted-foreground">{cell.teacher_name}</span>
                                )}
                                {cell.room && (
                                  <span className="mt-0.5 block text-[10px] text-muted-foreground">{cell.room}</span>
                                )}
                                {cell.locked && <span className="text-[10px] text-muted-foreground">Locked</span>}
                              </>
                            ) : (
                              <span className="text-muted-foreground">+ Assign</span>
                            )}
                            {status === "clash" && cell?.clash_reason && (
                              <span className="mt-1 block text-[10px] text-red-700">{cell.clash_reason}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <div className="rounded-lg border border-border bg-background/80 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {view === "class" ? `Teachers for ${selectedItemLabel}` : "Teacher load"}
            </h3>
            {teacherLoad.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">No load data yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {teacherLoad.map((row) => {
                  const over = row.periods_used > row.periods_needed;
                  const under = row.periods_used < row.periods_needed;
                  return (
                    <li key={row.teacher_id} className="text-xs">
                      <p className="font-medium">{row.name}</p>
                      <p className={over ? "text-red-700" : under ? "text-amber-700" : "text-muted-foreground"}>
                        {row.subject} · {row.periods_used} / {row.periods_needed} periods
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {(clashPanelOpen || clashes.length > 0) && (
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
              <h3 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-red-800">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                Clashes
              </h3>
              {clashes.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">No clashes reported.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {clashes.map((clash) => (
                    <li key={clash.clash_id}>
                      <button
                        type="button"
                        className="text-left text-xs text-red-900 hover:underline"
                        onClick={() => {
                          setFocusedCell({ day: clash.day, period_no: clash.period_no });
                          setClashPanelOpen(true);
                        }}
                      >
                        {clash.message}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="rounded-lg border border-border bg-background/80 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Substitutions · today
            </h3>
            {substitutions.length === 0 && absences.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">No one is on leave today.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-xs">
                {substitutions.map((row) => (
                  <li key={row.teacherId}>
                    <p className="font-medium">
                      {teachers.find((t) => t.userId === row.teacherId)?.displayName || row.teacherId}
                    </p>
                    <p className="text-muted-foreground">
                      {row.note || "Absent"} · {row.periods.length} period(s) to cover
                    </p>
                  </li>
                ))}
                {substitutions.length === 0 &&
                  absences.map((row) => (
                    <li key={row.id}>
                      <p className="font-medium">
                        {teachers.find((t) => t.userId === row.teacherId)?.displayName || row.teacherId}
                      </p>
                      <p className="text-muted-foreground">
                        {row.note || "Absent"}
                        {row.substituteTeacherId
                          ? ` · Cover: ${teachers.find((t) => t.userId === row.substituteTeacherId)?.displayName || row.substituteTeacherId}`
                          : " · Needs cover"}
                      </p>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-border bg-background/80 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Special days</h3>
            {specialDays.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">No special days this year.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-xs">
                {specialDays.map((day) => (
                  <li key={day.specialDayId}>
                    <p className="font-medium">{day.name}</p>
                    <p className="text-muted-foreground">
                      {day.date}
                      {day.replacesRegularSchedule ? " · replaces regular schedule" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-lg">
            <h3 className="text-sm font-semibold">
              Edit cell · {DAY_LABELS[editor.day]} P{editor.period_no}
            </h3>
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-medium text-muted-foreground">
                Subject
                <select
                  value={editor.subject_id}
                  onChange={(e) =>
                    setEditor((current) =>
                      current ? { ...current, subject_id: e.target.value, teacher_id: "" } : current
                    )
                  }
                  disabled={view !== "class"}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-muted-foreground">
                Teacher
                <select
                  value={editor.teacher_id}
                  onChange={(e) => setEditor((c) => (c ? { ...c, teacher_id: e.target.value } : c))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select teacher</option>
                  {editorTeachers.map((teacher) => (
                    <option key={teacher.userId} value={teacher.userId}>{teacherLabel(teacher)}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-muted-foreground">
                Room
                <input
                  value={editor.room}
                  maxLength={30}
                  onChange={(e) => setEditor((c) => (c ? { ...c, room: e.target.value } : c))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={editor.locked}
                  onChange={(e) => setEditor((c) => (c ? { ...c, locked: e.target.checked } : c))}
                />
                Lock cell
              </label>
              {cellMessage && <p className="text-xs text-destructive">{cellMessage}</p>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={savingCell || (editor.locked && !editor.subject_id)}
                onClick={() => void saveCell(false)}
                className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
              >
                {savingCell ? "Saving…" : "Save cell"}
              </button>
              <button
                type="button"
                disabled={savingCell || editor.locked}
                title={editor.locked ? "This cell is locked." : undefined}
                onClick={() => void saveCell(true)}
                className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
              >
                Clear cell
              </button>
              <button type="button" onClick={() => setEditor(null)} className="rounded-lg px-3 py-2 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {autoFillOpen && autoFillPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-lg">
            <h3 className="text-sm font-semibold">Auto-fill preview</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {autoFillPreview.proposedCount} slots proposed
              {autoFillPreview.needsDecisionCount ? ` · ${autoFillPreview.needsDecisionCount} need a decision` : ""}
            </p>
            <ul className="mt-3 space-y-2 text-xs">
              {autoFillPreview.proposed.slice(0, 12).map((row, index) => (
                <li key={`${row.sectionId}-${row.dayOfWeek}-${index}`} className="rounded-lg border border-border px-2 py-1.5">
                  {sections.find((s) => s.id === row.sectionId)?.className || row.sectionId} · {DAY_LABELS[row.dayOfWeek]} ·{" "}
                  {row.subjectName || "Subject"}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={autoFillBusy}
                onClick={() => void acceptAutoFill()}
                className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
              >
                {autoFillBusy ? "Applying…" : "Apply fill"}
              </button>
              <button type="button" onClick={() => setAutoFillOpen(false)} className="rounded-lg border border-border px-3 py-2 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {publishOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-lg">
            <h3 className="text-sm font-semibold">Publish timetable?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Teachers, students and parents will see this version after publish.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={publishing}
                onClick={() => void publishTimetable()}
                className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
              >
                {publishing ? "Publishing…" : "Publish"}
              </button>
              <button type="button" onClick={() => setPublishOpen(false)} className="rounded-lg border border-border px-3 py-2 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
