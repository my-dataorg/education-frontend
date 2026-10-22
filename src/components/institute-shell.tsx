"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Link2,
  MapPin,
  Megaphone,
  Menu,
  NotebookPen,
  School,
  Settings2,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import type { InstituteSummary } from "@/lib/api";
import { buildInstitutePathFromSearch } from "@/lib/embed-href";
import { educationNavActiveId } from "@/lib/education-nav";
import type { InstituteTab, InstituteTabId } from "@/lib/institute-tabs";
import { cn } from "@/lib/utils";
import { useClassesMobileHeaderSlot } from "@/components/classes-mobile-header";

const TAB_ICONS: Partial<Record<InstituteTabId, React.ComponentType<{ className?: string }>>> = {
  overview: LayoutDashboard,
  profile: School,
  configure: Settings2,
  association: Link2,
  calendar: Megaphone,
  associates: Users,
  "teachers-classes": UserRound,
  "students-classes": GraduationCap,
  "daily-notes": NotebookPen,
  fees: WalletCards,
  exams: BookOpen,
  reports: BarChart3,
  attendance: CheckSquare,
  timetable: CalendarDays,
  classes: GraduationCap,
  assignments: ClipboardList,
  messages: Megaphone,
  "class-teacher": UserRound,
  leave: BookOpen,
};

type Props = {
  instituteId: string;
  branches: InstituteSummary["branches"];
  selectedBranchId: string | null;
  searchParams?: URLSearchParams;
  sectionTabs?: InstituteTab[];
  activeTab?: InstituteTabId;
  tabHref?: (tab: InstituteTabId) => string;
};

function NavList({
  items,
  activeTab,
  tabHref,
  onNavigate,
}: {
  items: InstituteTab[];
  activeTab?: InstituteTabId;
  tabHref: (tab: InstituteTabId) => string;
  onNavigate?: () => void;
}) {
  const highlighted = activeTab ? educationNavActiveId(activeTab) : undefined;
  return (
    <ul className="space-y-0.5">
      {items.map((tab) => {
        const Icon = TAB_ICONS[tab.id] ?? LayoutDashboard;
        const active = highlighted === tab.id;
        return (
          <li key={tab.id}>
            <Link
              href={tabHref(tab.id)}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition",
                active
                  ? "bg-sidebar-active font-medium text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function InstituteShell({
  instituteId,
  branches,
  selectedBranchId,
  searchParams,
  sectionTabs = [],
  activeTab,
  tabHref,
  children,
}: Props & { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const classesHeaderSlot = useClassesMobileHeaderSlot();

  return (
    <div className="institute-shell flex min-h-0 flex-1 w-full overflow-hidden bg-background">
      <aside className="hidden h-full min-h-0 w-56 shrink-0 overflow-y-auto overscroll-y-contain border-r border-border bg-card md:flex md:flex-col">
        <div className="p-3 pt-4">
          {sectionTabs.length > 0 && tabHref && (
            <NavList items={sectionTabs} activeTab={activeTab} tabHref={tabHref} />
          )}

          {branches.length > 1 && (
            <ul className="mt-6 space-y-0.5 border-t border-border pt-4">
              {branches.map((branch) => {
                const active = branch.id === selectedBranchId;
                const href = searchParams
                  ? buildInstitutePathFromSearch(instituteId, searchParams, {
                      branch: branch.id,
                    })
                  : `/institutes/${instituteId}?branch=${branch.id}`;
                return (
                  <li key={branch.id}>
                    <Link
                      href={href}
                      className={cn(
                        "flex items-start gap-2 rounded-lg px-2.5 py-2 text-sm transition",
                        active
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0">
                        <span className="block truncate">{branch.name}</span>
                        <span className="text-[11px] font-normal">
                          {branch.teacherCount + branch.studentCount} people
                          {branch.isPrimary && " · Main"}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <div className="education-content flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {sectionTabs.length > 0 && tabHref && (
          <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-2 py-1.5 md:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs font-medium"
              aria-label="Open menu"
            >
              <Menu className="h-3.5 w-3.5" />
              Menu
            </button>
            {classesHeaderSlot ? (
              <>
                <span className="shrink-0 text-xs font-semibold text-foreground">Classes</span>
                <div className="min-w-0 flex-1">{classesHeaderSlot}</div>
              </>
            ) : (
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {sectionTabs.find((t) => t.id === educationNavActiveId(activeTab ?? "overview"))?.label}
              </span>
            )}
          </div>
        )}

        {mobileOpen && tabHref && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute left-0 top-0 flex h-full w-[min(100%,16rem)] flex-col bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-3 py-3">
                <span className="text-sm font-semibold">Institute</span>
                <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <NavList
                  items={sectionTabs}
                  activeTab={activeTab}
                  tabHref={tabHref}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function BranchPills({
  instituteId,
  branches,
  selectedBranchId,
  searchParams,
  activeTab,
}: {
  instituteId: string;
  branches: InstituteSummary["branches"];
  selectedBranchId: string | null;
  searchParams: URLSearchParams;
  activeTab: InstituteTabId;
}) {
  if (branches.length <= 1) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
      {branches.map((branch) => {
        const href = buildInstitutePathFromSearch(instituteId, searchParams, {
          branch: branch.id,
          tab: activeTab,
        });
        return (
          <Link
            key={branch.id}
            href={href}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition",
              branch.id === selectedBranchId
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground"
            )}
          >
            {branch.name}
          </Link>
        );
      })}
    </div>
  );
}
