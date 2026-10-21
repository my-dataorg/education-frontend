"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { InstituteSummary } from "@/lib/api";
import { buildInstitutePathFromSearch } from "@/lib/embed-href";
import { MembersTab } from "@/components/institute-tabs/members-tab";
import { TeachersClassesTab } from "@/components/institute-tabs/teachers-classes-tab";
import { StudentsClassesTab } from "@/components/institute-tabs/students-classes-tab";

const PANELS = [
  { id: "roster", label: "People & invitations" },
  { id: "teachers", label: "Teachers in classes" },
  { id: "students", label: "Students in classes" },
] as const;

type PanelId = (typeof PANELS)[number]["id"];

type Props = {
  instituteId: string;
  joinCode: string;
  branches: InstituteSummary["branches"];
  selectedBranchId: string | null;
  currentUserId: string;
  inviteRefreshKey: number;
  onChanged: () => void;
  showEnrollment: boolean;
};

export function AssociationTab({
  instituteId,
  joinCode,
  branches,
  selectedBranchId,
  currentUserId,
  inviteRefreshKey,
  onChanged,
  showEnrollment,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get("associationPanel") || searchParams.get("memberTab");
  const legacyEnrollment = searchParams.get("enrollmentModule");
  let active: PanelId = "roster";
  if (raw === "teachers" || legacyEnrollment === "teachers") active = "teachers";
  else if (raw === "students" || legacyEnrollment === "students") active = "students";
  else if (PANELS.some((p) => p.id === raw)) active = raw as PanelId;

  function selectPanel(id: PanelId) {
    router.replace(
      buildInstitutePathFromSearch(instituteId, searchParams, {
        tab: "association",
        associationPanel: id,
        enrollmentModule: null,
        memberTab: null,
      })
    );
  }

  const visiblePanels = showEnrollment ? PANELS : PANELS.filter((p) => p.id === "roster");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Association</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Roster, invitations, and class assignments for staff and students.
        </p>
      </div>

      {visiblePanels.length > 1 && (
        <div className="flex flex-wrap gap-4 border-b border-border px-1 text-xs">
          {visiblePanels.map((panel) => (
            <button
              key={panel.id}
              type="button"
              onClick={() => selectPanel(panel.id)}
              className={`border-b-2 pb-2.5 ${
                active === panel.id
                  ? "border-primary font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {panel.label}
            </button>
          ))}
        </div>
      )}

      {active === "roster" && (
        <MembersTab
          instituteId={instituteId}
          joinCode={joinCode}
          branches={branches}
          selectedBranchId={selectedBranchId}
          currentUserId={currentUserId}
          inviteRefreshKey={inviteRefreshKey}
          onChanged={onChanged}
        />
      )}
      {active === "teachers" && showEnrollment && (
        <TeachersClassesTab
          instituteId={instituteId}
          branchId={selectedBranchId}
          inviteRefreshKey={inviteRefreshKey}
          onChanged={onChanged}
        />
      )}
      {active === "students" && showEnrollment && (
        <StudentsClassesTab
          instituteId={instituteId}
          inviteRefreshKey={inviteRefreshKey}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}
