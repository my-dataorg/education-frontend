"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  Copy,
  GraduationCap,
  LayoutGrid,
  MapPin,
  User,
  Users,
  X,
} from "lucide-react";
import { ROLE_LABELS, STAFF_ROLE_OPTIONS, shortId } from "@/lib/roles";
import { InviteUserField, type UserSuggestion } from "@/components/invite-user-field";
import type { InstituteSummary } from "@/lib/api";

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

type Tab = "summary" | "staff" | "students" | "branches";
type Member = { userId: string; role: string };
type BranchSummary = {
  id: string;
  name: string;
  isPrimary: boolean;
  address: string;
  city: string;
  teacherCount: number;
  studentCount: number;
  teachers: Member[];
};
type UpcomingEvent = {
  type: string;
  title: string;
  dueDate: string;
  sectionName: string;
  branchName: string | null;
};
type MemberProfile = {
  userId: string;
  role: string;
  sections: {
    sectionId: string;
    sectionName: string;
    className: string;
    branchName: string | null;
    memberType: string | null;
  }[];
  branches: string[];
};
type Invitation = {
  id: string;
  inviteeUserId: string | null;
  inviteeEmail?: string;
  role: string;
  status: string;
  invitedBy: string;
  createdAt: string;
};

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
      <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-lg">
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
  detail,
  summary,
  canManage,
  hasMultiple,
  currentUserId,
}: {
  instituteId: string;
  detail: InstituteDetail;
  summary: InstituteSummary | null;
  canManage: boolean;
  hasMultiple: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "summary";

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "summary", label: "Summary", icon: <LayoutGrid className="h-4 w-4" /> },
    { id: "staff", label: "Staff", icon: <Users className="h-4 w-4" /> },
    { id: "students", label: "Students", icon: <GraduationCap className="h-4 w-4" /> },
    ...(canManage ? [{ id: "branches" as Tab, label: "Branches", icon: <MapPin className="h-4 w-4" /> }] : []),
  ];

  function setTab(next: Tab) {
    router.push(`/institutes/${instituteId}?tab=${next}`);
  }

  const dashboardLabel = canManage ? "Management dashboard" : "Institute directory";

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      {hasMultiple && (
        <Link href="/institutes" className="text-sm text-muted-foreground hover:text-foreground">
          ← All institutes
        </Link>
      )}

      <div className={`flex flex-wrap items-start justify-between gap-4 ${hasMultiple ? "mt-4" : ""}`}>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">{dashboardLabel}</p>
          <h1 className="mt-1 text-2xl font-semibold">{detail.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your role: {ROLE_LABELS[detail.role] || detail.role}
            {!canManage && " · View only"}
          </p>
        </div>
        {canManage && <JoinCodeBadge code={detail.joinCode} />}
      </div>

      <nav className="mt-8 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      <div className="mt-8">
        {tab === "summary" && <SummaryTab instituteId={instituteId} initialSummary={summary} />}
        {tab === "staff" && (
          <StaffTab instituteId={instituteId} canManage={canManage} currentUserId={currentUserId} />
        )}
        {tab === "students" && <StudentsTab instituteId={instituteId} canManage={canManage} />}
        {tab === "branches" && canManage && <BranchesTab instituteId={instituteId} />}
      </div>
    </main>
  );
}

function JoinCodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="rounded-xl border border-border bg-muted/50 px-4 py-3">
      <p className="text-xs text-muted-foreground">Join code</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="text-lg font-semibold tracking-wider">{code}</code>
        <button type="button" onClick={copy} className="rounded-lg p-1.5 hover:bg-muted">
          <Copy className="h-4 w-4" />
        </button>
      </div>
      {copied && <p className="mt-1 text-xs text-primary">Copied!</p>}
    </div>
  );
}

