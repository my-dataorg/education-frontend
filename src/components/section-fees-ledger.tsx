"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel } from "@/components/institute-tabs/module-tab-ui";
import {
  SectionFeesStudentTable,
  type SectionFeesStudentRow,
  type StudentFeeLine,
} from "@/components/section-fees-student-table";
import { StudentFeeReceiptsDialog } from "@/components/student-fee-receipts-dialog";
import { StudentFeesPanel } from "@/components/student-fees-panel";
import { formatUserName } from "@/components/user-identity";
import type { FeeReceiptContext } from "@/lib/fee-receipt-context";
import { FEE_FAMILY_PAY_ROLES } from "@/lib/roles";
import type { Member } from "@/lib/api";

type LedgerStudent = {
  studentId: string;
  balancePaise: number;
  paidPaise: number;
  billedPaise: number;
  status: string;
  feePlanName?: string | null;
  nextDueDate?: string | null;
  nextDueAmountPaise?: number | null;
  receiptCount: number;
  pendingProofCount: number;
  fees: StudentFeeLine[];
  payments: {
    id: string;
    receiptNumber: string;
    amountPaise: number;
    method: string;
    reference?: string;
    recordedBy?: string;
    createdAt: string;
  }[];
};

type Submission = {
  id: string;
  studentId: string;
  amountPaise: number;
  method: string;
  proofNotes: string;
};

async function readApiError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.detail === "string") return body.detail;
    if (body && typeof body.error === "string") return body.error;
  } catch {
    /* ignore */
  }
  return res.status === 401 ? "Please sign in again." : `Request failed (${res.status})`;
}

