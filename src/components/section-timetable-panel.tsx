"use client";

import { TimetableOwnerView } from "@/components/institute-tabs/timetable-owner-view";

export function SectionTimetablePanel({
  instituteId,
  sectionId,
  canEdit = true,
}: {
  instituteId: string;
  sectionId: string;
  canEdit?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {!canEdit && (
        <p className="mb-2 shrink-0 text-sm text-muted-foreground">
          Weekly timetable for this class (read-only). Students see the published schedule after the owner publishes
          from Timetable; until then they see the current draft for this class.
        </p>
      )}
      <TimetableOwnerView
        instituteId={instituteId}
        embedded
        fixedSectionId={sectionId}
        canEdit={canEdit}
      />
    </div>
  );
}
