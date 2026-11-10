"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { DataTable, formatPaise, LabeledInput } from "@/components/institute-tabs/module-tab-ui";
import { CollapsiblePanel } from "@/components/configure-shared/collapsible-panel";
import { paiseToRupeesInput, rupeesInputToPaise } from "@/lib/fee-money";
import { FeeDialog } from "@/components/configure-fees/fee-dialog";
import {
  findNode,
  normalizeLabels,
  rosterLevel,
  type LevelLabel,
  type TreeNode,
} from "@/components/configure-shared/academic-org-levels";

type FeePlan = { id: string; name: string };
type FeeStructure = { id: string; name: string; amountPaise: number };

type SavedFeeLine = {
  feeStructureId: string;
  feeStructureName: string;
  amountPaise: number;
  feePlanId: string | null;
  feePlanName?: string | null;
};

type FeePayloadItem = {
  feeStructureId: string;
  amountPaise: number;
  feePlanId: string | null;
};

function isHiddenFeeNode(node: TreeNode, rosterLevelNum: number | null) {
  if (node.studentUserId) return true;
  if (rosterLevelNum !== null && node.level === rosterLevelNum) return true;
  return false;
}

function feeTreeChildren(node: TreeNode, rosterLevelNum: number | null): TreeNode[] {
  return (node.children ?? []).filter((c) => !isHiddenFeeNode(c, rosterLevelNum));
}

function collectDescendantIds(node: TreeNode, rosterLevelNum: number | null): string[] {
  const out: string[] = [];
  function walk(n: TreeNode) {
    for (const child of feeTreeChildren(n, rosterLevelNum)) {
      out.push(child.id);
      walk(child);
    }
  }
  walk(node);
  return out;
}

function collectExpandableIds(
  node: TreeNode,
  rosterLevelNum: number | null,
  maxDepth = 2,
  depth = 0
): string[] {
  const kids = feeTreeChildren(node, rosterLevelNum);
  if (depth >= maxDepth || kids.length === 0) return [];
  return [node.id, ...kids.flatMap((c) => collectExpandableIds(c, rosterLevelNum, maxDepth, depth + 1))];
}

