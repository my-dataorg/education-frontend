export const ORG_MIN_DEPTH = 3;
export const ORG_MAX_DEPTH = 20;
export const CLASS_LEVEL = 2;
export const SECTION_LEVEL = 3;

export type LevelLabel = { level: number; label: string; enabled: boolean; role?: string };

export type TreeNode = {
  id: string;
  parentId: string | null;
  level: number;
  label: string;
  description?: string;
  sectionId?: string | null;
  studentUserId?: string | null;
  children: TreeNode[];
};

export function rosterLevel(labels: LevelLabel[], enabledDepth: number): number | null {
  const top = labels.find((l) => l.level === enabledDepth && l.enabled);
  if (top?.role === "roster") return enabledDepth;
  if (top && top.label.toLowerCase().includes("student")) return enabledDepth;
  const five = labels.find((l) => l.level === 5 && l.enabled && l.label.toLowerCase().includes("student"));
  if (five && enabledDepth >= 5) return 5;
  return null;
}

export function orgLevelsForDepth(enabledDepth: number, labels: LevelLabel[]): number[] {
  const roster = rosterLevel(labels, enabledDepth);
  const out: number[] = [];
  for (let l = 1; l <= enabledDepth; l += 1) {
    if (l === SECTION_LEVEL) continue;
    if (roster !== null && l === roster) continue;
    out.push(l);
  }
  return out;
}

export function normalizeLabels(enabledDepth: number, existing: LevelLabel[]): LevelLabel[] {
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

export function levelName(labels: LevelLabel[], level: number) {
  return labels.find((l) => l.level === level)?.label ?? `Level ${level}`;
}

export function findNode(nodes: TreeNode[], id: string): TreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findNode(n.children ?? [], id);
    if (hit) return hit;
  }
  return null;
}

export function childrenAtLevel(parent: TreeNode | null, root: TreeNode | undefined, level: number): TreeNode[] {
  if (!parent) {
    if (!root) return [];
    return (root.children ?? []).filter((c) => c.level === level).sort((a, b) => a.label.localeCompare(b.label));
  }
  return (parent.children ?? []).filter((c) => c.level === level).sort((a, b) => a.label.localeCompare(b.label));
}

export function nextTier(current: number, tierOrder: number[]): number | undefined {
  const i = tierOrder.indexOf(current);
  return i >= 0 ? tierOrder[i + 1] : undefined;
}

export function childCountAtNextTier(node: TreeNode, tierOrder: number[]): number {
  const next = nextTier(node.level, tierOrder);
  if (next === undefined) return 0;
  return (node.children ?? []).filter((c) => c.level === next).length;
}
