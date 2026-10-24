"use client";

import { useEffect, useMemo, useState } from "react";
import { parseMemberTimetable, type MemberTimetableData } from "@/lib/timetable-api";

const DAY_LABELS: Record<number, string> = {
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

  if (!timetable?.publishedAt) {
    return (
      <div className="mt-6 space-y-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The weekly timetable has not been published yet. You will see the schedule here after the institute owner
          publishes it.
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
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2 text-left font-medium">Period</th>
              {workingDays.map((day) => (
                <th key={day} className="px-3 py-2 text-left font-medium">
                  {DAY_LABELS[day]}
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
                    <td className="px-3 py-2 align-top text-xs text-amber-950">
                      {period.start}–{period.end}
                      <br />
                      <span className="font-medium">{breakLabel}</span>
                    </td>
                    <td
                      colSpan={workingDays.length}
                      className="px-3 py-2 text-center text-xs font-medium text-amber-950"
                    >
                      {breakLabel}
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={rowKey} className="border-b border-border">
                  <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">P{period.periodNo}</span>
                    <br />
                    {period.start}–{period.end}
                  </td>
                  {workingDays.map((day) => {
                    const cell = cellMap.get(`${day}-${period.periodNo}`);
                    const sectionLabel = cell?.sectionId ? sectionNames[cell.sectionId] : "";
                    return (
                      <td key={day} className="px-3 py-2 align-top">
                        {cell?.subjectName ? (
                          <div>
                            <p className="font-medium">{cell.subjectName}</p>
                            {browseMode !== "class" && sectionLabel && (
                              <p className="text-xs text-muted-foreground">{sectionLabel}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Teacher: {cell.teacherName?.trim() || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Room: {cell.room?.trim() || "—"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
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
