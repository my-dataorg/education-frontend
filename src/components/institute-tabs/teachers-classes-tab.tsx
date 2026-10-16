"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { buildInstitutePathFromSearch } from "@/lib/embed-href";
import { EnrollmentManager } from "@/components/enrollment-manager";
import { SubjectTeachersTab } from "@/components/institute-tabs/subject-teachers-tab";

type Props = {
  instituteId: string;
  branchId: string | null;
  inviteRefreshKey: number;
  onChanged: () => void;
};

export function TeachersClassesTab({ instituteId, branchId, inviteRefreshKey, onChanged }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sub = searchParams.get("classAssignTab") === "subject-teachers" ? "subject-teachers" : "section-roster";

  function selectSub(id: "section-roster" | "subject-teachers") {
    router.replace(
      buildInstitutePathFromSearch(instituteId, searchParams, {
        tab: "teachers-classes",
        classAssignTab: id === "subject-teachers" ? "subject-teachers" : undefined,
        enrollmentModule: "teachers",
      })
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-5 border-b border-border px-1 text-xs">
        <button
          type="button"
          onClick={() => selectSub("section-roster")}
          className={`border-b-2 pb-2.5 ${
            sub === "section-roster"
              ? "border-primary font-semibold text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Section teachers
        </button>
        <button
          type="button"
          onClick={() => selectSub("subject-teachers")}
          className={`border-b-2 pb-2.5 ${
            sub === "subject-teachers"
              ? "border-primary font-semibold text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Subject teachers
        </button>
      </div>
      {sub === "subject-teachers" ? (
        <SubjectTeachersTab instituteId={instituteId} branchId={branchId} />
      ) : (
        <EnrollmentManager
          instituteId={instituteId}
          refreshKey={inviteRefreshKey}
          onChanged={onChanged}
          fixedModule="teachers"
          listTab="teachers-classes"
        />
      )}
    </div>
  );
}
