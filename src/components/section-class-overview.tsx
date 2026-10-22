"use client";

import { useEffect, useState } from "react";

type Dashboard = {
  absenceAlertDays: number;
  todayAttendance: {
    date: string;
    marked: number;
    totalStudents: number;
    counts: {
      present: number;
      absent: number;
      late: number;
      excused: number;
      unmarked: number;
    };
    students: { userId: string; displayName?: string; status: string }[];
    publishState?: string | null;
  };
  prolongedAbsence: { userId: string; displayName?: string; consecutiveAbsentDays: number }[];
  upcomingExams: { id: string; title: string; dueDate: string | null }[];
  notices: { id: string; title: string; body: string; createdAt?: string }[];
  awards: { id: string; title: string; body: string; createdAt?: string }[];
  events: { id: string; title: string; description: string; eventDate: string }[];
};

function formatDay(value: string) {
  return new Date(value + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function SectionClassOverview({
  sectionId,
  onOpenAttendance,
}: {
  sectionId: string;
  onOpenAttendance?: () => void;
}) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    setError("");
    fetch(`/api/sections/${sectionId}/class-dashboard`, { credentials: "include", cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Could not load class overview");
        return res.json() as Promise<Dashboard>;
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load class overview"));
  }, [sectionId]);

  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
    );
  }
  if (!data) {
    return <p className="text-sm text-muted-foreground">Loading class overview…</p>;
  }

  const att = data.todayAttendance;
  const notMarked = att.marked === 0;
  const isDraft = att.publishState === "draft";

  return (
    <div className="space-y-5">
      {isDraft && (
        <div
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
          role="status"
        >
          <p className="font-semibold">Attendance saved — not submitted</p>
          <p className="mt-1 text-amber-900/90">
            You saved today&apos;s roll call as a draft. Only you (and admins) can see it until you submit.
          </p>
          {onOpenAttendance && (
            <button
              type="button"
              onClick={onOpenAttendance}
              className="mt-3 rounded-lg bg-amber-800 px-3 py-2 text-xs font-medium text-amber-50 hover:bg-amber-900"
            >
              Open Attendance to submit
            </button>
          )}
        </div>
      )}
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-semibold">Today&apos;s attendance</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDay(att.date)}
          {isDraft && (
            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900">Draft</span>
          )}
        </p>
        {notMarked ? (
          <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Attendance has not been marked for this class today.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Chip label="Present" value={att.counts.present} />
            <Chip label="Absent" value={att.counts.absent} tone="danger" />
            <Chip label="Late" value={att.counts.late} />
            <Chip label="Excused" value={att.counts.excused} tone="excused" />
            {att.counts.unmarked > 0 && (
              <Chip label="Unmarked" value={att.counts.unmarked} tone="muted" />
            )}
          </div>
        )}
        {att.students.filter((s) => s.status === "absent").length > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Absent today:{" "}
            <span className="text-foreground font-medium">
              {att.students
                .filter((s) => s.status === "absent")
                .map((s) => s.displayName || "Student")
                .join(", ")}
            </span>
          </p>
        )}
      </section>

      {data.prolongedAbsence.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
          <h2 className="font-semibold text-amber-950">
            Absent {data.absenceAlertDays}+ days in a row
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-950">
            {data.prolongedAbsence.map((row) => (
              <li key={row.userId}>
                {row.displayName || "Student"} — {row.consecutiveAbsentDays} consecutive absent days
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <FeedCard
          title="Exams this week"
          empty="No tests scheduled in the next 7 days."
          items={data.upcomingExams.map((exam) => ({
            id: exam.id,
            title: exam.title,
            meta: exam.dueDate ? formatDay(exam.dueDate) : "Date TBD",
          }))}
        />
        <FeedCard
          title="Class events"
          empty="No class events in the next 7 days."
          items={data.events.map((event) => ({
            id: event.id,
            title: event.title,
            meta: formatDay(event.eventDate),
            body: event.description,
          }))}
        />
        <FeedCard
          title="Notices for this class"
          empty="No class notices yet."
          items={data.notices.map((post) => ({
            id: post.id,
            title: post.title,
            body: post.body,
          }))}
        />
        <FeedCard
          title="Awards & recognition"
          empty="No awards or recognition posts for this class."
          items={data.awards.map((post) => ({
            id: post.id,
            title: post.title,
            body: post.body,
          }))}
        />
      </div>
    </div>
  );
}

function Chip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "danger" | "muted" | "excused";
}) {
  const styles =
    tone === "danger"
      ? "bg-red-100 text-red-900"
      : tone === "excused"
        ? "bg-orange-100 text-orange-900"
      : tone === "muted"
        ? "bg-muted text-muted-foreground"
        : "bg-muted/60 text-foreground";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles}`}>
      {label}: {value}
    </span>
  );
}

function FeedCard({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { id: string; title: string; meta?: string; body?: string }[];
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      {!items.length ? (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{item.title}</span>
                {item.meta && <span className="shrink-0 text-xs text-primary">{item.meta}</span>}
              </div>
              {item.body && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground whitespace-pre-wrap">
                  {item.body}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
