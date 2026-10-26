import type { SyllabusNode } from "@/lib/syllabus-types";

export const WEIGHT_TOLERANCE = 0.01;

export type WeightedNode = { id: string; weightPercent: number };

export type WeightedTitle = WeightedNode & { title: string };

export function roundWeight(n: number): number {
  return Math.round(n * 100) / 100;
}

export function siblingSum(nodes: WeightedNode[]): number {
  return nodes.reduce((total, n) => total + n.weightPercent, 0);
}

export function isSiblingGroupValid(sum: number): boolean {
  return Math.abs(sum - 100) <= WEIGHT_TOLERANCE;
}

export function remainderForNode(siblings: WeightedNode[], nodeId: string): number {
  const others = siblings.filter((s) => s.id !== nodeId);
  const used = siblingSum(others);
  return roundWeight(100 - used);
}

export function defaultWeightForNewSibling(siblings: WeightedNode[]): number {
  if (siblings.length === 0) return 100;
  if (siblings.length === 1 && Math.abs(siblings[0].weightPercent - 100) <= WEIGHT_TOLERANCE) {
    return 50;
  }
  const sum = siblingSum(siblings);
  const remaining = 100 - sum;
  if (remaining > WEIGHT_TOLERANCE) return roundWeight(remaining);
  return 50;
}

/** Last sibling absorbs remainder; cannot edit the last row directly. */
export function applyWeightWithLastFlex(
  siblings: WeightedNode[],
  nodeId: string,
  newWeight: number
): WeightedNode[] {
  if (siblings.length <= 1) return siblings.map((s) => ({ ...s }));
  const last = siblings[siblings.length - 1];
  if (last.id === nodeId) {
    throw new Error("Last item weight is calculated automatically");
  }
  const idx = siblings.findIndex((s) => s.id === nodeId);
  if (idx < 0) return siblings.map((s) => ({ ...s }));

  const w = roundWeight(newWeight);
  if (w <= 0 || w >= 100) throw new Error("Weight must be between 0 and 100");

  const othersSum = siblings
    .slice(0, -1)
    .filter((s) => s.id !== nodeId)
    .reduce((t, s) => t + s.weightPercent, 0);
  const lastWeight = roundWeight(100 - othersSum - w);
  if (lastWeight <= WEIGHT_TOLERANCE) {
    throw new Error("Not enough weight left for the last item");
  }

  return siblings.map((s) => {
    if (s.id === nodeId) return { ...s, weightPercent: w };
    if (s.id === last.id) return { ...s, weightPercent: lastWeight };
    return { ...s };
  });
}

export function prorateAfterDelete(
  siblings: WeightedNode[],
  deletedId: string
): { survivors: WeightedNode[]; deletedWeight: number } {
  const deleted = siblings.find((s) => s.id === deletedId);
  if (!deleted) return { survivors: siblings.map((s) => ({ ...s })), deletedWeight: 0 };

  const freed = deleted.weightPercent;
  const survivors = siblings.filter((s) => s.id !== deletedId);
  if (survivors.length === 0) return { survivors: [], deletedWeight: freed };
  if (survivors.length === 1) {
    return { survivors: [{ ...survivors[0], weightPercent: 100 }], deletedWeight: freed };
  }

  const sum = siblingSum(survivors);
  let updated: WeightedNode[];
  if (sum <= WEIGHT_TOLERANCE) {
    const even = roundWeight(100 / survivors.length);
    updated = survivors.map((s, i) => ({
      ...s,
      weightPercent:
        i === survivors.length - 1
          ? roundWeight(100 - even * (survivors.length - 1))
          : even,
    }));
  } else {
    updated = survivors.map((s) => ({
      ...s,
      weightPercent: roundWeight(s.weightPercent + freed * (s.weightPercent / sum)),
    }));
    const total = siblingSum(updated);
    if (!isSiblingGroupValid(total)) {
      const last = updated[updated.length - 1];
      last.weightPercent = roundWeight(last.weightPercent + (100 - total));
    }
  }
  return { survivors: updated, deletedWeight: freed };
}

export function deleteWeightPreview(
  siblings: WeightedTitle[],
  deletedId: string
): { deletedTitle: string; deletedWeight: number; rows: { title: string; from: number; to: number }[] } | null {
  const deleted = siblings.find((s) => s.id === deletedId);
  if (!deleted) return null;
  const { survivors, deletedWeight } = prorateAfterDelete(siblings, deletedId);
  const toById = new Map(survivors.map((s) => [s.id, s.weightPercent]));
  return {
    deletedTitle: deleted.title,
    deletedWeight,
    rows: siblings
      .filter((s) => s.id !== deletedId)
      .map((s) => ({
        title: s.title,
        from: s.weightPercent,
        to: toById.get(s.id) ?? s.weightPercent,
      })),
  };
}

