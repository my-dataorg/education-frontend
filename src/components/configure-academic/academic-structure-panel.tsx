"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import { Panel } from "@/components/institute-tabs/module-tab-ui";
import { FeeDialog } from "@/components/configure-fees/fee-dialog";

const ORG_MIN_DEPTH = 3;
const ORG_MAX_DEPTH = 20;
const CLASS_LEVEL = 2;
const SECTION_LEVEL = 3;

type TreeNode = {
  id: string;
  parentId: string | null;
  level: number;
  label: string;
  description?: string;
  sectionId?: string | null;
  children: TreeNode[];
};

type LevelLabel = { level: number; label: string; enabled: boolean; role?: string };

function rosterLevel(labels: LevelLabel[], enabledDepth: number): number | null {
  const top = labels.find((l) => l.level === enabledDepth && l.enabled);
  if (top?.role === "roster") return enabledDepth;
  if (top && top.label.toLowerCase().includes("student")) return enabledDepth;
  const five = labels.find((l) => l.level === 5 && l.enabled && l.label.toLowerCase().includes("student"));
  if (five && enabledDepth >= 5) return 5;
  return null;
}

function orgLevelsForDepth(enabledDepth: number, labels: LevelLabel[]): number[] {
  const roster = rosterLevel(labels, enabledDepth);
  const out: number[] = [];
  for (let l = 1; l <= enabledDepth; l += 1) {
    if (l === SECTION_LEVEL) continue;
    if (roster !== null && l === roster) continue;
    out.push(l);
  }
  return out;
}

function normalizeLabels(enabledDepth: number, existing: LevelLabel[]): LevelLabel[] {
  const by = new Map(existing.map((l) => [l.level, l]));
  const out: LevelLabel[] = [];
  for (let lvl = 1; lvl <= enabledDepth; lvl += 1) {
    const prev = by.get(lvl);
    if (lvl === CLASS_LEVEL) {
      out.push({ level: lvl, label: prev?.label ?? "Class", enabled: true, role: "class" });
    } else if (lvl === SECTION_LEVEL) {
      out.push({ level: lvl, label: prev?.label ?? "Section", enabled: true, role: "section" });
    } else if (prev?.role === "roster" && lvl === enabledDepth) {
      out.push({ ...prev, level: lvl, enabled: prev.enabled ?? true, role: "roster" });
    } else if (prev) {
      out.push({ ...prev, level: lvl, role: prev.role ?? "org" });
    } else {
      out.push({ level: lvl, label: `Level ${lvl}`, enabled: true, role: "org" });
    }
  }
  return out;
}

function levelName(labels: LevelLabel[], level: number) {
  return labels.find((l) => l.level === level)?.label ?? `Level ${level}`;
}

function findNode(nodes: TreeNode[], id: string): TreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findNode(n.children ?? [], id);
    if (hit) return hit;
  }
  return null;
}

function countAtLevel(nodes: TreeNode[], level: number): number {
  let count = 0;
  function walk(ns: TreeNode[]) {
    for (const n of ns) {
      if (n.level === level) count += 1;
      walk(n.children ?? []);
    }
  }
  walk(nodes);
  return count;
}

function childrenAtLevel(parent: TreeNode | null, root: TreeNode | undefined, level: number): TreeNode[] {
  if (!parent) {
    if (!root) return [];
    return (root.children ?? []).filter((c) => c.level === level).sort((a, b) => a.label.localeCompare(b.label));
  }
  return (parent.children ?? []).filter((c) => c.level === level).sort((a, b) => a.label.localeCompare(b.label));
}

function nextTier(current: number, tierOrder: number[]): number | undefined {
  const i = tierOrder.indexOf(current);
  return i >= 0 ? tierOrder[i + 1] : undefined;
}

function childCountAtNextTier(node: TreeNode, tierOrder: number[]): number {
  const next = nextTier(node.level, tierOrder);
  if (next === undefined) return 0;
  return (node.children ?? []).filter((c) => c.level === next).length;
}

function nodeIsEmpty(node: TreeNode) {
  return (node.children ?? []).length === 0;
}

type AddKind = "node" | "section";

