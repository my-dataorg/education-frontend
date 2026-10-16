"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { InviteMembersButton } from "@/components/invite-members-modal";
import { UserIdentity, inviteeLabel } from "@/components/user-identity";
import type { InstituteSummary } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/roles";

type Member = {
  userId: string;
  role: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  username?: string;
};
export type PersonRow = Member & {
  kind: "staff" | "student" | "parent";
  classLabel?: string;
  status?: string;
  admissionNo?: string;
};
const PAGE_SIZE = 25;

type RosterResponse = {
  items: (Member & {
    kind?: string;
    memberType?: string;
    status?: string;
    classLabel?: string;
    className?: string;
    sectionName?: string;
  })[];
  total: number;
  tabCounts?: Record<string, number>;
};
type BranchSummary = InstituteSummary["branches"][number];

function defaultBranchId(branches: BranchSummary[]): string | null {
  if (branches.length === 0) return null;
  return branches.find((b) => b.isPrimary)?.id ?? branches[0].id;
}

function buildBranchPeople(
  branchId: string,
  branches: BranchSummary[],
  allStaff: Member[],
  allStudents: Member[]
): PersonRow[] {
  const branch = branches.find((b) => b.id === branchId);
  if (!branch) return [];

  const primaryId = defaultBranchId(branches);
  const assignedIds = new Set<string>();
  for (const b of branches) {
    b.teachers.forEach((t) => assignedIds.add(t.userId));
    (b.students ?? []).forEach((s) => assignedIds.add(s.userId));
  }

  const people: PersonRow[] = [
    ...branch.teachers.map((t) => ({ ...t, kind: "staff" as const })),
    ...(branch.students ?? []).map((s) => ({
      ...s,
      kind: "student" as const,
    })),
  ];
  const seen = new Set(people.map((p) => p.userId));

  if (branchId === primaryId) {
    for (const m of allStaff) {
      if (!assignedIds.has(m.userId) && !seen.has(m.userId)) {
        people.push({ ...m, kind: "staff" });
        seen.add(m.userId);
      }
    }
    for (const m of allStudents) {
      if (!assignedIds.has(m.userId) && !seen.has(m.userId)) {
        people.push({ ...m, kind: "student" });
        seen.add(m.userId);
      }
    }
  }

  return people.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "staff" ? -1 : 1;
    return (ROLE_LABELS[a.role] || a.role).localeCompare(ROLE_LABELS[b.role] || b.role);
  });
}

