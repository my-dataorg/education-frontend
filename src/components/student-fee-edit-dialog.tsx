"use client";

import { useEffect, useState } from "react";
import { FeeDialog } from "@/components/configure-fees/fee-dialog";
import { formatPaise, LabeledInput } from "@/components/institute-tabs/module-tab-ui";
import { paiseToRupeesInput, rupeesInputToPaise } from "@/lib/fee-money";

type FeeLine = {
  feeStructureId: string;
  feeStructureName?: string | null;
  amountPaise: number;
  feePlanId?: string | null;
  balancePaise: number;
  paidPaise: number;
};

type FeePlan = { id: string; name: string };

export function StudentFeeEditDialog({
  open,
  instituteId,
  sectionId,
  studentId,
  studentLabel,
  onClose,
  onSaved,
}: {
  open: boolean;
  instituteId: string;
  sectionId: string;
  studentId: string;
  studentLabel: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [lines, setLines] = useState<FeeLine[]>([]);
  const [plans, setPlans] = useState<FeePlan[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [planIds, setPlanIds] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    Promise.all([
      fetch(`/api/institutes/${instituteId}/sections/${sectionId}/students/${studentId}/fees`, {
        credentials: "include",
      }),
      fetch(`/api/institutes/${instituteId}/fee-plans`, { credentials: "include" }),
    ])
      .then(async ([detailRes, plansRes]) => {
        if (!detailRes.ok) throw new Error("load");
        const detail = await detailRes.json();
        const feeLines = (detail.fees ?? []) as FeeLine[];
        setLines(feeLines);
        const amt: Record<string, string> = {};
        const pid: Record<string, string> = {};
        for (const line of feeLines) {
          amt[line.feeStructureId] = paiseToRupeesInput(line.amountPaise);
          pid[line.feeStructureId] = line.feePlanId ?? "";
        }
        setAmounts(amt);
        setPlanIds(pid);
        if (plansRes.ok) setPlans(await plansRes.json());
      })
      .catch(() => setError("Could not load fees"));
  }, [open, instituteId, sectionId, studentId]);

  async function save() {
    setBusy(true);
    setError("");
    try {
      for (const line of lines) {
        const amount = rupeesInputToPaise(amounts[line.feeStructureId] ?? "0");
        if (amount < line.paidPaise) {
          setError(`${line.feeStructureName ?? "Fee"}: billed amount cannot be less than already paid`);
          setBusy(false);
          return;
        }
        const res = await fetch(`/api/institutes/${instituteId}/student-fees`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            sectionId,
            feeStructureId: line.feeStructureId,
            amountPaise: amount,
            feePlanId: planIds[line.feeStructureId] || null,
          }),
        });
        if (!res.ok) throw new Error("save");
      }
      onSaved();
      onClose();
    } catch {
      setError("Could not save student fees");
    } finally {
      setBusy(false);
    }
  }

  return (
    <FeeDialog open={open} title="Edit student fees & plan" onClose={onClose}>
      <p className="mb-3 text-sm text-muted-foreground">
        Student: {studentLabel}. Only finance staff can change billed amounts and plans.
      </p>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      <ul className="mb-3 max-h-72 space-y-3 overflow-y-auto">
        {lines.map((line) => (
          <li key={line.feeStructureId} className="rounded-lg border border-border p-3">
            <p className="text-sm font-medium">{line.feeStructureName ?? "Fee"}</p>
            <p className="mb-2 text-xs text-muted-foreground">
              Paid {formatPaise(line.paidPaise)} · Balance {formatPaise(line.balancePaise)}
            </p>
            <LabeledInput
              label="Billed amount ₹"
              value={amounts[line.feeStructureId] ?? ""}
              onChange={(v) => setAmounts((prev) => ({ ...prev, [line.feeStructureId]: v }))}
            />
            {plans.length > 0 && (
              <label className="mt-2 block text-xs">
                <span className="font-semibold text-muted-foreground">Payment plan</span>
                <select
                  value={planIds[line.feeStructureId] ?? ""}
                  onChange={(e) => setPlanIds((prev) => ({ ...prev, [line.feeStructureId]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                >
                  <option value="">None</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </li>
        ))}
      </ul>
      {lines.length === 0 && !error && <p className="text-sm text-muted-foreground">No fee lines resolved for this student.</p>}
      <button
        type="button"
        disabled={busy || lines.length === 0}
        onClick={() => void save()}
        className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        Save changes
      </button>
    </FeeDialog>
  );
}
