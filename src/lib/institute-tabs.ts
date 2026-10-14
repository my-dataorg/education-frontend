export const INSTITUTE_TAB_IDS = [
  "overview",
  "members",
  "academic-year",
  "classes",
  "enrollment",
  "subject-teachers",
  "schedule",
  "attendance",
  "exams",
  "fees",
  "notices",
  "reports",
  "campuses",
  "roles-settings",
] as const;

export type InstituteTabId = (typeof INSTITUTE_TAB_IDS)[number];

export type InstituteTab = {
  id: InstituteTabId;
  label: string;
};

const ALL_TABS: InstituteTab[] = [
  { id: "overview", label: "Overview" },
  { id: "members", label: "Members" },
  { id: "academic-year", label: "Academic year" },
  { id: "classes", label: "Classes & subjects" },
  { id: "enrollment", label: "Enrollment" },
  { id: "subject-teachers", label: "Subject teachers" },
  { id: "schedule", label: "Schedule" },
  { id: "attendance", label: "Attendance" },
  { id: "exams", label: "Exams & results" },
  { id: "fees", label: "Fees" },
  { id: "notices", label: "Notices & calendar" },
  { id: "reports", label: "Reports" },
  { id: "campuses", label: "Campuses" },
  { id: "roles-settings", label: "Roles & settings" },
];

export function getInstituteTabs(role: string): InstituteTab[] {
  if (role === "owner") return ALL_TABS;
  if (role === "admin") {
    return ALL_TABS.filter(
      (tab) => !["classes", "enrollment", "subject-teachers", "roles-settings"].includes(tab.id)
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
