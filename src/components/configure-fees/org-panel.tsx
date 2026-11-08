"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPaise, LabeledInput, Panel } from "@/components/institute-tabs/module-tab-ui";
import { paiseToRupeesInput, rupeesInputToPaise } from "@/lib/fee-money";

export type OrgNode = {
  id: string;
  parentId: string | null;
  level: number;
  label: string;
  sectionId?: string | null;
};

type FeePlan = { id: string; name: string };
type FeeStructure = { id: string; name: string; amountPaise: number };

function childrenOf(nodes: OrgNode[], parentId: string | null) {
  return nodes.filter((n) => n.parentId === parentId).sort((a, b) => a.level - b.level || a.label.localeCompare(b.label));
}

function TreeRow({
  node,
  nodes,
  depth,
  selectedId,
  onSelect,
}: {
  node: OrgNode;
  nodes: OrgNode[];
  depth: number;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const kids = childrenOf(nodes, node.id);
  return (
    <>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={`block w-full rounded px-2 py-1 text-left text-sm ${
          selectedId === node.id ? "bg-primary/15 font-medium" : "hover:bg-muted/50"
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {node.label}
        <span className="ml-1 text-xs text-muted-foreground">L{node.level}</span>
      </button>
      {kids.map((k) => (
        <TreeRow key={k.id} node={k} nodes={nodes} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </>
  );
}

export function OrgFeePanel({
  instituteId,
  nodes,
  plans,
  structures,
  onSaved,
}: {
  instituteId: string;
  nodes: OrgNode[];
  plans: FeePlan[];
  structures: FeeStructure[];
  onSaved: () => void;
}) {
  const root = useMemo(() => nodes.find((n) => n.parentId == null) ?? nodes[0], [nodes]);
  const [selectedId, setSelectedId] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [planId, setPlanId] = useState("");
  const [structureId, setStructureId] = useState("");
  const [enabledDepth, setEnabledDepth] = useState(3);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (root && !selectedId) setSelectedId(root.id);
  }, [root, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/institutes/${instituteId}/org-nodes/${selectedId}/fee-default`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setAmountRupees(data.amountPaise ? paiseToRupeesInput(data.amountPaise) : "");
        setPlanId(data.feePlanId ?? "");
        setStructureId(data.feeStructureId ?? structures[0]?.id ?? "");
      })
      .catch(() => undefined);
  }, [instituteId, selectedId, structures]);

  useEffect(() => {
    fetch(`/api/institutes/${instituteId}/org-config`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setEnabledDepth(data.enabledDepth ?? 3);
      })
      .catch(() => undefined);
  }, [instituteId]);

  async function saveNodeDefault() {
    if (!selectedId) return;
    const res = await fetch(`/api/institutes/${instituteId}/org-nodes/${selectedId}/fee-default`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountPaise: rupeesInputToPaise(amountRupees),
        feePlanId: planId || null,
        feeStructureId: structureId || null,
      }),
    });
    if (!res.ok) {
      setMessage("Could not save node fee");
      return;
    }
    setMessage("Saved fee for this org node.");
    onSaved();
  }

  async function saveDepth() {
    const res = await fetch(`/api/institutes/${instituteId}/org-config`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabledDepth, levelLabels: [] }),
    });
    if (!res.ok) {
      setMessage("Could not save org settings");
      return;
    }
    setMessage("Organization depth updated.");
  }

  if (!nodes.length) {
    return (
      <Panel title="Organization">
        <p className="text-sm text-muted-foreground">Syncing org tree from your classes… reload if empty.</p>
      </Panel>
    );
  }

  return (
    <Panel title="Organization & fee assignment">
      <p className="mb-3 text-sm text-muted-foreground">
        Pick a node to set standard fee and plan. Student-specific ledgers live under Classes → Roster → Fees.
      </p>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <LabeledInput
          label="Enabled depth (3–5)"
          hint="How many org levels you use for fees"
          value={String(enabledDepth)}
          onChange={(v) => setEnabledDepth(Math.min(5, Math.max(3, Number(v) || 3)))}
        />
        <button type="button" onClick={() => void saveDepth()} className="rounded-lg border px-3 py-2 text-sm">
          Save depth
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="max-h-64 overflow-y-auto rounded-lg border border-border p-2">
          {root && <TreeRow node={root} nodes={nodes} depth={0} selectedId={selectedId} onSelect={setSelectedId} />}
        </div>
        <div className="space-y-2">
          <LabeledInput label="Standard amount ₹" value={amountRupees} onChange={setAmountRupees} />
          <label className="block text-xs font-semibold text-muted-foreground">Fee head</label>
          <select
            value={structureId}
            onChange={(e) => setStructureId(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            {structures.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({formatPaise(s.amountPaise)})
              </option>
            ))}
          </select>
          <label className="block text-xs font-semibold text-muted-foreground">Payment plan</label>
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void saveNodeDefault()}
            className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
          >
            Save on node
          </button>
        </div>
      </div>
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
    </Panel>
  );
}
