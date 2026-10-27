"use client";

import { useEffect, useMemo, useState } from "react";
import type { Member } from "@/lib/api";
import { UserIdentity } from "@/components/user-identity";

type AttendanceDay = { date: string; status: string };
type LeaveRow = { id: string; startDate: string; endDate: string; reason: string; status: string };

type AttendanceRegister = { subjectId: string; label: string };

type MonthData = {
  summary: Record<string, number>;
  records: AttendanceDay[];
  leaveRequests: LeaveRow[];
  registers?: AttendanceRegister[];
  subjectId?: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function leaveOnDate(leaveRows: LeaveRow[], iso: string): LeaveRow | undefined {
  return leaveRows.find((row) => row.startDate <= iso && iso <= row.endDate);
}

function cellStyle(status: string | undefined, leaveStatus: string | undefined) {
  if (leaveStatus === "pending") return "bg-sky-100 text-sky-900 ring-sky-300";
  if (leaveStatus === "approved") return "bg-violet-100 text-violet-900 ring-violet-300";
  if (status === "present" || status === "late") return "bg-emerald-100 text-emerald-900 ring-emerald-300";
  if (status === "absent") return "bg-red-100 text-red-900 ring-red-300";
  if (status === "excused") return "bg-orange-100 text-orange-950 ring-orange-400";
  return "bg-muted/50 text-muted-foreground ring-border";
}

function statusLabel(status: string | undefined, leaveStatus: string | undefined) {
  if (leaveStatus === "pending") return "Leave pending";
  if (leaveStatus === "approved") return "On leave";
  if (status === "present") return "Present";
  if (status === "late") return "Late";
  if (status === "absent") return "Absent";
  if (status === "excused") return "Excused";
  return "—";
}

function attendanceRate(summary: Record<string, number>): number | null {
  const present = summary.present ?? 0;
  const late = summary.late ?? 0;
  const absent = summary.absent ?? 0;
  const excused = summary.excused ?? 0;
  const marked = present + late + absent + excused;
  if (!marked) return null;
  return Math.round(((present + late) / marked) * 100);
}

export function SectionStudentAttendanceView({
  sectionId,
  studentUserId,
  student,
  showIdentity = false,
}: {
  sectionId: string;
  studentUserId: string;
  student?: Member;
  showIdentity?: boolean;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [subjectId, setSubjectId] = useState("");
  const [data, setData] = useState<MonthData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => {
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const last = daysInMonth(year, month);
    const end = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
    return { start, end };
  }, [year, month]);

  useEffect(() => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      start_date: range.start,
      end_date: range.end,
      subjectId,
    });
    fetch(`/api/sections/${sectionId}/students/${studentUserId}/attendance?${params}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not load attendance");
        return res.json() as Promise<MonthData>;
      })
      .then((payload) => {
        setData(payload);
        if (payload.registers?.length) {
          const allowed = new Set(payload.registers.map((r) => r.subjectId));
          if (!allowed.has(subjectId)) setSubjectId(payload.registers[0]?.subjectId ?? "");
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load attendance"))
      .finally(() => setLoading(false));
  }, [sectionId, studentUserId, range.start, range.end, subjectId]);

  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  const statusByDate = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of data?.records ?? []) map[row.date] = row.status;
    return map;
  }, [data?.records]);

  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const totalDays = daysInMonth(year, month);
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const summary = data?.summary ?? { present: 0, absent: 0, late: 0, excused: 0 };
  const rate = attendanceRate(summary);

  return (
    <div className="flex min-h-0 flex-col">
      {showIdentity && student && (
        <div className="mb-3">
          <UserIdentity user={student} role="student" />
          <p className="mt-1 text-xs text-muted-foreground">Monthly attendance</p>
        </div>
      )}

      {(data?.registers?.length ?? 0) > 1 && (
        <label className="mb-2 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Subject / teacher</span>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-card px-2 py-1.5"
          >
            {data!.registers!.map((row) => (
              <option key={row.subjectId || "class"} value={row.subjectId}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-2 py-1.5">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-lg px-3 py-1.5 text-sm hover:bg-muted"
        >
          ← Prev
        </button>
        <span className="text-sm font-semibold">{monthLabel(year, month)}</span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-lg px-3 py-1.5 text-sm hover:bg-muted"
        >
          Next →
        </button>
      </div>

      <div className="mt-3 min-h-0 flex-1">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {!loading && !error && data && (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              {rate != null && (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary ring-1 ring-primary/20">
                  {rate}% present
                </span>
              )}
              <StatChip label="Present" value={summary.present ?? 0} tone="emerald" />
              <StatChip label="Absent" value={summary.absent ?? 0} tone="red" />
              <StatChip label="Late" value={summary.late ?? 0} tone="emerald" />
              <StatChip label="Excused" value={summary.excused ?? 0} tone="orange" />
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, index) => {
                if (day === null) {
                  return <div key={`pad-${index}`} className="aspect-square" />;
                }
                const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const status = statusByDate[iso];
                const leave = leaveOnDate(data.leaveRequests ?? [], iso);
                const leaveStatus = leave?.status;
                return (
                  <div
                    key={iso}
                    title={statusLabel(status, leaveStatus)}
                    className={`flex aspect-square flex-col items-center justify-center rounded-lg text-[11px] font-medium ring-1 ${cellStyle(status, leaveStatus)}`}
                  >
                    <span>{day}</span>
                    {status === "late" && <span className="text-[9px] opacity-80">L</span>}
                  </div>
                );
              })}
            </div>

            {data.leaveRequests.length > 0 && (
              <section className="mt-4 rounded-xl border border-border bg-muted/20 p-3">
                <h4 className="text-sm font-semibold">Leave in this month</h4>
                <ul className="mt-2 space-y-2 text-sm">
                  {data.leaveRequests.map((row) => (
                    <li key={row.id} className="rounded-lg bg-card px-3 py-2 ring-1 ring-border">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium capitalize">{row.status}</span>
                        <span className="text-xs text-muted-foreground">
                          {row.startDate} → {row.endDate}
                        </span>
                      </div>
                      {row.reason && <p className="mt-1 text-xs text-muted-foreground">{row.reason}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "red" | "orange";
}) {
  const styles =
    tone === "red"
      ? "bg-red-50 text-red-900 ring-red-200"
      : tone === "orange"
        ? "bg-orange-50 text-orange-900 ring-orange-300"
        : "bg-emerald-50 text-emerald-900 ring-emerald-200";
  return (
    <span className={`rounded-full px-2.5 py-1 font-medium ring-1 ${styles}`}>
      {label}: {value}
    </span>
  );
}
