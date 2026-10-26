export const WEIGHT_TOLERANCE = 0.01;

export type WeightedNode = { id: string; weightPercent: number };

export function siblingSum(nodes: WeightedNode[]): number {
  return nodes.reduce((total, n) => total + n.weightPercent, 0);
}

export function isSiblingGroupValid(sum: number): boolean {
  return Math.abs(sum - 100) <= WEIGHT_TOLERANCE;
}

export function remainderForNode(siblings: WeightedNode[], nodeId: string): number {
  const others = siblings.filter((s) => s.id !== nodeId);
  const used = siblingSum(others);
  return Math.round((100 - used) * 100) / 100;
}

export function defaultWeightForNewSibling(siblings: WeightedNode[]): number {
  if (siblings.length === 0) return 100;
  const sum = siblingSum(siblings);
  const remaining = 100 - sum;
  if (remaining > WEIGHT_TOLERANCE) return Math.round(remaining * 100) / 100;
  return 100;
}
