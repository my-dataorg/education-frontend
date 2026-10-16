import type { InstitutePost } from "@/lib/api";
import { CalendarCheck, ClipboardCheck, FileText } from "lucide-react";

const MODULES = {
  marks: ["Marks & gradebook", "Enter marks, review class progress, and submit results to the office."],
  "class-teacher": ["Class-teacher tools", "Review class attendance, remarks, notices, and student follow-up."],
  leave: ["Leave requests", "Review and submit leave requests for the institute."],
  notices: ["Notices", "View institute and class notices relevant to your teaching assignments."],
} as const;

export function TeacherModuleTab({
  module,
  posts = [],
}: {
  module: keyof typeof MODULES;
  posts?: InstitutePost[];
}) {
  const [title, description] = MODULES[module];
  return (
    <section className="mt-6 space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Teacher workspace</p>
        <h2 className="mt-1 text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {module !== "notices" && (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          This module is not wired to the server yet. Use My classes for attendance, assignments, and daily notes.
        </div>
      )}
      {module === "notices" && (
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="font-semibold">Institute notices</h3>
          <div className="mt-3 space-y-3">
            {posts.map((post) => (
              <article key={post.id} className="rounded-lg bg-muted/40 px-3 py-2">
                <h4 className="text-sm font-medium">{post.title}</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{post.body}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {new Date(post.createdAt).toLocaleDateString("en-IN")}
                </p>
              </article>
            ))}
            {!posts.length && <p className="text-sm text-muted-foreground">No notices for your institute yet.</p>}
          </div>
        </section>
      )}
      {module === "marks" && (
        <div className="grid gap-3 md:grid-cols-3">
          <ModuleCard icon={ClipboardCheck} label="Marks waiting" value="—" />
          <ModuleCard icon={FileText} label="This academic year" value="—" />
          <ModuleCard icon={CalendarCheck} label="Recent activity" value="—" />
        </div>
      )}
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
