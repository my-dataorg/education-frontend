"use client";

import { useState } from "react";
import { ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import { childCountAtNextTier, type TreeNode } from "@/components/configure-shared/academic-org-levels";

function nodeIsEmpty(node: TreeNode) {
  return (node.children ?? []).length === 0;
}

export function HierarchyColumnCard({
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
  readOnly,
}: {
  title: string;
  subtitle: string;
  nodes: TreeNode[];
  selectedId: string | null;
  tierOrder: number[];
  onSelect: (id: string) => void;
  onDelete?: (node: TreeNode) => void;
  onAdd?: () => void;
  addDisabled?: boolean;
  onRenameTier?: () => void;
  onRemoveEmptyTier?: () => void;
  readOnly?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex w-[12.5rem] shrink-0 flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="relative border-b border-border px-3 py-2.5">
        <p className="pr-6 text-xs font-bold uppercase tracking-wide text-foreground">{title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
        {!readOnly && (onRenameTier || onRemoveEmptyTier) && (
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
                {!readOnly && onDelete && leaf && (
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
      {!readOnly && onAdd && (
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
      )}
    </div>
  );
}
