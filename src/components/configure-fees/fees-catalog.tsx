"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable, formatPaise, LabeledInput, ModuleHeader, Panel } from "@/components/institute-tabs/module-tab-ui";
import { paiseToRupeesInput, rupeesInputToPaise } from "@/lib/fee-money";
import { FeeDialog } from "@/components/configure-fees/fee-dialog";
import { OrgFeePanel, type OrgNode } from "@/components/configure-fees/org-panel";

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
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [showStruct, setShowStruct] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [structName, setStructName] = useState("");
  const [structRupees, setStructRupees] = useState("12000");
  const [planName, setPlanName] = useState("");
  const [planType, setPlanType] = useState<(typeof PLAN_TYPES)[number]["id"]>("installment");
  const [discount, setDiscount] = useState("0");
  const [installments, setInstallments] = useState("3");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [sRes, pRes, nRes] = await Promise.all([
      fetch(`/api/institutes/${instituteId}/fee-structures`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/fee-plans`, { credentials: "include" }),
      fetch(`/api/institutes/${instituteId}/org-nodes`, { credentials: "include" }),
    ]);
    if (!sRes.ok || !pRes.ok || !nRes.ok) throw new Error("load");
    setStructures(await sRes.json());
    setPlans(await pRes.json());
    setNodes(await nRes.json());
  }, [instituteId]);

  useEffect(() => {
    load().catch(() => setError("Could not load fee catalog"));
  }, [load]);

  async function createStructure() {
    const res = await fetch(`/api/institutes/${instituteId}/fee-structures`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: structName.trim(), amountPaise: rupeesInputToPaise(structRupees) }),
    });
    if (!res.ok) {
      setError(await apiErrorMessage(res, "Could not create structure"));
      return;
    }
    setShowStruct(false);
    await load();
  }

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

  const nodeLabel = (id: string | null | undefined) => nodes.find((n) => n.id === id)?.label ?? "All";

  return (
    <section className="space-y-6">
      <ModuleHeader
        title="Fees & plans"
        description="Catalog of fee heads and discount plans. Assign amounts on the organization tree below."
      />
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Fee structures">
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => setShowStruct(true)}
              className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
            >
              + New structure
            </button>
          </div>
          {structures.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fee structures yet.</p>
          ) : (
            <DataTable
              headers={["Name", "Reference", "Scope"]}
              rows={structures.map((s) => [s.name, formatPaise(s.amountPaise), nodeLabel(s.orgNodeId)])}
            />
          )}
        </Panel>

        <Panel title="Discount & payment plans">
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
              headers={["Name", "Type", "Discount", "Installments", "Applies"]}
              rows={plans.map((p) => [
                p.name,
                p.planType ?? "lump_sum",
                `${p.discountPercent}%`,
                String(p.installmentCount),
                p.appliesToLabel ?? "All classes",
              ])}
            />
          )}
        </Panel>
      </div>

      <OrgFeePanel instituteId={instituteId} nodes={nodes} plans={plans} structures={structures} onSaved={() => void load()} />

      <details className="rounded-lg border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">Advanced — legacy ladder (read-only)</summary>
        <p className="mt-2 text-sm text-muted-foreground">
          Institute / class / section defaults from the previous setup still work until you fully move to org nodes.
          Bill class and record payments unchanged.
        </p>
      </details>

      <FeeDialog open={showStruct} title="New fee structure" onClose={() => setShowStruct(false)}>
        <div className="space-y-3">
          <LabeledInput label="Name" value={structName} onChange={setStructName} />
          <LabeledInput label="Reference ₹" value={structRupees} onChange={setStructRupees} />
          <button type="button" onClick={() => void createStructure()} className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
            Save structure
          </button>
        </div>
      </FeeDialog>

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
          <button type="button" onClick={() => void createPlan()} className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
            Save plan
          </button>
        </div>
      </FeeDialog>
    </section>
  );
}