export function collectWeightMap(nodes: SyllabusNode[]): Map<string, number> {
  const map = new Map<string, number>();
  function walk(list: SyllabusNode[]) {
    for (const n of list) {
      map.set(n.id, n.weightPercent);
      walk(n.children);
    }
  }
  walk(nodes);
  return map;
}

export function weightMapsEqual(a: Map<string, number>, b: Map<string, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [id, w] of a) {
    if (b.get(id) !== w) return false;
  }
  return true;
}

export function applyDraftWeightChange(
  nodes: SyllabusNode[],
  nodeId: string,
  newWeight: number
): SyllabusNode[] {
  function patchLevel(list: SyllabusNode[]): SyllabusNode[] | null {
    if (list.some((n) => n.id === nodeId)) {
      const weights = list.map((n) => ({ id: n.id, weightPercent: n.weightPercent }));
      const updated = applyWeightWithLastFlex(weights, nodeId, newWeight);
      const byId = new Map(updated.map((u) => [u.id, u.weightPercent]));
      return list.map((n) => ({
        ...n,
        weightPercent: byId.get(n.id) ?? n.weightPercent,
      }));
    }
    let changed = false;
    const next = list.map((n) => {
      const children = patchLevel(n.children);
      if (children) {
        changed = true;
        return { ...n, children };
      }
      return n;
    });
    return changed ? next : null;
  }
  return patchLevel(nodes) ?? nodes;
}

export function applyDraftDelete(nodes: SyllabusNode[], nodeId: string): SyllabusNode[] {
  function walk(list: SyllabusNode[]): SyllabusNode[] {
    if (list.some((n) => n.id === nodeId)) {
      const weights = list.map((n) => ({ id: n.id, weightPercent: n.weightPercent }));
      const { survivors } = prorateAfterDelete(weights, nodeId);
      const byId = new Map(survivors.map((s) => [s.id, s.weightPercent]));
      return list
        .filter((n) => n.id !== nodeId)
        .map((n) => ({
          ...n,
          weightPercent: byId.get(n.id) ?? n.weightPercent,
        }));
    }
    return list.map((n) => ({ ...n, children: walk(n.children) }));
  }
  return walk(nodes);
}

/** Scale sibling weights to 100% (fixes legacy rows like 100% + 100%). */
export function normalizeSiblingWeights(siblings: WeightedNode[]): WeightedNode[] {
  if (siblings.length === 0) return [];
  if (siblings.length === 1) return [{ ...siblings[0], weightPercent: 100 }];
  const sum = siblingSum(siblings);
  if (isSiblingGroupValid(sum)) return siblings.map((s) => ({ ...s }));
  if (sum <= WEIGHT_TOLERANCE) {
    const even = roundWeight(100 / siblings.length);
    return siblings.map((s, i) => ({
      ...s,
      weightPercent:
        i === siblings.length - 1
          ? roundWeight(100 - even * (siblings.length - 1))
          : even,
    }));
  }
  const scaled = siblings.map((s) => ({
    ...s,
    weightPercent: roundWeight((s.weightPercent / sum) * 100),
  }));
  const total = siblingSum(scaled);
  if (!isSiblingGroupValid(total)) {
    const last = scaled[scaled.length - 1];
    last.weightPercent = roundWeight(last.weightPercent + (100 - total));
  }
  return scaled;
}

export function normalizeTreeWeights(nodes: SyllabusNode[]): SyllabusNode[] {
  function walk(list: SyllabusNode[]): SyllabusNode[] {
    const fixed = normalizeSiblingWeights(
      list.map((n) => ({ id: n.id, weightPercent: n.weightPercent }))
    );
    const byId = new Map(fixed.map((w) => [w.id, w.weightPercent]));
    return list.map((n) => ({
      ...n,
      weightPercent: byId.get(n.id) ?? n.weightPercent,
      children: walk(n.children),
    }));
  }
  return walk(nodes);
}

export function treeHasInvalidWeightGroups(nodes: SyllabusNode[]): boolean {
  function walk(list: SyllabusNode[]): boolean {
    if (list.length > 0 && !isSiblingGroupValid(siblingSum(list))) return true;
    return list.some((n) => walk(n.children));
  }
  return walk(nodes);
}

export function findSiblingGroup(
  nodes: SyllabusNode[],
  nodeId: string
): SyllabusNode[] | null {
  function walk(list: SyllabusNode[]): SyllabusNode[] | null {
    if (list.some((n) => n.id === nodeId)) return list;
    for (const n of list) {
      const found = walk(n.children);
      if (found) return found;
    }
    return null;
  }
  return walk(nodes);
}
