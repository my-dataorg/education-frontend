"use client";

import { IncomingRequestsPanel } from "@/components/incoming-requests-panel";
import { InstitutePeoplePanel } from "@/components/institute-people-panel";
import { MembershipActions } from "@/components/membership-actions";
import type { InstituteSummary } from "@/lib/api";

type Props = {
  instituteId: string;
  joinCode: string;
  branches: InstituteSummary["branches"];
  selectedBranchId: string | null;
  currentUserId: string;
  inviteRefreshKey: number;
  onChanged: () => void;
};

export function MembersTab({
  instituteId,
  joinCode,
  branches,
  selectedBranchId,
  currentUserId,
  inviteRefreshKey,
  onChanged,
}: Props) {
  return (
    <div className="space-y-6">
      <MembershipActions instituteId={instituteId} joinCode={joinCode} onChanged={onChanged} />

      <IncomingRequestsPanel
        instituteId={instituteId}
        canManage
        refreshKey={inviteRefreshKey}
        onChanged={onChanged}
      />

      {selectedBranchId && (
        <InstitutePeoplePanel
          instituteId={instituteId}
          branches={branches}
          branchId={selectedBranchId}
          canManage
          currentUserId={currentUserId}
          refreshKey={inviteRefreshKey}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}
