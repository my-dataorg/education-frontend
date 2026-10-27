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

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function leaveOnDate(leaveRows: LeaveRow[], iso: string): LeaveRow | undefined {
  return leaveRows.find((row) => row.startDate <= iso && iso <= row.endDate);
}

function cellDotClass(status: string | undefined, leaveStatus: string | undefined) {
  if (leaveStatus === "pending") return "bg-sky-500";
  if (leaveStatus === "approved") return "bg-violet-500";
  if (status === "present" || status === "late") return "bg-emerald-500";
  if (status === "absent") return "bg-red-500";
  if (status === "excused") return "bg-orange-500";
  return "bg-transparent";
}

function statusLabel(status: string | undefined, leaveStatus: string | undefined) {
  if (leaveStatus === "pending") return "Leave pending";
  if (leaveStatus === "approved") return "On leave";
  if (status === "present") return "Present";
  if (status === "late") return "Late";
  if (status === "absent") return "Absent";
  if (status === "excused") return "Excused";
  return "No record";
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

function countLeaveDaysInMonth(leaveRows: LeaveRow[], year: number, month: number) {
  const last = daysInMonth(year, month);
  let approved = 0;
  let pending = 0;
  for (let day = 1; day <= last; day++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const leave = leaveOnDate(leaveRows, iso);
    if (leave?.status === "approved") approved += 1;
    if (leave?.status === "pending") pending += 1;
  }
  return { approved, pending };
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
  const [registers, setRegisters] = useState<AttendanceRegister[]>([]);
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
          setRegisters(payload.registers);
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
  const markedDays =
    (summary.present ?? 0) + (summary.late ?? 0) + (summary.absent ?? 0) + (summary.excused ?? 0);
  const leaveInMonth = countLeaveDaysInMonth(data?.leaveRequests ?? [], year, month);
  const registerLabel =
    registers.find((r) => r.subjectId === subjectId)?.label ?? "This register";

  return (
    <div className="flex min-h-0 flex-col gap-3">
      {showIdentity && student && (
        <div>
          <UserIdentity user={student} role="student" />
          <p className="mt-1 text-xs text-muted-foreground">Monthly attendance</p>
        </div>
      )}

      {registers.length > 0 && (
        <label className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-3">
          <span className="shrink-0 font-medium text-foreground">Subject / register</span>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm sm:max-w-md"
          >
            {registers.map((row) => (
              <option key={row.subjectId || "class"} value={row.subjectId}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {!loading && !error && data && (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="w-full shrink-0 lg:max-w-[17rem]">
            <div className="rounded-xl border border-border bg-muted/15 p-2.5">
              <div className="mb-2 flex items-center justify-between gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  className="rounded-md px-2 py-1 font-medium hover:bg-muted"
                >
                  ←
                </button>
                <span className="font-semibold text-foreground">{monthLabel(year, month)}</span>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  className="rounded-md px-2 py-1 font-medium hover:bg-muted"
                >
                  →
                </button>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] font-medium text-muted-foreground">
                {WEEKDAYS.map((d, i) => (
                  <div key={`${d}-${i}`} className="py-0.5">{d}</div>
                ))}
              </div>
              <div className="mt-0.5 grid grid-cols-7 gap-0.5">
                {cells.map((day, index) => {
                  if (day === null) {
                    return <div key={`pad-${index}`} className="h-7" />;
                  }
                  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const status = statusByDate[iso];
                  const leave = leaveOnDate(data.leaveRequests ?? [], iso);
                  const leaveStatus = leave?.status;
                  const dot = cellDotClass(status, leaveStatus);
                  const hasMark = dot !== "bg-transparent";
                  return (
                    <div
                      key={iso}
                      title={statusLabel(status, leaveStatus)}
                      className="flex h-7 flex-col items-center justify-center rounded-md text-[10px] text-foreground"
                    >
                      <span className="leading-none">{day}</span>
                      <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${dot} ${hasMark ? "" : "opacity-0"}`} />
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-muted-foreground">
                <LegendDot className="bg-emerald-500" label="Present" />
                <LegendDot className="bg-red-500" label="Absent" />
                <LegendDot className="bg-orange-500" label="Excused" />
                <LegendDot className="bg-violet-500" label="Leave" />
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1 rounded-xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">This month</p>
            <h3 className="mt-1 text-base font-semibold leading-snug text-foreground">{registerLabel}</h3>

            {rate != null ? (
              <p className="mt-3 text-3xl font-bold tabular-nums text-primary">{rate}%</p>
            ) : (
              <p className="mt-3 text-2xl font-semibold text-muted-foreground">—</p>
            )}
            <p className="text-sm text-muted-foreground">attendance rate (present + late)</p>

            <ul className="mt-4 space-y-2 text-sm">
              <SummaryLine label="Days with a record" value={markedDays} />
              <SummaryLine label="Present" value={summary.present ?? 0} accent="text-emerald-700" />
              <SummaryLine label="Late" value={summary.late ?? 0} accent="text-emerald-600" />
              <SummaryLine label="Absent" value={summary.absent ?? 0} accent="text-red-700" />
              <SummaryLine label="Excused" value={summary.excused ?? 0} accent="text-orange-700" />
              <SummaryLine label="Leave days (approved)" value={leaveInMonth.approved} accent="text-violet-700" />
              <SummaryLine label="Leave days (pending)" value={leaveInMonth.pending} accent="text-sky-700" />
            </ul>

            {data.leaveRequests.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Leave requests</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {data.leaveRequests.map((row) => (
                    <li key={row.id} className="flex justify-between gap-2 rounded-lg bg-muted/30 px-2 py-1.5">
                      <span className="font-medium capitalize">{row.status}</span>
                      <span className="text-muted-foreground">{row.startDate} → {row.endDate}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-1.5 w-1.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function SummaryLine({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
        {label}
      </span>
      <span className={`font-semibold tabular-nums ${accent ?? "text-foreground"}`}>{value}</span>
    </li>
  );
}
