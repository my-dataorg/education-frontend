import {
  CONFIGURABLE_ACCESS_IDS,
  NAV_ACCESS_MATRIX_ROLES,
} from "@/lib/education-nav";

const LABELS: Record<string, string> = {
  overview: "Sidebar: Home / Overview",
  classes: "Sidebar: Classes",
  exams: "Sidebar: Exams / results",
  timetable: "Sidebar: Timetable",
  attendance: "Sidebar: Attendance",
  fees: "Sidebar: Fees",
  reports: "Sidebar: Reports",
  calendar: "Sidebar: Holidays & events",
  configure: "Sidebar: Configure (master data)",
  association: "Sidebar: Association / members",
  "class-board": "Sidebar: Class board",
  profile: "Sidebar: Profile",
  "classes.overview": "Classes tab: Overview",
  "classes.roster": "Classes tab: Teachers & students",
  "classes.subjects": "Classes tab: Subjects",
  "classes.syllabus": "Classes tab: Syllabus",
  "classes.timetable": "Classes tab: Timetable",
  "classes.attendance": "Classes tab: Attendance",
  "classes.assignments": "Classes tab: Assignments",
  "classes.class-board": "Classes tab: Class board",
  "classes.progress": "Classes tab: Progress",
};

export { CONFIGURABLE_ACCESS_IDS, NAV_ACCESS_MATRIX_ROLES, LABELS as LABELS_FOR_CONFIG };
