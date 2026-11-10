"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable, LabeledInput, ModuleHeader } from "@/components/institute-tabs/module-tab-ui";
import { CollapsiblePanel } from "@/components/configure-shared/collapsible-panel";
import { FeeDialog } from "@/components/configure-fees/fee-dialog";
import { OrgFeeAssignmentPanel } from "@/components/configure-fees/org-fee-assignment-panel";
import { FeeTypesPanel } from "@/components/configure-fees/fee-types-panel";

type FeePlan = {
  id: string;
  name: string;
  planType?: string;
  discountPercent: number;
  installmentCount: number;
  appliesToLabel?: string;
};

type FeeStructure = { id: string; name: string; amountPaise: number; orgNodeId?: string | null };

const PLAN_TYPES = [
  { id: "lump_sum", label: "Lump sum" },
  { id: "installment", label: "Installments" },
  { id: "sibling", label: "Sibling discount" },
  { id: "early_bird", label: "Early bird" },
] as const;

async function apiErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => ({}));
  if (typeof body.detail === "string") return body.detail;
  return fallback;
}

export function FeesCatalog({ instituteId }: { instituteId: string }) {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [plans, setPlans] = useState<FeePlan[]>([]);
  const [showPlan, setShowPlan] = useState(false);
  const [planName, setPlanName] = useState("");
  const [planType, setPlanType] = useState<(typeof PLAN_TYPES)[number]["id"]>("installment");
  const [discount, setDiscount] = useState("0");
  const [installments, setInstallments] = useState("3");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [sRes, pRes] = await Promise.all([
      fetch(`/api/institutes/${instituteId}/fee-structures`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/fee-plans`, { credentials: "include" }),
    ]);
    if (!sRes.ok || !pRes.ok) throw new Error("load");
    setStructures(await sRes.json());
    setPlans(await pRes.json());
  }, [instituteId]);

  useEffect(() => {
    load().catch(() => setError("Could not load fee catalog"));
  }, [load]);

  async function createPlan() {
    const res = await fetch(`/api/institutes/${instituteId}/fee-plans`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: planName.trim(),
        installmentCount: Number(installments) || 1,
        discountPercent: Number(discount) || 0,
        lateFeePaise: 0,
        planType,
        rules: planType === "sibling" ? { secondChildPercent: 10, thirdPlusPercent: 15 } : {},
        installments: [],
      }),
    });
    if (!res.ok) {
      setError(await apiErrorMessage(res, "Could not create plan"));
      return;
    }
    setShowPlan(false);
    await load();
  }

  return (
    <section className="space-y-6">
      <ModuleHeader
        title="Fees & plans"
        description="Assign fees by org level on the left. Define payment plans and fee type names on the right."
      />
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1.4fr)_minmax(16rem,1fr)] xl:items-start xl:gap-6">
        <OrgFeeAssignmentPanel
          instituteId={instituteId}
          plans={plans}
          structures={structures}
          onStructuresChange={() => void load()}
        />

        <div className="flex flex-col gap-4">
          <CollapsiblePanel title="Discount & payment plans" defaultOpen={false}>
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPlan(true)}
                className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
              >
                + New plan
              </button>
            </div>
            {plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment plans yet.</p>
            ) : (
              <DataTable
                headers={["Name", "Type", "Discount", "Inst."]}
                rows={plans.map((p) => [
                  p.name,
                  p.planType ?? "lump_sum",
                  `${p.discountPercent}%`,
                  String(p.installmentCount),
                ])}
              />
            )}
          </CollapsiblePanel>

          <FeeTypesPanel instituteId={instituteId} types={structures} onChanged={() => void load()} />
        </div>
      </div>

      <FeeDialog open={showPlan} title="New payment plan" onClose={() => setShowPlan(false)}>
        <div className="space-y-3">
          <LabeledInput label="Plan name" value={planName} onChange={setPlanName} />
          <label className="text-xs font-semibold text-muted-foreground">Plan type</label>
          <select
            value={planType}
            onChange={(e) => setPlanType(e.target.value as (typeof PLAN_TYPES)[number]["id"])}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            {PLAN_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <LabeledInput label="Discount %" value={discount} onChange={setDiscount} />
          <LabeledInput label="Installment count" value={installments} onChange={setInstallments} />
          <button
            type="button"
            onClick={() => void createPlan()}
            className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
          >
            Save plan
          </button>
        </div>
      </FeeDialog>
    </section>
  );
}
