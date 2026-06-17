"use client";

import Link from "next/link";
import { useState } from "react";
import { Copy, UserPlus } from "lucide-react";
import { InviteMembersButton } from "@/components/invite-members-modal";

export function MembershipActions({
  instituteId,
  joinCode,
  onChanged,
}: {
  instituteId: string;
  joinCode: string;
  onChanged: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold">Add people to your institute</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Invite staff or students by email, or let them request to join with your institute code.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <UserPlus className="h-4 w-4 text-primary" />
            Invite by email
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Search for a MyData user or enter their email. They accept from Invitations or their
            inbox.
          </p>
          <div className="mt-3">
            <InviteMembersButton instituteId={instituteId} onSent={onChanged} />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm font-medium">Join with code</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Share this code. Applicants go to{" "}
            <Link href="/institutes/join" className="font-medium text-primary hover:underline">
              Join with code
            </Link>{" "}
            and submit a request for you to approve.
          </p>
          <button
            type="button"
            onClick={copyCode}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold tracking-wider transition hover:bg-muted"
          >
            <code>{joinCode}</code>
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            {copied && <span className="text-xs font-normal text-primary">Copied</span>}
          </button>
        </div>
      </div>
    </section>
  );
}
