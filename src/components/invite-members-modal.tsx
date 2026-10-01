"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { InviteUserField, type UserSuggestion } from "@/components/invite-user-field";

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

function InviteForm({
  instituteId,
  onSent,
}: {
  instituteId: string;
  onSent: () => void;
}) {
  const [inviteKind, setInviteKind] = useState<"staff" | "student">("staff");
  const [query, setQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const role = inviteKind === "staff" ? "teacher" : "student";

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    if (!selectedUser?.userId) {
      setError("Select an existing platform user.");
      setSending(false);
      return;
    }

    const res = await fetch(`/api/institutes/${instituteId}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId: selectedUser.userId, role }),
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || "Could not send invitation.");
      return;
    }
    setQuery("");
    setSelectedUser(null);
    onSent();
  }

  return (
    <form onSubmit={send} className="space-y-4">
      <div className="flex gap-2">
        {(["staff", "student"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setInviteKind(kind)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition ${
              inviteKind === kind
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted"
            }`}
          >
            {kind}
          </button>
        ))}
      </div>
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
      <button
        type="submit"
        disabled={sending || !selectedUser}
        className="w-full rounded-lg bg-primary py-2 text-sm text-primary-foreground disabled:opacity-60"
      >
        {sending ? "Sending..." : "Send invitation"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}

export function InviteMembersModal({
  instituteId,
  open,
  onClose,
  onSent,
}: {
  instituteId: string;
  open: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Send invitation">
      <InviteForm
        instituteId={instituteId}
        onSent={() => {
          onClose();
          onSent();
        }}
      />
    </Modal>
  );
}

export function InviteMembersButton({
  instituteId,
  onSent,
  className = "",
}: {
  instituteId: string;
  onSent: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        }
      >
        Send invitation
      </button>
      <InviteMembersModal
        instituteId={instituteId}
        open={open}
        onClose={() => setOpen(false)}
        onSent={onSent}
      />
    </>
  );
}
