"use client";

import { ManageInstitutesDropdown } from "@/components/manage-institutes-dropdown";
import { PageHeader } from "@/components/shell/page-header";

export function InstituteActionsBar({
  title = "Your institutes",
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <PageHeader title={title} subtitle={subtitle} actions={<ManageInstitutesDropdown />} />
  );
}
