"use client";

import Link from "next/link";
import {
  BookOpen,
  BarChart3,
  CalendarDays,
  CalendarRange,
  CheckSquare,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  MapPin,
  Megaphone,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import type { InstituteSummary } from "@/lib/api";
import { buildInstitutePathFromSearch } from "@/lib/embed-href";
import type { InstituteTab, InstituteTabId } from "@/lib/institute-tabs";
import { cn } from "@/lib/utils";

const TAB_ICONS: Record<InstituteTabId, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  members: Users,
  "academic-year": CalendarRange,
  enrollment: ClipboardList,
  "subject-teachers": Users,
  campuses: MapPin,
  classes: BookOpen,
  schedule: CalendarDays,
  attendance: CheckSquare,
  exams: GraduationCap,
  fees: WalletCards,
  notices: Megaphone,
  reports: BarChart3,
  "roles-settings": ShieldCheck,
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
  return (
    <div className="institute-shell flex min-h-0 flex-1 w-full overflow-hidden bg-background">
      <aside
        className="hidden h-full min-h-0 w-56 shrink-0 overflow-y-auto overscroll-y-contain border-r border-border bg-card md:flex md:flex-col"
      >
        <div className="p-3 pt-4">
          {sectionTabs.length > 0 && tabHref && (
            <ul className="space-y-0.5">
              {sectionTabs.map((tab) => {
                const Icon = TAB_ICONS[tab.id];
                const active = activeTab === tab.id;
                return (
                  <li key={tab.id}>
                    <Link
                      href={tabHref(tab.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition",
                        active
                          ? "bg-sidebar-active font-medium text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {tab.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
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

      <div className="education-content min-h-0 min-w-0 flex-1">{children}</div>
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
