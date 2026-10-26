"use client";

import { EducationNavSidebar } from "@/components/education-nav-sidebar";
import { getEducationNavItems, type EducationNavId } from "@/lib/education-nav";

/** @deprecated Use EducationNavId — kept for imports that expect TeacherTab. */
export type TeacherTab = EducationNavId;

export function TeacherShell({
  activeTab,
  onTabChange,
  role,
  fillMainContent = false,
  children,
}: {
  activeTab: EducationNavId;
  onTabChange: (tab: EducationNavId) => void;
  role: string;
  fillMainContent?: boolean;
  children: React.ReactNode;
}) {
  const items = getEducationNavItems(role);

  return (
    <EducationNavSidebar
      items={items}
      activeTab={activeTab}
      onTabChange={onTabChange}
      fillMainContent={fillMainContent}
    >
      {children}
    </EducationNavSidebar>
  );
}
