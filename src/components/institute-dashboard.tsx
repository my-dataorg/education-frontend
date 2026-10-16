"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { JoinCodeChip } from "@/components/join-code-chip";
import { CampusesTab } from "@/components/institute-tabs/campuses-tab";
import { ClassesTab } from "@/components/institute-tabs/classes-tab";
import { EnrollmentTab } from "@/components/institute-tabs/enrollment-tab";
import { SubjectTeachersTab } from "@/components/institute-tabs/subject-teachers-tab";
import { MembersTab } from "@/components/institute-tabs/members-tab";
import { OverviewTab } from "@/components/institute-tabs/overview-tab";
import { ScheduleTab } from "@/components/institute-tabs/schedule-tab";
import { AttendanceTab } from "@/components/institute-tabs/attendance-tab";
import { AcademicYearTab } from "@/components/institute-tabs/academic-year-tab";
import { ExamsTab } from "@/components/institute-tabs/exams-tab";
import { FeesTab } from "@/components/institute-tabs/fees-tab";
import { NoticesTab } from "@/components/institute-tabs/notices-tab";
import { ReportsTab } from "@/components/institute-tabs/reports-tab";
import { RolesSettingsTab } from "@/components/institute-tabs/roles-settings-tab";
import { BranchPills, InstituteShell } from "@/components/institute-shell";
import { ManageInstitutesDropdown } from "@/components/manage-institutes-dropdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { InstituteSummary } from "@/lib/api";
import { buildInstitutePathFromSearch } from "@/lib/embed-href";
import { getInstituteTabs, resolveInstituteTab, type InstituteTabId } from "@/lib/institute-tabs";
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
  const activeTab = resolveInstituteTab(detail.role, searchParams.get("tab"));

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

  const canAdminWorkspace = INSTITUTE_ADMIN_ROLES.has(detail.role);
  const isOwner = detail.role === "owner";

  return (
    <>
    <EducationContextReporter
      instituteName={detail.name}
      subtitle={branches.length > 1 ? selectedBranch?.name : undefined}
      role={ROLE_LABELS[detail.role] || detail.role}
    />
    <div className="flex min-h-0 flex-1 flex-col">
    <InstituteShell
      instituteName={detail.name}
      instituteId={instituteId}
      branches={branches}
      selectedBranchId={selectedBranchId}
      searchParams={searchParams}
      sectionTabs={tabs}
      activeTab={activeTab}
      tabHref={tabHref}
    >
      <div className="px-4 py-5 sm:px-6">
        <div className="flex flex-wrap justify-end gap-2">
          <ManageInstitutesDropdown />
          {canAdminWorkspace && (
            <JoinCodeChip
              code={joinCode}
              instituteId={instituteId}
              canRegenerate={isOwner}
              onCodeChange={setJoinCode}
            />
          )}
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
          <Tabs value={activeTab} className="mt-6 w-full min-w-0">
            {tabs.length > 1 && (
              <TabsList aria-label="Institute sections" className="mb-2 md:hidden">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id} asChild>
                    <Link href={tabHref(tab.id)}>{tab.label}</Link>
                  </TabsTrigger>
                ))}
              </TabsList>
            )}

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
                {getInstituteTabs(detail.role).some((t) => t.id === "classes") && (
                  <TabsContent value="classes" className="w-full">
                    <ClassesTab instituteId={instituteId} branches={branches} />
                  </TabsContent>
                )}
                <TabsContent value="members" className="w-full">
                  <MembersTab
                    instituteId={instituteId}
                    joinCode={joinCode}
                    branches={branches}
                    selectedBranchId={selectedBranchId}
                    currentUserId={currentUserId}
                    inviteRefreshKey={inviteRefreshKey}
                    onChanged={onChanged}
                  />
                </TabsContent>

                <TabsContent value="enrollment" className="w-full">
                  <EnrollmentTab
                    instituteId={instituteId}
                    inviteRefreshKey={inviteRefreshKey}
                    onChanged={onChanged}
                  />
                </TabsContent>

                <TabsContent value="subject-teachers" className="w-full">
                  <SubjectTeachersTab instituteId={instituteId} branchId={selectedBranchId} />
                </TabsContent>

                <TabsContent value="schedule" className="w-full">
                  <ScheduleTab instituteId={instituteId} />
                </TabsContent>

                <TabsContent value="attendance" className="w-full">
                  <AttendanceTab instituteId={instituteId} branchId={selectedBranchId} />
                </TabsContent>

                <TabsContent value="academic-year" className="w-full">
                  <AcademicYearTab instituteId={instituteId} />
                </TabsContent>
                <TabsContent value="exams" className="w-full">
                  <ExamsTab instituteId={instituteId} />
                </TabsContent>
                <TabsContent value="fees" className="w-full">
                  <FeesTab instituteId={instituteId} />
                </TabsContent>
                <TabsContent value="notices" className="w-full">
                  <NoticesTab instituteId={instituteId} branchId={selectedBranchId} />
                </TabsContent>
                <TabsContent value="reports" className="w-full">
                  <ReportsTab instituteId={instituteId} branchId={selectedBranchId} />
                </TabsContent>
                {isOwner && (
                  <TabsContent value="roles-settings" className="w-full">
                    <RolesSettingsTab instituteId={instituteId} />
                  </TabsContent>
                )}

                <TabsContent value="campuses" className="w-full">
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
    </div>
    </>
  );
}

