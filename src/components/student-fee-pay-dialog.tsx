"use client";

import { useEffect, useMemo, useState } from "react";
import { FeeDialog } from "@/components/configure-fees/fee-dialog";
import { formatPaise, LabeledInput } from "@/components/institute-tabs/module-tab-ui";
import { openFeeReceiptPrint } from "@/components/fee-receipt-print";
import { paiseToRupeesInput, rupeesInputToPaise } from "@/lib/fee-money";

export type PayableFeeLine = {
  feeStructureId: string;
  feeStructureName?: string | null;
  balancePaise: number;
};

export function StudentFeePayDialog({
  open,
  mode = "record",
  instituteId,
  sectionId,
  studentId,
  studentLabel,
  lines,
  onClose,
  onPaid,
}: {
  open: boolean;
  /** `record` — finance staff; `proof` — student/parent submit for approval. */
  mode?: "record" | "proof";
  instituteId: string;
  sectionId: string;
  studentId: string;
  studentLabel: string;
  lines: PayableFeeLine[];
  onClose: () => void;
  onPaid: () => void;
}) {
  const isProof = mode === "proof";
  const payable = useMemo(() => lines.filter((l) => l.balancePaise > 0), [lines]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [method, setMethod] = useState(isProof ? "upi" : "cash");
  const [reference, setReference] = useState("");
  const [proofNotes, setProofNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const initSel: Record<string, boolean> = {};
    const initAmt: Record<string, string> = {};
    for (const line of payable) {
      initSel[line.feeStructureId] = true;
      initAmt[line.feeStructureId] = paiseToRupeesInput(line.balancePaise);
    }
    setSelected(initSel);
    setAmounts(initAmt);
    setMethod(isProof ? "upi" : "cash");
    setError("");
    setProofNotes("");
  }, [open, payable, isProof]);

  const totalSelected = useMemo(() => {
    let sum = 0;
    for (const line of payable) {
      if (!selected[line.feeStructureId]) continue;
      sum += rupeesInputToPaise(amounts[line.feeStructureId] ?? "0");
    }
    return sum;
  }, [payable, selected, amounts]);

  function allocationSummary() {
    return payable
      .filter((l) => selected[l.feeStructureId])
      .map((l) => {
        const amt = rupeesInputToPaise(amounts[l.feeStructureId] ?? "0");
        if (amt <= 0) return null;
        return `${l.feeStructureName ?? "Fee"}: ${formatPaise(amt)}`;
      })
      .filter(Boolean)
      .join("; ");
  }

  async function submit() {
    const allocations = payable
      .filter((l) => selected[l.feeStructureId])
      .map((l) => ({
        feeStructureId: l.feeStructureId,
        amountPaise: rupeesInputToPaise(amounts[l.feeStructureId] ?? "0"),
      }))
      .filter((a) => a.amountPaise > 0);
    if (allocations.length === 0) {
      setError("Select at least one fee line with an amount");
      return;
    }
    setBusy(true);
    setError("");

    if (isProof) {
      const lineSummary = allocationSummary();
      const notes = [proofNotes.trim(), lineSummary ? `Fees: ${lineSummary}` : ""].filter(Boolean).join(" — ");
      const res = await fetch(`/api/institutes/${instituteId}/sections/${sectionId}/fee-payment-submissions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId,
          studentId,
          amountPaise: totalSelected,
          method,
          reference,
          proofNotes: notes || lineSummary,
        }),
      });
      setBusy(false);
      if (!res.ok) {
        setError("Could not submit payment for approval");
        return;
      }
      onPaid();
      onClose();
      return;
    }

    const res = await fetch(`/api/institutes/${instituteId}/fees/payments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        sectionId,
        method,
        reference,
        allocations,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Could not record payment");
      return;
    }
    const payment = await res.json();
    openFeeReceiptPrint({
      instituteName: "Institute",
      receiptNumber: payment.receiptNumber,
      amountPaise: payment.amountPaise,
      method: payment.method,
      reference: payment.reference,
      createdAt: payment.createdAt,
      studentLabel,
      recordedBy: payment.recordedBy,
    });
    onPaid();
    onClose();
  }

  const title = isProof ? "Pay outstanding balance" : "Record payment";
  const submitLabel = isProof ? "Submit for approval" : "Save & print receipt";

  return (
    <FeeDialog open={open} title={title} onClose={onClose}>
      <p className="mb-3 text-sm text-muted-foreground">
        Student: {studentLabel}
        {isProof && (
          <span className="mt-1 block text-xs">Finance will verify your transfer and approve the payment.</span>
        )}
      </p>
      {payable.length === 0 ? (
        <p className="text-sm text-muted-foreground">No outstanding fee lines.</p>
      ) : (
        <ul className="mb-3 max-h-56 space-y-2 overflow-y-auto">
          {payable.map((line) => (
            <li key={line.feeStructureId} className="rounded-lg border border-border p-2">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected[line.feeStructureId] ?? false}
                  onChange={(e) =>
                    setSelected((prev) => ({ ...prev, [line.feeStructureId]: e.target.checked }))
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{line.feeStructureName ?? "Fee"}</span>
                  <span className="ml-1 text-muted-foreground">(due {formatPaise(line.balancePaise)})</span>
                  <LabeledInput
                    label="Pay ₹"
                    value={amounts[line.feeStructureId] ?? ""}
                    onChange={(v) => setAmounts((prev) => ({ ...prev, [line.feeStructureId]: v }))}
                  />
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <label className="mb-2 block text-xs font-semibold text-muted-foreground">
        Method
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 w-full rounded-lg border px-2 py-2 text-sm">
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank">Bank</option>
        </select>
      </label>
      <LabeledInput label={isProof ? "Transaction ref / UTR" : "Reference"} value={reference} onChange={setReference} />
      {isProof && (
        <LabeledInput label="Proof notes (optional)" value={proofNotes} onChange={setProofNotes} />
      )}
      <p className="my-2 text-sm font-medium">Total: {formatPaise(totalSelected)}</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="button"
        disabled={busy || payable.length === 0}
        onClick={() => void submit()}
        className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </FeeDialog>
  );
}
