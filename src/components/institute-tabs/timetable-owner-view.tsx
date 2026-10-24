"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Printer, Settings2 } from "lucide-react";
import { buildInstitutePathFromSearch } from "@/lib/embed-href";
import { parseOwnerTimetable, type OwnerTimetablePayload } from "@/lib/timetable-api";

type TimetableView = "class" | "teacher" | "room" | "school";

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
  cell_source?: "class_override" | "school_default" | null;
};

type TimetablePayload = OwnerTimetablePayload;

type ClashItem = {
  clash_id: string;
  day: number;
  period_no: number;
  message: string;
};

type PeriodLimitWarning = {
  warning_id: string;
  message: string;
  section_ids?: string[];
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

function breakRowLabel(period: { kind: string; label?: string }) {
  if (period.label?.trim()) return period.label.trim();
  if (period.kind === "lunch") return "Lunch";
  if (period.kind === "play") return "Activity";
  return "Break";
}

function queryString(campusId: string | null, params: Record<string, string>) {
  const sp = new URLSearchParams(params);
  if (campusId) sp.set("campus_id", campusId);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

type RosterTeacher = { userId: string; displayName?: string; username?: string };

export function TimetableOwnerView({
  instituteId,
  embedded = false,
  fixedSectionId,
  canEdit = true,
}: {
  instituteId: string;
  embedded?: boolean;
  fixedSectionId?: string;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campusId = searchParams.get("branch");
  const viewParam = searchParams.get("view");
  const view: TimetableView =
    embedded && fixedSectionId
      ? "class"
      : viewParam === "school"
        ? "school"
        : VIEWS.includes(viewParam as TimetableView)
          ? (viewParam as TimetableView)
          : "class";
  const itemId = embedded && fixedSectionId ? fixedSectionId : searchParams.get("id") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timetable, setTimetable] = useState<TimetablePayload | null>(null);
  const [clashes, setClashes] = useState<ClashItem[]>([]);
  const [periodWarnings, setPeriodWarnings] = useState<PeriodLimitWarning[]>([]);
  const [teacherLoad, setTeacherLoad] = useState<TeacherLoadItem[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [configuredRooms, setConfiguredRooms] = useState<{ id: string; name: string }[]>([]);
  const [roomsUsedInTimetable, setRoomsUsedInTimetable] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [sectionRosterTeachers, setSectionRosterTeachers] = useState<RosterTeacher[]>([]);
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
  const [publishMessage, setPublishMessage] = useState("");
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
    const [sectionsRes, teachersRes, roomsRes, specialDaysRes, absencesRes, substitutionsRes] =
      await Promise.all([
      fetch(`/api/institutes/${instituteId}/sections`),
      fetch(`/api/institutes/${instituteId}/members?group=teacher`),
      fetch(`/api/institutes/${instituteId}/rooms`),
      fetch(`/api/institutes/${instituteId}/special-days${campusQs}`),
      fetch(`/api/institutes/${instituteId}/teacher-absences?absence_date=${today}`),
      fetch(`/api/institutes/${instituteId}/timetable/substitutions?substitution_date=${today}${campusId ? `&branch=${campusId}` : ""}`),
    ]);
    if (!sectionsRes.ok || !teachersRes.ok) throw new Error("Could not load timetable options");
    const nextSections = (await sectionsRes.json()) as Section[];
    setSections(nextSections.sort((a, b) => sectionLabel(a).localeCompare(sectionLabel(b))));
    setTeachers(await teachersRes.json());
    setConfiguredRooms(roomsRes.ok ? await roomsRes.json() : []);
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
      if (!activeId && activeView !== "school") {
        setTimetable(null);
        setClashes([]);
        setPeriodWarnings([]);
        setTeacherLoad([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      const qs =
        activeView === "school"
          ? queryString(campusId, { view: "school", state: "draft" })
          : queryString(campusId, { view: activeView, id: activeId, state: "draft" });
      const timetableRes = await fetch(`/api/institutes/${instituteId}/timetable${qs}`);
      const clashesRes = await fetch(
        `/api/institutes/${instituteId}/timetable/clashes${campusId ? `?campus_id=${campusId}` : ""}`
      );
      const warningsRes = embedded
        ? null
        : await fetch(
            `/api/institutes/${instituteId}/timetable/period-limit-warnings${campusId ? `?campus_id=${campusId}` : ""}`
          );
      const loadRes = embedded
        ? null
        : await fetch(
            `/api/institutes/${instituteId}/timetable/teacher-load${queryString(campusId, {
              view: activeView,
              id: activeId,
            })}`
          );
      if (!timetableRes.ok) {
        const body = await timetableRes.json().catch(() => ({}));
        throw new Error(body.detail || body.error || "Could not load timetable");
      }
      const payload = parseOwnerTimetable((await timetableRes.json()) as Record<string, unknown>);
      setTimetable(payload);
      const roomSet = new Set(
        payload.cells.map((cell) => cell.room).filter((room): room is string => Boolean(room?.trim()))
      );
      setRoomsUsedInTimetable([...roomSet].sort());
      if (clashesRes.ok) {
        const clashPayload = await clashesRes.json();
        const items = (clashPayload.items ?? []) as Record<string, unknown>[];
        setClashes(
          items.map((clash) => ({
            clash_id: String(clash.clashId ?? clash.clash_id ?? ""),
            day: Number(clash.day),
            period_no: Number(clash.periodNo ?? clash.period_no ?? 0),
            message: String(clash.message ?? ""),
          }))
        );
      } else {
        setClashes([]);
      }
      if (embedded) {
        setPeriodWarnings([]);
        setTeacherLoad([]);
      } else {
        if (warningsRes?.ok) {
          const warningPayload = await warningsRes.json();
          setPeriodWarnings(warningPayload.items ?? []);
        } else {
          setPeriodWarnings([]);
        }
        if (loadRes?.ok) {
          const loadPayload = await loadRes.json();
          setTeacherLoad(loadPayload.items ?? []);
        } else {
          setTeacherLoad([]);
        }
      }
      setLoading(false);
    },
    [campusId, embedded, instituteId]
  );

  useEffect(() => {
    if (embedded) return;
    loadCatalog()
      .then((nextSections) => {
        if (itemId) return;
        if (view === "school") {
          loadTimetableBundle("school", "school").catch(() => undefined);
          return;
        }
        if (view === "class" && nextSections[0]) {
          replaceQuery({ view: "class", id: nextSections[0].id });
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load timetable"));
  }, [embedded, itemId, loadCatalog, loadTimetableBundle, replaceQuery, view]);

  useEffect(() => {
    if (itemId || view !== "teacher" || !teachers.length) return;
    replaceQuery({ view: "teacher", id: teachers[0].userId });
  }, [itemId, replaceQuery, teachers, view]);

  useEffect(() => {
    if (view === "school") {
      loadTimetableBundle("school", "school").catch((e) => {
        setError(e instanceof Error ? e.message : "Could not load timetable");
        setLoading(false);
      });
      return;
    }
    if (!itemId) return;
    loadTimetableBundle(view, itemId).catch((e) => {
      setError(e instanceof Error ? e.message : "Could not load timetable");
      setLoading(false);
    });
  }, [itemId, loadTimetableBundle, view]);

  useEffect(() => {
    if (view === "school") {
      fetch(`/api/institutes/${instituteId}/subjects`)
        .then((res) => (res.ok ? res.json() : []))
        .then((rows: { id: string; name: string }[]) =>
          setSubjects(rows.map((s) => ({ id: s.id, name: s.name, teachers: [] })))
        )
        .catch(() => setSubjects([]));
      return;
    }
    if (view !== "class" || !itemId) {
      setSubjects([]);
      return;
    }
    fetch(`/api/sections/${itemId}/subjects`)
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: SubjectOption[]) => setSubjects(rows))
      .catch(() => setSubjects([]));
  }, [instituteId, itemId, view]);

  useEffect(() => {
    if (view !== "class" || !itemId) {
      setSectionRosterTeachers([]);
      return;
    }
    fetch(`/api/sections/${itemId}`, { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { teachers?: RosterTeacher[] } | null) =>
        setSectionRosterTeachers(data?.teachers ?? [])
      )
      .catch(() => setSectionRosterTeachers([]));
  }, [itemId, view]);

  const roomNamesForView = useMemo(() => {
    const names = new Set([
      ...configuredRooms.map((r) => r.name),
      ...roomsUsedInTimetable,
    ]);
    return [...names].sort();
  }, [configuredRooms, roomsUsedInTimetable]);

  const editorRoomOptions = useMemo(() => {
    const names = new Set(configuredRooms.map((r) => r.name));
    if (editor?.room?.trim()) names.add(editor.room.trim());
    return [...names].sort();
  }, [configuredRooms, editor?.room]);

  const itemOptions = useMemo(() => {
    if (view === "class") return sections.map((s) => ({ id: s.id, label: sectionLabel(s) }));
    if (view === "teacher") return teachers.map((t) => ({ id: t.userId, label: teacherLabel(t) }));
    return roomNamesForView.map((room) => ({ id: room, label: room }));
  }, [roomNamesForView, sections, teachers, view]);

  const selectedItemLabel =
    view === "school"
      ? "School default"
      : itemOptions.find((item) => item.id === itemId)?.label || "Select item";

  const emptyCount = timetable?.cells.filter((cell) => cell.status === "empty").length ?? 0;
  const clashCount =
    clashes.length > 0 ? clashes.length : timetable?.cells.filter((c) => c.status === "clash").length ?? 0;
  const periodWarningCount = periodWarnings.length;

  const workingDays = useMemo(
    () => (timetable?.days ?? []).filter((day) => day.is_working),
    [timetable]
  );

  const settingsLine =
    timetable?.settings_summary ||
    "Open period settings in Advanced slot layout below";

  const statusPill = timetable?.published_at && !timetable.changed_since_publish
    ? `Published · ${formatStatusTime(timetable.published_at)}`
    : timetable?.published_at && timetable.changed_since_publish
      ? `Draft · unpublished changes`
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
      const publishedAt = body.publishedAt ?? body.published_at;
      setPublishMessage(
        publishedAt
          ? `Timetable published. Teachers and students now see this version (as of ${formatStatusTime(String(publishedAt))}).`
          : "Timetable published. Teachers and students can see this version now."
      );
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

  async function applySchoolDefaults(mode: "fill_empty" | "override_all") {
    const label =
      mode === "override_all"
        ? "Replace every class cell with the school default where the subject is linked?"
        : "Fill empty class periods from the school default template?";
    if (!window.confirm(label)) return;
    setError("");
    try {
      const res = await fetch(`/api/institutes/${instituteId}/timetable/apply-school-defaults`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.detail || "Could not apply school defaults");
        return;
      }
      if (view === "school") await loadTimetableBundle("school", "school");
      else if (itemId) await loadTimetableBundle(view, itemId);
    } catch {
      setError("Could not apply school defaults");
    }
  }

  async function saveCell(clear = false) {
    if (!editor || (view !== "school" && !itemId)) return;
    const period = timetable?.periods.find((p) => p.period_no === editor.period_no);
    const slotId = period?.slot_id;
    if (!slotId) {
      setCellMessage("Could not resolve period slot");
      return;
    }
    setSavingCell(true);
    setCellMessage("");
    setPublishMessage("");
    try {
      const url =
        view === "school"
          ? `/api/institutes/${instituteId}/timetable/school-cells`
          : `/api/institutes/${instituteId}/timetable/cells${campusId ? `?campus_id=${campusId}` : ""}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          view === "school"
            ? {
                dayOfWeek: editor.day,
                slotId,
                subjectId: clear ? null : editor.subject_id || null,
                teacherId: clear ? null : editor.teacher_id || null,
                room: clear ? null : editor.room || null,
                clear,
              }
            : {
                sectionId: itemId,
                dayOfWeek: editor.day,
                slotId,
                subjectId: clear ? null : editor.subject_id || null,
                teacherId: clear ? null : editor.teacher_id || null,
                room: clear ? null : editor.room || null,
                locked: editor.locked,
                clear,
              }
        ),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCellMessage(body.detail || body.message || "Could not save cell");
        return;
      }
      setEditor(null);
      if (view === "school") await loadTimetableBundle("school", "school");
      else await loadTimetableBundle(view, itemId);
    } catch {
      setCellMessage("Could not save cell");
    } finally {
      setSavingCell(false);
    }
  }

  function resolveTeacherName(cell: TimetableCell) {
    if (cell.teacher_name?.trim()) return cell.teacher_name.trim();
    if (!cell.teacher_id) return "";
    const fromCatalog = teachers.find((t) => t.userId === cell.teacher_id);
    if (fromCatalog) return teacherLabel(fromCatalog);
    const fromRoster = sectionRosterTeachers.find((t) => t.userId === cell.teacher_id);
    if (fromRoster) {
      return fromRoster.displayName || fromRoster.username || fromRoster.userId;
    }
    return "";
  }

  const editorTeachers = useMemo(() => {
    if (view === "school") return teachers;
    if (view === "class" && itemId) {
      return sectionRosterTeachers.map((member) => {
        const fromCatalog = teachers.find((t) => t.userId === member.userId);
        return (
          fromCatalog ?? {
            userId: member.userId,
            displayName: member.displayName,
            username: member.username,
          }
        );
      });
    }
    return [];
  }, [itemId, sectionRosterTeachers, teachers, view]);

  return (
    <section
      className={
        embedded
          ? "flex min-h-0 w-full flex-1 flex-col overflow-hidden"
          : "rounded-xl border border-border bg-card p-4 shadow-sm"
      }
    >
      {!embedded && (
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
            title={clashCount > 0 ? `Fix ${clashCount} scheduling clash(es) before you publish.` : undefined}
            onClick={() => setPublishOpen(true)}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </div>
      )}


      {!embedded && !timetable?.published_at && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Staff and students only see this timetable after you tap <strong>Publish</strong>. You must fix
          scheduling clashes (same teacher, room, or class at the same time) before publishing. Weekly period
          limits are shown as warnings and do not block publish.
        </p>
      )}

      {timetable?.published_at && timetable.changed_since_publish && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You have <strong>unpublished changes</strong> in this draft. Teachers and students still see the last
          published version until you publish again.
        </p>
      )}

      {publishMessage && (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {publishMessage}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {!embedded && (
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <>
        <label className="text-xs font-medium text-muted-foreground">
          View by
          <select
            value={view}
            onChange={(e) => replaceQuery({ view: e.target.value, id: null })}
            className="ml-2 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="class">Class</option>
            <option value="school">School default</option>
            <option value="teacher">Teacher</option>
            <option value="room">Room</option>
          </select>
        </label>
        {view !== "school" && (
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
        )}
        {view === "school" && (
          <>
            <button
              type="button"
              onClick={() => void applySchoolDefaults("fill_empty")}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium"
            >
              Apply to empty classes
            </button>
            <button
              type="button"
              onClick={() => void applySchoolDefaults("override_all")}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900"
            >
              Override all classes
            </button>
          </>
        )}
        </>
        {clashCount > 0 && (
          <button
            type="button"
            onClick={() => setClashPanelOpen((open) => !open)}
            className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
          >
            {clashCount} scheduling clash{clashCount === 1 ? "" : "es"}
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
      )}

      {embedded && clashCount > 0 && (
        <p className="mb-2 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-800">
          {clashCount} scheduling clash{clashCount === 1 ? "" : "es"} — fix before publishing.
        </p>
      )}

      <div
        className={
          embedded ? "mt-0 flex min-h-0 flex-1 flex-col overflow-hidden" : "mt-4 grid gap-4 lg:grid-cols-[1fr_280px]"
        }
      >
        <div className={`min-w-0 ${embedded ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "overflow-x-auto"}`}>
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
            <div
              className={
                embedded
                  ? "flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-lg border border-border"
                  : "min-w-[720px]"
              }
            >
              <div
                className={`grid shrink-0 gap-px overflow-hidden bg-border ${embedded ? "border-b border-border" : "rounded-t-lg border border-border"}`}
                style={{
                  gridTemplateColumns: embedded
                    ? `5.25rem repeat(${workingDays.length}, minmax(0, 1fr))`
                    : `100px repeat(${workingDays.length}, minmax(120px, 1fr))`,
                }}
              >
                <div
                  className={`bg-muted/60 font-semibold uppercase text-muted-foreground ${
                    embedded ? "px-1.5 py-1.5 text-xs" : "px-2 py-2 text-[11px]"
                  }`}
                >
                  {embedded ? "Time" : selectedItemLabel}
                </div>
                {workingDays.map((day) => (
                  <div
                    key={day.day}
                    className={`bg-muted/60 text-center font-semibold ${
                      embedded ? "px-1.5 py-1.5 text-xs" : "px-2 py-2 text-xs"
                    }`}
                  >
                    {DAY_LABELS[day.day] ?? day.day}
                    {day.half_day ? " (½)" : ""}
                  </div>
                ))}
              </div>
              <div
                className={
                  embedded ? "flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden" : "mt-1 space-y-1"
                }
              >
                {timetable.periods.map((period) => {
                  const rowKey = period.slot_id ?? `p${period.period_no}`;
                  const isBreak = period.kind !== "class";
                  const rowGridStyle = {
                    gridTemplateColumns: embedded
                      ? `5.25rem repeat(${workingDays.length}, minmax(0, 1fr))`
                      : `100px repeat(${workingDays.length}, minmax(120px, 1fr))`,
                  };
                  if (isBreak) {
                    const breakLabel = breakRowLabel(period);
                    return (
                      <div
                        key={rowKey}
                        className={`grid shrink-0 ${embedded ? "min-w-0 gap-0.5" : "min-w-[720px] gap-1"}`}
                        style={rowGridStyle}
                      >
                        <div
                          className={`rounded bg-amber-50 font-medium text-amber-900 ${
                            embedded ? "px-1.5 py-1 text-xs leading-tight" : "rounded-lg px-2 py-2 text-xs"
                          }`}
                        >
                          {period.start}–{period.end}
                          {!embedded && <p className="text-[10px] capitalize">{breakLabel}</p>}
                        </div>
                        <div
                          className={`border border-amber-200 bg-amber-50/80 text-center font-medium text-amber-900 ${
                            embedded
                              ? "rounded px-1.5 py-1 text-xs"
                              : "rounded-lg px-3 py-2 text-xs"
                          }`}
                          style={{ gridColumn: `2 / span ${workingDays.length}` }}
                        >
                          {breakLabel}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={rowKey}
                      className={`grid min-h-0 ${embedded ? "min-h-[1.5rem] flex-1 gap-0.5" : "min-w-[720px] gap-1"}`}
                      style={rowGridStyle}
                    >
                      <div
                        className={`flex h-full flex-col justify-center rounded-lg bg-muted/40 ${
                          embedded ? "px-1.5 py-1 text-xs leading-snug" : "px-2 py-2 text-xs"
                        }`}
                      >
                        <p className="font-medium">{period.start}–{period.end}</p>
                        <p className={embedded ? "text-[11px] text-muted-foreground" : "text-[10px] text-muted-foreground"}>
                          P{period.period_no}
                        </p>
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
                        const cellClass = `${
                          embedded
                            ? "flex h-full min-h-0 flex-col justify-center gap-0.5 rounded border p-1.5 text-left text-xs leading-snug"
                            : "min-h-[68px] rounded-lg border p-2 text-left text-xs"
                        } ${canEdit ? "transition hover:border-primary" : ""} ${
                          status === "clash"
                            ? "border-red-300 bg-red-50"
                            : status === "empty"
                              ? highlightEmpty
                                ? "border-amber-400 bg-amber-50"
                                : "border-dashed border-border bg-background"
                              : "border-border bg-background"
                        } ${highlighted ? "ring-2 ring-primary/40" : ""}`;
                        const cellBody = (
                          <>
                            {cell?.subject_name ? (
                              <>
                                <span className={`block font-semibold ${embedded ? "text-sm leading-tight" : ""}`}>
                                  {cell.subject_name}
                                </span>
                                <span
                                  className={`block text-muted-foreground ${
                                    embedded ? "truncate text-[11px] leading-tight" : "mt-0.5 text-[10px]"
                                  }`}
                                >
                                  {embedded
                                    ? `${resolveTeacherName(cell) || "—"} · ${cell.room?.trim() || "—"}`
                                    : `Teacher: ${resolveTeacherName(cell) || "—"}`}
                                </span>
                                {!embedded && (
                                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                                    Room: {cell.room?.trim() || "—"}
                                  </span>
                                )}
                                {!embedded && cell.locked && (
                                  <span className="text-[10px] text-muted-foreground">Locked</span>
                                )}
                                {!embedded && cell.cell_source === "school_default" && (
                                  <span className="mt-0.5 block text-[10px] font-medium text-sky-700">
                                    School default
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground">
                                {canEdit ? "+ Assign" : "—"}
                              </span>
                            )}
                            {status === "clash" && cell?.clash_reason && (
                              <span className="mt-1 block text-[10px] text-red-700">{cell.clash_reason}</span>
                            )}
                          </>
                        );
                        return canEdit ? (
                          <button
                            key={`${day.day}-${period.period_no}`}
                            type="button"
                            disabled={!cell}
                            onClick={() => cell && openEditor(cell)}
                            className={`${cellClass} disabled:cursor-default disabled:opacity-70`}
                          >
                            {cellBody}
                          </button>
                        ) : (
                          <div key={`${day.day}-${period.period_no}`} className={cellClass}>
                            {cellBody}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {!embedded && (
        <aside className="space-y-3">
          {view !== "class" && (
          <div className="rounded-lg border border-border bg-background/80 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Teacher load
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
          )}

          {(clashPanelOpen || clashes.length > 0) && (
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
              <h3 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-red-800">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                Scheduling clashes
              </h3>
              {clashes.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">No scheduling clashes.</p>
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
        )}
      </div>

      {canEdit && editor && (
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
                {view === "class" && editorTeachers.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Assign teachers to this class under Classes → Teachers &amp; students.
                  </p>
                )}
              </label>
              <label className="block text-xs font-medium text-muted-foreground">
                Room
                <select
                  value={editor.room}
                  onChange={(e) => setEditor((c) => (c ? { ...c, room: e.target.value } : c))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">No room</option>
                  {editorRoomOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                {editorRoomOptions.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add rooms under Configure → Rooms.
                  </p>
                )}
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
