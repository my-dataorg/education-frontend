"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLE_LABELS } from "@/lib/roles";

export type Invitation = {
  id: string;
  instituteId: string;
  instituteName: string;
  role: string;
};

export function InvitationsList({
  invites: initial,
  variant = "default",
}: {
  invites: Invitation[];
  variant?: "default" | "prominent";
}) {
  const router = useRouter();
  const [invites, setInvites] = useState(initial);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (invites.length === 0 && !message) {
    return null;
  }

  async function accept(id: string, name: string, instituteId: string) {
    setError("");
    const res = await fetch(`/api/invitations/${id}/accept`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      setInvites((prev) => prev.filter((i) => i.id !== id));
      setMessage(`You joined ${name}.`);
      router.refresh();
      router.push(`/institutes/${instituteId}`);
      return;
    }
    setError("Could not accept invitation. Try signing out and back in.");
  }

  async function reject(id: string) {
    setError("");
    await fetch(`/api/invitations/${id}/reject`, {
      method: "POST",
      credentials: "include",
    });
    setInvites((prev) => prev.filter((i) => i.id !== id));
    router.refresh();
  }

  const cardClass =
    variant === "prominent"
      ? "rounded-xl border-2 border-primary/30 bg-card p-6 shadow-sm"
      : "rounded-xl border border-border bg-card p-4";

  return (
    <div className="space-y-4">
      {variant === "prominent" && invites.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold">You&apos;re invited</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            An institute admin invited you as staff or student. Accept to join, or decline to dismiss.
          </p>
        </div>
      )}
      {message && (
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {invites.map((inv) => (
        <div
          key={inv.id}
          className={`flex flex-wrap items-center justify-between gap-4 ${cardClass}`}
        >
          <div>
            <p className="font-medium">{inv.instituteName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Join as {ROLE_LABELS[inv.role] || inv.role}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => accept(inv.id, inv.instituteName, inv.instituteId)}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => reject(inv.id)}
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
