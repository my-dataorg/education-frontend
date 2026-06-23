"use client";

import { EnrollmentManager } from "@/components/enrollment-manager";

type Props = {
  instituteId: string;
  inviteRefreshKey: number;
  onChanged: () => void;
};

export function EnrollmentTab({ instituteId, inviteRefreshKey, onChanged }: Props) {
  return (
    <EnrollmentManager
      instituteId={instituteId}
      refreshKey={inviteRefreshKey}
      onChanged={onChanged}
    />
  );
}
