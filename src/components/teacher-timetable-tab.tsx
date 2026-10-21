"use client";

import { useEffect, useMemo, useState } from "react";

type TimetableCell = {
  day: number;
  periodNo: number;
  subjectName?: string;
  sectionId?: string;
  room?: string | null;
};

type TimetablePayload = {
  publishedAt?: string | null;
  periods: { periodNo: number; start: string; end: string }[];
  days: { day: number; isWorking: boolean }[];
  cells: TimetableCell[];
};

const DAY_LABELS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export function TeacherTimetableTab({
  instituteId,
  teacherId,
}: {
  instituteId: string;
  teacherId: string;
}) {
  const [timetable, setTimetable] = useState<TimetablePayload | null>(null);
  const [sectionNames, setSectionNames] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([
      fetch(
        `/api/institutes/${instituteId}/timetable?view=teacher&id=${encodeURIComponent(teacherId)}&state=published`,
        { credentials: "include", cache: "no-store" }
      ),
      fetch(`/api/institutes/${instituteId}/sections`, { credentials: "include", cache: "no-store" }),
    ])
      .then(async ([timetableRes, sectionsRes]) => {
        if (!timetableRes.ok) {
          const body = await timetableRes.json().catch(() => ({}));
          throw new Error(body.detail || "Could not load timetable");
        }
        const payload = (await timetableRes.json()) as TimetablePayload;
        setTimetable(payload);
        if (sectionsRes.ok) {
          const sections = (await sectionsRes.json()) as { id: string; className: string; name: string }[];
          setSectionNames(
            Object.fromEntries(sections.map((s) => [s.id, `${s.className || "Class"} · ${s.name}`]))
          );
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load timetable"))
      .finally(() => setLoading(false));
  }, [instituteId, teacherId]);

  const workingDays = useMemo(
    () => (timetable?.days ?? []).filter((d) => d.isWorking).map((d) => d.day),
    [timetable]
  );

  const cellMap = useMemo(() => {
    const map = new Map<string, TimetableCell>();
    for (const cell of timetable?.cells ?? []) {
      map.set(`${cell.day}-${cell.periodNo}`, cell);
    }
    return map;
  }, [timetable]);

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
        <h2 className="text-xl font-semibold">My timetable</h2>
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The weekly timetable has not been published yet. Owners see a draft while building the schedule; teachers
          and students only see it after an owner publishes it (clashes must be resolved first).
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold">My timetable</h2>
        <p className="mt-1 text-sm text-muted-foreground">Published weekly schedule for your classes.</p>
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
            {(timetable.periods ?? []).map((period) => (
              <tr key={period.periodNo} className="border-b border-border">
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
                          {sectionLabel && (
                            <p className="text-xs text-muted-foreground">{sectionLabel}</p>
                          )}
                          {cell.room && <p className="text-xs text-muted-foreground">Room {cell.room}</p>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