function HierarchyColumnCard({
  title,
  subtitle,
  nodes,
  selectedId,
  tierOrder,
  onSelect,
  onDelete,
  onAdd,
  addDisabled,
  onRenameTier,
  onRemoveEmptyTier,
}: {
  title: string;
  subtitle: string;
  nodes: TreeNode[];
  selectedId: string | null;
  tierOrder: number[];
  onSelect: (id: string) => void;
  onDelete: (node: TreeNode) => void;
  onAdd: () => void;
  addDisabled?: boolean;
  onRenameTier?: () => void;
  onRemoveEmptyTier?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex w-[12.5rem] shrink-0 flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="relative border-b border-border px-3 py-2.5">
        <p className="pr-6 text-xs font-bold uppercase tracking-wide text-foreground">{title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
        {(onRenameTier || onRemoveEmptyTier) && (
          <div className="absolute right-1.5 top-2">
            <button
              type="button"
              aria-label="Column options"
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-10 mt-1 min-w-[8rem] rounded-lg border border-border bg-popover py-1 shadow-md">
                {onRenameTier && (
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-xs hover:bg-muted"
                    onClick={() => {
                      setMenuOpen(false);
                      onRenameTier();
                    }}
                  >
                    Rename tier
                  </button>
                )}
                {onRemoveEmptyTier && (
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-xs text-destructive hover:bg-muted"
                    onClick={() => {
                      setMenuOpen(false);
                      onRemoveEmptyTier();
                    }}
                  >
                    Remove tier
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <ul className="max-h-56 flex-1 overflow-y-auto px-2 py-1">
        {nodes.map((node) => {
          const active = selectedId === node.id;
          const kids = childCountAtNextTier(node, tierOrder);
          const leaf = nodeIsEmpty(node);
          return (
            <li key={node.id}>
              <div className={`group flex items-center rounded-lg ${active ? "bg-primary/15" : ""}`}>
                <button
                  type="button"
                  onClick={() => onSelect(node.id)}
                  className={`flex min-w-0 flex-1 items-center gap-1 px-2 py-1.5 text-left text-sm ${
                    active ? "font-semibold" : ""
                  }`}
                >
                  <span className="truncate">{node.label}</span>
                  {kids > 0 && (
                    <span className="ml-auto flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
                      {kids}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
                {leaf && (
                  <button
                    type="button"
                    onClick={() => onDelete(node)}
                    className="mr-1 shrink-0 px-1 text-sm text-destructive opacity-60 hover:opacity-100"
                    title="Delete"
                  >
                    ×
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-border p-2">
        <button
          type="button"
          disabled={addDisabled}
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-primary/50 px-2 py-2 text-xs font-medium text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          Add {title}
        </button>
      </div>
    </div>
  );
}

export function AcademicStructurePanel({ instituteId }: { instituteId: string }) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [labels, setLabels] = useState<LevelLabel[]>([]);
  const [enabledDepth, setEnabledDepth] = useState(4);
  const [selectedByLevel, setSelectedByLevel] = useState<Record<number, string | null>>({});
  const [dialog, setDialog] = useState<AddKind | "newTier" | "renameTier" | null>(null);
  const [addLevel, setAddLevel] = useState<number | null>(null);
  const [renameLevel, setRenameLevel] = useState<number | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [depthBusy, setDepthBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/institutes/${instituteId}/academic-structure/tree`, { credentials: "include" });
    if (!res.ok) throw new Error("load");
    const data = await res.json();
    setTree(data.tree ?? []);
    const depth = data.config?.enabledDepth ?? 4;
    const loaded = data.config?.levelLabels?.length
      ? (data.config.levelLabels as LevelLabel[])
      : normalizeLabels(depth, []);
    setLabels(loaded);
    setEnabledDepth(depth);
  }, [instituteId]);

  useEffect(() => {
    load().catch(() => setError("Could not load academic structure"));
  }, [load]);

  const root = tree[0];
  const orgLevels = useMemo(() => orgLevelsForDepth(enabledDepth, labels), [enabledDepth, labels]);
  const sectionLevel = SECTION_LEVEL;
  const tierOrder = useMemo(
    () => [...orgLevels, sectionLevel].filter((l, i, a) => a.indexOf(l) === i).sort((a, b) => a - b),
    [orgLevels]
  );

  const selectAtLevel = useCallback(
    (level: number, id: string) => {
      setSelectedByLevel((prev) => {
        const next = { ...prev, [level]: id };
        for (const l of tierOrder) {
          if (l > level) next[l] = null;
        }
        return next;
      });
    },
    [tierOrder]
  );

  const clearBelow = (level: number) => {
    setSelectedByLevel((prev) => {
      const next = { ...prev };
      for (const l of tierOrder) {
        if (l > level) next[l] = null;
      }
      return next;
    });
  };

  function parentForLevel(level: number): TreeNode | null {
    if (level === CLASS_LEVEL) {
      const bandId = selectedByLevel[1];
      if (bandId) return findNode(tree, bandId);
      return root ?? null;
    }
    const prior = tierOrder.filter((l) => l < level);
    if (!prior.length) return root ?? null;
    const immediate = prior[prior.length - 1];
    const pid = selectedByLevel[immediate];
    return pid ? findNode(tree, pid) : null;
  }

  function parentLabelForColumn(level: number): string | null {
    if (level === tierOrder[0]) return null;
    const prior = tierOrder.filter((l) => l < level);
    const immediate = prior[prior.length - 1];
    if (!immediate) return null;
    const pid = selectedByLevel[immediate];
    if (!pid) return null;
    return findNode(tree, pid)?.label ?? null;
  }

  function showColumn(level: number): boolean {
    if (level === 1 && orgLevels.includes(1)) return true;
    if (level === CLASS_LEVEL) return true;
    if (level === sectionLevel) {
      return enabledDepth >= sectionLevel && Boolean(selectedByLevel[CLASS_LEVEL]);
    }
    if (!orgLevels.includes(level)) return false;
    const prior = tierOrder.filter((l) => l < level);
    if (!prior.length) return false;
    return Boolean(selectedByLevel[prior[prior.length - 1]]);
  }

  function parentIdForAdd(level: number): string | null {
    if (level === 1) return root?.id ?? null;
    if (level === CLASS_LEVEL) {
      if (countAtLevel(tree, 1) > 0 && !selectedByLevel[1]) return null;
      return selectedByLevel[1] ?? root?.id ?? null;
    }
    if (level === sectionLevel) {
      return selectedByLevel[CLASS_LEVEL] ?? null;
    }
    const parent = parentForLevel(level);
    return parent?.id ?? null;
  }

  function canAddInColumn(level: number): boolean {
    return Boolean(parentIdForAdd(level));
  }

  async function saveConfig(nextDepth: number, nextLabels: LevelLabel[]) {
    setDepthBusy(true);
    const normalized = normalizeLabels(nextDepth, nextLabels);
    const res = await fetch(`/api/institutes/${instituteId}/academic-structure/org-config`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabledDepth: nextDepth, levelLabels: normalized }),
    });
    setDepthBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "Could not save hierarchy settings");
      return false;
    }
    const data = await res.json();
    setEnabledDepth(data.enabledDepth ?? nextDepth);
    setLabels(data.levelLabels ?? normalized);
    await load();
    return true;
  }

  async function addLevelTier(tierLabel?: string) {
    if (enabledDepth >= ORG_MAX_DEPTH) return;
    const nextDepth = enabledDepth + 1;
    const next = normalizeLabels(nextDepth, [
      ...labels,
      { level: nextDepth, label: tierLabel?.trim() || `Level ${nextDepth}`, enabled: true, role: "org" },
    ]);
    await saveConfig(nextDepth, next);
  }

  async function removeLevelTier() {
    if (enabledDepth <= ORG_MIN_DEPTH) return;
    const removed = enabledDepth;
    if (countAtLevel(tree, removed) > 0) {
      if (!window.confirm(`Level ${removed} still has items. Remove this tier anyway?`)) return;
    }
    const nextDepth = enabledDepth - 1;
    await saveConfig(
      nextDepth,
      labels.filter((l) => l.level <= nextDepth)
    );
    clearBelow(nextDepth);
  }

  function openAdd(level: number, kind: AddKind, pid: string | null) {
    setAddLevel(level);
    setParentId(pid);
    setName("");
    setDescription("");
    setDialog(kind);
    setError("");
  }

  async function submitNode(level: number, pid: string | null) {
    const res = await fetch(`/api/institutes/${instituteId}/academic-structure/nodes`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentId: pid,
        level,
        label: name.trim(),
        description: description.trim(),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "Could not save");
      return;
    }
    setDialog(null);
    await load();
  }

  async function submitSection(classNodeId: string) {
    const res = await fetch(`/api/institutes/${instituteId}/academic-structure/sections`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentClassOrgNodeId: classNodeId,
        name: name.trim(),
        description: description.trim(),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "Could not save section");
      return;
    }
    setDialog(null);
    await load();
  }

  async function removeNode(node: TreeNode) {
    if (!window.confirm(`Delete “${node.label}”? Child items must be removed first.`)) return;
    const res = await fetch(`/api/institutes/${instituteId}/academic-structure/nodes/${node.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "Could not delete");
      return;
    }
    setSelectedByLevel((prev) => {
      const next = { ...prev };
      for (const [lvl, id] of Object.entries(next)) {
        if (id === node.id) next[Number(lvl)] = null;
      }
      return next;
    });
    await load();
  }

  async function saveRenameTier() {
    if (!renameLevel || !name.trim()) return;
    const next = labels.map((l) => (l.level === renameLevel ? { ...l, label: name.trim() } : l));
    const ok = await saveConfig(enabledDepth, next);
    if (ok) setDialog(null);
  }

  const columns = useMemo(() => {
    const order = [...orgLevels.sort((a, b) => a - b)];
    const idx = order.indexOf(CLASS_LEVEL);
    if (idx >= 0) order.splice(idx + 1, 0, sectionLevel);
    else order.push(sectionLevel);
    return order.filter((l, i, arr) => arr.indexOf(l) === i);
  }, [orgLevels]);

  function canRemoveEmptyTierColumn(level: number, nodesInColumn: TreeNode[]) {
    if (nodesInColumn.length > 0) return false;
    if (level === CLASS_LEVEL || level === SECTION_LEVEL) return false;
    if (countAtLevel(tree, level) > 0) return false;
    return level === enabledDepth && enabledDepth > ORG_MIN_DEPTH;
  }

  const dialogTitle =
    dialog === "section"
      ? `New ${levelName(labels, sectionLevel)}`
      : dialog === "newTier"
        ? "Add hierarchy level"
        : dialog === "renameTier" && renameLevel
          ? `Rename ${levelName(labels, renameLevel)}`
          : addLevel
            ? `New ${levelName(labels, addLevel)}`
            : "New item";

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Panel title="Educational hierarchy">
        <div className="overflow-x-auto pb-1">
          <div className="flex min-h-[18rem] gap-3">
            {columns.map((level) => {
              if (!showColumn(level)) return null;
              const parent =
                level === CLASS_LEVEL
                  ? selectedByLevel[1]
                    ? findNode(tree, selectedByLevel[1]!)
                    : root
                  : parentForLevel(level);
              const nodes =
                level === CLASS_LEVEL && !selectedByLevel[1] && countAtLevel(tree, 1) === 0
                  ? childrenAtLevel(null, root, CLASS_LEVEL)
                  : childrenAtLevel(parent ?? null, root, level);
              const selectedId = selectedByLevel[level] ?? null;
              const tierTitle = levelName(labels, level);
              const under = parentLabelForColumn(level);
              const subtitle = under
                ? `Under ${under} · ${nodes.length} item${nodes.length === 1 ? "" : "s"}`
                : `Top level · ${nodes.length} item${nodes.length === 1 ? "" : "s"}`;
              const pid = parentIdForAdd(level);
              const isSection = level === sectionLevel;

              return (
                <HierarchyColumnCard
                  key={level}
                  title={tierTitle}
                  subtitle={subtitle}
                  nodes={nodes}
                  selectedId={selectedId}
                  tierOrder={tierOrder}
                  onSelect={(id) => selectAtLevel(level, id)}
                  onDelete={(n) => void removeNode(n)}
                  addDisabled={!canAddInColumn(level)}
                  onAdd={() => {
                    if (!pid) return;
                    if (isSection) openAdd(level, "section", pid);
                    else openAdd(level, "node", pid);
                  }}
                  onRenameTier={() => {
                    setRenameLevel(level);
                    setName(levelName(labels, level));
                    setDialog("renameTier");
                  }}
                  onRemoveEmptyTier={
                    canRemoveEmptyTierColumn(level, nodes) ? () => void removeLevelTier() : undefined
                  }
                />
              );
            })}

            <button
              type="button"
              disabled={depthBusy || enabledDepth >= ORG_MAX_DEPTH}
              onClick={() => {
                setName("");
                setDialog("newTier");
              }}
              className="flex w-[11rem] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-muted/10 p-4 text-center hover:bg-primary/5 disabled:opacity-50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Plus className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-foreground">Add level</span>
              <span className="text-[11px] leading-snug text-muted-foreground">Pick a name and where it goes</span>
            </button>
          </div>
        </div>
      </Panel>

      <FeeDialog open={dialog !== null} title={dialogTitle} onClose={() => setDialog(null)}>
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-muted-foreground">
            {dialog === "newTier" ? "Level name (e.g. Group, Batch)" : "Name"}
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || !name.trim()) return;
              if (dialog === "section" && parentId) void submitSection(parentId);
              else if (dialog === "node" && addLevel !== null && parentId) void submitNode(addLevel, parentId);
              else if (dialog === "newTier") void addLevelTier(name);
              else if (dialog === "renameTier") void saveRenameTier();
            }}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder={dialog === "newTier" ? "Group" : undefined}
          />
          {dialog === "newTier" && (
            <p className="text-xs text-muted-foreground">
              A new tier is added under {levelName(labels, enabledDepth)}. Drill into a parent on the right, then use{" "}
              + Add to create items.
            </p>
          )}
          <button
            type="button"
            className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
            onClick={() => {
              if (!name.trim()) return;
              if (dialog === "section" && parentId) void submitSection(parentId);
              else if (dialog === "node" && addLevel !== null && parentId) void submitNode(addLevel, parentId);
              else if (dialog === "newTier") void addLevelTier(name);
              else if (dialog === "renameTier") void saveRenameTier();
            }}
          >
            Save
          </button>
        </div>
      </FeeDialog>
    </div>
  );
}
