"use client";

import { TimetableOwnerView } from "@/components/institute-tabs/timetable-owner-view";

export function SectionTimetablePanel({
  instituteId,
  sectionId,
}: {
  instituteId: string;
  sectionId: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TimetableOwnerView
        instituteId={instituteId}
        embedded
        fixedSectionId={sectionId}
        canEdit
      />
    </div>
  );
}
