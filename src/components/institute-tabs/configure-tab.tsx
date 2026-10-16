"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { InstituteSummary } from "@/lib/api";
import { buildInstitutePathFromSearch } from "@/lib/embed-href";
import { AcademicYearTab } from "@/components/institute-tabs/academic-year-tab";
import { ClassesTab } from "@/components/institute-tabs/classes-tab";
import { RolesSettingsTab } from "@/components/institute-tabs/roles-settings-tab";

const CONFIGURE_TABS = [
  { id: "academic-year", label: "Academic year" },
  { id: "sections", label: "Classes" },
  { id: "subjects", label: "Subjects" },
  { id: "activities", label: "Activities" },
  { id: "section-subjects", label: "Subjects per class" },
  { id: "roles", label: "Roles & permissions" },
] as const;

type ConfigureTabId = (typeof CONFIGURE_TABS)[number]["id"];

type Props = {
  instituteId: string;
  branches: InstituteSummary["branches"];
  showRoles: boolean;
};

export function ConfigureTab({ instituteId, branches, showRoles }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get("configureTab");
  const active: ConfigureTabId =
    CONFIGURE_TABS.some((t) => t.id === raw) ? (raw as ConfigureTabId) : "sections";

  function selectTab(id: ConfigureTabId) {
    router.replace(
      buildInstitutePathFromSearch(instituteId, searchParams, {
        tab: "configure",
        configureTab: id,
      })
    );
  }

  const visibleTabs = CONFIGURE_TABS.filter((t) => t.id !== "roles" || showRoles);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Configure</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Master data used across enrollment, timetable, and reports.
        </p>
      </div>

      <div className="flex flex-wrap gap-5 border-b border-border px-1 text-xs">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => selectTab(tab.id)}
            className={`border-b-2 pb-2.5 ${
              active === tab.id
                ? "border-primary font-semibold text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === "academic-year" && <AcademicYearTab instituteId={instituteId} />}
      {active === "roles" && showRoles && <RolesSettingsTab instituteId={instituteId} />}
      {(["sections", "subjects", "activities", "section-subjects"] as const).includes(
        active as "sections" | "subjects" | "activities" | "section-subjects"
      ) && (
        <ClassesTab
          instituteId={instituteId}
          branches={branches}
          configureTab={active as "sections" | "subjects" | "activities" | "section-subjects"}
        />
      )}
    </div>
  );
}
