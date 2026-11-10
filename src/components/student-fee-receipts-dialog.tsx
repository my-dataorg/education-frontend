"use client";

import { FeeDialog } from "@/components/configure-fees/fee-dialog";
import { downloadFeeReceipt, openFeeReceiptPrint } from "@/components/fee-receipt-print";
import { formatPaise } from "@/components/institute-tabs/module-tab-ui";
import { toFeeReceiptPayload, type FeeReceiptContext, type FeeReceiptPayment } from "@/lib/fee-receipt-context";

export function StudentFeeReceiptsDialog({
  open,
  studentName,
  payments,
  receiptContext,
  onClose,
}: {
  open: boolean;
  studentName: string;
  payments: FeeReceiptPayment[];
  receiptContext: FeeReceiptContext;
  onClose: () => void;
}) {
  const ctx: FeeReceiptContext = { ...receiptContext, studentLabel: studentName };

  return (
    <FeeDialog open={open} title={`Receipts · ${studentName}`} onClose={onClose}>
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No receipts for this student yet.</p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {payments.map((p) => {
            const payload = toFeeReceiptPayload(p, ctx);
            return (
              <li
                key={p.receiptNumber}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
              >
                <p className="min-w-0">
                  <span className="font-medium">{p.receiptNumber}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {formatPaise(p.amountPaise)} · {p.method}
                    {p.reference ? ` · ${p.reference}` : ""} · {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </p>
                <span className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => openFeeReceiptPrint(payload)}
                  >
                    Print
                  </button>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => downloadFeeReceipt(payload)}
                  >
                    Download
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </FeeDialog>
  );
}
