"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable, formatPaise, ModuleHeader, Panel } from "@/components/institute-tabs/module-tab-ui";
import { paiseToRupeesInput, rupeesInputToPaise } from "@/lib/fee-money";

type FeePlan = {
  id: string;
  name: string;
  installmentCount: number;
  discountPercent: number;
  lateFeePaise: number;
  dueScheduleNotes?: string;
};

type SectionRow = {
  sectionId: string;
  className: string;
  sectionName: string;
  amountPaise: number;
  feePlanId: string | null;
};

type FeeStructure = { id: string; name: string; amountPaise: number };

type SetupStep = "classes" | "plans" | "overrides" | "heads";

const STEPS: { id: SetupStep; label: string; hint: string }[] = [
  { id: "classes", label: "1. Class fees", hint: "One row per class — annual amount and payment plan" },
  { id: "plans", label: "2. Payment plans", hint: "Installments, due dates, late fine" },
  { id: "overrides", label: "3. Student overrides", hint: "Custom amount or plan for one student" },
  { id: "heads", label: "4. Fee heads", hint: "What you bill (e.g. tuition)" },
];

export function ConfigureFeesTab({ instituteId }: { instituteId: string }) {
  const [step, setStep] = useState<SetupStep>("classes");
  const [plans, setPlans] = useState<FeePlan[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [planName, setPlanName] = useState("");
  const [installments, setInstallments] = useState("1");
  const [discount, setDiscount] = useState("0");
  const [lateFeeRupees, setLateFeeRupees] = useState("");
  const [dueScheduleNotes, setDueScheduleNotes] = useState("");
  const [structureName, setStructureName] = useState("Annual tuition");
  const [structureRupees, setStructureRupees] = useState("12000");
  const [applyStructureId, setApplyStructureId] = useState("");
  const [overrideStudentId, setOverrideStudentId] = useState("");
  const [overrideStructureId, setOverrideStructureId] = useState("");
  const [overrideRupees, setOverrideRupees] = useState("");
  const [overridePlanId, setOverridePlanId] = useState("");
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
    if (structs[0]) {
      setApplyStructureId((prev) => prev || structs[0].id);
      setOverrideStructureId((prev) => prev || structs[0].id);
    }
  }, [instituteId]);

  useEffect(() => {
    load().catch(() => setError("Could not load fee configuration"));
  }, [load]);

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  async function createPlan() {
    clearFeedback();
    if (!planName.trim()) return;
    const response = await fetch(`/api/institutes/${instituteId}/fee-plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: planName.trim(),
        installmentCount: Number(installments) || 1,
        discountPercent: Number(discount) || 0,
        lateFeePaise: rupeesInputToPaise(lateFeeRupees),
        dueScheduleNotes: dueScheduleNotes.trim(),
      }),
    });
    if (!response.ok) {
      setError("Could not create plan");
      return;
    }
    setPlanName("");
    setDueScheduleNotes("");
    setMessage("Payment plan saved — assign it to classes in step 1.");
    await load();
  }

  async function createStructure() {
    clearFeedback();
    const response = await fetch(`/api/institutes/${instituteId}/fee-structures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: structureName.trim(),
        amountPaise: rupeesInputToPaise(structureRupees),
      }),
    });
    if (!response.ok) {
      setError("Could not create fee head");
      return;
    }
    setMessage("Fee head added");
    await load();
  }

  function patchSection(sectionId: string, patch: Partial<SectionRow>) {
    setSections((rows) => rows.map((r) => (r.sectionId === sectionId ? { ...r, ...patch } : r)));
  }

  async function saveSection(row: SectionRow) {
    clearFeedback();
    const response = await fetch(`/api/institutes/${instituteId}/sections/${row.sectionId}/fee-default`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ amountPaise: row.amountPaise, feePlanId: row.feePlanId || null }),
    });
    if (!response.ok) {
      setError("Could not save class fee");
      return;
    }
    setMessage(`Saved ${row.className} · ${row.sectionName}`);
    await load();
  }

  async function applySection(sectionId: string) {
    clearFeedback();
    if (!applyStructureId) {
      setError("Add a fee head in step 4 first");
      setStep("heads");
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
      setError(typeof body.detail === "string" ? body.detail : "Could not bill students in this class");
      return;
    }
    const body = await response.json();
    setMessage(`Updated fee accounts for ${body.studentsUpdated} students. View balances under Classes → Fees.`);
  }

  async function saveStudentOverride() {
    clearFeedback();
    if (!overrideStudentId.trim() || !overrideStructureId) {
      setError("Student ID and fee head are required");
      return;
    }
    const amountPaise = overrideRupees.trim() ? rupeesInputToPaise(overrideRupees) : null;
    const response = await fetch(`/api/institutes/${instituteId}/student-fees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        studentId: overrideStudentId.trim(),
        feeStructureId: overrideStructureId,
        amountPaise,
        feePlanId: overridePlanId || null,
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "Could not save override");
      return;
    }
    setMessage("Student fee override saved");
    setOverrideStudentId("");
    setOverrideRupees("");
  }

  const activeHint = STEPS.find((s) => s.id === step)?.hint ?? "";

  return (
    <section className="space-y-5">
      <ModuleHeader
        title="Fees & plans"
        description="Set class fees first, then payment plans and optional per-student exceptions. Day-to-day collections stay under Classes → Fees."
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              step === s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>
      <p className="text-xs text-muted-foreground">{activeHint}</p>

      {step === "classes" && (
        <Panel title="Fee per class">
          <p className="mb-3 text-sm text-muted-foreground">
            Reference fee head when you bill the class roster:{" "}
            <select
              value={applyStructureId}
              onChange={(e) => setApplyStructureId(e.target.value)}
              className="rounded border border-border bg-background px-2 py-1 text-sm"
            >
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {!structures.length && (
              <span className="ml-2 text-amber-700">Add a fee head in step 4 before assigning students.</span>
            )}
          </p>
          {!sections.length ? (
            <p className="text-sm text-muted-foreground">Add classes under Configure → Classes first.</p>
          ) : (
            <div className="space-y-4">
              <DataTable
                headers={["Class", "Annual fee (₹)", "Payment plan", ""]}
                rows={sections.map((row) => [
                  `${row.className} · ${row.sectionName}`,
                  <input
                    key={`amt-${row.sectionId}`}
                    type="text"
                    inputMode="decimal"
                    value={paiseToRupeesInput(row.amountPaise)}
                    onChange={(e) =>
                      patchSection(row.sectionId, { amountPaise: rupeesInputToPaise(e.target.value) })
                    }
                    className="w-28 rounded-lg border border-border bg-background px-2 py-1 text-sm"
                    placeholder="0"
                  />,
                  <select
                    key={`plan-${row.sectionId}`}
                    value={row.feePlanId ?? ""}
                    onChange={(e) => patchSection(row.sectionId, { feePlanId: e.target.value || null })}
                    className="max-w-[12rem] rounded-lg border border-border bg-background px-2 py-1 text-sm"
                  >
                    <option value="">Pay in full</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>,
                  <span key={`act-${row.sectionId}`} className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void saveSection(row)} className="rounded-lg border px-2 py-1 text-xs">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => void applySection(row.sectionId)}
                      className="rounded-lg bg-primary px-2 py-1 text-xs text-primary-foreground"
                    >
                      Bill class
                    </button>
                  </span>,
                ])}
              />
            </div>
          )}
        </Panel>
      )}

      {step === "plans" && (
        <Panel title="Payment plans">
          <p className="mb-3 text-sm text-muted-foreground">
            Plans describe how families pay: number of installments, when each is due, discounts, and late payment fine.
          </p>
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <input
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Plan name (e.g. Quarterly)"
              className="rounded-lg border border-border px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={1}
              max={24}
              value={installments}
              onChange={(e) => setInstallments(e.target.value)}
              placeholder="Installments"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="Discount %"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <input
              type="text"
              inputMode="decimal"
              value={lateFeeRupees}
              onChange={(e) => setLateFeeRupees(e.target.value)}
              placeholder="Late fee fine (₹)"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <input
              value={dueScheduleNotes}
              onChange={(e) => setDueScheduleNotes(e.target.value)}
              placeholder="When to pay (e.g. 1 Apr, 1 Jul, 1 Oct)"
              className="sm:col-span-2 rounded-lg border px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void createPlan()}
              className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
            >
              Add plan
            </button>
          </div>
          <DataTable
            headers={["Plan", "Installments", "Discount", "Late fine", "Due dates"]}
            rows={plans.map((p) => [
              p.name,
              String(p.installmentCount),
              p.discountPercent ? `${p.discountPercent}%` : "—",
              p.lateFeePaise ? `₹${paiseToRupeesInput(p.lateFeePaise)}` : "—",
              p.dueScheduleNotes?.trim() || "—",
            ])}
          />
        </Panel>
      )}

      {step === "overrides" && (
        <Panel title="Override for one student">
          <p className="mb-3 text-sm text-muted-foreground">
            Use when a student&apos;s fee differs from their class default — scholarship, sibling discount, or a different
            plan. Leave amount blank to use the fee head&apos;s default.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Student user ID
              <input
                value={overrideStudentId}
                onChange={(e) => setOverrideStudentId(e.target.value)}
                className="min-w-[14rem] rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                placeholder="Platform user id"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Fee head
              <select
                value={overrideStructureId}
                onChange={(e) => setOverrideStructureId(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Custom annual fee (₹)
              <input
                type="text"
                inputMode="decimal"
                value={overrideRupees}
                onChange={(e) => setOverrideRupees(e.target.value)}
                className="w-32 rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Payment plan
              <select
                value={overridePlanId}
                onChange={(e) => setOverridePlanId(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Class default</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void saveStudentOverride()}
              className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
            >
              Save override
            </button>
          </div>
        </Panel>
      )}

      {step === "heads" && (
        <Panel title="Fee heads">
          <p className="mb-3 text-sm text-muted-foreground">
            Each head is a line item you bill (usually one &quot;Annual tuition&quot; per institute). Class amounts in step 1 can
            differ; the head is used when you bill the class.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              value={structureName}
              onChange={(e) => setStructureName(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="Name"
            />
            <input
              type="text"
              inputMode="decimal"
              value={structureRupees}
              onChange={(e) => setStructureRupees(e.target.value)}
              className="w-36 rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="Reference ₹"
            />
            <button type="button" onClick={() => void createStructure()} className="rounded-lg border px-3 py-2 text-sm">
              Add fee head
            </button>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {structures.map((s) => (
              <li key={s.id}>
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground"> · reference {formatPaise(s.amountPaise)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </section>
  );
}
