"use client";

import { useEffect, useState } from "react";
import { formatPaise, Panel } from "@/components/institute-tabs/module-tab-ui";

type Ledger = {
  sectionDefault: { amountPaise: number; feePlan?: { name: string } | null };
  students: { balancePaise: number; status: string }[];
};

export function SectionFeesLedger({
  instituteId,
  sectionId,
}: {
  instituteId: string;
  sectionId: string;
  rosterStudents?: unknown;
}) {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/institutes/${instituteId}/sections/${sectionId}/fees/ledger`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load");
        setLedger(await res.json());
      })
      .catch(() => setError("Could not load class fee summary"));
  }, [instituteId, sectionId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!ledger) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const dueCount = ledger.students.filter((s) => s.balancePaise > 0 || s.status === "due").length;
  const configured = ledger.sectionDefault.amountPaise > 0;

  return (
    <div className="space-y-3">
      <Panel title="Class fee summary">
        <p className="text-sm">
          Section default:{" "}
          {configured ? (
            <>
              {formatPaise(ledger.sectionDefault.amountPaise)}
              {ledger.sectionDefault.feePlan ? ` · ${ledger.sectionDefault.feePlan.name}` : ""}
            </>
          ) : (
            <span className="text-muted-foreground">Set under Configure → Fees → Organization.</span>
          )}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {ledger.students.length} student{ledger.students.length === 1 ? "" : "s"}
          {dueCount > 0 ? ` · ${dueCount} with balance due` : " · no outstanding balances"}
        </p>
      </Panel>
      <p className="text-sm text-muted-foreground">
        Open <strong>Roster</strong> and use <strong>Fees</strong> on a student for their ledger, plan, and payment
        history.
      </p>
    </div>
  );
}
