"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LeaveRequestDialog } from "@/components/leave-request-dialog";
import { SectionStudentAttendancePanel } from "@/components/section-student-attendance-panel";
import type { Section } from "@/lib/api";

type LeaveRequestRow = {
  id: string;
  purpose: string;
  body: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt?: string;
};

function monthDays(year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  const days: Date[] = [];
  const cursor = new Date(first);
  while (cursor.getMonth() === month - 1) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function MyAttendanceLeavePage({
  mode,
  instituteId,
  sections = [],
  userId,
}: {
  mode: "student" | "staff";
  instituteId: string;
  sections?: Section[];
  userId: string;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [requests, setRequests] = useState<LeaveRequestRow[]>([]);
  const [statusByDate, setStatusByDate] = useState<Record<string, string>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sectionId, setSectionId] = useState(sections[0]?.id || "");

  const load = useCallback(() => {
    fetch(`/api/institutes/${instituteId}/leave-requests/mine`, { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => setRequests(Array.isArray(rows) ? rows : []))
      .catch(() => setRequests([]));
    if (mode === "staff") {
      fetch(
        `/api/institutes/${instituteId}/me/attendance-summary?year=${year}&month=${month}`,
        { credentials: "include", cache: "no-store" }
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setStatusByDate(data?.statusByDate ?? {}))
        .catch(() => setStatusByDate({}));
    }
  }, [instituteId, mode, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const sectionLabel = useMemo(() => {
    const s = sections.find((x) => x.id === sectionId);
    return s ? `${s.className} · ${s.name}` : "Class";
  }, [sections, sectionId]);

  const days = monthDays(year, month);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{mode === "student" ? "Attendance & leave" : "My attendance"}</h2>
          <p className="text-sm text-muted-foreground">
            {mode === "student"
              ? "Class attendance and leave requests."
              : "Leave days and institute-recorded absences for the month."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Apply for leave
        </button>
      </div>

      {mode === "student" && sections.length > 0 && (
        <>
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.className} · {s.name}</option>
            ))}
          </select>
          {sectionId && (
            <SectionStudentAttendancePanel sectionId={sectionId} sectionLabel={sectionLabel} />
          )}
        </>
      )}

      {mode === "staff" && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <button type="button" className="text-sm" onClick={() => setMonth((m) => (m === 1 ? 12 : m - 1))}>
              ←
            </button>
            <span className="text-sm font-medium">
              {new Date(year, month - 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}
            </span>
            <button type="button" className="text-sm" onClick={() => setMonth((m) => (m === 12 ? 1 : m + 1))}>
              →
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {days.map((d) => {
              const key = d.toISOString().slice(0, 10);
              const status = statusByDate[key];
              const tone =
                status === "approved"
                  ? "bg-emerald-100 text-emerald-900"
                  : status === "pending"
                    ? "bg-amber-100 text-amber-900"
                    : status === "rejected"
                      ? "bg-red-100 text-red-900"
                      : "bg-muted/40 text-muted-foreground";
              return (
                <div key={key} className={`rounded-md px-1 py-2 ${tone}`}>
                  <div className="font-medium">{d.getDate()}</div>
                  {status && <div className="truncate text-[10px] capitalize">{status}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold">My leave requests</h3>
        {!requests.length ? (
          <p className="mt-2 text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {requests.map((row) => (
              <li key={row.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{row.purpose}</span>
                  <span className="text-xs capitalize text-muted-foreground">{row.status}</span>
                </div>
                <p className="text-xs text-muted-foreground">{row.startDate} → {row.endDate}</p>
                {row.body && <p className="mt-1 text-xs">{row.body}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <LeaveRequestDialog
        instituteId={instituteId}
        sectionId={mode === "student" ? sectionId : undefined}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmitted={load}
      />
    </div>
  );
}
