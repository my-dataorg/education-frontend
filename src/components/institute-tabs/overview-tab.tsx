"use client";

import {
  Calendar,
  ClipboardList,
  GraduationCap,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { InstitutePeoplePanel } from "@/components/institute-people-panel";
import type { InstituteSummary } from "@/lib/api";

type Branch = InstituteSummary["branches"][number];

type Props = {
  instituteId: string;
  branches: InstituteSummary["branches"];
  selectedBranch: Branch | null;
  selectedBranchId: string | null;
  branchEvents: InstituteSummary["upcomingEvents"];
  pendingInvitations: number;
  canManage: boolean;
  currentUserId: string;
  currentUserName: string;
  inviteRefreshKey: number;
  onChanged: () => void;
  showRosterOnOverview?: boolean;
};

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">{icon}</div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="text-xs font-medium text-foreground">{label}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function AttendanceByClass({
  sections,
}: {
  sections: { id: string; name: string; className?: string }[];
}) {
  const visibleSections = sections.slice(0, 8);
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold">Attendance by class, today</h2>
      <div className="mt-4 flex h-28 items-end gap-2">
        {visibleSections.map((section) => (
          <div key={section.id} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-20 w-full items-end rounded-t-md bg-muted/40">
              <div className="w-full rounded-t-md bg-primary/30" style={{ height: "70%" }} />
            </div>
            <span className="truncate text-[10px] text-muted-foreground">
              {section.className}-{section.name}
            </span>
          </div>
        ))}
      </div>
      {!visibleSections.length && <p className="mt-4 text-sm text-muted-foreground">No classes configured.</p>}
      <p className="mt-3 text-[11px] text-muted-foreground">Grey bar = not yet marked. Open a class to view its register.</p>
    </section>
  );
}

