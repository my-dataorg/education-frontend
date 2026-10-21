"use client";

import Link from "next/link";
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
  MessageSquare,
  NotebookPen,
  School,
  Settings2,
  UserRound,
  UserRoundCheck,
  Users,
  WalletCards,
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
  "daily-notes": NotebookPen,
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
};

export function EducationNavSidebar({ items, activeTab, children, tabHref, onTabChange }: Props) {
  const useLinks = Boolean(tabHref);

  function navButton(item: EducationNavItem, mobile = false) {
    const Icon = NAV_ICONS[item.id];
    const active = educationNavActiveId(activeTab) === item.id;
    const className = cn(
      mobile
        ? "shrink-0 px-3 py-2 text-sm"
        : "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
      active
        ? mobile
          ? "border-b-2 border-primary font-medium"
          : "bg-sidebar-active font-medium text-primary-foreground"
        : mobile
          ? "text-muted-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    );

    if (useLinks && tabHref) {
      return (
        <Link key={item.id} href={tabHref(item.id)} className={className}>
          {!mobile && <Icon className="h-3.5 w-3.5 shrink-0" />}
          <span className={mobile ? undefined : "truncate"}>{item.label}</span>
        </Link>
      );
    }

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onTabChange?.(item.id)}
        className={className}
      >
        {!mobile && <Icon className="h-3.5 w-3.5 shrink-0" />}
        {mobile ? item.label : <span className="truncate">{item.label}</span>}
      </button>
    );
  }

  return (
    <div className="institute-shell flex min-h-0 flex-1 w-full overflow-hidden bg-background">
      <aside className="hidden h-full min-h-0 w-56 shrink-0 overflow-y-auto overscroll-y-contain border-r border-border bg-card md:flex md:flex-col">
        <div className="p-3 pt-4">
          <nav className="space-y-0.5">
            {items.map((item) => navButton(item))}
          </nav>
        </div>
      </aside>
      <main className="education-content min-h-0 min-w-0 w-full flex-1 overscroll-y-contain overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mb-5 flex gap-1 overflow-x-auto border-b border-border pb-1 md:hidden">
          {items.map((item) => navButton(item, true))}
        </div>
        {children}
      </main>
    </div>
  );
}
