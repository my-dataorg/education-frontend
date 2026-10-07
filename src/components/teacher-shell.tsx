"use client";

import { CalendarDays, LayoutDashboard, School } from "lucide-react";
import { cn } from "@/lib/utils";

export type TeacherTab = "overview" | "schedule" | "classes";

export function TeacherShell({
  instituteName,
  activeTab,
  onTabChange,
  children,
}: {
  instituteName: string;
  activeTab: TeacherTab;
  onTabChange: (tab: TeacherTab) => void;
  children: React.ReactNode;
}) {
  const items = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "schedule" as const, label: "Schedule", icon: CalendarDays },
    { id: "classes" as const, label: "Classes", icon: School },
  ];

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] w-full bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:block">
        <div className="sticky top-0 p-4">
          <p className="font-serif text-base font-semibold">Education</p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">{instituteName}</p>
          <nav className="mt-6 space-y-1">
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
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">
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
