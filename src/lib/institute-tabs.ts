export const INSTITUTE_TAB_IDS = ["overview", "members", "enrollment", "campuses"] as const;

export type InstituteTabId = (typeof INSTITUTE_TAB_IDS)[number];

export type InstituteTab = {
  id: InstituteTabId;
  label: string;
};

const ALL_TABS: InstituteTab[] = [
  { id: "overview", label: "Overview" },
  { id: "members", label: "Members" },
  { id: "enrollment", label: "Enrollment" },
  { id: "campuses", label: "Campuses" },
];

export function getInstituteTabs(role: string): InstituteTab[] {
  if (role === "owner" || role === "admin") return ALL_TABS;
  if (role === "principal") return [ALL_TABS[0]];
  return [];
}

export function resolveInstituteTab(role: string, tabParam: string | null): InstituteTabId {
  const tabs = getInstituteTabs(role);
  const fallback = tabs[0]?.id ?? "overview";
  if (tabParam && tabs.some((t) => t.id === tabParam)) {
    return tabParam as InstituteTabId;
  }
  return fallback;
}