function SummaryTab({
  instituteId,
  initialSummary,
}: {
  instituteId: string;
  initialSummary: InstituteSummary | null;
}) {
  const [data, setData] = useState<InstituteSummary | null>(initialSummary);
  const [loading, setLoading] = useState(!initialSummary);
  const [error, setError] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);

  useEffect(() => {
    if (initialSummary) return;
    setLoading(true);
    setError("");
    fetch(`/api/institutes/${instituteId}/summary`, { credentials: "include" })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) {
          throw new Error(json.detail || json.error || `Failed to load summary (${r.status})`);
        }
        setData({
          branchCount: json.branchCount ?? 0,
          branches: json.branches ?? [],
          upcomingEvents: json.upcomingEvents ?? [],
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load summary"))
      .finally(() => setLoading(false));
  }, [instituteId, initialSummary]);

  async function openTeacher(userId: string) {
    setSelectedTeacher(userId);
    const res = await fetch(`/api/institutes/${instituteId}/members/${userId}/profile`, {
      credentials: "include",
    });
    if (res.ok) setProfile(await res.json());
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading summary...</p>;
  if (error || !data) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error || "Could not load summary."}
      </p>
    );
  }

  const branches = data.branches ?? [];
  const upcomingEvents = data.upcomingEvents ?? [];

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">Branches overview</h2>
        <p className="mt-1 text-3xl font-semibold">{data.branchCount ?? branches.length}</p>
        <p className="text-sm text-muted-foreground">total branches</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {branches.map((branch) => (
          <div key={branch.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{branch.name}</h3>
                {branch.isPrimary && (
                  <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    Primary
                  </span>
                )}
              </div>
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </div>
            {(branch.address || branch.city) && (
              <p className="mt-2 text-sm text-muted-foreground">
                {[branch.address, branch.city].filter(Boolean).join(", ")}
              </p>
            )}
            <div className="mt-4 flex gap-6 text-sm">
              <div>
                <p className="text-2xl font-semibold">{branch.teacherCount}</p>
                <p className="text-muted-foreground">teachers</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">{branch.studentCount}</p>
                <p className="text-muted-foreground">students</p>
              </div>
            </div>
            {branch.teachers?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground">Teachers</p>
                <ul className="mt-2 space-y-1">
                  {branch.teachers.map((t) => (
                    <li key={t.userId}>
                      <button
                        type="button"
                        onClick={() => openTeacher(t.userId)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
                      >
                        <User className="h-3.5 w-3.5 text-primary" />
                        <span className="font-mono text-xs">{shortId(t.userId)}</span>
                        <span className="text-muted-foreground">· {ROLE_LABELS[t.role] || t.role}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      <div>
        <h2 className="flex items-center gap-2 font-medium">
          <Calendar className="h-4 w-4" />
          Upcoming events
        </h2>
        {upcomingEvents.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No upcoming assignment deadlines.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {upcomingEvents.map((ev, i) => (
              <li key={i} className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
                <p className="font-medium">{ev.title}</p>
                <p className="mt-1 text-muted-foreground">
                  Due {new Date(ev.dueDate).toLocaleDateString()} · {ev.sectionName}
                  {ev.branchName && ` · ${ev.branchName}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={!!selectedTeacher}
        onClose={() => {
          setSelectedTeacher(null);
          setProfile(null);
        }}
        title="Staff member"
      >
        {profile ? (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground">User ID</p>
              <p className="font-mono">{profile.userId}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Role</p>
              <p className="font-medium">{ROLE_LABELS[profile.role] || profile.role}</p>
            </div>
            {profile.branches.length > 0 && (
              <div>
                <p className="text-muted-foreground">Branches</p>
                <p>{profile.branches.join(", ")}</p>
              </div>
            )}
            {profile.sections.length > 0 && (
              <div>
                <p className="text-muted-foreground">Sections</p>
                <ul className="mt-1 space-y-1">
                  {profile.sections.map((s) => (
                    <li key={s.sectionId} className="rounded-lg bg-muted/50 px-3 py-2">
                      {s.sectionName}
                      {s.className && ` (${s.className})`}
                      {s.branchName && ` — ${s.branchName}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading...</p>
        )}
      </Modal>
    </div>
  );
}

function InviteForm({
  instituteId,
  defaultRole,
  roleOptions,
  label,
  onSent,
}: {
  instituteId: string;
  defaultRole: string;
  roleOptions: { value: string; label: string }[];
  label: string;
  onSent: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null);
  const [role, setRole] = useState(defaultRole);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sending, setSending] = useState(false);

  function resolveEmail(): string {
    if (selectedUser?.email) return selectedUser.email.trim().toLowerCase();
    const match = query.match(/[\w.+-]+@[\w.-]+\.\w+/);
    if (match) return match[0].toLowerCase();
    if (query.includes("@")) return query.trim().toLowerCase();
    return "";
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    setSuccess("");

    const email = resolveEmail();
    if (!selectedUser && !email) {
      setError("Select a user from suggestions or enter a valid email.");
      setSending(false);
      return;
    }

    const body: { role: string; email?: string; userId?: string } = { role };
    if (email) body.email = email;
    if (selectedUser?.userId) body.userId = selectedUser.userId;

    const res = await fetch(`/api/institutes/${instituteId}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || "Could not send invitation.");
      return;
    }
    setQuery("");
    setSelectedUser(null);
    const roleLabel = roleOptions.find((o) => o.value === role)?.label || role;
    const target = selectedUser?.displayName || email || query.trim();
    setSuccess(`Invitation sent to ${target} as ${roleLabel}. They can accept from Education or Platform after signing in.`);
    onSent();
  }

  return (
    <form onSubmit={send} className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-medium">{label}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Start typing a name, username, or email — suggestions appear after 2 characters. The
        invitee must accept before they join.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="text-xs font-medium">User</label>
          <InviteUserField
            instituteId={instituteId}
            value={query}
            selectedUserId={selectedUser?.userId ?? null}
            onChange={(value, user) => {
              setQuery(value);
              setSelectedUser(user);
            }}
            disabled={sending}
          />
        </div>
        {roleOptions.length > 1 && (
          <div>
            <label className="text-xs font-medium">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 rounded-lg border border-border px-3 py-2 text-sm"
            >
              {roleOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          type="submit"
          disabled={sending || !query.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
        >
          {sending ? "Sending..." : "Send invitation"}
        </button>
      </div>
      {success && (
        <p className="mt-2 text-xs text-primary">{success}</p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </form>
  );
}

function PendingInvites({
  instituteId,
  roleFilter,
  refreshKey = 0,
}: {
  instituteId: string;
  roleFilter?: "staff" | "student";
  refreshKey?: number;
}) {
  const [invites, setInvites] = useState<Invitation[]>([]);

  const load = useCallback(() => {
    fetch(`/api/institutes/${instituteId}/invitations`)
      .then((r) => r.json())
      .then((list: Invitation[]) => {
        let pending = list.filter((i) => i.status === "pending");
        if (roleFilter === "staff") {
          pending = pending.filter((i) => i.role !== "student");
        } else if (roleFilter === "student") {
          pending = pending.filter((i) => i.role === "student");
        }
        setInvites(pending);
      });
  }, [instituteId, roleFilter]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (invites.length === 0) return null;

  const title =
    roleFilter === "staff"
      ? "Pending staff invitations"
      : roleFilter === "student"
        ? "Pending student invitations"
        : "Pending invitations";

  return (
    <div className="rounded-xl border border-dashed border-border p-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Waiting for them to accept or decline from Education or Platform.
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {invites.map((inv) => (
          <li key={inv.id} className="text-muted-foreground">
            {inv.inviteeEmail || shortId(inv.inviteeUserId || "")}
            {" · "}
            {ROLE_LABELS[inv.role]} · sent {new Date(inv.createdAt).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StaffTab({
  instituteId,
  canManage,
  currentUserId,
}: {
  instituteId: string;
  canManage: boolean;
  currentUserId: string;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteRefreshKey, setInviteRefreshKey] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/institutes/${instituteId}/members?group=staff`)
      .then((r) => r.json())
      .then(setMembers)
      .finally(() => setLoading(false));
  }, [instituteId]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeRole(memberUserId: string, newRole: string) {
    await fetch(`/api/institutes/${instituteId}/members/${memberUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    load();
  }

  async function remove(memberUserId: string) {
    if (!confirm("Remove this staff member?")) return;
    await fetch(`/api/institutes/${instituteId}/members/${memberUserId}`, { method: "DELETE" });
    load();
  }

  const editableRoles = ["admin", "principal", "teacher", "lecturer", "professor", "student"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-medium">Staff</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Admins, principals, teachers, lecturers, and professors.
          {canManage
            ? " Invite staff by search or email — they must accept to join."
            : " You have read-only access to the staff directory."}
        </p>
      </div>

      {canManage && (
        <>
          <InviteForm
            instituteId={instituteId}
            defaultRole="teacher"
            roleOptions={STAFF_ROLE_OPTIONS}
            label="Invite staff member"
            onSent={() => {
              load();
              setInviteRefreshKey((k) => k + 1);
            }}
          />
          <PendingInvites instituteId={instituteId} roleFilter="staff" refreshKey={inviteRefreshKey} />
        </>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading staff...</p>
      ) : (
        <MemberTable
          members={members}
          currentUserId={currentUserId}
          canManage={canManage}
          onChangeRole={changeRole}
          onRemove={remove}
          editableRoles={editableRoles}
        />
      )}
    </div>
  );
}

function StudentsTab({ instituteId, canManage }: { instituteId: string; canManage: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteRefreshKey, setInviteRefreshKey] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/institutes/${instituteId}/members?group=students`)
      .then((r) => r.json())
      .then(setMembers)
      .finally(() => setLoading(false));
  }, [instituteId]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeRole(memberUserId: string, newRole: string) {
    await fetch(`/api/institutes/${instituteId}/members/${memberUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    load();
  }

  async function remove(memberUserId: string) {
    if (!confirm("Remove this student?")) return;
    await fetch(`/api/institutes/${instituteId}/members/${memberUserId}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-medium">Students</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {canManage
            ? "Admit students by sending an invitation. They must accept to join."
            : "Student roster (read-only)."}
        </p>
      </div>

      {canManage && (
        <>
          <InviteForm
            instituteId={instituteId}
            defaultRole="student"
            roleOptions={[{ value: "student", label: "Student" }]}
            label="Admit student"
            onSent={() => {
              load();
              setInviteRefreshKey((k) => k + 1);
            }}
          />
          <PendingInvites instituteId={instituteId} roleFilter="student" refreshKey={inviteRefreshKey} />
        </>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading students...</p>
      ) : members.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No students yet.
        </p>
      ) : (
        <MemberTable
          members={members}
          canManage={canManage}
          onChangeRole={changeRole}
          onRemove={remove}
          editableRoles={["teacher", "lecturer", "professor", "student"]}
        />
      )}
    </div>
  );
}

function MemberTable({
  members,
  currentUserId,
  canManage,
  onChangeRole,
  onRemove,
  editableRoles,
}: {
  members: Member[];
  currentUserId?: string;
  canManage: boolean;
  onChangeRole: (userId: string, role: string) => void;
  onRemove: (userId: string) => void;
  editableRoles: string[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">User ID</th>
            <th className="px-4 py-3 font-medium">Role</th>
            {canManage && <th className="px-4 py-3 font-medium text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const isSelf = m.userId === currentUserId;
            const isOwnerRow = m.role === "owner";
            return (
              <tr key={m.userId} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs">
                  {shortId(m.userId)}
                  {isSelf && <span className="ml-2 text-primary">(you)</span>}
                </td>
                <td className="px-4 py-3">
                  {!canManage || isOwnerRow || isSelf ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {ROLE_LABELS[m.role] || m.role}
                    </span>
                  ) : (
                    <select
                      value={m.role}
                      onChange={(e) => onChangeRole(m.userId, e.target.value)}
                      className="rounded-lg border border-border px-2 py-1 text-xs"
                    >
                      <option value={m.role}>{ROLE_LABELS[m.role]}</option>
                      {editableRoles
                        .filter((r) => r !== m.role)
                        .map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                    </select>
                  )}
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    {!isOwnerRow && !isSelf && (
                      <button
                        type="button"
                        onClick={() => onRemove(m.userId)}
                        className="text-xs text-red-600 hover:underline"
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
    </div>
  );
}

function BranchesTab({ instituteId }: { instituteId: string }) {
  type Branch = {
    id: string;
    name: string;
    address: string;
    city: string;
    isPrimary: boolean;
    sectionCount: number;
  };
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/institutes/${instituteId}/branches`)
      .then((r) => r.json())
      .then(setBranches)
      .finally(() => setLoading(false));
  }, [instituteId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addBranch(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    await fetch(`/api/institutes/${instituteId}/branches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), address, city, isPrimary }),
    });
    setAdding(false);
    setName("");
    setAddress("");
    setCity("");
    setIsPrimary(false);
    load();
  }

  async function setPrimary(branchId: string) {
    await fetch(`/api/institutes/${instituteId}/branches/${branchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrimary: true }),
    });
    load();
  }

  async function removeBranch(branchId: string, branchName: string) {
    if (!confirm(`Delete "${branchName}"?`)) return;
    await fetch(`/api/institutes/${instituteId}/branches/${branchId}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-medium">Branches</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage campuses and locations.</p>
      </div>
      <form onSubmit={addBranch} className="grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium">Branch name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Address"
          className="rounded-lg border border-border px-3 py-2 text-sm"
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          className="rounded-lg border border-border px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
          Primary branch
        </label>
        <button
          type="submit"
          disabled={adding || !name.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground sm:col-span-2 sm:w-fit disabled:opacity-60"
        >
          {adding ? "Adding..." : "Add branch"}
        </button>
      </form>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {branches.map((b) => (
            <div key={b.id} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-medium">{b.name}</h3>
              {b.isPrimary && (
                <span className="text-xs text-primary">Primary</span>
              )}
              <p className="mt-2 text-xs text-muted-foreground">{b.sectionCount} sections</p>
              <div className="mt-3 flex gap-2">
                {!b.isPrimary && (
                  <button
                    type="button"
                    onClick={() => setPrimary(b.id)}
                    className="rounded-lg border px-3 py-1 text-xs hover:bg-muted"
                  >
                    Set primary
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeBranch(b.id, b.name)}
                  className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
