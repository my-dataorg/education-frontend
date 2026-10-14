"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

const TITLES = {
  "academic-year": ["Academic year & terms", "Academic year, classes & subjects"],
  exams: ["Exams & results", "Review marks progress and publish report cards"],
  fees: ["Fees", "Track collections, concessions, receipts, and dues"],
  notices: ["Notices & calendar", "Publish updates and maintain the school calendar"],
  reports: ["Reports", "Review attendance, academic performance, and enrollment"],
  "roles-settings": ["Roles & settings", "Configure permissions for this institute"],
} as const;

type ClassRow = { id: string; name: string; className?: string };
type SubjectRow = { id: string; name: string };

export function WireframeModuleTab({
  module,
  instituteId,
}: {
  module: keyof typeof TITLES;
  instituteId: string;
}) {
  const [title, description] = TITLES[module];
  const [sections, setSections] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);

  useEffect(() => {
    if (module !== "academic-year") return;
    Promise.all([
      fetch(`/api/institutes/${instituteId}/sections`),
      fetch(`/api/institutes/${instituteId}/subjects`),
      fetch(`/api/institutes/${instituteId}/academic-year`),
    ])
      .then(async ([sectionsResponse, subjectsResponse, yearResponse]) => {
        if (!sectionsResponse.ok || !subjectsResponse.ok || !yearResponse.ok) return;
        setSections(await sectionsResponse.json());
        setSubjects(await subjectsResponse.json());
        setAcademicYear(await yearResponse.json());
      })
      .catch(() => undefined);
  }, [instituteId, module]);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Owner · AY {academicYear?.label || "loading"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <button disabled={module !== "academic-year"} title={module === "academic-year" ? "Use the save action in the academic year card" : "This module is a wireframe preview until its API is connected"} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60">
          {module === "notices" ? "New notice" : module === "exams" ? "New exam" : module === "fees" ? "Record payment" : "Save"}
        </button>
      </div>
      {module === "academic-year" && (academicYear ? <AcademicYear instituteId={instituteId} year={academicYear} sections={sections} subjects={subjects} /> : <Panel title="Academic year"><p className="text-sm text-muted-foreground">Loading academic year…</p></Panel>)}
      {module === "exams" && <Exams />}
      {module === "fees" && <Fees />}
      {module === "notices" && <Notices />}
      {module === "reports" && <Reports />}
      {module === "roles-settings" && <Roles />}
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-4 shadow-sm"><h2 className="font-semibold">{title}</h2><div className="mt-4">{children}</div></section>;
}

type AcademicYear = {
  label: string;
  startDate: string;
  endDate: string;
  board: string;
  termCount: number;
  gradingScale: string;
  medium: string;
};

function AcademicYear({ instituteId, year, sections, subjects }: { instituteId: string; year: AcademicYear | null; sections: ClassRow[]; subjects: SubjectRow[] }) {
  const [draft, setDraft] = useState<AcademicYear | null>(year);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!draft) return;
    setSaving(true);
    const response = await fetch(`/api/institutes/${instituteId}/academic-year`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (response.ok) setDraft(await response.json());
    setSaving(false);
  }

  if (!draft) return <Panel title="Academic year"><p className="text-sm text-muted-foreground">Loading academic year…</p></Panel>;

  return <div className="space-y-5">
    <Panel title="Academic year">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Academic year" value={draft.label} onChange={(label) => setDraft({ ...draft, label })} />
        <Input label="Board" value={draft.board} onChange={(board) => setDraft({ ...draft, board })} />
        <Input label="Terms" type="number" value={String(draft.termCount)} onChange={(termCount) => setDraft({ ...draft, termCount: Number(termCount) })} />
        <Input label="Grading scale" value={draft.gradingScale} onChange={(gradingScale) => setDraft({ ...draft, gradingScale })} />
        <Input label="Medium" value={draft.medium} onChange={(medium) => setDraft({ ...draft, medium })} />
        <Input label="Start date" type="date" value={draft.startDate} onChange={(startDate) => setDraft({ ...draft, startDate })} />
        <Input label="End date" type="date" value={draft.endDate} onChange={(endDate) => setDraft({ ...draft, endDate })} />
      </div>
      <button onClick={save} disabled={saving} className="mt-4 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60">{saving ? "Saving…" : "Save academic year"}</button>
    </Panel>
    <Panel title="Classes & sections">
      <Rows headers={["Section", "Class teacher", "Room", "Strength"]} rows={sections.length ? sections.map((section) => [`${section.className || "Class"}-${section.name}`, "Select teacher", "—", "—"]) : [["Loading classes…", "—", "—", "—"]]} />
    </Panel>
    <Panel title="Subjects">
      <div className="flex flex-wrap gap-2">{subjects.length ? subjects.map((subject) => <span key={subject.id} className="rounded-full bg-muted px-3 py-1.5 text-xs">{subject.name}</span>) : <span className="text-sm text-muted-foreground">Loading subjects…</span>}</div>
    </Panel>
  </div>;
}