function OrgFeeTreeNode({
  node,
  depth,
  rosterLevelNum,
  expanded,
  onToggleExpand,
  selectedId,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  rosterLevelNum: number | null;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const children = feeTreeChildren(node, rosterLevelNum);
  const hasChildren = children.length > 0;
  const open = expanded.has(node.id);
  const selected = selectedId === node.id;

  return (
    <>
      <div className="flex items-center" style={{ paddingLeft: `${depth * 8 + 4}px` }}>
        {hasChildren ? (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => onToggleExpand(node.id)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="h-7 w-7 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm ${
            selected ? "bg-primary/15 font-semibold text-foreground" : "hover:bg-muted/60"
          }`}
        >
          {node.label}
        </button>
      </div>
      {hasChildren &&
        open &&
        children.map((child) => (
          <OrgFeeTreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            rosterLevelNum={rosterLevelNum}
            expanded={expanded}
            onToggleExpand={onToggleExpand}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
    </>
  );
}

function apiItemsToLines(
  items: {
    feeStructureId: string;
    feeStructureName: string;
    amountPaise: number;
    feePlanId: string | null;
    feePlan?: { name: string } | null;
  }[]
): SavedFeeLine[] {
  return items.map((item) => ({
    feeStructureId: item.feeStructureId,
    feeStructureName: item.feeStructureName,
    amountPaise: item.amountPaise,
    feePlanId: item.feePlanId,
    feePlanName: item.feePlan?.name ?? null,
  }));
}

export function OrgFeeAssignmentPanel({
  instituteId,
  plans,
  structures,
  onStructuresChange,
}: {
  instituteId: string;
  plans: FeePlan[];
  structures: FeeStructure[];
  onStructuresChange: () => void;
}) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [labels, setLabels] = useState<LevelLabel[]>([]);
  const [enabledDepth, setEnabledDepth] = useState(4);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [items, setItems] = useState<SavedFeeLine[]>([]);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);

  const [feeDialog, setFeeDialog] = useState<"add" | "edit" | null>(null);
  const [editStructureId, setEditStructureId] = useState<string | null>(null);
  const [dlgStructureId, setDlgStructureId] = useState("");
  const [dlgAmount, setDlgAmount] = useState("");
  const [dlgPlanId, setDlgPlanId] = useState("");
  const [dlgError, setDlgError] = useState("");

  const [propagateOpen, setPropagateOpen] = useState(false);
  const [descendantCount, setDescendantCount] = useState(0);

  const loadTree = useCallback(async () => {
    const res = await fetch(`/api/institutes/${instituteId}/academic-structure/tree`, { credentials: "include" });
    if (!res.ok) throw new Error("tree");
    const data = await res.json();
    setTree(data.tree ?? []);
    const depth = data.config?.enabledDepth ?? 4;
    const loaded = data.config?.levelLabels?.length
      ? (data.config.levelLabels as LevelLabel[])
      : normalizeLabels(depth, []);
    setLabels(loaded);
    setEnabledDepth(depth);
  }, [instituteId]);

  const loadNodeItems = useCallback(
    async (nodeId: string) => {
      const res = await fetch(`/api/institutes/${instituteId}/org-nodes/${nodeId}/fee-items`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("items");
      const data = await res.json();
      setItems(apiItemsToLines(data));
      setDirty(false);
    },
    [instituteId]
  );

  useEffect(() => {
    loadTree().catch(() => setLoadError("Could not load organization hierarchy"));
  }, [loadTree]);

  const root = tree[0];
  const rosterLevelNum = useMemo(() => rosterLevel(labels, enabledDepth), [labels, enabledDepth]);

  useEffect(() => {
    if (!root) return;
    setExpanded(new Set(collectExpandableIds(root, rosterLevelNum, 2)));
    setSelectedNodeId((prev) => prev ?? root.id);
  }, [root, rosterLevelNum]);

  const selectedNode = selectedNodeId ? findNode(tree, selectedNodeId) : null;

  useEffect(() => {
    if (!selectedNodeId) {
      setItems([]);
      setDirty(false);
      return;
    }
    setMessage("");
    loadNodeItems(selectedNodeId).catch(() => setMessage("Could not load fees for this node"));
  }, [selectedNodeId, loadNodeItems]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openAddDialog() {
    setFeeDialog("add");
    setEditStructureId(null);
    setDlgStructureId("");
    setDlgAmount("");
    setDlgPlanId("");
    setDlgError("");
  }

  function openEditDialog(line: SavedFeeLine) {
    setFeeDialog("edit");
    setEditStructureId(line.feeStructureId);
    setDlgStructureId(line.feeStructureId);
    setDlgAmount(paiseToRupeesInput(line.amountPaise));
    setDlgPlanId(line.feePlanId ?? "");
    setDlgError("");
  }

  function closeFeeDialog() {
    setFeeDialog(null);
    setEditStructureId(null);
  }

  async function applyDialogToTable() {
    setDlgError("");
    const fsId = dlgStructureId;
    if (!fsId) {
      setDlgError("Choose a payment type from the list (add types on the right if empty)");
      return;
    }
    const amount = rupeesInputToPaise(dlgAmount);
    if (amount <= 0) {
      setDlgError("Enter a valid amount");
      return;
    }
    const struct = structures.find((s) => s.id === fsId);
    const name = struct?.name ?? "";
    const plan = plans.find((p) => p.id === dlgPlanId);

    if (feeDialog === "edit" && editStructureId && editStructureId !== fsId) {
      setDlgError("Cannot change fee type when editing — delete and add a new row instead");
      return;
    }

    if (
      feeDialog === "add" &&
      items.some((i) => i.feeStructureId === fsId)
    ) {
      setDlgError("This fee type is already on the list");
      return;
    }

    const nextLine: SavedFeeLine = {
      feeStructureId: fsId,
      feeStructureName: name,
      amountPaise: amount,
      feePlanId: dlgPlanId || null,
      feePlanName: plan?.name ?? null,
    };

    setItems((prev) => {
      if (feeDialog === "edit" && editStructureId) {
        return prev.map((row) => (row.feeStructureId === editStructureId ? nextLine : row));
      }
      return [...prev, nextLine];
    });
    setDirty(true);
    closeFeeDialog();
  }

  function deleteLine(line: SavedFeeLine) {
    if (!window.confirm(`Remove "${line.feeStructureName}" from this node?`)) return;
    setItems((prev) => prev.filter((i) => i.feeStructureId !== line.feeStructureId));
    setDirty(true);
  }

  function itemsToPayload(lines: SavedFeeLine[]): FeePayloadItem[] {
    return lines.map((line) => ({
      feeStructureId: line.feeStructureId,
      amountPaise: line.amountPaise,
      feePlanId: line.feePlanId,
    }));
  }

  async function putItemsOnNodes(nodeIds: string[], payload: FeePayloadItem[]) {
    for (const nodeId of nodeIds) {
      const res = await fetch(`/api/institutes/${instituteId}/org-nodes/${nodeId}/fee-items`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      if (!res.ok) throw new Error("save");
    }
  }

  async function commitSave(propagate: boolean) {
    if (!selectedNodeId || !selectedNode) return;
    setBusy(true);
    setMessage("");
    setPropagateOpen(false);
    const payload = itemsToPayload(items);
    const nodeIds = [selectedNodeId];
    if (propagate) {
      nodeIds.push(...collectDescendantIds(selectedNode, rosterLevelNum));
    }
    try {
      await putItemsOnNodes(nodeIds, payload);
      await loadNodeItems(selectedNodeId);
      setMessage(
        propagate
          ? `Saved on this node and applied to ${nodeIds.length - 1} level(s) below. You can override amounts on child nodes anytime.`
          : "Saved on this node."
      );
    } catch {
      setMessage("Could not save fees");
    } finally {
      setBusy(false);
    }
  }

  function onSaveClick() {
    if (!selectedNodeId || !selectedNode) return;
    const descendants = collectDescendantIds(selectedNode, rosterLevelNum);
    if (descendants.length > 0) {
      setDescendantCount(descendants.length);
      setPropagateOpen(true);
      return;
    }
    void commitSave(false);
  }

  if (loadError) {
    return (
      <CollapsiblePanel title="Organization fees & assignment">
        <p className="text-sm text-destructive">{loadError}</p>
      </CollapsiblePanel>
    );
  }

  if (!root) {
    return (
      <CollapsiblePanel title="Organization fees & assignment">
        <p className="text-sm text-muted-foreground">Syncing org tree from your classes… reload if empty.</p>
      </CollapsiblePanel>
    );
  }

  const planHeader = plans.length > 0 ? ["Type", "Amount", "Plan", ""] : ["Type", "Amount", ""];
  const tableRows = items.map((line) => {
    const actions = (
      <span className="inline-flex gap-2">
        <button
          type="button"
          onClick={() => openEditDialog(line)}
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => deleteLine(line)}
          className="inline-flex items-center gap-1 text-destructive hover:underline"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </span>
    );
    if (plans.length > 0) {
      return [line.feeStructureName, formatPaise(line.amountPaise), line.feePlanName ?? "—", actions];
    }
    return [line.feeStructureName, formatPaise(line.amountPaise), actions];
  });

  return (
    <CollapsiblePanel title="Organization fees & assignment" defaultOpen>
      <p className="mb-1 text-sm text-muted-foreground">
        Select a node in the tree, manage fees in the table, then save. You can push the same fees to lower levels when
        asked.
      </p>
      <p className="mb-4 text-xs text-muted-foreground">
        Hierarchy shape:{" "}
        <Link
          href={`/institutes/${instituteId}?tab=configure&configureTab=sections`}
          className="text-primary underline"
        >
          Configure → Academic structure
        </Link>
        .
      </p>

      <div className="grid gap-4 lg:grid-cols-[minmax(14rem,17.5rem)_1fr] lg:items-start">
        <div className="max-h-[min(28rem,70vh)] overflow-y-auto rounded-xl border border-border bg-muted/20 p-2">
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Org tree</p>
          <OrgFeeTreeNode
            node={root}
            depth={0}
            rosterLevelNum={rosterLevelNum}
            expanded={expanded}
            onToggleExpand={toggleExpand}
            selectedId={selectedNodeId}
            onSelect={setSelectedNodeId}
          />
        </div>

        <div className="min-w-0 space-y-3 rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              {selectedNode ? `Fees for ${selectedNode.label}` : "Select a node"}
              {dirty && <span className="ml-2 text-xs font-normal text-amber-700">Unsaved changes</span>}
            </h3>
            {selectedNodeId && (
              <button
                type="button"
                onClick={openAddDialog}
                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-primary/60 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5"
              >
                <Plus className="h-4 w-4" />
                Add fee
              </button>
            )}
          </div>

          {selectedNodeId && items.length === 0 && !dirty && (
            <p className="text-sm text-muted-foreground">No fees yet. Click + Add fee to get started.</p>
          )}

          {items.length > 0 && <DataTable headers={planHeader} rows={tableRows} />}

          {selectedNodeId && (
            <button
              type="button"
              disabled={busy || (items.length === 0 && !dirty)}
              onClick={() => onSaveClick()}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              Save on node
            </button>
          )}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </div>
      </div>

      <FeeDialog
        open={feeDialog !== null}
        title={feeDialog === "edit" ? "Edit fee" : "Add fee"}
        onClose={closeFeeDialog}
      >
        <div className="space-y-3">
          {feeDialog === "edit" ? (
            <p className="text-sm text-muted-foreground">
              Type: <span className="font-medium text-foreground">{items.find((i) => i.feeStructureId === editStructureId)?.feeStructureName}</span>
            </p>
          ) : (
            <label className="block text-xs">
              <span className="mb-1 block font-semibold text-muted-foreground">Payment type</span>
              {structures.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add types under “Types of payment” on the right first.</p>
              ) : (
                <select
                  value={dlgStructureId}
                  onChange={(e) => setDlgStructureId(e.target.value)}
                  className="w-full rounded-lg border px-2 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  {structures
                    .filter((s) => !items.some((i) => i.feeStructureId === s.id))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              )}
            </label>
          )}
          <LabeledInput label="Amount ₹" value={dlgAmount} onChange={setDlgAmount} />
          {plans.length > 0 && (
            <label className="block text-xs">
              <span className="mb-1 block font-semibold text-muted-foreground">Payment plan (optional)</span>
              <select
                value={dlgPlanId}
                onChange={(e) => setDlgPlanId(e.target.value)}
                className="w-full rounded-lg border px-2 py-2 text-sm"
              >
                <option value="">None</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {dlgError && <p className="text-sm text-destructive">{dlgError}</p>}
          <button
            type="button"
            onClick={() => void applyDialogToTable()}
            className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
          >
            {feeDialog === "edit" ? "Update in table" : "Add to table"}
          </button>
        </div>
      </FeeDialog>

      <FeeDialog open={propagateOpen} title="Apply to lower levels?" onClose={() => setPropagateOpen(false)}>
        <p className="text-sm text-muted-foreground">
          Save fees on <span className="font-medium text-foreground">{selectedNode?.label}</span> and optionally apply
          the same fee lines to <span className="font-medium text-foreground">{descendantCount}</span> org level(s)
          below. Child nodes can be edited later with different amounts.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void commitSave(false)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            This node only
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void commitSave(true)}
            className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
          >
            Save & apply below
          </button>
        </div>
      </FeeDialog>
    </CollapsiblePanel>
  );
}
