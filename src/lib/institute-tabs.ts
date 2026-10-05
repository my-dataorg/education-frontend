export const INSTITUTE_TAB_IDS = [
  "overview",
  "members",
  "classes",
  "enrollment",
  "subject-teachers",
  "schedule",
  "campuses",
] as const;

export type InstituteTabId = (typeof INSTITUTE_TAB_IDS)[number];

export type InstituteTab = {
  id: InstituteTabId;
  label: string;
};

const ALL_TABS: InstituteTab[] = [
  { id: "overview", label: "Overview" },
  { id: "members", label: "Members" },
  { id: "classes", label: "Classes & subjects" },
  { id: "enrollment", label: "Enrollment" },
  { id: "subject-teachers", label: "Subject teachers" },
  { id: "schedule", label: "Schedule" },
  { id: "campuses", label: "Campuses" },
];

export function getInstituteTabs(role: string): InstituteTab[] {
  if (role === "owner") return ALL_TABS;
  if (role === "admin") {
    return ALL_TABS.filter(
      (tab) => !["classes", "enrollment", "subject-teachers"].includes(tab.id)
    );
  }
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
