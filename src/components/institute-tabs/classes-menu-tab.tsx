"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { InstituteSummary } from "@/lib/api";
import { buildInstitutePathFromSearch } from "@/lib/embed-href";
import { ClassesTab } from "@/components/institute-tabs/classes-tab";

const PANELS = [
  { id: "sections", label: "Class sections" },
  { id: "subjects", label: "Subjects" },
  { id: "activities", label: "Activities" },
  { id: "section-subjects", label: "Subjects per class" },
] as const;

type PanelId = (typeof PANELS)[number]["id"];

export function ClassesMenuTab({
  instituteId,
  branches,
}: {
  instituteId: string;
  branches: InstituteSummary["branches"];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get("classesPanel") || searchParams.get("configureTab");
  const active: PanelId =
    PANELS.some((p) => p.id === raw) ? (raw as PanelId) : "sections";

  function selectPanel(id: PanelId) {
    router.replace(
      buildInstitutePathFromSearch(instituteId, searchParams, {
        tab: "classes",
        classesPanel: id,
      })
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Classes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sections, subjects, and how they map together.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 border-b border-border px-1 text-xs">
        {PANELS.map((panel) => (
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

      <ClassesTab instituteId={instituteId} branches={branches} configureTab={active} />
    </div>
  );
}
