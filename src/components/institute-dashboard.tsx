"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { CampusesTab } from "@/components/institute-tabs/campuses-tab";
import { EnrollmentTab } from "@/components/institute-tabs/enrollment-tab";
import { MembersTab } from "@/components/institute-tabs/members-tab";
import { OverviewTab } from "@/components/institute-tabs/overview-tab";
import { BranchPills, InstituteShell } from "@/components/institute-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Institute, InstituteSummary } from "@/lib/api";
import { buildInstitutePathFromSearch } from "@/lib/embed-href";
import { getInstituteTabs, resolveInstituteTab, type InstituteTabId } from "@/lib/institute-tabs";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<InstituteSummary | null>(initialSummary);
  const [loading, setLoading] = useState(!initialSummary);
  const [error, setError] = useState("");
  const [inviteRefreshKey, setInviteRefreshKey] = useState(0);

  const tabs = getInstituteTabs(detail.role);
  const activeTab = resolveInstituteTab(detail.role, searchParams.get("tab"));

  const branches = summary?.branches ?? [];
  const branchParam = searchParams.get("branch");
  const selectedBranchId =
    branchParam && branches.some((b) => b.id === branchParam)
      ? branchParam
      : defaultBranchId(branches);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) ?? null;

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

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabParam === activeTab) return;
    if (!tabParam && activeTab === "overview") return;
    if (tabParam && !tabs.some((t) => t.id === tabParam)) {
      router.replace(
        buildInstitutePathFromSearch(instituteId, searchParams, { tab: activeTab })
      );
    }
  }, [activeTab, instituteId, router, searchParams, tabs]);

  function onChanged() {
    setInviteRefreshKey((k) => k + 1);
    refreshSummary();
  }

  function tabHref(tab: InstituteTabId) {
    return buildInstitutePathFromSearch(instituteId, searchParams, {
      tab,
      branch: selectedBranchId,
    });
  }

  const branchEvents = (summary?.upcomingEvents ?? []).filter(
    (ev) => !ev.branchName || !selectedBranch || ev.branchName === selectedBranch.name
  );

  const showPrincipalRoster = detail.role === "principal" && !canManage;

  return (
    <InstituteShell
      institutes={institutes}
      instituteId={instituteId}
      branches={branches}
      selectedBranchId={selectedBranchId}
      canManage={canManage}
      campusesTabHref={canManage ? tabHref("campuses") : undefined}
      searchParams={searchParams}
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
            searchParams={searchParams}
            activeTab={activeTab}
          />
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading overview...</p>
        ) : error ? (
          <p className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : (
          <Tabs value={activeTab} className="mt-6">
            {tabs.length > 1 && (
              <TabsList aria-label="Institute sections">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id} asChild>
                    <Link href={tabHref(tab.id)}>{tab.label}</Link>
                  </TabsTrigger>
                ))}
              </TabsList>
            )}

            <TabsContent value="overview">
              <OverviewTab
                instituteId={instituteId}
                branches={branches}
                selectedBranch={selectedBranch}
                selectedBranchId={selectedBranchId}
                branchEvents={branchEvents}
                pendingInvitations={summary?.pendingInvitations ?? 0}
                canManage={canManage}
                currentUserId={currentUserId}
                inviteRefreshKey={inviteRefreshKey}
                onChanged={onChanged}
                showRosterOnOverview={showPrincipalRoster}
              />
            </TabsContent>

            {canManage && (
              <>
                <TabsContent value="members">
                  <MembersTab
                    instituteId={instituteId}
                    joinCode={detail.joinCode}
                    branches={branches}
                    selectedBranchId={selectedBranchId}
                    currentUserId={currentUserId}
                    inviteRefreshKey={inviteRefreshKey}
                    onChanged={onChanged}
                  />
                </TabsContent>

                <TabsContent value="enrollment">
                  <EnrollmentTab
                    instituteId={instituteId}
                    inviteRefreshKey={inviteRefreshKey}
                    onChanged={onChanged}
                  />
                </TabsContent>

                <TabsContent value="campuses">
                  <CampusesTab
                    instituteId={instituteId}
                    branches={branches}
                    onChanged={onChanged}
                  />
                </TabsContent>
              </>
            )}
          </Tabs>
        )}
      </div>
    </InstituteShell>
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