export function OverviewTab({
  instituteId,
  branches,
  selectedBranch,
  selectedBranchId,
  branchEvents,
  pendingInvitations,
  canManage,
  currentUserId,
  currentUserName,
  inviteRefreshKey,
  onChanged,
  showRosterOnOverview = false,
}: Props) {
  const insights = selectedBranch?.insights;
  const [posts, setPosts] = useState<{ id: string; title: string; body: string; createdAt: string }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string; className?: string }[]>([]);
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");

  useEffect(() => {
    fetch(`/api/institutes/${instituteId}/posts`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : []))
      .then(setPosts)
      .catch(() => setPosts([]));
  }, [instituteId]);

  useEffect(() => {
    fetch(`/api/institutes/${instituteId}/sections`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : []))
      .then(setSections)
      .catch(() => setSections([]));
  }, [instituteId]);

  async function createPost() {
    if (!postTitle.trim() || !postBody.trim()) return;
    const response = await fetch(`/api/institutes/${instituteId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: postTitle, body: postBody }),
    });
    if (!response.ok) return;
    const created = await response.json();
    setPosts((current) => [created, ...current]);
    setPostTitle("");
    setPostBody("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Good evening, {currentUserName.split(" ")[0]}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Campus: {selectedBranch?.name || "Main campus"} · {new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-3">
        <MetricCard
          icon={<GraduationCap className="h-4 w-4" />}
          label="Students"
          value={selectedBranch?.studentCount ?? 0}
          hint="at this campus"
        />
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="Staff"
          value={selectedBranch?.teacherCount ?? 0}
          hint="teaching here"
        />
        <MetricCard icon={<ClipboardList className="h-4 w-4" />} label="Attendance today" value="—" hint="classes unmarked" />
        <MetricCard icon={<ClipboardList className="h-4 w-4" />} label="Fees this month" value="—" hint="collected · — due" />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Avg completion"
          value={insights?.averageCompletionPercent != null ? `${insights.averageCompletionPercent}%` : "—"}
          hint="assignment submissions"
        />
        <MetricCard
          icon={<ClipboardList className="h-4 w-4" />}
          label="Pending approvals"
          value={pendingInvitations}
          hint="requests, leave"
        />
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Needs your attention</h2>
        <div className="mt-3 divide-y divide-border">
          {[
            [`${pendingInvitations} join requests waiting`, "Review"],
            ["Classes have not marked attendance today", "View"],
            ["Timetable clash needs review", "Fix"],
            ["Teachers on leave tomorrow, no substitute", "Assign"],
            ["Half-yearly marks are pending", "Nudge"],
            ["Students with fees overdue", "Remind"],
          ].map(([item, action]) => (
            <div key={item} className="flex items-center justify-between gap-3 py-2.5 text-xs">
              <span>{item}</span>
              <button type="button" className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">{action}</button>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
        <AttendanceByClass sections={sections} />
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Upcoming</h2>
          <div className="mt-3 space-y-2">
            {branchEvents.slice(0, 4).map((event, index) => (
              <div key={`${event.title}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2.5 text-xs">
                <span>{event.title}</span>
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] text-amber-700">
                  {new Date(event.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
            {!branchEvents.length && <p className="text-xs text-muted-foreground">No upcoming events.</p>}
          </div>
          <h2 className="mt-5 border-t border-border pt-4 text-sm font-semibold">Institute posts</h2>
          <div className="mt-3 space-y-2">
            {posts.slice(0, 2).map((post) => (
              <article key={post.id} className="rounded-lg bg-muted/40 px-3 py-2">
                <p className="text-xs font-medium">{post.title}</p>
                <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{post.body}</p>
              </article>
            ))}
            {!posts.length && <p className="text-xs text-muted-foreground">No institute posts yet.</p>}
          </div>
          {canManage && (
            <div className="mt-3 space-y-2">
              <input value={postTitle} onChange={(event) => setPostTitle(event.target.value)} placeholder="Post title" className="w-full rounded-lg border border-border px-3 py-2 text-xs" />
              <textarea value={postBody} onChange={(event) => setPostBody(event.target.value)} placeholder="Share an update" rows={2} className="w-full rounded-lg border border-border px-3 py-2 text-xs" />
              <button type="button" onClick={createPost} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground">Post</button>
            </div>
          )}
        </section>
      </div>

      <div className="hidden">
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-5">
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Calendar className="h-4 w-4 text-primary" />
            Upcoming events
          </h2>
          {branchEvents.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No assignment deadlines coming up for this campus.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {branchEvents.map((ev, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">{ev.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{ev.sectionName}</p>
                  </div>
                  <time className="shrink-0 text-xs font-medium text-primary">
                    {new Date(ev.dueDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </li>
              ))}
            </ul>
          )}
            </section>

            <section className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold">Recent results</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Submission rates by assignment</p>
          {!insights?.recentResults?.length ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No assignments yet. Results appear when teachers publish work.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {insights.recentResults.map((result) => (
                <li key={result.assignmentId}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{result.title}</p>
                      <p className="text-xs text-muted-foreground">{result.sectionName}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                      {result.completionPercent}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${result.completionPercent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {result.submittedCount}/{result.enrolledStudents} submitted
                  </p>
                </li>
              ))}
            </ul>
          )}
            </section>
          </div>

          {pendingInvitations > 0 && canManage && (
            <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
              {pendingInvitations} invitation{pendingInvitations === 1 ? "" : "s"} awaiting response.
            </p>
          )}

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="font-semibold">Institute posts</h2>
            <div className="mt-3 space-y-2">
              {posts.map((post) => (
                <article key={post.id} className="rounded-lg bg-muted/40 px-3 py-2">
                  <h3 className="text-sm font-medium">{post.title}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {post.body}
                  </p>
                </article>
              ))}
              {!posts.length && (
                <p className="text-sm text-muted-foreground">No institute posts yet.</p>
              )}
            </div>
            {canManage && (
              <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                <input
                  value={postTitle}
                  onChange={(event) => setPostTitle(event.target.value)}
                  placeholder="Post title"
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                />
                <input
                  value={postBody}
                  onChange={(event) => setPostBody(event.target.value)}
                  placeholder="Share an update with the institute"
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={createPost}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
                >
                  Post
                </button>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-3">
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Upcoming</h2>
            <div className="mt-3 space-y-2">
              {branchEvents.slice(0, 4).map((event, index) => (
                <div key={`${event.title}-${index}`} className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-xs font-medium">{event.title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(event.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                </div>
              ))}
              {!branchEvents.length && <p className="text-xs text-muted-foreground">No upcoming events.</p>}
            </div>
          </section>
        </aside>
      </div>

      {showRosterOnOverview && selectedBranchId && (
        <InstitutePeoplePanel
          instituteId={instituteId}
          branches={branches}
          branchId={selectedBranchId}
          canManage={false}
          currentUserId={currentUserId}
          refreshKey={inviteRefreshKey}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}
