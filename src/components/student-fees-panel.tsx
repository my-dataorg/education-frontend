"use client";

import { useEffect, useState } from "react";
import { formatPaise, Panel } from "@/components/institute-tabs/module-tab-ui";
import { formatUserName } from "@/components/user-identity";
import type { Member } from "@/lib/api";

type FeeDetail = {
  billedPaise: number;
  paidPaise: number;
  balancePaise: number;
  status: string;
  resolvedFromLabel: string;
  orgNodeLabel?: string | null;
  resolvedAmountPaise: number;
  nextDueDate?: string | null;
  installments?: { sequence: number; dueDate: string; amountPaise: number | null }[];
  feePlan?: { name: string; planType?: string } | null;
  payments: { receiptNumber: string; amountPaise: number; method: string; createdAt: string }[];
};

export function StudentFeesPanel({
  instituteId,
  sectionId,
  student,
  onClose,
}: {
  instituteId: string;
  sectionId: string;
  student: Member;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<FeeDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/institutes/${instituteId}/sections/${sectionId}/students/${student.userId}/fees`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        setDetail(await res.json());
      })
      .catch(() => setError("Could not load student fees"));
  }, [instituteId, sectionId, student.userId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">Student fees</p>
            <p className="font-semibold">{formatUserName(student)}</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {detail && (
            <div className="space-y-4">
              <Panel title="Summary">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Resolved</dt>
                    <dd>{formatPaise(detail.resolvedAmountPaise)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Balance</dt>
                    <dd className="font-medium">{formatPaise(detail.balancePaise)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Source</dt>
                    <dd>{detail.orgNodeLabel || detail.resolvedFromLabel}</dd>
                  </div>
                  {detail.feePlan?.name && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Plan</dt>
                      <dd>
                        {detail.feePlan.name}
                        {detail.feePlan.planType ? ` (${detail.feePlan.planType})` : ""}
                      </dd>
                    </div>
                  )}
                  {detail.nextDueDate && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Next due</dt>
                      <dd>{detail.nextDueDate}</dd>
                    </div>
                  )}
                </dl>
              </Panel>
              {detail.installments && detail.installments.length > 0 && (
                <Panel title="Installments">
                  <ul className="space-y-1 text-sm">
                    {detail.installments.map((row) => (
                      <li key={row.sequence} className="flex justify-between">
                        <span>
                          #{row.sequence} · {row.dueDate}
                        </span>
                        <span>{row.amountPaise != null ? formatPaise(row.amountPaise) : "—"}</span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
              {detail.payments.length > 0 && (
                <Panel title="Recent payments">
                  <ul className="space-y-1 text-sm">
                    {detail.payments.map((p) => (
                      <li key={p.receiptNumber} className="flex justify-between">
                        <span>
                          {p.receiptNumber} · {p.method}
                        </span>
                        <span>{formatPaise(p.amountPaise)}</span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
              <p className="text-xs text-muted-foreground">
                Record new payments from Finance when ready; this panel is read-only.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
