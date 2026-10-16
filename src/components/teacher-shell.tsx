"use client";

import {
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  School,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TeacherTab =
  | "overview"
  | "classes"
  | "schedule"
  | "attendance"
  | "assignments"
  | "marks"
  | "daily-notes"
  | "class-teacher"
  | "leave"
  | "notices"
  | "student-progress";

export function TeacherShell({
  activeTab,
  onTabChange,
  children,
}: {
  activeTab: TeacherTab;
  onTabChange: (tab: TeacherTab) => void;
  children: React.ReactNode;
}) {
  const items = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "classes" as const, label: "My classes", icon: School },
    { id: "schedule" as const, label: "Schedule", icon: CalendarDays },
    { id: "attendance" as const, label: "Attendance", icon: CalendarCheck },
    { id: "assignments" as const, label: "Assignments", icon: ClipboardCheck },
    { id: "marks" as const, label: "Marks & gradebook", icon: GraduationCap },
    { id: "daily-notes" as const, label: "Daily notes", icon: FileText },
    { id: "class-teacher" as const, label: "Class teacher", icon: UserRoundCheck },
    { id: "leave" as const, label: "Leave", icon: BookOpen },
    { id: "notices" as const, label: "Notices", icon: Bell },
    { id: "student-progress" as const, label: "Student progress", icon: Users },
  ];

  return (
    <div className="institute-shell flex min-h-0 flex-1 w-full overflow-hidden bg-background">
      <aside className="hidden h-full min-h-0 w-56 shrink-0 overflow-y-auto overscroll-y-contain border-r border-border bg-card md:flex md:flex-col">
        <div className="p-3 pt-4">
          <nav className="space-y-1">
            {items.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
                  activeTab === id
                    ? "bg-sidebar-active font-medium text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </aside>
      <main className="education-content min-h-0 min-w-0 w-full flex-1 overscroll-y-contain overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mb-5 flex gap-1 overflow-x-auto border-b border-border pb-1 md:hidden">
          {items.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={cn(
                "shrink-0 px-3 py-2 text-sm",
                activeTab === id
                  ? "border-b-2 border-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {children}
      </main>
    </div>
  );
}
