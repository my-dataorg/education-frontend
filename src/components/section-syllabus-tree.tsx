"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { SyllabusMode, SyllabusNode } from "@/lib/syllabus-types";
import {
  isSiblingGroupValid,
  remainderForNode,
  siblingSum,
} from "@/lib/syllabus-weights";

function collectIds(nodes: SyllabusNode[]): string[] {
  const ids: string[] = [];
  for (const n of nodes) {
    ids.push(n.id);
    ids.push(...collectIds(n.children));
  }
  return ids;
}

function rootIds(nodes: SyllabusNode[]): string[] {
  return nodes.map((n) => n.id);
}

type TreeHandlers = {
  busy: boolean;
  onPatchWeight: (nodeId: string, weightPercent: number) => void;
  onSetCompletion: (nodeId: string, completedPercent: number) => void;
  onRemove: (nodeId: string) => void;
  onAddChild: (parentId: string) => void;
};

function AdminWeightCell({
  node,
  busy,
  remainder,
  onPatchWeight,
}: {
  node: SyllabusNode;
  busy: boolean;
  remainder: number | null;
  onPatchWeight: (nodeId: string, weightPercent: number) => void;
}) {
  const [draft, setDraft] = useState(String(node.weightPercent));

  useEffect(() => {
    setDraft(String(node.weightPercent));
  }, [node.id, node.weightPercent]);

  const parsed = Number(draft);
  const dirty = !Number.isNaN(parsed) && parsed !== node.weightPercent;

  function save() {
    if (Number.isNaN(parsed) || parsed === node.weightPercent) return;
    onPatchWeight(node.id, parsed);
  }

  return (
    <div className="text-right">
      <div className="flex items-center justify-end gap-1">
        <input
          type="number"
          min={0.01}
          max={100}
          step={0.01}
          disabled={busy}
          className="w-16 rounded border border-border bg-background px-1 py-0.5 text-right text-xs tabular-nums"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
          }}
        />
        {dirty && (
          <button
            type="button"
            disabled={busy || Number.isNaN(parsed)}
            onClick={save}
            className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground disabled:opacity-50"
          >
            Save
          </button>
        )}
      </div>
      {remainder !== null && remainder > 0 && remainder <= 100 && (
        <button
          type="button"
          className="mt-0.5 block w-full text-[10px] text-primary hover:underline"
          onClick={() => onPatchWeight(node.id, remainder)}
        >
          Set to remaining ({remainder}%)
        </button>
      )}
    </div>
  );
}

