export const INSTITUTE_TAB_IDS = [
  "overview",
  "profile",
  "configure",
  "calendar",
  "associates",
  "teachers-classes",
  "students-classes",
  "daily-notes",
  "fees",
  "exams",
  "reports",
  "attendance",
  "timetable",
] as const;

export type InstituteTabId = (typeof INSTITUTE_TAB_IDS)[number];

export type InstituteTabGroup = "setup" | "people" | "operations" | "outcomes";

export type InstituteTab = {
  id: InstituteTabId;
  label: string;
  group: InstituteTabGroup;
};

const OWNER_TABS: InstituteTab[] = [
  { id: "overview", label: "Overview", group: "setup" },
  { id: "profile", label: "Profile", group: "setup" },
  { id: "configure", label: "Configure", group: "setup" },
  { id: "associates", label: "Associates", group: "people" },
  { id: "teachers-classes", label: "Teachers in classes", group: "people" },
  { id: "students-classes", label: "Students in classes", group: "people" },
  { id: "calendar", label: "Holidays & events", group: "operations" },
  { id: "attendance", label: "Attendance", group: "operations" },
  { id: "timetable", label: "Timetable", group: "operations" },
  { id: "daily-notes", label: "Daily notes", group: "operations" },
  { id: "fees", label: "Fees", group: "outcomes" },
  { id: "exams", label: "Exams & results", group: "outcomes" },
  { id: "reports", label: "Reports", group: "outcomes" },
];

const PRINCIPAL_TABS = OWNER_TABS;

const ADMIN_TABS: InstituteTab[] = [
  { id: "overview", label: "Overview", group: "setup" },
  { id: "associates", label: "Associates", group: "people" },
  { id: "calendar", label: "Holidays & events", group: "operations" },
  { id: "attendance", label: "Attendance", group: "operations" },
  { id: "timetable", label: "Timetable", group: "operations" },
  { id: "fees", label: "Fees", group: "outcomes" },
  { id: "exams", label: "Exams & results", group: "outcomes" },
  { id: "reports", label: "Reports", group: "outcomes" },
];

const LEGACY_TAB_ALIASES: Record<string, InstituteTabId | "enrollment-split"> = {
  members: "associates",
  classes: "configure",
  "academic-year": "configure",
  "roles-settings": "configure",
  campuses: "profile",
  enrollment: "enrollment-split",
  "subject-teachers": "teachers-classes",
  notices: "calendar",
  schedule: "timetable",
};

const CLASSES_TAB_TO_CONFIGURE: Record<string, string> = {
  sections: "sections",
  subjects: "subjects",
  activities: "activities",
  "section-subjects": "section-subjects",
};

export function getInstituteTabs(role: string): InstituteTab[] {
  if (role === "owner") return OWNER_TABS;
  if (role === "principal") return PRINCIPAL_TABS;
  if (role === "admin") return ADMIN_TABS;
  return [];
}

export function resolveLegacyTab(
  tabParam: string | null,
  enrollmentModule: string | null | undefined
): InstituteTabId | null {
  if (!tabParam) return null;
  if (INSTITUTE_TAB_IDS.includes(tabParam as InstituteTabId)) {
    return tabParam as InstituteTabId;
  }
  const alias = LEGACY_TAB_ALIASES[tabParam];
  if (alias === "enrollment-split") {
    return enrollmentModule === "students" ? "students-classes" : "teachers-classes";
  }
  if (alias) return alias;
  return null;
}

export function resolveInstituteTab(
  role: string,
  tabParam: string | null,
  enrollmentModule?: string | null
): InstituteTabId {
  const tabs = getInstituteTabs(role);
  const fallback = tabs[0]?.id ?? "overview";
  const resolved = resolveLegacyTab(tabParam, enrollmentModule) ?? tabParam;
  if (resolved && tabs.some((t) => t.id === resolved)) {
    return resolved as InstituteTabId;
  }
  return fallback;
}

/** When the URL still uses a legacy tab id, return query overrides for a canonical link. */
export function legacyTabQueryOverrides(
  tabParam: string | null,
  searchParams: URLSearchParams
): Record<string, string | undefined> | null {
  if (!tabParam || INSTITUTE_TAB_IDS.includes(tabParam as InstituteTabId)) return null;

  const enrollmentModule = searchParams.get("enrollmentModule");
  const canonical = resolveLegacyTab(tabParam, enrollmentModule);
  if (!canonical) return null;

  const patch: Record<string, string | undefined> = { tab: canonical };

  if (tabParam === "classes") {
    const classesTab = searchParams.get("classesTab");
    patch.configureTab = classesTab ? CLASSES_TAB_TO_CONFIGURE[classesTab] ?? "sections" : "sections";
  }
  if (tabParam === "academic-year") patch.configureTab = "academic-year";
  if (tabParam === "roles-settings") patch.configureTab = "roles";
  if (tabParam === "subject-teachers") {
    patch.classAssignTab = "subject-teachers";
  }
  if (tabParam === "enrollment") {
    patch.enrollmentModule = enrollmentModule === "students" ? "students" : "teachers";
  }
  if (tabParam === "notices") {
    patch.calendarView = searchParams.get("calendarView") || "month";
  }

  return patch;
}

export const INSTITUTE_TAB_GROUP_LABELS: Record<InstituteTabGroup, string> = {
  setup: "Setup",
  people: "People",
  operations: "Operations",
  outcomes: "Outcomes",
};
