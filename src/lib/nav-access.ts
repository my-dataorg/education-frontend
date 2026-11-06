export type NavFeatureRoleRule = {
  visible?: boolean;
  editable?: boolean;
};

export type NavAccessOverrides = Record<string, Record<string, NavFeatureRoleRule>>;

export function parseNavAccessOverrides(raw: unknown): NavAccessOverrides {
  if (!raw || typeof raw !== "object") return {};
  return raw as NavAccessOverrides;
}
