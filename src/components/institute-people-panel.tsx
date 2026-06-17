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
type PersonRow = Member & { kind: "staff" | "student" };
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
  onChanged,
}: {
  instituteId: string;
  branches: BranchSummary[];
  branchId: string;
  canManage: boolean;
  currentUserId: string;
  refreshKey: number;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(canManage);
  const [allStaff, setAllStaff] = useState<Member[]>([]);
  const [allStudents, setAllStudents] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMembers = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/institutes/${instituteId}/members?group=staff`).then((r) => r.json()),
      fetch(`/api/institutes/${instituteId}/members?group=students`).then((r) => r.json()),
    ])
      .then(([staff, students]) => {
        setAllStaff(staff);
        setAllStudents(students);
      })
      .finally(() => setLoading(false));
  }, [instituteId]);

  useEffect(() => {
    if (!expanded) return;
    loadMembers();
  }, [expanded, loadMembers, refreshKey]);

  const people = useMemo(
    () => buildBranchPeople(branchId, branches, allStaff, allStudents),
    [branchId, branches, allStaff, allStudents]
  );

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

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
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

      {expanded && (
        <div className="border-t border-border">
          {canManage && (
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

          <div className="overflow-x-auto">
            {loading ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">Loading roster...</p>
            ) : people.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No people at this campus yet.
              </p>
            ) : (
              <PeopleTable
                people={people}
                currentUserId={currentUserId}
                canManage={canManage}
                onChangeRole={changeRole}
                onRemove={removeMember}
              />
            )}
          </div>
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

function PeopleTable({
  people,
  currentUserId,
  canManage,
  onChangeRole,
  onRemove,
}: {
  people: PersonRow[];
  currentUserId: string;
  canManage: boolean;
  onChangeRole: (userId: string, role: string) => void;
  onRemove: (userId: string) => void;
}) {
  const staffEditableRoles = ["admin", "principal", "teacher", "lecturer", "professor", "student"];
  const studentEditableRoles = ["teacher", "lecturer", "professor", "student"];

  return (
    <table className="w-full text-xs">
      <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
        <tr>
          <th className="px-3 py-2 font-medium">Person</th>
          <th className="px-3 py-2 font-medium">Type</th>
          <th className="px-3 py-2 font-medium">Role</th>
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
            <tr key={person.userId} className="border-t border-border/80">
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
                  {person.kind === "staff" ? "Staff" : "Student"}
                </span>
              </td>
              <td className="px-3 py-2">
                {!canManage || isOwnerRow || isSelf ? (
                  ROLE_LABELS[person.role] || person.role
                ) : (
                  <select
                    value={person.role}
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
              {canManage && (
                <td className="px-3 py-2 text-right">
                  {!isOwnerRow && !isSelf && (
                    <button
                      type="button"
                      onClick={() => onRemove(person.userId)}
                      className="text-[11px] text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
