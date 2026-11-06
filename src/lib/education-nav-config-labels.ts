import {
  CLASS_SECTION_TAB_ACCESS_IDS,
  CONFIGURABLE_NAV_IDS,
  NAV_ACCESS_MATRIX_ROLES,
} from "@/lib/education-nav";

/** Top-level matrix rows (sidebar), same order as before adding class sub-tabs. */
export const CONFIG_MATRIX_SIDEBAR_IDS = CONFIGURABLE_NAV_IDS;

/** Shown under Classes when expanded (keys `classes.*`). */
export const CONFIG_MATRIX_CLASS_TAB_IDS = [...CLASS_SECTION_TAB_ACCESS_IDS];

const SIDEBAR_LABELS: Record<string, string> = {
  overview: "Home / Overview",
  classes: "Classes",
  exams: "Exams / results",
  timetable: "Timetable",
  attendance: "Attendance",
  fees: "Fees",
  reports: "Reports",
  calendar: "Holidays & events",
  configure: "Configure (master data)",
  association: "Association / members",
  "class-board": "Class board",
  profile: "Profile",
};

const CLASS_TAB_LABELS: Record<string, string> = {
  "classes.overview": "Overview",
  "classes.roster": "Teachers & students",
  "classes.subjects": "Subjects",
  "classes.syllabus": "Syllabus",
  "classes.timetable": "Timetable",
  "classes.attendance": "Attendance",
  "classes.assignments": "Assignments",
  "classes.class-board": "Class board",
  "classes.progress": "Progress",
};

export function labelForConfigFeature(featureId: string): string {
  return SIDEBAR_LABELS[featureId] ?? CLASS_TAB_LABELS[featureId] ?? featureId;
}

export { NAV_ACCESS_MATRIX_ROLES, SIDEBAR_LABELS, CLASS_TAB_LABELS };
