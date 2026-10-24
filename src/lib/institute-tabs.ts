import {
  EDUCATION_NAV_GROUP_LABELS,
  EDUCATION_NAV_IDS,
  getEducationNavItems,
  resolveEducationNavTab,
  resolveLegacyEducationTab,
  type EducationNavGroup,
  type EducationNavId,
} from "@/lib/education-nav";

export const INSTITUTE_TAB_IDS = EDUCATION_NAV_IDS;

export type InstituteTabId = EducationNavId;

export type InstituteTabGroup = EducationNavGroup;

export type InstituteTab = {
  id: InstituteTabId;
  label: string;
  group: InstituteTabGroup;
};

export function getInstituteTabs(role: string): InstituteTab[] {
  return getEducationNavItems(role);
}

export function resolveLegacyTab(
  tabParam: string | null,
  enrollmentModule: string | null | undefined
): InstituteTabId | null {
  return resolveLegacyEducationTab(tabParam, enrollmentModule);
}

export function resolveInstituteTab(
  role: string,
  tabParam: string | null,
  enrollmentModule?: string | null
): InstituteTabId {
  return resolveEducationNavTab(role, tabParam, enrollmentModule);
}

export function legacyTabQueryOverrides(
  tabParam: string | null,
  searchParams: URLSearchParams
): Record<string, string | undefined> | null {
  if (!tabParam) return null;
  const enrollmentModule = searchParams.get("enrollmentModule");

  if (tabParam === "associates" || tabParam === "members") {
    const memberTab = searchParams.get("memberTab");
    return {
      tab: "association",
      associationPanel: memberTab === "staff" || memberTab === "students" || memberTab === "requests"
        ? "roster"
        : "roster",
      memberTab: memberTab || undefined,
    };
  }
  if (tabParam === "teachers-classes" || tabParam === "my-classes") {
    return { tab: "classes", sectionTab: "roster" };
  }
  if (tabParam === "subject-teachers") {
    return { tab: "classes", sectionTab: "subjects" };
  }
  if (tabParam === "students-classes") {
    return { tab: "classes", sectionTab: "roster" };
  }
  if (tabParam === "enrollment") {
    return { tab: "classes", sectionTab: "roster" };
  }
  if (tabParam === "configure" && searchParams.get("configureTab") === "section-subjects") {
    const sectionId = searchParams.get("sectionId");
    return {
      tab: "classes",
      sectionTab: "subjects",
      configureTab: undefined,
      sectionId: sectionId || undefined,
    };
  }
  if (tabParam === "classes") {
    const classesTab = searchParams.get("classesTab");
    const map: Record<string, string> = {
      sections: "sections",
      subjects: "subjects",
      activities: "activities",
      "section-subjects": "section-subjects",
    };
    const desiredPanel = classesTab ? map[classesTab] ?? "sections" : "sections";
    const currentPanel = searchParams.get("classesPanel") ?? "sections";
    // Only rewrite the URL when migrating legacy `classesTab` or fixing a missing/wrong panel.
    if (!classesTab && currentPanel === desiredPanel) {
      return null;
    }
    return {
      tab: "classes",
      classesPanel: desiredPanel,
      classesTab: undefined,
    };
  }

  if (INSTITUTE_TAB_IDS.includes(tabParam as InstituteTabId)) {
    return null;
  }

  const canonical = resolveLegacyTab(tabParam, enrollmentModule);
  if (!canonical) return null;

  const patch: Record<string, string | undefined> = { tab: canonical };

  if (tabParam === "academic-year") patch.configureTab = "academic-year";
  if (tabParam === "roles-settings") patch.configureTab = "roles";
  if (tabParam === "notices") {
    patch.calendarView = searchParams.get("calendarView") || "month";
  }

  return patch;
}

export const INSTITUTE_TAB_GROUP_LABELS = EDUCATION_NAV_GROUP_LABELS;
