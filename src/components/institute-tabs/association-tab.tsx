"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { InstituteSummary } from "@/lib/api";
import { buildInstitutePathFromSearch } from "@/lib/embed-href";
import { MembersTab } from "@/components/institute-tabs/members-tab";
const PANELS = [{ id: "roster", label: "People & invitations" }] as const;

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
  let active: PanelId = "roster";
  if (PANELS.some((p) => p.id === raw)) active = raw as PanelId;

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
          Institute roster and invitations. Assign teachers and students to classes under{" "}
          <span className="font-medium text-foreground">Classes</span>.
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
    </div>
  );
}
