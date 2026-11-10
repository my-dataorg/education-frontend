"use client";

import { formatPaise } from "@/components/institute-tabs/module-tab-ui";

export type StudentFeeLine = {
  feeStructureId: string;
  feeStructureName?: string | null;
  amountPaise: number;
  paidPaise: number;
  balancePaise: number;
  feePlanName?: string | null;
};

export type SectionFeesStudentRow = {
  studentId: string;
  studentName: string;
  balancePaise: number;
  paidPaise: number;
  feePlanName?: string | null;
  nextDueDate?: string | null;
  nextDueAmountPaise?: number | null;
  receiptCount: number;
  pendingProofCount: number;
  fees: StudentFeeLine[];
  payments: {
    receiptNumber: string;
    amountPaise: number;
    method: string;
    reference?: string;
    createdAt: string;
  }[];
};

export function SectionFeesStudentTable({
  rows,
  onSelect,
  onReceiptsClick,
}: {
  rows: SectionFeesStudentRow[];
  onSelect: (studentId: string) => void;
  onReceiptsClick?: (studentId: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/50 uppercase tracking-wide text-muted-foreground">
          <tr>
            {["Student", "Plan", "Balance", "Next due", "Paid", "Receipts"].map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const nextDue =
              row.nextDueDate && row.nextDueAmountPaise != null
                ? `${formatPaise(row.nextDueAmountPaise)} · ${row.nextDueDate}`
                : row.nextDueDate ?? "—";
            const receiptLabel =
              row.pendingProofCount > 0
                ? `${row.receiptCount} · proof pending`
                : String(row.receiptCount);
            const hasReceipts = row.receiptCount > 0;
            return (
              <tr
                key={row.studentId}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(row.studentId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(row.studentId);
                  }
                }}
                className="cursor-pointer border-t border-border hover:bg-muted/40 focus:bg-muted/40 focus:outline-none"
              >
                <td className="px-3 py-2.5 font-medium">{row.studentName}</td>
                <td className="px-3 py-2.5">{row.feePlanName ?? "—"}</td>
                <td className="px-3 py-2.5 font-medium">{formatPaise(row.balancePaise)}</td>
                <td className="px-3 py-2.5">{nextDue}</td>
                <td className="px-3 py-2.5">{formatPaise(row.paidPaise)}</td>
                <td
                  className={`px-3 py-2.5 ${row.pendingProofCount > 0 ? "text-amber-800" : ""} ${
                    hasReceipts ? "text-primary" : ""
                  }`}
                >
                  {hasReceipts ? (
                    <button
                      type="button"
                      className="font-medium underline-offset-2 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReceiptsClick?.(row.studentId);
                      }}
                    >
                      {receiptLabel}
                    </button>
                  ) : (
                    receiptLabel
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
