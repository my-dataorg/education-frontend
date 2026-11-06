import {
  CONFIGURABLE_NAV_IDS,
  NAV_ACCESS_MATRIX_ROLES,
} from "@/lib/education-nav";

const LABELS: Record<string, string> = {
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

export { CONFIGURABLE_NAV_IDS, NAV_ACCESS_MATRIX_ROLES, LABELS as LABELS_FOR_CONFIG };
