"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { UserIdentity, inviteeLabel } from "@/components/user-identity";
import { ROLE_LABELS } from "@/lib/roles";

export type JoinRequestItem = {
  id: string;
  instituteId: string;
  instituteName: string | null;
  userId: string;
  userEmail: string | null;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  username?: string;
  requestedRole: string;
  message: string;
  status: string;
};

export function IncomingRequestsPanel({
  instituteId,
  canManage,
  refreshKey = 0,
  onChanged,
}: {
  instituteId: string;
  canManage: boolean;
  refreshKey?: number;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [requests, setRequests] = useState<JoinRequestItem[]>([]);
  const [invites, setInvites] = useState<
    {
      id: string;
      inviteeEmail: string;
      inviteeUserId?: string;
      inviteeFirstName?: string;
      inviteeLastName?: string;
      inviteeDisplayName?: string;
      inviteeUsername?: string;
      role: string;
      status: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [reqRes, invRes] = await Promise.all([
      fetch(`/api/institutes/${instituteId}/join-requests`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/invitations`, { credentials: "include" }),
    ]);
    if (reqRes.ok) {
      setRequests(await reqRes.json());
    }
    if (invRes.ok) {
      const all = await invRes.json();
      setInvites(all.filter((i: { status: string }) => i.status === "pending"));
    }
    setLoading(false);
  }, [canManage, instituteId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function acceptRequest(id: string) {
    const res = await fetch(`/api/join-requests/${id}/accept`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      onChanged?.();
      router.refresh();
      load();
    }
  }

  async function rejectRequest(id: string) {
    await fetch(`/api/join-requests/${id}/reject`, {
      method: "POST",
      credentials: "include",
    });
    onChanged?.();
    load();
  }

  if (!canManage) return null;
  if (loading) return null;

  if (requests.length === 0 && invites.length === 0) {
    return (
      <section className="mt-6 rounded-xl border border-dashed border-border bg-muted/20 p-4">
        <h2 className="text-sm font-semibold">Incoming join requests</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          No pending requests yet. When someone uses your join code at{" "}
          <Link href="/institutes/join" className="font-medium text-primary hover:underline">
            Join with code
          </Link>
          , their request will appear here for you to accept or decline.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <h2 className="text-sm font-semibold">Incoming requests</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Join requests and outbound invitations awaiting response
      </p>

      {requests.length > 0 && (
        <ul className="mt-4 space-y-2">
          {requests.map((req) => (
            <li
              key={req.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm">
                  <UserIdentity user={req} role={req.requestedRole} />
                </p>
                <p className="text-xs text-muted-foreground">
                  Wants to join as {ROLE_LABELS[req.requestedRole] || req.requestedRole}
                  {req.message ? ` · “${req.message}”` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => acceptRequest(req.id)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => rejectRequest(req.id)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {invites.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground">Pending invitations sent</p>
          <p className="mt-1 text-xs text-foreground">
            {invites
              .map((inv) => `${inviteeLabel(inv)} (${ROLE_LABELS[inv.role] || inv.role})`)
              .join(", ")}
          </p>
        </div>
      )}
    </section>
  );
}
