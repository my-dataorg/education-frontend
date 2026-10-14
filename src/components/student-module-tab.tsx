const MODULES = {
  results: ["Results & report card", "Published exam results and report cards will appear here."],
  notices: ["Notices & calendar", "School notices, holidays, tests, and upcoming events will appear here."],
  teachers: ["Teachers", "Your subject teachers and class teacher will appear here."],
  profile: ["Profile & documents", "Keep your student profile and school documents in one place."],
} as const;

export function StudentModuleTab({ module }: { module: keyof typeof MODULES }) {
  const [title, description] = MODULES[module];
  return (
    <section className="mt-6 space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Student workspace</p>
        <h2 className="mt-1 text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {module === "results" && <Panel title="Term 1 · 2026-27"><Rows rows={[["English", "—", "—"], ["Maths", "—", "—"], ["Science", "—", "—"]]} /><p className="mt-4 text-xs text-muted-foreground">Your report card will appear after results are published.</p></Panel>}
      {module === "notices" && <Panel title="Notices & upcoming"><Rows rows={[["Holiday on Dussehra", "13 Oct", "Everyone"], ["Unit Test 2 timetable", "20 Oct", "Class 9-A"]]} /></Panel>}
      {module === "teachers" && <Panel title="Teachers"><Rows rows={[["Teacher9", "English", "9-A"], ["Teacher11", "Maths", "9-A"], ["Teacher12", "Science", "9-A"]]} /></Panel>}
      {module === "profile" && <Panel title="Profile & documents"><div className="grid gap-3 sm:grid-cols-2"><Field label="Student" value="Student1" /><Field label="Class" value="9-A · Roll 1" /><Field label="Date of birth" value="—" /><Field label="Guardian" value="—" /></div><p className="mt-4 text-xs text-muted-foreground">Contact your school office to update profile documents.</p></Panel>}
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-border bg-card p-4 shadow-sm"><h2 className="font-semibold">{title}</h2><div className="mt-4">{children}</div></section>;
}

function Rows({ rows }: { rows: string[][] }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-muted/50 uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2">Item</th><th className="px-3 py-2">Date / subject</th><th className="px-3 py-2">Details</th></tr></thead><tbody>{rows.map((row) => <tr key={row[0]} className="border-t border-border">{row.map((cell) => <td key={cell} className="px-3 py-2.5">{cell}</td>)}</tr>)}</tbody></table></div>;
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border bg-background px-3 py-2"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-sm">{value}</p></div>;
}
