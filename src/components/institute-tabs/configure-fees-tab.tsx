"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable, formatPaise, LabeledInput, ModuleHeader, Panel } from "@/components/institute-tabs/module-tab-ui";
import { paiseToRupeesInput, rupeesInputToPaise } from "@/lib/fee-money";

type FeePlan = {
  id: string;
  name: string;
  installmentCount: number;
  discountPercent: number;
  lateFeePaise: number;
  dueScheduleNotes?: string;
  sectionId?: string | null;
  appliesToLabel?: string;
};

function plansForSection(plans: FeePlan[], sectionId: string): FeePlan[] {
  return plans.filter((p) => !p.sectionId || p.sectionId === sectionId);
}

type SectionRow = {
  sectionId: string;
  className: string;
  sectionName: string;
  amountPaise: number;
  feePlanId: string | null;
  feeStructureId?: string | null;
};

type FeeStructure = { id: string; name: string; amountPaise: number };

type SetupStep = "classes" | "plans" | "overrides" | "heads";

async function apiErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => ({}));
  if (typeof body.detail === "string") return body.detail;
  if (Array.isArray(body.detail)) {
    return body.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join("; ") || fallback;
  }
  return fallback;
}

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
  const [planScope, setPlanScope] = useState<"all" | "section">("all");
  const [planSectionId, setPlanSectionId] = useState("");
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
    const sectionRows: SectionRow[] = await sectionsRes.json();
    setSections(sectionRows);
    const structs: FeeStructure[] = await structRes.json();
    setStructures(structs);
    const fromSection = sectionRows.find((r) => r.feeStructureId)?.feeStructureId;
    const headId = fromSection || structs[0]?.id || "";
    if (headId) {
      setApplyStructureId((prev) => prev || headId);
      setOverrideStructureId((prev) => prev || headId);
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
        sectionId: planScope === "section" && planSectionId ? planSectionId : null,
      }),
    });
    if (!response.ok) {
      setError(await apiErrorMessage(response, "Could not create plan"));
      return;
    }
    setPlanName("");
    setDueScheduleNotes("");
    setPlanScope("all");
    setPlanSectionId("");
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
      body: JSON.stringify({
        amountPaise: row.amountPaise,
        feePlanId: row.feePlanId || null,
        feeStructureId: applyStructureId || null,
      }),
    });
    if (!response.ok) {
      setError(await apiErrorMessage(response, "Could not save class fee"));
      return;
    }
    setMessage(`Saved ${row.className} · ${row.sectionName}`);
    await load();
  }

  async function applySection(sectionId: string) {
    clearFeedback();
    const row = sections.find((s) => s.sectionId === sectionId);
    if (!row?.amountPaise) {
      setError("Enter the annual fee and click Save before billing the class.");
      return;
    }
    const response = await fetch(`/api/institutes/${instituteId}/sections/${sectionId}/fee-default/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ feeStructureId: applyStructureId || null }),
    });
    if (!response.ok) {
      setError(await apiErrorMessage(response, "Could not bill students in this class"));
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
            Choose the fee head used when you bill the class roster. If none exist yet, we create Annual tuition
            automatically; add more heads in step 4 if needed.
          </p>
          <label className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Bill students under</span>
            <select
              value={applyStructureId}
              onChange={(e) => setApplyStructureId(e.target.value)}
              className="rounded border border-border bg-background px-2 py-1 text-sm"
              disabled={!structures.length}
            >
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
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
                    {plansForSection(plans, row.sectionId).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.appliesToLabel && p.appliesToLabel !== "All classes" ? ` (${p.appliesToLabel})` : ""}
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
          <p className="mb-4 text-sm text-muted-foreground">
            Define how payment is split over the year. Generic plans can be assigned to any class in step 1; class-only
            plans appear only for that class.
          </p>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <LabeledInput
              label="Plan name"
              hint="Short label families will see, e.g. Quarterly or 3 installments"
              value={planName}
              onChange={setPlanName}
            />
            <label className="block text-xs font-medium text-foreground">
              Applies to
              <span className="mt-0.5 block font-normal text-muted-foreground">
                Generic = reusable in step 1 for any class; one class = only that section
              </span>
              <select
                value={planScope}
                onChange={(e) => setPlanScope(e.target.value as "all" | "section")}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              >
                <option value="all">All classes (generic)</option>
                <option value="section">One class only</option>
              </select>
            </label>
            {planScope === "section" && (
              <label className="block text-xs font-medium text-foreground">
                Class
                <select
                  value={planSectionId}
                  onChange={(e) => setPlanSectionId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                >
                  <option value="">Select class…</option>
                  {sections.map((s) => (
                    <option key={s.sectionId} value={s.sectionId}>
                      {s.className} · {s.sectionName}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <LabeledInput
              label="Number of installments"
              hint="How many payments in the year (1 = pay in full)"
              type="number"
              min={1}
              max={24}
              value={installments}
              onChange={setInstallments}
            />
            <LabeledInput
              label="Discount on total fee (%)"
              hint="Optional reduction when this plan is used; 0 if none"
              type="number"
              min={0}
              max={100}
              value={discount}
              onChange={setDiscount}
            />
            <LabeledInput
              label="Late fee fine (₹)"
              hint="Extra charge if an installment is paid after the due date"
              inputMode="decimal"
              value={lateFeeRupees}
              onChange={setLateFeeRupees}
            />
            <LabeledInput
              label="Installment due dates"
              hint="When each installment is due, e.g. 1 Apr, 1 Jul, 1 Oct"
              value={dueScheduleNotes}
              onChange={setDueScheduleNotes}
            />
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  if (planScope === "section" && !planSectionId) {
                    setError("Select which class this plan is for.");
                    return;
                  }
                  void createPlan();
                }}
                className="w-full rounded-lg bg-primary px-3 py-2.5 text-sm text-primary-foreground"
              >
                Add plan
              </button>
            </div>
          </div>
          <DataTable
            headers={["Plan", "Applies to", "Installments", "Discount", "Late fine", "Due dates"]}
            rows={plans.map((p) => [
              p.name,
              p.appliesToLabel || "All classes",
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
