"use client";

import { useCallback, useEffect, useState } from "react";
import { Panel } from "@/components/institute-tabs/module-tab-ui";
import { FeeDialog } from "@/components/configure-fees/fee-dialog";

type TreeNode = {
  id: string;
  parentId: string | null;
  level: number;
  label: string;
  sectionId?: string | null;
  children: TreeNode[];
};

type LevelLabel = { level: number; label: string; enabled: boolean };

function levelName(labels: LevelLabel[], level: number) {
  return labels.find((l) => l.level === level)?.label ?? `Level ${level}`;
}

function TreeView({ node, depth, selectedId, onSelect }: {
  node: TreeNode;
  depth: number;
  selectedId: string;
  onSelect: (n: TreeNode) => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => onSelect(node)}
        className={`block w-full rounded px-2 py-1.5 text-left text-sm ${
          selectedId === node.id ? "bg-primary/15 font-medium" : "hover:bg-muted/50"
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {node.label}
        <span className="ml-1 text-[10px] uppercase text-muted-foreground">L{node.level}</span>
      </button>
      {node.children.map((c) => (
        <TreeView key={c.id} node={c} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </>
  );
}

export function AcademicStructurePanel({ instituteId }: { instituteId: string }) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [labels, setLabels] = useState<LevelLabel[]>([]);
  const [selected, setSelected] = useState<TreeNode | null>(null);
  const [dialog, setDialog] = useState<"band" | "class" | "section" | "subsection" | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/institutes/${instituteId}/academic-structure/tree`, { credentials: "include" });
    if (!res.ok) throw new Error("load");
    const data = await res.json();
    setTree(data.tree ?? []);
    setLabels(data.config?.levelLabels ?? []);
    setSelected((prev) => prev ?? data.tree?.[0] ?? null);
  }, [instituteId]);

  useEffect(() => {
    load().catch(() => setError("Could not load academic structure"));
  }, [load]);

  function rootNode() {
    return tree[0];
  }

  function openAdd(kind: typeof dialog) {
    setName("");
    setDialog(kind);
  }

  async function submitNode(level: number, parentId: string | null) {
    const res = await fetch(`/api/institutes/${instituteId}/academic-structure/nodes`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId, level, label: name.trim() }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.detail || "Could not save");
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
      body: JSON.stringify({ parentClassOrgNodeId: classNodeId, name: name.trim() }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.detail || "Could not save section");
      return;
    }
    setDialog(null);
    await load();
  }

  const root = rootNode();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Build one hierarchy: {levelName(labels, 1)} (e.g. Elementary, Middle, High) → {levelName(labels, 2)} →{" "}
        {levelName(labels, 3)} → {levelName(labels, 4)}.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Hierarchy">
          <div className="max-h-80 overflow-y-auto rounded-lg border border-border p-2">
            {root ? (
              <TreeView node={root} depth={0} selectedId={selected?.id ?? ""} onSelect={setSelected} />
            ) : (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
          </div>
        </Panel>
        <Panel title="Add under selection">
          {!selected && <p className="text-sm text-muted-foreground">Select a node in the tree.</p>}
          {selected?.level === 0 && (
            <button
              type="button"
              className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
              onClick={() => openAdd("band")}
            >
              + {levelName(labels, 1)}
            </button>
          )}
          {selected?.level === 1 && (
            <button
              type="button"
              className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
              onClick={() => openAdd("class")}
            >
              + {levelName(labels, 2)}
            </button>
          )}
          {selected?.level === 2 && (
            <button
              type="button"
              className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
              onClick={() => openAdd("section")}
            >
              + {levelName(labels, 3)}
            </button>
          )}
          {selected?.level === 3 && (
            <button
              type="button"
              className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
              onClick={() => openAdd("subsection")}
            >
              + {levelName(labels, 4)}
            </button>
          )}
          {selected && ![0, 1, 2, 3].includes(selected.level) && (
            <p className="text-sm text-muted-foreground">This level has no children here.</p>
          )}
        </Panel>
      </div>

      <FeeDialog
        open={dialog === "band"}
        title={`New ${levelName(labels, 1)}`}
        onClose={() => setDialog(null)}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. High school"
          className="mb-3 w-full rounded-lg border px-3 py-2 text-sm"
        />
        <button
          type="button"
          className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
          onClick={() => root && void submitNode(1, root.id)}
        >
          Save
        </button>
      </FeeDialog>

      <FeeDialog open={dialog === "class"} title={`New ${levelName(labels, 2)}`} onClose={() => setDialog(null)}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Grade 10"
          className="mb-3 w-full rounded-lg border px-3 py-2 text-sm"
        />
        <button
          type="button"
          className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
          onClick={() => selected && void submitNode(2, selected.id)}
        >
          Save
        </button>
      </FeeDialog>

      <FeeDialog open={dialog === "section"} title={`New ${levelName(labels, 3)}`} onClose={() => setDialog(null)}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. A"
          className="mb-3 w-full rounded-lg border px-3 py-2 text-sm"
        />
        <button
          type="button"
          className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
          onClick={() => selected && void submitSection(selected.id)}
        >
          Save
        </button>
      </FeeDialog>

      <FeeDialog open={dialog === "subsection"} title={`New ${levelName(labels, 4)}`} onClose={() => setDialog(null)}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Group 1"
          className="mb-3 w-full rounded-lg border px-3 py-2 text-sm"
        />
        <button
          type="button"
          className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
          onClick={() => selected && void submitNode(4, selected.id)}
        >
          Save
        </button>
      </FeeDialog>
    </div>
  );
}
