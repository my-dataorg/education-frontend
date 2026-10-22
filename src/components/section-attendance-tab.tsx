"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatUserName } from "@/components/user-identity";
import { SectionAttendanceStudentDialog } from "@/components/section-attendance-student-dialog";
import type { Member } from "@/lib/api";

type Sheet = {
  dates: string[];
  students: Member[];
  statusByStudent: Record<string, Record<string, string>>;
  totalsByStudent: Record<string, Totals>;
  totalsLabel: string;
  canEditPastAttendance?: boolean;
  canTakeAttendanceToday?: boolean;
  publishStateByDate?: Record<string, string>;
};

type PublishState = "draft" | "submitted";
type TileSize = "large" | "medium" | "small";

function attendanceTakeGridLayout(studentCount: number): { gridClass: string; tileSize: TileSize } {
  if (studentCount <= 8) {
    return { gridClass: "grid grid-cols-2 gap-2 sm:grid-cols-2", tileSize: "large" };
  }
  if (studentCount <= 14) {
    return { gridClass: "grid grid-cols-2 gap-1.5 sm:grid-cols-3", tileSize: "medium" };
  }
  if (studentCount <= 24) {
    return { gridClass: "grid grid-cols-3 gap-1.5 sm:grid-cols-4", tileSize: "medium" };
  }
  if (studentCount <= 36) {
    return { gridClass: "grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5", tileSize: "small" };
  }
  return { gridClass: "grid grid-cols-4 gap-1 sm:grid-cols-5 md:grid-cols-6", tileSize: "small" };
}

type TotalsRange = "academic_year" | "week" | "month" | "year";

const TOTALS_OPTIONS: { value: TotalsRange; label: string }[] = [
  { value: "academic_year", label: "Academic year" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
  { value: "year", label: "Last 365 days" },
];

type LeaveRequest = {
  id: string;
  studentId: string;
  studentName?: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
};

type Totals = { present: number; absent: number; late: number; excused: number; unmarked: number };

type AttendanceMark = "present" | "excused" | "absent";

/** Calendar dates in the UI follow the user's local day, not UTC. */
function localDateIso(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizeAttendanceStatus(status: string | undefined): string | undefined {
  if (!status) return undefined;
  const s = status.trim().toLowerCase();
  if (s === "excuse" || s === "excused") return "excused";
  return s;
}

function statusToMark(status: string | undefined): AttendanceMark {
  const s = normalizeAttendanceStatus(status);
  if (s === "present" || s === "late") return "present";
  if (s === "excused") return "excused";
  return "absent";
}

function statusDotTitle(status: string | undefined) {
  const s = normalizeAttendanceStatus(status);
  if (s === "present") return "Present";
  if (s === "late") return "Late";
  if (s === "excused") return "Excused";
  if (s === "absent") return "Absent";
  return "Not marked";
}

function dayHeader(iso: string) {
  const d = new Date(iso + "T12:00:00");
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "narrow" }),
    day: d.getDate(),
    isToday,
    title: d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }),
  };
}

function dayLabelLong(iso: string) {
  const { title, isToday } = dayHeader(iso);
  return isToday ? `${title} · Today` : title;
}

function studentShortLabel(student: Member) {
  const full = formatUserName(student);
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0];
    const second = parts[1].replace(/\.$/, "");
    return `${first} ${second.charAt(0)}.`;
  }
  if (full.length > 11) return `${full.slice(0, 10)}…`;
  return full;
}

function statusCellClass(status: string | undefined) {
  const s = normalizeAttendanceStatus(status);
  if (s === "present" || s === "late") return "bg-emerald-500 ring-emerald-600";
  if (s === "excused") return "bg-orange-400 ring-2 ring-orange-500";
  if (s === "absent") return "bg-red-400 ring-red-500";
  return "bg-muted ring-border";
}

