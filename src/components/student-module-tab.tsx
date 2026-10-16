import type { InstitutePost, Member } from "@/lib/api";

type Exam = {
  id: string;
  name: string;
  maxMarks: number;
  scheduledAt: string | null;
  status: string;
};

type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  eventDate: string;
};

const MODULES = {
  results: ["Results & report card", "Published exam results and report cards."],
  notices: ["Notices & calendar", "School notices, holidays, and upcoming events."],
  profile: ["Profile & documents", "Your student profile and subject teachers."],
} as const;

export function StudentModuleTab({
  module,
  exams,
  posts,
  events,
  studentName,
  sections,
  teachers,
}: {
  module: keyof typeof MODULES;
  exams: Exam[];
  posts: InstitutePost[];
  events: CalendarEvent[];
  studentName: string;
  sections: { className: string; name: string }[];
  teachers: Member[];
}) {
  const [title, description] = MODULES[module];
  const classLabel = sections.map((s) => `${s.className}-${s.name}`).join(", ") || "—";
  const publishedExams = exams.filter((exam) => exam.status === "published");

  return (
    <section className="mt-6 space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Student workspace</p>
        <h2 className="mt-1 text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      {module === "results" && (
        <Panel title="Published exams">
          {!publishedExams.length ? (
            <p className="text-sm text-muted-foreground">Your report card will appear after results are published.</p>
          ) : (
            <div className="space-y-2">
              {publishedExams.map((exam) => (
                <div key={exam.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <span className="font-medium">{exam.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {exam.scheduledAt || "—"} · Max {exam.maxMarks}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {module === "notices" && (
        <div className="space-y-4">
          <Panel title="Notices">
            {!posts.length ? (
              <p className="text-sm text-muted-foreground">No notices yet.</p>
            ) : (
              <div className="space-y-2">
                {posts.map((post) => (
                  <article key={post.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                    <p className="font-medium">{post.title}</p>
                    <p className="mt-1 text-muted-foreground">{post.body}</p>
                  </article>
                ))}
              </div>
            )}
          </Panel>
          <Panel title="Calendar">
            {!events.length ? (
              <p className="text-sm text-muted-foreground">No upcoming events.</p>
            ) : (
              <div className="space-y-2">
                {events.map((event) => (
                  <div key={event.id} className="flex justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                    <span>{event.title}</span>
                    <span className="text-muted-foreground">{event.eventDate}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {module === "profile" && (
        <Panel title="Profile & teachers">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Student" value={studentName} />
            <Field label="Class" value={classLabel} />
          </div>
          <h3 className="mt-5 text-sm font-semibold">Teachers</h3>
          {!teachers.length ? (
            <p className="mt-2 text-sm text-muted-foreground">Teachers will appear when subjects are assigned.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {teachers.map((teacher) => (
                <li key={teacher.userId} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  {teacher.displayName || teacher.username || teacher.userId}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-foreground">Contact your school office to update profile documents.</p>
        </Panel>
      )}
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

export type { Exam, CalendarEvent };
