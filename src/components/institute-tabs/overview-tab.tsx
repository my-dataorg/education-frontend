"use client";

import {
  Calendar,
  ClipboardList,
  GraduationCap,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { InstitutePeoplePanel } from "@/components/institute-people-panel";
import type { InstituteSummary } from "@/lib/api";
import { buildInstitutePathFromSearch } from "@/lib/embed-href";

type Branch = InstituteSummary["branches"][number];
type Overview = {
  stats: {
    students: number | null;
    staff: number | null;
    attendancePercent: number | null;
    unmarkedClasses: number | null;
    assignmentCompletionPercent: number | null;
    pendingApprovals: number | null;
  };
  attention: { kind: string; count: number; label: string }[];
  attendanceByClass: { sectionId: string; label: string; marked: boolean; present: number; total: number; percent: number | null }[];
  upcoming: { id: string; title: string; date: string; type: string; sectionId: string }[];
  posts: { id: string; title: string; body: string; createdAt: string }[];
};

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
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint: string;
  href?: string;
}) {
  const card = (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/50">
      <div className="flex items-center gap-2 text-muted-foreground">{icon}</div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="text-xs font-medium text-foreground">{label}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function AttendanceByClass({
  sections,
  instituteId,
  attendanceTabHref,
}: {
  sections: Overview["attendanceByClass"];
  instituteId: string;
  attendanceTabHref: string;
}) {
  const visibleSections = sections;
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold">
        <Link href={attendanceTabHref} className="hover:text-primary">Attendance by class, today</Link>
      </h2>
      <div className="mt-4 flex h-28 items-end gap-2">
        {visibleSections.map((section) => (
          <Link href={`/institutes/${instituteId}/sections/${section.sectionId}?tab=attendance`} key={section.sectionId} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className={`flex h-20 w-full items-end rounded-t-md ${section.marked ? "bg-muted/40" : "border border-dashed border-muted-foreground/40 bg-muted/20"}`}>
              <div className={`w-full rounded-t-md ${section.percent != null && section.percent < 60 ? "bg-red-400" : section.percent != null && section.percent < 75 ? "bg-amber-400" : "bg-primary/60"}`} style={{ height: `${section.percent ?? 4}%` }} />
            </div>
            <span className="truncate text-[10px] text-muted-foreground">
              {section.label}
            </span>
          </Link>
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const instituteHref = useCallback(
    (overrides: Record<string, string | null | undefined>) =>
      buildInstitutePathFromSearch(instituteId, searchParams, {
        branch: selectedBranchId,
        ...overrides,
      }),
    [instituteId, searchParams, selectedBranchId]
  );
  const campusSelectValue =
    searchParams.get("branch") === "all" ? "all" : selectedBranchId || "";
  const insights = selectedBranch?.insights;
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const posts = overview?.posts ?? [];
  const currentHour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");

  useEffect(() => {
    const campus = selectedBranchId ? `?campus_id=${selectedBranchId}` : "";
    fetch(`/api/institutes/${instituteId}/overview${campus}`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load overview");
        setOverview(await response.json());
        setError("");
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load overview"))
      .finally(() => setLoading(false));
  }, [instituteId, selectedBranchId]);

  async function createPost() {
    if (!postTitle.trim() || !postBody.trim()) return;
    const response = await fetch(`/api/institutes/${instituteId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: postTitle, body: postBody }),
    });
    if (!response.ok) return;
    const created = await response.json();
    setOverview((current) => current ? { ...current, posts: [created, ...current.posts].slice(0, 3) } : current);
    setPostTitle("");
    setPostBody("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">{greeting}, {currentUserName.split(" ")[0]}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
            <span>Campus:</span>
            {branches.length > 1 ? (
              <select
                value={campusSelectValue}
                onChange={(event) => {
                  const value = event.target.value;
                  router.replace(
                    buildInstitutePathFromSearch(instituteId, searchParams, {
                      tab: "overview",
                      branch: value === "all" ? "all" : value || null,
                    })
                  );
                }}
                className="max-w-[10rem] rounded-md border border-border bg-background px-1.5 py-0.5 text-xs text-foreground"
                aria-label="Filter by campus"
              >
                <option value="all">All campuses</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            ) : (
              <span>{selectedBranch?.name || "Main campus"}</span>
            )}
            <span>· {new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</span>
          </p>
        </div>
      </div>
      {error && <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"><span>{error}</span><button type="button" onClick={() => window.location.reload()} className="font-medium underline">Retry</button></div>}

      <div className="grid grid-cols-6 gap-3">
        <MetricCard
          icon={<GraduationCap className="h-4 w-4" />}
          label="Students"
          value={loading ? "…" : overview?.stats.students ?? "—"}
          hint="at this campus"
          href={instituteHref({ tab: "members", memberTab: "students" })}
        />
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="Staff"
          value={loading ? "…" : overview?.stats.staff ?? "—"}
          hint="teaching here"
          href={instituteHref({ tab: "members", memberTab: "staff" })}
        />
        <MetricCard
          icon={<ClipboardList className="h-4 w-4" />}
          label="Attendance today"
          value={overview?.stats.attendancePercent != null ? `${overview.stats.attendancePercent}%` : "—"}
          hint={`${overview?.stats.unmarkedClasses ?? "—"} classes unmarked`}
          href={instituteHref({ tab: "attendance", register: "unmarked" })}
        />
        <MetricCard icon={<ClipboardList className="h-4 w-4" />} label="Fees this month" value="—" hint="Set up a fee plan" href={instituteHref({ tab: "fees" })} />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Avg completion"
          value={overview?.stats.assignmentCompletionPercent != null ? `${overview.stats.assignmentCompletionPercent}%` : "—"}
          hint="assignment submissions"
          href={instituteHref({ tab: "reports", report: "assignments" })}
        />
        <MetricCard
          icon={<ClipboardList className="h-4 w-4" />}
          label="Pending approvals"
          value={overview?.stats.pendingApprovals ?? pendingInvitations}
          hint="requests, leave"
          href={instituteHref({ tab: "members", memberTab: "requests" })}
        />
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Needs your attention</h2>
        <div className="mt-3 divide-y divide-border">
          {!overview?.attention.length && !loading && <p className="py-2 text-xs text-muted-foreground">Nothing needs your attention right now.</p>}
          {overview?.attention.map((item) => (
            <div key={item.kind} className="flex items-center justify-between gap-3 py-2.5 text-xs">
              <span>{item.label}</span>
              <Link
                href={
                  item.kind === "join_requests"
                    ? instituteHref({ tab: "members", memberTab: "requests" })
                    : instituteHref({ tab: "attendance", register: "unmarked" })
                }
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                {item.kind === "join_requests" ? "Review" : "View"}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
        <AttendanceByClass
          instituteId={instituteId}
          sections={overview?.attendanceByClass ?? []}
          attendanceTabHref={instituteHref({ tab: "attendance" })}
        />
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Upcoming</h2>
          <div className="mt-3 space-y-2">
            {(overview?.upcoming ?? branchEvents.slice(0, 4)).map((event, index) => (
              <div key={`${event.title}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2.5 text-xs">
                <span>{event.title}</span>
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] text-amber-700">
                  {new Date("date" in event ? event.date : event.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
            {!branchEvents.length && <p className="text-xs text-muted-foreground">No upcoming events.</p>}
          </div>
          <h2 className="mt-5 border-t border-border pt-4 text-sm font-semibold">Institute posts</h2>
          <div className="mt-3 space-y-2">
            {(overview?.posts ?? []).slice(0, 2).map((post) => (
              <article key={post.id} className="rounded-lg bg-muted/40 px-3 py-2">
                <p className="text-xs font-medium">{post.title}</p>
                <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{post.body}</p>
              </article>
            ))}
            {!overview?.posts.length && <p className="text-xs text-muted-foreground">No institute posts yet.</p>}
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
