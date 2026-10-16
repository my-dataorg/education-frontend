"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable, formatPaise, KpiCard, ModuleHeader, Panel } from "@/components/institute-tabs/module-tab-ui";

type DueRow = {
  studentId: string;
  feeStructureId: string;
  amountPaise: number;
  paidPaise: number;
  balancePaise: number;
};

type FeeStructure = { id: string; name: string; amountPaise: number };

export function FeesTab({ instituteId }: { instituteId: string }) {
  const [dues, setDues] = useState<DueRow[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [structureName, setStructureName] = useState("");
  const [structureAmount, setStructureAmount] = useState("1200000");
  const [payStudentId, setPayStudentId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [duesRes, structuresRes] = await Promise.all([
      fetch(`/api/institutes/${instituteId}/fees/dues`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/fee-structures`, { credentials: "include" }),
    ]);
    if (!duesRes.ok || !structuresRes.ok) throw new Error("Could not load fees");
    setDues(await duesRes.json());
    setStructures(await structuresRes.json());
  }, [instituteId]);

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load"));
  }, [load]);

  const totals = useMemo(() => {
    const billed = dues.reduce((sum, row) => sum + row.amountPaise, 0);
    const collected = dues.reduce((sum, row) => sum + row.paidPaise, 0);
    const outstanding = dues.reduce((sum, row) => sum + row.balancePaise, 0);
    const overdue = dues.filter((row) => row.balancePaise > 0 && row.paidPaise === 0).reduce((s, r) => s + r.balancePaise, 0);
    return { billed, collected, outstanding, overdue };
  }, [dues]);

  async function createStructure() {
    if (!structureName.trim()) return;
    const response = await fetch(`/api/institutes/${instituteId}/fee-structures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: structureName.trim(), amountPaise: Number(structureAmount) }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.detail || "Could not create fee structure");
      return;
    }
    setStructureName("");
    setMessage("Fee structure created");
    await load();
  }

  async function recordPayment() {
    if (!payStudentId.trim() || !payAmount.trim()) return;
    const response = await fetch(`/api/institutes/${instituteId}/fees/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        studentId: payStudentId.trim(),
        amountPaise: Number(payAmount),
        method: "cash",
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.detail || "Could not record payment");
      return;
    }
    const receipt = await response.json();
    setMessage(`Payment recorded · ${receipt.receiptNumber}`);
    setPayAmount("");
    await load();
  }

  const structureNameById = (id: string) => structures.find((row) => row.id === id)?.name || id;

  return (
    <section className="space-y-5">
      <ModuleHeader
        title="Fees"
        description="Track collections, concessions, receipts, and dues"
        action={
          <button
            type="button"
            onClick={() => void recordPayment()}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
          >
            Record payment
          </button>
        }
      />
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Billed this year" value={formatPaise(totals.billed)} />
        <KpiCard label="Collected" value={formatPaise(totals.collected)} />
        <KpiCard label="Outstanding" value={formatPaise(totals.outstanding)} />
        <KpiCard label="Overdue (unpaid)" value={formatPaise(totals.overdue)} />
      </div>
      <Panel title="Fee structures">
        <div className="flex flex-wrap gap-2">
          <input
            value={structureName}
            onChange={(e) => setStructureName(e.target.value)}
            placeholder="Structure name"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={structureAmount}
            onChange={(e) => setStructureAmount(e.target.value)}
            type="number"
            placeholder="Amount (paise)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void createStructure()}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium"
          >
            Add structure
          </button>
        </div>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {structures.map((row) => (
            <li key={row.id}>{row.name} · {formatPaise(row.amountPaise)}</li>
          ))}
        </ul>
      </Panel>
      <Panel title="Record payment">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={payStudentId}
            onChange={(e) => setPayStudentId(e.target.value)}
            placeholder="Student user ID"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            type="number"
            placeholder="Amount (paise)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </Panel>
      <Panel title="Collection & dues">
        <DataTable
          headers={["Student", "Fee", "Due", "Paid", "Status"]}
          rows={dues.map((row) => [
            row.studentId,
            structureNameById(row.feeStructureId),
            formatPaise(row.amountPaise),
            formatPaise(row.paidPaise),
            row.balancePaise === 0 ? "Paid" : row.paidPaise > 0 ? "Part paid" : "Overdue",
          ])}
        />
        {dues.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No student fees assigned yet.</p>}
      </Panel>
    </section>
  );
}
