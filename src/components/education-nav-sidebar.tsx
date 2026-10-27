"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Link2,
  Megaphone,
  Menu,
  MessageSquare,
  NotebookPen,
  School,
  Settings2,
  UserRound,
  UserRoundCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { educationNavActiveId, type EducationNavId, type EducationNavItem } from "@/lib/education-nav";
import { cn } from "@/lib/utils";

const NAV_ICONS: Record<EducationNavId, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  profile: UserRound,
  configure: Settings2,
  association: Link2,
  classes: School,
  associates: Users,
  "teachers-classes": School,
  "students-classes": GraduationCap,
  calendar: Megaphone,
  timetable: CalendarDays,
  attendance: CheckSquare,
  "class-board": NotebookPen,
  assignments: ClipboardList,
  exams: BookOpen,
  fees: WalletCards,
  reports: BarChart3,
  messages: MessageSquare,
  "class-teacher": UserRoundCheck,
  leave: Bell,
};

type Props = {
  items: EducationNavItem[];
  activeTab: EducationNavId;
  children: React.ReactNode;
  /** Link-based nav (owner dashboard). */
  tabHref?: (tab: EducationNavId) => string;
  /** Button-based nav (teacher / student / parent). */
  onTabChange?: (tab: EducationNavId) => void;
  /** Use full viewport height; inner panels scroll (class board, timetable, etc.). */
  fillMainContent?: boolean;
};

export function EducationNavSidebar({
  items,
  activeTab,
  children,
  tabHref,
  onTabChange,
  fillMainContent = false,
}: Props) {
  const useLinks = Boolean(tabHref);
  const [mobileOpen, setMobileOpen] = useState(false);
  const highlighted = educationNavActiveId(activeTab);
  const activeLabel = items.find((item) => item.id === highlighted)?.label ?? "Menu";

  function drawerItemClass(active: boolean) {
    return cn(
      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
      active
        ? "bg-sidebar-active font-medium text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground active:scale-[0.98]",
      "duration-200 ease-out active:transition-transform"
    );
  }

  function renderDrawerItem(item: EducationNavItem) {
    const Icon = NAV_ICONS[item.id];
    const active = highlighted === item.id;
    const className = drawerItemClass(active);

    if (useLinks && tabHref) {
      return (
        <li key={item.id}>
          <Link href={tabHref(item.id)} className={className} onClick={() => setMobileOpen(false)}>
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        </li>
      );
    }

    return (
      <li key={item.id}>
        <button
          type="button"
          className={className}
          onClick={() => {
            onTabChange?.(item.id);
            setMobileOpen(false);
          }}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{item.label}</span>
        </button>
      </li>
    );
  }

  function renderSidebarItem(item: EducationNavItem) {
    const Icon = NAV_ICONS[item.id];
    const active = highlighted === item.id;
    const className = drawerItemClass(active);

    if (useLinks && tabHref) {
      return (
        <Link key={item.id} href={tabHref(item.id)} className={className}>
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{item.label}</span>
        </Link>
      );
    }

    return (
      <button key={item.id} type="button" onClick={() => onTabChange?.(item.id)} className={className}>
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{item.label}</span>
      </button>
    );
  }

  return (
    <div className="institute-shell flex min-h-0 flex-1 w-full overflow-hidden bg-background">
      <aside className="hidden h-full min-h-0 w-56 shrink-0 overflow-y-auto overscroll-y-contain border-r border-border bg-card md:flex md:flex-col">
        <div className="p-3 pt-4">
          <nav className="space-y-0.5">{items.map((item) => renderSidebarItem(item))}</nav>
        </div>
      </aside>

      <div className="education-content flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{activeLabel}</span>
        </div>

        {mobileOpen && (
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
                <ul className="space-y-0.5">{items.map((item) => renderDrawerItem(item))}</ul>
              </div>
            </div>
          </div>
        )}

        <main
          className={cn(
            "min-h-0 min-w-0 w-full flex-1 px-3 sm:px-4",
            fillMainContent
              ? "flex min-h-0 flex-col overflow-hidden py-1 sm:py-2"
              : "overscroll-y-contain overflow-y-auto py-3 pb-10 sm:py-4 sm:pb-12"
          )}
        >
          <div
            className={
              fillMainContent ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" : undefined
            }
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
