"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileDown, FileUp, Search } from "lucide-react";
import { IncomingRequestsPanel } from "@/components/incoming-requests-panel";
import { InstitutePeoplePanel } from "@/components/institute-people-panel";
import { InviteMembersButton } from "@/components/invite-members-modal";
import { JoinCodeChip } from "@/components/join-code-chip";
import { InvitationsSentPanel } from "@/components/invitations-sent-panel";
import { MemberProfileDrawer } from "@/components/member-profile-drawer";
import type { PersonRow } from "@/components/institute-people-panel";
import { buildInstitutePathFromSearch } from "@/lib/embed-href";
import type { InstituteSummary, Section } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/roles";

const MEMBER_TABS = ["all", "staff", "students", "parents", "requests", "invitations"] as const;
type MemberTabId = (typeof MEMBER_TABS)[number];

const ROLE_FILTER_OPTIONS = [
  "",
  "owner",
  "principal",
  "teacher",
  "student",
  "parent",
  "admin",
] as const;

type TabCounts = {
  all?: number;
  staff?: number;
  students?: number;
  parents?: number;
  requests?: number;
  invitations?: number;
};

type Props = {
  instituteId: string;
  joinCode: string;
  branches: InstituteSummary["branches"];
  selectedBranchId: string | null;
  currentUserId: string;
  inviteRefreshKey: number;
  onChanged: () => void;
};

