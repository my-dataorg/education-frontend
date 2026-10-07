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

export function OverviewTab({
  instituteId,
  branches,
  selectedBranch,
  selectedBranchId,
  branchEvents,
  pendingInvitations,
  canManage,
  currentUserId,
  inviteRefreshKey,
  onChanged,
  showRosterOnOverview = false,
}: Props) {
  const insights = selectedBranch?.insights;
  const [posts, setPosts] = useState<{ id: string; title: string; body: string; createdAt: string }[]>([]);
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");

  useEffect(() => {
    fetch(`/api/institutes/${instituteId}/posts`, { credentials: "include" })
      .then((response) => (response.ok ? response.json() : []))
      .then(setPosts)
      .catch(() => setPosts([]));
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
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
        </div>

        <aside className="space-y-3">
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
          <MetricCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Avg completion"
            value={
              insights?.averageCompletionPercent != null
                ? `${insights.averageCompletionPercent}%`
                : "—"
            }
            hint="assignment submissions"
          />
          <MetricCard
            icon={<ClipboardList className="h-4 w-4" />}
            label="Open tasks"
            value={insights?.openAssignments ?? 0}
            hint="due or ongoing"
          />
        </aside>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-semibold">Institute posts</h2>
        <div className="mt-3 space-y-2">
          {posts.map((post) => (
            <article key={post.id} className="rounded-lg bg-muted/40 px-3 py-2">
              <h3 className="text-sm font-medium">{post.title}</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{post.body}</p>
            </article>
          ))}
          {!posts.length && <p className="text-sm text-muted-foreground">No institute posts yet.</p>}
        </div>
        {canManage && (
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <input value={postTitle} onChange={(event) => setPostTitle(event.target.value)} placeholder="Post title" className="rounded-lg border border-border px-3 py-2 text-sm" />
            <input value={postBody} onChange={(event) => setPostBody(event.target.value)} placeholder="Share an update with the institute" className="rounded-lg border border-border px-3 py-2 text-sm" />
            <button type="button" onClick={createPost} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Post</button>
          </div>
        )}
      </section>

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
