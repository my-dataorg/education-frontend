"use client";

import { useCallback, useEffect, useState } from "react";

type LeaveRequestBrief = {
  id: string;
  requesterName?: string;
  requesterRole: string;
  purpose: string;
  startDate: string;
  endDate: string;
  status: string;
};

type InboxLine = {
  id: string;
  leaveRequestId: string;
  approvalDate: string;
  subjectName?: string;
  assigneeKind: string;
  status: string;
  request?: LeaveRequestBrief;
};

export function LeaveApprovalInbox({ instituteId }: { instituteId: string }) {
  const [lines, setLines] = useState<InboxLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/institutes/${instituteId}/leave-requests/inbox`, { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setLines(Array.isArray(data) ? data : []))
      .catch(() => setLines([]))
      .finally(() => setLoading(false));
  }, [instituteId]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(line: InboxLine, approve: boolean) {
    setMessage("");
    const note = approve ? "" : "Rejected";
    const res = await fetch(
      `/api/institutes/${instituteId}/leave-requests/${line.leaveRequestId}/approvals/${line.id}/decide`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve, note }),
      }
    );
    if (!res.ok) {
      setMessage("Could not save decision");
      return;
    }
    load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading inbox…</p>;

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="font-semibold">Pending approvals</h3>
      {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
      {!lines.length ? (
        <p className="mt-2 text-sm text-muted-foreground">Nothing waiting for your approval.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {lines.map((line) => {
            const req = line.request;
            return (
              <li key={line.id} className="rounded-lg border border-border px-3 py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{req?.requesterName || "Request"}</p>
                    <p className="text-xs text-muted-foreground">
                      {req?.purpose} · {line.approvalDate}
                      {line.subjectName ? ` · ${line.subjectName}` : ""}
                    </p>
                    {req && (
                      <p className="text-xs text-muted-foreground">
                        {req.startDate} → {req.endDate}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => decide(line, true)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(line, false)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
