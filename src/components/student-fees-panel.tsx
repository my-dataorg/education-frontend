"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPaise } from "@/components/institute-tabs/module-tab-ui";
import { downloadFeeReceipt, openFeeReceiptPrint } from "@/components/fee-receipt-print";
import { formatUserName } from "@/components/user-identity";
import { paiseToRupeesInput, rupeesInputToPaise } from "@/lib/fee-money";
import { toFeeReceiptPayload, type FeeReceiptContext } from "@/lib/fee-receipt-context";
import type { Member } from "@/lib/api";

type FeeLine = {
  feeStructureId: string;
  feeStructureName?: string | null;
  amountPaise: number;
  paidPaise: number;
  balancePaise: number;
  feePlanId?: string | null;
  feePlanName?: string | null;
  discountPercent?: number;
};

type FeeDetail = {
  billedPaise?: number;
  resolvedAmountPaise?: number;
  paidPaise: number;
  balancePaise: number;
  fees?: FeeLine[];
  payments: {
    id?: string;
    receiptNumber: string;
    amountPaise: number;
    method: string;
    reference?: string;
    recordedBy?: string;
    createdAt: string;
  }[];
};

type PayInputMode = "rupees" | "percent";

/** Billed is editable only while there is balance due; cannot bill below amount already paid. */
function canEditBilledForLine(line: FeeLine): boolean {
  return line.balancePaise > 0;
}

function payPaiseForLine(balancePaise: number, raw: string, mode: PayInputMode): number {
  if (mode === "percent") {
    const pct = Number.parseFloat(raw.trim());
    if (Number.isNaN(pct) || pct <= 0) return 0;
    return Math.min(balancePaise, Math.round((balancePaise * pct) / 100));
  }
  return Math.min(balancePaise, rupeesInputToPaise(raw));
}