function CompletionCell({
  node,
  mode,
  onSetCompletion,
}: {
  node: SyllabusNode;
  mode: SyllabusMode;
  onSetCompletion: (nodeId: string, completedPercent: number) => void;
}) {
  const value = node.isLeaf && mode === "teacher" && node.canEditCompletion
    ? node.completedPercent
    : node.effectiveCompletedPercent;

  if (node.isLeaf && mode === "teacher" && node.canEditCompletion) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          className="w-14 rounded border border-border bg-background px-1 py-0.5 text-right text-xs tabular-nums"
          defaultValue={node.completedPercent}
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (!Number.isNaN(v) && v !== node.completedPercent) {
              onSetCompletion(node.id, v);
            }
          }}
        />
        <span className="text-xs text-muted-foreground">%</span>
      </div>
    );
  }

  return (
    <div className="min-w-[4.5rem]">
      <div className="flex items-center justify-end gap-1 text-xs tabular-nums">
        <span>{value}%</span>
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/80"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

function SyllabusTreeNodeRow({
  node,
  depth,
  siblings,
  isLastSibling,
  mode,
  expandedIds,
  toggleExpanded,
  handlers,
}: {
  node: SyllabusNode;
  depth: number;
  siblings: SyllabusNode[];
  isLastSibling: boolean;
  mode: SyllabusMode;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  handlers: TreeHandlers;
}) {
  const hasChildren = node.children.length > 0;
  const expanded = expandedIds.has(node.id);
  const childSum = siblingSum(node.children);
  const childrenInvalid = hasChildren && mode === "admin" && !isSiblingGroupValid(childSum);
  const siblingGroupInvalid =
    mode === "admin" && siblings.length > 0 && !isSiblingGroupValid(siblingSum(siblings));
  const remainder =
    mode === "admin" && isLastSibling && siblingGroupInvalid
      ? remainderForNode(siblings, node.id)
      : null;

  return (
    <>
      <div
        className={`grid gap-2 border-t border-border/60 py-2 text-sm ${
          mode === "admin"
            ? "grid-cols-[1fr_4.5rem_5.5rem_auto]"
            : "grid-cols-[1fr_5.5rem]"
        } items-center`}
      >
        <div className="flex min-w-0 items-start gap-1" style={{ paddingLeft: depth * 16 }}>
          {hasChildren ? (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => toggleExpanded(node.id)}
              className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="inline-block w-5 shrink-0" />
          )}
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => hasChildren && toggleExpanded(node.id)}
              className={`text-left font-medium ${hasChildren ? "hover:text-primary" : ""}`}
            >
              {node.title}
            </button>
            {childrenInvalid && (
              <p className="mt-0.5 text-xs text-amber-700">
                Child weights total {childSum.toFixed(0)}% — must be 100%
              </p>
            )}
          </div>
        </div>

        {mode === "admin" && (
          <AdminWeightCell
            node={node}
            busy={handlers.busy}
            remainder={remainder}
            onPatchWeight={handlers.onPatchWeight}
          />
        )}

        <CompletionCell node={node} mode={mode} onSetCompletion={handlers.onSetCompletion} />

        {mode === "admin" && (
          <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
            {hasChildren && (
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => handlers.onAddChild(node.id)}
              >
                + child
              </button>
            )}
            <button
              type="button"
              className="text-destructive hover:underline"
              disabled={handlers.busy}
              onClick={() => handlers.onRemove(node.id)}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {hasChildren &&
        expanded &&
        node.children.map((child, index) => (
          <SyllabusTreeNodeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            siblings={node.children}
            isLastSibling={index === node.children.length - 1}
            mode={mode}
            expandedIds={expandedIds}
            toggleExpanded={toggleExpanded}
            handlers={handlers}
          />
        ))}
    </>
  );
}

export function SyllabusTreeView({
  nodes,
  mode,
  handlers,
}: {
  nodes: SyllabusNode[];
  mode: SyllabusMode;
  handlers: TreeHandlers;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(rootIds(nodes)));

  useEffect(() => {
    setExpandedIds(new Set(rootIds(nodes)));
  }, [nodes]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(collectIds(nodes)));
  }, [nodes]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const rootInvalid = useMemo(
    () => mode === "admin" && nodes.length > 0 && !isSiblingGroupValid(siblingSum(nodes)),
    [mode, nodes]
  );

  if (!nodes.length) return null;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {rootInvalid && (
          <p className="text-xs text-amber-700">
            Top-level weights total {siblingSum(nodes).toFixed(0)}% — must be 100%
          </p>
        )}
        <div className="ml-auto flex gap-2 text-xs">
          <button type="button" className="text-primary hover:underline" onClick={expandAll}>
            Expand all
          </button>
          <button type="button" className="text-primary hover:underline" onClick={collapseAll}>
            Collapse all
          </button>
        </div>
      </div>

      <div
        className={`hidden gap-2 border-b border-border pb-2 text-xs font-medium text-muted-foreground sm:grid ${
          mode === "admin" ? "grid-cols-[1fr_4.5rem_5.5rem_auto]" : "grid-cols-[1fr_5.5rem]"
        }`}
      >
        <span>Chapter</span>
        {mode === "admin" && <span className="text-right">Weight</span>}
        <span className="text-right">Completed</span>
        {mode === "admin" && <span className="w-16" />}
      </div>

      {nodes.map((node, index) => (
        <SyllabusTreeNodeRow
          key={node.id}
          node={node}
          depth={0}
          siblings={nodes}
          isLastSibling={index === nodes.length - 1}
          mode={mode}
          expandedIds={expandedIds}
          toggleExpanded={toggleExpanded}
          handlers={handlers}
        />
      ))}
    </div>
  );
}
