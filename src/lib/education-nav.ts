/**
 * Single institute sidebar catalog for Education. Every role uses this list;
 * visibility and labels are filtered per role. Page content scopes data by role.
 */

export const EDUCATION_NAV_IDS = [
  "overview",
  "profile",
  "configure",
  "association",
  "calendar",
  "timetable",
  "attendance",
  "exams",
  "fees",
  "reports",
  "classes",
  "associates",
  "teachers-classes",
  "students-classes",
  "daily-notes",
  "assignments",
  "messages",
  "class-teacher",
  "leave",
] as const;

export type EducationNavId = (typeof EDUCATION_NAV_IDS)[number];

export type EducationNavGroup = "main";

export type EducationNavScope = "institute" | "assigned-sections" | "self" | "children";

export type EducationNavItem = {
  id: EducationNavId;
  label: string;
  group: EducationNavGroup;
};

type RoleKey =
  | "owner"
  | "principal"
  | "admin"
  | "teacher"
  | "lecturer"
  | "professor"
  | "student"
  | "parent";

const LABELS: Record<EducationNavId, string> = {
  overview: "Overview",
  profile: "Profile",
  configure: "Configure",
  association: "Association",
  calendar: "Holidays & events",
  timetable: "Timetable",
  attendance: "Attendance",
  exams: "Exam results",
  fees: "Fees",
  reports: "Reports",
  classes: "Classes",
  associates: "Associates",
  "teachers-classes": "Teachers in classes",
  "students-classes": "Students in classes",
  "daily-notes": "Daily notes",
  assignments: "Assignments",
  messages: "Messages",
  "class-teacher": "Class teacher",
  leave: "Leave",
};

const OWNER_ORDER: EducationNavId[] = [
  "overview",
  "classes",
  "profile",
  "configure",
  "association",
  "calendar",
  "timetable",
  "attendance",
  "daily-notes",
  "exams",
  "fees",
  "reports",
];

const ROLE_LABEL_OVERRIDES: Partial<Record<RoleKey, Partial<Record<EducationNavId, string>>>> = {
  teacher: {
    exams: "Marks & gradebook",
    reports: "Student progress",
    calendar: "Notices & events",
  },
  lecturer: {
    exams: "Marks & gradebook",
    reports: "Student progress",
    calendar: "Notices & events",
  },
  professor: {
    exams: "Marks & gradebook",
    reports: "Student progress",
    calendar: "Notices & events",
  },
  student: {
    calendar: "Notices & calendar",
    profile: "Profile & documents",
    exams: "Results & report card",
  },
  parent: {
    overview: "Home",
    attendance: "Attendance & leave",
    fees: "Fees & receipts",
    calendar: "Notices & PTM",
    profile: "Profile & children",
    exams: "Academics",
  },
};

const ROLE_ORDER: Record<RoleKey, EducationNavId[]> = {
  owner: OWNER_ORDER,
  principal: OWNER_ORDER,
  admin: [
    "overview",
    "classes",
    "association",
    "calendar",
    "timetable",
    "attendance",
    "daily-notes",
    "exams",
    "fees",
    "reports",
  ],
  teacher: [
    "overview",
    "classes",
    "calendar",
    "timetable",
    "attendance",
    "assignments",
    "exams",
    "reports",
    "class-teacher",
    "leave",
  ],
  lecturer: [
    "overview",
    "classes",
    "calendar",
    "timetable",
    "attendance",
    "assignments",
    "exams",
    "reports",
    "class-teacher",
    "leave",
  ],
  professor: [
    "overview",
    "classes",
    "calendar",
    "timetable",
    "attendance",
    "assignments",
    "exams",
    "reports",
    "class-teacher",
    "leave",
  ],
  student: [
    "overview",
    "classes",
    "timetable",
    "assignments",
    "exams",
    "attendance",
    "calendar",
    "fees",
    "profile",
  ],
  parent: ["overview", "exams", "attendance", "fees", "calendar", "messages", "profile"],
};

