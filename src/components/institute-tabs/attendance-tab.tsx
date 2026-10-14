"use client";

import { useEffect, useState } from "react";
import type { Attendance, Member, Section } from "@/lib/api";

type SectionOverview = {
  students?: Member[];
};

const statuses: Attendance["status"][] = ["present", "absent", "late", "excused"];

export function AttendanceTab({ instituteId }: { instituteId: string }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Attendance["status"]>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/institutes/${instituteId}/sections`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load sections");
        const data = (await response.json()) as Section[];
        setSections(data);
        setSectionId(data[0]?.id || "");
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load sections"));
  }, [instituteId]);

  useEffect(() => {
    if (!sectionId) return;
    Promise.all([
      fetch(`/api/sections/${sectionId}`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/sections/${sectionId}/attendance?attendanceDate=${date}`, {
        credentials: "include",
      }),
    ])
      .then(async ([overviewResponse, attendanceResponse]) => {
        if (!overviewResponse.ok || !attendanceResponse.ok) throw new Error("Could not load attendance");
        const overview = (await overviewResponse.json()) as SectionOverview;
        const rows = (await attendanceResponse.json()) as Attendance[];
        setStudents(overview.students || []);
        setAttendance(Object.fromEntries(rows.map((row) => [row.studentId, row.status])));
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load attendance"));
  }, [date, instituteId, sectionId]);

  async function save() {
    const response = await fetch(`/api/institutes/${instituteId}/sections/${sectionId}/attendance`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendanceDate: date,
        records: students
          .filter((student) => attendance[student.userId])
          .map((student) => ({
            studentId: student.userId,
            status: attendance[student.userId],
          })),
      }),
    });
    if (!response.ok) {
      setError("Could not save attendance");
      return;
    }
    setMessage("Attendance saved");
    setError("");
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Attendance</h2>
        <p className="mt-1 text-sm text-muted-foreground">Review and update attendance for any section.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <select value={sectionId} onChange={(event) => setSectionId(event.target.value)} className="min-w-52 rounded-lg border border-border bg-background px-3 py-2 text-sm">
          {sections.map((section) => <option key={section.id} value={section.id}>{section.className} · {section.name}</option>)}
        </select>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      </div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[minmax(0,1fr)_150px] gap-3 bg-muted/50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Student</span><span>Status</span>
        </div>
        {students.map((student) => (
          <div key={student.userId} className="grid grid-cols-[minmax(0,1fr)_150px] items-center gap-3 border-t border-border px-4 py-3 text-sm">
            <span>{student.displayName || student.username || student.userId}</span>
            <select
              value={attendance[student.userId] || ""}
              onChange={(event) => setAttendance((current) => ({ ...current, [student.userId]: event.target.value as Attendance["status"] }))}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="">Unmarked</option>
              {statuses.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}
            </select>
          </div>
        ))}
        {!students.length && <p className="px-4 py-6 text-sm text-muted-foreground">No students are assigned to this section.</p>}
      </div>
      <button type="button" onClick={save} disabled={!sectionId} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
        Save attendance
      </button>
    </section>
  );
}
