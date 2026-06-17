"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLE_LABELS } from "@/lib/roles";

export type PendingInvitation = {
  id: string;
  instituteId: string;
  instituteName: string;
  role: string;
};

export function PendingInvitationsBannerClient({
  invites: initialInvites,
}: {
  invites: PendingInvitation[];
}) {
  const router = useRouter();
  const [invites, setInvites] = useState(initialInvites);
  const [accepted, setAccepted] = useState<{ name: string; instituteId: string } | null>(null);

  if (invites.length === 0 && !accepted) return null;

  async function accept(id: string, instituteName: string, instituteId: string) {
    const res = await fetch(`/api/invitations/${id}/accept`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      setInvites((prev) => prev.filter((i) => i.id !== id));
      setAccepted({ name: instituteName, instituteId });
      router.refresh();
      router.push(`/institutes/${instituteId}`);
    }
  }

  async function reject(id: string) {
    await fetch(`/api/invitations/${id}/reject`, {
      method: "POST",
      credentials: "include",
    });
    setInvites((prev) => prev.filter((i) => i.id !== id));
    router.refresh();
  }

  return (
    <div className="border-b border-primary/20 bg-primary/5 px-6 py-3">
      <div className="mx-auto max-w-5xl space-y-2">
        {accepted && (
          <p className="text-sm">
            You joined <strong>{accepted.name}</strong>.{" "}
            <Link href={`/institutes/${accepted.instituteId}`} className="text-primary hover:underline">
              Open institute dashboard
            </Link>
          </p>
        )}
        {invites.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium">Pending institute invitations</p>
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
              >
                <span>
                  {inv.instituteName} as {ROLE_LABELS[inv.role] || inv.role}
                </span>
                <button
                  type="button"
                  onClick={() => accept(inv.id, inv.instituteName, inv.instituteId)}
                  className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => reject(inv.id)}
                  className="rounded border px-2 py-0.5 text-xs hover:bg-muted"
                >
                  Decline
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