export function MembersTab({
  instituteId,
  joinCode,
  branches,
  selectedBranchId,
  currentUserId,
  inviteRefreshKey,
  onChanged,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("memberTab");
  const activeTab: MemberTabId = MEMBER_TABS.includes(tabParam as MemberTabId)
    ? (tabParam as MemberTabId)
    : "all";
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [classFilter, setClassFilter] = useState(searchParams.get("class") || "");
  const [roleFilter, setRoleFilter] = useState(searchParams.get("role") || "");
  const [memberStatus, setMemberStatus] = useState(searchParams.get("status") || "all");
  const [joinCodeValue, setJoinCodeValue] = useState(joinCode);
  const [tabCounts, setTabCounts] = useState<TabCounts>({});
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedMember, setSelectedMember] = useState<PersonRow | null>(null);
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const memberId = searchParams.get("member");

  const branchId = selectedBranchId || branches.find((b) => b.isPrimary)?.id || branches[0]?.id;

  useEffect(() => {
    setJoinCodeValue(joinCode);
  }, [joinCode]);

  useEffect(() => {
    fetch(`/api/institutes/${instituteId}/sections`, { credentials: "include" })
      .then(async (res) => {
        if (res.ok) setSections(await res.json());
      })
      .catch(() => undefined);
  }, [instituteId]);

  const classOptions = useMemo(() => {
    const names = new Set<string>();
    for (const section of sections) {
      if (section.className) names.add(section.className);
    }
    return [...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [sections]);

  const replaceQuery = useCallback(
    (patch: Record<string, string | undefined>) => {
      router.replace(
        buildInstitutePathFromSearch(instituteId, searchParams, {
          tab: "members",
          ...patch,
        })
      );
    },
    [instituteId, router, searchParams]
  );

  function selectTab(tab: MemberTabId) {
    replaceQuery({ memberTab: tab, page: "1" });
  }

  function pushFilters(patch: Record<string, string | undefined>) {
    replaceQuery({
      memberTab: activeTab,
      q: search || undefined,
      class: classFilter || undefined,
      role: roleFilter || undefined,
      status: memberStatus === "all" ? undefined : memberStatus,
      page: "1",
      ...patch,
    });
  }

  function onSearchChange(value: string) {
    setSearch(value);
    pushFilters({ q: value || undefined });
  }

  function exportRoster() {
    const params = new URLSearchParams({
      tab: activeTab === "invitations" ? "invitations" : activeTab === "requests" ? "requests" : activeTab,
      q: search,
    });
    if (branchId) params.set("branch", branchId);
    if (memberStatus !== "all") params.set("status", memberStatus);
    if (roleFilter) params.set("role", roleFilter);
    if (classFilter) params.set("class", classFilter);
    window.open(`/api/institutes/${instituteId}/members/export?${params}`, "_blank");
  }

  function selectMember(person: PersonRow) {
    setSelectedMember(person);
    replaceQuery({ memberTab: activeTab, member: person.userId, page: String(page) });
  }

  function closeMember() {
    setSelectedMember(null);
    replaceQuery({ memberTab: activeTab, member: undefined, page: String(page) });
  }

  function changePage(next: number) {
    replaceQuery({ memberTab: activeTab, page: String(next), member: memberId || undefined });
  }

  const rosterMember = selectedMember;
  const showRoster = ["all", "staff", "students", "parents"].includes(activeTab);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Members</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled
            title="CSV import is not connected yet"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium opacity-60"
          >
            <FileUp className="h-3.5 w-3.5" /> Bulk import CSV
          </button>
          <button
            type="button"
            onClick={exportRoster}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted/40"
          >
            <FileDown className="h-3.5 w-3.5" /> Export
          </button>
          <JoinCodeChip
            code={joinCodeValue}
            instituteId={instituteId}
            canRegenerate
            onCodeChange={setJoinCodeValue}
          />
          <InviteMembersButton
            instituteId={instituteId}
            onSent={onChanged}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-5 border-b border-border px-1 text-xs">
        <MemberTab label="All" value={tabCounts.all} active={activeTab === "all"} onClick={() => selectTab("all")} />
        <MemberTab label="Staff" value={tabCounts.staff} active={activeTab === "staff"} onClick={() => selectTab("staff")} />
        <MemberTab
          label="Students"
          value={tabCounts.students}
          active={activeTab === "students"}
          onClick={() => selectTab("students")}
        />
        <MemberTab label="Parents" value={tabCounts.parents} active={activeTab === "parents"} onClick={() => selectTab("parents")} />
        <MemberTab
          label="Requests"
          value={tabCounts.requests}
          badge={tabCounts.requests != null && tabCounts.requests > 0}
          active={activeTab === "requests"}
          onClick={() => selectTab("requests")}
        />
        <MemberTab
          label="Invitations sent"
          value={tabCounts.invitations}
          active={activeTab === "invitations"}
          onClick={() => selectTab("invitations")}
        />
      </div>

      {showRoster && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              aria-label="Search members"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search name, admission no., phone"
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </label>
          <select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              pushFilters({ class: e.target.value || undefined });
            }}
            disabled={activeTab === "staff"}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
            aria-label="Class filter"
          >
            <option value="">Class</option>
            {classOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              pushFilters({ role: e.target.value || undefined });
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            aria-label="Role filter"
          >
            <option value="">Role</option>
            {ROLE_FILTER_OPTIONS.filter(Boolean).map((role) => (
              <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
            ))}
          </select>
          <select
            value={memberStatus}
            onChange={(e) => {
              setMemberStatus(e.target.value);
              pushFilters({ status: e.target.value === "all" ? undefined : e.target.value });
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            aria-label="Status filter"
          >
            <option value="all">Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="invited">Invited</option>
            <option value="pending">Pending</option>
            <option value="left">Left</option>
          </select>
        </div>
      )}

      {showRoster && branchId && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
          <InstitutePeoplePanel
            instituteId={instituteId}
            branches={branches}
            branchId={branchId}
            canManage
            currentUserId={currentUserId}
            refreshKey={inviteRefreshKey}
            searchQuery={search}
            memberStatus={memberStatus}
            roleFilter={roleFilter}
            classFilter={classFilter}
            rosterLayout
            rosterTab={activeTab}
            selectedUserId={memberId || rosterMember?.userId}
            onRosterLoaded={(data) => {
              if (data.tabCounts) {
                setTabCounts({
                  all: data.tabCounts.all,
                  staff: data.tabCounts.staff,
                  students: data.tabCounts.students,
                  parents: data.tabCounts.parents,
                  requests: data.tabCounts.requests,
                  invitations: data.tabCounts.invitations,
                });
              }
            }}
            onSelectUser={selectMember}
            page={page}
            onPageChange={changePage}
            onChanged={onChanged}
          />
          <MemberProfileDrawer
            instituteId={instituteId}
            userId={memberId || rosterMember?.userId || null}
            userPreview={rosterMember || undefined}
            onClose={closeMember}
          />
        </div>
      )}

      {activeTab === "invitations" && <InvitationsSentPanel instituteId={instituteId} refreshKey={inviteRefreshKey} />}
      {activeTab === "requests" && (
        <IncomingRequestsPanel instituteId={instituteId} canManage refreshKey={inviteRefreshKey} onChanged={onChanged} tableOnly />
      )}
    </div>
  );
}

function MemberTab({
  label,
  value,
  active = false,
  badge = false,
  onClick,
}: {
  label: string;
  value?: number;
  active?: boolean;
  badge?: boolean;
  onClick: () => void;
}) {
  const countLabel = value == null ? "—" : value;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 pb-2.5 ${active ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
    >
      {label} · {countLabel}
      {badge ? <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500" /> : null}
    </button>
  );
}
