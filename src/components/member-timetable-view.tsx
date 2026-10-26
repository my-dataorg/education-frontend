"use client";

import { useEffect, useMemo, useState } from "react";
import { parseMemberTimetable, type MemberTimetableData } from "@/lib/timetable-api";

const DAY_LABELS: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

const DAY_LABELS_LONG: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

type SectionOption = { id: string; label: string };
type TeacherOption = { id: string; label: string };

export type TimetableBrowseMode = "mine" | "teacher" | "class";

export function MemberTimetableView({
  instituteId,
  role,
  userId,
  defaultSectionId,
  sections,
  teachers,
}: {
  instituteId: string;
  role: "teacher" | "student";
  userId: string;
  defaultSectionId: string;
  sections: SectionOption[];
  teachers: TeacherOption[];
}) {
  const [browseMode, setBrowseMode] = useState<TimetableBrowseMode>("mine");
  const [teacherId, setTeacherId] = useState(userId);
  const [sectionId, setSectionId] = useState(defaultSectionId);
  const [timetable, setTimetable] = useState<MemberTimetableData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const activeQuery = useMemo(() => {
    if (browseMode === "mine") {
      if (role === "teacher") return { view: "teacher", id: userId };
      return { view: "class", id: defaultSectionId || sectionId };
    }
    if (browseMode === "teacher") return { view: "teacher", id: teacherId };
    return { view: "class", id: sectionId };
  }, [browseMode, defaultSectionId, role, sectionId, teacherId, userId]);

  useEffect(() => {
    if (!activeQuery.id) {
      setTimetable(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const qs = new URLSearchParams({
      view: activeQuery.view,
      id: activeQuery.id,
      state: "published",
    });
    fetch(`/api/institutes/${instituteId}/timetable?${qs}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || body.error || "Could not load timetable");
        }
        const raw = (await res.json()) as Record<string, unknown>;
        setTimetable(parseMemberTimetable(raw));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load timetable"))
      .finally(() => setLoading(false));
  }, [activeQuery.id, activeQuery.view, instituteId]);

  const sectionNames = useMemo(
    () => Object.fromEntries(sections.map((s) => [s.id, s.label])),
    [sections]
  );

  const workingDays = useMemo(
    () => (timetable?.days ?? []).filter((d) => d.isWorking).map((d) => d.day),
    [timetable]
  );

  const cellMap = useMemo(() => {
    const map = new Map<string, MemberTimetableData["cells"][0]>();
    for (const cell of timetable?.cells ?? []) {
      map.set(`${cell.day}-${cell.periodNo}`, cell);
    }
    return map;
  }, [timetable]);

  const title =
    browseMode === "mine"
      ? role === "teacher"
        ? "My timetable"
        : "My class timetable"
      : browseMode === "teacher"
        ? "Teacher timetable"
        : "Class timetable";

  const subtitle =
    browseMode === "teacher"
      ? teachers.find((t) => t.id === teacherId)?.label ?? ""
      : browseMode === "class"
        ? sections.find((s) => s.id === sectionId)?.label ?? ""
        : "Published weekly schedule";

  if (loading) {
    return <p className="mt-6 text-sm text-muted-foreground">Loading timetable…</p>;
  }

  if (error) {
    return (
      <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
    );
  }

  const hasScheduledCells = Boolean(
    timetable?.cells?.some((cell) => cell.subjectName?.trim())
  );
  if (timetable && !timetable.publishedAt && !hasScheduledCells) {
    return (
      <div className="mt-6 space-y-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Timetable not published yet. Ask the institute owner to publish from <strong>Timetable</strong> in the
          sidebar.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="text-xs font-medium text-muted-foreground">
            View
            <select
              value={browseMode}
              onChange={(e) => setBrowseMode(e.target.value as TimetableBrowseMode)}
              className="ml-2 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="mine">{role === "teacher" ? "My periods" : "My class"}</option>
              <option value="teacher">By teacher</option>
              <option value="class">By class</option>
            </select>
          </label>
          {browseMode === "teacher" && (
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          )}
          {browseMode === "class" && (
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          )}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-0 table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[3.25rem] sm:w-24" />
            {workingDays.map((day) => (
              <col key={day} className="min-w-0" />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-1 py-1.5 text-left text-[10px] font-medium sm:px-3 sm:py-2 sm:text-xs">
                Time
              </th>
              {workingDays.map((day) => (
                <th
                  key={day}
                  className="px-1 py-1.5 text-center text-[10px] font-medium sm:px-2 sm:py-2 sm:text-xs"
                >
                  <span className="sm:hidden">{DAY_LABELS[day]}</span>
                  <span className="hidden sm:inline">{DAY_LABELS_LONG[day]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(timetable.periods ?? []).map((period) => {
              const rowKey = period.slotId ?? `p${period.periodNo}`;
              if (period.kind !== "class") {
                const breakLabel =
                  period.label?.trim() ||
                  (period.kind === "lunch" ? "Lunch" : period.kind === "play" ? "Activity" : "Break");
                return (
                  <tr key={rowKey} className="border-b border-border bg-amber-50/60">
                    <td className="px-1 py-1 align-top text-[9px] leading-tight tabular-nums text-amber-950 sm:px-3 sm:py-2 sm:text-xs">
                      <span className="block">{period.start}</span>
                      <span className="block text-[8px] opacity-80">{period.end}</span>
                    </td>
                    <td
                      colSpan={workingDays.length}
                      className="px-2 py-1 text-center text-[10px] font-medium text-amber-950 sm:px-3 sm:py-2 sm:text-xs"
                    >
                      {breakLabel}
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={rowKey} className="border-b border-border">
                  <td className="px-1 py-1 align-top text-[9px] leading-tight tabular-nums text-muted-foreground sm:px-3 sm:py-2 sm:text-xs">
                    <span className="block font-semibold text-primary">P{period.periodNo}</span>
                    <span className="block font-medium text-foreground">{period.start}</span>
                    <span className="block text-[8px]">{period.end}</span>
                  </td>
                  {workingDays.map((day) => {
                    const cell = cellMap.get(`${day}-${period.periodNo}`);
                    const sectionLabel = cell?.sectionId ? sectionNames[cell.sectionId] : "";
                    return (
                      <td key={day} className="min-w-0 px-1 py-1 align-top sm:px-2 sm:py-2">
                        {cell?.subjectName ? (
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold leading-tight line-clamp-3 break-words [overflow-wrap:anywhere] sm:text-sm">
                              {cell.subjectName}
                            </p>
                            {browseMode !== "class" && sectionLabel && (
                              <p className="hidden text-xs text-muted-foreground sm:block">{sectionLabel}</p>
                            )}
                            <p className="text-[9px] leading-tight text-muted-foreground line-clamp-2 break-words sm:text-xs">
                              {cell.teacherName?.trim() || "—"}
                            </p>
                            <p className="text-[9px] leading-tight text-muted-foreground sm:text-xs">
                              {cell.room?.trim() || "—"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground sm:text-sm">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
