"use client";

import { useCallback, useEffect, useState } from "react";
import { inviteeLabel } from "@/components/user-identity";
import { ROLE_LABELS } from "@/lib/roles";

type Invitation = {
  id: string;
  role: string;
  status: string;
  createdAt: string;
  inviteeEmail?: string;
  inviteeDisplayName?: string;
  inviteeUsername?: string;
};

export function InvitationsSentPanel({
  instituteId,
  refreshKey = 0,
}: {
  instituteId: string;
  refreshKey?: number;
}) {
  const [rows, setRows] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/institutes/${instituteId}/invitations`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load invitations");
        setRows(await response.json());
        setError("");
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load invitations"))
      .finally(() => setLoading(false));
  }, [instituteId]);

  useEffect(() => {
    queueMicrotask(load);
  }, [load, refreshKey]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading invitations…</p>;
  if (error) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        <span>{error}</span>
        <button type="button" onClick={load} className="font-medium underline">Retry</button>
      </div>
    );
  }
  if (!rows.length) {
    return <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">No invitations sent.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/50 uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Person</th>
            <th className="px-3 py-2 font-medium">Role</th>
            <th className="px-3 py-2 font-medium">Sent</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-border">
              <td className="px-3 py-2.5">{inviteeLabel(row)}</td>
              <td className="px-3 py-2.5">{ROLE_LABELS[row.role] || row.role}</td>
              <td className="px-3 py-2.5">{new Date(row.createdAt).toLocaleDateString("en-IN")}</td>
              <td className="px-3 py-2.5 capitalize">{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