const VISIBILITY: Record<RoleKey, ReadonlySet<EducationNavId>> = {
  owner: new Set(OWNER_ORDER),
  principal: new Set(OWNER_ORDER),
  admin: new Set(ROLE_ORDER.admin),
  teacher: new Set(ROLE_ORDER.teacher),
  lecturer: new Set(ROLE_ORDER.lecturer),
  professor: new Set(ROLE_ORDER.professor),
  student: new Set(ROLE_ORDER.student),
  parent: new Set(ROLE_ORDER.parent),
};

export const EDUCATION_NAV_GROUP_LABELS: Record<EducationNavGroup, string> = {
  main: "",
};

const LEGACY_TAB_ALIASES: Record<string, EducationNavId | "enrollment-split"> = {
  members: "association",
  associates: "association",
  enrollment: "enrollment-split",
  "subject-teachers": "association",
  "academic-year": "configure",
  "roles-settings": "configure",
  campuses: "profile",
  notices: "calendar",
  schedule: "timetable",
  "my-classes": "classes",
  "teachers-classes": "classes",
  marks: "exams",
  "student-progress": "reports",
  results: "exams",
  home: "overview",
  academics: "exams",
};

/** Map legacy tab ids to the sidebar item that should appear selected. */
export function educationNavActiveId(tabId: EducationNavId): EducationNavId {
  if (tabId === "associates" || tabId === "students-classes") {
    return "association";
  }
  if (tabId === "teachers-classes") return "classes";
  return tabId;
}

export function normalizeEducationRole(role: string): RoleKey | null {
  if (role in VISIBILITY) return role as RoleKey;
  return null;
}

export function getEducationNavItems(role: string): EducationNavItem[] {
  const key = normalizeEducationRole(role);
  if (!key) return [];
  const allowed = VISIBILITY[key];
  const order = ROLE_ORDER[key];
  const labels = ROLE_LABEL_OVERRIDES[key] ?? {};
  return order
    .filter((id) => allowed.has(id))
    .map((id) => ({
      id,
      label: labels[id] ?? LABELS[id],
      group: "main" as const,
    }));
}

export function getEducationNavScope(role: string, tabId: EducationNavId): EducationNavScope {
  const key = normalizeEducationRole(role);
  if (!key) return "self";
  if (key === "owner" || key === "principal" || key === "admin") return "institute";
  if (key === "parent") return "children";
  if (key === "student") return "self";
  if (
    ["classes", "teachers-classes", "attendance", "daily-notes", "assignments", "exams", "reports"].includes(
      tabId
    )
  ) {
    return "assigned-sections";
  }
  if (tabId === "calendar") return "assigned-sections";
  return "institute";
}

export function resolveLegacyEducationTab(
  tabParam: string | null,
  enrollmentModule: string | null | undefined
): EducationNavId | null {
  if (!tabParam) return null;
  if (EDUCATION_NAV_IDS.includes(tabParam as EducationNavId)) {
    const id = tabParam as EducationNavId;
    if (id === "associates" || id === "students-classes") {
      return "association";
    }
    if (id === "teachers-classes") return "classes";
    if (tabParam === "classes") return "classes";
    return id;
  }
  if (tabParam === "classes") return "classes";
  const alias = LEGACY_TAB_ALIASES[tabParam];
  if (alias === "enrollment-split") {
    return "association";
  }
  if (alias) return alias;
  return null;
}

export function resolveEducationNavTab(
  role: string,
  tabParam: string | null,
  enrollmentModule?: string | null
): EducationNavId {
  const items = getEducationNavItems(role);
  const fallback = items[0]?.id ?? "overview";
  const resolved = resolveLegacyEducationTab(tabParam, enrollmentModule) ?? tabParam;
  if (resolved && items.some((t) => t.id === resolved)) {
    return resolved as EducationNavId;
  }
  return fallback;
}

export function educationNavTabVisible(role: string, tabId: string): boolean {
  return getEducationNavItems(role).some((t) => t.id === tabId);
}
