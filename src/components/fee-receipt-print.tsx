"use client";

import { formatPaise } from "@/components/institute-tabs/module-tab-ui";
import { shortId } from "@/lib/roles";

export type FeeReceiptPayload = {
  receiptNumber: string;
  amountPaise: number;
  method: string;
  reference: string;
  createdAt: string;
  instituteName: string;
  studentLabel?: string;
  sectionLabel?: string;
  paymentId?: string;
  recordedBy?: string;
  recordedByName?: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function methodLabel(method: string): string {
  const m = method.toLowerCase();
  if (m === "upi") return "UPI";
  if (m === "bank") return "Bank transfer";
  if (m === "cash") return "Cash";
  return method;
}

function receiptHtml(payload: FeeReceiptPayload): string {
  const institute = escapeHtml(payload.instituteName || "Institute");
  const student = escapeHtml(payload.studentLabel ?? "—");
  const section = payload.sectionLabel ? escapeHtml(payload.sectionLabel) : "";
  const receiptNo = escapeHtml(payload.receiptNumber);
  const ref = escapeHtml(payload.reference || "—");
  const amount = escapeHtml(formatPaise(payload.amountPaise));
  const method = escapeHtml(methodLabel(payload.method));
  const when = escapeHtml(new Date(payload.createdAt).toLocaleString());
  const recorder = escapeHtml(
    payload.recordedByName ||
      (payload.recordedBy ? shortId(payload.recordedBy) : "—")
  );
  const paymentId = payload.paymentId ? escapeHtml(payload.paymentId) : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${receiptNo}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      margin: 0;
      padding: 32px 40px;
      color: #111;
      line-height: 1.45;
    }
    .institute {
      text-align: center;
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      margin: 0 0 4px;
    }
    .section {
      text-align: center;
      font-size: 0.85rem;
      color: #555;
      margin: 0 0 28px;
    }
    .title {
      font-size: 1.1rem;
      font-weight: 600;
      text-align: center;
      margin: 0 0 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #111;
    }
    dl {
      display: grid;
      grid-template-columns: 9.5rem 1fr;
      gap: 10px 16px;
      font-size: 14px;
      margin: 0 0 32px;
    }
    dt { color: #555; margin: 0; }
    dd { margin: 0; font-weight: 600; }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #ccc;
      font-size: 13px;
      color: #444;
    }
    .footer strong { color: #111; }
    @media print {
      body { padding: 24px; }
    }
  </style>
</head>
<body>
  <p class="institute">${institute}</p>
  ${section ? `<p class="section">${section}</p>` : ""}
  <h1 class="title">Fee payment receipt</h1>
  <dl>
    <dt>Student</dt><dd>${student}</dd>
    <dt>Receipt number</dt><dd>${receiptNo}</dd>
    ${paymentId ? `<dt>Payment ID</dt><dd>${paymentId}</dd>` : ""}
    <dt>Amount received</dt><dd>${amount}</dd>
    <dt>Payment method</dt><dd>${method}</dd>
    <dt>Reference / UTR</dt><dd>${ref}</dd>
    <dt>Date &amp; time</dt><dd>${when}</dd>
  </dl>
  <p class="footer">Recorded by: <strong>${recorder}</strong></p>
</body>
</html>`;
}

export function openFeeReceiptPrint(payload: FeeReceiptPayload) {
  const w = window.open("", "_blank", "width=520,height=720");
  if (!w) return;
  const html = receiptHtml(payload).replace("</body>", "<script>window.print();</script></body>");
  w.document.write(html);
  w.document.close();
}

export function downloadFeeReceipt(payload: FeeReceiptPayload) {
  const html = receiptHtml(payload);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${payload.receiptNumber.replace(/[^\w.-]+/g, "_")}.html`;
  link.click();
  URL.revokeObjectURL(url);
}
