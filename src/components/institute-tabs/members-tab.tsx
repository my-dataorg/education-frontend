"use client";

import { useCallback, useEffect, useState } from "react";
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
import type { InstituteSummary } from "@/lib/api";

const MEMBER_TABS = ["all", "staff", "students", "parents", "requests", "invitations"] as const;
type MemberTabId = (typeof MEMBER_TABS)[number];

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
  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId);
  const router = useRouter();
  const searchParams = useSearchParams();
  const staffCount = selectedBranch?.teacherCount ?? 0;
  const studentCount = selectedBranch?.studentCount ?? 0;
  const tabParam = searchParams.get("memberTab");
  const activeTab: MemberTabId = MEMBER_TABS.includes(tabParam as MemberTabId)
    ? (tabParam as MemberTabId)
    : "all";
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [memberType, setMemberType] = useState(searchParams.get("type") || "all");
  const [memberStatus, setMemberStatus] = useState(searchParams.get("status") || "all");
  const [joinCodeValue, setJoinCodeValue] = useState(joinCode);

  useEffect(() => {
    setJoinCodeValue(joinCode);
  }, [joinCode]);
  const [pendingRequests, setPendingRequests] = useState<number | null>(null);
  const [pendingInvites, setPendingInvites] = useState<number | null>(null);
  const [selectedMember, setSelectedMember] = useState<PersonRow | null>(null);
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const memberId = searchParams.get("member");

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

  useEffect(() => {
    if (activeTab === "staff") setMemberType("staff");
    else if (activeTab === "students") setMemberType("student");
    else if (activeTab === "parents") setMemberType("parent");
    else if (["all", "requests", "invitations"].includes(activeTab)) setMemberType("all");
  }, [activeTab]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/institutes/${instituteId}/join-requests`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/invitations`, { credentials: "include" }),
    ])
      .then(async ([requestsResponse, invitesResponse]) => {
        if (requestsResponse.ok) {
          const rows = await requestsResponse.json();
          setPendingRequests(Array.isArray(rows) ? rows.filter((r) => r.status === "pending").length : null);
        }
        if (invitesResponse.ok) {
          const rows = await invitesResponse.json();
          setPendingInvites(Array.isArray(rows) ? rows.filter((r) => r.status === "pending").length : null);
        }
      })
      .catch(() => undefined);
  }, [instituteId, inviteRefreshKey]);

  function selectTab(tab: MemberTabId) {
    replaceQuery({ memberTab: tab });
  }

  function onSearchChange(value: string) {
    setSearch(value);
    replaceQuery({
      memberTab: activeTab,
      q: value || undefined,
      page: "1",
      type: memberType === "all" ? undefined : memberType,
      status: memberStatus === "all" ? undefined : memberStatus,
    });
  }

  function onFilterChange(type: string, status: string) {
    setMemberType(type);
    setMemberStatus(status);
    replaceQuery({
      memberTab: activeTab,
      q: search || undefined,
      page: "1",
      type: type === "all" ? undefined : type,
      status: status === "all" ? undefined : status,
    });
  }

  function exportRoster() {
    let tab = activeTab;
    if (tab === "all" && memberType === "staff") tab = "staff";
    if (tab === "all" && memberType === "student") tab = "students";
    if (tab === "all" && memberType === "parent") tab = "parents";
    const params = new URLSearchParams({
      tab: tab === "invitations" ? "invitations" : tab === "requests" ? "requests" : tab,
      q: search,
    });
    if (selectedBranchId) params.set("branch", selectedBranchId);
    if (memberStatus !== "all") params.set("status", memberStatus);
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Institute workspace</p>
          <h1 className="mt-1 text-2xl font-semibold">Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage staff, students, guardians, invitations, and join requests.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled title="CSV import is not connected yet" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium opacity-60">
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
        <MemberTab label="All" value={staffCount + studentCount} active={activeTab === "all"} onClick={() => selectTab("all")} />
        <MemberTab label="Staff" value={staffCount} active={activeTab === "staff"} onClick={() => selectTab("staff")} />
        <MemberTab label="Students" value={studentCount} active={activeTab === "students"} onClick={() => selectTab("students")} />
        <MemberTab label="Parents" value="—" active={activeTab === "parents"} onClick={() => selectTab("parents")} />
        <MemberTab label="Requests" value={pendingRequests ?? "—"} badge={pendingRequests != null && pendingRequests > 0} active={activeTab === "requests"} onClick={() => selectTab("requests")} />
        <MemberTab label="Invitations sent" value={pendingInvites ?? "—"} active={activeTab === "invitations"} onClick={() => selectTab("invitations")} />
      </div>

      {["all", "staff", "students", "parents"].includes(activeTab) && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
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
        <label className="sr-only" htmlFor="member-type">Member type</label>
        <select
          id="member-type"
          value={memberType}
          onChange={(event) => onFilterChange(event.target.value, memberStatus)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All types</option>
          <option value="staff">Staff</option>
          <option value="student">Students</option>
          <option value="parent">Parents</option>
        </select>
        <label className="sr-only" htmlFor="member-status">Member status</label>
        <select
          id="member-status"
          value={memberStatus}
          onChange={(event) => onFilterChange(memberType, event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
        </select>
      </div>}

      {["all", "staff", "students"].includes(activeTab) && <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.75fr)]">
        {selectedBranchId && (
          <InstitutePeoplePanel
            instituteId={instituteId}
            branches={branches}
            branchId={selectedBranchId}
            canManage
            currentUserId={currentUserId}
            refreshKey={inviteRefreshKey}
            searchQuery={search}
            memberType={memberType}
            memberStatus={memberStatus}
            rosterLayout
            rosterTab={activeTab}
            selectedUserId={memberId || selectedMember?.userId}
            onRosterLoaded={(data) => {
              if (data.tabCounts) {
                setPendingRequests(data.tabCounts.requests ?? pendingRequests);
                setPendingInvites(data.tabCounts.invitations ?? pendingInvites);
              }
            }}
            onSelectUser={selectMember}
            page={page}
            onPageChange={changePage}
            onChanged={onChanged}
          />
        )}
        <MemberProfileDrawer
          instituteId={instituteId}
          userId={memberId || selectedMember?.userId || null}
          userPreview={selectedMember || undefined}
          onClose={closeMember}
        />
      </div>}

      {activeTab === "parents" && <EmptyTab title="Parents" message="Guardian links will appear here when parents are linked to students." />}
      {activeTab === "invitations" && <InvitationsSentPanel instituteId={instituteId} refreshKey={inviteRefreshKey} />}
      {activeTab === "requests" && <IncomingRequestsPanel instituteId={instituteId} canManage refreshKey={inviteRefreshKey} onChanged={onChanged} tableOnly />}
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
  value: number | string;
  active?: boolean;
  badge?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`border-b-2 pb-2.5 ${active ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
      {label} · {value}
      {badge ? <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500" /> : null}
    </button>
  );
}

function EmptyTab({ title, message }: { title: string; message: string }) {
  return <section className="rounded-xl border border-dashed border-border bg-card p-8 text-center"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{message}</p></section>;
}

