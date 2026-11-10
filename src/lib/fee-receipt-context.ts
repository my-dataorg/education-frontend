import type { FeeReceiptPayload } from "@/components/fee-receipt-print";

export type FeeReceiptPayment = {
  id?: string;
  receiptNumber: string;
  amountPaise: number;
  method: string;
  reference?: string;
  createdAt: string;
  recordedBy?: string;
};

export type FeeReceiptContext = {
  instituteName: string;
  sectionLabel?: string;
  studentLabel: string;
  userNameForId?: (userId: string) => string | undefined;
  fallbackRecorderName?: string;
};

export function toFeeReceiptPayload(
  payment: FeeReceiptPayment,
  ctx: FeeReceiptContext
): FeeReceiptPayload {
  const recordedBy = payment.recordedBy;
  let recordedByName = ctx.fallbackRecorderName;
  if (recordedBy && ctx.userNameForId) {
    recordedByName = ctx.userNameForId(recordedBy) ?? recordedByName;
  }
  return {
    instituteName: ctx.instituteName,
    sectionLabel: ctx.sectionLabel,
    studentLabel: ctx.studentLabel,
    receiptNumber: payment.receiptNumber,
    amountPaise: payment.amountPaise,
    method: payment.method,
    reference: payment.reference ?? "",
    createdAt: payment.createdAt,
    paymentId: payment.id,
    recordedBy,
    recordedByName,
  };
}
