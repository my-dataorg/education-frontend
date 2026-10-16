"use client";

import { useEffect, useState } from "react";
import type { InstituteSummary } from "@/lib/api";
import { JoinCodeChip } from "@/components/join-code-chip";
import { CampusesTab } from "@/components/institute-tabs/campuses-tab";

type AcademicYear = {
  label: string;
  startDate: string;
  endDate: string;
  board: string;
  medium: string;
  isActive: boolean;
};

type Props = {
  instituteId: string;
  instituteName: string;
  joinCode: string;
  branches: InstituteSummary["branches"];
  onChanged: () => void;
  onJoinCodeChange?: (code: string) => void;
};

export function ProfileTab({
  instituteId,
  instituteName,
  joinCode,
  branches,
  onChanged,
  onJoinCodeChange,
}: Props) {
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [joinCodeValue, setJoinCodeValue] = useState(joinCode);
  const primary = branches.find((b) => b.isPrimary) ?? branches[0];

  useEffect(() => {
    setJoinCodeValue(joinCode);
  }, [joinCode]);

  useEffect(() => {
    fetch(`/api/institutes/${instituteId}/academic-year`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return;
        setYear(await res.json());
      })
      .catch(() => undefined);
  }, [instituteId]);

  function handleCodeChange(code: string) {
    setJoinCodeValue(code);
    onJoinCodeChange?.(code);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">College information and campuses.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="font-semibold">About</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Institute name</dt>
            <dd className="font-medium">{instituteName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Join code</dt>
            <dd className="mt-1">
              <JoinCodeChip
                code={joinCodeValue}
                instituteId={instituteId}
                canRegenerate
                onCodeChange={handleCodeChange}
              />
            </dd>
          </div>
          {primary && (
            <>
              <div>
                <dt className="text-xs text-muted-foreground">Main campus</dt>
                <dd className="font-medium">{primary.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">People on main campus</dt>
                <dd>{primary.teacherCount + primary.studentCount}</dd>
              </div>
            </>
          )}
          {year && (
            <>
              <div>
                <dt className="text-xs text-muted-foreground">Academic year</dt>
                <dd className="font-medium">{year.label}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Board / medium</dt>
                <dd>{year.board} · {year.medium}</dd>
              </div>
            </>
          )}
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          Logo, phone, and website fields can be added when institute profile editing is enabled on the server.
        </p>
      </section>

      <CampusesTab instituteId={instituteId} branches={branches} onChanged={onChanged} />
    </div>
  );
}
