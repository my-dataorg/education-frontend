/**
 * Single institute sidebar catalog for Education. Every role uses this list;
 * visibility and labels are filtered per role. Page content scopes data by role.
 */

import type { NavAccessOverrides } from "@/lib/nav-access";

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
  "class-board",
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

export const CONFIGURABLE_NAV_IDS: EducationNavId[] = [
  "overview",
  "classes",
  "exams",
  "timetable",
  "attendance",
  "fees",
  "reports",
  "calendar",
  "configure",
  "association",
  "class-board",
  "profile",
];

/** Sub-tabs under Classes (section workspace); keys match API `classes.*`. */
export const CLASS_SECTION_TAB_ACCESS_IDS = [
  "classes.overview",
  "classes.roster",
  "classes.subjects",
  "classes.syllabus",
  "classes.timetable",
  "classes.attendance",
  "classes.assignments",
  "classes.class-board",
  "classes.progress",
] as const;

/** Full matrix: main sidebar items + class section tabs */
export const CONFIGURABLE_ACCESS_IDS = [...CONFIGURABLE_NAV_IDS, ...CLASS_SECTION_TAB_ACCESS_IDS];

export const NAV_ACCESS_MATRIX_ROLES = [
  "owner",
  "admin",
  "principal",
  "teacher",
  "student",
  "parent",
] as const;

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
  "class-board": "Class board",
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
  "class-board",
  "exams",
  "fees",
  "reports",
];

/** Shown under Classes (section workspace), not in the teacher left sidebar. */
export const TEACHER_CLASS_NAV_IDS: ReadonlySet<EducationNavId> = new Set([
  "attendance",
  "assignments",
  "exams",
  "reports",
]);

const TEACHING_ROLES: ReadonlySet<RoleKey> = new Set(["teacher", "lecturer", "professor"]);

const ROLE_LABEL_OVERRIDES: Partial<Record<RoleKey, Partial<Record<EducationNavId, string>>>> = {
  teacher: {
    exams: "Marks & gradebook",
    reports: "Student progress",
    calendar: "Notices & events",
    attendance: "My attendance",
    leave: "Leave inbox",
  },
  lecturer: {
    exams: "Marks & gradebook",
    reports: "Student progress",
    calendar: "Notices & events",
    attendance: "My attendance",
    leave: "Leave inbox",
  },
  professor: {
    exams: "Marks & gradebook",
    reports: "Student progress",
    calendar: "Notices & events",
    attendance: "My attendance",
    leave: "Leave inbox",
  },
  student: {
    calendar: "Notices & calendar",
    profile: "Profile & documents",
    exams: "Results & report card",
    attendance: "Attendance & leave",
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
    "class-board",
    "exams",
    "fees",
    "reports",
  ],
  teacher: ["overview", "classes", "calendar", "timetable", "class-teacher", "attendance", "leave"],
  lecturer: ["overview", "classes", "calendar", "timetable", "class-teacher", "attendance", "leave"],
  professor: ["overview", "classes", "calendar", "timetable", "class-teacher", "attendance", "leave"],
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
  "subject-teachers": "classes",
  "academic-year": "configure",
  "roles-settings": "configure",
  "feature-config": "configure",
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
  "daily-notes": "class-board",
  notes: "class-board",
};

/** Map legacy tab ids to the sidebar item that should appear selected. */
export function educationNavActiveId(tabId: EducationNavId): EducationNavId {
  if (tabId === "associates" || tabId === "students-classes") {
    return "association";
  }
  if (tabId === "teachers-classes") return "classes";
  if (TEACHER_CLASS_NAV_IDS.has(tabId)) return "classes";
  return tabId;
}

export function normalizeEducationRole(role: string): RoleKey | null {
  if (role in VISIBILITY) return role as RoleKey;
  return null;
}

/** Map member role to matrix column (lecturer/professor use teacher overrides). */
export function navMatrixRoleKey(role: string): string | null {
  const key = normalizeEducationRole(role);
  if (!key) return null;
  if (key === "lecturer" || key === "professor") return "teacher";
  return key;
}

function applyNavAccessOverrides(
  role: string,
  items: EducationNavItem[],
  overrides?: NavAccessOverrides | null
): EducationNavItem[] {
  if (!overrides || Object.keys(overrides).length === 0) return items;
  const matrixKey = navMatrixRoleKey(role);
  if (!matrixKey) return items;
  const navKey = normalizeEducationRole(role);
  return items.filter((item) => {
    const rule = overrides[item.id]?.[matrixKey];
    if (!rule || rule.visible === undefined) return true;
    return rule.visible;
  });
}

