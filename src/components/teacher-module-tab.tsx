import { CalendarCheck, ClipboardCheck, FileText } from "lucide-react";

const MODULES = {
  marks: ["Marks & gradebook", "Enter marks, review class progress, and submit results to the office."],
  "class-teacher": ["Class-teacher tools", "Review class attendance, remarks, notices, and student follow-up."],
  leave: ["Leave requests", "Review and submit leave requests for the institute."],
  notices: ["Notices", "View institute and class notices relevant to your teaching assignments."],
} as const;

export function TeacherModuleTab({ module }: { module: keyof typeof MODULES }) {
  const [title, description] = MODULES[module];
  return (
    <section className="mt-6 space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Teacher workspace</p>
        <h2 className="mt-1 text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <ModuleCard icon={module === "leave" ? CalendarCheck : FileText} label={module === "marks" ? "Marks waiting" : "To review"} value={module === "marks" ? "12" : "—"} />
        <ModuleCard icon={ClipboardCheck} label="This academic year" value="2026-27" />
        <ModuleCard icon={FileText} label="Recent activity" value="No items" />
      </div>
      {module === "marks" && <Panel title="Marks & gradebook"><Rows rows={["Student1", "Student11", "Student21", "Student31", "Student41"].map((student) => [student, "— / 80", "Optional"])} /></Panel>}
      {module === "class-teacher" && <Panel title="Class-teacher tools"><Rows rows={[["Attendance", "9-A", "Review today"], ["Remarks", "9-A", "No remarks yet"], ["Notices", "9-A", "Post an update"]]} /></Panel>}
      {module === "leave" && <Panel title="Leave requests"><Rows rows={[["Student21", "9-A", "Pending"], ["Teacher6", "Staff", "Approved"]]} /></Panel>}
      {module === "notices" && <Panel title="Notices"><p className="text-sm text-muted-foreground">No notices for your classes yet.</p></Panel>}
    </section>
  );
}

function ModuleCard({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-4 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-4 shadow-sm"><h2 className="font-semibold">{title}</h2><div className="mt-4">{children}</div></section>;
}

function Rows({ rows }: { rows: string[][] }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-muted/50 uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Student</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row[0]} className="border-t border-border">{row.map((cell) => <td key={cell} className="px-3 py-2.5">{cell}</td>)}</tr>)}</tbody></table></div>;
}
