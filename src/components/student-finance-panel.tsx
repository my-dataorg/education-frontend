"use client";

import { useEffect, useState } from "react";
import { DataTable, formatPaise, Panel } from "@/components/institute-tabs/module-tab-ui";

type DueRow = {
  amountPaise: number;
  paidPaise: number;
  balancePaise: number;
  feePlanName?: string | null;
  installmentCount?: number;
  installmentAmountPaise?: number;
  discountPercent?: number;
  lateFeePaise?: number;
};

export function StudentFinancePanel({ instituteId }: { instituteId: string }) {
  const [dues, setDues] = useState<DueRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/institutes/${instituteId}/fees/dues`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load");
        setDues(await res.json());
      })
      .catch(() => setError("Fees could not be loaded"));
  }, [instituteId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const totalDue = dues.reduce((s, r) => s + r.balancePaise, 0);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Total outstanding: <strong>{formatPaise(totalDue)}</strong>
      </p>
      <Panel title="Your fee commitment">
        <DataTable
          headers={["Plan", "Billed", "Paid", "Balance", "Per installment"]}
          rows={dues.map((row) => [
            row.feePlanName || "Standard",
            formatPaise(row.amountPaise),
            formatPaise(row.paidPaise),
            formatPaise(row.balancePaise),
            row.installmentAmountPaise ? formatPaise(row.installmentAmountPaise) : "—",
          ])}
        />
        {dues.length === 0 && (
          <p className="text-sm text-muted-foreground">No fees assigned for this year yet.</p>
        )}
      </Panel>
    </div>
  );
}
