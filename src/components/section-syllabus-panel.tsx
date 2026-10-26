"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Section } from "@/lib/api";
import type { SyllabusMode, SyllabusNode, SyllabusTree } from "@/lib/syllabus-types";
import { defaultWeightForNewSibling, siblingSum } from "@/lib/syllabus-weights";
import { SyllabusTreeView } from "@/components/section-syllabus-tree";

function sectionOptionLabel(section: Section) {
  return `${section.className || "Class"} · ${section.name}`;
}

function childrenOfParent(nodes: SyllabusNode[], parentId: string | null): SyllabusNode[] {
  if (!parentId) return nodes;
  function walk(list: SyllabusNode[]): SyllabusNode[] | null {
    for (const n of list) {
      if (n.id === parentId) return n.children;
      const found = walk(n.children);
      if (found) return found;
    }
    return null;
  }
  return walk(nodes) ?? [];
}

const MODE_HINT: Record<SyllabusMode, string> = {
  admin: "Add chapters and set weights (siblings must total 100% per level).",
  teacher: "Update completion % on topics you teach (leaf items only).",
  viewer: "View syllabus progress for this class (read only).",
};

export function SectionSyllabusPanel({
  instituteId,
  sectionId,
  mode,
  fillHeight = false,
}: {
  instituteId: string;
  sectionId: string;
  mode: SyllabusMode;
  fillHeight?: boolean;
}) {
  const isAdmin = mode === "admin";
  const [linked, setLinked] = useState<{ id: string; name: string }[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [tree, setTree] = useState<SyllabusTree | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [addTitle, setAddTitle] = useState("");
  const [addWeight, setAddWeight] = useState("100");
  const [sections, setSections] = useState<Section[]>([]);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copySourceId, setCopySourceId] = useState(sectionId);
  const [copyTargetIds, setCopyTargetIds] = useState<string[]>([]);

  const loadSubjects = useCallback(async () => {
    const res = await fetch(`/api/sections/${sectionId}/subjects`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      setLinked([]);
      return;
    }
    const rows = await res.json();
    setLinked(rows);
    setSubjectId((prev) => {
      if (prev && rows.some((r: { id: string }) => r.id === prev)) return prev;
      return rows[0]?.id ?? "";
    });
  }, [sectionId]);

  const loadTree = useCallback(async () => {
    if (!subjectId) {
      setTree(null);
      return;
    }
    const res = await fetch(`/api/sections/${sectionId}/subjects/${subjectId}/syllabus`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setTree(null);
      setError(body.detail || body.error || "Could not load syllabus.");
      return;
    }
    setError("");
    setTree(await res.json());
  }, [sectionId, subjectId]);

  useEffect(() => {
    loadSubjects().catch(() => setError("Could not load subjects"));
  }, [loadSubjects]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch(`/api/institutes/${instituteId}/sections`, { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: Section[]) => setSections(rows))
      .catch(() => setSections([]));
  }, [instituteId, isAdmin]);

  useEffect(() => {
    setCopySourceId(sectionId);
  }, [sectionId]);

  useEffect(() => {
    loadTree().catch(() => setError("Could not load syllabus"));
  }, [loadTree]);

  const addSiblingRemainder = useMemo(() => {
    if (!tree) return 100;
    const siblings = childrenOfParent(tree.nodes, addParentId);
    return defaultWeightForNewSibling(
      siblings.map((s) => ({ id: s.id, weightPercent: s.weightPercent }))
    );
  }, [tree, addParentId]);

  async function createNode() {
    if (!subjectId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/sections/${sectionId}/subjects/${subjectId}/syllabus/nodes`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentId: addParentId,
            title: addTitle.trim(),
            weightPercent: Number(addWeight),
          }),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || "Could not add chapter");
      setAddOpen(false);
      setAddTitle("");
      setAddWeight("100");
      setAddParentId(null);
      await loadTree();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add chapter");
    } finally {
      setBusy(false);
    }
  }

  const patchWeight = useCallback(
    async (nodeId: string, weightPercent: number) => {
      if (!subjectId) return;
      setBusy(true);
      setError("");
      try {
        const res = await fetch(
          `/api/sections/${sectionId}/subjects/${subjectId}/syllabus/nodes/${nodeId}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ weightPercent }),
          }
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.detail || "Could not update weight");
        await loadTree();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update weight");
      } finally {
        setBusy(false);
      }
    },
    [sectionId, subjectId, loadTree]
  );

  const removeNode = useCallback(
    async (nodeId: string) => {
      if (!subjectId || !confirm("Delete this chapter and all sub-chapters?")) return;
      setBusy(true);
      setError("");
      try {
        const res = await fetch(
          `/api/sections/${sectionId}/subjects/${subjectId}/syllabus/nodes/${nodeId}`,
          { method: "DELETE", credentials: "include" }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || "Could not delete");
        }
        await loadTree();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not delete");
      } finally {
        setBusy(false);
      }
    },
    [sectionId, subjectId, loadTree]
  );

  const setCompletion = useCallback(
    async (nodeId: string, completedPercent: number) => {
      if (!subjectId) return;
      setError("");
      try {
        const res = await fetch(
          `/api/sections/${sectionId}/subjects/${subjectId}/syllabus/nodes/${nodeId}/completion`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completedPercent }),
          }
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.detail || "Could not update completion");
        setTree(body as SyllabusTree);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update completion");
      }
    },
    [sectionId, subjectId]
  );

  function openCopyDialog() {
    setCopySourceId(sectionId);
    setCopyTargetIds([]);
    setCopyOpen(true);
  }

  function toggleCopyTarget(id: string) {
    setCopyTargetIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }

  async function runCopy() {
    if (!copySourceId || copyTargetIds.length === 0) {
      setError("Pick a source class and at least one target class.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/institutes/${instituteId}/syllabus/copy`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceSectionId: copySourceId,
          targetSectionIds: copyTargetIds,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || "Could not copy syllabus");
      setCopyOpen(false);
      if (copySourceId === sectionId || copyTargetIds.includes(sectionId)) {
        await loadTree();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not copy syllabus");
    } finally {
      setBusy(false);
    }
  }

  const copyTargetOptions = sections.filter((s) => s.id !== copySourceId);

  function openAdd(parentId: string | null) {
    setAddParentId(parentId);
    setAddTitle("");
    const siblings = childrenOfParent(tree?.nodes ?? [], parentId);
    const weight = defaultWeightForNewSibling(
      siblings.map((s) => ({ id: s.id, weightPercent: s.weightPercent }))
    );
    setAddWeight(String(weight));
    setAddOpen(true);
  }

  const listScrollClass = fillHeight
    ? "min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
    : "max-h-[calc(100dvh-18rem)] overflow-y-auto overscroll-y-contain";

  const cardClass = fillHeight
    ? "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm"
    : "max-w-4xl rounded-xl border border-border bg-card p-4 shadow-sm";

  const total = tree?.subjectTotalCompletedPercent ?? 0;
  const hasNodes = (tree?.nodes.length ?? 0) > 0;

  const treeHandlers = useMemo(
    () => ({
      busy,
      onPatchWeight: (id: string, w: number) => void patchWeight(id, w),
      onSetCompletion: (id: string, p: number) => void setCompletion(id, p),
      onRemove: (id: string) => void removeNode(id),
      onAddChild: (parentId: string) => openAdd(parentId),
    }),
    [busy, patchWeight, setCompletion, removeNode, tree]
  );

  return (
    <div className={fillHeight ? "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden" : "space-y-3"}>
      {error && (
        <p className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {linked.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">
          Link subjects first on the Subjects tab, then build a syllabus per subject here.
        </p>
      ) : (
        <div className={cardClass}>
          <div className="flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
            <div className="min-w-0 flex-1 space-y-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Subject
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {linked.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <div>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{tree?.subjectName ?? "Syllabus"}</span>
                  <span className="tabular-nums text-primary">{total}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${total}%` }} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{MODE_HINT[mode]}</p>
            </div>
            {isAdmin && (
              <div className="flex shrink-0 flex-wrap gap-2">
                {sections.length > 1 && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={openCopyDialog}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
                  >
                    Copy to other classes
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openAdd(null)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  Add chapter
                </button>
              </div>
            )}
          </div>

          <div className={`${listScrollClass} pt-3`}>
            {!hasNodes ? (
              <p className="text-sm text-muted-foreground">
                {isAdmin
                  ? "No chapters yet. Add a root chapter (weights among siblings must total 100%)."
                  : "No syllabus published for this subject yet."}
              </p>
            ) : (
              <SyllabusTreeView nodes={tree!.nodes} mode={mode} handlers={treeHandlers} />
            )}
          </div>
        </div>
      )}

      {copyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-lg">
            <h3 className="font-semibold">Copy syllabus between classes</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Copies chapter structure and weights for subjects linked on both classes. Target
              completion is reset to 0%.
            </p>
            <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Copy from
              <select
                value={copySourceId}
                onChange={(e) => {
                  setCopySourceId(e.target.value);
                  setCopyTargetIds((ids) => ids.filter((id) => id !== e.target.value));
                }}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{sectionOptionLabel(s)}</option>
                ))}
              </select>
            </label>
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground">Copy to</p>
              {copyTargetOptions.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No other classes in this institute.</p>
              ) : (
                <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                  {copyTargetOptions.map((s) => (
                    <li key={s.id}>
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={copyTargetIds.includes(s.id)}
                          onChange={() => toggleCopyTarget(s.id)}
                        />
                        {sectionOptionLabel(s)}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg px-3 py-1.5 text-sm" onClick={() => setCopyOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || copyTargetIds.length === 0}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
                onClick={() => void runCopy()}
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-lg">
            <h3 className="font-semibold">{addParentId ? "Add sub-chapter" : "Add chapter"}</h3>
            <div className="mt-3 space-y-2">
              <input
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                placeholder="Title"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0.01}
                max={100}
                step={0.01}
                value={addWeight}
                onChange={(e) => setAddWeight(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="Weight % among siblings"
              />
              <p className="text-xs text-muted-foreground">
                Sibling weights must sum to 100% after this change. Suggested weight for a new
                item here: {addSiblingRemainder}%.
                {tree && addParentId === null && tree.nodes.length > 0 && (
                  <> Current roots total {siblingSum(tree.nodes).toFixed(0)}%.</>
                )}
              </p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !addTitle.trim()}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
                onClick={() => void createNode()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
