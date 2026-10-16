"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Attendance, Member, Section } from "@/lib/api";
import { DataTable, KpiCard, ModuleHeader, Panel } from "@/components/institute-tabs/module-tab-ui";

type SectionOverview = { students?: Member[] };

type AttendanceSummary = {
  studentsTotal: number;
  present: number;
  absent: number;
  late: number;
  staffTotal: number;
  staffPresent: number;
  sectionsTotal: number;
  sectionsPending: number;
};

type SectionRow = {
  section: Section;
  present: number;
  absent: number;
  late: number;
  status: "marked" | "not_marked";
};

const statuses: Attendance["status"][] = ["present", "absent", "late", "excused"];

export function AttendanceTab({
  instituteId,
  branchId,
}: {
  instituteId: string;
  branchId?: string | null;
}) {
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Attendance["status"]>>({});
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [sectionRows, setSectionRows] = useState<SectionRow[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const unmarkedOnly = searchParams.get("register") === "unmarked";

  const campusSections = useMemo(() => {
    if (!branchId) return sections;
    return sections.filter((section) => section.branchId === branchId || !section.branchId);
  }, [branchId, sections]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    const params = new URLSearchParams({ day: date });
    if (branchId) params.set("branch", branchId);
    try {
      const [summaryRes, ...attendanceResponses] = await Promise.all([
        fetch(`/api/institutes/${instituteId}/attendance/summary?${params}`, { credentials: "include" }),
        ...campusSections.map((section) =>
          fetch(
            `/api/institutes/${instituteId}/sections/${section.id}/attendance?attendanceDate=${date}`,
            { credentials: "include" }
          )
        ),
      ]);
      if (summaryRes.ok) setSummary(await summaryRes.json());
      const rows: SectionRow[] = [];
      for (let index = 0; index < campusSections.length; index += 1) {
        const section = campusSections[index];
        const response = attendanceResponses[index];
        if (!response?.ok) {
          rows.push({ section, present: 0, absent: 0, late: 0, status: "not_marked" });
          continue;
        }
        const records = (await response.json()) as Attendance[];
        const counts = { present: 0, absent: 0, late: 0 };
        for (const record of records) {
          if (record.status === "present") counts.present += 1;
          if (record.status === "absent") counts.absent += 1;
          if (record.status === "late") counts.late += 1;
        }
        rows.push({
          section,
          ...counts,
          status: records.length ? "marked" : "not_marked",
        });
      }
      const ordered = unmarkedOnly
        ? [...rows].sort((a, b) => {
            if (a.status === b.status) return 0;
            return a.status === "not_marked" ? -1 : 1;
          })
        : rows;
      setSectionRows(ordered);
    } catch {
      setError("Could not load attendance summary");
    } finally {
      setSummaryLoading(false);
    }
  }, [branchId, campusSections, date, instituteId, unmarkedOnly]);

  useEffect(() => {
    fetch(`/api/institutes/${instituteId}/sections`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load sections");
        const data = (await response.json()) as Section[];
        setSections(data);
        const scoped = branchId ? data.filter((s) => s.branchId === branchId || !s.branchId) : data;
        setSectionId(scoped[0]?.id || "");
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load sections"));
  }, [branchId, instituteId]);

  useEffect(() => {
    if (!campusSections.length) return;
    void loadSummary();
  }, [campusSections.length, loadSummary]);

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
      credentials: "include",
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
    await loadSummary();
  }

  const presentDisplay =
    summary && summary.sectionsPending === summary.sectionsTotal && summary.sectionsTotal > 0
      ? "–"
      : summary
        ? String(summary.present)
        : "–";

  return (
    <section className="space-y-5">
      <ModuleHeader
        title="Attendance"
        description="Review registers for today, spot gaps, and correct any section."
        action={
          <input
            type="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        }
      />
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Students present"
          value={summaryLoading ? "…" : presentDisplay}
          hint={summary ? `of ${summary.studentsTotal}` : undefined}
        />
        <KpiCard label="Absent" value={summaryLoading ? "…" : summary ? String(summary.absent) : "–"} />
        <KpiCard label="Late" value={summaryLoading ? "…" : summary ? String(summary.late) : "–"} />
        <KpiCard
          label="Staff present"
          value={summaryLoading ? "…" : summary ? `${summary.staffPresent} / ${summary.staffTotal}` : "–"}
        />
        <KpiCard
          label="Registers pending"
          value={summaryLoading ? "…" : summary ? String(summary.sectionsPending) : "–"}
          hint={summary ? `of ${summary.sectionsTotal} sections` : undefined}
        />
      </div>
      {unmarkedOnly && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Showing unmarked registers first. Clear the filter from Overview or remove <code className="text-[11px]">register=unmarked</code> from the URL.
        </p>
      )}
      <Panel title="Sections today">
        <DataTable
          headers={["Section", "Present", "Absent", "Late", "Status"]}
          rows={sectionRows.map((row) => [
            `${row.section.className}-${row.section.name}`,
            row.status === "not_marked" ? "—" : String(row.present),
            row.status === "not_marked" ? "—" : String(row.absent),
            row.status === "not_marked" ? "—" : String(row.late),
            row.status === "marked" ? "Marked" : "Not marked",
          ])}
        />
        {sectionRows.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">No classes yet. Add classes first.</p>
        )}
      </Panel>
      <div className="flex flex-wrap gap-3">
        <select
          value={sectionId}
          onChange={(event) => setSectionId(event.target.value)}
          className="min-w-52 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {campusSections.map((section) => (
            <option key={section.id} value={section.id}>{section.className} · {section.name}</option>
          ))}
        </select>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[minmax(0,1fr)_150px] gap-3 bg-muted/50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Student</span>
          <span>Status</span>
        </div>
        {students.map((student) => (
          <div
            key={student.userId}
            className="grid grid-cols-[minmax(0,1fr)_150px] items-center gap-3 border-t border-border px-4 py-3 text-sm"
          >
            <span>{student.displayName || student.username || student.userId}</span>
            <select
              value={attendance[student.userId] || ""}
              onChange={(event) =>
                setAttendance((current) => ({
                  ...current,
                  [student.userId]: event.target.value as Attendance["status"],
                }))
              }
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="">Unmarked</option>
              {statuses.map((status) => (
                <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>
              ))}
            </select>
          </div>
        ))}
        {!students.length && (
          <p className="px-4 py-6 text-sm text-muted-foreground">No students are assigned to this section.</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => void save()}
        disabled={!sectionId}
        className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        Save attendance
      </button>
    </section>
  );
}