export function StudentFeesPanel({
  instituteId,
  instituteName = "Institute",
  sectionLabel,
  sectionId,
  student,
  receiptContext,
  onClose,
  canRecordPayment = false,
  canEditFees = false,
  canPayOutstanding = false,
}: {
  instituteId: string;
  instituteName?: string;
  sectionLabel?: string;
  sectionId: string;
  student: Member;
  receiptContext?: FeeReceiptContext;
  onClose: () => void;
  canRecordPayment?: boolean;
  canEditFees?: boolean;
  canPayOutstanding?: boolean;
}) {
  const [detail, setDetail] = useState<FeeDetail | null>(null);
  const [error, setError] = useState("");
  const [billedInputs, setBilledInputs] = useState<Record<string, string>>({});
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState("");
  const [savingBilled, setSavingBilled] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [payInputs, setPayInputs] = useState<Record<string, string>>({});
  const [payInputMode, setPayInputMode] = useState<PayInputMode>("rupees");
  const [method, setMethod] = useState(canRecordPayment ? "cash" : "upi");
  const [reference, setReference] = useState("");
  const [proofNotes, setProofNotes] = useState("");
  const [payError, setPayError] = useState("");
  const [busy, setBusy] = useState(false);

  const studentLabel = formatUserName(student);
  const isProof = !canRecordPayment && canPayOutstanding;

  const printContext = useMemo<FeeReceiptContext>(
    () => ({
      instituteName: receiptContext?.instituteName ?? instituteName,
      sectionLabel: receiptContext?.sectionLabel ?? sectionLabel,
      studentLabel,
      userNameForId: receiptContext?.userNameForId,
      fallbackRecorderName: receiptContext?.fallbackRecorderName,
    }),
    [receiptContext, instituteName, sectionLabel, studentLabel]
  );

  const load = () => {
    fetch(`/api/institutes/${instituteId}/sections/${sectionId}/students/${student.userId}/fees`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        setDetail(await res.json());
      })
      .catch(() => setError("Could not load student fees"));
  };

  useEffect(() => {
    load();
  }, [instituteId, sectionId, student.userId]);

  const payableLines = useMemo(
    () => (detail?.fees ?? []).filter((l) => l.balancePaise > 0),
    [detail?.fees]
  );

  useEffect(() => {
    if (!detail) return;
    const sel: Record<string, boolean> = {};
    const inputs: Record<string, string> = {};
    const billed: Record<string, string> = {};
    for (const line of detail.fees ?? []) {
      billed[line.feeStructureId] = paiseToRupeesInput(line.amountPaise);
    }
    for (const line of payableLines) {
      sel[line.feeStructureId] = true;
      inputs[line.feeStructureId] = paiseToRupeesInput(line.balancePaise);
    }
    setBilledInputs(billed);
    setEditNotes("");
    setEditError("");
    setSelected(sel);
    setPayInputs(inputs);
    setPayInputMode("rupees");
    setPayError("");
  }, [detail, payableLines]);

  const billedDirty = useMemo(() => {
    if (!canEditFees || !detail?.fees) return false;
    return detail.fees.some((line) => {
      if (!canEditBilledForLine(line)) return false;
      const next = rupeesInputToPaise(billedInputs[line.feeStructureId] ?? "0");
      return next !== line.amountPaise;
    });
  }, [canEditFees, detail?.fees, billedInputs]);

  function switchPayInputMode(mode: PayInputMode) {
    setPayInputMode(mode);
    setPayInputs((prev) => {
      const next = { ...prev };
      for (const line of payableLines) {
        next[line.feeStructureId] =
          mode === "percent" ? "100" : paiseToRupeesInput(line.balancePaise);
      }
      return next;
    });
  }

  const totalPayPaise = useMemo(() => {
    let sum = 0;
    for (const line of payableLines) {
      if (!selected[line.feeStructureId]) continue;
      sum += payPaiseForLine(line.balancePaise, payInputs[line.feeStructureId] ?? "", payInputMode);
    }
    return sum;
  }, [payableLines, selected, payInputs, payInputMode]);

  function allocationSummary(allocations: { feeStructureId: string; amountPaise: number }[]) {
    const names = new Map((detail?.fees ?? []).map((f) => [f.feeStructureId, f.feeStructureName ?? "Fee"]));
    return allocations
      .map((a) => `${names.get(a.feeStructureId) ?? "Fee"}: ${formatPaise(a.amountPaise)}`)
      .join("; ");
  }

  async function saveBilledChanges() {
    if (!detail?.fees) return;
    if (!editNotes.trim()) {
      setEditError("Add notes explaining why fees were changed");
      return;
    }
    setSavingBilled(true);
    setEditError("");
    try {
      for (const line of detail.fees) {
        if (!canEditBilledForLine(line)) continue;
        const amount = rupeesInputToPaise(billedInputs[line.feeStructureId] ?? "0");
        if (amount === line.amountPaise) continue;
        if (amount < line.paidPaise) {
          setEditError(`${line.feeStructureName ?? "Fee"}: billed cannot be less than paid`);
          setSavingBilled(false);
          return;
        }
        const res = await fetch(`/api/institutes/${instituteId}/student-fees`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: student.userId,
            sectionId,
            feeStructureId: line.feeStructureId,
            amountPaise: amount,
            feePlanId: line.feePlanId ?? null,
            paymentNotes: editNotes.trim(),
          }),
        });
        if (!res.ok) throw new Error("save");
      }
      load();
    } catch {
      setEditError("Could not save fee changes");
    } finally {
      setSavingBilled(false);
    }
  }

  async function submitPayment() {
    const allocations = payableLines
      .filter((l) => selected[l.feeStructureId])
      .map((l) => ({
        feeStructureId: l.feeStructureId,
        amountPaise: payPaiseForLine(l.balancePaise, payInputs[l.feeStructureId] ?? "", payInputMode),
      }))
      .filter((a) => a.amountPaise > 0);
    if (allocations.length === 0) {
      setPayError("Select at least one fee line and enter an amount");
      return;
    }
    setBusy(true);
    setPayError("");

    if (isProof) {
      const lineSummary = allocationSummary(allocations);
      const notes = [proofNotes.trim(), lineSummary ? `Fees: ${lineSummary}` : ""].filter(Boolean).join(" — ");
      const res = await fetch(`/api/institutes/${instituteId}/sections/${sectionId}/fee-payment-submissions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId,
          studentId: student.userId,
          amountPaise: totalPayPaise,
          method,
          reference,
          proofNotes: notes || lineSummary,
        }),
      });
      setBusy(false);
      if (!res.ok) {
        setPayError("Could not submit payment for approval");
        return;
      }
      load();
      return;
    }

    const res = await fetch(`/api/institutes/${instituteId}/fees/payments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: student.userId,
        sectionId,
        method,
        reference,
        allocations,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      let msg = "Could not record payment";
      try {
        const body = await res.json();
        if (typeof body?.detail === "string") msg = body.detail;
      } catch {
        /* ignore */
      }
      setPayError(msg);
      return;
    }
    const payment = await res.json();
    openFeeReceiptPrint(
      toFeeReceiptPayload(
        {
          id: payment.id,
          receiptNumber: payment.receiptNumber,
          amountPaise: payment.amountPaise,
          method: payment.method,
          reference: payment.reference ?? "",
          createdAt: payment.createdAt,
          recordedBy: payment.recordedBy,
        },
        printContext
      )
    );
    load();
  }

  const hasOutstanding = (detail?.balancePaise ?? 0) > 0;
  const showPayBlock = canPayOutstanding && hasOutstanding && payableLines.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[min(92vh,42rem)] w-full max-w-3xl flex-col rounded-xl border border-border bg-background shadow-xl"
        role="dialog"
        aria-labelledby="student-fees-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-xs text-muted-foreground">Student fees</p>
            <p id="student-fees-title" className="text-lg font-semibold">
              {studentLabel}
            </p>
            {detail && (
              <p className="mt-1 text-sm text-muted-foreground">
                Outstanding {formatPaise(detail.balancePaise)} · Paid {formatPaise(detail.paidPaise)} · Billed{" "}
                {formatPaise(detail.billedPaise ?? detail.resolvedAmountPaise ?? 0)}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {detail && (
            <div className="space-y-4">
              {!showPayBlock && detail.balancePaise === 0 && detail.paidPaise > 0 && (
                <p className="text-sm text-muted-foreground">All fees are paid for this period.</p>
              )}
              <div>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[32rem] text-left text-xs">
                    <thead className="bg-muted/50 uppercase tracking-wide text-muted-foreground">
                      <tr>
                        {showPayBlock && <th className="w-8 px-2 py-2" aria-label="Pay" />}
                        <th className="px-2 py-2 font-medium">Fee type</th>
                        <th className="px-2 py-2 text-right font-medium">Billed</th>
                        <th className="px-2 py-2 text-right font-medium">Paid</th>
                        <th className="px-2 py-2 text-right font-medium">Due</th>
                        <th className="px-2 py-2 font-medium">Plan</th>
                        {showPayBlock && <th className="px-2 py-2 font-medium">Pay</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.fees ?? []).map((line) => {
                        const due = line.balancePaise;
                        const plan = line.feePlanName
                          ? `${line.feePlanName}${line.discountPercent ? ` (−${line.discountPercent}%)` : ""}`
                          : "—";
                        const canPayLine = showPayBlock && due > 0;
                        const billedEditable = canEditFees && canEditBilledForLine(line);
                        const billedMinPaise = line.paidPaise;
                        return (
                          <tr key={line.feeStructureId} className="border-t border-border">
                            {showPayBlock && (
                              <td className="px-2 py-2">
                                {canPayLine ? (
                                  <input
                                    type="checkbox"
                                    checked={selected[line.feeStructureId] ?? false}
                                    onChange={(e) =>
                                      setSelected((prev) => ({
                                        ...prev,
                                        [line.feeStructureId]: e.target.checked,
                                      }))
                                    }
                                  />
                                ) : null}
                              </td>
                            )}
                            <td className="px-2 py-2 font-medium">{line.feeStructureName ?? "Fee"}</td>
                            <td className="px-2 py-2 text-right">
                              {billedEditable ? (
                                <p className="inline-flex flex-col items-end gap-0.5">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    className="w-24 rounded border border-border px-1.5 py-1 text-right text-sm"
                                    value={billedInputs[line.feeStructureId] ?? ""}
                                    title={
                                      billedMinPaise > 0
                                        ? `Minimum billed: ${paiseToRupeesInput(billedMinPaise)} (already paid)`
                                        : undefined
                                    }
                                    onChange={(e) =>
                                      setBilledInputs((prev) => ({
                                        ...prev,
                                        [line.feeStructureId]: e.target.value,
                                      }))
                                    }
                                    onBlur={() => {
                                      if (billedMinPaise <= 0) return;
                                      const current = rupeesInputToPaise(
                                        billedInputs[line.feeStructureId] ?? "0"
                                      );
                                      if (current < billedMinPaise) {
                                        setBilledInputs((prev) => ({
                                          ...prev,
                                          [line.feeStructureId]: paiseToRupeesInput(billedMinPaise),
                                        }));
                                      }
                                    }}
                                  />
                                  {billedMinPaise > 0 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      min {formatPaise(billedMinPaise)}
                                    </span>
                                  )}
                                </p>
                              ) : (
                                formatPaise(line.amountPaise)
                              )}
                            </td>
                            <td className="px-2 py-2 text-right">{formatPaise(line.paidPaise)}</td>
                            <td className="px-2 py-2 text-right font-medium">{formatPaise(due)}</td>
                            <td className="px-2 py-2 text-muted-foreground">{plan}</td>
                            {showPayBlock && (
                              <td className="px-2 py-2">
                                {canPayLine ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      className="w-20 rounded border border-border px-1.5 py-1 text-sm"
                                      value={payInputs[line.feeStructureId] ?? ""}
                                      placeholder={payInputMode === "percent" ? "%" : "₹"}
                                      onChange={(e) =>
                                        setPayInputs((prev) => ({
                                          ...prev,
                                          [line.feeStructureId]: e.target.value,
                                        }))
                                      }
                                    />
                                    <span className="text-muted-foreground">
                                      {payInputMode === "percent" ? "%" : "₹"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {showPayBlock && (
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      Pay as
                      <button
                        type="button"
                        className={`rounded px-2 py-0.5 ${payInputMode === "rupees" ? "bg-primary text-primary-foreground" : "border"}`}
                        onClick={() => switchPayInputMode("rupees")}
                      >
                        ₹ amount
                      </button>
                      <button
                        type="button"
                        className={`rounded px-2 py-0.5 ${payInputMode === "percent" ? "bg-primary text-primary-foreground" : "border"}`}
                        onClick={() => switchPayInputMode("percent")}
                      >
                        % of due
                      </button>
                    </p>
                    <div className="flex flex-wrap items-end gap-2 text-sm">
                      <label className="text-xs text-muted-foreground">
                        Method
                        <select
                          value={method}
                          onChange={(e) => setMethod(e.target.value)}
                          className="mt-0.5 block rounded border px-2 py-1 text-sm"
                        >
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="bank">Bank</option>
                        </select>
                      </label>
                      <label className="text-xs text-muted-foreground">
                        {isProof ? "UTR / ref" : "Reference"}
                        <input
                          type="text"
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                          className="mt-0.5 block w-28 rounded border px-2 py-1 text-sm"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {showPayBlock && isProof && (
                  <label className="mt-2 block text-xs text-muted-foreground">
                    Notes (optional)
                    <input
                      type="text"
                      value={proofNotes}
                      onChange={(e) => setProofNotes(e.target.value)}
                      className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm"
                    />
                  </label>
                )}

                {showPayBlock && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">Total to pay: {formatPaise(totalPayPaise)}</p>
                    <button
                      type="button"
                      disabled={busy || totalPayPaise <= 0}
                      onClick={() => void submitPayment()}
                      className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
                    >
                      {isProof ? "Submit for approval" : "Save & print receipt"}
                    </button>
                  </div>
                )}
                {payError && <p className="mt-2 text-sm text-destructive">{payError}</p>}

                {canEditFees && billedDirty && (
                  <div className="mt-4 space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Notes for fee change
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={2}
                        placeholder="Why are billed amounts being updated?"
                        className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                      />
                    </label>
                    {editError && <p className="text-sm text-destructive">{editError}</p>}
                    <button
                      type="button"
                      disabled={savingBilled}
                      onClick={() => void saveBilledChanges()}
                      className="rounded-lg border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
                    >
                      Save fee changes
                    </button>
                  </div>
                )}
              </div>

              {detail.payments.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">Receipts</p>
                  <ul className="space-y-1 text-sm">
                    {detail.payments.map((p) => (
                      <li key={p.receiptNumber} className="flex justify-between gap-2">
                        <span className="text-muted-foreground">
                          {p.receiptNumber} · {formatPaise(p.amountPaise)} · {p.method}
                        </span>
                        <span className="flex gap-2">
                          <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() =>
                              openFeeReceiptPrint(
                                toFeeReceiptPayload(
                                  {
                                    id: p.id,
                                    receiptNumber: p.receiptNumber,
                                    amountPaise: p.amountPaise,
                                    method: p.method,
                                    reference: p.reference ?? "",
                                    createdAt: p.createdAt,
                                    recordedBy: p.recordedBy,
                                  },
                                  printContext
                                )
                              )
                            }
                          >
                            Print
                          </button>
                          <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() =>
                              downloadFeeReceipt(
                                toFeeReceiptPayload(
                                  {
                                    id: p.id,
                                    receiptNumber: p.receiptNumber,
                                    amountPaise: p.amountPaise,
                                    method: p.method,
                                    reference: p.reference ?? "",
                                    createdAt: p.createdAt,
                                    recordedBy: p.recordedBy,
                                  },
                                  printContext
                                )
                              )
                            }
                          >
                            Download
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
