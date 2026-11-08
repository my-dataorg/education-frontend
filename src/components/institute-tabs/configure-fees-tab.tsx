"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable, formatPaise, ModuleHeader, Panel } from "@/components/institute-tabs/module-tab-ui";

type FeePlan = {
  id: string;
  name: string;
  installmentCount: number;
  discountPercent: number;
  lateFeePaise: number;
};

type SectionRow = {
  sectionId: string;
  className: string;
  sectionName: string;
  amountPaise: number;
  feePlanId: string | null;
};

type FeeStructure = { id: string; name: string; amountPaise: number };

export function ConfigureFeesTab({ instituteId }: { instituteId: string }) {
  const [plans, setPlans] = useState<FeePlan[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [planName, setPlanName] = useState("");
  const [installments, setInstallments] = useState("1");
  const [discount, setDiscount] = useState("0");
  const [lateFee, setLateFee] = useState("0");
  const [structureName, setStructureName] = useState("Annual tuition");
  const [structureAmount, setStructureAmount] = useState("1200000");
  const [applyStructureId, setApplyStructureId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [plansRes, sectionsRes, structRes] = await Promise.all([
      fetch(`/api/institutes/${instituteId}/fee-plans`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/section-fee-defaults`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/fee-structures`, { credentials: "include" }),
    ]);
    if (!plansRes.ok || !sectionsRes.ok || !structRes.ok) throw new Error("Could not load fee setup");
    setPlans(await plansRes.json());
    setSections(await sectionsRes.json());
    const structs = await structRes.json();
    setStructures(structs);
    if (structs[0]) setApplyStructureId(structs[0].id);
  }, [instituteId]);

  useEffect(() => {
    load().catch(() => setError("Could not load fee configuration"));
  }, [load]);

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
      setError("Could not create plan");
      return;
    }
    setPlanName("");
    setMessage("Payment plan added");
    await load();
  }

  async function createStructure() {
    const response = await fetch(`/api/institutes/${instituteId}/fee-structures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: structureName.trim(), amountPaise: Number(structureAmount) }),
    });
    if (!response.ok) {
      setError("Could not create fee structure");
      return;
    }
    setMessage("Fee structure created");
    await load();
  }

  function patchSection(sectionId: string, patch: Partial<SectionRow>) {
    setSections((rows) => rows.map((r) => (r.sectionId === sectionId ? { ...r, ...patch } : r)));
  }

  async function saveSection(row: SectionRow) {
    const response = await fetch(`/api/institutes/${instituteId}/sections/${row.sectionId}/fee-default`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ amountPaise: row.amountPaise, feePlanId: row.feePlanId || null }),
    });
    if (!response.ok) {
      setError("Could not save class default");
      return;
    }
    setMessage(`Saved fee for ${row.className} · ${row.sectionName}`);
    await load();
  }

  async function applySection(sectionId: string) {
    if (!applyStructureId) {
      setError("Add a fee structure first");
      return;
    }
    const response = await fetch(`/api/institutes/${instituteId}/sections/${sectionId}/fee-default/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ feeStructureId: applyStructureId }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "Could not assign students");
      return;
    }
    const body = await response.json();
    setMessage(`Assigned fees to ${body.studentsUpdated} students`);
  }

  return (
    <section className="space-y-5">
      <ModuleHeader
        title="Fees & payment plans"
        description="Define fee heads, installment plans, and default amounts per class. Then assign students from each class row."
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      <Panel title="Fee structures (heads)">
        <div className="flex flex-wrap gap-2">
          <input
            value={structureName}
            onChange={(e) => setStructureName(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm"
            placeholder="Name"
          />
          <input
            type="number"
            value={structureAmount}
            onChange={(e) => setStructureAmount(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm"
            placeholder="Reference amount (paise)"
          />
          <button type="button" onClick={() => void createStructure()} className="rounded-lg border px-3 py-2 text-xs">
            Add structure
          </button>
        </div>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {structures.map((s) => (
            <li key={s.id}>
              {s.name} · {formatPaise(s.amountPaise)}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Payment plans">
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
            className="w-24 rounded-lg border px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="% discount"
            className="w-24 rounded-lg border px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={lateFee}
            onChange={(e) => setLateFee(e.target.value)}
            placeholder="Late fee (paise)"
            className="w-32 rounded-lg border px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => void createPlan()} className="rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground">
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

      <Panel title="Default fee per class">
        <p className="mb-3 text-xs text-muted-foreground">
          Assign structure for billing:{" "}
          <select
            value={applyStructureId}
            onChange={(e) => setApplyStructureId(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1"
          >
            {structures.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </p>
        <div className="space-y-3">
          {sections.map((row) => (
            <div
              key={row.sectionId}
              className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm"
            >
              <span className="min-w-[8rem] font-medium">
                {row.className} · {row.sectionName}
              </span>
              <input
                type="number"
                value={row.amountPaise}
                onChange={(e) => patchSection(row.sectionId, { amountPaise: Number(e.target.value) })}
                className="w-36 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                placeholder="Amount (paise)"
              />
              <select
                value={row.feePlanId ?? ""}
                onChange={(e) => patchSection(row.sectionId, { feePlanId: e.target.value || null })}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value="">No plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void saveSection(row)}
                className="rounded-lg border px-2 py-1.5 text-xs"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => void applySection(row.sectionId)}
                className="rounded-lg bg-primary px-2 py-1.5 text-xs text-primary-foreground"
              >
                Assign students
              </button>
            </div>
          ))}
          {!sections.length && <p className="text-sm text-muted-foreground">Add classes under Configure → Classes first.</p>}
        </div>
      </Panel>
    </section>
  );
}
