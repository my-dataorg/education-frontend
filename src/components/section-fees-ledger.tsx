"use client";

import { Fragment, useEffect, useState } from "react";
import { formatPaise, Panel } from "@/components/institute-tabs/module-tab-ui";
import { formatUserName } from "@/components/user-identity";
import type { Member } from "@/lib/api";

type LedgerStudent = {
  studentId: string;
  billedPaise: number;
  paidPaise: number;
  balancePaise: number;
  status: string;
  resolvedFromLabel?: string;
  resolvedAmountPaise?: number;
  nextDueDate?: string | null;
  installments?: { sequence: number; dueDate: string; amountPaise: number | null }[];
  fees: {
    feePlanName?: string | null;
    amountPaise: number;
    paidPaise: number;
    balancePaise: number;
    installmentCount?: number;
  }[];
  payments: {
    receiptNumber: string;
    amountPaise: number;
    method: string;
    createdAt: string;
  }[];
};

type Ledger = {
  sectionDefault: { amountPaise: number; feePlan?: { name: string } | null };
  students: LedgerStudent[];
};

export function SectionFeesLedger({
  instituteId,
  sectionId,
  rosterStudents,
}: {
  instituteId: string;
  sectionId: string;
  rosterStudents?: Member[];
}) {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/institutes/${instituteId}/sections/${sectionId}/fees/ledger`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load");
        setLedger(await res.json());
      })
      .catch(() => setError("Could not load class fee ledger"));
  }, [instituteId, sectionId]);

  function labelFor(studentId: string) {
    const member = rosterStudents?.find((m) => m.userId === studentId);
    return member ? formatUserName(member) : studentId;
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!ledger) return <p className="text-sm text-muted-foreground">Loading fee ledger…</p>;

  const configured = ledger.sectionDefault.amountPaise > 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Class default:{" "}
        {configured ? (
          <>
            {formatPaise(ledger.sectionDefault.amountPaise)}
            {ledger.sectionDefault.feePlan ? ` · plan: ${ledger.sectionDefault.feePlan.name}` : ""}
          </>
        ) : (
          <span>Set under Configure → Fees.</span>
        )}
      </p>

      <Panel title="Students — dues & payments">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 uppercase tracking-wide text-muted-foreground">
              <tr>
                {["Student", "Source", "Plan", "Annual fee", "Paid", "Due", "Next due", ""].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledger.students.map((row) => (
                <tr key={row.studentId} className="border-t border-border">
                  <td className="px-3 py-2.5">{labelFor(row.studentId)}</td>
                  <td className="px-3 py-2.5">{row.resolvedFromLabel ?? "—"}</td>
                  <td className="px-3 py-2.5">{row.fees[0]?.feePlanName ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    {formatPaise(row.resolvedAmountPaise ?? row.billedPaise)}
                  </td>
                  <td className="px-3 py-2.5">{formatPaise(row.paidPaise)}</td>
                  <td className="px-3 py-2.5">{formatPaise(row.balancePaise)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{row.nextDueDate ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      className="text-primary"
                      onClick={() => setExpanded((id) => (id === row.studentId ? null : row.studentId))}
                    >
                      {expanded === row.studentId ? "Hide" : "History"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ledger.students.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">No students in this class yet.</p>
        )}

        {expanded && (
          <Fragment>
            {ledger.students
              .filter((s) => s.studentId === expanded)
              .map((row) => (
                <div key={row.studentId} className="mt-4 rounded-lg border border-border bg-muted/20 p-3 text-sm">
                  {row.installments?.length ? (
                    <ul className="mb-2 list-disc pl-4 text-xs text-muted-foreground">
                      {row.installments.map((inst) => (
                        <li key={inst.sequence}>
                          Installment {inst.sequence}: due {inst.dueDate}
                          {inst.amountPaise != null ? ` · ${formatPaise(inst.amountPaise)}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="font-medium">{labelFor(row.studentId)} — payment history</p>
                  {row.payments.length ? (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {row.payments.map((p) => (
                        <li key={p.receiptNumber}>
                          {p.receiptNumber} · {formatPaise(p.amountPaise)} · {p.method} ·{" "}
                          {new Date(p.createdAt).toLocaleDateString()}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">No payments recorded yet.</p>
                  )}
                  {row.fees.length > 0 && (
                    <p className="mt-3 text-xs">
                      Commitment: {formatPaise(row.fees[0].amountPaise)} billed ·{" "}
                      {row.fees[0].installmentCount
                        ? `${row.fees[0].installmentCount} installments`
                        : "lump sum"}
                    </p>
                  )}
                </div>
              ))}
          </Fragment>
        )}
      </Panel>
      <p className="text-xs text-muted-foreground">
        Record new payments under Finance → Students. Fee setup is under Configure → Fees.
      </p>
    </div>
  );
}
