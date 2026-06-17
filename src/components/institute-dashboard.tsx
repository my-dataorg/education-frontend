"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  ClipboardList,
  Copy,
  GraduationCap,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { IncomingRequestsPanel } from "@/components/incoming-requests-panel";
import { EnrollmentManager } from "@/components/enrollment-manager";
import { MembershipActions } from "@/components/membership-actions";
import { InstitutePeoplePanel } from "@/components/institute-people-panel";
import { BranchPills, InstituteShell } from "@/components/institute-shell";
import type { Institute, InstituteSummary } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/roles";

export type InstituteDetail = {
  id: string;
  name: string;
  joinCode: string;
  role: string;
  createdAt: string;
  stats: {
    staffCount: number;
    studentCount: number;
    sectionCount: number;
    branchCount: number;
  };
};

function defaultBranchId(branches: InstituteSummary["branches"]): string | null {
  if (branches.length === 0) return null;
  return branches.find((b) => b.isPrimary)?.id ?? branches[0].id;
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function InstituteDashboard({
  instituteId,
  institutes,
  detail,
  summary: initialSummary,
  canManage,
  currentUserId,
}: {
  instituteId: string;
  institutes: Institute[];
  detail: InstituteDetail;
  summary: InstituteSummary | null;
  canManage: boolean;
  currentUserId: string;
}) {
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<InstituteSummary | null>(initialSummary);
  const [loading, setLoading] = useState(!initialSummary);
  const [error, setError] = useState("");
  const [inviteRefreshKey, setInviteRefreshKey] = useState(0);
  const [addBranchOpen, setAddBranchOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchCity, setBranchCity] = useState("");
  const [addingBranch, setAddingBranch] = useState(false);

  const branches = summary?.branches ?? [];
  const branchParam = searchParams.get("branch");
  const selectedBranchId =
    branchParam && branches.some((b) => b.id === branchParam)
      ? branchParam
      : defaultBranchId(branches);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) ?? null;
  const insights = selectedBranch?.insights;

  const refreshSummary = useCallback(() => {
    fetch(`/api/institutes/${instituteId}/summary`, { credentials: "include" })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.detail || "Failed to load");
        setSummary({
          branchCount: json.branchCount ?? 0,
          pendingInvitations: json.pendingInvitations ?? 0,
          branches: json.branches ?? [],
          upcomingEvents: json.upcomingEvents ?? [],
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [instituteId]);

  useEffect(() => {
    if (initialSummary) return;
    setLoading(true);
    refreshSummary();
  }, [initialSummary, refreshSummary]);

  function onChanged() {
    setInviteRefreshKey((k) => k + 1);
    refreshSummary();
  }

  async function addBranch(e: React.FormEvent) {
    e.preventDefault();
    setAddingBranch(true);
    await fetch(`/api/institutes/${instituteId}/branches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: branchName.trim(), address: "", city: branchCity, isPrimary: false }),
    });
    setAddingBranch(false);
    setBranchName("");
    setBranchCity("");
    setAddBranchOpen(false);
    refreshSummary();
  }

  const branchEvents = (summary?.upcomingEvents ?? []).filter(
    (ev) => !ev.branchName || !selectedBranch || ev.branchName === selectedBranch.name
  );

  return (
    <InstituteShell
      institutes={institutes}
      instituteId={instituteId}
      branches={branches}
      selectedBranchId={selectedBranchId}
      canManage={canManage}
      onAddBranch={canManage ? () => setAddBranchOpen(true) : undefined}
    >
      <div className="px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{detail.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedBranch?.name ?? "Overview"}
              {selectedBranch?.isPrimary && " · Main campus"}
              {" · "}
              {ROLE_LABELS[detail.role] || detail.role}
            </p>
          </div>
          {canManage && <JoinCodeChip code={detail.joinCode} />}
        </div>

        <div className="mt-4">
          <BranchPills
            instituteId={instituteId}
            branches={branches}
            selectedBranchId={selectedBranchId}
          />
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading overview...</p>
        ) : error ? (
          <p className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
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
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-5">
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
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Submission rates by assignment
                </p>
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

            {(summary?.pendingInvitations ?? 0) > 0 && canManage && (
              <p className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
                {summary?.pendingInvitations} invitation
                {summary?.pendingInvitations === 1 ? "" : "s"} awaiting response.
              </p>
            )}

            {canManage && (
              <MembershipActions
                instituteId={instituteId}
                joinCode={detail.joinCode}
                onChanged={onChanged}
              />
            )}

            <IncomingRequestsPanel
              instituteId={instituteId}
              canManage={canManage}
              refreshKey={inviteRefreshKey}
              onChanged={onChanged}
            />

            {canManage && (
              <EnrollmentManager
                instituteId={instituteId}
                refreshKey={inviteRefreshKey}
                onChanged={onChanged}
              />
            )}

            {selectedBranchId && (
              <div className="mt-6">
                <InstitutePeoplePanel
                  instituteId={instituteId}
                  branches={branches}
                  branchId={selectedBranchId}
                  canManage={canManage}
                  currentUserId={currentUserId}
                  refreshKey={inviteRefreshKey}
                  onChanged={onChanged}
                />
              </div>
            )}
          </>
        )}
      </div>

      <Modal open={addBranchOpen} onClose={() => setAddBranchOpen(false)} title="Add campus">
        <form onSubmit={addBranch} className="space-y-3">
          <input
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            placeholder="Campus name"
            required
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
          <input
            value={branchCity}
            onChange={(e) => setBranchCity(e.target.value)}
            placeholder="City (optional)"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={addingBranch || !branchName.trim()}
            className="w-full rounded-lg bg-primary py-2 text-sm text-primary-foreground disabled:opacity-60"
          >
            {addingBranch ? "Adding..." : "Create campus"}
          </button>
        </form>
      </Modal>
    </InstituteShell>
  );
}

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

function JoinCodeChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs shadow-sm transition hover:bg-muted/60"
    >
      <span className="text-muted-foreground">Join</span>
      <code className="font-semibold tracking-wider">{code}</code>
      <Copy className="h-3 w-3 text-muted-foreground" />
      {copied && <span className="text-primary">Copied</span>}
    </button>
  );
}