export function SectionFeesLedger({
  instituteId,
  instituteName,
  sectionLabel,
  sectionId,
  rosterStudents = [],
  rosterStaff = [],
  viewerRole = "",
  canRecordPayments = false,
  currentUserName,
}: {
  instituteId: string;
  instituteName: string;
  sectionLabel?: string;
  sectionId: string;
  rosterStudents?: Member[];
  rosterStaff?: Member[];
  viewerRole?: string;
  canRecordPayments?: boolean;
  /** Shown on receipts as “Recorded by” when recorder is the current user (no SessionProvider required). */
  currentUserName?: string;
}) {
  const [students, setStudents] = useState<LedgerStudent[]>([]);
  const [pending, setPending] = useState<Submission[]>([]);
  const [error, setError] = useState("");
  const [detailStudent, setDetailStudent] = useState<Member | null>(null);
  const [receiptsStudentId, setReceiptsStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const canFamilyPay = FEE_FAMILY_PAY_ROLES.has(viewerRole);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of [...rosterStudents, ...rosterStaff]) m.set(s.userId, formatUserName(s));
    return m;
  }, [rosterStudents, rosterStaff]);

  const receiptContext = useMemo<FeeReceiptContext>(
    () => ({
      instituteName,
      sectionLabel,
      studentLabel: "",
      userNameForId: (userId) => nameById.get(userId),
      fallbackRecorderName: currentUserName,
    }),
    [instituteName, sectionLabel, nameById, currentUserName]
  );

  const memberById = useMemo(() => {
    const m = new Map<string, Member>();
    for (const s of rosterStudents) m.set(s.userId, s);
    return m;
  }, [rosterStudents]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ledgerRes, subRes] = await Promise.all([
        fetch(`/api/institutes/${instituteId}/sections/${sectionId}/fees/ledger`, { credentials: "include" }),
        fetch(`/api/institutes/${instituteId}/sections/${sectionId}/fee-payment-submissions?status=pending`, {
          credentials: "include",
        }),
      ]);
      if (!ledgerRes.ok) {
        throw new Error(await readApiError(ledgerRes));
      }
      const ledger = await ledgerRes.json();
      setStudents(ledger.students ?? []);
      if (subRes.ok) setPending(await subRes.json());
      else setPending([]);
    } catch (e) {
      setStudents([]);
      setError(e instanceof Error ? e.message : "Could not load student fees");
    } finally {
      setLoading(false);
    }
  }, [instituteId, sectionId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function reviewSubmission(id: string, approve: boolean) {
    const res = await fetch(`/api/institutes/${instituteId}/fee-payment-submissions/${id}/review`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approve }),
    });
    if (!res.ok) setError(approve ? "Could not approve proof" : "Could not reject proof");
    else await load();
  }

  const tableRows: SectionFeesStudentRow[] = students.map((row) => ({
    studentId: row.studentId,
    studentName: nameById.get(row.studentId) ?? row.studentId.slice(0, 8),
    balancePaise: row.balancePaise,
    paidPaise: row.paidPaise,
    feePlanName: row.feePlanName,
    nextDueDate: row.nextDueDate,
    nextDueAmountPaise: row.nextDueAmountPaise,
    receiptCount: row.receiptCount,
    pendingProofCount: row.pendingProofCount,
    fees: row.fees ?? [],
    payments: row.payments ?? [],
  }));

  const dueCount = students.filter((s) => s.balancePaise > 0).length;

  if (loading && students.length === 0 && !error) {
    return <p className="text-sm text-muted-foreground">Loading student fees…</p>;
  }

  if (error && students.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted/50"
        >
          Try again
        </button>
        <p className="text-xs text-muted-foreground">
          If this continues after a payment error, restart education-backend (port 8010).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-amber-800">{error}</p>
      )}
      <Panel title="Class summary">
        <p className="text-sm text-muted-foreground">
          {students.length} student{students.length === 1 ? "" : "s"}
          {dueCount > 0 ? ` · ${dueCount} with balance due` : " · no outstanding balances"}
          {pending.length > 0 ? ` · ${pending.length} payment proof(s) awaiting approval` : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Click a student row for fee details, pay, or edit.</p>
      </Panel>

      {pending.length > 0 && canRecordPayments && (
        <Panel title="Pending payment proofs">
          <ul className="space-y-2 text-sm">
            {pending.map((sub) => (
              <li key={sub.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2">
                <span>
                  {nameById.get(sub.studentId) ?? sub.studentId} · {sub.method}
                  {sub.proofNotes ? ` — ${sub.proofNotes}` : ""}
                </span>
                <span className="flex gap-2">
                  <button type="button" className="text-primary" onClick={() => void reviewSubmission(sub.id, true)}>
                    Approve
                  </button>
                  <button type="button" className="text-destructive" onClick={() => void reviewSubmission(sub.id, false)}>
                    Reject
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {students.length === 0 ? (
        <p className="text-sm text-muted-foreground">No students in this section.</p>
      ) : (
        <Panel title="Students">
          <SectionFeesStudentTable
            rows={tableRows}
            onSelect={(id) => setDetailStudent(memberById.get(id) ?? ({ userId: id } as Member))}
            onReceiptsClick={(id) => setReceiptsStudentId(id)}
          />
        </Panel>
      )}

      {receiptsStudentId && (
        <StudentFeeReceiptsDialog
          open
          studentName={nameById.get(receiptsStudentId) ?? receiptsStudentId.slice(0, 8)}
          payments={students.find((s) => s.studentId === receiptsStudentId)?.payments ?? []}
          receiptContext={receiptContext}
          onClose={() => setReceiptsStudentId(null)}
        />
      )}

      {detailStudent && (
        <StudentFeesPanel
          instituteId={instituteId}
          instituteName={instituteName}
          sectionLabel={sectionLabel}
          sectionId={sectionId}
          student={detailStudent}
          receiptContext={receiptContext}
          canRecordPayment={canRecordPayments}
          canEditFees={canRecordPayments}
          canPayOutstanding={canRecordPayments || canFamilyPay}
          onClose={() => {
            setDetailStudent(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
