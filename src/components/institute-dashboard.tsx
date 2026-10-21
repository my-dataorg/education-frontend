"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ConfigureTab } from "@/components/institute-tabs/configure-tab";
import { ProfileTab } from "@/components/institute-tabs/profile-tab";
import { AssociationTab } from "@/components/institute-tabs/association-tab";
import { ClassesBrowseTab } from "@/components/classes-browse-tab";
import { ClassesMenuTab } from "@/components/institute-tabs/classes-menu-tab";
import { DailyNotesTab } from "@/components/institute-tabs/daily-notes-tab";
import { OverviewTab } from "@/components/institute-tabs/overview-tab";
import { ScheduleTab } from "@/components/institute-tabs/schedule-tab";
import { AttendanceTab } from "@/components/institute-tabs/attendance-tab";
import { ExamsTab } from "@/components/institute-tabs/exams-tab";
import { FeesTab } from "@/components/institute-tabs/fees-tab";
import { NoticesTab } from "@/components/institute-tabs/notices-tab";
import { ReportsTab } from "@/components/institute-tabs/reports-tab";
import { BranchPills, InstituteShell } from "@/components/institute-shell";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { educationNavActiveId } from "@/lib/education-nav";
import type { InstituteSummary } from "@/lib/api";
import { buildInstitutePathFromSearch } from "@/lib/embed-href";
import {
  getInstituteTabs,
  legacyTabQueryOverrides,
  resolveInstituteTab,
  type InstituteTabId,
} from "@/lib/institute-tabs";
import { INSTITUTE_ADMIN_ROLES, ROLE_LABELS } from "@/lib/roles";
import { EducationContextReporter } from "@/components/education-context-reporter";

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
  detail,
  summary: initialSummary,
  canManage,
  currentUserId,
  currentUserName,
}: {
  instituteId: string;
  detail: InstituteDetail;
  summary: InstituteSummary | null;
  canManage: boolean;
  currentUserId: string;
  currentUserName: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<InstituteSummary | null>(initialSummary);
  const [loading, setLoading] = useState(!initialSummary);
  const [error, setError] = useState("");
  const [inviteRefreshKey, setInviteRefreshKey] = useState(0);
  const [joinCode, setJoinCode] = useState(detail.joinCode);

  const tabs = getInstituteTabs(detail.role);
  const tabParam = searchParams.get("tab");
  const activeTab = resolveInstituteTab(
    detail.role,
    tabParam,
    searchParams.get("enrollmentModule")
  );

  const branches = summary?.branches ?? [];
  const branchParam = searchParams.get("branch");
  const selectedBranchId =
    branchParam === "all"
      ? null
      : branchParam && branches.some((b) => b.id === branchParam)
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
    const timer = window.setTimeout(() => {
      setLoading(true);
      refreshSummary();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialSummary, refreshSummary]);

  useEffect(() => {
    const legacy = legacyTabQueryOverrides(tabParam, searchParams);
    if (!legacy) return;
    router.replace(buildInstitutePathFromSearch(instituteId, searchParams, legacy));
  }, [instituteId, router, searchParams, tabParam]);

  useEffect(() => {
    if (!tabParam) return;
    if (tabParam === activeTab) return;
    if (!tabs.some((t) => t.id === tabParam)) {
      router.replace(
        buildInstitutePathFromSearch(instituteId, searchParams, { tab: activeTab })
      );
    }
  }, [activeTab, instituteId, router, searchParams, tabParam, tabs]);

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

  const canAdminWorkspace = INSTITUTE_ADMIN_ROLES.has(detail.role);
  const isOwner = detail.role === "owner";
  const showOwnerSetup = isOwner || detail.role === "principal";

  return (
    <>
    <EducationContextReporter
      instituteName={detail.name}
      subtitle={branches.length > 1 ? selectedBranch?.name : undefined}
      role={ROLE_LABELS[detail.role] || detail.role}
      showManageInstitutes={canAdminWorkspace}
    />
    <div className="flex min-h-0 flex-1 flex-col">
    <InstituteShell
      instituteId={instituteId}
      branches={branches}
      selectedBranchId={selectedBranchId}
      searchParams={searchParams}
      sectionTabs={tabs}
      activeTab={activeTab}
      tabHref={tabHref}
    >
      <div className="px-3 pt-2 pb-4 sm:px-4">
        <div>
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
          <Tabs value={educationNavActiveId(activeTab)} className={`${activeTab === "overview" ? "mt-1" : "mt-4"} w-full min-w-0`}>
            <TabsContent value="overview" className="w-full">
              <OverviewTab
                instituteId={instituteId}
                branches={branches}
                selectedBranch={selectedBranch}
                selectedBranchId={selectedBranchId}
                branchEvents={branchEvents}
                pendingInvitations={summary?.pendingInvitations ?? 0}
                canManage={canAdminWorkspace}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                inviteRefreshKey={inviteRefreshKey}
                onChanged={onChanged}
              />
            </TabsContent>

            {canAdminWorkspace && (
              <>
                {showOwnerSetup && (
                  <TabsContent value="profile" className="w-full">
                    <ProfileTab
                      instituteId={instituteId}
                      instituteName={detail.name}
                      joinCode={joinCode}
                      branches={branches}
                      onChanged={onChanged}
                      onJoinCodeChange={setJoinCode}
                    />
                  </TabsContent>
                )}
                {showOwnerSetup && (
                  <TabsContent value="configure" className="w-full">
                    <ConfigureTab
                      instituteId={instituteId}
                      branches={branches}
                      showRoles={isOwner}
                    />
                  </TabsContent>
                )}
                <TabsContent value="association" className="w-full">
                  <AssociationTab
                    instituteId={instituteId}
                    joinCode={joinCode}
                    branches={branches}
                    selectedBranchId={selectedBranchId}
                    currentUserId={currentUserId}
                    inviteRefreshKey={inviteRefreshKey}
                    onChanged={onChanged}
                    showEnrollment={showOwnerSetup}
                  />
                </TabsContent>
                <TabsContent value="classes" className="w-full">
                  <ClassesBrowseTab
                    instituteId={instituteId}
                    sections={[]}
                    workspaceRole="owner"
                    loadAllSections
                  />
                  {showOwnerSetup && (
                    <div className="mt-10 border-t border-border pt-8">
                      <h2 className="text-lg font-semibold">Manage class structure</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Create sections, subjects, and map subjects to classes.
                      </p>
                      <div className="mt-4">
                        <ClassesMenuTab instituteId={instituteId} branches={branches} />
                      </div>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="calendar" className="w-full">
                  <NoticesTab instituteId={instituteId} branchId={selectedBranchId} />
                </TabsContent>
                <TabsContent value="attendance" className="w-full">
                  <AttendanceTab instituteId={instituteId} branchId={selectedBranchId} />
                </TabsContent>
                <TabsContent value="daily-notes" className="w-full">
                  <DailyNotesTab instituteId={instituteId} />
                </TabsContent>
                <TabsContent value="timetable" className="w-full">
                  <ScheduleTab instituteId={instituteId} />
                </TabsContent>
                <TabsContent value="exams" className="w-full">
                  <ExamsTab instituteId={instituteId} />
                </TabsContent>
                <TabsContent value="fees" className="w-full">
                  <FeesTab instituteId={instituteId} />
                </TabsContent>
                <TabsContent value="reports" className="w-full">
                  <ReportsTab instituteId={instituteId} branchId={selectedBranchId} />
                </TabsContent>
              </>
            )}
          </Tabs>
        )}
      </div>
    </InstituteShell>
    </div>
    </>
  );
}