export function isNavFeatureEditable(
  role: string,
  tabId: EducationNavId,
  overrides?: NavAccessOverrides | null
): boolean {
  const matrixKey = navMatrixRoleKey(role);
  if (!matrixKey) return false;
  if (matrixKey === "owner" || matrixKey === "admin") {
    const rule = overrides?.[tabId]?.[matrixKey];
    if (rule?.editable === false) return false;
    return true;
  }
  const rule = overrides?.[tabId]?.[matrixKey];
  if (rule?.editable === false) return false;
  return true;
}

/** Section tab id e.g. `overview` → feature key `classes.overview` */
export function classSectionTabAccessKey(sectionTab: string): string {
  return `classes.${sectionTab}`;
}

export function isClassSectionTabVisible(
  role: string,
  sectionTab: string,
  overrides?: NavAccessOverrides | null
): boolean {
  const matrixKey = navMatrixRoleKey(role);
  if (!matrixKey) return true;
  const featureKey = classSectionTabAccessKey(sectionTab);
  const rule = overrides?.[featureKey]?.[matrixKey];
  if (!rule || rule.visible === undefined) return true;
  return rule.visible;
}

export function isClassSectionTabEditable(
  role: string,
  sectionTab: string,
  overrides?: NavAccessOverrides | null
): boolean {
  const matrixKey = navMatrixRoleKey(role);
  if (!matrixKey) return true;
  const featureKey = classSectionTabAccessKey(sectionTab);
  const rule = overrides?.[featureKey]?.[matrixKey];
  if (!rule || rule.editable === undefined) return true;
  return rule.editable;
}

export const SECTION_WORKSPACE_TAB_ORDER: readonly string[] = [
  "overview",
  "roster",
  "subjects",
  "syllabus",
  "timetable",
  "attendance",
  "assignments",
  "class-board",
  "progress",
];

/** First section tab visible for role (defaults + owner config). */
export function resolveVisibleSectionWorkspaceTab(
  role: string,
  preferred: string,
  overrides?: NavAccessOverrides | null
): string {
  const normalized =
    preferred === "notes" ? "class-board" : preferred || "overview";
  if (isClassSectionTabVisible(role, normalized, overrides)) {
    return normalized;
  }
  for (const id of SECTION_WORKSPACE_TAB_ORDER) {
    if (isClassSectionTabVisible(role, id, overrides)) return id;
  }
  return "overview";
}

export function getEducationNavItems(role: string, overrides?: NavAccessOverrides | null): EducationNavItem[] {
  const key = normalizeEducationRole(role);
  if (!key) return [];
  const allowed = VISIBILITY[key];
  const order = ROLE_ORDER[key];
  const labels = ROLE_LABEL_OVERRIDES[key] ?? {};
  const items = order
    .filter((id) => allowed.has(id))
    .map((id) => ({
      id,
      label: labels[id] ?? LABELS[id],
      group: "main" as const,
    }));
  return applyNavAccessOverrides(role, items, overrides);
}

export function getEducationNavScope(role: string, tabId: EducationNavId): EducationNavScope {
  const key = normalizeEducationRole(role);
  if (!key) return "self";
  if (key === "owner" || key === "principal" || key === "admin") return "institute";
  if (key === "parent") return "children";
  if (key === "student") return "self";
  if (
    ["classes", "teachers-classes", "attendance", "class-board", "assignments", "exams", "reports"].includes(
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
    return "classes";
  }
  if (alias) return alias;
  return null;
}

export function resolveEducationNavTab(
  role: string,
  tabParam: string | null,
  enrollmentModule?: string | null,
  overrides?: NavAccessOverrides | null
): EducationNavId {
  const items = getEducationNavItems(role, overrides);
  const fallback = items[0]?.id ?? "overview";
  const resolved = resolveLegacyEducationTab(tabParam, enrollmentModule) ?? tabParam;
  const roleKey = normalizeEducationRole(role);
  if (
    roleKey &&
    TEACHING_ROLES.has(roleKey) &&
    resolved &&
    TEACHER_CLASS_NAV_IDS.has(resolved as EducationNavId)
  ) {
    return resolved as EducationNavId;
  }
  if (resolved && items.some((t) => t.id === resolved)) {
    return resolved as EducationNavId;
  }
  return fallback;
}

export function educationNavTabVisible(
  role: string,
  tabId: string,
  overrides?: NavAccessOverrides | null
): boolean {
  return getEducationNavItems(role, overrides).some((t) => t.id === tabId);
}