export function SectionAttendanceTab({ sectionId }: { sectionId: string }) {
  const [totalsRange, setTotalsRange] = useState<TotalsRange>("academic_year");
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [error, setError] = useState("");
  const [gridOpen, setGridOpen] = useState(false);
  const [gridDate, setGridDate] = useState(() => localDateIso());
  const [marks, setMarks] = useState<Record<string, AttendanceMark>>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [detailStudent, setDetailStudent] = useState<Member | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [totalsMenuOpen, setTotalsMenuOpen] = useState(false);
  const totalsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!totalsMenuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (totalsMenuRef.current && !totalsMenuRef.current.contains(e.target as Node)) {
        setTotalsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [totalsMenuOpen]);

  const loadSheet = useCallback(() => {
    setError("");
    const params = new URLSearchParams({
      days: "7",
      summaryPeriod: totalsRange,
      endDate: localDateIso(),
    });
    fetch(`/api/sections/${sectionId}/attendance-sheet?${params}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not load attendance");
        return res.json() as Promise<Sheet>;
      })
      .then(setSheet)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load attendance"));
  }, [sectionId, totalsRange]);

  const loadLeave = useCallback(() => {
    fetch(`/api/sections/${sectionId}/leave-requests?status=pending`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => setLeaveRequests(Array.isArray(rows) ? rows : []))
      .catch(() => setLeaveRequests([]));
  }, [sectionId]);

  useEffect(() => {
    loadSheet();
    loadLeave();
  }, [loadSheet, loadLeave]);

  const todayIso = useMemo(() => localDateIso(), []);

  function canOpenGrid(forDate: string) {
    if (!sheet) return false;
    if (forDate === todayIso) return sheet.canTakeAttendanceToday !== false;
    return sheet.canEditPastAttendance === true;
  }

  function openGrid(forDate: string) {
    if (!sheet || !canOpenGrid(forDate)) return;
    const next: Record<string, AttendanceMark> = {};
    for (const student of sheet.students) {
      const status = sheet.statusByStudent[student.userId]?.[forDate];
      next[student.userId] = statusToMark(status);
    }
    setMarks(next);
    setGridDate(forDate);
    setGridOpen(true);
    setSaveMessage("");
  }

  function togglePresent(userId: string) {
    setMarks((current) => ({
      ...current,
      [userId]: current[userId] === "present" ? "absent" : "present",
    }));
  }

  function markExcused(userId: string) {
    setMarks((current) => ({
      ...current,
      [userId]: "excused",
    }));
  }

  async function saveGrid(publishState: PublishState) {
    setSaving(true);
    setSaveMessage("");
    const presentStudentIds: string[] = [];
    const excusedStudentIds: string[] = [];
    for (const student of sheet?.students ?? []) {
      const mark = marks[student.userId] ?? "absent";
      if (mark === "present") presentStudentIds.push(student.userId);
      else if (mark === "excused") excusedStudentIds.push(student.userId);
    }
    try {
      const res = await fetch(`/api/sections/${sectionId}/attendance-present-sync`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          attendanceDate: gridDate,
          presentStudentIds,
          excusedStudentIds,
          publishState,
        }),
      });
      if (!res.ok) throw new Error("Could not save attendance");
      setSaveMessage(publishState === "draft" ? "Draft saved" : "Submitted");
      setGridOpen(false);
      loadSheet();
    } catch (e) {
      setSaveMessage(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  }
  if (!sheet) {
    return <p className="text-sm text-muted-foreground">Loading attendance…</p>;
  }

  const rowGrid =
    "grid w-full grid-cols-[minmax(0,4.5rem)_repeat(7,minmax(0,1fr))_minmax(0,3rem)] items-center gap-x-px md:grid-cols-[minmax(0,9rem)_repeat(7,minmax(0,1fr))_minmax(0,7.5rem)] md:gap-x-1";

  const takeGrid = attendanceTakeGridLayout(sheet.students.length);
  const gridPublishState = sheet.publishStateByDate?.[gridDate];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Attendance</h2>
          <p className="text-sm text-muted-foreground">This week · tap a student for month view</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sheet.canTakeAttendanceToday && (
            <button
              type="button"
              onClick={() => openGrid(todayIso)}
              className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
            >
              Take attendance
            </button>
          )}
        </div>
      </div>

      <div className="w-full rounded-xl border border-border bg-card px-1 py-0 shadow-sm sm:px-2">
        <div
          className={`${rowGrid} border-b border-border bg-muted/40 py-1.5 text-muted-foreground sm:py-2`}
        >
          <div className="truncate pl-0.5 text-[10px] font-semibold uppercase tracking-wide sm:text-xs">
            Student
          </div>
          {sheet.dates.map((d) => {
            const editable = canOpenGrid(d);
            const h = dayHeader(d);
            const inner = (
              <span className="flex flex-col items-center leading-tight">
                <span className={h.isToday ? "font-bold text-primary" : ""}>{h.weekday}</span>
                <span className={`text-[10px] sm:text-xs ${h.isToday ? "text-primary" : ""}`}>{h.day}</span>
              </span>
            );
            return (
              <div key={d} className="flex justify-center">
                {editable ? (
                  <button type="button" onClick={() => openGrid(d)} className="hover:text-primary" title={h.title}>
                    {inner}
                  </button>
                ) : (
                  <span title={h.title}>{inner}</span>
                )}
              </div>
            );
          })}
          <div ref={totalsMenuRef} className="relative flex justify-center md:justify-end">
            <button
              type="button"
              onClick={() => setTotalsMenuOpen((open) => !open)}
              className="inline-flex max-w-full items-center gap-0.5 rounded-md px-0.5 py-0.5 text-center text-[9px] font-semibold leading-tight hover:bg-muted/80 md:text-left md:text-[11px]"
              title="Change totals period"
              aria-expanded={totalsMenuOpen}
            >
              <span className="hidden truncate md:inline">{sheet.totalsLabel}</span>
              <span className="md:hidden">Total</span>
              <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
            </button>
            {totalsMenuOpen && (
              <div
                className="absolute right-0 top-full z-30 mt-1 min-w-[10.5rem] rounded-lg border border-border bg-card py-1 shadow-lg"
                role="menu"
              >
                {TOTALS_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setTotalsRange(o.value);
                      setTotalsMenuOpen(false);
                    }}
                    className={`block w-full px-3 py-2 text-left text-xs hover:bg-muted/60 ${
                      totalsRange === o.value ? "font-semibold text-primary" : "text-foreground"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {sheet.students.map((student) => {
          const totals =
            sheet.totalsByStudent[student.userId] ?? {
              present: 0,
              absent: 0,
              late: 0,
              excused: 0,
              unmarked: 0,
            };
          return (
            <div
              key={student.userId}
              className={`${rowGrid} border-b border-border py-1.5 last:border-0 sm:py-2`}
            >
              <button
                type="button"
                onClick={() => setDetailStudent(student)}
                className="min-w-0 truncate pl-0.5 text-left text-[11px] font-medium leading-tight hover:text-primary sm:text-sm"
                title={`${formatUserName(student)} — monthly calendar`}
              >
                <span className="sm:hidden">{studentShortLabel(student)}</span>
                <span className="hidden sm:inline">{formatUserName(student)}</span>
              </button>
              {sheet.dates.map((d) => {
                const status = sheet.statusByStudent[student.userId]?.[d];
                return (
                  <div key={d} className="flex justify-center">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full sm:h-3 sm:w-3 ${statusCellClass(status)}`}
                      title={statusDotTitle(status)}
                    />
                  </div>
                );
              })}
              <div className="flex justify-center md:justify-end md:pr-1">
                <TotalsSummary totals={totals} />
              </div>
            </div>
          );
        })}

        {!sheet.students.length && (
          <p className="px-4 py-6 text-sm text-muted-foreground">No students in this class.</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Tap a student for monthly calendar. Green = present · red = absent · orange = excused.
        {sheet.canTakeAttendanceToday ? " Use Take attendance for today." : ""}
        {sheet.canEditPastAttendance ? " Owner/admin can tap a day to edit past dates." : ""}
      </p>

      <section className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <h3 className="text-sm font-semibold">Pending leave requests</h3>
        {!leaveRequests.length ? (
          <p className="mt-2 text-sm text-muted-foreground">No pending leave for this class.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {leaveRequests.map((row) => (
              <li key={row.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    className="font-medium text-left hover:text-primary"
                    onClick={() => {
                      const student = sheet.students.find((s) => s.userId === row.studentId);
                      if (student) setDetailStudent(student);
                    }}
                  >
                    {row.studentName || "Student"}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {row.startDate} → {row.endDate}
                  </span>
                </div>
                {row.reason && <p className="mt-1 text-xs text-muted-foreground">{row.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {detailStudent && (
        <SectionAttendanceStudentDialog
          sectionId={sectionId}
          student={detailStudent}
          onClose={() => setDetailStudent(null)}
        />
      )}

      {gridOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="font-semibold">Take attendance</h3>
                <p className="text-xs text-muted-foreground">
                  {dayLabelLong(gridDate)}
                  {gridPublishState === "draft" && (
                    <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900">
                      Draft
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGridOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
              >
                Close
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              <p className="mb-3 text-sm text-muted-foreground">
                Tap for <span className="font-medium text-emerald-700">present</span>. Long-press (mobile) or
                double-click for <span className="font-medium text-orange-700">excused</span>. Everyone else is saved
                as <span className="font-medium text-red-700">absent</span>.
              </p>
              <div className={takeGrid.gridClass}>
                {sheet.students.map((student) => (
                  <AttendanceMarkButton
                    key={student.userId}
                    name={student.displayName || student.username || "Student"}
                    mark={marks[student.userId] ?? "absent"}
                    size={takeGrid.tileSize}
                    onTogglePresent={() => togglePresent(student.userId)}
                    onExcuse={() => markExcused(student.userId)}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm tabular-nums">
                <span className="text-emerald-700">
                  {Object.values(marks).filter((m) => m === "present").length} present
                </span>
                <span className="text-muted-foreground"> · </span>
                <span className="font-medium text-orange-500">
                  {Object.values(marks).filter((m) => m === "excused").length} excused
                </span>
                <span className="text-muted-foreground"> · </span>
                <span className="text-red-700">
                  {Object.values(marks).filter((m) => m === "absent").length} absent
                </span>
              </span>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {saveMessage && (
                  <span
                    className={`text-sm ${
                      saveMessage === "Draft saved" || saveMessage === "Submitted"
                        ? "text-emerald-700"
                        : "text-red-600"
                    }`}
                  >
                    {saveMessage}
                  </span>
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveGrid("draft")}
                  className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
                  title="Save as draft — only you can see it until you submit"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveGrid("submitted")}
                  className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                  title="Publish attendance for this day"
                >
                  {saving ? "Saving…" : "Save and submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TILE_PADDING: Record<TileSize, string> = {
  large: "px-3 py-3.5 text-sm",
  medium: "px-2.5 py-2 text-sm",
  small: "px-2 py-1.5 text-xs leading-tight",
};

function AttendanceMarkButton({
  name,
  mark,
  size,
  onTogglePresent,
  onExcuse,
}: {
  name: string;
  mark: AttendanceMark;
  size: TileSize;
  onTogglePresent: () => void;
  onExcuse: () => void;
}) {
  const longPressRef = useRef(false);
  const touchTapRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function startLongPress() {
    clearTimer();
    longPressRef.current = false;
    timerRef.current = setTimeout(() => {
      longPressRef.current = true;
      onExcuse();
    }, 450);
  }

  function handleTap(fromTouch: boolean) {
    if (longPressRef.current) {
      longPressRef.current = false;
      return;
    }
    if (fromTouch) {
      touchTapRef.current = true;
    }
    onTogglePresent();
  }

  function handleTouchEnd() {
    clearTimer();
    handleTap(true);
  }

  const styles =
    mark === "present"
      ? "border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm"
      : mark === "excused"
        ? "border-orange-500 bg-orange-50 text-orange-950 shadow-sm"
        : "border-red-200 bg-red-50/50 text-foreground";

  const label =
    mark === "present" ? "Present" : mark === "excused" ? "Excused" : "Absent";

  return (
    <button
      type="button"
      onClick={() => {
        if (touchTapRef.current) {
          touchTapRef.current = false;
          return;
        }
        handleTap(false);
      }}
      onDoubleClick={(e) => {
        e.preventDefault();
        onExcuse();
      }}
      onTouchStart={startLongPress}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={clearTimer}
      onContextMenu={(e) => {
        e.preventDefault();
        onExcuse();
      }}
      className={`rounded-lg border-2 text-left transition select-none ${TILE_PADDING[size]} ${styles}`}
    >
      <span className={`line-clamp-2 font-medium ${size === "small" ? "leading-tight" : "leading-snug"}`}>
        {name}
      </span>
      <span
        className={`mt-0.5 block font-medium ${size === "small" ? "text-[10px]" : "text-xs"} ${
          mark === "excused" ? "text-orange-700" : mark === "present" ? "text-emerald-700" : "text-red-700"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function TotalsSummary({ totals }: { totals: Totals }) {
  const presentTotal = totals.present + totals.late;
  const absentTotal = totals.absent + totals.unmarked;
  return (
    <>
      <div className="text-center text-[8px] leading-[1.2] tabular-nums md:hidden">
        <div className="text-emerald-700">prst {presentTotal}</div>
        <div className="text-red-700">abs {absentTotal}</div>
        <div className="font-medium text-orange-500">exc {totals.excused}</div>
      </div>
      <div className="hidden min-w-0 text-left text-[11px] leading-snug tabular-nums md:block">
        <div className="text-emerald-700">Present - {presentTotal}</div>
        <div className="text-red-700">Absent - {absentTotal}</div>
        <div className="font-medium text-orange-500">Excuse - {totals.excused}</div>
      </div>
    </>
  );
}