export function InstitutePeoplePanel({
  instituteId,
  branches,
  branchId,
  canManage,
  currentUserId,
  refreshKey,
  searchQuery = "",
  memberType = "all",
  memberStatus = "all",
  rosterLayout = false,
  rosterTab = "all",
  selectedUserId = null,
  onSelectUser,
  page = 1,
  onPageChange,
  onRosterLoaded,
  roleFilter = "",
  classFilter = "",
  onChanged,
}: {
  instituteId: string;
  branches: BranchSummary[];
  branchId: string;
  canManage: boolean;
  currentUserId: string;
  refreshKey: number;
  searchQuery?: string;
  memberType?: string;
  memberStatus?: string;
  roleFilter?: string;
  classFilter?: string;
  rosterLayout?: boolean;
  rosterTab?: string;
  selectedUserId?: string | null;
  onSelectUser?: (person: PersonRow) => void;
  page?: number;
  onPageChange?: (page: number) => void;
  onRosterLoaded?: (data: RosterResponse) => void;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(rosterLayout || canManage);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allStaff, setAllStaff] = useState<Member[]>([]);
  const [allStudents, setAllStudents] = useState<Member[]>([]);
  const [rosterRows, setRosterRows] = useState<PersonRow[]>([]);
  const [rosterTotal, setRosterTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadMembers = useCallback(() => {
    setLoading(true);
    if (rosterLayout) {
      const tab =
        rosterTab !== "all"
          ? rosterTab
          : memberType === "staff"
            ? "staff"
            : memberType === "student"
              ? "students"
              : memberType === "parent"
                ? "parents"
                : "all";
      const params = new URLSearchParams({
        tab,
        page: String(page),
        branch: branchId,
        q: searchQuery.trim(),
      });
      if (memberStatus !== "all") params.set("status", memberStatus);
      if (roleFilter) params.set("role", roleFilter);
      if (classFilter) params.set("class", classFilter);
      fetch(`/api/institutes/${instituteId}/members/roster?${params}`, { credentials: "include" })
        .then(async (r) => {
          const data = (await r.json()) as RosterResponse;
          if (!r.ok) throw new Error("Could not load roster");
          const rows: PersonRow[] = (data.items || [])
            .filter((row) => row.userId)
            .map((row) => ({
              userId: row.userId!,
              role: row.role || "",
              firstName: row.firstName,
              lastName: row.lastName,
              displayName: row.displayName,
              email: row.email,
              username: row.username,
              classLabel: row.classLabel,
              status: row.status,
              admissionNo: (row as { admissionNo?: string }).admissionNo,
              kind: (() => {
                const raw = row.kind || row.memberType;
                if (raw === "staff" || raw === "student" || raw === "parent") return raw;
                if (row.role === "student") return "student";
                if (row.role === "parent") return "parent";
                return "staff";
              })(),
            }));
          setRosterRows(rows);
          setRosterTotal(data.total ?? rows.length);
          onRosterLoaded?.(data);
        })
        .catch(() => {
          setRosterRows([]);
          setRosterTotal(0);
        })
        .finally(() => setLoading(false));
      return;
    }
    Promise.all([
      fetch(`/api/institutes/${instituteId}/members?group=staff`).then((r) => r.json()),
      fetch(`/api/institutes/${instituteId}/members?group=students`).then((r) => r.json()),
    ])
      .then(([staff, students]) => {
        setAllStaff(staff);
        setAllStudents(students);
      })
      .finally(() => setLoading(false));
  }, [
    branchId,
    instituteId,
    memberStatus,
    memberType,
    onRosterLoaded,
    page,
    roleFilter,
    classFilter,
    rosterLayout,
    rosterTab,
    searchQuery,
  ]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, rosterTab, searchQuery, memberStatus, roleFilter, refreshKey]);

  useEffect(() => {
    if (!expanded) return;
    queueMicrotask(loadMembers);
  }, [expanded, loadMembers, refreshKey]);

  const people = useMemo(() => {
    if (rosterLayout) return rosterRows;
    const query = searchQuery.trim().toLowerCase();
    return buildBranchPeople(branchId, branches, allStaff, allStudents).filter((person) => {
      if (memberStatus === "pending") return false;
      if (memberType !== "all" && person.kind !== memberType) return false;
      if (!query) return true;
      return [person.displayName, person.firstName, person.lastName, person.username, person.email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    });
  }, [
    rosterLayout,
    rosterRows,
    branchId,
    branches,
    allStaff,
    allStudents,
    memberStatus,
    memberType,
    searchQuery,
  ]);

  const totalCount = rosterLayout ? rosterTotal : people.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageRows = rosterLayout ? people : people.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function changeRole(memberUserId: string, newRole: string) {
    await fetch(`/api/institutes/${instituteId}/members/${memberUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    onChanged();
    loadMembers();
  }

  async function removeMember(memberUserId: string) {
    if (!confirm("Remove this person from the institute?")) return;
    await fetch(`/api/institutes/${instituteId}/members/${memberUserId}`, { method: "DELETE" });
    onChanged();
    loadMembers();
  }

  const branch = branches.find((b) => b.id === branchId);
  const totalPeople = (branch?.teacherCount ?? 0) + (branch?.studentCount ?? 0);

  const pageUserIds = pageRows.map((p) => p.userId);
  const allPageSelected = pageUserIds.length > 0 && pageUserIds.every((id) => selectedIds.has(id));

  function toggleRow(userId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function togglePage() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allPageSelected) pageUserIds.forEach((id) => next.delete(id));
      else pageUserIds.forEach((id) => next.add(id));
      return next;
    });
  }

  return (
    <section className={rosterLayout ? "min-w-0" : "rounded-xl border border-border bg-card shadow-sm"}>
      {rosterLayout ? null : (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-muted/30"
        >
          <div>
            <h3 className="text-sm font-semibold">Staff &amp; students</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {totalPeople} people at this campus · expand to view roster
            </p>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}

      {expanded && (
        <div className={rosterLayout ? "" : "border-t border-border"}>
          {!rosterLayout && canManage && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <PendingInvites instituteId={instituteId} refreshKey={refreshKey} />
              <InviteMembersButton
                instituteId={instituteId}
                onSent={() => {
                  onChanged();
                  loadMembers();
                }}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
              />
            </div>
          )}

          <div className={rosterLayout ? "overflow-x-auto rounded-xl border border-border bg-card shadow-sm" : "overflow-x-auto"}>
            {loading ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">Loading roster...</p>
            ) : people.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                {searchQuery ? "No members match these filters." : "No people at this campus yet."}
              </p>
            ) : (
              <>
                <PeopleTable
                  people={pageRows}
                  currentUserId={currentUserId}
                  canManage={canManage}
                  rosterLayout={rosterLayout}
                  selectedUserId={selectedUserId}
                  selectedIds={selectedIds}
                  allPageSelected={allPageSelected}
                  onTogglePage={togglePage}
                  onToggleRow={toggleRow}
                  onSelectUser={onSelectUser}
                  onChangeRole={changeRole}
                  onRemove={removeMember}
                />
                {totalPages > 1 && onPageChange && (
                  <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs">
                    <span className="text-muted-foreground">
                      Page {safePage} of {totalPages} · {totalCount} members
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => onPageChange(safePage - 1)}
                        className="rounded border border-border px-2 py-1 disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => onPageChange(safePage + 1)}
                        className="rounded border border-border px-2 py-1 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          {rosterLayout && selectedIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-xs shadow-lg">
              <span className="font-medium">{selectedIds.size} selected</span>
              <button type="button" className="rounded-full border border-border px-3 py-1 hover:bg-muted">
                Assign to class
              </button>
              <button type="button" className="rounded-full border border-border px-3 py-1 hover:bg-muted">
                Change role
              </button>
              <button type="button" className="rounded-full border border-border px-3 py-1 hover:bg-muted">
                Message
              </button>
              <button type="button" className="rounded-full border border-red-200 px-3 py-1 text-red-700 hover:bg-red-50">
                Remove
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function PendingInvites({
  instituteId,
  refreshKey = 0,
}: {
  instituteId: string;
  refreshKey?: number;
}) {
  const [invites, setInvites] = useState<
    {
      id: string;
      inviteeEmail?: string;
      inviteeUserId?: string;
      inviteeFirstName?: string;
      inviteeLastName?: string;
      inviteeDisplayName?: string;
      inviteeUsername?: string;
      role: string;
    }[]
  >([]);

  useEffect(() => {
    fetch(`/api/institutes/${instituteId}/invitations`)
      .then((r) => r.json())
      .then((list) => setInvites(list.filter((i: { status: string }) => i.status === "pending")));
  }, [instituteId, refreshKey]);

  if (invites.length === 0) return null;

  return (
    <p className="text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{invites.length} pending</span>
      {" · "}
      {invites.map((inv) => inviteeLabel(inv)).join(", ")}
    </p>
  );
}

function classRoleLabel(person: PersonRow) {
  if (person.kind === "student") {
    const parts = [person.classLabel, person.admissionNo ? `Adm ${person.admissionNo}` : ""].filter(Boolean);
    return parts.length ? parts.join(" · ") : ROLE_LABELS[person.role] || person.role;
  }
  if (person.kind === "parent") return "Parent";
  const role = ROLE_LABELS[person.role] || person.role;
  return person.classLabel ? `${role} · ${person.classLabel}` : role;
}

function StatusPill({ status }: { status?: string }) {
  const value = (status || "active").toLowerCase();
  const styles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-800",
    invited: "bg-amber-50 text-amber-800",
    pending: "bg-amber-50 text-amber-800",
    inactive: "bg-muted text-muted-foreground",
    left: "bg-muted text-muted-foreground",
  };
  const label = value.charAt(0).toUpperCase() + value.slice(1);
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[value] || styles.active}`}>
      {label}
    </span>
  );
}

function PeopleTable({
  people,
  currentUserId,
  canManage,
  rosterLayout = false,
  selectedUserId,
  selectedIds,
  allPageSelected,
  onTogglePage,
  onToggleRow,
  onSelectUser,
  onChangeRole,
  onRemove,
}: {
  people: PersonRow[];
  currentUserId: string;
  canManage: boolean;
  rosterLayout?: boolean;
  selectedUserId?: string | null;
  selectedIds: Set<string>;
  allPageSelected: boolean;
  onTogglePage: () => void;
  onToggleRow: (userId: string) => void;
  onSelectUser?: (person: PersonRow) => void;
  onChangeRole: (userId: string, role: string) => void;
  onRemove: (userId: string) => void;
}) {
  const staffEditableRoles = ["admin", "principal", "teacher", "lecturer", "professor", "student"];
  const studentEditableRoles = ["teacher", "lecturer", "professor", "student"];

  return (
    <table className="w-full text-xs">
      <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
        <tr>
          {rosterLayout && (
            <th className="w-10 px-3 py-2">
              <input
                type="checkbox"
                checked={allPageSelected}
                onChange={onTogglePage}
                aria-label="Select all on page"
              />
            </th>
          )}
          <th className="px-3 py-2 font-medium">Person</th>
          <th className="px-3 py-2 font-medium">Type</th>
          <th className="px-3 py-2 font-medium">Class / Role</th>
          <th className="px-3 py-2 font-medium">Status</th>
          {canManage && <th className="px-3 py-2 text-right font-medium">Actions</th>}
        </tr>
      </thead>
      <tbody>
        {people.map((person) => {
          const isSelf = person.userId === currentUserId;
          const isOwnerRow = person.role === "owner";
          const editableRoles =
            person.kind === "student" ? studentEditableRoles : staffEditableRoles;

          return (
            <tr
              key={person.userId}
              className={`border-t border-border/80 ${selectedUserId === person.userId ? "bg-primary/5" : ""} ${onSelectUser ? "cursor-pointer hover:bg-muted/30" : ""}`}
              onClick={() => onSelectUser?.(person)}
            >
              {rosterLayout && (
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(person.userId)}
                    onChange={() => onToggleRow(person.userId)}
                    aria-label={`Select ${person.displayName || person.userId}`}
                  />
                </td>
              )}
              <td className="px-3 py-2">
                <UserIdentity user={person} role={person.role} />
                {isSelf && <span className="ml-1 text-primary">(you)</span>}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    person.kind === "staff"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {person.kind === "staff" ? "Staff" : person.kind === "parent" ? "Parent" : "Student"}
                </span>
              </td>
              <td className="px-3 py-2">
                {rosterLayout ? (
                  classRoleLabel(person)
                ) : !canManage || isOwnerRow || isSelf ? (
                  ROLE_LABELS[person.role] || person.role
                ) : (
                  <select
                    value={person.role}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(e) => onChangeRole(person.userId, e.target.value)}
                    className="rounded-md border border-border px-1.5 py-0.5 text-[11px]"
                  >
                    <option value={person.role}>{ROLE_LABELS[person.role]}</option>
                    {editableRoles
                      .filter((r) => r !== person.role)
                      .map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                  </select>
                )}
              </td>
              <td className="px-3 py-2">
                <StatusPill status={person.status} />
              </td>
              {canManage && (
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectUser?.(person);
                      }}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Edit
                    </button>
                    {!isOwnerRow && !isSelf && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemove(person.userId);
                        }}
                        className="text-[11px] text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
