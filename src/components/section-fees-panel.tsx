"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable, formatPaise, Panel } from "@/components/institute-tabs/module-tab-ui";

type FeePlan = {
  id: string;
  name: string;
  installmentCount: number;
  discountPercent: number;
  lateFeePaise: number;
};

type Props = {
  instituteId: string;
  sectionId: string;
  canEdit: boolean;
};

export function SectionFeesPanel({ instituteId, sectionId, canEdit }: Props) {
  const [plans, setPlans] = useState<FeePlan[]>([]);
  const [amountPaise, setAmountPaise] = useState("1200000");
  const [feePlanId, setFeePlanId] = useState("");
  const [structureId, setStructureId] = useState("");
  const [structures, setStructures] = useState<{ id: string; name: string }[]>([]);
  const [planName, setPlanName] = useState("");
  const [installments, setInstallments] = useState("1");
  const [discount, setDiscount] = useState("0");
  const [lateFee, setLateFee] = useState("0");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [plansRes, defRes, structRes] = await Promise.all([
      fetch(`/api/institutes/${instituteId}/fee-plans`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/sections/${sectionId}/fee-default`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/fee-structures`, { credentials: "include" }),
    ]);
    if (plansRes.ok) setPlans(await plansRes.json());
    if (structRes.ok) {
      const rows = await structRes.json();
      setStructures(rows);
      if (rows[0] && !structureId) setStructureId(rows[0].id);
    }
    if (defRes.ok) {
      const body = await defRes.json();
      setAmountPaise(String(body.amountPaise || 0));
      setFeePlanId(body.feePlanId || "");
    }
  }, [instituteId, sectionId, structureId]);

  useEffect(() => {
    load().catch(() => setError("Could not load fee settings"));
  }, [load]);

  async function saveDefault() {
    const response = await fetch(`/api/institutes/${instituteId}/sections/${sectionId}/fee-default`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        amountPaise: Number(amountPaise),
        feePlanId: feePlanId || null,
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.detail || "Could not save");
      return;
    }
    setMessage("Class default fee saved");
    await load();
  }

  async function createPlan() {
    if (!planName.trim()) return;
    const response = await fetch(`/api/institutes/${instituteId}/fee-plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: planName.trim(),
        installmentCount: Number(installments) || 1,
        discountPercent: Number(discount) || 0,
        lateFeePaise: Number(lateFee) || 0,
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.detail || "Could not create plan");
      return;
    }
    setPlanName("");
    setMessage("Payment plan added");
    await load();
  }

  async function applyToStudents() {
    if (!structureId) {
      setError("Create a fee structure under Finance → Students first");
      return;
    }
    const response = await fetch(
      `/api/institutes/${instituteId}/sections/${sectionId}/fee-default/apply`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ feeStructureId: structureId }),
      }
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.detail || "Could not apply");
      return;
    }
    const body = await response.json();
    setMessage(`Applied to ${body.studentsUpdated} students`);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Set the default annual fee for this class and optional installment plan (discount and late fee apply when you assign
        students).
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      <Panel title="Default fee for this class">
        <div className="flex flex-wrap gap-2">
          <input
            type="number"
            value={amountPaise}
            onChange={(e) => setAmountPaise(e.target.value)}
            disabled={!canEdit}
            placeholder="Amount (paise)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <select
            value={feePlanId}
            onChange={(e) => setFeePlanId(e.target.value)}
            disabled={!canEdit}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">No plan</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.installmentCount}×, {p.discountPercent}% off)
              </option>
            ))}
          </select>
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => void saveDefault()}
                className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => void applyToStudents()}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium"
              >
                Apply to all students
              </button>
            </>
          )}
        </div>
      </Panel>

      {canEdit && (
        <Panel title="Payment plans (institute)">
          <div className="mb-3 flex flex-wrap gap-2">
            <input
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Plan name"
              className="rounded-lg border border-border px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={installments}
              onChange={(e) => setInstallments(e.target.value)}
              placeholder="Installments"
              className="w-24 rounded-lg border border-border px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="% discount"
              className="w-24 rounded-lg border border-border px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={lateFee}
              onChange={(e) => setLateFee(e.target.value)}
              placeholder="Late fee (paise)"
              className="w-32 rounded-lg border border-border px-3 py-2 text-sm"
            />
            <button type="button" onClick={() => void createPlan()} className="rounded-lg border px-3 py-2 text-xs">
              Add plan
            </button>
          </div>
          <DataTable
            headers={["Plan", "Installments", "Discount", "Late fee"]}
            rows={plans.map((p) => [
              p.name,
              String(p.installmentCount),
              `${p.discountPercent}%`,
              formatPaise(p.lateFeePaise),
            ])}
          />
        </Panel>
      )}
    </div>
  );
}