function Exams() {
  return <div className="space-y-5">
    <Panel title="Exams & results"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{["Unit Test 1 · Published", "Half-yearly · Entry open", "Unit Test 2 · Scheduled", "Annual exam · Scheduled"].map((exam) => <div key={exam} className="rounded-lg border border-border p-3 text-sm"><p className="font-medium">{exam.split(" · ")[0]}</p><p className="mt-1 text-xs text-muted-foreground">{exam.split(" · ")[1]}</p></div>)}</div></Panel>
    <Panel title="Marks entry progress · Half-yearly"><Rows headers={["Class", "Progress", "Status"]} rows={["6-A", "8 / 8 subjects", "Locked", "6-B", "6 / 8 subjects", "Entered", "7-A", "4 / 8 subjects", "Entered", "8-A", "7 / 8 subjects", "Entered"].reduce<string[][]>((rows, value, index, values) => index % 3 === 0 ? [...rows, values.slice(index, index + 3)] : rows, [])} /></Panel>
  </div>;
}

function Fees() {
  return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{["₹4.2L|Billed this year", "₹3.1L|Collected", "₹1.1L|Outstanding", "₹42K|Overdue"].map((item) => { const [value, label] = item.split("|"); return <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-sm"><p className="text-xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>; })}</div><Panel title="Collection & dues"><Rows headers={["Student", "Class", "Due", "Paid", "Status"]} rows={[["Student11", "7-A", "₹12,000", "₹0", "Overdue"], ["isha gopishetty", "7-A", "₹12,000", "₹12,000", "Paid"], ["anvitha gopishetty", "7-A", "₹12,000", "₹6,000", "Part paid"], ["Student21", "8-A", "₹12,000", "₹0", "Overdue"]]} /></Panel></div>;
}

function Notices() {
  return <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><Panel title="New notice"><div className="space-y-3"><Field value="Title · e.g. PTM on Saturday" /><Field value="Write in English, Telugu or Hindi" /><div className="grid gap-3 sm:grid-cols-2"><Field value="Send to · Everyone" /><Field value="Channels · In-app, Email" /></div><button disabled title="Notices are not connected yet" className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground opacity-60">Send notice</button></div></Panel><Panel title="October 2026"><div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">{["M","T","W","T","F","S","S",...Array.from({ length: 31 }, (_, i) => String(i + 1))].map((day, i) => <div key={`${day}-${i}`} className={`rounded p-2 ${day === "13" ? "bg-primary text-primary-foreground" : "bg-muted/40"}`}>{day}</div>)}</div></Panel></div>;
}

function Reports() {
  return <div className="grid gap-4 md:grid-cols-3">{["Attendance report", "Academic report", "Enrollment report", "Fee report", "Teacher workload", "Custom export"].map((item) => <Panel key={item} title={item}><p className="text-sm text-muted-foreground">Choose a date range and download a report for the active campus.</p><button disabled title="Reports are not connected yet" className="mt-4 rounded-lg border border-border px-3 py-2 text-xs font-medium opacity-60">Open report</button></Panel>)}</div>;
}

function Roles() {
  return <Panel title="Permission matrix"><Rows headers={["Capability", "Owner", "Admin", "Class teacher", "Subject teacher"]} rows={[["Institute settings", "Yes", "Limited", "—", "—"], ["Invite / remove members", "Yes", "Yes", "—", "—"], ["Mark attendance", "Yes", "Yes", "Own class", "Own periods"], ["Enter marks", "Yes", "Yes", "Own class", "Own subject"], ["Post notices", "All", "All", "Own class", "—"]]} /></Panel>;
}

function Field({ value }: { value: string }) { return <div className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm">{value}<span className="ml-2 text-muted-foreground">⌄</span></div>; }
function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="text-xs text-muted-foreground">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground" /></label>;
}
function Rows({ headers, rows }: { headers: string[]; rows: string[][] }) { return <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-muted/50 uppercase tracking-wide text-muted-foreground"><tr>{headers.map((header) => <th key={header} className="px-3 py-2 font-medium">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-border">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2.5">{cellIndex === row.length - 1 && ["Paid", "Locked", "Yes"].includes(cell) ? <span className="inline-flex items-center gap-1 text-emerald-700"><Check className="h-3 w-3" />{cell}</span> : cell}</td>)}</tr>)}</tbody></table></div>; }
